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
    name: 'Plan Emprendedor',
    code: 'basic',
    description: 'Ideal para cafeterías, dark kitchens y negocios que inician.',
    priceMonthly: 49000,
    priceAnnual: 490000,
    maxTables: 10,
    maxUsers: 3,
    maxBranches: 1,
    features: { pos: true, invoicesPdf: true, cashControl: true, inventory: false, recipes: false, analytics: false, storeWhatsapp: true, kitchenKds: true }
  },
  {
    id: 'plan-pro-001',
    name: 'Plan Profesional',
    code: 'pro',
    description: 'Para restaurantes consolidados que buscan rentabilidad y control.',
    priceMonthly: 89000,
    priceAnnual: 890000,
    maxTables: 25,
    maxUsers: 8,
    maxBranches: 1,
    features: { pos: true, invoicesPdf: true, cashControl: true, inventory: true, recipes: true, analytics: true, storeWhatsapp: true, kitchenKds: true }
  },
  {
    id: 'plan-enterprise-001',
    name: 'Cadenas & Franquicias',
    code: 'enterprise',
    description: 'Solución empresarial sin límites para marcas en expansión.',
    priceMonthly: 159000,
    priceAnnual: 1590000,
    maxTables: -1,
    maxUsers: -1,
    maxBranches: 5,
    features: {
      pos: true, invoicesPdf: true, cashControl: true, inventory: true,
      recipes: true, analytics: true, storeWhatsapp: true, kitchenKds: true,
      multiBranch: true, prioritySupport: true
    }
  }
];

export const PLANS_CATALOG = [
  {
    code: 'basic',
    name: 'Plan Emprendedor',
    tagline: 'Ideal para cafeterías, dark kitchens y negocios que inician.',
    badge: null,
    popular: false,
    color: '#0ea5e9',
    monthlyPrice: 49000,
    annualPrice: 490000,
    limits: {
      tables: 'Hasta 10 mesas',
      users: 'Hasta 3 usuarios concurrentes',
      branches: '1 Sede / Establecimiento'
    },
    included: [
      'Punto de Venta (POS) en pantalla completa',
      'Pantalla Digital de Cocina (KDS)',
      'Tienda Virtual con Pedidos a WhatsApp (0% comisión)',
      'Control de Caja con Apertura y Cierres Ciegos',
      'Emisión de Facturas y Tickets en PDF',
      'Soporte estándar vía WhatsApp'
    ],
    notIncluded: [
      'Inventario de materias primas',
      'Sub-recetas y producción con costeo CMP',
      'Órdenes de compra y proveedores',
      'Analítica avanzada y reportes consolidados'
    ]
  },
  {
    code: 'pro',
    name: 'Plan Profesional',
    tagline: 'Para restaurantes consolidados que buscan rentabilidad y control.',
    badge: 'MÁS POPULAR',
    popular: true,
    color: '#4f46e5',
    monthlyPrice: 89000,
    annualPrice: 890000,
    limits: {
      tables: 'Hasta 25 mesas',
      users: 'Hasta 8 usuarios concurrentes',
      branches: '1 Sede / Establecimiento'
    },
    included: [
      'Todo lo del Plan Emprendedor',
      'Inventario completo de insumos y materias primas',
      'Sub-Recetas, fórmulas y producción con costo CMP',
      'Módulo de Compras y Directorio de Proveedores',
      'Kárdex de movimientos y alertas de stock crítico',
      'Analítica y reportes financieros avanzados en PDF',
      'Soporte prioritario'
    ],
    notIncluded: [
      'Multi-sedes (más de 1 sucursal)'
    ]
  },
  {
    code: 'enterprise',
    name: 'Cadenas & Franquicias',
    tagline: 'Solución empresarial sin límites para marcas en expansión.',
    badge: 'EMPRESARIAL',
    popular: false,
    color: '#10b981',
    monthlyPrice: 159000,
    annualPrice: 1590000,
    limits: {
      tables: 'Mesas ilimitadas',
      users: 'Usuarios ilimitados',
      branches: 'Hasta 5 Sedes incluidas'
    },
    included: [
      'Todo lo del Plan Profesional',
      'Capacidad ilimitada de mesas y meseros',
      'Soporte multi-sucursales (hasta 5 sedes)',
      'Consolidados financieros de toda la cadena',
      'Onboarding y capacitación personalizada',
      'Soporte VIP 24/7 y SLA garantizado'
    ],
    notIncluded: []
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
