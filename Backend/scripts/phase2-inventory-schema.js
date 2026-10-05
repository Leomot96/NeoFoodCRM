const prisma = require('../src/config/prisma');

async function updateSchema() {
  console.log('🔄 Ejecutando migración aditiva para Fase 2 (Inventario y Producción)...');

  // Funciones de ayuda
  async function tableExists(tableName) {
    const res = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '${tableName}';
    `);
    return res.length > 0;
  }

  async function columnExists(tableName, columnName) {
    const res = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = '${columnName}';
    `);
    return res.length > 0;
  }

  // 1. Modificar Ingredients (Nuevas columnas y Decimal(14,4))
  if (!(await columnExists('ingredients', 'averageCost'))) {
    console.log('➕ Alterando tabla ingredients...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`ingredients\` 
      ADD COLUMN \`averageCost\` DECIMAL(14, 4) NOT NULL DEFAULT 0,
      ADD COLUMN \`isManufactured\` BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN \`lastCost\` DECIMAL(14, 4) NOT NULL DEFAULT 0,
      ADD COLUMN \`purchaseFactor\` DECIMAL(14, 4) NULL,
      ADD COLUMN \`unitPurchase\` VARCHAR(191) NULL,
      MODIFY \`currentStock\` DECIMAL(14, 4) NOT NULL DEFAULT 0,
      MODIFY \`minStock\` DECIMAL(14, 4) NOT NULL DEFAULT 0,
      MODIFY \`costPerUnit\` DECIMAL(14, 4) NOT NULL DEFAULT 0;
    `);
  } else {
    console.log('✅ ingredients ya estaba alterada.');
  }

  // 2. Otras tablas que requieren DECIMAL(14,4)
  console.log('🔄 Actualizando decimales a (14,4) en otras tablas...');
  await prisma.$executeRawUnsafe(`ALTER TABLE \`inventory_movements\` MODIFY \`quantity\` DECIMAL(14, 4) NOT NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`modifier_option_ingredients\` MODIFY \`quantity\` DECIMAL(14, 4) NOT NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`product_additions\` MODIFY \`quantity\` DECIMAL(14, 4) NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`product_ingredients\` MODIFY \`quantity\` DECIMAL(14, 4) NOT NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`product_modifier_options\` MODIFY \`quantity\` DECIMAL(14, 4) NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`products\` MODIFY \`stock\` DECIMAL(14, 4) NULL DEFAULT 0;`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`purchase_details\` 
    MODIFY \`quantity\` DECIMAL(14, 4) NOT NULL,
    MODIFY \`unitCost\` DECIMAL(14, 4) NOT NULL,
    MODIFY \`totalCost\` DECIMAL(14, 4) NOT NULL;
  `);

  // 3. Añadir columnas a sale_details
  if (!(await columnExists('sale_details', 'unitCost'))) {
    console.log('➕ Agregando columnas a sale_details...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`sale_details\` 
      ADD COLUMN \`totalCost\` DECIMAL(14, 4) NULL,
      ADD COLUMN \`unitCost\` DECIMAL(14, 4) NULL;
    `);
  } else {
    console.log('✅ sale_details ya estaba alterada.');
  }

  // 4. Crear nuevas tablas
  if (!(await tableExists('ingredient_recipes'))) {
    console.log('➕ Creando tabla ingredient_recipes...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`ingredient_recipes\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`outputIngredientId\` VARCHAR(191) NOT NULL,
          \`inputIngredientId\` VARCHAR(191) NOT NULL,
          \`quantity\` DECIMAL(14, 4) NOT NULL,
          \`unit\` VARCHAR(191) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          UNIQUE INDEX \`ingredient_recipes_outputIngredientId_inputIngredientId_key\`(\`outputIngredientId\`, \`inputIngredientId\`),
          PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`ingredient_recipes\` ADD CONSTRAINT \`ingredient_recipes_outputIngredientId_fkey\` FOREIGN KEY (\`outputIngredientId\`) REFERENCES \`ingredients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`ingredient_recipes\` ADD CONSTRAINT \`ingredient_recipes_inputIngredientId_fkey\` FOREIGN KEY (\`inputIngredientId\`) REFERENCES \`ingredients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  } else {
    console.log('✅ ingredient_recipes ya existía.');
  }

  if (!(await tableExists('production_orders'))) {
    console.log('➕ Creando tabla production_orders...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`production_orders\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`tenantId\` VARCHAR(191) NULL,
          \`ingredientId\` VARCHAR(191) NOT NULL,
          \`quantityProduced\` DECIMAL(14, 4) NOT NULL,
          \`totalCost\` DECIMAL(14, 4) NOT NULL,
          \`unitCost\` DECIMAL(14, 4) NOT NULL,
          \`status\` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          INDEX \`production_orders_tenantId_idx\`(\`tenantId\`),
          PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`production_orders\` ADD CONSTRAINT \`production_orders_tenantId_fkey\` FOREIGN KEY (\`tenantId\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`production_orders\` ADD CONSTRAINT \`production_orders_ingredientId_fkey\` FOREIGN KEY (\`ingredientId\`) REFERENCES \`ingredients\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
    `);
  } else {
    console.log('✅ production_orders ya existía.');
  }

  if (!(await tableExists('production_consumptions'))) {
    console.log('➕ Creando tabla production_consumptions...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`production_consumptions\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`productionOrderId\` VARCHAR(191) NOT NULL,
          \`ingredientId\` VARCHAR(191) NOT NULL,
          \`quantity\` DECIMAL(14, 4) NOT NULL,
          \`unitCost\` DECIMAL(14, 4) NOT NULL,
          \`totalCost\` DECIMAL(14, 4) NOT NULL,
          PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`production_consumptions\` ADD CONSTRAINT \`production_consumptions_productionOrderId_fkey\` FOREIGN KEY (\`productionOrderId\`) REFERENCES \`production_orders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`production_consumptions\` ADD CONSTRAINT \`production_consumptions_ingredientId_fkey\` FOREIGN KEY (\`ingredientId\`) REFERENCES \`ingredients\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
    `);
  } else {
    console.log('✅ production_consumptions ya existía.');
  }

  console.log('✅ Migración de la Fase 2 completada exitosamente.');
}

updateSchema().catch(console.error).finally(() => prisma.$disconnect());
