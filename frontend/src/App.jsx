import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Use your deployed Render URL here
const socket_url = process.env.ENDPOINT_URL || 'https://trilogy-r2-speechtranslationtool.onrender.com';
const socket = io(socket_url);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [room, setRoom] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoStopped, setIsVideoStopped] = useState(false);

  const [messages, setMessages] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recognitionRef =useRef(null);

  const [myLanguage, setMyLanguage] = useState('en-US');
  const [peerLanguage, setPeerLanguage] = useState('es');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);


  const handleToggleTranscription = () => {
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support speech recognition.");
      return;
    }

    if (isTranscribing) {
      // Stop the recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsTranscribing(false);
    } else {
      // Start the recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening
      recognition.interimResults = false; // We only want final results
      // recognition.lang = 'en-US'; // You can change this
      recognition.lang = myLanguage;

      recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.trim();

        if (text) {
          // const newMessage = { text, isMine: true };
          const newMessage = { text: `You: ${text}`, isMine: true };
          // Add to local messages so you can see what you said
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          
          // Send the message to the server
          // socket.emit('chat-message', { text, room });
          socket.emit('chat-message', {text, room, targetLang: peerLanguage});
        }
      };
      
      // Restart recognition if it stops
      recognition.onend = () => {
        if (isTranscribing) {
          recognition.start();
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    }
  };

  useEffect(() => {
    const createPeerConnection = (remoteSocketId) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const iceServers = [
        { 
          urls: "stun:stun.l.google.com:19302" 
        },
        {
          urls: "turns:openrelay.metered.ca:443", // <-- The 's' in 'turns' is crucial
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turns:openrelay.metered.ca:443?transport=tcp", // <-- Also with 's'
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ];
      
      const pc = new RTCPeerConnection({ iceServers });

      // *** NEW DEBUGGING LOGIC ***
      pc.oniceconnectionstatechange = () => {
        console.log(`Peer Connection State: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
          // You could try to restart the ICE connection here if needed
          console.error("Peer connection failed.");
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { target: remoteSocketId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log("Remote track received. Attaching to remote video element.");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
      peerConnectionRef.current = pc;
      return pc;
    };

    // The rest of the socket event handlers remain the same...
    socket.on('user-joined', async (newUserSocketId) => {
      console.log(`Peer ${newUserSocketId} joined. Creating offer.`);
      const pc = createPeerConnection(newUserSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { target: newUserSocketId, sdp: pc.localDescription });
    });

    socket.on('offer', async (payload) => {
      console.log(`Received offer from ${payload.offererSocketId}. Creating answer.`);
      const pc = createPeerConnection(payload.offererSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { target: payload.offererSocketId, sdp: pc.localDescription });
    });

    socket.on('answer', async (payload) => {
      console.log(`Received answer from ${payload.answererSocketId}.`);
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    });

    socket.on('ice-candidate', async (payload) => {
      if (payload.candidate) {
        await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    socket.on('chat-message', (message) => {
      // Create a new message object for the peer's message
      // const newMessage = { text: message.text, isMine: false };
      const newMessage = { text: `Peer: ${message.translatedText}`, isMine: false };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('chat-message');
    };
  }, [room, peerLanguage]);

  useEffect(() => {
    if (inRoom && localStreamRef.current) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      socket.emit('join-room', room);
    }
  }, [inRoom, room]);

  const handleJoinRoom = async () => {
    if (!room.trim()) { return alert("Please enter a room name"); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setInRoom(true);
    } catch (error) { console.error("Error accessing media devices.", error); }
  };

  const toggleAudio = () => { /* ...no changes here... */ };
  const toggleVideo = () => { /* ...no changes here... */ };

  return (
    // ... no changes to the JSX ...
    <div className="App">
      <header className="App-header">
        <h1>Video Chat</h1>
        {!inRoom ? (
          <div className="join-room-container">
            <input
              type="text"
              placeholder="Enter Room Name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            {/* --- NEW LANGUAGE SELECTION --- */}
            <div className="language-selects">
              <div>
                <label>I will speak in:</label>
                <select value={myLanguage} onChange={(e) => setMyLanguage(e.target.value)}>
                  <option value="en-US">English</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                  <option value="de-DE">Deutsch</option>
                  <option value="hi-IN">हिन्दी</option>
                  {/* Add more languages as needed */}
                </select>
              </div>
              <div>
                <label>Translate to:</label>
                <select value={peerLanguage} onChange={(e) => setPeerLanguage(e.target.value)}>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="hi">हिन्दी</option>
                  {/* Add more languages as needed */}
                </select>
              </div>
            </div>
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>
        ) : (
          <div className="room-container">
            <div className="video-chat-container">
              <div className="video-container">
                <video ref={localVideoRef} autoPlay playsInline muted id="localVideo"></video>
                <video ref={remoteVideoRef} autoPlay playsInline id="remoteVideo"></video>
              </div>
              <div className="controls">
                <button onClick={toggleAudio}>{isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}</button>
                <button onClick={toggleVideo}>{isVideoStopped ? 'Start Video' : 'Stop Video'}</button>
                {/* --- NEW BUTTON --- */}
                <button onClick={handleToggleTranscription}>
                  {isTranscribing ? 'Stop Transcription' : 'Start Transcription'}
                </button>
              </div>
            </div>
            {/* --- NEW CHAT CONTAINER --- */}
            <div className="chat-container">
              <div className="messages-list">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.isMine ? 'my-message' : 'peer-message'}`}>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;