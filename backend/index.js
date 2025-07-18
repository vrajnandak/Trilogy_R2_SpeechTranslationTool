const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
// const { Translate } = require('@google-cloud/translate').v2;
// const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
const { TranslationServiceClient } = require('@google-cloud/translate');
const projectId = 'nth-skyline-466312-q2';
const location = 'global';
const translationClient = new TranslationServiceClient();

const app = express();
app.use(cors());

const server = http.createServer(app);

const origin_url = process.env.ORIGIN_URL || "https://timely-fox-dcd3d7.netlify.app";

const io = new Server(server, {
  cors: {
    origin: origin_url,
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
    try {
        console.log(`Received text: "${text}", target language: ${targetLang}`);
        const request = {
            parent: `projects/${projectId}/locations/${location}`,
            contents: [text],
            mimeType: 'text/plain',
            targetLanguageCode: targetLang,
        };
        console.log('request has been made:', request);
        const [response] = await translationClient.translateText(request);
        console.log('response: ', response);
        const translation = response.translations[0]?.translatedText || "[Translation Error]";
        console.log(`Translated text to ${targetLang}: ${translation}`);
        
        socket.to(room).emit('chat-message', {
            originalText: text,
            translatedText: translation,
            senderId: socket.id
        });
        
    } catch (error) {
      console.error('ERROR during v3 translation:', error);
      // If translation fails, send the original text with an error message
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