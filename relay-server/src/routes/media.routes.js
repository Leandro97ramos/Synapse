const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const streamController = require('../controllers/stream.controller');

router.get('/phase/:level', mediaController.getAssetsByPhase);
router.get('/stream/:filename', streamController.streamVideo);

module.exports = router;
