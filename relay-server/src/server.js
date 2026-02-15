// Load environment variables
require('dotenv').config();

const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const app = require('./app');
const experienceSocket = require('./sockets/experience.socket');

// Routes
const assetRoutes = require('./routes/assets.routes');
const folderRoutes = require('./routes/folders.routes');
const moduleRoutes = require('./routes/modules.routes');
const profileRoutes = require('./routes/profiles.routes');
const mediaRoutes = require('./routes/media.routes');
const eventLogger = require('./middleware/eventLogger');

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

// Socket.io Middleware
io.of('/experience').use(eventLogger);

// Initialize Sockets
experienceSocket(io);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Listening on all network interfaces (IPv4/IPv6)`);
});
