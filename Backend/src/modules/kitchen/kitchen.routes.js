const express = require('express');
const kitchenController = require('./controllers/kitchen.controller');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.use(protectRoute);

router.get('/orders', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), kitchenController.getOrders);
router.post('/orders', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), kitchenController.createOrder);
router.patch('/orders/:id/status', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), kitchenController.updateStatus);

module.exports = router;
