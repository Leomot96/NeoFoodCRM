const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const tableController = require('./controllers/table.controller');

const router = express.Router();

// Protegemos la ruta para que solo usuarios logueados puedan verlas
router.use(protectRoute);

router.get('/', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), tableController.getAllTables); 
router.post('/', restrictTo(ROLES.ADMINISTRADOR), tableController.createTable);
router.delete('/:id', restrictTo(ROLES.ADMINISTRADOR), tableController.deleteTable);

// Pedidos en Mesas (Meseros pueden crear/actualizar comandas, pero solo Admin/Supervisor/Cajero pueden cancelar/anular la mesa completa)
router.post('/:id/order', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), tableController.saveOrder);
router.put('/:id/order', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), tableController.saveOrder);
router.delete('/:id/order', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), tableController.cancelOrder);

module.exports = router;
