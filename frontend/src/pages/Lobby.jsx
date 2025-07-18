// frontend/src/pages/Lobby.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Lobby = ({ room, setRoom, myLanguage, setMyLanguage, peerLanguage, setPeerLanguage }) => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (room.trim()) {
      // Navigate to the room URL
      navigate(`/room/${room}`);
    }
  };

  return (
    <header className="App-header">
      <h1>Video & Translation Chat</h1>
      <form onSubmit={handleSubmit} className="join-room-container">
        <input type="text" placeholder="Enter Room Name" value={room} onChange={(e) => setRoom(e.target.value)} required />
        <div className="language-selects">
          <div>
            <label>I will speak in:</label>
            <select value={myLanguage} onChange={(e) => setMyLanguage(e.target.value)}>
              <option value="en-US">English</option><option value="es-ES">Español</option><option value="fr-FR">Français</option><option value="de-DE">Deutsch</option><option value="hi-IN">हिन्दी</option>
            </select>
          </div>
          <div>
            <label>Translate to:</label>
            <select value={peerLanguage} onChange={(e) => setPeerLanguage(e.target.value)}>
              <option value="es">Español</option><option value="en">English</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="hi">हिन्दी</option>
            </select>
          </div>
        </div>
        <button type="submit">Join Room</button>
      </form>
    </header>
  );
};

export default Lobby;