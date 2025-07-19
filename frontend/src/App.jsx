import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage'; // Import the new landing page
import VideoCall from './pages/VideoCall';
import './App.css';

function App() {
  const [uid] = useState(Math.floor(Math.random() * 100000));

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
              // The root path now renders the LandingPage component
              <LandingPage
                uid = {uid}
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
                uid={uid}
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