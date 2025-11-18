import os
import json
import pickle

from .schemas import DocumentMetadata
from .config import DOCS_DIR, INDEX_DIR

DOCS_PATH = os.path.join(DOCS_DIR, "docs.json")

class DocumentStore:
    def __init__(self):
        self.docs = {}
        if os.path.exists(DOCS_PATH):
            with open(DOCS_PATH, "r") as f:
                data = json.load(f)
                for doc_id, meta in data.items():
                    self.docs[doc_id] = DocumentMetadata(**meta)

    def _save(self):
        with open(DOCS_PATH, "w") as f:
            json.dump({k: v.model_dump() for k, v in self.docs.items()}, f, indent=2)

    def add(self, metadata: DocumentMetadata):
        self.docs[metadata.id] = metadata
        self._save()

    def list(self):
        return list(self.docs.values())

    def get(self, doc_id: str):
        return self.docs.get(doc_id)

    def save_index(self, doc_id, chunks, embeddings):
        with open(os.path.join(INDEX_DIR, f"{doc_id}.pkl"), "wb") as f:
            pickle.dump({"chunks": chunks, "embeddings": embeddings}, f)

    def load_index(self, doc_id):
        path = os.path.join(INDEX_DIR, f"{doc_id}.pkl")
        if not os.path.exists(path):
            return None
        with open(path, "rb") as f:
            return pickle.load(f)
