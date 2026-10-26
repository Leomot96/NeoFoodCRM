const { PrismaClient } = require('@prisma/client');
const { getTenantId, isSuperAdmin } = require('../context/tenantContext');

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

// Modelos operativos que pertenecen a un Tenant específico
const TENANT_MODELS = [
  'role',
  'user',
  'customer',
  'category',
  'product',
  'ingredient',
  'productionorder',
  'supplier',
  'purchase',
  'inventorymovement',
  'table',
  'order',
  'paymentmethod',
  'sale',
  'cashsession',
  'expense',
  'configuration',
  'auditlog'
];

// Modelos de ámbito estrictamente local / por sede que NUNCA se mezclan entre restaurantes,
// incluso para SuperAdmin; cada sede (incluida la sede principal del SuperAdmin) solo ve y gestiona los suyos.
const STRICTLY_SCOPED_MODELS = [
  'role',
  'table',
  'paymentmethod',
  'customer',
  'supplier',
  'purchase',
  'expense',
  'category',
  'product',
  'ingredient',
  'inventorymovement',
  'productionorder',
  'order',
  'cashsession'
];

function applyReadWhereScope(modelLower, args) {
  const tenantId = getTenantId();
  if (!tenantId || !TENANT_MODELS.includes(modelLower)) return;
  if (!isSuperAdmin()) {
    // Usuario regular de sede: forzar siempre su propio tenantId sin permitir override por query/body
    args.where = { ...args.where, tenantId };
  } else if (STRICTLY_SCOPED_MODELS.includes(modelLower)) {
    // SuperAdmin: aislar por defecto en módulos POS locales salvo que consulte explícitamente un tenantId (ej. gestión SaaS)
    if (!args.where || !args.where.tenantId) {
      args.where = { ...args.where, tenantId };
    }
  }
}

/**
 * Cliente de Prisma extendido con auto-scoping de Multi-Tenancy.
 * Inyecta automáticamente el tenantId en consultas de lectura y operaciones de escritura,
 * garantizando que ningún restaurante pueda acceder o modificar información de otro.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      },
      async findUnique({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || STRICTLY_SCOPED_MODELS.includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          // Verificar pertenencia al tenant
          const check = await basePrisma[model].findUnique({
            where: args.where,
            select: { tenantId: true }
          });
          if (check && check.tenantId && check.tenantId !== tenantId) {
            return null; // Ocultar datos de otros tenants
          }
        }
        return query(args);
      },
      async findUniqueOrThrow({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || STRICTLY_SCOPED_MODELS.includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          const check = await basePrisma[model].findUnique({
            where: args.where,
            select: { tenantId: true }
          });
          if (check && check.tenantId && check.tenantId !== tenantId) {
            const error = new Error(`Registro no encontrado para este establecimiento`);
            error.code = 'P2025';
            throw error;
          }
        }
        return query(args);
      },
      async count({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      },
      async aggregate({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      },
      async groupBy({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      },
      async create({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        if (tenantId && TENANT_MODELS.includes(modelLower) && args.data) {
          const forceTenant = !isSuperAdmin();
          if (forceTenant || (!args.data.tenantId && !args.data.tenant)) {
            const hasConnect = Object.values(args.data).some(
              v => v && typeof v === 'object' && ('connect' in v)
            );
            if (hasConnect && !args.data.tenantId) {
              args.data.tenant = { connect: { id: tenantId } };
            } else {
              delete args.data.tenant;
              args.data.tenantId = tenantId;
            }
          }
        }
        return query(args);
      },
      async createMany({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        if (tenantId && TENANT_MODELS.includes(modelLower)) {
          const forceTenant = !isSuperAdmin();
          if (Array.isArray(args.data)) {
            args.data = args.data.map(item => ({
              ...item,
              tenantId: forceTenant ? tenantId : (item.tenantId || tenantId)
            }));
          }
        }
        return query(args);
      },
      async update({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || STRICTLY_SCOPED_MODELS.includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          const check = await basePrisma[model].findUnique({
            where: args.where,
            select: { tenantId: true }
          });
          if (check && check.tenantId && check.tenantId !== tenantId) {
            const error = new Error('Acceso denegado: El registro pertenece a otro establecimiento');
            error.statusCode = 404;
            throw error;
          }
          if (!isSuperAdmin() && args.data && 'tenantId' in args.data) {
            args.data.tenantId = tenantId;
          }
        }
        return query(args);
      },
      async updateMany({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      },
      async delete({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || STRICTLY_SCOPED_MODELS.includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          const check = await basePrisma[model].findUnique({
            where: args.where,
            select: { tenantId: true }
          });
          if (check && check.tenantId && check.tenantId !== tenantId) {
            const error = new Error('Acceso denegado: El registro pertenece a otro establecimiento');
            error.statusCode = 404;
            throw error;
          }
        }
        return query(args);
      },
      async deleteMany({ model, operation, args, query }) {
        applyReadWhereScope(model.toLowerCase(), args);
        return query(args);
      }
    }
  }
});

module.exports = prisma;