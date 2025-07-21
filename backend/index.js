// backend/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const cors = require('cors');
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');
const { TranslationServiceClient } = require('@google-cloud/translate');
require('dotenv').config({ path: '.env.local' });
// --- Service Account Authentication ---
let speechClient, translationClient, projectId;
try {
  console.log("Attempting to configure Google Cloud credentials...");
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const decodedKey = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    const credentials = JSON.parse(decodedKey);
    projectId = credentials.project_id;
    speechClient = new SpeechClient({ credentials });
    translationClient = new TranslationServiceClient({ credentials });
    console.log(`SUCCESS: Google Cloud clients configured for project: ${projectId}`);
  } else {
    throw new Error('GOOGLE_CREDENTIALS_BASE64 environment variable not set.');
  }
} catch (error) {
  console.error('!!! CRITICAL ERROR CONFIGURING GOOGLE CREDENTIALS !!!', error);
}

// --- Service Initialization ---
const PORT = process.env.PORT || 4000;
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- AGORA TOKEN LOGIC ---
const nocache = (_, resp, next) => {
  resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  resp.header('Expires', '-1');
  resp.header('Pragma', 'no-cache');
  next();
};

const generateToken = (req, res) => {
  console.log("--- Received request for Agora Token ---");
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    console.error("TOKEN_ERROR: Agora credentials not configured on the server.");
    return res.status(500).json({ error: 'Agora credentials not configured on server.' });
  }

  const channelName = req.query.channelName;
  const uid = parseInt(req.query.userId, 10);

  console.log(`Token request for channel: ${channelName}, uid: ${uid}`);

  if (!channelName || isNaN(uid)) {
    console.error(`TOKEN_ERROR: Invalid parameters. channelName=${channelName}, uid=${uid}`);
    return res.status(400).json({ error: 'channelName and a valid userId are required.' });
  }
  
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600; // Token valid for 1 hour
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;
  
  try {
    const token = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
    console.log(`SUCCESS: Token generated for uid: ${uid}`);
    return res.json({ token: token });
  } catch (error) {
    console.error("TOKEN_ERROR: Failed to build Agora token:", error);
    return res.status(500).json({ error: 'Failed to generate Agora token.' });
  }
};

app.get('/get_token', nocache, generateToken);

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);
    
    socket.on('join-chat-room', (data) => {
        socket.join(data.roomId);
        socket.userDetails = data;
        console.log(`[Socket Joined Room]: User ${data.userName} joined ${data.roomId}`);
    });

    socket.on('start-stream', (config) => {
      console.log("In start-stream now");
        if (!speechClient) {
            console.error("Speech client not initialized. Check credentials.");
            return;
        }
        
        const speechRequestConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            profanityFilter: false,
            enableAutomaticPunctuation: true,
        };

        // --- THE DEFINITIVE FIX FOR AUTO-DETECT ---
        if (config.lang === 'auto') {
            // A primary language is still required by the API. 'en-US' is a safe default.
            speechRequestConfig.languageCode = 'en-US';
            // Provide the list of other likely languages.
            speechRequestConfig.alternativeLanguageCodes = ['es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'ja-JP', 'pt-BR', 'ru-RU'];
            console.log(`[Speech Started]: AUTO-DETECT mode for ${socket.userDetails.userName}`);
            speechRequestConfig.maxAlternatives = 10;
        } else {
            // If a specific language is chosen, use only that for maximum efficiency.
            speechRequestConfig.languageCode = config.lang;
            console.log(`[Speech Started]: Specific language (${config.lang}) for ${socket.userDetails.userName}`);
        }
        // --- END OF FIX ---

        const recognizeStream = speechClient.streamingRecognize({
            config: speechRequestConfig,
            interimResults: false,
        })
        .on('error', (err) => {
            console.error('[Speech API Error]:', err.message);
        })
        .on('data', async (data) => {
            const transcription = data.results[0]?.alternatives[0]?.transcript;
            if (transcription && transcription.trim()) {
                const senderDetails = socket.userDetails;
                console.log(`[Transcription]: "${transcription}" from ${senderDetails.userName}`);
                
                // Send original transcription back to the sender
                socket.emit('chat-message', {
                    translatedText: transcription,
                    originalText: transcription,
                    senderName: senderDetails.userName,
                    isSender: true,
                });

                // Get all other clients to send translated versions
                const roomSockets = await io.in(senderDetails.roomId).fetchSockets();
                for (const remoteSocket of roomSockets) {
                    if (remoteSocket.id !== socket.id && remoteSocket.userDetails) {
                        try {
                            const request = {
                                parent: `projects/${projectId}/locations/global`,
                                contents: [transcription],
                                mimeType: 'text/plain',
                                targetLanguageCode: remoteSocket.userDetails.targetLang,
                                // We don't need to specify sourceLang here, Translate API will auto-detect
                            };
                            const [response] = await translationClient.translateText(request);
                            const translation = response.translations[0]?.translatedText || transcription;
                            
                            remoteSocket.emit('chat-message', {
                                translatedText: translation,
                                originalText: transcription,
                                senderName: senderDetails.userName,
                            });
                        } catch (error) {
                            console.error(`[Translation Error]:`, error.message);
                        }
                    }
                }
            }
        });
        socket.recognizeStream = recognizeStream;
    });

    socket.on('binary-data', (data) => {
        if (socket.recognizeStream && !socket.recognizeStream.destroyed) {
            socket.recognizeStream.write(data);
        }
    });

    socket.on('end-stream', () => {
        if (socket.recognizeStream) socket.recognizeStream.end();
    });

    socket.on('disconnect', () => {
        console.log(`[Socket Disconnected]: ${socket.id}.`);
        if (socket.recognizeStream) {
            socket.recognizeStream.destroy();
            socket.recognizeStream = null;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});