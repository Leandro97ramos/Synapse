const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assets.controller');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/', assetsController.getAllAssets); // New: Get all with filters
router.post('/', upload.single('file'), assetsController.createAsset);
router.post('/batch-delete', assetsController.batchDeleteAssets); // New: Batch Delete
router.put('/:id', assetsController.updateAsset); // New: Update (Rename/Move)
router.delete('/:id', assetsController.deleteAsset);

module.exports = router;
