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
        // Payload is the JSON object to be broadcasted directly
        socket.on('host:update_settings', (data) => {
            console.log('Event: host:update_settings', data);
            socket.to('viewer').emit('viewer:sync_settings', data);
        });

        // Relay 'host:update_session' event to viewers (New Implementation)
        socket.on('host:update_session', (data) => {
             console.log('Event: host:update_session', data);
             // Broadcast to all clients in 'viewer' room
             socket.to('viewer').emit('viewer:update_session', data);
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
