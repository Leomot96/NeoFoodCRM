const express = require('express');
const authController = require('./auth.controller');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const {
  sendCodeLimiter,
  verifyCodeLimiter,
  registerTenantLimiter,
  loginLimiter,
  honeypotMiddleware
} = require('../../middlewares/security.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

// Rutas públicas protegidas con Rate Limiting y Honeypot Anti-Bot
router.post('/login', loginLimiter, authController.login);
router.post('/send-verification-code', sendCodeLimiter, honeypotMiddleware(), authController.sendVerificationCode);
router.post('/verify-code', verifyCodeLimiter, authController.verifyCode);
router.post('/register-tenant', registerTenantLimiter, honeypotMiddleware(), authController.registerTenant);
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