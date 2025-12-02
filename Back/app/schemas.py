from pydantic import BaseModel
from typing import List

class DocumentMetadata(BaseModel):
    id: str
    filename: str
    size: int
    n_chunks: int

class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]

# En main.py, permite que por defecto busque más trozos
class QueryRequest(BaseModel):
    document_id: str
    question: str
    top_k: int = 15 

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
