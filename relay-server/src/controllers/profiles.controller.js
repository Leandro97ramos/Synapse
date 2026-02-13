const db = require('../config/db.config');

const saveProfile = async (req, res) => {
    try {
        const { user_id, profile_name, calibration_data } = req.body;

        if (!user_id || !profile_name || !calibration_data) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const [result] = await db.execute(
            'INSERT INTO calibration_profiles (user_id, profile_name, calibration_data) VALUES (?, ?, ?)',
            [user_id, profile_name, JSON.stringify(calibration_data)]
        );

        res.status(201).json({ id: result.insertId, message: 'Profile saved successfully' });
    } catch (error) {
        console.error('Error saving profile:', error);
        res.status(500).json({ message: 'Error saving profile', error: error.message });
    }
};

const getProfiles = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM calibration_profiles WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ message: 'Error fetching profiles', error: error.message });
    }
};

module.exports = {
    saveProfile,
    getProfiles
};
