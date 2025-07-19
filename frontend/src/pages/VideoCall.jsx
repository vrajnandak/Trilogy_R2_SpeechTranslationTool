// // frontend/src/pages/VideoCall.jsx
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import AgoraUIKit from 'agora-react-uikit';
// import io from 'socket.io-client';
// import AgoraRTC from 'agora-rtc-sdk-ng';
// import {
//   AgoraRTCProvider,
//   useJoin,
//   useLocalCameraTrack,
//   useLocalMicrophoneTrack,
//   usePublish,
//   useRemoteUsers,
//   LocalVideoTrack
// } from 'agora-rtc-react';

// const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com';
// const socket = io(backendUrl);
// const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// const VideoCall = ({ myLanguage, peerLanguage, token }) => {
//   const { roomCode } = useParams();
//   const navigate = useNavigate();
//   const [messages, setMessages] = useState([]);
//   const [isTranscribing, setIsTranscribing] = useState(false);
//   const recognitionRef = useRef(null);
//   const messagesEndRef = useRef(null);
  
//   const appID = '727d7f73388c4d24a74e21d3151c87f6';

//   // Effect to auto-scroll the chat
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // Effect to manage Socket.IO connection for chat
//   useEffect(() => {
//     if (token) {
//       socket.emit('join-chat-room', roomCode);
//       socket.on('chat-message', (message) => {
//         const newMessage = { text: message.translatedText, isMine: false, original: message.originalText };
//         setMessages((prevMessages) => [...prevMessages, newMessage]);
//       });
//       return () => { socket.off('chat-message'); };
//     }
//   }, [roomCode, token]);

//   const handleToggleTranscription = () => {
//     if (!SpeechRecognition) {
//       return alert("Sorry, your browser doesn't support speech recognition.");
//     }
//     const isCurrentlyTranscribing = !isTranscribing;
//     setIsTranscribing(isCurrentlyTranscribing);

//     if (isCurrentlyTranscribing) {
//       const recognition = new SpeechRecognition();
//       recognition.continuous = true;
//       recognition.interimResults = false;
//       recognition.lang = myLanguage;

//       recognition.onresult = (event) => {
//         const text = event.results[event.results.length - 1][0].transcript.trim();
//         if (text) {
//           const newMessage = { text: `You: ${text}`, isMine: true };
//           setMessages((prev) => [...prev, newMessage]);
//           socket.emit('chat-message', { text, room: roomCode, targetLang: peerLanguage });
//         }
//       };
      
//       recognition.onend = () => {
//         // This check ensures it only restarts if the user didn't manually stop it
//         if (recognitionRef.current) {
//           recognition.start();
//         }
//       };
      
//       recognition.onerror = (event) => {
//         console.error("Speech recognition error:", event.error);
//         setIsTranscribing(false);
//         recognitionRef.current = null;
//       };

//       recognition.start();
//       recognitionRef.current = recognition;
//     } else {
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//         recognitionRef.current = null;
//       }
//     }
//   };
  
//   const callbacks = {
//     EndCall: () => {
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//         recognitionRef.current = null;
//       }
//       navigate('/');
//     },
//   };

//   const styleProps = {
//     UIKitContainer: {backgroundColor: 'transparent'},
//   }

//   if (!token) {
//     return (
//       <div className="lobby-container">
//         <div className="lobby-card">
//           <h1>Invalid Session</h1>
//           <p>A valid token is required. Please return to the lobby.</p>
//           <button className="join-btn" onClick={() => navigate('/')}>Back to Lobby</button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="call-container">
//       <div className="video-container">
//         <AgoraUIKit rtcProps={{ appId: appID, channel: roomCode, token }} callbacks={callbacks} styleProps={styleProps}/>
//       </div>
//       <div className="translation-sidebar">
//         <div className="sidebar-header">
//           <h3>Live Translation</h3>
//         </div>
//         <div className="messages-list">
//           {messages.map((msg, index) => (
//             <div key={index} className={`message-bubble ${msg.isMine ? 'my-message' : 'peer-message'}`}>
//               <p className="message-text">{msg.text}</p>
//               {/* Optionally show original text for received messages */}
//               {!msg.isMine && msg.original && (
//                 <p className="original-text">Original: {msg.original}</p>
//               )}
//             </div>
//           ))}
//           <div ref={messagesEndRef} />
//         </div>
//         <div className="sidebar-footer">
//           <button className={`transcribe-btn ${isTranscribing ? 'active' : ''}`} onClick={handleToggleTranscription}>
//             {isTranscribing ? 'Stop Transcribing' : 'Start Transcribing'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VideoCall;











