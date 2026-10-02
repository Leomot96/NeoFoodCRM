const prisma = require('../src/config/prisma');

async function updateSchema() {
  console.log('🔄 Actualizando esquema para soporte de facturación, periodos y celular de usuario...');

  // 1. Verificar y agregar columnas a tenants
  const tenantCols = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tenants';
  `);
  const tenantColNames = tenantCols.map(c => c.COLUMN_NAME.toLowerCase());

  if (!tenantColNames.includes('billingcycle')) {
    console.log('➕ Agregando columna billingCycle a tenants...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`tenants\` 
      ADD COLUMN \`billingCycle\` VARCHAR(50) NOT NULL DEFAULT 'monthly';
    `);
  }

  if (!tenantColNames.includes('paymentstatus')) {
    console.log('➕ Agregando columna paymentStatus a tenants...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`tenants\` 
      ADD COLUMN \`paymentStatus\` VARCHAR(50) NOT NULL DEFAULT 'VERIFIED';
    `);
  }

  // 2. Verificar y agregar columnas a users
  const userCols = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users';
  `);
  const userColNames = userCols.map(c => c.COLUMN_NAME.toLowerCase());

  if (!userColNames.includes('phone')) {
    console.log('➕ Agregando columna phone a users...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`phone\` VARCHAR(191) NULL;
    `);
  }

  console.log('✅ Esquema actualizado exitosamente.');
}

updateSchema().catch(console.error).finally(() => prisma.$disconnect());
