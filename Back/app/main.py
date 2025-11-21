import uuid
import os

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .storage import DocumentStore, delete_document   # <-- FALTABA ESTO
from .schemas import DocumentMetadata, DocumentListResponse, QueryRequest, QueryResponse
from .rag import build_index, answer
from .config import DOCS_DIR

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
    if not file.filename.endswith(".txt"):
        raise HTTPException(400, "Solo se aceptan .txt")

    content = (await file.read()).decode("utf-8")
    doc_id = str(uuid.uuid4())

    path = os.path.join(DOCS_DIR, f"{doc_id}.txt")
    with open(path, "w") as f:
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