// frontend/src/pages/VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  AgoraRTCProvider,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  RemoteUser,
  LocalVideoTrack,
} from "agora-rtc-react";
import io from 'socket.io-client';

const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com';
const socket = io(backendUrl);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// This is the main component that holds the video call logic.
function VideoRoom({ uid, channel, token, onLeave, myLanguage, peerLanguage }) {
  const navigate = useNavigate();
  // Get local camera and microphone tracks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack();
  const { localCameraTrack } = useLocalCameraTrack();
  // Get the list of all remote users in the channel
  const remoteUsers = useRemoteUsers();
  
  // State for chat, transcription, and UI controls
  const [messages, setMessages] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Join the channel
  useJoin({ appid: '727d7f73388c4d24a74e21d3151c87f6', channel, token: token || null, uid: uid });
  // Publish the local tracks so others can see and hear you
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // All other effects and handlers are correct and remain the same.
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (token) {
      socket.emit('join-chat-room', channel);
      socket.on('chat-message', (message) => {
        const newMessage = { text: message.translatedText, isMine: false, original: message.originalText };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
      return () => { socket.off('chat-message'); };
    }
  }, [channel, token]);
  
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
          const newMessage = { text: `You: ${text}`, isMine: true };
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
  
  const leaveChannel = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (localCameraTrack) { localCameraTrack.close(); }
    if (localMicrophoneTrack) { localMicrophoneTrack.close(); }
    onLeave();
  };

  const toggleMic = () => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };
  const toggleCamera = () => {
    if (localCameraTrack) {
      localCameraTrack.setEnabled(!cameraOn);
      setCameraOn(!cameraOn);
    }
  };

  return (
    <div className="call-container">
      <div className="video-grid-container">
        {/* Render the local user's video using the correct component */}
        <div className="video-player-wrapper">
          <LocalVideoTrack track={localCameraTrack} disabled={!cameraOn} play={true} />
        </div>
        {/* Render remote users' videos using the correct component */}
        {remoteUsers.map((user) => (
          <div className="video-player-wrapper" key={user.uid}>
            <RemoteUser user={user} playVideo={true} playAudio={true} />
          </div>
        ))}
        
        <div className="custom-controls">
          <button className="control-btn" onClick={toggleMic}>
            {micOn ? "Mute" : "Unmute"}
          </button>
          <button className="control-btn" onClick={toggleCamera}>
            {cameraOn ? "Cam Off" : "Cam On"}
          </button>
          <button className="control-btn end-call-btn" onClick={leaveChannel}>
            Leave
          </button>
        </div>
      </div>
      <div className="translation-sidebar">
        <div className="sidebar-header"><h3>Live Translation</h3></div>
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.isMine ? 'my-message' : 'peer-message'}`}>
              <p className="message-text">{msg.text}</p>
              {!msg.isMine && msg.original && <p className="original-text">Original: {msg.original}</p>}
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

// This is the main export component. Its only job is to create the Agora client
// and wrap the VideoRoom with the AgoraRTCProvider.
const VideoCall = ({ uid, myLanguage, peerLanguage, token }) => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const agoraClient = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });

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
    <AgoraRTCProvider client={agoraClient}>
      <VideoRoom
        uid = {uid}
        channel={roomCode}
        token={token}
        myLanguage={myLanguage}
        peerLanguage={peerLanguage}
        onLeave={() => navigate('/')}
      />
    </AgoraRTCProvider>
  );
};

export default VideoCall;