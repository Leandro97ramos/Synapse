const db = require('../config/db.config');

exports.getConfig = async (req, res) => {
    try {
        // Fetch module data
        const [modules] = await db.query('SELECT * FROM modules WHERE name = ?', ['Bubbles']);

        if (modules.length === 0) {
            return res.status(404).json({ message: 'Module not found' });
        }

        const moduleData = modules[0];

        // Fetch settings for this module (assuming they are stored in the settings table linked to the folder or module? 
        // For now, we will return the basic module info and hardcode the specific visual settings until those are in the DB)
        // Schema suggests settings are linked to entity_id (folder or asset).
        // Let's just return the module status for now to prove DB connection.

        res.json({
            module: moduleData.name,
            status: moduleData.is_active ? 'active' : 'inactive',
            background: moduleData.background_url,
            settings: {
                // Keep these visual settings for now as they might not be in DB yet
                bubbleCount: 10,
                speed: 1.5,
                color: '#00f0ff',
                interactionEnabled: true
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
