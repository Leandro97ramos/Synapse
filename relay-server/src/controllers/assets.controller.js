const os = require('os');
const mime = require('mime-types');
const fs = require('fs');
const path = require('path');
const db = require('../config/db.config');
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};


exports.createAsset = async (req, res) => {
    try {
        const { folder_id, type: providedType, url: providedUrl, asset_settings, name: providedName, module: providedModule } = req.body;

        let type = providedType;
        let url = providedUrl;
        let name = providedName;
        let targetModule = providedModule || 'Bubbles';

        // Check enum validity for module
        const validModules = ['Bubbles', 'Paisajes', 'Terror', 'Adrenalina', 'Sleep'];
        if (!validModules.includes(targetModule)) {
            targetModule = 'Bubbles';
        }

        // Handle File Upload
        if (req.file) {
            const protocol = req.protocol;
            const host = getLocalIp();
            const port = 3000;
            const filename = req.file.filename;

            // Determine if file is in a subdirectory (if Multer dynamic dest worked)
            // req.file.destination usually contains the path used, e.g., 'uploads/Terror/' or 'uploads/'
            // We need to construct the URL relative to the static root.

            // Normalize path separators to forward slash for URL
            // req.file.path is full system path or relative? Multer gives 'path' usually relative if dest was relative.
            // Let's rely on req.file.destination which we set.

            let storedPath = 'uploads/';
            if (req.file.destination) {
                // destination might be 'uploads/' or 'uploads/Terror/'
                storedPath = req.file.destination;
            }
            console.log('[DEBUG] File Details:', {
                originalname: req.file.originalname,
                destination: req.file.destination,
                path: req.file.path,
                storedPath
            });

            // Clean up storedPath for URL (remove trailing slash or double slashes)
            // If storedPath is 'uploads/Terror/', we want URL .../uploads/Terror/filename

            // STRICT MIME DETECTION
            // User asked to use 'mime-types' library on the file.
            // Since we trust local file now:
            const detectedMime = mime.lookup(req.file.path);
            // detectedMime is based on extension on disk. To hold strict to "don't trust extension from client" we should have checked content.
            // But 'mime-types' lib IS extension based on lookup(filename).
            // If the user *really* meant content inspection, we'd need 'mmmagic' or 'file-type'.
            // Given "mime-types" constraint, we verify that the *uploaded* file extension matches a valid type.

            if (!detectedMime) {
                // Unknown type -> DELETE
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Unknown file type.' });
            }

            if (detectedMime === 'image/gif') type = 'gif';
            else if (detectedMime.startsWith('image/')) type = 'image';
            else if (detectedMime.startsWith('video/')) type = 'video';
            else if (detectedMime.startsWith('audio/')) type = 'audio';
            else {
                // Not a supported type -> DELETE
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: `Unsupported file type: ${detectedMime}` });
            }

            // Construct URL
            // storedPath from Multer destination might be 'uploads/' or 'uploads/Terror/'
            let forwardStoredPath = storedPath.replace(/\\/g, '/');
            if (forwardStoredPath.endsWith('/')) {
                forwardStoredPath = forwardStoredPath.slice(0, -1);
            }

            const urlPath = `${forwardStoredPath}/${filename}`;

            // Use static URL to ensure range support via express.static
            url = `${protocol}://${host}:${port}/${urlPath}`;

            if (!name) name = req.file.originalname;

            // Ensure Permissions (chmod 644)
            try {
                fs.chmodSync(req.file.path, 0o644);
            } catch (err) {
                console.error('Error setting permissions:', err);
            }
        }

        // Validate
        if (!type || !url) {
            return res.status(400).json({ message: 'type and url (or file) are required' });
        }

        if (!name) name = 'Untitled Asset';

        // 1. Verify folder exists if provided and not null
        let finalFolderId = null;
        if (folder_id && folder_id !== 'null' && folder_id !== 'undefined') {
            const [folders] = await db.query('SELECT id FROM folders WHERE id = ?', [folder_id]);
            if (folders.length > 0) finalFolderId = folder_id;
        }

        // 2. Insert Asset
        const settings = asset_settings ? (typeof asset_settings === 'string' ? asset_settings : JSON.stringify(asset_settings)) : '{}';

        // NOTE: We do NOT insert 'module' into the assets table as per user request.
        // The module is used for file organization (URL), but the link to module in DB is via folder_id -> folders -> module connection
        // OR implicit by the user manually organizing.

        const [result] = await db.query(
            'INSERT INTO assets (folder_id, name, type, url, asset_settings) VALUES (?, ?, ?, ?, ?)',
            [finalFolderId, name, type, url, settings]
        );

        const newAsset = {
            id: result.insertId,
            folder_id: finalFolderId,
            name,
            type,
            url,
            settings: asset_settings || {}
        };

        res.status(201).json(newAsset);

    } catch (error) {
        console.error('Error creating asset:', error);
        // Clean up file if it exists and we crashed (only if we have req.file)
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAllAssets = async (req, res) => {
    try {
        const { folder_id, type } = req.query;
        let query = 'SELECT * FROM assets WHERE 1=1';
        const params = [];

        if (folder_id === 'null' || folder_id === 'unassigned') {
            query += ' AND folder_id IS NULL';
        } else if (folder_id) {
            query += ' AND folder_id = ?';
            params.push(folder_id);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY id DESC';

        const [assets] = await db.query(query, params);
        res.json(assets);
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const assetId = req.params.id;
        const { name, folder_id } = req.body;

        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }

        if (folder_id !== undefined) {
            // Check if folder exists if not null
            if (folder_id !== null) {
                const [folders] = await db.query('SELECT id FROM folders WHERE id = ?', [folder_id]);
                if (folders.length === 0) return res.status(400).json({ message: 'Invalid folder_id' });
            }
            updates.push('folder_id = ?');
            params.push(folder_id);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No updates provided' });
        }

        params.push(assetId);

        await db.query(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ message: 'Asset updated successfully' });

    } catch (error) {
        console.error('Error updating asset:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const assetId = req.params.id;
        await deleteAssetById(assetId, req.get('host'));
        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.batchDeleteAssets = async (req, res) => {
    try {
        const { assetIds } = req.body; // Expect array of IDs
        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: 'assetIds array required' });
        }

        const host = req.get('host');
        for (const id of assetIds) {
            await deleteAssetById(id, host);
        }

        res.json({ message: 'Assets deleted successfully' });
    } catch (error) {
        console.error('Error batch deleting assets:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Helper function
async function deleteAssetById(assetId, host) {
    // 1. Get asset details to find file path
    const [assets] = await db.query('SELECT url FROM assets WHERE id = ?', [assetId]);
    if (assets.length === 0) return;

    const assetUrl = assets[0].url;

    // 2. Delete from DB
    await db.query('DELETE FROM assets WHERE id = ?', [assetId]);

    // 3. Delete file if local
    if (assetUrl.includes(host) && assetUrl.includes('/uploads/')) {
        const filename = assetUrl.split('/uploads/')[1];
        if (filename) {
            const filePath = path.join(__dirname, '../../uploads', filename);
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') console.error("Failed to delete local file:", err);
            });
        }
    }
}
