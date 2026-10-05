const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const { requirePlanFeature } = require('../../middlewares/planFeature.middleware');
const ROLES = require('../../constants/roles');

const categoryController = require('./controllers/category.controller');
const ingredientController = require('./controllers/ingredient.controller');
const productController = require('./controllers/product.controller');
const movementController = require('./controllers/movement.controller');

const router = express.Router();

// Todo el módulo de inventario requiere autenticación
router.use(protectRoute);

// =======================
// RUTAS DE CATEGORÍAS
// =======================
router.get('/categories', categoryController.getAll);
router.get('/categories/:id', categoryController.getById);
router.post('/categories', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), categoryController.create);
router.put('/categories/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), categoryController.update);
router.delete('/categories/:id', restrictTo(ROLES.ADMINISTRADOR), categoryController.delete);

// =======================
// RUTAS DE INGREDIENTES (Requieren Plan Pro o superior)
// =======================
router.get('/ingredients/alerts', requirePlanFeature('inventory', 'Alertas de Inventario'), ingredientController.getAlerts); // Debe ir antes de /:id
router.get('/ingredients', requirePlanFeature('inventory', 'Inventario de Materias Primas'), ingredientController.getAll);
router.get('/ingredients/:id', requirePlanFeature('inventory', 'Inventario de Materias Primas'), ingredientController.getById);
router.get('/ingredients/:id/kardex', requirePlanFeature('inventory', 'Kárdex de Movimientos'), ingredientController.getKardex);
router.post('/ingredients', requirePlanFeature('inventory', 'Inventario de Materias Primas'), restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), ingredientController.create);
router.put('/ingredients/:id', requirePlanFeature('inventory', 'Inventario de Materias Primas'), restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), ingredientController.update);
router.delete('/ingredients/:id', requirePlanFeature('inventory', 'Inventario de Materias Primas'), restrictTo(ROLES.ADMINISTRADOR), ingredientController.delete);

const { uploadProductImage } = require('../../middlewares/upload.middleware');

// =======================
// RUTAS DE PRODUCTOS
// =======================
router.get('/products', productController.getAll);
router.post('/products/upload-image', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), uploadProductImage.single('image'), productController.uploadImage);
router.delete('/products/image', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), productController.deleteImage);
router.get('/products/:id', productController.getById);
router.post('/products', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), productController.create);
router.put('/products/:id', restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), productController.update);
router.delete('/products/:id', restrictTo(ROLES.ADMINISTRADOR), productController.delete);

// =======================
// RUTAS DE MOVIMIENTOS (Requieren Plan Pro o superior)
// =======================
router.post('/movements', requirePlanFeature('inventory', 'Movimientos de Inventario'), restrictTo(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR), movementController.registerManual);

module.exports = router;