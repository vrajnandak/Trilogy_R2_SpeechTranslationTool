// const express = require('express');
// const http = require('http');
// const { Server } = require("socket.io");
// const cors = require('cors');

// const app = express();
// app.use(cors()); // Enable Cross-Origin Resource Sharing

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*", // Allow connections from any origin for development
//     methods: ["GET", "POST"]
//   }
// });


// io.on('connection', (socket)=> {
//     console.log('A user connected:', socket.id);

//     socket.on('join-room', (roomID) => {
//         socket.join(roomID);
//         console.log(`User ${socket.id} joined room ${roomID}`);
//         socket.to(roomID).emit('user-joined', socket.id);
//     });

//     socket.on('offer', (payload)=>{
//         console.log(`Relaying offer from ${payload.offererSocketId} to ${payload.target}`);
//         io.to(payload.target).emit('answer', payload);
//         // io.to(payload.target).emit('offer', {
//         //     sdp: payload.sdp,
//         //     offererSocketId: payload.offererSocketId
//         // });
//     });

//     socket.on('answer', (payload) => {
//         console.log(`Relaying answer from ${payload.answererSocketId} to ${payload.target}`);
//         io.to(payload.target).emit('answer', payload);
//         // io.to(payload.target).emit('answer', {
//         //     sdp: payload.sdp,
//         //     answererSocketId: payload.answererSocketId
//         // });
//         // console.log(`Answer relayed from ${payload.answererSocketId} to ${payload.target}`);
//     });

//     // socket.on('ice-candidate', (payload)=>{
//     //     io.to(payload.target).emit('ice-candidate', {
//     //         candidate: payload.candidate,
//     //         senderSocketId: payload.senderSocketId
//     //     });
//     //     console.log(`ICE candidate relayed from ${payload.senderSocketId} to ${payload.target}`);
//     // });

//     socket.on('ice-candidate', (payload) => {
//         // Make sure payload.target exists before emitting
//         if (payload.target) {
//         // Add a log to see the relay in action
//         console.log(`Relaying ICE candidate from ${socket.id} to ${payload.target}`);
//         io.to(payload.target).emit('ice-candidate', {
//             candidate: payload.candidate,
//             senderSocketId: socket.id // Explicitly send the sender's ID
//         });
//         }
//     });

//     socket.on('disconnect', ()=>{
//         console.log("User disconnected:", socket.id);
//     });
// });

// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });







const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

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

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});