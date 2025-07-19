import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import VideoCall from './pages/VideoCall';
import './App.css';

function App() {
  const [room, setRoom] = useState('');
  const [myLanguage, setMyLanguage] = useState('en-US');
  const [peerLanguage, setPeerLanguage] = useState('es');
  const [token, setToken] = useState(null);

  return (
    <div className="app-container">
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <Lobby 
                room={room} 
                setRoom={setRoom} 
                myLanguage={myLanguage}
                setMyLanguage={setMyLanguage}
                peerLanguage={peerLanguage}
                setPeerLanguage={setPeerLanguage}
                setToken={setToken}
              />
            } 
          />
          <Route 
            path="/room/:roomCode" 
            element={
              <VideoCall 
                myLanguage={myLanguage} 
                peerLanguage={peerLanguage} 
                token={token}
              />
            } 
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;