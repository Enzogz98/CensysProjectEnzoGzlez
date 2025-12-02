import httpx
import numpy as np

from .config import OLLAMA_BASE_URL, EMBEDDING_MODEL, LLM_MODEL


# ==========================================================
#  Chunking de texto
# ==========================================================

# Aumenta el overlap para que no se corten frases a la mitad
def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 200) -> list[str]:
    # ... (tu código actual está bien, solo cambia los defaults arriba)
    if not text:
        print("❌ chunk_text recibió texto vacío")
        return []

    words = text.split()
    if not words:
        print("❌ chunk_text: text.split() devolvió vacío")
        return []

    chunks = []
    i = 0

 

    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        if not chunk_words:
            break

        chunk = " ".join(chunk_words)
        chunks.append(chunk)

        i += max(1, chunk_size - overlap)

    return chunks


# ==========================================================
#  Embeddings (Ollama)
# ==========================================================

async def embed_texts(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.zeros((0, 0), dtype="float32")

    vectors = []
    timeout = httpx.Timeout(60.0, read=300.0, write=30.0, connect=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        for idx, t in enumerate(texts):
            trimmed = t.strip()
            if not trimmed:
                print(f"⚠ Texto vacío en embedding idx={idx}")
                continue

            print(f"🟦 Embedding chunk {idx} (len={len(trimmed)})...")

            try:
                res = await client.post(
                    f"{OLLAMA_BASE_URL}/api/embeddings",
                    json={"model": EMBEDDING_MODEL, "prompt": trimmed},
                )
            except Exception as e:
                raise RuntimeError(f"Error conectando con Ollama embeddings: {e}")

            if res.status_code != 200:
                raise RuntimeError(f"HTTP {res.status_code} en embeddings: {res.text}")

            try:
                data = res.json()
            except:
                raise ValueError(f"Ollama embeddings devolvió basura: {res.text}")

            print(f"🟪 RAW EMBEDDING RESPONSE idx={idx}:", data)

            if "error" in data:
                raise RuntimeError(f"Error de Ollama en embeddings: {data['error']}")

            if "embedding" in data:
                vec = data["embedding"]
            elif "embeddings" in data:
                vec = data["embeddings"][0]
            else:
                raise ValueError(f"Formato inesperado en embeddings: {data}")

            vectors.append(vec)


    return np.array(vectors, dtype="float32")


# ==========================================================
#  Similitud coseno
# ==========================================================

def cosine_sim(q, m):
    if m.size == 0:
        print("❌ cosine_sim recibió matriz vacía")
        return np.array([])

    q = q / np.linalg.norm(q)
    m = m / np.linalg.norm(m, axis=1, keepdims=True)
    return np.dot(m, q)


# ==========================================================
#  Construcción de índice
# ==========================================================

async def build_index(doc_id, text, store, chunk_size=220, overlap=40):


    if not text or len(text.strip()) < 20:
        raise ValueError("❌ Texto extraído demasiado corto")

    chunks = chunk_text(text, chunk_size, overlap)
    if not chunks:
        raise ValueError("❌ No se generaron chunks en build_index")

    embeddings = await embed_texts(chunks)
    if embeddings.size == 0:
        raise RuntimeError("❌ No se generaron embeddings")

    store.save_index(doc_id, chunks, embeddings)
    print(f"✅ Índice guardado para {doc_id} ({len(chunks)} chunks)")
    return len(chunks)


# ==========================================================
#  Responder
# ==========================================================

async def answer(store, doc_id, question, top_k=15):


    index = store.load_index(doc_id)
    if not index:
        return "No hay índice para este documento.", []

    chunks = index.get("chunks", [])
    embs = np.array(index.get("embeddings", []), dtype="float32")


    q_emb = await embed_texts([question])
    if q_emb.size == 0:
        return "Falla en embedding de pregunta", []

    q_emb = q_emb[0]

    sims = cosine_sim(q_emb, embs)
    if sims.size == 0:
        return "No hay similitud calculada", []

    # Ordenar índices de mayor a menor similitud
    idxs = np.argsort(-sims)[:top_k]
    
    # --- DEBUGGING PRINT ---
    print(f"\n🔍 PREGUNTA: {question}")
    print("--------------------------------------------------")
    for i in idxs:
        score = sims[i]
        preview = chunks[i][:100].replace('\n', ' ')
        print(f"🔹 Score: {score:.4f} | Chunk: {preview}...")
    print("--------------------------------------------------\n")
    # -----------------------

    selected_chunks = [chunks[i] for i in idxs]

 

    MAX_CONTEXT = 100000 
    
    context = ""
    for c in selected_chunks:
        if len(context) + len(c) > MAX_CONTEXT:
            # (Opcional) Puedes quitar este break si quieres que lea todo lo recuperado
            break 
        context += "\n---\n" + c # Separador claro entre chunks

   

    system_prompt = (
        "Eres un asistente útil y preciso. Responde a la pregunta del usuario "
        "basándote ÚNICAMENTE en el siguiente contexto proporcionado. "
        "El contexto puede estar fragmentado, intenta unir las ideas lógicamente. "
        "Si la respuesta no está en el contexto, di que no tienes esa información."
    )

    user_prompt = (
        f"Contexto:\n{context}\n\n"
        f"Pregunta: {question}\n\n"
        "Respuesta:"
    )

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
    }

    # 🔴 AQUÍ ESTÁ EL CAMBIO. 
    # Ponle 600 segundos (10 minutos) para que NO falle nunca por tiempo.
    timeout = httpx.Timeout(60.0, read=600.0, write=30.0, connect=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            res = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        except Exception as e:
            raise RuntimeError(f"Error conectando con Ollama (chat): {e}")

    try:
        data = res.json()
    except:
        raise ValueError(f"Ollama devolvió basura:\n{res.text}")

   

    if res.status_code != 200:
        return f"Error HTTP {res.status_code}: {data}", []

    msg = data.get("message", {})
    answer = msg.get("content", "").strip()

    if not answer:
        answer = "⚠ El modelo no pudo generar una respuesta válida."


    return answer, selected_chunks

# --- Agrega esto al final de back/app/rag.py ---

async def preload_models():
    """
    Envía peticiones vacías a Ollama para forzar la carga de los modelos
    en memoria RAM al iniciar el servidor.
    """
    print("⏳ Iniciando pre-carga de modelos Ollama (esto puede tardar unos segundos)...")
    
    timeout = httpx.Timeout(120.0) # Damos buen tiempo para el arranque
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        # 1. Despertar al modelo de Embeddings
        try:
            print(f"   ↳ Cargando modelo de embeddings: {EMBEDDING_MODEL}...")
            await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": "warmup"}
            )
            print("     ✅ Embeddings listos.")
        except Exception as e:
            print(f"     ❌ Error cargando embeddings: {e}")

        # 2. Despertar al modelo LLM principal
        try:
            print(f"   ↳ Cargando LLM principal: {LLM_MODEL}...")
            # Enviamos un prompt vacío con keep_alive para que se quede en RAM
            await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": "", "keep_alive": "5m"}
            )
            print("     ✅ LLM listo.")
        except Exception as e:
            print(f"     ❌ Error cargando LLM: {e}")
            
    print("🚀 ¡Todo listo! Ollama está caliente y esperando peticiones.")