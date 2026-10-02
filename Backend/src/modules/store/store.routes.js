const express = require('express');
const storeController = require('./controllers/store.controller');
const { protectRoute } = require('../../middlewares/auth.middleware');
const { uploadStoreImage } = require('../../middlewares/upload.middleware');

const router = express.Router();

// ==========================================
// 1. RUTAS PÚBLICAS (CLIENTES DE LA TIENDA)
// ==========================================
router.get('/public/:slug', storeController.getPublicStore);
router.post('/public/:slug/order', storeController.createPublicOrder);

// ==========================================
// 2. RUTAS PROTEGIDAS (ADMINISTRACIÓN RESTAURANTE)
// ==========================================
router.use(protectRoute);

// Configuración y personalización del Restaurante / Tienda
router.get('/config', storeController.getConfig);
router.put('/config', storeController.updateConfig);
router.post('/upload-logo', uploadStoreImage.single('logo'), storeController.uploadLogo);
router.delete('/logo', storeController.deleteLogo);
router.post('/upload-banner', uploadStoreImage.single('banner'), storeController.uploadBanner);
router.delete('/banner', storeController.deleteBanner);

// Gestión y monitor de Pedidos Online
router.get('/orders', storeController.getOrders);
router.get('/orders/active-count', storeController.getActiveCount);
router.patch('/orders/:id/status', storeController.updateStatus);
router.post('/orders/:id/convert-to-sale', storeController.convertToSale);

module.exports = router;
