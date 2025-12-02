import httpx
import numpy as np

# Asegúrate de que en config.py tengas estos modelos definidos
from .config import OLLAMA_BASE_URL, EMBEDDING_MODEL, LLM_MODEL

# ==========================================================
#  Chunking de texto
# ==========================================================

def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 200) -> list[str]:
    if not text:
        return []
    
    words = text.split()
    if not words:
        return []

    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        if not chunk_words:
            break
        
        chunk = " ".join(chunk_words)
        chunks.append(chunk)
        # Avanzamos el índice restando el overlap para mantener contexto
        i += max(1, chunk_size - overlap)

    return chunks

# ==========================================================
#  Embeddings (Ollama)
# ==========================================================

async def embed_texts(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.zeros((0, 0), dtype="float32")

    vectors = []
    # Timeout ajustado para operaciones de embedding
    timeout = httpx.Timeout(60.0, read=300.0, write=30.0, connect=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        for idx, t in enumerate(texts):
            trimmed = t.strip()
            if not trimmed:
                continue

            try:
                res = await client.post(
                    f"{OLLAMA_BASE_URL}/api/embeddings",
                    json={"model": EMBEDDING_MODEL, "prompt": trimmed},
                )
                res.raise_for_status()
                data = res.json()
            except Exception as e:
                print(f"⚠️ Error en embedding chunk {idx}: {e}")
                continue

            # Manejo de respuesta de Ollama (puede variar según versión)
            if "embedding" in data:
                vec = data["embedding"]
            elif "embeddings" in data:
                vec = data["embeddings"][0]
            else:
                print(f"⚠️ Formato inesperado en chunk {idx}")
                continue

            vectors.append(vec)

    if not vectors:
        return np.zeros((0, 0), dtype="float32")

    return np.array(vectors, dtype="float32")

# ==========================================================
#  Similitud coseno
# ==========================================================

def cosine_sim(q, m):
    if m.size == 0:
        return np.array([])
    
    # Normalización para distancia coseno
    norm_q = np.linalg.norm(q)
    norm_m = np.linalg.norm(m, axis=1, keepdims=True)
    
    if norm_q == 0:
        return np.zeros(m.shape[0])
        
    q = q / norm_q
    # Evitar división por cero en la matriz
    m = np.divide(m, norm_m, out=np.zeros_like(m), where=norm_m!=0)
    
    return np.dot(m, q)

# ==========================================================
#  Construcción de índice
# ==========================================================

async def build_index(doc_id, text, store, chunk_size=220, overlap=40):
    if not text or len(text.strip()) < 20:
        raise ValueError("❌ Texto demasiado corto para indexar")

    chunks = chunk_text(text, chunk_size, overlap)
    if not chunks:
        raise ValueError("❌ No se generaron chunks")

    embeddings = await embed_texts(chunks)
    if embeddings.size == 0:
        raise RuntimeError("❌ Falló la generación de embeddings")

    store.save_index(doc_id, chunks, embeddings)
    print(f"✅ Índice guardado para {doc_id} ({len(chunks)} chunks)")
    return len(chunks)

# ==========================================================
#  Responder (LÓGICA RAG AVANZADA)
# ==========================================================

async def answer(store, doc_id, question, top_k=15):
    """
    Función principal de respuesta que implementa:
    1. Detección de intención (Resumen vs Búsqueda Específica).
    2. Query Expansion (Sinónimos) para búsqueda específica.
    3. Filtrado por umbral de similitud.
    """
    
    # 1. Cargar datos
    index = store.load_index(doc_id)
    if not index:
        return "No hay índice disponible para este documento. Súbelo nuevamente.", []

    chunks = index.get("chunks", [])
    embs = np.array(index.get("embeddings", []), dtype="float32")
    
    if not chunks or embs.size == 0:
        return "El documento parece estar vacío o corrupto.", []

    # ---------------------------------------------------------
    # ESTRATEGIA DE ENRUTAMIENTO (ROUTING)
    # ---------------------------------------------------------
    
    question_lower = question.lower()
    # Palabras clave que indican una intención global
    keywords_summary = ["resumen", "resumí", "resumime", "todo el documento", "de qué trata", "puntos clave", "sintetiza", "resume"]
    is_global_task = any(kw in question_lower for kw in keywords_summary)

    selected_chunks = []

    if is_global_task:
        # --- MODO LECTURA GLOBAL (RESUMEN) ---
        print("🌍 [RAG] Detectada tarea de resumen. Leyendo secuencialmente.")
        
        # Tomamos los primeros N chunks en orden natural para dar contexto narrativo
        # Unos 40 chunks de 220 palabras son ~8000 palabras, llenando el contexto de Llama3
        LIMIT_CHUNKS_SUMMARY = 40 
        selected_chunks = chunks[:LIMIT_CHUNKS_SUMMARY]
        
    else:
        # --- MODO BÚSQUEDA ESPECÍFICA (RAG CON QUERY EXPANSION) ---
        
        # A. Expansión de Consulta (Solución para "Pasos vs Etapas")
        print("🔍 [RAG] Iniciando búsqueda específica...")
        
        expansion_prompt = (
            f"Actúa como un experto en búsqueda semántica. "
            f"Para la siguiente pregunta, genera 3 o 4 palabras clave alternativas o sinónimos técnicos "
            f"que podrían aparecer en un texto formal. "
            f"Si la pregunta dice 'pasos', incluye 'etapas', 'fases', 'procedimiento'. "
            f"Solo devuelve las palabras separadas por espacio.\n\n"
            f"Pregunta: {question}"
        )
        
        search_query = question
        try:
            # Timeout muy corto (4s) para no afectar la latencia
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": LLM_MODEL, 
                        "prompt": expansion_prompt, 
                        "stream": False,
                        "options": {"num_predict": 30, "temperature": 0.1}
                    }
                )
                if res.status_code == 200:
                    synonyms = res.json().get("response", "").strip()
                    # Limpieza básica
                    synonyms = synonyms.replace("\n", " ").replace('"', '')
                    search_query = f"{question} {synonyms}"
                    print(f"🚀 Query Expandida: '{search_query}'")
        except Exception as e:
            print(f"⚠️ Falló expansión (usando original): {e}")

        # B. Embedding de la consulta mejorada
        q_emb = await embed_texts([search_query])
        
        if q_emb.size > 0:
            q_emb = q_emb[0]
            sims = cosine_sim(q_emb, embs)
            
            # C. Filtrado Inteligente
            idxs = np.argsort(-sims) # Ordenar de mayor a menor similitud
            
            # Umbral de calidad: descartar lo que sea puro ruido (< 0.25)
            # Esto mejora mucho la precisión para que el LLM no invente.
            MIN_SCORE = 0.25 
            
            # Filtramos los top_k
            best_idxs = [i for i in idxs[:top_k] if sims[i] >= MIN_SCORE]
            
            # Fallback: Si nada supera el umbral, tomamos los 2 mejores para intentar responder
            if not best_idxs and len(chunks) > 0:
                 print("⚠️ Baja similitud, usando fallback (top 2)...")
                 best_idxs = idxs[:2]
            
            selected_chunks = [chunks[i] for i in best_idxs]
            
            # Debug visual en consola
            print(f"📊 Chunks seleccionados: {len(selected_chunks)}")
            for i in best_idxs[:3]:
                 print(f"   -> Score: {sims[i]:.4f} | {chunks[i][:50]}...")

    # ---------------------------------------------------------
    # GENERACIÓN DE RESPUESTA (LLM)
    # ---------------------------------------------------------
    
    # 1. Construir Contexto Único
    # Llama 3 soporta ~8k tokens. Dejamos margen para la respuesta.
    # 1 token ~= 4 caracteres. 30,000 caracteres es seguro.
    MAX_CONTEXT_CHARS = 30000 
    
    context = ""
    for c in selected_chunks:
        if len(context) + len(c) > MAX_CONTEXT_CHARS:
            break
        context += "\n---\n" + c

    if not context.strip():
        return "No pude encontrar información relevante en el documento para responder a tu pregunta.", []

    # 2. Prompt del Sistema
    system_prompt = (
        "Eres un asistente inteligente y preciso. "
        "Tu tarea es responder a la pregunta basándote ÚNICAMENTE en el contexto proporcionado abajo. "
        "Si el contexto es un conjunto de fragmentos, únelos para dar una respuesta coherente. "
        "Si te piden un resumen, sintetiza los puntos clave del texto proporcionado. "
        "Si la respuesta no está en el contexto, indícalo claramente."
    )

    user_prompt = (
        f"CONTEXTO DEL DOCUMENTO:\n{context}\n\n"
        f"PREGUNTA DEL USUARIO: {question}\n\n"
        "RESPUESTA:"
    )

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {
            "num_ctx": 24000, # <--- CLAVE: Ventana amplia para resúmenes
            "temperature": 0.3 # Baja temperatura para mayor fidelidad a los datos
        }
    }

    # Timeout generoso para la generación (especialmente en resúmenes)
    timeout = httpx.Timeout(60.0, read=600.0, write=30.0, connect=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
            
            if res.status_code != 200:
                return f"Error de Ollama ({res.status_code}): {res.text}", []
                
            data = res.json()
            answer_text = data.get("message", {}).get("content", "").strip()
            
            if not answer_text:
                return "El modelo no generó una respuesta.", []
                
            return answer_text, selected_chunks

    except Exception as e:
        return f"Error de conexión con el modelo: {str(e)}", []


# ==========================================================
#  Pre-carga de modelos (Warmup)
# ==========================================================

async def preload_models():
    """
    Envía peticiones vacías a Ollama para cargar modelos en RAM al inicio.
    """
    print("⏳ Iniciando pre-carga de modelos Ollama...")
    timeout = httpx.Timeout(120.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        # 1. Embeddings
        try:
            print(f"   ↳ Cargando Embeddings: {EMBEDDING_MODEL}...")
            await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": "warmup"}
            )
            print("     ✅ Embeddings listos.")
        except Exception as e:
            print(f"     ⚠️ No se pudo cargar embeddings: {e}")

        # 2. LLM Principal
        try:
            print(f"   ↳ Cargando LLM: {LLM_MODEL}...")
            # keep_alive mantiene el modelo en VRAM por 5 minutos
            await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": "", "keep_alive": "5m"}
            )
            print("     ✅ LLM listo.")
        except Exception as e:
            print(f"     ⚠️ No se pudo cargar LLM: {e}")
            
    print("🚀 Sistema RAG listo.")