const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const paymentMethodController = require('./controllers/payment-method.controller');
const saleController = require('./controllers/sale.controller');

const router = express.Router();

// Todo el módulo de ventas requiere autenticación
router.use(protectRoute);

// =======================
// RUTAS MÉTODOS DE PAGO
// =======================
router.get('/payment-methods', paymentMethodController.getAll);
router.post('/payment-methods', restrictTo(ROLES.ADMINISTRADOR), paymentMethodController.create);
router.put('/payment-methods/:id', restrictTo(ROLES.ADMINISTRADOR), paymentMethodController.update);

router.patch('/payment-methods/:id/toggle', restrictTo(ROLES.ADMINISTRADOR), paymentMethodController.toggleStatus);
router.delete('/payment-methods/:id', restrictTo(ROLES.ADMINISTRADOR), paymentMethodController.delete);

// =======================
// RUTAS DE VENTAS
// =======================
router.post('/', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), saleController.createSale);
router.get('/history', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), saleController.getHistory);
router.get('/dashboard-summary', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), saleController.getDashboardSummary);
router.get('/reports/utility', restrictTo(ROLES.ADMINISTRADOR), saleController.getUtilityReport);
router.get('/:id/invoice', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), saleController.getInvoice);

module.exports = router;