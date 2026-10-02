const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const reportController = require('./controllers/report.controller');

const router = express.Router();

// Todos los reportes son acceso exclusivo para Administradores y Supervisores
router.use(protectRoute);
router.use(restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR));

// Endpoint unificado para obtener los datos de cualquier reporte
router.get('/data', reportController.getReportData);

module.exports = router;