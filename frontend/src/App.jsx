import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Use your deployed Render URL here
const socket = io('https://lingua-live-server.onrender.com'); 

function App() {
  const [room, setRoom] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoStopped, setIsVideoStopped] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const createPeerConnection = (remoteSocketId) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // *** MODIFICATION: Added a more comprehensive list of free STUN/TURN servers ***
      // const iceServers = [
      //   { urls: 'stun:stun.l.google.com:19302' },
      //   { urls: 'stun:stun1.l.google.com:19302' },
      //   { urls: 'stun:stun.services.mozilla.com' },
      //   {
      //     urls: 'turn:openrelay.metered.ca:80',
      //     username: 'openrelayproject',
      //     credential: 'openrelayproject',
      //   },
      //   {
      //     urls: 'turn:openrelay.metered.ca:443',
      //     username: 'openrelayproject',
      //     credential: 'openrelayproject',
      //   },
      // ];

      // const iceServers = [
      //     { urls: "stun:global.stun.twilio.com:3478" },
      //     {
      //       urls: "turn:global.turn.twilio.com:3478",
      //       username: "your_user_name", // This can be anything for the free server
      //       credential: "your_password" // This can be anything for the free server
      //     }
      // ];

      const iceServers = [
        { 
          urls: "stun:stun.l.google.com:19302" 
        },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
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

    return () => {
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, []);

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
            <input type="text" placeholder="Enter Room Name" value={room} onChange={(e) => setRoom(e.target.value)} />
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>
        ) : (
          <div className="video-chat-container">
            <div className="video-container">
              <video ref={localVideoRef} autoPlay playsInline muted id="localVideo"></video>
              <video ref={remoteVideoRef} autoPlay playsInline id="remoteVideo"></video>
            </div>
            <div className="controls">
              <button onClick={toggleAudio}>{isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}</button>
              <button onClick={toggleVideo}>{isVideoStopped ? 'Start Video' : 'Stop Video'}</button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;