const express = require('express');
const { protectRoute, restrictTo } = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles'); // Revisa que esta ruta a tus constantes sea correcta

const userController = require('./controllers/user.controller');

const router = express.Router();

// Protegemos todas las rutas de usuarios (Solo el Administrador puede gestionar personal)
router.use(protectRoute);
router.use(restrictTo(ROLES.ADMINISTRADOR));

// OJO CON EL ORDEN: La ruta más específica ('/roles') debe ir ANTES que las rutas dinámicas ('/:id')
router.get('/roles', userController.getRoles);
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;