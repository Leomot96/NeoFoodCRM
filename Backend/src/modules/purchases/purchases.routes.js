const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const { requirePlanFeature } = require('../../middlewares/planFeature.middleware');
const ROLES = require('../../constants/roles');

const supplierController = require('./controllers/supplier.controller');
const purchaseController = require('./controllers/purchase.controller');
const purchaseService = require('./services/purchase.service');

const router = express.Router();

// Todo el módulo de compras requiere autenticación y Plan Pro con inventory: true
router.use(protectRoute);
router.use(requirePlanFeature('inventory', 'Compras y Proveedores'));

// =======================
// RUTAS DE PROVEEDORES
// =======================
router.get('/suppliers', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), supplierController.getAll);
router.get('/suppliers/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), supplierController.getById);
router.post('/suppliers', restrictTo(ROLES.ADMINISTRADOR), supplierController.create);
router.put('/suppliers/:id', restrictTo(ROLES.ADMINISTRADOR), supplierController.update);
router.delete('/suppliers/:id', restrictTo(ROLES.ADMINISTRADOR), supplierController.delete);

// =======================
// RUTAS DE COMPRAS
// =======================
router.get('/history', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), purchaseController.getAll);
router.get('/report', restrictTo(ROLES.ADMINISTRADOR), purchaseController.getReport); // Debe ir antes de /:id
router.get('/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), purchaseController.getById);
router.post('/', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), purchaseController.create);
router.put('/:id/cancel', restrictTo(ROLES.ADMINISTRADOR), purchaseController.cancel);

router.put('/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), purchaseController.updateMetadata);

module.exports = router;
