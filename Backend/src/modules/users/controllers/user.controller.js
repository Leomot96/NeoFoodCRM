const userService = require('../services/user.service');

// Obtener todos los roles
exports.getRoles = async (req, res, next) => {
  try {
    const roleName = req.user?.role?.name || req.user?.role;
    const isSuper = roleName === 'SuperAdmin' || roleName === 'SUPERADMIN';
    const targetTenantId = (isSuper && req.query.tenantId) ? req.query.tenantId : (req.tenantId || req.user?.tenantId);
    const roles = await userService.getRoles(targetTenantId);
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los restaurantes (para el selector de SuperAdmin)
exports.getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await userService.getRestaurants();
    res.status(200).json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los usuarios
exports.getAllUsers = async (req, res, next) => {
  try {
    const filters = {};
    const roleName = req.user?.role?.name || req.user?.role;
    const isSuper = roleName === 'SuperAdmin' || roleName === 'SUPERADMIN';
    if (isSuper && req.query.tenantId) {
      filters.tenantId = req.query.tenantId;
    } else if (!isSuper) {
      filters.tenantId = req.user.tenantId;
    }
    const users = await userService.getAllUsers(filters);
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
    const user = await userService.updateUser(req.params.id, req.body, req.user?.id);
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
