const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const tableController = require('./controllers/table.controller');

const router = express.Router();

// Protegemos la ruta para que solo usuarios logueados (cajeros, meseros, etc.) puedan verlas
router.use(protectRoute);

router.get('/', tableController.getAllTables); 
router.post('/', restrictTo(ROLES.ADMINISTRADOR), tableController.createTable);
router.delete('/:id', restrictTo(ROLES.ADMINISTRADOR), tableController.deleteTable);

// Pedidos en Mesas
router.post('/:id/order', tableController.saveOrder);
router.put('/:id/order', tableController.saveOrder);
router.delete('/:id/order', tableController.cancelOrder);

module.exports = router; 