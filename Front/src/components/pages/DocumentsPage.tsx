import { useState, useEffect } from 'react';
import { RefreshCw, FileText, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { fetchDocuments } from '../../utils/api';

interface Document {
  id: string;
  filename: string;
  size: number;
  n_chunks: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="dark:bg-gray-900/50 dark:border-cyan-500/30 backdrop-blur-sm glow-border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 dark:text-cyan-400 uppercase tracking-wide">
            <FileText className="h-5 w-5" />
            Documentos Cargados
          </CardTitle>
          <Button
            variant="outline"
            onClick={loadDocuments}
            disabled={loading}
            className="dark:text-cyan-400 dark:border-cyan-500/50 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-400 transition-all duration-300 uppercase tracking-wide"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-cyan-400/30 mb-4" />
            <p className="dark:text-cyan-100/60">No hay documentos cargados aún</p>
            <p className="dark:text-cyan-100/40 mt-2">Ve a "Subir Documentos" para comenzar</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-5 rounded-md border transition-all cursor-pointer ${
                  selectedDoc?.id === doc.id
                    ? 'bg-cyan-500/20 border-cyan-400 glow-border-strong'
                    : 'bg-gray-800/50 border-cyan-500/30 hover:border-cyan-400 glow-border'
                }`}
                onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="dark:text-cyan-300 mb-2">{doc.filename}</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-cyan-100/60">
                      <div>
                        <span className="text-cyan-400">ID:</span> {doc.id}
                      </div>
                      <div>
                        <span className="text-cyan-400">Size:</span> {doc.size} bytes
                      </div>
                      <div>
                        <span className="text-cyan-400">Chunks:</span> {doc.n_chunks}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Aquí podrías agregar la funcionalidad de eliminar
                      alert('Funcionalidad de eliminar - implementar según tu API');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {selectedDoc?.id === doc.id && (
                  <div className="mt-4 pt-4 border-t border-cyan-500/30">
                    <h4 className="dark:text-cyan-400 uppercase tracking-wide mb-2">Detalles completos</h4>
                    <pre className="dark:text-cyan-100 font-mono bg-gray-900/50 p-3 rounded">
{`ID:       ${doc.id}
Filename: ${doc.filename}
Size:     ${doc.size} bytes
Chunks:   ${doc.n_chunks}`}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}