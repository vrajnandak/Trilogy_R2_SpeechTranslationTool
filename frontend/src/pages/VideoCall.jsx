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
  LocalVideoTrack, // THIS IS THE CORRECT IMPORT
} from "agora-rtc-react";
import io from 'socket.io-client';

// const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com';
const backendUrl = import.meta.env.VITE_RENDER_URL;
const socket = io(backendUrl);
const agoraClient = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });

// This component contains the core video call UI and logic.
function VideoRoom({ uid, appID, channel, token, onLeave, myLanguage, translationLanguage, userName }) {
  const { localMicrophoneTrack } = useLocalMicrophoneTrack();
  const { localCameraTrack } = useLocalCameraTrack();
  const remoteUsers = useRemoteUsers();
  
  const [messages, setMessages] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const messagesEndRef = useRef(null);
  
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useJoin({ appid: appID, channel, token: token || null, uid: uid });
  usePublish([localMicrophoneTrack, localCameraTrack]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (token) {
      socket.emit('join-chat-room', { roomId: channel, userName, targetLang: translationLanguage });
      socket.on('chat-message', (message) => {
        const isMine = message.isSender && message.senderName === userName;
        const textToShow = isMine ? `You: ${message.originalText}` : `${message.senderName}: ${message.translatedText}`;
        const originalText = isMine ? null : message.originalText;
        setMessages((prev) => [...prev, { text: textToShow, isMine, original: originalText }]);
      });
      return () => { socket.off('chat-message'); };
    }
  }, [channel, token, userName, translationLanguage]);

  useEffect(() => {
    if (localMicrophoneTrack) {
      const startStreaming = async () => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        await audioContextRef.current.resume();
        const mediaStream = new MediaStream([localMicrophoneTrack.getMediaStreamTrack()]);
        sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        sourceNodeRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
        socket.emit('start-stream', { lang: myLanguage });
        processorRef.current.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          socket.emit('binary-data', pcmData.buffer);
        };
      };
      startStreaming();
      return () => {
        if (processorRef.current) processorRef.current.disconnect();
        if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
        socket.emit('end-stream');
      };
    }
  }, [localMicrophoneTrack, myLanguage]);

  const leaveChannel = async () => {
    await localMicrophoneTrack?.close();
    await localCameraTrack?.close();
    await agoraClient.leave();
    onLeave();
  };

  const toggleMic = async () => {
    await localMicrophoneTrack?.setEnabled(!micOn);
    setMicOn(!micOn);
  };
  const toggleCamera = async () => {
    await localCameraTrack?.setEnabled(!cameraOn);
    setCameraOn(!cameraOn);
  };

  return (
    <div className="call-container">
      <div className="video-grid-container">
        <div className="video-player-wrapper">
          {/* THE FIX: Use the correct LocalVideoTrack component */}
          <LocalVideoTrack
            track={localCameraTrack}
            disabled={!cameraOn}
            play={true}
            className="video-player"
          />
        </div>
        {remoteUsers.map((user) => (
          <div className="video-player-wrapper" key={user.uid}>
            <RemoteUser user={user} playVideo={true} playAudio={true} className="video-player" />
          </div>
        ))}
        <div className="custom-controls">
          <button className="control-btn" onClick={toggleMic}>
            {micOn ? (
                <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            ) : (
                <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            )}
          </button>
          <button className="control-btn" onClick={toggleCamera}>
            {cameraOn ? (
                <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            ) : (
                <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"></path></svg>
            )}
          </button>
          <button className="control-btn end-call-btn" onClick={leaveChannel}>
            <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
          </button>
        </div>
      </div>
      <div className="translation-sidebar">
        <div className="sidebar-header"><h3>Live Translation</h3></div>
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.isMine ? 'my-message' : 'peer-message'}`}>
              <p className="message-text">{msg.text}</p>
              {!msg.isMine && msg.original && (
                <p className="original-text">Original: {msg.original}</p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Removed footer for automatic transcription */}
      </div>
    </div>
  );
};

// This is the main wrapper component that provides the Agora client context.
const VideoCall = ({ uid, myLanguage, translationLanguage, token, userName }) => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

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
        uid={uid}
        appID={'727d7f73388c4d24a74e21d3151c87f6'}
        channel={roomCode}
        token={token}
        myLanguage={myLanguage}
        translationLanguage={translationLanguage}
        userName={userName}
        onLeave={() => navigate('/')}
      />
    </AgoraRTCProvider>
  );
};

export default VideoCall;