// frontend/src/pages/VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraUIKit from 'agora-react-uikit';
import io from 'socket.io-client';

const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com'; // Your Render URL
const socket = io(backendUrl);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VideoCall = ({ myLanguage, peerLanguage }) => {
  const { roomCode } = useParams(); // Get the room code from the URL
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef(null);

  const appID = '727d7f73388c4d24a74e21d3151c87f6'; // <-- REPLACE with your actual Agora App ID

  // Fetch the Agora token when the component mounts
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${backendUrl}/get_token?channelName=${roomCode}`);
        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error("Failed to fetch token", error);
        navigate('/'); // Go back to lobby if token fails
      }
    };
    fetchToken();
  }, [roomCode, navigate]);

  // Handle chat and transcription logic
  useEffect(() => {
    socket.emit('join-chat-room', roomCode);

    socket.on('chat-message', (message) => {
      const newMessage = { text: `Peer: ${message.translatedText}`, isMine: false };
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => { socket.off('chat-message'); };
  }, [roomCode]);

  const handleToggleTranscription = () => { /* ... Paste the same function from your old App.jsx ... */ };
  
  const callbacks = {
    EndCall: () => {
      navigate('/'); // Go back to the lobby when the call ends
    },
  };

  if (!token) {
    return <div className="App-header"><h1>Loading...</h1></div>;
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