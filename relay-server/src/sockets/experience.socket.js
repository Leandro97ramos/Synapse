const sessionController = require('../controllers/session.controller');
const sessionManager = require('../services/session.manager');

module.exports = (io) => {
    const experienceNamespace = io.of('/experience');

    experienceNamespace.on('connection', (socket) => {
        console.log('Client connected to /experience:', socket.id);

        // Clients must join 'viewer' room to receive broadcasted events
        // Update Viewer Count logic
        const updateViewerCount = () => {
            const room = experienceNamespace.adapter.rooms.get('viewer');
            const count = room ? room.size : 0;
            sessionManager.updateViewerCount(count);
            // Notify host of active viewers? 
            // socket.to('host').emit('host:viewer_count', count); (Assuming host joins 'host' room, or we broadcast)
        };

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
            if (room === 'viewer') updateViewerCount();
        });

        // --- NEW LISTENERS ---

        // 1. Pacing Control
        socket.on('host:change_pacing', (data) => {
            // data: { speed: 1.5 }
            const newSpeed = sessionManager.updatePacing(data.speed);

            // Broadcast to Viewers (Partial Update)
            io.of('/experience').to('viewer').emit('viewer:update_pacing', { speed: newSpeed });

            // Ack to Host
            socket.emit('host:ack_pacing', { speed: newSpeed });
        });

        // 2. Manual Triggers (Flash / Force Next) - Enhanced
        socket.on('host:manual_trigger', (data) => {
            // Keep existing logic for backward compatibility if needed, 
            // but prefer specific handlers below.
            if (data.type === 'NEXT') {
                io.of('/experience').to('viewer').emit('viewer:force_next', {});
            }
        });

        socket.on('host:trigger_flash', (data) => {
            sessionController.handleTriggerFlash(io, socket, data);
        });

        socket.on('host:set_breathing', (data) => {
            sessionController.handleSetBreathing(io, socket, data);
        });

        socket.on('host:toggle_layer', (data) => {
            sessionController.handleToggleLayer(io, socket, data);
        });

        // 3. Dashboard/Playlist Control
        socket.on('host:manual_select_item', (data) => {
            const dashboardController = require('../controllers/dashboard.controller');
            dashboardController.handleManualSelectItem(io, socket, data);
        });

        // 4. Viewer Heartbeat
        socket.on('viewer:heartbeat', (data) => {
            const dashboardController = require('../controllers/dashboard.controller');
            dashboardController.handleHeartbeat(io, socket, data);
        });

        // --- EXISTING LISTENERS ---

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
            // Timeout to allow for reconnection? Or immediate update?
            // Immediate for now.
            setTimeout(updateViewerCount, 100);
        });
    });
};
