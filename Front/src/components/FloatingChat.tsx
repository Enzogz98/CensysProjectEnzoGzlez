import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { fetchDocuments, queryDocument } from '../utils/api';

interface Document {
  id: string;
  filename: string;
  size: number;
  n_chunks: number;
}

interface QueryResponse {
  answer: string;
  sources: string[]; // aunque llegue, NO lo usamos
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === cargar documentos al abrir ===
  useEffect(() => {
    if (isOpen && documents.length === 0) {
      loadDocuments();
    }
  }, [isOpen]);

  // === scroll automático ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDocuments = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch {
      setDocuments([]);
    }
  };

  // === enviar consulta ===
  const handleQuery = async () => {
    if (!selectedDocId) {
      alert("Por favor selecciona un documento");
      return;
    }

    if (!question.trim()) return;

    const userMsg: Message = { type: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);

    const sentQuestion = question;
    setQuestion('');
    setLoading(true);

    try {
      const data: QueryResponse = await queryDocument(selectedDocId, sentQuestion);

      const assistantMsg: Message = {
        type: 'assistant',
        content: data.answer // <-- SOLO respuesta, sin fuentes
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: "Ocurrió un error al procesar la pregunta."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r 
          from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white 
          shadow-lg shadow-cyan-500/50 flex items-center justify-center transition-all 
          duration-300 glow-border-strong z-50 hover:scale-110"
        aria-label="Abrir chat"
      >
        {isOpen ? <X className="w-8 h-8" /> : <HelpCircle className="w-8 h-8 animate-pulse" />}
      </button>

      {/* CHAT FLOTANTE */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 h-[600px] bg-gray-900/95 
          backdrop-blur-md border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/30 
          z-50 flex flex-col glow-border-strong">

          {/* HEADER */}
          <div className="p-4 border-b border-cyan-500/30 bg-gradient-to-r 
            from-cyan-500/20 to-blue-500/20 flex items-center justify-between">
            <h3 className="dark:text-cyan-400 uppercase tracking-wide flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Consulta
            </h3>
            <button onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5 text-cyan-400 hover:text-cyan-300" />
            </button>
          </div>

          {/* SELECT DOCUMENTO */}
          <div className="p-4 border-b border-cyan-500/20">
            <label className="block mb-2 dark:text-cyan-300 uppercase tracking-wide">
              Documento:
            </label>

            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
              <SelectTrigger className="dark:bg-gray-800/50 dark:border-cyan-500/50 dark:text-cyan-100">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>

              <SelectContent className="dark:bg-gray-800 dark:border-cyan-500/50">
                {documents.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MENSAJES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-lg ${
                  msg.type === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    : "bg-gray-800/70 dark:text-cyan-100 border border-cyan-500/30"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-4 border-t border-cyan-500/20">
            <div className="flex gap-2">
              <Textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregunta..."
                rows={2}
                disabled={!selectedDocId}
                className="dark:bg-gray-800/50 dark:border-cyan-500/50"
              />

              <Button
                onClick={handleQuery}
                disabled={loading || !question.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/50"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
