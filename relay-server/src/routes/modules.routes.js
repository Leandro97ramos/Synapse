const express = require('express');
const router = express.Router();
const modulesController = require('../controllers/modules.controller');

router.get('/', modulesController.getAllModules);
router.get('/:name', modulesController.getModuleByName);

module.exports = router;
