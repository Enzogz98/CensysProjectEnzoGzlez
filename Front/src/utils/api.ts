// API Configuration
export const API_BASE = "http://localhost:8000";

// Mock data for development/demo
export const MOCK_DOCUMENTS = [
  {
    id: "doc-001",
    filename: "manual_usuario.txt",
    size: 15420,
    n_chunks: 23
  },
  {
    id: "doc-002",
    filename: "guia_tecnica.txt",
    size: 28900,
    n_chunks: 42
  },
  {
    id: "doc-003",
    filename: "faq_sistema.txt",
    size: 9856,
    n_chunks: 15
  }
];

export const MOCK_RESPONSES = [
  "Esta es una respuesta de demostración del sistema RAG. En producción, aquí se mostraría la respuesta generada por el modelo basándose en el contenido del documento.",
  "El sistema analiza los documentos y utiliza técnicas de recuperación aumentada para proporcionar respuestas precisas basadas en el contexto.",
  "Para obtener respuestas reales, conecta el frontend a tu API backend en http://localhost:8000",
];

// Check if API is available
let apiAvailable: boolean | null = null;
let apiCheckInProgress = false;

export async function checkApiAvailability(): Promise<boolean> {
  if (apiAvailable !== null) return apiAvailable;
  if (apiCheckInProgress) return false;
  
  apiCheckInProgress = true;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    apiAvailable = response.ok;
    return apiAvailable;
  } catch (error) {
    apiAvailable = false;
    return false;
  } finally {
    apiCheckInProgress = false;
  }
}

export function isUsingMockData(): boolean {
  return apiAvailable === false;
}

// Fetch documents with fallback to mock data
export async function fetchDocuments() {
  try {
    const isAvailable = await checkApiAvailability();
    
    if (!isAvailable) {
      return MOCK_DOCUMENTS;
    }

    const response = await fetch(`${API_BASE}/documents`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.documents || [];
  } catch (error) {
    return MOCK_DOCUMENTS;
  }
}

// Upload document
export async function uploadDocument(file: File) {
  const isAvailable = await checkApiAvailability();
  
  if (!isAvailable) {
    // Simulate upload with mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          filename: file.name,
          message: 'Documento simulado (modo demostración)'
        });
      }, 1000);
    });
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Query document
export async function queryDocument(documentId: string, question: string) {
  const isAvailable = await checkApiAvailability();
  
  if (!isAvailable) {
    // Return mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        resolve({
          answer: randomResponse,
          sources: [
            {
              chunk_id: "chunk-001",
              content: "Este es un fragmento de ejemplo del documento. En producción, aquí se mostrarían los chunks relevantes del documento consultado.",
              similarity: 0.89
            },
            {
              chunk_id: "chunk-002",
              content: "Otro fragmento relevante que contribuye a la respuesta generada por el sistema RAG.",
              similarity: 0.76
            }
          ]
        });
      }, 1500);
    });
  }

  const response = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: documentId,
      question: question,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}