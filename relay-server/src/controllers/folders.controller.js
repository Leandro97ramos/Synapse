const db = require('../config/db.config');

exports.createFolder = async (req, res) => {
    try {
        const { module_id, name } = req.body;

        if (!module_id || !name) {
            return res.status(400).json({ message: 'module_id and name are required' });
        }

        // 1. Verify module exists
        const [modules] = await db.query('SELECT id FROM modules WHERE id = ?', [module_id]);
        if (modules.length === 0) {
            return res.status(400).json({ message: 'Invalid module_id' });
        }

        // 2. Insert Folder
        const [result] = await db.query(
            'INSERT INTO folders (module_id, name, folder_settings) VALUES (?, ?, ?)',
            [module_id, name, '{}']
        );

        // 3. Return created folder
        const newFolder = {
            id: result.insertId,
            module_id,
            name,
            folder_settings: {},
            assets: [] // Initialize with empty assets for frontend convenience
        };

        res.status(201).json(newFolder);

    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateFolder = async (req, res) => {
    try {
        const folderId = req.params.id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const [result] = await db.query(
            'UPDATE folders SET name = ? WHERE id = ?',
            [name, folderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        res.json({ id: folderId, name, message: 'Folder updated successfully' });

    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.deleteFolder = async (req, res) => {
    try {
        const folderId = req.params.id;

        const [result] = await db.query(
            'DELETE FROM folders WHERE id = ?',
            [folderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        res.json({ message: 'Folder deleted successfully' });

    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
