// API BASE
export const API_BASE = "http://localhost:8000";

// MOCK DATA
export const MOCK_DOCUMENTS = [
  {
    id: "doc-001",
    filename: "manual_usuario.txt",
    size: 15420,
    n_chunks: 23,
  },
  {
    id: "doc-002",
    filename: "guia_tecnica.txt",
    size: 28900,
    n_chunks: 42,
  },
];

export const MOCK_RESPONSES = [
  "Respuesta demo del sistema RAG.",
  "Otra respuesta simulada.",
];

// ---------- API CHECK ----------
let apiAvailable: boolean | null = null;

export async function checkApiAvailability() {
  if (apiAvailable !== null) return apiAvailable;

  try {
    const res = await fetch(`${API_BASE}/documents`);
    apiAvailable = res.ok;
  } catch (e) {
    apiAvailable = false;
  }
  return apiAvailable;
}

export function isUsingMockData() {
  return apiAvailable === false;
}

// ---------- FETCH DOCUMENTS ----------
export async function fetchDocuments() {
  const available = await checkApiAvailability();

  if (!available) return MOCK_DOCUMENTS;

  const res = await fetch(`${API_BASE}/documents`);
  const data = await res.json();

  // El backend devuelve { documents: [...] }
  return data.documents || [];
}

// ---------- UPLOAD DOCUMENT ----------
export async function uploadDocument(file: File) {
  const available = await checkApiAvailability();

  if (!available) {
    return {
      id: "sim-" + Date.now(),
      filename: file.name,
      size: file.size,
      n_chunks: 0,
    };
  }

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("Error al subir documento");

  return res.json();
}

// ---------- QUERY DOCUMENT ----------
export async function queryDocument(documentId: string, question: string) {
  const available = await checkApiAvailability();

  if (!available) {
    return {
      answer: MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)],
      sources: ["Chunk simulado 1", "Chunk simulado 2"],
    };
  }

  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_id: documentId, question }),
  });

  if (!res.ok) throw new Error("Error en la consulta RAG");

  const backendData = await res.json();

  // El backend devuelve: sources: [string, string]
  return {
    answer: backendData.answer,
    sources: backendData.sources || [],
  };
}
export async function deleteDocumentApi(documentId: string) {
  const available = await checkApiAvailability();

  if (!available) {
    return { status: "deleted", id: documentId };
  }

  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    throw new Error(`Error al eliminar documento (${res.status})`);
  }

  return res.json();
}
