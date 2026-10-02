const { runWithTenant } = require('../context/tenantContext');
const basePrisma = require('../config/prisma');

/**
 * Middleware que establece el contexto del Tenant en cada petición HTTP
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenant = null;

    // 1. Extraer desde el usuario autenticado (si ya pasó por protectRoute)
    if (req.user && req.user.tenantId) {
      tenantId = req.user.tenantId;
      tenant = req.user.tenant;
    }

    // 2. Si no viene en req.user, revisar cabeceras explícitas (x-tenant-id o x-tenant-slug)
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    }

    // 3. Si no hay tenantId, buscar por subdominio o header slug
    const slugHeader = req.headers['x-tenant-slug'] || (req.subdomains && req.subdomains.length > 0 ? req.subdomains[0] : null);
    if (!tenantId && slugHeader && slugHeader !== 'www' && slugHeader !== 'api') {
      const foundTenant = await basePrisma.tenant.findUnique({
        where: { slug: slugHeader }
      });
      if (foundTenant) {
        tenantId = foundTenant.id;
        tenant = foundTenant;
      }
    }

    // 4. Si el tenant está suspendido o inactivo (excepto para login/refresh)
    if (tenant && (tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE')) {
      return res.status(403).json({
        success: false,
        message: 'El establecimiento se encuentra suspendido o inactivo. Contacta al soporte de NeoFood.'
      });
    }

    // 5. Inyectar en req para acceso directo
    req.tenantId = tenantId;
    req.tenant = tenant;

    // 6. Ejecutar el siguiente middleware dentro del contexto de AsyncLocalStorage
    runWithTenant({ tenantId, tenant, user: req.user }, () => {
      next();
    });
  } catch (error) {
    console.error('Error en tenantMiddleware:', error);
    next(error);
  }
};

module.exports = tenantMiddleware;
