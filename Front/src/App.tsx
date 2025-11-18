import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Zap, Upload, FileText, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { Button } from './components/ui/button';
import UploadPage from './components/pages/UploadPage';
import DocumentsPage from './components/pages/DocumentsPage';
import ChatPage from './components/pages/ChatPage';
import FloatingChat from './components/FloatingChat';
import { isUsingMockData } from './utils/api';

function AppContent() {
  const [darkMode, setDarkMode] = useState(true);
  const location = useLocation();
  const usingMockData = isUsingMockData();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen transition-colors dark bg-gradient-to-br from-[#0a0e1a] via-[#0f1729] to-[#0a0e1a]">
      {/* Animated background effect */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Zap className="w-10 h-10 text-cyan-400 glow-text" />
            <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 glow-text uppercase tracking-wider">
              Sistema RAG
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* API Status Indicator */}
            {usingMockData && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 uppercase tracking-wide">Modo Demo</span>
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="dark:text-cyan-400 dark:border-cyan-500/50 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-400 transition-all duration-300"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mb-8 flex gap-4 flex-wrap">
          <Link to="/">
            <Button
              variant={isActive('/') ? 'default' : 'outline'}
              className={
                isActive('/')
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 uppercase tracking-wide'
                  : 'dark:text-cyan-400 dark:border-cyan-500/50 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-400 transition-all duration-300 uppercase tracking-wide'
              }
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Documentos
            </Button>
          </Link>
          <Link to="/documents">
            <Button
              variant={isActive('/documents') ? 'default' : 'outline'}
              className={
                isActive('/documents')
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 uppercase tracking-wide'
                  : 'dark:text-cyan-400 dark:border-cyan-500/50 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-400 transition-all duration-300 uppercase tracking-wide'
              }
            >
              <FileText className="h-4 w-4 mr-2" />
              Mis Documentos
            </Button>
          </Link>
          <Link to="/chat">
            <Button
              variant={isActive('/chat') ? 'default' : 'outline'}
              className={
                isActive('/chat')
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 uppercase tracking-wide'
                  : 'dark:text-cyan-400 dark:border-cyan-500/50 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-400 transition-all duration-300 uppercase tracking-wide'
              }
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </div>

      {/* Floating Chat Widget */}
      <FloatingChat />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}