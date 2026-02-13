const db = require('../src/config/db.config');

async function migrate() {
    try {
        console.log("Updating ENUM for assets table to include 'gif'...");
        await db.query(`ALTER TABLE assets MODIFY COLUMN type ENUM('image', 'audio', 'video', 'gif', 'special') NOT NULL`);
        console.log("Success! ENUM updated.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
