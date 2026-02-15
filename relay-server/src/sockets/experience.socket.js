const sessionController = require('../controllers/session.controller');

module.exports = (io) => {
    const experienceNamespace = io.of('/experience');

    experienceNamespace.on('connection', (socket) => {
        console.log('Client connected to /experience:', socket.id);

        // Clients must join 'viewer' room to receive broadcasted events
        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        // Relay 'host:update_settings' event to viewers
        socket.on('host:update_settings', (data) => {
            sessionController.handleUpdateSettings(io, socket, data);
        });

        // Relay 'host:update_session' event to viewers (Corrected for Local IP)
        socket.on('host:update_session', (data) => {
            sessionController.handleUpdateMedia(io, socket, data);
        });

        // Relay 'host:calibration' to viewers
        socket.on('host:calibration', (data) => {
            sessionController.handleCalibration(io, socket, data);
        });

        // Relay 'change_folder' event to viewers
        socket.on('change_folder', (data) => {
            sessionController.handleCommand(io, socket, 'change_folder', data);
        });

        // Relay 'trigger_screamer' event to viewers
        socket.on('trigger_screamer', (data) => {
            sessionController.handleCommand(io, socket, 'trigger_screamer', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected from /experience:', socket.id);
        });
    });
};
