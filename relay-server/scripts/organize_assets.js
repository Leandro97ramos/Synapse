const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Database Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'synapse_vr'
};

const organizeAssets = async () => {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Fetch all assets with their folder and module names
        const [assets] = await connection.execute(`
            SELECT 
                a.id, a.url, a.name as asset_name,
                f.name as folder_name,
                m.name as module_name
            FROM assets a
            JOIN folders f ON a.folder_id = f.id
            JOIN modules m ON f.module_id = m.id
        `);

        console.log(`Found ${assets.length} assets to process.`);

        for (const asset of assets) {
            // Parse existing URL to get filename
            // URL format might be: https://domain/uploads/filename.ext OR /uploads/filename.ext
            // We assume the file is currently in UPLOADS_DIR (root) or we need to find it.

            let originalFilename;
            try {
                // Determine if URL is absolute or relative
                if (asset.url.startsWith('http')) {
                    const urlObj = new URL(asset.url);
                    // pathname: /uploads/filename.ext
                    originalFilename = path.basename(urlObj.pathname);
                } else {
                    originalFilename = path.basename(asset.url);
                }
            } catch (e) {
                console.warn(`Skipping asset ${asset.id}: Invalid URL ${asset.url}`);
                continue;
            }

            // Define Source Path (Assuming currently flat in uploads/ or subdirs)
            // We'll search for the file in the uploads root first.
            const sourcePath = path.join(UPLOADS_DIR, originalFilename);

            // Check if file exists
            if (!fs.existsSync(sourcePath)) {
                console.warn(`File not found for asset ${asset.id}: ${sourcePath}. Skipping move.`);
                // If it's already organized, it might be in a subdir.
                // For now, we assume we are organizing from a flat structure or verifying.
                continue;
            }

            // Define Destination Structure: uploads/{ModuleName}/{FolderName}/
            // Sanitize names for folder paths
            const safeModuleName = asset.module_name.replace(/[^a-z0-9]/gi, '_');
            const safeFolderName = asset.folder_name.replace(/[^a-z0-9]/gi, '_');

            const destDir = path.join(UPLOADS_DIR, safeModuleName, safeFolderName);

            // Create directories recursively
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            const destPath = path.join(destDir, originalFilename);

            // Move File
            // Handle if destination is same as source (already organized)
            if (path.resolve(sourcePath) !== path.resolve(destPath)) {
                fs.renameSync(sourcePath, destPath);
                console.log(`Moved: ${originalFilename} -> ${safeModuleName}/${safeFolderName}/`);
            } else {
                console.log(`Already organized: ${originalFilename}`);
            }

            // Update Database URL
            // We want to store relative URL or absolute? 
            // Existing URLs seem to be absolute 'https://192.168...'.
            // To maintain compatibility with the Relay Server serving '/uploads',
            // we should probably keep the protocol/host part dynamic in the app, 
            // OR update it to the new structure.
            // If the app serves `app.use('/uploads', express.static(...))`
            // then `http://host/uploads/Module/Folder/file.ext` is valid.

            // Let's reconstruct the URL based on the original format
            let newUrl;
            if (asset.url.startsWith('http')) {
                const urlObj = new URL(asset.url);
                // Update pathname
                const newPathname = `/uploads/${safeModuleName}/${safeFolderName}/${originalFilename}`;
                // Reconstruct absolute URL
                newUrl = `${urlObj.protocol}//${urlObj.host}${newPathname}`;
            } else {
                // Relative path
                newUrl = `/uploads/${safeModuleName}/${safeFolderName}/${originalFilename}`;
            }

            if (newUrl !== asset.url) {
                await connection.execute('UPDATE assets SET url = ? WHERE id = ?', [newUrl, asset.id]);
                console.log(`Updated DB URL for asset ${asset.id}`);
            }
        }

        console.log('Organization complete.');

    } catch (error) {
        console.error('Error organizing assets:', error);
    } finally {
        if (connection) await connection.end();
    }
};

organizeAssets();
