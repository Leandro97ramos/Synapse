const db = require('../config/db.config');

// Save calibration profile (Insert or Update)
// For now, we are saving new profiles. If we wanted to update a specific one, we'd need an ID.
// The requirement says "guardar y recuperar sus ajustes".
// We will stick to the 'profiles' table we created: `calibration_profiles`.
// This matches the previous work on `profiles.controller.js`.
// Wait, I already created `profiles.controller.js`.
// The user request says: "1. Crea las Rutas (routes/calibration.js) ... 2. Desarrolla el Controlador (controllers/sessionController.js)".
// It seems the user might be referring to the work I already did or wants a specific `calibration` route.
// Reviewing `task.md`: "Create `calibration.routes.js`".
// Reviewing my previous work: I created `profiles.controller.js` and `profiles.routes.js` matching `calibration_profiles`.
// I should probably consolidate or alias them to avoid confusion, or simply update `profiles` to match the "saved" vs "session" distinction.
// User request: "guardar y recuperar sus ajustes de IPD y Offset."
// The `profiles` implementation does exactly this.
// I will reuse `profiles.controller.js` logic but maybe rename or ensure it covers the specific "current session" persistence if that's what is meant.
// However, typically "save settings" implies a profile.
// Let's create `calibration.controller.js` as requested, but logic will be similar to `profiles`.
// Actually, if I already have `profiles`, I should check if the user wants a *single* current calibration per user, vs multiple profiles.
// The `profiles` table allows multiple.
// The prompt says "guardar y recuperar...".
// I will create `calibration.controller.js` to handle the specific "current" or "last used" calibration, OR just point to the profiles.
// Let's assume `calibration.js` is for *active* session calibration persistence (like a single source of truth for the viewer initialization),
// OR it's just a synonymous for profiles.
// Given strict instructions "Crea las Rutas (routes/calibration.js)", I will create the file.
// I will make it work with `calibration_profiles` table.

const saveCalibration = async (req, res) => {
    try {
        const { user_id, profile_name, calibration_data } = req.body;

        if (!user_id || !calibration_data) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const name = profile_name || 'Default';

        const [result] = await db.execute(
            'INSERT INTO calibration_profiles (user_id, profile_name, calibration_data) VALUES (?, ?, ?)',
            [user_id, name, JSON.stringify(calibration_data)]
        );

        res.status(201).json({ id: result.insertId, message: 'Calibration saved successfully' });
    } catch (error) {
        console.error('Error saving calibration:', error);
        res.status(500).json({ message: 'Error saving calibration', error: error.message });
    }
};

const getCalibration = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Get the latest profile
        const [rows] = await db.execute(
            'SELECT * FROM calibration_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No calibration found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching calibration:', error);
        res.status(500).json({ message: 'Error fetching calibration', error: error.message });
    }
};

module.exports = {
    saveCalibration,
    getCalibration
};
