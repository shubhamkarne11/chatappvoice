const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (roomId) => {
    console.log(`Client ${socket.id} joining room ${roomId}`);
    socket.join(roomId);

    const clientsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
    const numClients = clientsInRoom.size;

    if (numClients === 1) {
      socket.emit('created', roomId);
    } else if (numClients === 2) {
      socket.emit('joined', roomId);
      socket.to(roomId).emit('ready');
    } else {
      socket.emit('full', roomId);
    }
  });

  socket.on('signal', ({ roomId, data }) => {
    socket.to(roomId).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`📞 Call signaling server running on http://localhost:${PORT}`);
});

