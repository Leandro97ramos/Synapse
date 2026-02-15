const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'synapse_vr'
};

const classifyAssets = async () => {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Fetch all assets with their folder and module relations (Source of Truth)
        // We join to get the module name from the existing hierarchy
        const [assets] = await connection.execute(`
            SELECT 
                a.id, a.url,
                m.name as proper_module_name
            FROM assets a
            JOIN folders f ON a.folder_id = f.id
            JOIN modules m ON f.module_id = m.id
        `);

        console.log(`Found ${assets.length} linked assets to classify.`);

        let updatedCount = 0;

        for (const asset of assets) {
            // Update the 'module' column with the name found via relation
            // This ensures data consistency
            if (asset.proper_module_name) {
                // Ensure it matches one of the ENUM values: 'Bubbles', 'Paisajes', 'Terror', 'Adrenalina', 'Sleep'
                // (Our seed data and logic uses these exact names)
                const validModules = ['Bubbles', 'Paisajes', 'Terror', 'Adrenalina', 'Sleep'];

                let targetModule = asset.proper_module_name;

                if (!validModules.includes(targetModule)) {
                    console.warn(`Warning: Module '${targetModule}' for asset ${asset.id} is not in ENUM list. Defaulting to 'Bubbles' or skipping locally?`);
                    // If strict, we might fail. If lenient, we default or map.
                    // For now, assuming seed data is correct.
                }

                await connection.execute('UPDATE assets SET module = ? WHERE id = ?', [targetModule, asset.id]);
                updatedCount++;
            }
        }

        console.log(`Updated module column for ${updatedCount} assets based on folder hierarchy.`);

        // 2. Fallback for Unlinked Assets (if any)
        // If folder_id is NULL, we might try to guess from URL
        const [unlinkedAssets] = await connection.execute(`
            SELECT id, url FROM assets WHERE folder_id IS NULL AND module = 'Bubbles' -- Default
        `);

        if (unlinkedAssets.length > 0) {
            console.log(`Found ${unlinkedAssets.length} unlinked assets. Attempting regex classification...`);
            for (const asset of unlinkedAssets) {
                const url = asset.url;
                let detectedModule = null;

                if (url.match(/Bubbles/i)) detectedModule = 'Bubbles';
                else if (url.match(/Paisajes/i)) detectedModule = 'Paisajes';
                else if (url.match(/Terror/i)) detectedModule = 'Terror';
                else if (url.match(/Adrenalina/i)) detectedModule = 'Adrenalina';
                else if (url.match(/Sleep/i)) detectedModule = 'Sleep';

                if (detectedModule) {
                    await connection.execute('UPDATE assets SET module = ? WHERE id = ?', [detectedModule, asset.id]);
                    console.log(`Classified unlinked asset ${asset.id} as ${detectedModule}`);
                }
            }
        }

        console.log('Classification complete.');

    } catch (error) {
        console.error('Error classifying assets:', error);
    } finally {
        if (connection) await connection.end();
    }
};

classifyAssets();
