const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const sessionManager = require('../services/session.manager');

// REST Endpoints for Session Control
router.post('/effect/flash', sessionController.triggerFlashRest);
router.post('/sync/breathing', sessionController.setBreathingRest);
router.post('/layer/toggle', sessionController.toggleLayerRest);

// Debug State
router.get('/state', (req, res) => {
    res.json(sessionManager.getState());
});

// Playlist Management
router.post('/playlist', sessionController.setPlaylistRest);
router.post('/playlist/reorder', sessionController.reorderPlaylistRest);

module.exports = router;
