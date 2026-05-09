import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Sparkles,
  Loader2
} from 'lucide-react';
import './App.css';

const API_URL = '/api';

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (selectedFile) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Please upload a PDF or TXT file.');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(true);
      setMessages([{
        role: 'ai',
        content: `I've successfully processed "${selectedFile.name}". What would you like to know about it?`
      }]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to process document.');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !uploadSuccess) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, { query: userMessage });
      setMessages(prev => [...prev, { role: 'ai', content: response.data.answer }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Sorry, I encountered an error while trying to answer that.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="brand">
          <BookOpen className="brand-icon" size={28} />
          <span>NotebookLM<span style={{ color: 'var(--text-muted)', fontWeight: 300 }}>Clone</span></span>
        </div>

        <div className="upload-section">
          <h2>Source Document</h2>
          
          <div 
            className={`upload-box ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf,.txt" 
              style={{ display: 'none' }} 
            />
            
            {isUploading ? (
              <>
                <Loader2 className="upload-icon animate-spin" size={32} />
                <p className="upload-text">Processing document...</p>
              </>
            ) : file && uploadSuccess ? (
              <div className="file-info" style={{width: '100%'}}>
                <FileText className="file-icon" size={24} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </div>
            ) : (
              <>
                <UploadCloud className="upload-icon" size={36} />
                <p className="upload-text">
                  <span>Click to upload</span> or drag and drop<br/>
                  PDF or TXT files
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-container">
        <div className="chat-header">
          <Sparkles className="brand-icon" size={20} />
          <h2>Document Assistant</h2>
        </div>

        <div className="chat-messages">
          {!uploadSuccess && messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Bot size={40} />
              </div>
              <h3>Welcome to NotebookLM Clone</h3>
              <p>Upload a PDF document from the sidebar to start asking questions. I'll read through it and provide answers based strictly on the text.</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <motion.div 
                  key={index} 
                  className={`message ${msg.role}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="avatar">
                    {msg.role === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="var(--accent-primary)" />}
                  </div>
                  <div className="message-content">
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="message ai">
                  <div className="avatar">
                    <Bot size={20} color="var(--accent-primary)" />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="chat-input-container">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uploadSuccess ? "Ask anything about the document..." : "Please upload a document first..."}
              disabled={!uploadSuccess || isTyping}
              rows={1}
            />
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!input.trim() || !uploadSuccess || isTyping}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
