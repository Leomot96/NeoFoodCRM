const express = require('express');
const rateLimit = require('express-rate-limit');
const storeController = require('./controllers/store.controller');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const { uploadStoreImage } = require('../../middlewares/upload.middleware');

const router = express.Router();

// Limitador específico para creación de pedidos públicos (anti-spam / anti-flooding)
const publicOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 15, // Máximo 15 pedidos por IP cada 10 minutos
  message: {
    success: false,
    message: 'Has enviado demasiados pedidos en poco tiempo. Por favor espera unos minutos antes de intentar de nuevo.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ==========================================
// 1. RUTAS PÚBLICAS (CLIENTES DE LA TIENDA)
// ==========================================
router.get('/public/:slug', storeController.getPublicStore);
router.post('/public/:slug/order', publicOrderLimiter, storeController.createPublicOrder);

// ==========================================
// 2. RUTAS PROTEGIDAS (ADMINISTRACIÓN RESTAURANTE)
// ==========================================
router.use(protectRoute);

// Configuración y personalización del Restaurante / Tienda (Solo Administrador y Supervisor para lectura)
router.get('/config', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), storeController.getConfig);
router.put('/config', restrictTo(ROLES.ADMINISTRADOR), storeController.updateConfig);
router.post('/upload-logo', restrictTo(ROLES.ADMINISTRADOR), uploadStoreImage.single('logo'), storeController.uploadLogo);
router.delete('/logo', restrictTo(ROLES.ADMINISTRADOR), storeController.deleteLogo);
router.post('/upload-banner', restrictTo(ROLES.ADMINISTRADOR), uploadStoreImage.single('banner'), storeController.uploadBanner);
router.delete('/banner', restrictTo(ROLES.ADMINISTRADOR), storeController.deleteBanner);

// Gestión y monitor de Pedidos Online
router.get('/orders', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), storeController.getOrders);
router.get('/orders/active-count', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO, ROLES.MESERO), storeController.getActiveCount);
router.patch('/orders/:id/status', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), storeController.updateStatus);
router.post('/orders/:id/convert-to-sale', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.CAJERO), storeController.convertToSale);

module.exports = router;
