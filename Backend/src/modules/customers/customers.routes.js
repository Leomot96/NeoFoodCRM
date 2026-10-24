const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const customerController = require('./controllers/customer.controller');

const router = express.Router();

// Todo el módulo de clientes requiere que el usuario esté autenticado
router.use(protectRoute);

// =======================
// RUTAS DE CLIENTES
// =======================

// GET: Obtener todos los clientes
// (Admins, Supervisores y Cajeros necesitan ver la lista para cobrar; Meseros para asociar a comandas)
router.get('/', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), customerController.getAll);
router.put('/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), customerController.edit);
router.delete('/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), customerController.delete);
router.get('/:id/credits', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), customerController.getCustomerCredits);
router.post('/:id/pay', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), customerController.payCustomerCredit);

// POST: Crear un nuevo cliente
router.post('/', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), customerController.create);

module.exports = router;
