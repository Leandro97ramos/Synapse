// Load environment variables
require('dotenv').config();

const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const experienceSocket = require('./sockets/experience.socket');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins explicitly for development
        methods: ["GET", "POST"]
    }
});

// Initialize Sockets
experienceSocket(io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
