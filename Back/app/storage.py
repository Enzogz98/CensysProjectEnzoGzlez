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
            try:
                with open(DOCS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for doc_id, meta in data.items():
                        self.docs[doc_id] = DocumentMetadata(**meta)
            except Exception:
                # si docs.json se corrompe, lo reseteamos
                self.docs = {}
                with open(DOCS_PATH, "w", encoding="utf-8") as f:
                    json.dump({}, f)

    def _save(self):
        with open(DOCS_PATH, "w", encoding="utf-8") as f:
            json.dump({k: v.model_dump() for k, v in self.docs.items()}, f, indent=2)

    def add(self, metadata: DocumentMetadata):
        self.docs[metadata.id] = metadata
        self._save()

    def list(self):
        return list(self.docs.values())

    def get(self, doc_id: str):
        return self.docs.get(doc_id)

    def save_index(self, doc_id, chunks, embeddings):
        path = os.path.join(INDEX_DIR, f"{doc_id}.pkl")
        with open(path, "wb") as f:
            pickle.dump({"chunks": chunks, "embeddings": embeddings}, f)

    def load_index(self, doc_id):
        path = os.path.join(INDEX_DIR, f"{doc_id}.pkl")
        if not os.path.exists(path):
            return None
        with open(path, "rb") as f:
            return pickle.load(f)


def delete_document(doc_id: str) -> bool:
    """
    Elimina archivo .txt, índice .pkl y metadata del docs.json.
    """
    deleted_any = False

    # borrar txt
    doc_path = os.path.join(DOCS_DIR, f"{doc_id}.txt")
    if os.path.exists(doc_path):
        os.remove(doc_path)
        deleted_any = True

    # borrar índice
    index_path = os.path.join(INDEX_DIR, f"{doc_id}.pkl")
    if os.path.exists(index_path):
        os.remove(index_path)
        deleted_any = True

    # borrar metadata del docs.json
    if os.path.exists(DOCS_PATH):
        with open(DOCS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        if doc_id in data:
            del data[doc_id]
            with open(DOCS_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            deleted_any = True

    return deleted_any
