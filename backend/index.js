const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { Translate } = require('@google-cloud/translate').v2;
// google_api_key = 'AIzaSyA_PgKexXaS4YJcZdXN2XY3Ftl4cgyhF7o'
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
// const translate = new Translate({ key: google_api_key});

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://timely-fox-dcd3d7.netlify.app",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    // Notify other users in the room that a new user has joined
    socket.to(roomId).emit('user-joined', socket.id);
  });

  // *** MODIFICATION: SERVER ADDS THE SENDER ID ***
  socket.on('offer', (payload) => {
    console.log(`Relaying offer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('offer', {
      sdp: payload.sdp,
      offererSocketId: socket.id // Server attaches the sender's ID
    });
  });

  // *** MODIFICATION: SERVER ADDS THE SENDER ID ***
  socket.on('answer', (payload) => {
    console.log(`Relaying answer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('answer', {
      sdp: payload.sdp,
      answererSocketId: socket.id // Server attaches the sender's ID
    });
  });

  socket.on('ice-candidate', (payload) => {
    if (payload.target) {
      io.to(payload.target).emit('ice-candidate', {
        candidate: payload.candidate,
        senderSocketId: socket.id
      });
    }
  });

  socket.on('chat-message', async ({ text, room, targetLang }) => {
    // socket.to(room).emit('chat-message', { text, senderId: socket.id });
    try {
      // 1. Detect the source language
      let [detections] = await translate.detect(text);
      const detection = Array.isArray(detections) ? detections[0] : detections;
      console.log(`Detected language: ${detection.language}`);

      // 2. Translate the text
      let [translations] = await translate.translate(text, targetLang);
      const translation = Array.isArray(translations) ? translations[0] : translations;
      console.log(`Translated text to ${targetLang}: ${translation}`);

      // 3. Broadcast the TRANSLATED text to the room
      // We also send the original text for the sender to see
      socket.to(room).emit('chat-message', {
        originalText: text,
        translatedText: translation,
        senderId: socket.id
      });
    } catch (error) {
      console.error('ERROR during translation:', error);
      // If translation fails, maybe just send the original text
      socket.to(room).emit('chat-message', {
        originalText: text,
        translatedText: `[Translation Error] ${text}`,
        senderId: socket.id
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});