const express = require('express');
const saasController = require('./controllers/saas.controller');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

// Todas las rutas requieren estar logueado y ser SuperAdmin
router.use(protectRoute);
router.use(restrictTo(ROLES.SUPERADMIN));

// Métricas de la plataforma
router.get('/stats', saasController.getStats);

// Gestión de Restaurantes (Tenants)
router.get('/tenants', saasController.getTenants);
router.post('/tenants/purge-inactive', saasController.purgeInactiveTenants);
router.get('/tenants/purge-inactive-count', saasController.getPurgeCount);
router.get('/tenants/:id', saasController.getTenant);
router.patch('/tenants/:id/status', saasController.updateStatus);
router.patch('/tenants/:id/plan', saasController.updatePlan);
router.patch('/tenants/:id/activate-plan', saasController.activatePlan);
router.delete('/tenants/:id', saasController.deleteTenant);

// Gestión y filtrado global de Usuarios (por nombre, correo y restaurante)
router.get('/users', saasController.getUsers);
router.delete('/users/:id', saasController.deleteUser);

// Gestión de Planes
router.get('/plans', saasController.getPlans);

module.exports = router;
