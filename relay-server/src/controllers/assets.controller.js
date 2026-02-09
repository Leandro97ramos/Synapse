const db = require('../config/db.config');
const mime = require('mime-types');
const fs = require('fs');
const path = require('path');

exports.createAsset = async (req, res) => {
    try {
        const { folder_id, type: providedType, url: providedUrl, asset_settings, name: providedName } = req.body;

        // folder_id is now optional (nullable)

        let type = providedType;
        let url = providedUrl;
        let name = providedName;

        // Handle File Upload
        if (req.file) {
            url = `http://${req.get('host')}/uploads/${req.file.filename}`;
            if (!name) name = req.file.originalname; // Default name from file

            const mimeType = mime.lookup(req.file.originalname);
            if (mimeType) {
                if (mimeType.startsWith('image/')) type = 'image';
                else if (mimeType.startsWith('video/')) type = 'video';
                else if (mimeType.startsWith('audio/')) type = 'audio';
                else type = 'special';
            } else {
                type = 'special'; // Default fallback
            }
        }

        // Validate
        if (!type || !url) {
            return res.status(400).json({ message: 'type and url (or file) are required' });
        }

        if (!name) {
            name = 'Untitled Asset';
        }

        // Validate type enum helper
        const validTypes = ['image', 'audio', 'video', 'special'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid asset type' });
        }

        // 1. Verify folder exists if provided
        if (folder_id) {
            const [folders] = await db.query('SELECT id FROM folders WHERE id = ?', [folder_id]);
            if (folders.length === 0) {
                return res.status(400).json({ message: 'Invalid folder_id' });
            }
        }

        // 2. Insert Asset
        const settings = asset_settings ? (typeof asset_settings === 'string' ? asset_settings : JSON.stringify(asset_settings)) : '{}';

        // Use NULL for folder_id if not provided
        const finalFolderId = folder_id || null;

        const [result] = await db.query(
            'INSERT INTO assets (folder_id, name, type, url, asset_settings) VALUES (?, ?, ?, ?, ?)',
            [finalFolderId, name, type, url, settings]
        );

        // 3. Return created asset
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
