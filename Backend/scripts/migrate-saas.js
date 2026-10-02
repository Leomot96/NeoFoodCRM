const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = 'default-tenant-001';
const DEFAULT_PLAN_ID = 'plan-enterprise-001';

async function migrateSaas() {
  console.log('🚀 Iniciando migración de datos a arquitectura SaaS Multi-Tenant...');

  try {
    // 1. Crear tabla `plans` si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`plans\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL UNIQUE,
        \`code\` VARCHAR(191) NOT NULL UNIQUE,
        \`description\` VARCHAR(191) NULL,
        \`priceMonthly\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        \`priceAnnual\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        \`maxTables\` INT NOT NULL DEFAULT -1,
        \`maxUsers\` INT NOT NULL DEFAULT -1,
        \`maxBranches\` INT NOT NULL DEFAULT 1,
        \`features\` JSON NULL,
        \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla `plans` verificada.');

    // 2. Crear tabla `tenants` si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`tenants\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`slug\` VARCHAR(191) NOT NULL UNIQUE,
        \`document\` VARCHAR(191) NULL,
        \`email\` VARCHAR(191) NULL,
        \`phone\` VARCHAR(191) NULL,
        \`address\` VARCHAR(191) NULL,
        \`logoUrl\` VARCHAR(191) NULL,
        \`status\` ENUM('ACTIVE', 'INACTIVE', 'TRIAL', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
        \`planId\` VARCHAR(191) NULL,
        \`subscriptionEndsAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla `tenants` verificada.');

    // 3. Insertar Plan Enterprise por defecto
    await prisma.$executeRawUnsafe(`
      INSERT INTO \`plans\` (\`id\`, \`name\`, \`code\`, \`description\`, \`priceMonthly\`, \`maxTables\`, \`maxUsers\`, \`isActive\`)
      VALUES ('${DEFAULT_PLAN_ID}', 'Plan Enterprise', 'enterprise', 'Plan ilimitado para restaurante principal', 0.00, -1, -1, TRUE)
      ON DUPLICATE KEY UPDATE \`name\` = \`name\`;
    `);

    // 4. Insertar Tenant inicial (Restaurante Principal existente)
    await prisma.$executeRawUnsafe(`
      INSERT INTO \`tenants\` (\`id\`, \`name\`, \`slug\`, \`email\`, \`status\`, \`planId\`)
      VALUES ('${DEFAULT_TENANT_ID}', 'NeoFood Sede Principal', 'sede-principal', 'admin@neofood.com', 'ACTIVE', '${DEFAULT_PLAN_ID}')
      ON DUPLICATE KEY UPDATE \`name\` = \`name\`;
    `);
    console.log('✅ Tenant inicial `NeoFood Sede Principal` creado/verificado.');

    // 5. Lista de tablas a las que se les debe agregar `tenantId`
    const tables = [
      'roles',
      'users',
      'customers',
      'categories',
      'products',
      'ingredients',
      'suppliers',
      'purchases',
      'inventory_movements',
      'tables',
      'orders',
      'payment_methods',
      'sales',
      'cash_sessions',
      'expenses',
      'configurations',
      'audit_logs'
    ];

    for (const table of tables) {
      // Verificar si la columna tenantId ya existe
      const columns = await prisma.$queryRawUnsafe(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = '${table}' 
          AND COLUMN_NAME = 'tenantId';
      `);

      if (!columns || columns.length === 0) {
        console.log(`➕ Añadiendo columna \`tenantId\` a tabla \`${table}\`...`);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`${table}\` 
          ADD COLUMN \`tenantId\` VARCHAR(191) NULL DEFAULT '${DEFAULT_TENANT_ID}';
        `);
      }

      // Asignar el tenant principal a cualquier fila huérfana
      await prisma.$executeRawUnsafe(`
        UPDATE \`${table}\` 
        SET \`tenantId\` = '${DEFAULT_TENANT_ID}' 
        WHERE \`tenantId\` IS NULL OR \`tenantId\` = '';
      `);
      console.log(`🔒 Registros de \`${table}\` asignados al tenant inicial.`);
    }

    console.log('\n🎉 ¡MIGRACIÓN DE DATOS PREVIA COMPLETADA CON ÉXITO! Todos los registros preservados.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSaas();
