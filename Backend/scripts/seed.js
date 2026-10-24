const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = 'default-tenant-001';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Ejecución de seed bloqueada en entorno de producción.');
  }

  console.log('Iniciando sembrado...');

  // 1. Crear los roles básicos asociados al tenant principal
  const roles = ['Administrador', 'Supervisor', 'Cajero', 'Mesero'];
  for (const roleName of roles) {
    const existing = await prisma.role.findFirst({
      where: { name: roleName, tenantId: DEFAULT_TENANT_ID }
    });
    if (!existing) {
      await prisma.role.create({
        data: { name: roleName, tenantId: DEFAULT_TENANT_ID }
      });
    }
  }
  console.log('Roles creados.');

  // 2. Buscar el ID del rol Administrador del tenant principal
  const adminRole = await prisma.role.findFirst({
    where: { name: 'Administrador', tenantId: DEFAULT_TENANT_ID }
  });

  // 3. Crear el Administrador con contraseña desde variable de entorno o generada criptográficamente
  const rawPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  const password = await bcrypt.hash(rawPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@neofood.com' },
    update: { tenantId: DEFAULT_TENANT_ID },
    create: {
      email: 'admin@neofood.com',
      password: password,
      name: 'Administrador Principal',
      roleId: adminRole.id,
      tenantId: DEFAULT_TENANT_ID
    }
  });
  
  console.log('Admin creado:', admin.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
