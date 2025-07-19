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
  
  const appID = '727d7f73388c4d24a74e21d3151c87f6';

  useEffect(() => {
    // We only proceed if we have a token
    if (token) {
      socket.emit('join-chat-room', roomCode);

      socket.on('chat-message', (message) => {
        const newMessage = { text: `Peer: ${message.translatedText}`, isMine: false };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });

      return () => {
        socket.off('chat-message');
      };
    }
  }, [roomCode, token]);

  const handleToggleTranscription = () => {
    if (!SpeechRecognition) {
      return alert("Sorry, your browser doesn't support speech recognition.");
    }

    if (isTranscribing) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsTranscribing(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = myLanguage;

      recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.trim();
        if (text) {
          const newMessage = { text: `You: ${text}`, isMine: true };
          setMessages((prev) => [...prev, newMessage]);
          socket.emit('chat-message', { text, room: roomCode, targetLang: peerLanguage });
        }
      };
      
      recognition.onend = () => {
        if (isTranscribing) { // Check a state variable to see if we should restart
          console.log("Recognition ended, restarting...");
          recognition.start();
        } else {
          console.log("Recognition stopped by user.");
        }
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsTranscribing(false); // Turn off transcription on error
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    }
  };
  
  const callbacks = {
    EndCall: () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // Stop transcription on call end
      }
      navigate('/');
    },
  };

  if (!token) {
    return (
      <div className="App-header">
        <h1>Invalid Session</h1>
        <p>A valid token is required to join the room. Please go back to the lobby.</p>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div style={{ display: 'flex', flex: 3, height: '100vh' }}>
        <AgoraUIKit rtcProps={{ appId: appID, channel: roomCode, token }} callbacks={callbacks} />
      </div>
      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.isMine ? 'my-message' : 'peer-message'}`}>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>
        <button className="transcribe-btn" onClick={handleToggleTranscription}>
          {isTranscribing ? 'Stop Transcription' : 'Start Transcription'}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;