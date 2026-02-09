const db = require('../config/db.config');

exports.getModuleByName = async (req, res) => {
    try {
        const moduleName = req.params.name;

        // 1. Fetch Module
        const [modules] = await db.query(
            'SELECT id, name, category_type, is_active, global_settings FROM modules WHERE name = ?',
            [moduleName]
        );

        if (modules.length === 0) {
            return res.status(404).json({ message: 'Module not found' });
        }

        const moduleData = modules[0];

        // 2. Fetch Folders
        const [folders] = await db.query(
            'SELECT id, name, intensity_level, folder_settings FROM folders WHERE module_id = ?',
            [moduleData.id]
        );

        // 3. Fetch Assets for all folders
        // We act optimistically: if there are no folders, there are no assets.
        let assets = [];
        if (folders.length > 0) {
            const folderIds = folders.map(f => f.id);
            const [fetchedAssets] = await db.query(
                'SELECT id, folder_id, type, url, asset_settings FROM assets WHERE folder_id IN (?)',
                [folderIds]
            );
            assets = fetchedAssets;
        }

        // 4. Construct Nested Object
        const result = {
            id: moduleData.id,
            name: moduleData.name,
            category: moduleData.category_type, // Mapping category_type to category for cleaner API? Or keep as DB? Let's keep transparent for now.
            isActive: !!moduleData.is_active,
            settings: moduleData.global_settings || {}, // Ensure object
            folders: folders.map(folder => {
                return {
                    id: folder.id,
                    name: folder.name,
                    intensity: folder.intensity_level,
                    settings: folder.folder_settings || {},
                    assets: assets
                        .filter(asset => asset.folder_id === folder.id)
                        .map(asset => ({
                            id: asset.id,
                            type: asset.type,
                            url: asset.url,
                            settings: asset.asset_settings || {}
                        }))
                };
            })
        };

        res.json(result);

    } catch (error) {
        console.error('Error fetching module:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
