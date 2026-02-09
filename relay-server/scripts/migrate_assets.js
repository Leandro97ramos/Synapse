const db = require('../src/config/db.config');

const migrate = async () => {
    try {
        console.log("Starting migration...");

        // 1. Add 'name' column if it doesn't exist
        try {
            await db.query(`ALTER TABLE assets ADD COLUMN name VARCHAR(255) NULL AFTER folder_id;`);
            console.log("Added 'name' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("'name' column already exists.");
            else throw e;
        }

        // 2. Modify 'folder_id' to be NULLABLE and change FK constraint
        // First drop the existing constraint
        try {
            await db.query(`ALTER TABLE assets DROP FOREIGN KEY fk_assets_folders;`);
            console.log("Dropped old FK constraint.");
        } catch (e) {
            console.log("FK constraint might not exist or verify name:", e.message);
        }

        // Search for constraint name if standard name wasn't used (optional, skipping for now assuming standard 'fk_assets_folders')

        // Modify column
        await db.query(`ALTER TABLE assets MODIFY COLUMN folder_id INT NULL;`);
        console.log("Modified 'folder_id' to be nullable.");

        // Add new constraint with ON DELETE SET NULL
        await db.query(`
            ALTER TABLE assets 
            ADD CONSTRAINT fk_assets_folders 
            FOREIGN KEY (folder_id) 
            REFERENCES folders (id) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE;
        `);
        console.log("Added new FK constraint with ON DELETE SET NULL.");

        // 3. Populate 'name' for existing assets
        const [assets] = await db.query(`SELECT id, url FROM assets WHERE name IS NULL`);
        for (const asset of assets) {
            // Extract filename from URL
            const filename = asset.url.split('/').pop().split('?')[0];
            await db.query(`UPDATE assets SET name = ? WHERE id = ?`, [filename, asset.id]);
            console.log(`Updated asset ${asset.id} with name: ${filename}`);
        }

        console.log("Migration completed successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
