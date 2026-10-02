const prisma = require('../src/config/prisma');

async function seed() {
  console.log('--- SEMBRANDO ROLES SUPERADMIN Y PLANES SAAS ---');

  // 1. Crear o actualizar planes SaaS
  const plans = [
    {
      id: 'plan-basic-001',
      code: 'basic',
      name: 'Plan Básico',
      description: 'Ideal para pequeños cafés, food trucks y panaderías.',
      priceMonthly: 49000,
      priceAnnual: 490000,
      maxTables: 6,
      maxUsers: 2,
      maxBranches: 1,
      features: {
        pos: true,
        invoicesPdf: true,
        cashControl: true,
        inventory: false,
        analytics: false
      }
    },
    {
      id: 'plan-pro-001',
      code: 'pro',
      name: 'Plan Pro',
      description: 'Para restaurantes en crecimiento con control de insumos y recetas.',
      priceMonthly: 89000,
      priceAnnual: 890000,
      maxTables: 20,
      maxUsers: 6,
      maxBranches: 1,
      features: {
        pos: true,
        invoicesPdf: true,
        cashControl: true,
        inventory: true,
        recipes: true,
        analytics: true
      }
    },
    {
      id: 'plan-enterprise-001',
      code: 'enterprise',
      name: 'Plan Enterprise',
      description: 'Capacidad ilimitada, múltiples sedes y soporte prioritario 24/7.',
      priceMonthly: 149000,
      priceAnnual: 1490000,
      maxTables: -1,
      maxUsers: -1,
      maxBranches: 5,
      features: {
        pos: true,
        invoicesPdf: true,
        cashControl: true,
        inventory: true,
        recipes: true,
        analytics: true,
        multiBranch: true,
        prioritySupport: true
      }
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        maxTables: plan.maxTables,
        maxUsers: plan.maxUsers,
        maxBranches: plan.maxBranches,
        features: plan.features
      },
      create: plan
    });
    console.log(`✅ Plan listo: ${plan.name} (${plan.code})`);
  }

  // 2. Crear rol SuperAdmin
  const superAdminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: 'default-tenant-001',
        name: 'SuperAdmin'
      }
    },
    update: {},
    create: {
      tenantId: 'default-tenant-001',
      name: 'SuperAdmin',
      description: 'Super Administrador global de la plataforma SaaS NeoFood'
    }
  });
  console.log(`✅ Rol SuperAdmin creado/verificado (ID: ${superAdminRole.id})`);

  // 3. Asignar rol SuperAdmin a admin@neofood.com
  const updatedUser = await prisma.user.update({
    where: { email: 'admin@neofood.com' },
    data: { roleId: superAdminRole.id }
  });
  console.log(`✅ Usuario ${updatedUser.email} actualizado al rol SuperAdmin.`);

  console.log('\n🏆 SEED DE SUPERADMIN Y PLANES COMPLETADO.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
