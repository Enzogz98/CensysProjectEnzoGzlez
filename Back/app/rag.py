import httpx
import numpy as np

from .config import OLLAMA_BASE_URL, EMBEDDING_MODEL, LLM_MODEL

def chunk_text(text: str, chunk_size=400):
    words = text.split()
    return [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

async def embed_texts(texts):
    vectors = []
    async with httpx.AsyncClient() as client:
        for t in texts:
            res = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": t}
            )
            data = res.json()

            # 🔥 CORRECCIÓN CLAVE:
            # Ollama devuelve embeddings como lista:
            # { "embeddings": [ [0.12, -0.33, ...] ] }
            if "embedding" in data:
                # casos antiguos (casi nunca)
                vectors.append(data["embedding"])
            elif "embeddings" in data:
                vectors.append(data["embeddings"][0])
            else:
                raise ValueError(f"Respuesta inesperada del modelo: {data}")

    return np.array(vectors, dtype="float32")

def cosine_sim(q, m):
    q = q / np.linalg.norm(q)
    m = m / np.linalg.norm(m, axis=1, keepdims=True)
    return np.dot(m, q)

async def build_index(doc_id, text, store):
    chunks = chunk_text(text)
    embeddings = await embed_texts(chunks)
    store.save_index(doc_id, chunks, embeddings)
    return len(chunks)

async def answer(store, doc_id, question, top_k=4):
    index = store.load_index(doc_id)
    chunks = index["chunks"]
    embs = index["embeddings"]

    q_emb = await embed_texts([question])
    q_emb = q_emb[0]

    sims = cosine_sim(q_emb, embs)
    idxs = np.argsort(-sims)[:top_k]
    selected = [chunks[i] for i in idxs]

    context = "\n\n---\n\n".join(selected)

    prompt = f"""
Usa solo el siguiente contexto para responder:

{context}

Pregunta: {question}
"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        data = res.json()

    # 🔥 Algunos modelos devuelven {"message": {"content": "..."}} otros {"content": "..." }
    if "message" in data and "content" in data["message"]:
        answer_text = data["message"]["content"]
    else:
        answer_text = data.get("content", "")

    return answer_text, selected
