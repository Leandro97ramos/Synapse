const express = require('express');
const router = express.Router();
const bubblesController = require('../controllers/bubbles.controller');

router.get('/config', bubblesController.getConfig);

module.exports = router;
