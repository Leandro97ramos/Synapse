const express = require('express');
const router = express.Router();
const profilesController = require('../controllers/profiles.controller');

router.post('/', profilesController.saveProfile);
router.get('/:userId', profilesController.getProfiles);

module.exports = router;
