const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const { requirePlanFeature } = require('../../middlewares/planFeature.middleware');
const ROLES = require('../../constants/roles');
const reportController = require('./controllers/report.controller');

const router = express.Router();

// Todos los reportes son acceso exclusivo para Administradores y Supervisores y requieren Plan Pro (analytics: true)
router.use(protectRoute);
router.use(restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR));
router.use(requirePlanFeature('analytics', 'Analítica y Reportes Avanzados'));

// Endpoint unificado para obtener los datos de cualquier reporte
router.get('/data', reportController.getReportData);

module.exports = router;