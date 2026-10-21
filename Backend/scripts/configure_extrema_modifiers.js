const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'extrema-burger' }
  });

  if (!tenant) {
    console.error('❌ Restaurante Extrema Burger no encontrado');
    process.exit(1);
  }

  console.log(`🚀 Configurando Modificadores y Adiciones para: ${tenant.name} (${tenant.id})`);

  // Obtener productos agrupados con su categoría
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    include: { category: true }
  });

  console.log(`📦 Total de productos encontrados: ${products.length}`);

  let totalModifiersCreated = 0;
  let totalAdditionsCreated = 0;

  for (const product of products) {
    const catName = product.category?.name;

    // 1. Modificador "Base / Presentación" para HAMBURGUESAS
    if (catName === 'Hamburguesas') {
      // Verificar si ya tiene el modificador
      const existingMod = await prisma.productModifier.findFirst({
        where: {
          productId: product.id,
          name: 'Base'
        }
      });

      if (!existingMod) {
        await prisma.productModifier.create({
          data: {
            productId: product.id,
            name: 'Base',
            isRequired: true,
            options: {
              create: [
                { name: 'Pan', priceExtra: 0 },
                { name: 'Plátano', priceExtra: 1000 },
                { name: 'Picada', priceExtra: 2000 }
              ]
            }
          }
        });
        totalModifiersCreated++;
        console.log(`✔️ [Hamburguesa] Modificador "Base" (Pan $0, Plátano $1.000, Picada $2.000) agregado a: ${product.name}`);
      }
    }

    // 2. Adiciones
    // Categorías de platos principales de comida
    const isFoodDish = ['Hamburguesas', 'Bowls', 'Salchipapas', 'Mazorcadas', 'Perros Calientes'].includes(catName);

    if (isFoodDish) {
      // A. Adición de Carne de Res (en todos MENOS Perros Calientes)
      if (catName !== 'Perros Calientes') {
        const existingBeef = await prisma.productAddition.findFirst({
          where: {
            productId: product.id,
            name: 'Carne artesanal de res'
          }
        });

        if (!existingBeef) {
          await prisma.productAddition.create({
            data: {
              productId: product.id,
              name: 'Carne artesanal de res',
              price: 6000
            }
          });
          totalAdditionsCreated++;
        }
      }

      // B. Adición de Huevos de Codorniz (en TODOS incluyendo Perros Calientes)
      const existingEggs = await prisma.productAddition.findFirst({
        where: {
          productId: product.id,
          name: 'Huevos de codorniz (5)'
        }
      });

      if (!existingEggs) {
        await prisma.productAddition.create({
          data: {
            productId: product.id,
            name: 'Huevos de codorniz (5)',
            price: 3000
          }
        });
        totalAdditionsCreated++;
      }

      console.log(`✔️ [Adiciones] Configuradas para: ${product.name} (${catName})`);
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 CONFIGURACIÓN COMPLETADA CON ÉXITO:`);
  console.log(`   - Modificadores creados: ${totalModifiersCreated}`);
  console.log(`   - Adiciones creadas:     ${totalAdditionsCreated}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error configurando modificadores y adiciones:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
