const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const configController = require('./controllers/config.controller');

const router = express.Router();

router.use(protectRoute);

router.get('/printer', configController.getPrinterConfig);
router.put(
  '/printer',
  restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR),
  configController.updatePrinterConfig
);

module.exports = router;
