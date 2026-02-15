const db = require('../config/db.config');

exports.getAssetsByPhase = async (req, res) => {
    try {
        const { level } = req.params; // 'neutral', 'low', 'medium', 'high', 'peak'

        // Map phase names to intensity levels (or use categories as requested)
        // User request: "devuelva solo los assets correspondientes a la intensidad seleccionada"
        // Schema has `folders.intensity_level`. Let's map phases to integer levels.

        const phaseMap = {
            'neutral': 0,
            'low': 1,
            'medium': 2,
            'high': 3,
            'peak': 4
        };

        const intensity = phaseMap[level.toLowerCase()];

        if (intensity === undefined) {
            return res.status(400).json({ message: 'Invalid phase level. Use: neutral, low, medium, high, peak' });
        }

        // Query: Join Assets with Folders, filter by intensity
        // Also include assets that might be manually tagged with category corresponding to phase?
        // Let's stick to Folder Intensity as primary organization method per schema.

        const query = `
            SELECT a.* 
            FROM assets a
            JOIN folders f ON a.folder_id = f.id
            WHERE f.intensity_level = ?
            ORDER BY RAND()
        `;

        const [assets] = await db.query(query, [intensity]);

        res.json({
            phase: level,
            intensity,
            count: assets.length,
            assets
        });

    } catch (error) {
        console.error('Error fetching phase assets:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
