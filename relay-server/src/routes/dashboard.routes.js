const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/:modulo', dashboardController.getMediaByModule);

module.exports = router;
