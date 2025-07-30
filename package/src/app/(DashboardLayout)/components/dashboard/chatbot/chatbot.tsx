'use client';
import { useEffect, useRef, useState } from 'react';
import './chatbot.css';

export default function Chatbot() {
  const chatboxRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<{ text: string; isUser: boolean; lang?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const appendMessage = (text: string, isUser: boolean = false, lang?: string) => {
    setMessages((prev) => [...prev, { text, isUser, lang }]);
  };

  const sendMessage = async () => {
    const message = input.trim();
    if (!message) return;
    appendMessage(message, true);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Status: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      appendMessage(data.response ? data.response : '❌ Erreur : ' + JSON.stringify(data.error), false);
    } catch (error: any) {
      appendMessage('❌ Erreur : ' + error.message, false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Reconnaissance vocale non supportée.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'fr-FR'; // Langue par défaut, ajustable via détection
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(sendMessage, 500);
    };

    recognition.onerror = (event: any) => {
      alert('Erreur : ' + event.error);
    };
  };

  useEffect(() => {
    chatboxRef.current?.scrollTo(0, chatboxRef.current.scrollHeight);
  }, [messages, isLoading]);

  return (
    <div className="chat-container" style={{ 
      maxWidth: '900px', 
      margin: '20px auto', 
      background: '#f9fafb', 
      borderRadius: '16px', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
      overflow: 'hidden',
      fontFamily: '"Inter", -apple-system, sans-serif'
    }}>
      <div className="chat-header" style={{ 
        background: 'linear-gradient(135deg, #1e88e5, #42a5f5)', 
        color: 'white', 
        padding: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: 'white', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          🤖
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Système de Recommandation Via IA</h2>
      </div>
      <div 
        id="chatbox" 
        ref={chatboxRef} 
        style={{ 
          height: '500px', 
          overflowY: 'auto', 
          padding: '20px', 
          background: 'white'
        }}
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`message-bubble ${msg.isUser ? 'user' : 'bot'}`} 
            style={{ 
              marginBottom: '12px', 
              maxWidth: '90%', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              animation: 'fadeIn 0.3s ease-in',
              background: msg.isUser ? '#e3f2fd' : '#f5f5f5',
              color: msg.isUser ? '#1e88e5' : '#333',
              marginLeft: msg.isUser ? 'auto' : '0',
            }}
          >
            {!msg.isUser && <span style={{ marginRight: '8px' }}>🤖</span>}
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div 
            className="message-bubble bot" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#e3f2fd', 
              color: '#1e88e5'
            }}
          >
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#1e88e5', 
              animation: 'pulse 1.5s infinite'
            }} />
            <span>Réponse en cours...</span>
          </div>
        )}
      </div>
      <div className="input-area" style={{ 
        padding: '16px', 
        background: 'white', 
        display: 'flex', 
        gap: '10px', 
        borderTop: '1px solid #e0e0e0'
      }}>
        <input
          type="text"
          placeholder="Posez votre question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{ 
            flexGrow: 1, 
            padding: '10px 16px', 
            border: '1px solid #e0e0e0', 
            borderRadius: '24px', 
            fontSize: '1rem', 
            outline: 'none',
            transition: 'border-color 0.3s'
          }}
        />
        <button
          style={{ 
            fontSize: '24px', 
            background: 'none', 
            border: 'none', 
            color: '#1e88e5', 
            cursor: 'pointer', 
            transition: 'color 0.3s'
          }}
          id="micBtn"
          onClick={handleMicClick}
          onMouseOver={(e) => (e.currentTarget.style.color = '#005cb2')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#1e88e5')}
        >
          🎙️
        </button>
        <button style={{ fontSize: '24px'}}id="sendBtn" onClick={sendMessage} className="icon-button">↑</button>

      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 0.4; }
            100% { transform: scale(1); opacity: 0.7; }
          }
          .chat-container input:focus {
            border-color: #1e88e5;
            box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.2);
          }
        `}
      </style>
    </div>
  );
}