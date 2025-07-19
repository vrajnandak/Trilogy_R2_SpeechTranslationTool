const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const cors = require('cors');
// const fs = require('fs');

// require('dotenv').config({ path: './Lingua-Live-Server.env' });

let translationClient;
let projectId;

const {TranslationServiceClient} = require('@google-cloud/translate');
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  console.log('inside the if statmenet');
  const decodedKey = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii');
  const keyFilePath = '/tmp/gcp-creds.json';
  // fs.writeFileSync(keyFilePath, decodedKey);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;
  console.log('Google Cloud credentials configured successfully.');

  const credentials = JSON.parse(decodedKey);
  // console.log("credentials:", credentials);
  projectId=credentials.project_id;
  translationClient=new TranslationServiceClient({credentials});
  // console.log(translationClient);
  // console.log("")
} else {
  console.error('!!! CRITICAL: GOOGLE_CREDENTIALS_BASE64 env var not set. Translation will fail. !!!');
}

// --- Environment Variables ---
const PORT = process.env.PORT || 4000;
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;


// const translationClient = new TranslationServiceClient();
// const projectId = 'august-period-466408-m6'; // Your Google Cloud Project ID
const location = 'global';

const app = express();
app.use(cors()); // Use cors middleware for all HTTP routes

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "*", // Allow all origins for Socket.IO
    origin: "https://timely-fox-dcd3d7.netlify.app",
    methods: ["GET", "POST"]
  }
});

// --- Agora Token Generation Endpoint ---
const nocache = (_, resp, next) => {
  resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  resp.header('Expires', '-1');
  resp.header('Pragma', 'no-cache');
  next();
};

const generateToken = (req, res) => {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    console.error('Agora credentials not configured on the server.');
    return res.status(500).json({ 'error': 'Agora credentials not configured.' });
  }

  const channelName = req.query.channelName;
  if (!channelName) {
    return res.status(400).json({ 'error': 'channelName is a required parameter.' });
  }

  let uid=req.query.uid;
  if(!uid || dui=='')
  {
    return res.status(400).json({'error': 'uid is a required parameter'});
  }

  uid = parseInt(uid, 10);

  // const uid = 0; // Or assign a unique integer user ID
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600; // Token valid for 1 hour
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;
  
  try {
    const token = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
    console.log(`Token successfully generated for channel: ${channelName}`);
    return res.json({ 'token': token });
  } catch (error) {
    console.error("Error generating Agora token:", error);
    return res.status(500).json({ 'error': 'Failed to generate Agora token.' });
  }
};

app.get('/get_token', nocache, generateToken);

// --- Socket.IO Connection for Chat & Translation ---
io.on('connection', (socket) => {
    console.log(`User connected via Socket.IO: ${socket.id}`);

    socket.on('join-chat-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined chat room: ${roomId}`);
    });

    socket.on('chat-message', async ({ text, room, targetLang }) => {
        try {
            console.log(`Received: "${text}", Target: ${targetLang}`);

            const request = {
                parent: `projects/${projectId}/locations/${location}`,
                contents: [text],
                mimeType: 'text/plain',
                targetLanguageCode: targetLang,
            };
            
            // console.log("Going to send to the translation client now");
            const [response] = await translationClient.translateText(request);
            // console.log("The response is as follows:", response);
            const detectedSourceLang = response.translations[0]?.detectedLanguageCode || 'unknown';
            // console.log('Detected source language is:', detectedSourceLang);
            const translation = response.translations[0]?.translatedText || "[No translation found]";
            // console.log(`Translated: "${translation}"`);
            
            socket.to(room).emit('chat-message', {
                translatedText: translation,
                originalText: text,
                senderId: socket.id
            });

        } catch (error) {
            console.error('ERROR during v3 translation:', error);
            socket.to(room).emit('chat-message', {
                translatedText: `[Translation Failed] ${text}`,
                originalText: text,
                senderId: socket.id
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected from Socket.IO: ${socket.id}`);
    });
});

// --- Server Startup ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});