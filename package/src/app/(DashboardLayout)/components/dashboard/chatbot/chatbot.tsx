
'use client';
import { useEffect, useRef, useState } from 'react';
import './chatbot.css';

export default function Chatbot() {
  const chatboxRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // ✅ important

  const appendMessage = (text: string, isUser: boolean = false) => {
    setMessages((prev) => [...prev, { text, isUser }]);
  };

  const sendMessage = async () => {
    const message = input.trim();
    if (!message) return;
    appendMessage(message, true);
    setInput('');
    setIsLoading(true); // ⏳ Commence l’attente

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
      appendMessage(data.response ? '🤖 ' + data.response : '❌ Erreur : ' + JSON.stringify(data.error));
    } catch (error: any) {
      appendMessage('❌ Erreur : ' + error.message);
    } finally {
      setIsLoading(false); // ✅ Fin de l’attente
    }
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Reconnaissance vocale non supportée.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'fr-FR';
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
    <div className="container">
      <h1>💬 Système de Recommandation via IA</h1>
      <div id="chatbox" ref={chatboxRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.isUser ? 'user' : 'bot'}`}>{msg.text}</div>
        ))}
        {isLoading && (
  <div className="bubble bot loading">
    <span className="spinner">⏳</span> Réponse en cours...
  </div>
)}

      </div>
      <div className="input-area">
        <input
          type="text"
          placeholder="Écris ici..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
  style={{ fontSize: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
  id="micBtn"
  onClick={handleMicClick}
>
  🎙️
</button>        
<button style={{ fontSize: '24px'}}id="sendBtn" onClick={sendMessage} className="icon-button">↑</button>

      </div>
    </div>
  );
}


