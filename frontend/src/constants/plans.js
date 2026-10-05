/**
 * Catálogo comercial compartido de planes SaaS NeoFood.
 * Fuente principal: endpoint público `/auth/plans` (tabla `plans`).
 * Estos valores son el respaldo (fallback) cuando la API no responde y
 * deben mantenerse sincronizados con `Backend/scripts/reset_clean_db.js`.
 */

export const TRIAL_DAYS = 7;

// WhatsApp de soporte comercial (mismo número usado en Login / Registro)
export const SUPPORT_WHATSAPP = '573101234567';

export const DEFAULT_PLANS = [
  {
    id: 'plan-basic-001',
    name: 'Plan Básico',
    code: 'basic',
    description: 'Ideal para pequeños cafés, food trucks y panaderías.',
    priceMonthly: 49000,
    priceAnnual: 490000,
    maxTables: 6,
    maxUsers: 2,
    maxBranches: 1,
    features: { pos: true, invoicesPdf: true, cashControl: true, inventory: false, analytics: false }
  },
  {
    id: 'plan-pro-001',
    name: 'Plan Pro',
    code: 'pro',
    description: 'Para restaurantes en crecimiento con control de insumos y recetas.',
    priceMonthly: 89000,
    priceAnnual: 890000,
    maxTables: 20,
    maxUsers: 6,
    maxBranches: 1,
    features: { pos: true, invoicesPdf: true, cashControl: true, inventory: true, recipes: true, analytics: true }
  },
  {
    id: 'plan-enterprise-001',
    name: 'Plan Enterprise',
    code: 'enterprise',
    description: 'Capacidad ilimitada, múltiples sedes y soporte prioritario 24/7.',
    priceMonthly: 149000,
    priceAnnual: 1490000,
    maxTables: -1,
    maxUsers: -1,
    maxBranches: 5,
    features: {
      pos: true, invoicesPdf: true, cashControl: true, inventory: true,
      recipes: true, analytics: true, multiBranch: true, prioritySupport: true
    }
  }
];

// Capacidades incluidas en todos los planes
export const BASE_FEATURES = [
  'Tienda virtual con pedidos por WhatsApp',
  'Pantalla de cocina (KDS)',
  'Gestión de mesas y comandas'
];

// Etiquetas comerciales para las llaves del JSON `features` del plan (en orden de exhibición)
export const FEATURE_LABELS = [
  { key: 'pos', label: 'Punto de venta (POS)' },
  { key: 'cashControl', label: 'Control de caja y turnos' },
  { key: 'invoicesPdf', label: 'Facturas y reportes en PDF' },
  { key: 'inventory', label: 'Inventario de insumos y compras' },
  { key: 'recipes', label: 'Recetas, sub-recetas y producción' },
  { key: 'analytics', label: 'Analítica y reportes avanzados' },
  { key: 'multiBranch', label: 'Multi-sede' },
  { key: 'prioritySupport', label: 'Soporte prioritario 24/7' }
];

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Mensual', months: 1 },
  { value: 'semiannual', label: 'Semestral', months: 6 },
  { value: 'annual', label: 'Anual', months: 12 }
];

export const formatCOP = (amount) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    .format(amount || 0);

/** Total facturado por ciclo (misma regla que el backend en registerTenant). */
export const calculatePlanCost = (plan, cycle) => {
  if (!plan) return 0;
  const monthly = parseFloat(plan.priceMonthly) || 0;
  const annual = parseFloat(plan.priceAnnual) || monthly * 12;
  if (cycle === 'annual') return annual;
  if (cycle === 'semiannual') return monthly * 6;
  return monthly;
};

/** Porcentaje de ahorro del plan anual frente a 12 meses de pago mensual. */
export const annualSavingsPercent = (plan) => {
  const monthly = parseFloat(plan?.priceMonthly) || 0;
  const annual = parseFloat(plan?.priceAnnual) || 0;
  if (!monthly || !annual) return 0;
  return Math.max(0, Math.round((1 - annual / (monthly * 12)) * 100));
};

export const formatLimit = (value, singular, plural) => {
  if (value === -1 || value === null || value === undefined) return `${plural} ilimitados`;
  return `${value} ${value === 1 ? singular : plural}`;
};

/** Normaliza el campo `features` (puede llegar como string JSON desde MySQL). */
export const getPlanFeatures = (plan) => {
  const raw = plan?.features;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
};
