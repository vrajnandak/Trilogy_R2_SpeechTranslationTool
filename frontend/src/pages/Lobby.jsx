// frontend/src/pages/Lobby.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com';

const Lobby = ({ room, setRoom, myLanguage, setMyLanguage, peerLanguage, setPeerLanguage, setToken }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!room.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Fetch the Agora token before navigating to the room
      const response = await fetch(`${backendUrl}/get_token?channelName=${room}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.token) {
        throw new Error('Token was not received from the server.');
      }
      
      setToken(data.token); // Set the token in the parent App component
      navigate(`/room/${room}`); // Navigate only after success

    } catch (err) {
      console.error("Failed to join room", err);
      setError("Failed to join room. The server might be waking up. Please try again in 30 seconds.");
      setIsLoading(false);
    }
  };

  return (
    <header className="App-header">
      <h1>Video & Translation Chat</h1>
      <form onSubmit={handleSubmit} className="join-room-container">
        <input type="text" placeholder="Enter Room Name" value={room} onChange={(e) => setRoom(e.target.value)} required disabled={isLoading} />
        <div className="language-selects">
          <div>
            <label>I will speak in:</label>
            <select value={myLanguage} onChange={(e) => setMyLanguage(e.target.value)}>
              <option value="en-US">English</option>
              <option value="es-ES">Español</option>
              <option value="fr-FR">Français</option>
              <option value="de-DE">Deutsch</option>
              <option value="hi-IN">हिन्दी</option>
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
            </select>
          </div>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
        {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
      </form>
    </header>
  );
};

export default Lobby;