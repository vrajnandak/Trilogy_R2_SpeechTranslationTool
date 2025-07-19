// frontend/src/pages/VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraUIKit from 'agora-react-uikit';
import io from 'socket.io-client';

const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com';
const socket = io(backendUrl);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VideoCall = ({ myLanguage, peerLanguage, token }) => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  const appID = '727d7f73388c4d24a74e21d3151c87f6';

  // Effect to auto-scroll the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Effect to manage Socket.IO connection for chat
  useEffect(() => {
    if (token) {
      socket.emit('join-chat-room', roomCode);
      socket.on('chat-message', (message) => {
        const newMessage = { text: message.translatedText, isMine: false, original: message.originalText };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
      return () => { socket.off('chat-message'); };
    }
  }, [roomCode, token]);

  const handleToggleTranscription = () => {
    if (!SpeechRecognition) {
      return alert("Sorry, your browser doesn't support speech recognition.");
    }
    const isCurrentlyTranscribing = !isTranscribing;
    setIsTranscribing(isCurrentlyTranscribing);

    if (isCurrentlyTranscribing) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = myLanguage;

      recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim();
        if (text) {
          const newMessage = { text: text, isMine: true };
          setMessages((prev) => [...prev, newMessage]);
          socket.emit('chat-message', { text, room: roomCode, targetLang: peerLanguage });
        }
      };
      
      recognition.onend = () => {
        // This check ensures it only restarts if the user didn't manually stop it
        if (recognitionRef.current) {
          recognition.start();
        }
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsTranscribing(false);
        recognitionRef.current = null;
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
  };
  
  const callbacks = {
    EndCall: () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      navigate('/');
    },
  };

  if (!token) {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h1>Invalid Session</h1>
          <p>A valid token is required. Please return to the lobby.</p>
          <button className="join-btn" onClick={() => navigate('/')}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-container">
      <div className="video-container">
        <AgoraUIKit rtcProps={{ appId: appID, channel: roomCode, token }} callbacks={callbacks} />
      </div>
      <div className="translation-sidebar">
        <div className="sidebar-header">
          <h3>Live Translation</h3>
        </div>
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.isMine ? 'my-message' : 'peer-message'}`}>
              <p className="message-text">{msg.text}</p>
              {/* Optionally show original text for received messages */}
              {!msg.isMine && msg.original && (
                <p className="original-text">Original: {msg.original}</p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="sidebar-footer">
          <button className={`transcribe-btn ${isTranscribing ? 'active' : ''}`} onClick={handleToggleTranscription}>
            {isTranscribing ? 'Stop Transcribing' : 'Start Transcribing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;