const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanUploads() {
  console.log('🧹 Limpiando directorio de archivos subidos (uploads)...');
  const dirs = [
    path.join(__dirname, '..', 'uploads', 'products'),
    path.join(__dirname, '..', 'uploads', 'store')
  ];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(dir, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            console.log(`   🗑️ Archivo eliminado: ${file}`);
          }
        } catch (err) {
          console.error(`   ⚠️ Error eliminando ${file}:`, err.message);
        }
      }
    }
  }
  console.log('✅ Directorios de uploads limpios y restablecidos.');
}

async function main() {
  console.log('========================================================');
  console.log('🚀 INICIANDO RESTABLECIMIENTO Y LIMPIEZA TOTAL DE BD');
  console.log('========================================================');

  // 1. Desactivar validación de llaves foráneas para truncar tablas de forma segura
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  const tablesToTruncate = [
    'sale_detail_additions',
    'sale_detail_variations',
    'sale_details',
    'sales',
    'order_details',
    'orders',
    'cash_audits',
    'cash_movements',
    'cash_sessions',
    'customer_credits',
    'customers',
    'expenses',
    'purchase_details',
    'purchases',
    'suppliers',
    'production_consumptions',
    'production_orders',
    'inventory_movements',
    'modifier_option_ingredients',
    'product_modifier_options',
    'product_modifiers',
    'product_additions',
    'product_ingredients',
    'ingredient_recipes',
    'ingredients',
    'products',
    'categories',
    'audit_logs',
    'tables',
    'payment_methods',
    'configurations',
    'users',
    'roles',
    'tenants'
  ];

  for (const table of tablesToTruncate) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`   ✔️ Tabla vaciada: ${table}`);
    } catch (e) {
      console.warn(`   ⚠️ Advertencia vaciando ${table}: ${e.message}`);
    }
  }

  // Reactivar llaves foráneas
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✅ Todas las tablas operativas han sido vaciadas.');

  // 2. Sembrado de Planes SaaS
  console.log('\n📦 Sembrando planes SaaS...');
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
      update: plan,
      create: plan
    });
    console.log(`   ✔️ Plan activo: ${plan.name} (${plan.code})`);
  }

  // 3. Crear Establecimientos (Tenants)
  console.log('\n🏢 Sembrando Establecimientos (Tenants)...');
  const mainTenant = await prisma.tenant.create({
    data: {
      id: 'default-tenant-001',
      name: 'NeoFood Sede Principal',
      slug: 'sede-principal',
      document: '900.123.456-7',
      email: 'admin@neofood.com',
      phone: '+57 300 000 0000',
      address: 'Calle Principal #10-20',
      status: 'ACTIVE',
      planId: 'plan-enterprise-001',
      paymentStatus: 'VERIFIED',
      isStoreActive: true,
      storeSchedule: 'Lunes a Domingo: 11:00 AM - 10:00 PM',
      storeDescription: 'Sede Principal y Matriz Administrativa de NeoFood POS & CRM.',
      storeAnnouncement: '¡Bienvenidos a NeoFood Sede Principal! Plataforma gastronómica activa.'
    }
  });
  console.log(`   ✔️ Tenant 1: ${mainTenant.name} (${mainTenant.slug})`);

  const demoTenant = await prisma.tenant.create({
    data: {
      id: 'demo-tenant-001',
      name: 'Restaurante Demo',
      slug: 'restaurante-demo',
      document: '800.987.654-3',
      email: 'demo@neofood.com',
      phone: '+57 300 123 4567',
      address: 'Carrera 15 #85-30, Zona Gourmet',
      status: 'ACTIVE',
      planId: 'plan-pro-001',
      paymentStatus: 'VERIFIED',
      isStoreActive: true,
      storeSchedule: 'Martes a Domingo: 12:00 PM - 11:00 PM',
      storeDescription: 'Restaurante de prueba y demostración en vivo de NeoFood.',
      storeAnnouncement: '¡Bienvenido a nuestra tienda virtual de demostración! Haz tus pedidos de prueba.'
    }
  });
  console.log(`   ✔️ Tenant 2: ${demoTenant.name} (${demoTenant.slug})`);

  // 4. Crear Roles para cada Tenant
  console.log('\n🛡️ Sembrando Roles por Establecimiento...');
  const baseRoleNames = ['Administrador', 'Supervisor', 'Cajero', 'Mesero'];

  // Roles para Tenant Principal (incluye SuperAdmin)
  const superAdminRole = await prisma.role.create({
    data: {
      tenantId: mainTenant.id,
      name: 'SuperAdmin',
      description: 'Super Administrador global con control total de la plataforma SaaS y todas las sedes.'
    }
  });

  const mainRoles = { SuperAdmin: superAdminRole };
  for (const rName of baseRoleNames) {
    const r = await prisma.role.create({
      data: {
        tenantId: mainTenant.id,
        name: rName,
        description: `Rol de ${rName} para ${mainTenant.name}`
      }
    });
    mainRoles[rName] = r;
  }
  console.log(`   ✔️ Roles creados para ${mainTenant.name}: SuperAdmin, ${baseRoleNames.join(', ')}`);

  // Roles para Tenant Demo
  const demoRoles = {};
  for (const rName of baseRoleNames) {
    const r = await prisma.role.create({
      data: {
        tenantId: demoTenant.id,
        name: rName,
        description: `Rol de ${rName} para ${demoTenant.name}`
      }
    });
    demoRoles[rName] = r;
  }
  console.log(`   ✔️ Roles creados para ${demoTenant.name}: ${baseRoleNames.join(', ')}`);

  // 5. Crear Usuarios del Sistema
  console.log('\n👤 Sembrando Usuarios Clave...');
  const passwordHash = await bcrypt.hash('123456', 10);

  const adminUser = await prisma.user.create({
    data: {
      id: 'user-superadmin-001',
      email: 'admin@neofood.com',
      password: passwordHash,
      name: 'Administrador Principal',
      phone: '+57 300 000 0000',
      roleId: superAdminRole.id,
      tenantId: mainTenant.id,
      isActive: true
    }
  });
  console.log(`   ✔️ SuperAdmin Creado: ${adminUser.email} (Contraseña: 123456)`);

  const demoUser = await prisma.user.create({
    data: {
      id: 'user-demo-001',
      email: 'demo@neofood.com',
      password: passwordHash,
      name: 'Gerente Demo',
      phone: '+57 300 123 4567',
      roleId: demoRoles['Administrador'].id,
      tenantId: demoTenant.id,
      isActive: true
    }
  });
  console.log(`   ✔️ Administrador Demo Creado: ${demoUser.email} (Contraseña: 123456)`);

  // 6. Métodos de Pago Base
  console.log('\n💳 Sembrando Métodos de Pago Base...');
  // Para la sede del SuperAdmin NO se crean métodos por defecto (solo los que él configure)
  // Para los restaurantes (incluido el Demo) se crea Efectivo (activo) y Crédito (inactivo)
  await prisma.paymentMethod.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Efectivo',
      isActive: true
    }
  });

  await prisma.paymentMethod.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Crédito',
      isActive: false
    }
  });
  console.log(`   ✔️ Métodos de pago creados para ${demoTenant.name}: Efectivo (activo), Crédito (inactivo)`);
  console.log(`   ✔️ Sede SuperAdmin (${mainTenant.name}): Sin métodos por defecto (exclusivo para los que configure el SuperAdmin)`);

  // 7. Configuraciones Iniciales del Sistema
  console.log('\n⚙️ Sembrando Configuraciones Iniciales...');
  const tenantsConfig = [
    { tenant: mainTenant, name: 'NeoFood Sede Principal', doc: '900.123.456-7', tel: '+57 300 000 0000', addr: 'Calle Principal #10-20' },
    { tenant: demoTenant, name: 'Restaurante Demo', doc: '800.987.654-3', tel: '+57 300 123 4567', addr: 'Carrera 15 #85-30, Zona Gourmet' }
  ];

  for (const c of tenantsConfig) {
    const initialConfigs = [
      { key: 'business_name', value: c.name },
      { key: 'business_document', value: c.doc },
      { key: 'business_phone', value: c.tel },
      { key: 'business_address', value: c.addr },
      { key: 'currency_symbol', value: '$' },
      { key: 'tax_percentage', value: '0' }
    ];

    for (const ic of initialConfigs) {
      await prisma.configuration.create({
        data: {
          tenantId: c.tenant.id,
          key: ic.key,
          value: ic.value
        }
      });
    }
    console.log(`   ✔️ Configuraciones base listas para ${c.name}`);
  }

  // 8. Mesas Iniciales Limpias (3 mesas por defecto para restaurantes, 0 para SuperAdmin)
  console.log('\n🪑 Sembrando Mesas Limpias...');
  for (let i = 1; i <= 3; i++) {
    await prisma.table.create({
      data: {
        tenantId: demoTenant.id,
        name: `Mesa ${i}`,
        capacity: 4,
        isActive: true
      }
    });
  }
  console.log(`   ✔️ 3 Mesas creadas para ${demoTenant.name} (Mesa 1, Mesa 2, Mesa 3)`);
  console.log(`   ✔️ Sede SuperAdmin (${mainTenant.name}): 0 mesas por defecto (solo las que configure el SuperAdmin)`);

  // 9. Limpieza de Uploads físicos
  await cleanUploads();

  console.log('\n========================================================');
  console.log('🎉 BASE DE DATOS Y SISTEMA WEB RESTABLECIDOS CON ÉXITO');
  console.log('========================================================');
  console.log('Credenciales del Sistema:');
  console.log('1. Super Administrador (Panel SaaS y Sede Principal):');
  console.log('   - URL: http://localhost:5173/login');
  console.log('   - Email: admin@neofood.com');
  console.log('   - Password: 123456');
  console.log('\n2. Tienda de Demostración (Operación Limpia de Restaurante):');
  console.log('   - URL: http://localhost:5173/login');
  console.log('   - Email: demo@neofood.com');
  console.log('   - Password: 123456');
  console.log('   - Tienda Virtual QR: http://localhost:5173/tienda/restaurante-demo');
  console.log('========================================================\n');
}

main()
  .catch(e => {
    console.error('❌ Error durante el restablecimiento:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
