const sessionController = require('../controllers/session.controller');
const sessionManager = require('../services/session.manager');

module.exports = (io) => {
    const experienceNamespace = io.of('/experience');

    experienceNamespace.on('connection', (socket) => {
        console.log('Client connected to /experience:', socket.id);

        // Clients must join 'viewer' room to receive broadcasted events
        // Update Viewer Count logic
        // Update Viewer Count logic
        const updateViewerCount = () => {
            const room = experienceNamespace.adapter.rooms.get('viewer');
            const count = room ? room.size : 0;
            sessionManager.updateViewerCount(count);

            // Notify Director of active viewers
            experienceNamespace.to('director').emit('director:viewer_count', count);
        };

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);

            if (room === 'viewer') {
                updateViewerCount();
                // SYNC ON RECONNECT
                const state = sessionManager.getState();
                if (state.currentMedia) {
                    socket.emit('viewer:update_session', { asset: state.currentMedia });
                }
                if (state.activeLayers) {
                    socket.emit('viewer:sync_layers', state.activeLayers);
                }
                if (state.breathingRate) {
                    socket.emit('viewer:sync_breathing', state.breathingRate);
                }
            }

            if (room === 'director') {
                // HANDSHAKE: Send immediate state sync to Director
                const currentState = sessionManager.getState();
                socket.emit('director:state_sync', {
                    currentMedia: currentState.currentMedia,
                    activeLayers: currentState.activeLayers,
                    breathingRate: currentState.breathingRate,
                    pacingSpeed: currentState.pacingSpeed,
                    currentPhase: currentState.currentPhase, // Fixed typo in original if any
                    playlist: currentState.playlist,
                    timestamp: Date.now()
                });
            }
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

        // 1.5 Intensity Control
        socket.on('host:intensity', (data) => {
            // data: { intensity: 5 }
            sessionManager.updateIntensity(data.intensity); // Assuming this method exists or we add it
            // Broadcast to Viewers
            io.of('/experience').to('viewer').emit('viewer:intensity', data);

            // Sync Director
            io.of('/experience').to('director').emit('director:monitor_update', {
                type: 'INTENSITY',
                data: data.intensity
            });
        });

        // 2. Manual Triggers (Flash / Force Next) - Enhanced
        socket.on('host:manual_trigger', (data) => {
            // BACKWARD COMPAT (Director might still use this?)
            if (data.type === 'NEXT') {
                sessionController.handleTriggerNext(io, socket, data);
            }
        });

        socket.on('host:trigger_next', (data) => {
            sessionController.handleTriggerNext(io, socket, data);
        });

        // ANTICIPATION
        socket.on('host:prepare_next', (data) => {
            sessionController.handlePrepareNext(io, socket, data);
        });

        socket.on('host:trigger_flash', (data) => {
            sessionController.handleTriggerFlash(io, socket, data);
        });

        // Alias for DirectorPanel
        socket.on('host:flash', (data) => {
            sessionController.handleTriggerFlash(io, socket, data);
        });

        socket.on('host:set_breathing', (data) => {
            sessionController.handleSetBreathing(io, socket, data);
        });

        // SPECIFIC INDUCTION LISTENERS (Mapped to generic handler)
        socket.on('host:toggle_spiral', (data) => {
            // data: { isActive: true }
            sessionController.handleToggleLayer(io, socket, { layer: 'spiral', isActive: data.isActive });
        });

        socket.on('host:toggle_ghost', (data) => {
            sessionController.handleToggleLayer(io, socket, { layer: 'ghost', isActive: data.isActive });
        });

        socket.on('host:toggle_breathe', (data) => {
            // Basic toggle for breathing layer visibility?
            // Or enabling the breathing EFFECT?
            // Assuming layer visibility for now as per 'activeLayers'
            sessionController.handleToggleLayer(io, socket, { layer: 'breathing', isActive: data.isActive });
        });

        socket.on('host:toggle_layer', (data) => {
            sessionController.handleToggleLayer(io, socket, data);
        });

        // Generic Induction Handler
        socket.on('host:induction', (data) => {
            // data: { layer: 'spiral', active: true }
            sessionController.handleToggleLayer(io, socket, { layer: data.layer, isActive: data.active });
        });

        // 3. Dashboard/Playlist Control
        socket.on('host:manual_select_item', (data) => {
            const dashboardController = require('../controllers/dashboard.controller');
            dashboardController.handleManualSelectItem(io, socket, data);
        });

        // 4. Viewer Heartbeat & Ready State
        socket.on('viewer:heartbeat', (data) => {
            const dashboardController = require('../controllers/dashboard.controller');
            dashboardController.handleHeartbeat(io, socket, data);
        });

        socket.on('viewer:asset_ready', (data) => {
            sessionController.handleAssetReady(io, socket, data);
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
