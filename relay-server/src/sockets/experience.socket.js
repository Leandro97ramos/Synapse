const os = require('os');

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

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
            console.log('Event: host:update_settings', data);
            socket.to('viewer').emit('viewer:sync_settings', data);
        });

        // Relay 'host:update_session' event to viewers (Corrected for Local IP)
        socket.on('host:update_session', (data) => {
            console.log('Event: host:update_session (Original):', data);

            // Ensure the URL uses the Local IP instead of localhost
            if (data.asset && data.asset.url) {
                const localIp = getLocalIp();
                // Replace localhost or 127.0.0.1 with the actual LAN IP
                // Also ensure protocol is https if server is https, but we'll respect original for now unless it's just replacing the host
                data.asset.url = data.asset.url.replace(/localhost|127\.0\.0\.1/g, localIp);
            }

            console.log('Event: viewer:update_session (Broadcast):', data);
            // Broadcast to all clients in 'viewer' room
            socket.to('viewer').emit('viewer:update_session', data);
        });

        // Relay 'host:calibration' to viewers
        socket.on('host:calibration', (data) => {
            console.log('Event: host:calibration', data);
            socket.to('viewer').emit('viewer:calibration', data);
        });

        // Relay 'change_folder' event to viewers
        socket.on('change_folder', (data) => {
            console.log('Event: change_folder', data);
            socket.to('viewer').emit('change_folder', data);
        });

        // Relay 'trigger_screamer' event to viewers
        socket.on('trigger_screamer', (data) => {
            console.log('Event: trigger_screamer', data);
            socket.to('viewer').emit('trigger_screamer', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected from /experience:', socket.id);
        });
    });
};
