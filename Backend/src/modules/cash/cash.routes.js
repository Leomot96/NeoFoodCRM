const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const cashController = require('./controllers/cash.controller');

const router = express.Router();

// Rutas protegidas para todo el módulo
router.use(protectRoute);

// =======================
// OPERACIÓN DE CAJEROS
// =======================
router.post('/session/open', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), cashController.openSession);
router.post('/session/:id/close', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), cashController.closeSession);
router.post('/session/:id/movements', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), cashController.registerMovement);

// =======================
// AUDITORÍA Y ARQUEOS (Solo Admin y Supervisor)
// =======================
router.post('/session/:id/audit', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), cashController.auditSession);
router.get('/history', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), cashController.getHistory);

// =======================
// REPORTES (Admin y Supervisor)
// =======================
router.get('/reports/daily', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), cashController.getDailyReport);
router.get('/reports/monthly', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), cashController.getMonthlyReport);

module.exports = router;