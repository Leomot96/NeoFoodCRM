const express = require('express');
const authController = require('./auth.controller');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

// Rutas públicas
router.post('/login', authController.login);
router.post('/register-tenant', authController.registerTenant);
router.get('/plans', authController.getPublicPlans);
router.post('/refresh-token', authController.refreshToken);

// Rutas protegidas (Requieren estar logueado)
router.use(protectRoute); // Aplicar a todas las rutas de abajo

router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

// Rutas protegidas y restringidas por roles
// Ejemplo: Solo el administrador puede registrar nuevos usuarios
router.post('/register', restrictTo(ROLES.ADMINISTRADOR), authController.register);

module.exports = router;