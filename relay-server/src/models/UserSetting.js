const db = require('../config/db.config');

class UserSetting {
    static async getByUserId(userId) {
        const [rows] = await db.query(
            'SELECT * FROM calibration_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        return rows[0];
    }

    static async save(userId, settings) {
        // Validation
        const ipd = Math.max(0, Math.min(250, Number(settings.ipd) || 60));
        const vOffset = Math.max(-100, Math.min(100, Number(settings.vOffset) || 0));
        const scale = Math.max(0.1, Math.min(5.0, Number(settings.scale) || 1.0));
        const brightness = Math.max(0, Math.min(100, Number(settings.brightness) || 100));

        const calibrationData = JSON.stringify({
            ipd,
            vOffset,
            scale,
            brightness // New field
        });

        // Check if profile exists (simplified logic: just insert new or update latest)
        // For now, let's just insert a new one if it doesn't exist, or update.
        // Actually, requirement says "store". Let's use INSERT or UPDATE.

        // Check if user has a profile
        const existing = await this.getByUserId(userId);

        if (existing) {
            await db.query(
                'UPDATE calibration_profiles SET calibration_data = ? WHERE id = ?',
                [calibrationData, existing.id]
            );
            return { id: existing.id, ...JSON.parse(calibrationData) };
        } else {
            const [result] = await db.query(
                'INSERT INTO calibration_profiles (user_id, profile_name, calibration_data) VALUES (?, ?, ?)',
                [userId, 'Default Profile', calibrationData]
            );
            return { id: result.insertId, ...JSON.parse(calibrationData) };
        }
    }
}

module.exports = UserSetting;
