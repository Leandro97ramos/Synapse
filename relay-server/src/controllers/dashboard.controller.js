const db = require('../config/db.config');
const sessionManager = require('../services/session.manager');

exports.getMediaByModule = async (req, res) => {
    try {
        const { modulo } = req.params; // Using 'modulo' as requested (mapped from route param)

        // Clean input
        const safeId = modulo.replace(/[^a-zA-Z0-9_\-]/g, '');

        // Validation: Ensure safeId is not empty
        if (!safeId) {
            return res.status(400).json({ message: 'Invalid module identifier' });
        }

        let query = '';
        let params = [];

        // Logic similar to before, but we need to ensure we return the correct "Module Name" in the response title.
        // If it's a phase request, we might want to return the Phase Name as "modulo" or the underlying Module Name?
        // Request says: { modulo: 'Terror', ... }

        const validPhases = ['neutral', 'low', 'medium', 'high', 'peak'];
        let isPhase = false;

        if (validPhases.includes(safeId.toLowerCase())) {
            isPhase = true;
            // Phase Request
            const phaseMap = { 'neutral': 0, 'low': 1, 'medium': 2, 'high': 3, 'peak': 4 };
            const intensity = phaseMap[safeId.toLowerCase()];

            query = `
                SELECT a.*, f.name as folder_name, f.id as folder_id, m.name as module_name
                FROM assets a
                JOIN folders f ON a.folder_id = f.id
                JOIN modules m ON f.module_id = m.id
                WHERE f.intensity_level = ?
                ORDER BY f.name ASC, a.name ASC
            `;
            params = [intensity];
        } else {
            // Module Request
            query = `
                SELECT a.*, f.name as folder_name, f.id as folder_id, m.name as module_name
                FROM assets a
                JOIN folders f ON a.folder_id = f.id
                JOIN modules m ON f.module_id = m.id
                WHERE m.name = ?
                ORDER BY f.intensity_level ASC, f.name ASC, a.name ASC
            `;
            params = [safeId];
        }

        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            // Note: It might be a valid module with no assets, or invalid module.
            // For now, return empty list but 200 OK is safer unless we query Modules table first.
            // Let's query modules table to see if it exists if rows is empty, to be precise?
            // User requirement: "Validation of that :modulo requested exists".

            // Quick check for module existence if it wasn't a phase
            if (!isPhase) {
                const [modules] = await db.query('SELECT id FROM modules WHERE name = ?', [safeId]);
                if (modules.length === 0) {
                    return res.status(404).json({ message: 'Module not found' });
                }
            }
        }

        // Group by Folder
        const grouped = rows.reduce((acc, row) => {
            const folderId = row.folder_id;
            if (!acc[folderId]) {
                acc[folderId] = {
                    nombre: row.folder_name, // Requested: "nombre"
                    // assets: [] // Will add below
                };
                // We'll attach assets array to this object
                acc[folderId].assets = [];
            }

            // Clean up row data for asset object
            const { folder_name, folder_id, module_name, ...assetData } = row;
            acc[folderId].assets.push(assetData);
            return acc;
        }, {});

        const carpetas = Object.values(grouped);

        // Determine Module Name for response
        // If rows exist, take module_name from first row (might vary if mixed? unlikely for module request)
        // If phase request, it might return assets from multiple modules? 
        // If so, "modulo" field might be ambiguous. Let's use safeId if phase, or explicit module name.

        let responseModuleName = safeId;
        if (rows.length > 0 && !isPhase) {
            responseModuleName = rows[0].module_name;
        }

        // Add Session Metadata
        const sessionState = sessionManager.getState();
        res.setHeader('X-Current-Phase', sessionState.currentPhase);
        res.setHeader('X-Pacing-Speed', sessionState.pacingSpeed);
        // Also active layers could be useful
        res.setHeader('X-Active-Layers', JSON.stringify(sessionState.activeLayers));

        res.json({
            modulo: responseModuleName, // Requested: "modulo"
            carpetas: carpetas          // Requested: "carpetas"
        });

    } catch (error) {
        console.error('Error fetching media by module:', error);
        res.status(500).json({ message: 'Error fetching media' });
    }
};

exports.handleManualSelectItem = (io, socket, data) => {
    // data: { assetId, url, type, ... }
    console.log('Manual Select Item:', data);

    // Update Session State
    sessionManager.setCurrentMedia(data);

    // Validate Viewer Presence (Optional, maybe allow director to see it even if no viewer?)
    // But request said "Force Play on Viewer".

    // Broadcast to Viewers
    io.of('/experience').to('viewer').emit('viewer:force_play', data);

    // Broadcast to Directors
    io.of('/experience').to('director').emit('director:monitor_update', {
        type: 'MEDIA_CHANGE',
        data: data
    });

    if (socket) socket.emit('host:ack_select_item', { success: true, item: data });
};

exports.handleHeartbeat = (io, socket, data) => {
    // Viewer sends heartbeat
    sessionManager.updateHeartbeat(data);

    // Relay to Host/Admin listeners
    // Assuming host is in 'host' room or listening to 'host:heartbeat' on same namespace?
    // Usually admin might be on a diff namespace or same. Let's assume same for simplicity or check room.
    // Host dashboard should join 'host' room.

    socket.to('host').emit('host:heartbeat', {
        ...data,
        timestamp: Date.now()
    });
};
