const db = require('../config/db.config');
const mime = require('mime-types');

exports.createAsset = async (req, res) => {
    try {
        const { folder_id, type: providedType, url: providedUrl, asset_settings } = req.body;

        if (!folder_id) {
            return res.status(400).json({ message: 'folder_id is required' });
        }

        let type = providedType;
        let url = providedUrl;

        // Handle File Upload
        if (req.file) {
            url = `http://${req.get('host')}/uploads/${req.file.filename}`;
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

        // Validate type enum helper
        const validTypes = ['image', 'audio', 'video', 'special'];
        if (!validTypes.includes(type)) {
            // If auto-detection failed or invalid type provided
            // Try to map visual to image/video if possible, but backend expects specific enum
            return res.status(400).json({ message: 'Invalid asset type' });
        }

        // 1. Verify folder exists
        const [folders] = await db.query('SELECT id FROM folders WHERE id = ?', [folder_id]);
        if (folders.length === 0) {
            return res.status(400).json({ message: 'Invalid folder_id' });
        }

        // 2. Insert Asset
        const settings = asset_settings ? (typeof asset_settings === 'string' ? asset_settings : JSON.stringify(asset_settings)) : '{}';

        const [result] = await db.query(
            'INSERT INTO assets (folder_id, type, url, asset_settings) VALUES (?, ?, ?, ?)',
            [folder_id, type, url, settings]
        );

        // 3. Return created asset
        const newAsset = {
            id: result.insertId,
            folder_id,
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
