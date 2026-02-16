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
        data.asset.url = data.asset.url.replace(/localhost|127\.0\.0\.1/g, localIp);
    }

    // UPDATE STATE
    sessionManager.setCurrentMedia(data.asset);

    console.log('Event: viewer:update_session (Broadcast):', data);

    // 1. Broadcast to Viewers (Priority)
    socket.to('viewer').emit('viewer:update_session', data);

    // 2. Broadcast to Directors (Monitor) - EXPLICITLY INCLUDE SENDER via io.of
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'MEDIA_CHANGE',
        data: data.asset
    });
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
    // Sync director too?
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'SETTINGS_UPDATE',
        data: data
    });
};

// Handle general commands (screamer, folder change, etc.)
const handleCommand = (io, socket, event, data) => {
    console.log(`Event: ${event}`, data);
    socket.to('viewer').emit(event, data);

    // Sync Director
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'COMMAND',
        event: event,
        data: data
    });
};

// --- NEW HANDLERS FOR EFFECTS & SYNC ---

const sessionManager = require('../services/session.manager');

// 1. FLASH
const handleTriggerFlash = (io, socket, data) => {
    sessionManager.logEvent('host:trigger_flash', data);
    // Priority emit (Volatile for low latency/discard if congested)
    io.of('/experience').to('viewer').volatile.emit('viewer:trigger_flash', data);

    // Director sync
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'FLASH',
        data: data
    });
};

const triggerFlashRest = (req, res) => {
    const io = req.app.get('io');
    const data = req.body;
    handleTriggerFlash(io, null, data);
    res.json({ message: 'Flash triggered' });
};

// 4. PREPARE NEXT (Anticipation)
// 4. PREPARE NEXT (Anticipation) - MOVED TO BOTTOM
// Keeping this comment or just removing the block.
// The valid one is likely correctly placed near exports now.


// 2. BREATHING
const handleSetBreathing = (io, socket, data) => {
    const rate = sessionManager.setBreathingRate(data);
    io.of('/experience').to('viewer').emit('viewer:sync_breathing', rate);

    // Director sync
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'BREATHING',
        data: rate
    });

    if (socket) socket.emit('host:ack_breathing', rate);
};

const setBreathingRest = (req, res) => {
    const io = req.app.get('io');
    handleSetBreathing(io, null, req.body);
    res.json({ message: 'Breathing rate updated', rate: sessionManager.getState().breathingRate });
};

// 3. LAYERS
const handleToggleLayer = (io, socket, data) => {
    const { layer, isActive } = data;
    const layers = sessionManager.toggleLayer(layer, isActive);
    io.of('/experience').to('viewer').emit('viewer:sync_layers', layers);

    // Director sync
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'LAYERS',
        data: layers
    });

    if (socket) socket.emit('host:ack_layers', layers);
};

const handleTriggerNext = (io, socket, data) => {
    const currentState = sessionManager.getState();
    const currentMedia = currentState.currentMedia;

    // Logic: Get next ID from playlist
    const nextAsset = sessionManager.getNextAsset(currentMedia ? currentMedia.id : null);

    if (nextAsset) {
        console.log('[SessionController] Triggering Next Asset:', nextAsset.name);
        // Reuse handleUpdateMedia logic or call it
        // We need to shape the data as expected by handleUpdateMedia: { asset: ... }
        // But handleUpdateMedia expects a socket event structure.
        // Let's call the logic directly or helper.

        // We need to ensure LocalIP replacement logic runs if we reuse handleUpdateMedia code,
        // or just rely on the stored URL being correct (it might be relative or absolute).
        // Stored assets in DB usually have relative paths or full URLs?
        // If relative, we need to prefix. If stored as 'http://localhost...', we need to fix.
        // Assuming assets in SessionManager (from setPlaylist) are raw DB objects.

        // Quick fix locally: Helper to broadcast update
        const payload = { asset: nextAsset };

        // REUSE handleUpdateMedia logic?
        // handleUpdateMedia(io, socket, payload); 
        // But handleUpdateMedia does: data.asset.url.replace...

        // Let's copy the broadcast logic here for clarity and safety

        // 1. IP Sanitization
        if (nextAsset.url) {
            const getLocalIp = () => {
                const interfaces = require('os').networkInterfaces();
                for (const name of Object.keys(interfaces)) {
                    for (const iface of interfaces[name]) {
                        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
                    }
                }
                return 'localhost';
            };
            const localIp = getLocalIp();
            nextAsset.url = nextAsset.url.replace(/localhost|127\.0\.0\.1/g, localIp);
        }

        // 2. Update State
        sessionManager.setCurrentMedia(nextAsset);

        // 3. Broadcast
        io.of('/experience').to('viewer').emit('viewer:update_session', { asset: nextAsset });
        io.of('/experience').to('director').emit('director:monitor_update', {
            type: 'MEDIA_CHANGE',
            data: nextAsset
        });

    } else {
        console.log('[SessionController] No next asset found.');
    }
};



const handleAssetReady = (io, socket, data) => {
    console.log('[SessionController] Viewer Asset Ready:', data);
    // Relay to Director
    io.of('/experience').to('director').emit('director:asset_ready', data);
};

const toggleLayerRest = (req, res) => {
    const io = req.app.get('io');
    handleToggleLayer(io, null, req.body);
    res.json({ message: 'Layer toggled', layers: sessionManager.getState().activeLayers });
};

// --- PLAYLIST REST HANDLERS ---

const setPlaylistRest = (req, res) => {
    // Expects { assets: [] }
    const { assets } = req.body;
    if (!Array.isArray(assets)) {
        return res.status(400).json({ error: 'Body must contain assets array' });
    }
    const playlist = sessionManager.setPlaylist(assets);
    res.json({ message: 'Playlist initialized', count: playlist.length });
};

const reorderPlaylistRest = (req, res) => {
    // Expects { order: [id, id, id] }
    const { order } = req.body;
    if (!Array.isArray(order)) {
        return res.status(400).json({ error: 'Body must contain order array' });
    }
    const playlist = sessionManager.reorderPlaylist(order);

    // Notify Director of new order?
    const io = req.app.get('io');
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'PLAYLIST_REORDER',
        data: playlist
    });

    res.json({ message: 'Playlist reordered', playlist });
};

module.exports = {
    handleUpdateMedia,
    handleCalibration,
    handleUpdateSettings,
    handleCommand,
    handleTriggerFlash,
    handleSetBreathing,
    handleToggleLayer,
    handlePrepareNext,
    handleAssetReady,
    triggerFlashRest,
    setBreathingRest,
    toggleLayerRest,
    setPlaylistRest,
    reorderPlaylistRest
};
