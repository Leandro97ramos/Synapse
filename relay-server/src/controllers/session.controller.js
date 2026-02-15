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

// Handle 'host:update_session' event
// Updates media on viewer
const handleUpdateMedia = (io, socket, data) => {
    console.log('Event: host:update_session (Original):', data);

    // Ensure the URL uses the Local IP instead of localhost
    if (data.asset && data.asset.url) {
        const localIp = getLocalIp();
        // Replace localhost or 127.0.0.1 with the actual LAN IP
        data.asset.url = data.asset.url.replace(/localhost|127\.0\.0\.1/g, localIp);
    }

    console.log('Event: viewer:update_session (Broadcast):', data);
    // Broadcast to all clients in 'viewer' room
    socket.to('viewer').emit('viewer:update_session', data);
};

// Handle 'host:calibration' event
const handleCalibration = (io, socket, data) => {
    console.log('Event: host:calibration', data);
    socket.to('viewer').emit('viewer:calibration', data);
};

// Handle 'host:update_settings' event
const handleUpdateSettings = (io, socket, data) => {
    console.log('Event: host:update_settings', data);
    socket.to('viewer').emit('viewer:sync_settings', data);
};

// Handle general commands (screamer, folder change, etc.)
const handleCommand = (io, socket, event, data) => {
    console.log(`Event: ${event}`, data);
    socket.to('viewer').emit(event, data);
};

module.exports = {
    handleUpdateMedia,
    handleCalibration,
    handleUpdateSettings,
    handleCommand
};
