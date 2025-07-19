// // frontend/src/pages/VideoCall.jsx
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import AgoraUIKit from 'agora-react-uikit';
// import io from 'socket.io-client';

// const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com'; // Your Render URL
// const socket = io(backendUrl);
// const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// const VideoCall = ({ myLanguage, peerLanguage }) => {
//   const { roomCode } = useParams();
//   const navigate = useNavigate();
//   const [token, setToken] = useState(null);
//   // --- NEW STATE FOR BETTER FEEDBACK ---
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const appID = '727d7f73388c4d24a74e21d3151c87f6'; // <-- REPLACE with your actual Agora App ID

//   useEffect(() => {
//     const fetchToken = async () => {
//       try {
//         console.log("Attempting to fetch token...");
//         const response = await fetch(`${backendUrl}/get_token?channelName=${roomCode}`);
        
//         console.log("Fetch response status:", response.status);
//         if (!response.ok) {
//           // Throw an error if the server responded with a non-200 status
//           throw new Error(`Server responded with status: ${response.status}`);
//         }

//         const data = await response.json();
//         console.log("Token received:", data.token);
        
//         if (data.token) {
//           setToken(data.token);
//         } else {
//           throw new Error("Token was not found in the server response.");
//         }
//       } catch (err) {
//         console.error("Failed to fetch token:", err);
//         setError("Could not connect to the server to get a token. It might be waking up, please try refreshing in a moment.");
//       } finally {
//         setLoading(false); // Stop loading whether it succeeded or failed
//       }
//     };
//     fetchToken();
//   }, [roomCode, navigate]);

//   // --- We can keep the chat logic here, it will connect after the token is fetched ---
//   useEffect(() => {
//     if (token) { // Only join chat after we have a valid token
//       socket.emit('join-chat-room', roomCode);

//       socket.on('chat-message', (message) => { /* ... unchanged ... */ });

//       return () => { socket.off('chat-message'); };
//     }
//   }, [roomCode, token]);

//   const handleToggleTranscription = () => { /* ... Paste your function here ... */ };
  
//   const callbacks = {
//     EndCall: () => { navigate('/'); },
//   };

//   // --- NEW, MORE INFORMATIVE RENDER LOGIC ---
//   if (loading) {
//     return <div className="App-header"><h1>Joining Room...</h1><p>(Server may be waking up, this can take up to 30 seconds)</p></div>;
//   }

//   if (error) {
//     return <div className="App-header"><h1>Error</h1><p>{error}</p><button onClick={() => navigate(0)}>Refresh Page</button></div>;
//   }

//   // The token must exist to render the call
//   if (!token) {
//     return <div className="App-header"><h1>Error</h1><p>Could not retrieve a valid token. Please go back and try again.</p><button onClick={() => navigate('/')}>Back to Lobby</button></div>;
//   }

//   return (
//     <div className="room-container">
//       <div style={{ display: 'flex', flex: 3, height: '100vh' }}>
//         <AgoraUIKit rtcProps={{ appId: appID, channel: roomCode, token }} callbacks={callbacks} />
//       </div>
//       <div className="chat-container">
//         {/* ... chat UI is unchanged ... */}
//       </div>
//     </div>
//   );
// };

// export default VideoCall;












// frontend/src/pages/VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraUIKit from 'agora-react-uikit';
import io from 'socket.io-client';

// ... socket and SpeechRecognition setup are unchanged ...

// --- This component now receives the token as a prop ---
const VideoCall = ({ myLanguage, peerLanguage, token }) => {
    console.log("in VideoCall component");
  const { roomCode } = useParams();
  const navigate = useNavigate();
  
  // ... state for chat and transcription is unchanged ...

  const appID = "727d7f73388c4d24a74e21d3151c87f6"; // <-- REPLACE with your actual Agora App ID

  // ... useEffect for chat logic is unchanged ...
  // ... handleToggleTranscription function is unchanged ...

  const callbacks = {
    EndCall: () => { navigate('/'); },
  };

  console.log("Going to the !token part");

  // If the token is not passed yet, show a loading/error state
  if (!token) {
    console.log("inside the not taken part");
    return (
      <div className="App-header">
        <h1>Invalid Session</h1>
        <p>A valid token is required to join the room.</p>
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
        {/* ... chat UI is unchanged ... */}
      </div>
    </div>
  );
};

export default VideoCall;