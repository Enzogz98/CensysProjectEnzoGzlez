import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { fetchDocuments, queryDocument } from '../../utils/api';

interface Document {
  id: string;
  filename: string;
  size: number;
  n_chunks: number;
}

interface QueryResponse {
  answer: string;
  sources: string[];
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

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
    } catch {
      setDocuments([]);
    }
  };

  const handleQuery = async () => {
    if (!selectedDocId) return alert('Por favor selecciona un documento');
    if (!question.trim()) return alert('Por favor ingresa una pregunta');

    const userMessage: Message = { type: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);

    const currentQuestion = question;
    setQuestion('');
    setLoading(true);

    try {
const data = await queryDocument(selectedDocId, currentQuestion);


      const assistantMessage: Message = {
        type: 'assistant',
        content: data.answer // <-- SOLO la respuesta interpretada
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: 'Ocurrió un error procesando la pregunta.'
        }
      ]);
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
    <div className="grid gap-6">
      <Card className="dark:bg-gray-900/50 dark:border-cyan-500/30 backdrop-blur-sm glow-border">
        <CardContent className="pt-6">
          <label className="block mb-2 dark:text-cyan-300 uppercase tracking-wide">
            Documento a consultar:
          </label>

          <Select value={selectedDocId} onValueChange={setSelectedDocId}>
            <SelectTrigger className="dark:bg-gray-800/50 dark:border-cyan-500/50 dark:text-cyan-100 hover:border-cyan-400 transition-all">
              <SelectValue placeholder="-- Selecciona un documento --" />
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
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900/50 dark:border-cyan-500/30 backdrop-blur-sm glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-cyan-400 uppercase tracking-wide">
            <MessageSquare className="h-5 w-5" />
            Chat de Consultas
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="h-[500px] overflow-y-auto mb-4 space-y-4 p-4 bg-gray-800/30 rounded-md border border-cyan-500/20">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="dark:text-cyan-100/40 text-center">
                  Selecciona un documento y comienza a hacer preguntas...
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
                      className={`max-w-[80%] p-4 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                          : 'bg-gray-800/70 dark:text-cyan-100 border border-cyan-500/30'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta... (Enter para enviar)"
              rows={3}
              disabled={!selectedDocId}
              className="dark:bg-gray-800/50 dark:border-cyan-500/50 dark:text-cyan-100 dark:placeholder-gray-500 focus:border-cyan-400 transition-all resize-none"
            />

            <Button
              onClick={handleQuery}
              disabled={loading || !selectedDocId || !question.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 disabled:opacity-50 disabled:shadow-none transition-all duration-300"
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
