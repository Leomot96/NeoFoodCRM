const userService = require('../services/user.service');

// Obtener todos los roles
exports.getRoles = async (req, res, next) => {
  try {
    const roles = await userService.getRoles();
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los usuarios
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// Crear un usuario
exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Actualizar un usuario
exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Eliminar un usuario permanentemente
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.user?.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta en uso'
      });
    }

    const deleted = await userService.deleteUser(req.params.id);
    res.status(200).json({
      success: true,
      message: `Usuario ${deleted.name} eliminado exitosamente`,
      data: deleted
    });
  } catch (error) {
    next(error);
  }
};