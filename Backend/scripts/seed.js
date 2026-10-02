const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando sembrado...');

  // 1. Crear los roles básicos
  const roles = ['Administrador', 'Supervisor', 'Cajero', 'Mesero'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    });
  }
  console.log('Roles creados.');

  // 2. Buscar el ID del rol Administrador
  const adminRole = await prisma.role.findUnique({ where: { name: 'Administrador' } });

  // 3. Crear el Administrador
  const password = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@neofood.com' },
    update: {},
    create: {
      email: 'admin@neofood.com',
      password: password,
      name: 'Administrador Principal',
      roleId: adminRole.id // Usamos el ID recién encontrado
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