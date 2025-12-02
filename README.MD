# 📘 **CENSYS — Sistema RAG Local por Documento**

---

# 🖥️ **Requisitos mínimos del sistema**

Para ejecutar el sistema RAG de forma correcta, la PC debe cumplir:

### ✔ **Hardware mínimo**

* **Procesador:** Intel i5 / Ryzen 5 o superior
* **RAM:** 8 GB (mínimo)
* **Disco:** 2 GB libres para documentos + índices + modelos
* **GPU:** opcional (Ollama puede usar CPU)

### ✔ **Hardware recomendado**

* **Procesador:** Intel i7 / Ryzen 7
* **RAM:** 16 GB (ideal para PDFs largos)
* **SSD:** recomendado para mayor velocidad en embeddings
* **GPU NVIDIA/AMD/Apple:** mejora notablemente Ollama (opcional)

### ✔ **Software**

* Windows, Linux o macOS
* Python **3.11+** el utilizado fue 3.11.9
* Node.js **18+**
* Ollama instalado
* Navegador moderno (Chrome/Edge/Firefox)

---

# 🧠 **CENSYS — Sistema RAG Local por Documento**

El RAG es un sistema de consulta inteligente que permite cargar documentos, procesarlos localmente y realizar preguntas con un chatbot usando **IA completamente offline** gracias a Ollama.

👉 Cada computadora tiene **sus propios documentos e índices**, nada se comparte automáticamente.

---

# 🧩 Tecnologías utilizadas

### 🖼 Frontend

* React + Vite
* Tailwind + ShadCN UI
* Lucide Icons
* **Figma Make**
  → utilizado para diseñar todas las vistas y estructura visual rápidamente.

### ⚙ Backend

* FastAPI
* Python 3.11
* **Ollama** como motor LLM offline
* **ChatGPT** utilizado durante el desarrollo para:

  * decidir modelos (llama3, mistral, phi3, mxbai)
  * revisar errores en pipeline RAG
  * depurar chunking / embeddings / prompts
  * mejorar precisión y evitar alucinaciones

### 🧠 IA / RAG

* Extracción automática de texto
* Limpieza y normalización
* Chunking configurable
* Embeddings con `mxbai-embed-large`
* Similaridad coseno
* Generación con `llama3:instruct`

---

# 🏗️ **Arquitectura del sistema**

```
               ┌──────────────────────────┐
               │        FRONTEND          │
               │  React + Vite + UI       │
               ├──────────────────────────┤
               │  Subir documentos        │
               │  Ver documentos          │
               │  Chat                    │
               │  Chat flotante           │
               └───────────────┬──────────┘
                               │ HTTP (REST)
                               ▼
        ┌──────────────────────────────────────────┐
        │               BACKEND (FastAPI)          │
        │                                          │
        │  /upload     → guardar + extraer + index │
        │  /documents  → listar archivos           │
        │  /query      → RAG + llamada a LLM       │
        │                                          │
        └───────────────┬──────────────────────────┘
                        │
                        ▼
              ┌────────────────────────┐
              │     OLLAMA (LLM)       │
              │ llama3:instruct        │
              │ mxbai-embed-large      │
              └────────────────────────┘

```

---

# 📂 Estructura del proyecto

```
Back/
 ├── app/
 │   ├── main.py
 │   ├── rag.py
 │   ├── storage.py
 │   ├── text_extractor.py
 │   ├── config.py
 │   └── schemas.py
 │
 ├── data/
 │   ├── docs/        ← documentos locales
 │   ├── indexes/     ← embeddings + chunks locales
 │
Front/
 ├── src/components/
 │   ├── UploadPage.tsx
 │   ├── DocumentsPage.tsx
 │   ├── ChatPage.tsx
 │   └── FloatingChat.tsx
 └── utils/api.ts
```

---

# 🔥 Funcionamiento del chunking

El chunking divide el documento en partes pequeñas para:

* mejorar la precisión
* evitar pérdida de contexto
* optimizar embeddings

Código utilizado:

```python
def chunk_text(text: str, chunk_size=220, overlap=40):
    words = text.split()
    chunks = []
    
    i = 0
    while i < len(words):
        chunk = words[i:i + chunk_size]
        chunks.append(" ".join(chunk))
        i += chunk_size - overlap

    return chunks
```

### Explicación:

* chunk_size = 220 palabras
* overlap = 40 palabras superpuestas
* evita cortes de concepto entre chunks
* mejora la búsqueda semántica

### Cuándo cambiar chunk_size

* documentos muy técnicos → chunk_size mayor
* documentos con definiciones cortas → chunk_size menor
* modelos pequeños → chunks pequeños

---

# 🤖 Cómo cambiar el modelo LLM

En:

```
Back/app/config.py
```

Está esta línea:

```python
LLM_MODEL = "llama3:instruct"
```

Puedes cambiarla por cualquier modelo de Ollama:

### Modelos disponibles:

* `llama3:instruct` (recomendado)
* `llama3`
* `mistral:instruct`
* `phi3:instruct`
* `phi3:mini`
* `qwen2:7b-instruct`

Ejemplo:

```python
LLM_MODEL = "mistral:instruct"
```

Luego reiniciar backend:

```sh
uvicorn app.main:app --reload
```

---

# 🌐 Cómo cambiar el idioma del chat

El idioma está controlado en:

```
rag.py → answer() → system_prompt
```

Actual:

```python
"Eres un asistente que responde SIEMPRE en español..."
```

### Cambiar a inglés:

```python
"Eres un asistente que responde SIEMPRE en inglés..."
```

### Responder en el idioma de la pregunta:

```python
"Responde SIEMPRE en el mismo idioma que la pregunta..."
```

---

# 🚀 Instalación

### Backend

```sh
cd Back
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```sh
cd Front
npm install
npm run dev
```

# 🎉 Conclusión

Censys es una plataforma RAG local, segura y rápida, diseñada con:

* UI creada en Figma Make
* Backend optimizado con ayuda de ChatGPT
* Modelos Ollama completamente locales
* Flujo RAG robusto para PDFs largos
* Independencia total por computadora


