const { verifyToken } = require('../utils/jwt.util');
const prisma = require('../config/prisma');
const { runWithTenant } = require('../context/tenantContext');

// Middleware para verificar que el usuario está logueado y el token es válido
const protectRoute = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No autorizado, token faltante' });
    }

    // Verifica el token usando la firma del Access Token
    const decoded = verifyToken(token, false);

    // Buscamos al usuario incluyendo su rol y su tenant
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: true,
        tenant: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'El usuario del token ya no existe' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'El usuario está desactivado' });
    }

    // Verificar si el tenant asociado está activo (si no es SuperAdmin)
    const isSuper = user.role?.name === 'SuperAdmin' || user.role?.name === 'SUPERADMIN';
    if (!isSuper && user.tenant) {
      if (user.tenant.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'El establecimiento se encuentra suspendido. Por favor, contacta a soporte de NeoFood.'
        });
      }

      if (user.tenant.paymentStatus === 'PENDING' || user.tenant.status === 'INACTIVE') {
        return res.status(403).json({
          success: false,
          paymentPending: true,
          message: 'Tu cuenta está pendiente de verificación de pago. Tan pronto el SuperAdmin confirme tu pago, tu plan será activado.'
        });
      }

      if (user.tenant.subscriptionEndsAt && new Date(user.tenant.subscriptionEndsAt) < new Date()) {
        return res.status(403).json({
          success: false,
          subscriptionExpired: true,
          message: 'El periodo de tu plan o prueba gratuita ha finalizado. Por favor, contacta a soporte para reactivarlo.'
        });
      }
    }

    // Limpiamos datos sensibles antes de inyectarlo en la request
    delete user.password;
    delete user.refreshToken;

    req.user = user;
    req.tenantId = user.tenantId;
    req.tenant = user.tenant;

    // Asegurar que las consultas siguientes dentro de esta petición se ejecuten en el contexto de su tenant
    runWithTenant({ tenantId: user.tenantId, tenant: user.tenant, user }, () => {
      next();
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'No autorizado, token inválido o expirado' });
  }
};

// Middleware de permisos (Autorización)
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Si el usuario es SuperAdmin, tiene acceso universal
    const roleName = req.user?.role?.name || req.user?.role;
    if (roleName === 'SuperAdmin' || roleName === 'SUPERADMIN') {
      return next();
    }

    if (!req.user || !req.user.role || !allowedRoles.includes(roleName)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado: No tienes los permisos necesarios para realizar esta acción' 
      });
    }
    next();
  };
};

module.exports = {
  protectRoute,
  restrictTo
};