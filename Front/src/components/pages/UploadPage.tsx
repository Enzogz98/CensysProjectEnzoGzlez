import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { uploadDocument } from '../../utils/api';

interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  n_chunks: number;
}

export default function UploadPage() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const allowedExtensions = ['.txt', '.pdf', '.docx', '.odt'];

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadMessage('Por favor selecciona un archivo');
      return;
    }

    const lower = uploadFile.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => lower.endsWith(ext));

    if (!isAllowed) {
      setUploadMessage('Error: Solo se aceptan archivos .txt, .pdf, .docx y .odt');
      return;
    }

    setLoading(true);
    setUploadMessage('');

    try {
      const result = await uploadDocument(uploadFile) as UploadResponse;
      setUploadMessage(`✓ Archivo subido exitosamente: ${result.filename}`);
      setUploadFile(null);

      // Reset input file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setUploadMessage(
        `✗ Error al subir: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="dark:bg-gray-900/50 dark:border-cyan-500/30 backdrop-blur-sm glow-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-cyan-400 uppercase tracking-wide">
          <Upload className="h-5 w-5" />
          Subir Documento
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Se aceptan archivos .txt, .pdf, .docx y .odt
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <input
              id="file-upload"
              type="file"
              accept=".txt,.pdf,.docx,.odt"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 border border-cyan-500/30 rounded-md dark:bg-gray-800/50 dark:border-cyan-500/50 dark:text-cyan-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 transition-all"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={loading || !uploadFile}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 disabled:opacity-50 disabled:shadow-none transition-all duration-300 uppercase tracking-wide"
          >
            {loading ? 'Subiendo...' : 'Subir'}
          </Button>
        </div>

        {uploadMessage && (
          <div
            className={`mt-4 p-4 rounded-md border-l-4 ${
              uploadMessage.startsWith('✓')
                ? 'bg-green-500/10 border-green-500 text-green-400'
                : 'bg-red-500/10 border-red-500 text-red-400'
            }`}
          >
            {uploadMessage}
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-800/30 rounded-md border border-cyan-500/20">
          <h3 className="dark:text-cyan-400 uppercase tracking-wide mb-3">Instrucciones</h3>
          <ul className="space-y-2 dark:text-cyan-100/80">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">▸</span>
              <span>Selecciona un archivo (.txt, .pdf, .odt o .docx)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">▸</span>
              <span>Haz clic en "Subir" para procesarlo e indexarlo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">▸</span>
              <span>El sistema lo convertirá internamente a texto para análisis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">▸</span>
              <span>Consulta el documento desde la sección de Chat</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
