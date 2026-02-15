const express = require('express');
const router = express.Router();
const calibrationController = require('../controllers/calibration.controller');

router.post('/save', calibrationController.saveCalibration);
router.get('/:userId', calibrationController.getCalibration);

module.exports = router;
