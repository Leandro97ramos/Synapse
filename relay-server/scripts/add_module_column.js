const db = require('../src/config/db.config');

async function migrate() {
    try {
        console.log('Checking for module column in assets table...');

        // Check if column exists
        const [columns] = await db.query("SHOW COLUMNS FROM assets LIKE 'module'");

        if (columns.length === 0) {
            console.log('Adding module column...');
            await db.query(`
                ALTER TABLE assets 
                ADD COLUMN module ENUM('Bubbles', 'Paisajes', 'Terror', 'Adrenalina', 'Sleep') NOT NULL DEFAULT 'Bubbles' AFTER type,
                ADD INDEX idx_assets_module (module)
            `);
            console.log('Module column added successfully.');
        } else {
            console.log('Module column already exists.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
