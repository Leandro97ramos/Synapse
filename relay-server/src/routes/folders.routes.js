const express = require('express');
const router = express.Router();
const foldersController = require('../controllers/folders.controller');

router.post('/', foldersController.createFolder);
router.put('/:id', foldersController.updateFolder);
router.delete('/:id', foldersController.deleteFolder);

module.exports = router;
