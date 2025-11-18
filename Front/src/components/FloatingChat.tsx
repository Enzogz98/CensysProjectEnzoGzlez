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
  sources: Array<{
    chunk_id: string;
    content: string;
    similarity: number;
  }>;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
  sources?: QueryResponse['sources'];
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && documents.length === 0) {
      loadDocuments();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDocuments = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (error) {
      setDocuments([]);
    }
  };

  const handleQuery = async () => {
    if (!selectedDocId) {
      alert('Por favor selecciona un documento');
      return;
    }

    if (!question.trim()) {
      return;
    }

    const userMessage: Message = { type: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    
    const currentQuestion = question;
    setQuestion('');
    setLoading(true);

    try {
      const data = await queryDocument(selectedDocId, currentQuestion);
      
      const assistantMessage: Message = {
        type: 'assistant',
        content: data.answer,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 flex items-center justify-center transition-all duration-300 glow-border-strong z-50 hover:scale-110"
        aria-label="Abrir chat de consultas"
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <HelpCircle className="w-8 h-8 animate-pulse" />
        )}
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 h-[600px] bg-gray-900/95 backdrop-blur-md border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/30 z-50 flex flex-col glow-border-strong">
          {/* Header */}
          <div className="p-4 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
            <div className="flex items-center justify-between">
              <h3 className="dark:text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Consulta Rápida
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Selector */}
          <div className="p-4 border-b border-cyan-500/20">
            <label className="block mb-2 dark:text-cyan-300 uppercase tracking-wide">Documento:</label>
            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
              <SelectTrigger className="dark:bg-gray-800/50 dark:border-cyan-500/50 dark:text-cyan-100 hover:border-cyan-400 transition-all">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-cyan-500/50">
                {documents.map((doc) => (
                  <SelectItem 
                    key={doc.id} 
                    value={doc.id}
                    className="dark:text-cyan-100 dark:focus:bg-cyan-500/20 dark:focus:text-cyan-300"
                  >
                    {doc.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="dark:text-cyan-100/40 text-center">
                  Haz una pregunta...
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                          : 'bg-gray-800/70 dark:text-cyan-100 border border-cyan-500/30'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <details className="mt-2 pt-2 border-t border-cyan-500/30">
                          <summary className="cursor-pointer text-cyan-300 hover:text-cyan-200 uppercase tracking-wide">
                            Fuentes
                          </summary>
                          <div className="mt-2 text-xs max-h-32 overflow-y-auto">
                            {msg.sources.map((source, i) => (
                              <div key={i} className="mb-2 p-2 bg-gray-900/50 rounded">
                                <p className="text-cyan-400">Similarity: {source.similarity.toFixed(2)}</p>
                                <p className="text-cyan-100/70 line-clamp-2">{source.content}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-cyan-500/20 bg-gray-900/50">
            <div className="flex gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregunta..."
                rows={2}
                disabled={!selectedDocId}
                className="dark:bg-gray-800/50 dark:border-cyan-500/50 dark:text-cyan-100 dark:placeholder-gray-500 focus:border-cyan-400 transition-all resize-none"
              />
              <Button
                onClick={handleQuery}
                disabled={loading || !selectedDocId || !question.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 disabled:opacity-50 disabled:shadow-none transition-all duration-300"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}