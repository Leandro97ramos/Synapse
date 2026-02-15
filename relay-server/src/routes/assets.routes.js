const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assets.controller');
const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Try to get module from body (Requires text fields BEFORE file in form data)
        // Default to 'uploads/' if not provided or empty
        let dest = 'uploads/';

        if (req.body.module) {
            const safeModule = req.body.module.replace(/[^a-zA-Z0-9]/g, '');
            if (safeModule) {
                dest = `uploads/${safeModule}/`;
            }
        }

        // Ensure directory exists
        const fullPath = path.join(__dirname, '../../', dest);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        cb(null, dest);
    },
    filename: function (req, file, cb) {
        // Sanitize filename
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + cleanName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
});

router.get('/', assetsController.getAllAssets); // New: Get all with filters
router.post('/', upload.single('file'), assetsController.createAsset);
router.post('/batch-delete', assetsController.batchDeleteAssets); // New: Batch Delete
router.put('/:id', assetsController.updateAsset); // New: Update (Rename/Move)
router.delete('/:id', assetsController.deleteAsset);

module.exports = router;
