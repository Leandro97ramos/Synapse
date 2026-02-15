const db = require('../config/db.config');

class MediaAsset {
    static async create({ url, type, name, category, metadata }) {
        const validTypes = ['image', 'video', 'gif', 'audio', 'special'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        const assetSettings = JSON.stringify({
            category: category || 'uncategorized',
            metadata: metadata || {}
        });

        const [result] = await db.query(
            'INSERT INTO assets (name, type, url, asset_settings) VALUES (?, ?, ?, ?)',
            [name || 'Untitled', type, url, assetSettings]
        );

        return result.insertId;
    }

    static async getAll(category = null) {
        let query = 'SELECT * FROM assets';
        const params = [];

        // Note: Filtering by JSON field in MySQL 5.7+
        if (category) {
            query += ' WHERE JSON_EXTRACT(asset_settings, "$.category") = ?';
            params.push(category);
        }

        query += ' ORDER BY id DESC';

        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = MediaAsset;
