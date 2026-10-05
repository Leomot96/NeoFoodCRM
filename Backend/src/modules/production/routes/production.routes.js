const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');
const { protectRoute, restrictTo } = require('../../../middlewares/auth.middleware');
const ROLES = require('../../../constants/roles');

// Rutas protegidas (todas requieren autenticación)
router.use(protectRoute);

router
  .route('/')
  .get(productionController.getProductionOrders)
  .post(
    restrictTo(ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.CAJERO), // Permisos para registrar producción
    productionController.createProductionOrder
  );

router
  .route('/:id/cancel')
  .post(
    restrictTo(ROLES.ADMINISTRADOR, ROLES.GERENTE), // Solo admin o gerente pueden anular
    productionController.cancelProductionOrder
  );

module.exports = router;
