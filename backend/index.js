// const express = require('express');
// const http = require('http');
// const { Server } = require("socket.io");
// const cors = require('cors');
// // const { Translate } = require('@google-cloud/translate').v2;
// // const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
// const { TranslationServiceClient } = require('@google-cloud/translate');
// const projectId = 'nth-skyline-466312-q2';
// const location = 'global';
// const translationClient = new TranslationServiceClient();

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const origin_url = process.env.ORIGIN_URL || "https://timely-fox-dcd3d7.netlify.app";

// const io = new Server(server, {
//   cors: {
//     origin: origin_url,
//     methods: ["GET", "POST"]
//   }
// });

// io.on('connection', (socket) => {
//   console.log(`A user connected: ${socket.id}`);

//   socket.on('join-room', (roomId) => {
//     socket.join(roomId);
//     console.log(`User ${socket.id} joined room ${roomId}`);
//     // Notify other users in the room that a new user has joined
//     socket.to(roomId).emit('user-joined', socket.id);
//   });

//   // *** MODIFICATION: SERVER ADDS THE SENDER ID ***
//   socket.on('offer', (payload) => {
//     console.log(`Relaying offer from ${socket.id} to ${payload.target}`);
//     io.to(payload.target).emit('offer', {
//       sdp: payload.sdp,
//       offererSocketId: socket.id // Server attaches the sender's ID
//     });
//   });

//   // *** MODIFICATION: SERVER ADDS THE SENDER ID ***
//   socket.on('answer', (payload) => {
//     console.log(`Relaying answer from ${socket.id} to ${payload.target}`);
//     io.to(payload.target).emit('answer', {
//       sdp: payload.sdp,
//       answererSocketId: socket.id // Server attaches the sender's ID
//     });
//   });

//   socket.on('ice-candidate', (payload) => {
//     if (payload.target) {
//       io.to(payload.target).emit('ice-candidate', {
//         candidate: payload.candidate,
//         senderSocketId: socket.id
//       });
//     }
//   });

//   socket.on('chat-message', async ({ text, room, targetLang }) => {
//     try {
//         console.log(`Received text: "${text}", target language: ${targetLang}`);
//         const request = {
//             parent: `projects/${projectId}/locations/${location}`,
//             contents: [text],
//             mimeType: 'text/plain',
//             targetLanguageCode: targetLang,
//         };
//         console.log('request has been made:', request);
//         const [response] = await translationClient.translateText(request);
//         console.log('response: ', response);
//         const translation = response.translations[0]?.translatedText || "[Translation Error]";
//         console.log(`Translated text to ${targetLang}: ${translation}`);
        
//         socket.to(room).emit('chat-message', {
//             originalText: text,
//             translatedText: translation,
//             senderId: socket.id
//         });
        
//     } catch (error) {
//       console.error('ERROR during v3 translation:', error);
//       // If translation fails, send the original text with an error message
//       socket.to(room).emit('chat-message', {
//         originalText: text,
//         translatedText: `[Translation Error] ${text}`,
//         senderId: socket.id
//       });
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log(`User disconnected: ${socket.id}`);
//   });
// });

// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });



// backend/index.js
const express = require('express');
const http = require('http'); // Required for Socket.IO
const { Server } = require("socket.io"); // Required for Socket.IO
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const cors = require('cors');
const { Translate } = require('@google-cloud/translate').v2;

const PORT = process.env.PORT || 4000;
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const translate = new Translate({ key: GOOGLE_API_KEY });
const app = express();
app.use(cors());

const server = http.createServer(app); // Create an HTTP server

// Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity, can be restricted later
    methods: ["GET", "POST"]
  }
});

// --- AGORA TOKEN LOGIC (Unchanged) ---
const nocache = (_, resp, next) => { /* ... unchanged ... */ };
const generateToken = (req, res) => { /* ... unchanged ... */ };
app.get('/get_token', nocache, generateToken);

// --- SOCKET.IO CONNECTION LOGIC (Re-added) ---
io.on('connection', (socket) => {
    console.log(`A user connected via Socket.IO: ${socket.id}`);

    socket.on('join-chat-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined chat room: ${roomId}`);
    });

    socket.on('chat-message', async ({ text, room, targetLang }) => {
        try {
            console.log(`Received text: "${text}", target language: ${targetLang}`);
            let [translations] = await translate.translate(text, targetLang);
            const translation = Array.isArray(translations) ? translations[0] : translations;
            console.log(`Translated text to ${targetLang}: ${translation}`);
            
            // Broadcast the translated message to others in the room
            socket.to(room).emit('chat-message', {
                translatedText: translation,
                originalText: text,
                senderId: socket.id
            });

        } catch (error) {
            console.error('ERROR during translation:', error);
            socket.to(room).emit('chat-message', {
                translatedText: `[Translation Error] ${text}`,
                originalText: text,
                senderId: socket.id
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected from Socket.IO: ${socket.id}`);
    });
});

// Use the http server to listen, not the express app
server.listen(PORT, () => {
    console.log(`Server (including Token and Socket.IO) running on port ${PORT}`);
    if (!APP_ID || !APP_CERTIFICATE || !GOOGLE_API_KEY) {
        console.error('!!! Missing one or more required environment variables (Agora or Google) !!!');
    }
});