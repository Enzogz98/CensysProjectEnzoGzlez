# 📘 **CENSYS — Sistema RAG Local Inteligente**

---

# 🔄 Pipeline de Procesamiento: De Archivo a Vectores

El sistema sigue un flujo estricto de **ETL (Extract, Transform, Load)** para asegurar que la IA "lea" correctamente tus documentos. Este proceso ocurre 100% en local cada vez que subes un archivo.

```mermaid
graph TD
    %% Estilos para dar color y jerarquía
    classDef file fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef proc fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,rx:5,ry:5;
    classDef db fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    %% Nodos Principales
    Input[📄 Archivo Original<br/>PDF / DOCX / ODT]:::file
    Extract[[⚙️ Extracción y Limpieza]]:::proc
    Text(📝 Texto Plano Normalizado):::file
    
    %% Subgrafo de Transformación
    subgraph Chunking [✂️ Estrategia de Fragmentación]
        direction TB
        Strategy[Ventana Deslizante<br/>Size: 220 words | Overlap: 40 words]:::proc
        Chunks[🧩 Lista de Chunks]:::file
        Strategy --> Chunks
    end

    %% Subgrafo de Vectorización
    subgraph Embeddings [🧠 Vectorización]
        direction TB
        Model[[mxbai-embed-large]]:::proc
        Vectors[🔢 Vectores Matemáticos]:::file
        Model --> Vectors
    end

    Storage[(💽 Vector Store Local<br/>Índice .pkl)]:::db

    %% Conexiones del Flujo
    Input --> Extract
    Extract -->|Eliminar ruido| Text
    Text --> Strategy
    Chunks --> Model
    Vectors -->|Indexado| Storage

    
1. Ingesta y Extracción
No importa si subes un PDF o un Word, el sistema normaliza todo:

Detección: Se identifica el formato (.pdf, .docx, .odt).

Extracción: Se extrae el texto crudo eliminando formato visual innecesario.

Limpieza: Se eliminan caracteres nulos y se normalizan los saltos de línea y espacios para optimizar el uso de tokens.

2. Estrategia de Chunking (Ventana Deslizante)
El texto plano se divide matemáticamente para maximizar la recuperación:

Tamaño del Chunk: 220 palabras.

Solapamiento (Overlap): 40 palabras.

Objetivo: Si una frase clave queda cortada al final de un bloque, el overlap asegura que se repita completa al inicio del siguiente, preservando el contexto semántico.

3. Vectorización
Cada fragmento de texto se convierte en un vector matemático usando mxbai-embed-large y se almacena en una base de datos local (.pkl), permitiendo búsquedas por significado y no solo por palabra clave.

🖥️ Requisitos mínimos del sistema
Para ejecutar el sistema RAG de forma correcta (especialmente con Llama 3.1 y contextos largos), la PC debe cumplir:

✔ Hardware mínimo
Procesador: Intel i5 / Ryzen 5 o superior

RAM: 8 GB (mínimo, funcionará lento en resúmenes largos)

Disco: 4 GB libres para documentos + índices + modelos nuevos

GPU: opcional (Ollama puede usar CPU, pero será lento)

✔ Hardware recomendado
Procesador: Intel i7 / Ryzen 7

RAM: 16 GB (Necesario para manejar la ventana de contexto de 20k+ tokens)

SSD: Recomendado para mayor velocidad en carga de modelos

GPU NVIDIA (6GB+ VRAM): Mejora drásticamente la velocidad de inferencia

✔ Software
Windows, Linux o macOS

Python 3.11+ (probado en 3.11.9)

Node.js 18+

Ollama actualizado (versión compatible con Llama 3.1)

Navegador moderno (Chrome/Edge/Firefox)

🧠 CENSYS — Sistema RAG Híbrido
Censys es un sistema de consulta documental avanzado que evoluciona el concepto tradicional de RAG. No solo fragmenta y busca, sino que entiende la intención del usuario para decidir la mejor estrategia de respuesta, todo ejecutándose 100% offline.

👉 Cada computadora tiene sus propios documentos e índices, garantizando privacidad total.

🧩 Tecnologías y Mejoras Implementadas
🖼 Frontend
React + Vite

Tailwind + ShadCN UI

Lucide Icons

Figma Make para diseño UI/UX

⚙ Backend
FastAPI (con tiempos de espera extendidos para tareas pesadas)

Python 3.11

Ollama con gestión de memoria optimizada (Keep-Alive)

🧠 IA / RAG Avanzado (NUEVO)
El sistema ya no es un RAG simple. Incluye:

Enrutamiento Inteligente (Smart Routing):

Detecta si el usuario pide un resumen global (ej: "Resume el documento").

Si es resumen: Desactiva la búsqueda vectorial y lee el documento secuencialmente (hasta ~24k tokens).

Si es pregunta específica: Activa el motor RAG.

Expansión de Consulta (Query Expansion):

Soluciona el problema de vocabulario (ej: "pasos" vs "etapas").

El LLM genera sinónimos técnicos antes de buscar en la base de datos vectorial.

Filtrado de Calidad (Similarity Threshold):

Descarta fragmentos con baja similitud (< 0.25) para evitar alucinaciones.

Modelos Actualizados:

LLM: llama3.1 (Versión más reciente y robusta).

Embeddings: mxbai-embed-large.

🏗️ Arquitectura del sistema
               ┌──────────────────────────┐
               │        FRONTEND          │
               │  React + Vite + UI       │
               └───────────────┬──────────┘
                               │
                               ▼
       ┌──────────────────────────────────────────┐
       │           BACKEND (FastAPI)              │
       │                                          │
       │  /upload  → Extraer + Chunking + Index   │
       │  /query   → 🧠 LÓGICA HÍBRIDA:           │
       │             ┌────────────────────────┐   │
       │             │ ¿Es Resumen?           │   │
       │             ├─────┬──────────────────┤   │
       │             │ SÍ  │ Leer Secuencial  │   │
       │             │     │ (Full Context)   │   │
       │             ├─────┼──────────────────┤   │
       │             │ NO  │ 1. Expandir Query│   │
       │             │     │ 2. Buscar Vector │   │
       │             │     │ 3. Filtrar       │   │
       │             └─────┴──────────────────┘   │
       └───────────────┬──────────────────────────┘
                       │
                       ▼
             ┌────────────────────────┐
             │     OLLAMA (Local)     │
             │  Modelo: llama3.1      │
             │  Ctx: 24,000 tokens    │
             └────────────────────────┘
📂 Estructura del proyecto
Back/
 ├── app/
 │   ├── main.py           # Endpoints y Lifespan (Pre-carga)
 │   ├── rag.py            # Lógica RAG Avanzada (Routing/Expansion)
 │   ├── storage.py        # Gestión de JSON y Pickle
 │   ├── text_extractor.py # Soporte PDF, DOCX, ODT
 │   ├── config.py         # Configuración de Modelos
 │   └── schemas.py        # Modelos Pydantic
 │
 ├── data/
 │   ├── docs/        ← documentos originales (.txt)
 │   ├── indexes/     ← vectores (.pkl)
 │
Front/
 ├── src/components/
 │   ├── UploadPage.tsx
 │   ├── ChatPage.tsx
 ...
🔥 Estrategia de Chunking y Contexto
El sistema utiliza una estrategia mixta para manejar documentos largos (probado hasta 35 chunks / ~8000 palabras).

Configuración de Chunks
Tamaño: 220 palabras.

Solapamiento (Overlap): 40 palabras.

Configuración de Ventana de Contexto (num_ctx)
Se ha configurado Ollama para usar una ventana extendida de 24,000 tokens (vs 4,096 por defecto).

Esto permite cargar documentos enteros en memoria para tareas de resumen sin cortar el final.

Se aumentaron los Timeouts HTTP a 600 segundos (10 minutos) para permitir que el modelo procese resúmenes extensos sin errores de conexión.

🤖 Configuración del Modelo
En Back/app/config.py:

Python

# Modelo principal (Actualizado a Llama 3.1)
LLM_MODEL = "llama3.1"

# Modelo de Embeddings
EMBEDDING_MODEL = "mxbai-embed-large"
Nota: Si obtienes error model not found, asegúrate de haber ejecutado:

Bash

ollama pull llama3.1
ollama pull mxbai-embed-large
🚀 Instalación y Ejecución
1. Backend
Bash

cd Back
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Iniciar servidor (con recarga automática)
uvicorn app.main:app --reload
2. Frontend
Bash

cd Front
npm install
npm run dev
3. Verificar Modelos
Asegúrate de que Ollama esté corriendo en segundo plano:

Bash

ollama serve
🎉 Conclusión
Censys ahora es un sistema capaz de leer libros enteros para resumirlos o buscar agujas en un pajar con alta precisión semántica, resolviendo las limitaciones clásicas de los RAGs básicos mediante ingeniería de prompts avanzada y gestión de memoria dinámica.