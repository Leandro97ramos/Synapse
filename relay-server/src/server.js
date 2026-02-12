// Load environment variables
require('dotenv').config();

const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const app = require('./app');
const experienceSocket = require('./sockets/experience.socket');

const PORT = process.env.PORT || 3000;

const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
};

const server = https.createServer(options, app);

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
