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
      const response = await fetch(`${backendUrl}/get_token?channelName=${room}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.token) {
        throw new Error('Token not received from server');
      }
      
      setToken(data.token);
      navigate(`/room/${room}`);
    } catch (err) {
      console.error("Failed to join room", err);
      setError("Failed to join room. The server might be waking up. Please try again in 30 seconds.");
      setIsLoading(false);
    }
  };

  // Note: We have removed the <header> and main titles. This component is now just the form.
  return (
    <div className="lobby-card">
      <form onSubmit={handleSubmit} className="lobby-form">
        <div className="form-group">
          <label htmlFor="roomName">Room Name</label>
          <input 
            id="roomName"
            type="text" 
            placeholder="e.g., project-sync" 
            value={room} 
            onChange={(e) => setRoom(e.target.value)} 
            required 
            disabled={isLoading} 
          />
        </div>
        <div className="language-selects">
          <div className="form-group">
            <label>I will speak in:</label>
            <select value={myLanguage} onChange={(e) => setMyLanguage(e.target.value)} disabled={isLoading}>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
              <option value="fr-FR">Français</option>
              <option value="de-DE">Deutsch</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="ja-JP">日本語 (Japanese)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Translate for my peer to:</label>
            <select value={peerLanguage} onChange={(e) => setPeerLanguage(e.target.value)} disabled={isLoading}>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ja">日本語 (Japanese)</option>
            </select>
          </div>
        </div>
        <button type="submit" className="join-btn" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default Lobby;