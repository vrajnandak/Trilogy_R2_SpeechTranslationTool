// frontend/src/pages/Lobby.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const backendUrl = 'https://trilogy-r2-speechtranslationtool.onrender.com'; // Your Render URL

const Lobby = ({ room, setRoom, myLanguage, setMyLanguage, peerLanguage, setPeerLanguage, setToken }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!room.trim()) return;

    console.log("after trimming");

    setIsLoading(true);
    setError('');

    console.log("setting stuff done");

    try {
    console.log("Getting response now");
      // Fetch token here, BEFORE navigating
      const response = await fetch(`${backendUrl}/get_token?channelName=${room}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      console.log("got the response");
      const data = await response.json();
      if (!data.token) {
        throw new Error('Token not received from server');
      }
      console.log("setting token to data:", data.token);
      setToken(data.token); // Set the token in the parent App component
      navigate(`/room/${room}`); // Navigate only AFTER success

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
        {/* ... language selects are unchanged ... */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
        {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
      </form>
    </header>
  );
};

export default Lobby;