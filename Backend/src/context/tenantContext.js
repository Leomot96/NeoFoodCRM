const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * Ejecuta una función dentro del contexto de un Tenant determinado
 * @param {Object} context - { tenantId, tenant, user }
 * @param {Function} callback - Función a ejecutar
 */
const runWithTenant = (context, callback) => {
  return tenantStorage.run(context, callback);
};

/**
 * Retorna el contexto actual de la petición
 */
const getTenantContext = () => {
  return tenantStorage.getStore() || null;
};

/**
 * Retorna únicamente el ID del Tenant activo (o null si es global/superadmin)
 */
const getTenantId = () => {
  const store = tenantStorage.getStore();
  return store ? store.tenantId : null;
};

/**
 * Verifica si la petición actual pertenece a un SuperAdmin de la plataforma
 */
const isSuperAdmin = () => {
  const store = tenantStorage.getStore();
  if (!store || !store.user) return false;
  const roleName = store.user.role?.name || store.user.role;
  return roleName === 'SuperAdmin' || roleName === 'SUPERADMIN';
};

module.exports = {
  tenantStorage,
  runWithTenant,
  getTenantContext,
  getTenantId,
  isSuperAdmin
};
