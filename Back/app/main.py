import uuid
import os
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware

from .storage import DocumentStore, delete_document   # <-- FALTABA ESTO
from .schemas import DocumentMetadata, DocumentListResponse, QueryRequest, QueryResponse
from .rag import build_index, answer
from .config import DOCS_DIR

from mimetypes import guess_extension
from .text_extractor import extract_text
app = FastAPI(title="RAG PoC Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = DocumentStore()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/documents", response_model=DocumentMetadata)
async def upload(file: UploadFile = File(...)):
    allowed = [".txt", ".pdf", ".docx", ".odt"]
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(400, "Solo .txt, .pdf, .docx, .odt")

    file_bytes = await file.read()

    # extraer texto
    from .text_extractor import extract_text
    try:
        content = extract_text(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(400, f"Error extrayendo texto: {e}")

    if not content.strip():
        raise HTTPException(400, "El documento contiene 0 texto utilizable.")

    doc_id = str(uuid.uuid4())
    path = os.path.join(DOCS_DIR, f"{doc_id}.txt")

    # guardamos como txt interno
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    n_chunks = await build_index(doc_id, content, store)

    meta = DocumentMetadata(
        id=doc_id,
        filename=file.filename,
        size=len(content),
        n_chunks=n_chunks
    )
    store.add(meta)

    return meta

@app.post("/documents/byurl", response_model=DocumentMetadata)
async def upload_by_url(url: str = Form(...)):
    original_url = url.strip()

    # -------------------------------
    #   AUTO-GOOGLE DOCS
    # -------------------------------
    if "docs.google.com/document" in original_url and "export" not in original_url:
        try:
            doc_id = original_url.split("/d/")[1].split("/")[0]
            url = f"https://docs.google.com/document/d/{doc_id}/export?format=docx"
        except:
            raise HTTPException(400, "URL de Google Docs inválida")

    # -------------------------------
    #   AUTO-GOOGLE DRIVE
    # -------------------------------
    if "drive.google.com" in original_url and "uc?export=download" not in original_url:
        try:
            if "id=" in original_url:
                file_id = original_url.split("id=")[1].split("&")[0]
            else:
                # Enlace tipo /file/d/<id>/
                file_id = original_url.split("/d/")[1].split("/")[0]
            url = f"https://drive.google.com/uc?id={file_id}&export=download"
        except:
            raise HTTPException(400, "URL de Google Drive inválida")

    # -------------------------------
    #   DESCARGA
    # -------------------------------
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url)
        except Exception as e:
            raise HTTPException(400, f"No se pudo descargar la URL: {e}")

    if r.status_code != 200:
        raise HTTPException(400, f"Error HTTP al descargar: {r.status_code}")

    content_bytes = r.content

    # -------------------------------
    #   DETECTAR EXTENSIÓN/MIME
    # -------------------------------
    content_type = r.headers.get("content-type", "")
    ext = guess_extension(content_type.split(";")[0])

    if ext is None:
        if "pdf" in content_type:
            ext = ".pdf"
        elif "word" in content_type or "docx" in content_type:
            ext = ".docx"
        elif "opendocument" in content_type or "odt" in original_url:
            ext = ".odt"
        elif "text" in content_type:
            ext = ".txt"
        else:
            ext = ".txt"

    filename = f"remote_file{ext}"

    # -------------------------------
    #   EXTRAER TEXTO
    # -------------------------------
    try:
        text = extract_text(filename, content_bytes)
    except Exception as e:
        raise HTTPException(400, f"Error extrayendo texto: {e}")

    if not text.strip():
        raise HTTPException(400, "El documento descargado no contiene texto útil.")

    # -------------------------------
    #   GUARDAR COMO TXT INTERNO
    # -------------------------------
    doc_id = str(uuid.uuid4())
    path = os.path.join(DOCS_DIR, f"{doc_id}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

    # -------------------------------
    #   INDEXAR
    # -------------------------------
    n_chunks = await build_index(doc_id, text, store)

    meta = DocumentMetadata(
        id=doc_id,
        filename=filename,
        size=len(text),
        n_chunks=n_chunks
    )
    store.add(meta)
    return meta

@app.get("/documents", response_model=DocumentListResponse)
async def list_docs():
    return DocumentListResponse(documents=store.list())

@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if not store.get(req.document_id):
        raise HTTPException(404, "Documento no encontrado")

    ans, sources = await answer(store, req.document_id, req.question, req.top_k)
    return QueryResponse(answer=ans, sources=sources)

@app.delete("/documents/{doc_id}")
def delete_document_endpoint(doc_id: str):
    deleted = delete_document(doc_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    return {"status": "deleted", "id": doc_id}
