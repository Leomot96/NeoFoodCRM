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

/**
 * Cliente de Prisma extendido con auto-scoping de Multi-Tenancy.
 * Inyecta automáticamente el tenantId en consultas de lectura y operaciones de escritura,
 * garantizando que ningún restaurante pueda acceder o modificar información de otro.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        // Modelos de configuración de tienda (mesas, métodos de pago) NUNCA se mezclan entre sedes,
        // incluso para SuperAdmin; cada sede solo ve las suyas.
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          if (!args.where || !args.where.tenantId) {
            args.where = { ...args.where, tenantId };
          }
        }
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          if (!args.where || !args.where.tenantId) {
            args.where = { ...args.where, tenantId };
          }
        }
        return query(args);
      },
      async findUnique({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
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
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
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
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          if (!args.where || !args.where.tenantId) {
            args.where = { ...args.where, tenantId };
          }
        }
        return query(args);
      },
      async aggregate({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          if (!args.where || !args.where.tenantId) {
            args.where = { ...args.where, tenantId };
          }
        }
        return query(args);
      },
      async groupBy({ model, operation, args, query }) {
        const tenantId = getTenantId();
        const modelLower = model.toLowerCase();
        const mustScope = tenantId && (!isSuperAdmin() || ['table', 'paymentmethod'].includes(modelLower)) && TENANT_MODELS.includes(modelLower);
        if (mustScope) {
          if (!args.where || !args.where.tenantId) {
            args.where = { ...args.where, tenantId };
          }
        }
        return query(args);
      },
      async create({ model, operation, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && TENANT_MODELS.includes(model.toLowerCase())) {
          if (!args.data.tenantId && !args.data.tenant) {
            const hasConnect = Object.values(args.data).some(
              v => v && typeof v === 'object' && ('connect' in v)
            );
            if (hasConnect) {
              args.data.tenant = { connect: { id: tenantId } };
            } else {
              args.data.tenantId = tenantId;
            }
          }
        }
        return query(args);
      },
      async createMany({ model, operation, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && TENANT_MODELS.includes(model.toLowerCase())) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map(item => ({
              ...item,
              tenantId: item.tenantId || tenantId
            }));
          }
        }
        return query(args);
      },
      async update({ model, operation, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && !isSuperAdmin() && TENANT_MODELS.includes(model.toLowerCase())) {
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
      async updateMany({ model, operation, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && !isSuperAdmin() && TENANT_MODELS.includes(model.toLowerCase())) {
          args.where = { ...args.where, tenantId };
        }
        return query(args);
      },
      async delete({ model, operation, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && !isSuperAdmin() && TENANT_MODELS.includes(model.toLowerCase())) {
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
        const tenantId = getTenantId();
        if (tenantId && !isSuperAdmin() && TENANT_MODELS.includes(model.toLowerCase())) {
          args.where = { ...args.where, tenantId };
        }
        return query(args);
      }
    }
  }
});

module.exports = prisma;