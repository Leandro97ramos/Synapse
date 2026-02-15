const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const mime = require('mime-types');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'synapse_vr'
};

const fixMetadata = async () => {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Connected.');

        // 1. Fetch all assets
        const [assets] = await connection.execute('SELECT id, url, mimetype FROM assets');
        console.log(`Found ${assets.length} assets to audit.`);

        let updatedCount = 0;
        let errorsCount = 0;

        for (const asset of assets) {
            const originalUrl = asset.url;
            let currentUrl = originalUrl;

            // 2. Resolve Local File Path
            // Heuristic: URL might be absolute (http://...) or relative (/uploads/...)
            // We need to find the file on disk to check it.
            let localPath;
            let relativePath; // For DB storage (normalized)

            try {
                if (currentUrl.startsWith('http')) {
                    const urlObj = new URL(currentUrl);
                    // Decouple from host: just take path
                    relativePath = decodeURIComponent(urlObj.pathname); // e.g., /uploads/Bubbles/warmup/file.png
                } else {
                    relativePath = currentUrl;
                }

                // Ensure it starts with /uploads/ (standardize)
                // If it doesn't, assuming it's relative to public root? 
                // Our standard is /uploads/... 
                // But just in case, let's trust the path if it exists locally relative to project root?
                // The UPLOADS_DIR is absolute path to ../uploads
                // So if relativePath is '/uploads/foo.png', we join properly.

                // Remove leading slash for path.join if needed, but path.join handles dots
                // If relativePath is '/uploads/file.png', and UPLOADS_DIR is '.../uploads', we have a duplication issue if we join naively.
                // relativePath typically includes the 'uploads' folder name if served statically.

                // Let's assume relativePath is '/uploads/...'
                // and UPLOADS_DIR is '.../relay-server/uploads'
                // We strip '/uploads' from relativePath to join with UPLOADS_DIR
                const strippedPath = relativePath.replace(/^\/?uploads\//, '');
                localPath = path.join(UPLOADS_DIR, strippedPath);

            } catch (e) {
                console.warn(`[Asset ${asset.id}] malformed URL: ${originalUrl}`);
                errorsCount++;
                continue;
            }

            // 3. Check Existence
            if (!fs.existsSync(localPath)) {
                console.warn(`[Asset ${asset.id}] File NOT found: ${localPath} (URL: ${originalUrl})`);
                // errorsCount++; // Not strictly a metadata error, but a broken link.
                // We proceed to fix mime/url if possible? No, can't detect mime if file missing.
                continue;
            }

            // 4. Detect Metadata
            const mimeType = mime.lookup(localPath) || 'application/octet-stream';

            // 5. Normalize URL
            // We enforce forward slashes and ensure it starts with /uploads/
            // (Windows path separators in DB cause issues for web clients)
            let normalizedUrl = '/uploads/' + path.relative(UPLOADS_DIR, localPath).split(path.sep).join('/');

            // Should we store absolute URL or relative?
            // "Verifica que la url guardada sea absoluta o una ruta relativa que el servidor de estáticos pueda resolver"
            // Relative is better for portability.

            // 6. Update DB if changed
            if (asset.mimetype !== mimeType || originalUrl !== normalizedUrl) {
                // If the original was absolute http://..., and we change to relative /uploads/..., 
                // make sure this is desired. The user prompt asked to ensure URL allows resolution.
                // Relative /uploads/... works if the client/server handles the base.
                // If valid absolute is preferred, we'd prepend the host, but that's hardcode-y.
                // Let's stick to normalized relative path if the previous organizer script did similar, 
                // OR duplicate the existing absolute logic?
                // The organizer script generated absolute URLs if the input was absolute. 
                // Let's stick to the prompt: "absolute or relative that server can resolve".
                // Normalized relative is safer.

                await connection.execute(
                    'UPDATE assets SET mimetype = ?, url = ? WHERE id = ?',
                    [mimeType, normalizedUrl, asset.id]
                );
                // console.log(`[Asset ${asset.id}] Updated: ${mimeType} | ${normalizedUrl}`);
                updatedCount++;
            }
        }

        console.log(`Audit complete. Updated ${updatedCount} assets. Errors/Missing: ${errorsCount}.`);

    } catch (error) {
        console.error('Error running audit:', error);
    } finally {
        if (connection) await connection.end();
    }
};

fixMetadata();
