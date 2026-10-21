const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const menuData = [
  {
    category: 'Hamburguesas',
    description: 'Hamburguesas artesanales de la casa',
    products: [
      {
        name: 'Hamburguesa Clásica',
        price: 12000,
        description: 'Carne artesanal, queso, tomate, cebolla grille, lechuga, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Hamburguesa Mixta',
        price: 16000,
        description: 'Carne artesanal, pollo desmechado, queso, tomate, cebolla grille, lechuga, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Hamburguesa Mixta Especial',
        price: 16000,
        description: 'Carne artesanal, cerdo desmechado, queso, tomate, cebolla grille, lechuga, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Hamburguesa Ranchera',
        price: 15000,
        description: 'Carne artesanal, huevo frito, chorizo ranchero, queso, tomate, cebolla grille, lechuga, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Hamburguesa Extrema',
        price: 20000,
        description: 'Carne artesanal, pollo desmechado, cerdo desmechado, maicitos, queso, tomate, cebolla grille, lechuga, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Súper Extrema (2 personas)',
        price: 50000,
        description: 'Doble carne artesanal, pollo desmechado, cerdo desmechado, chorizo ranchero, salchicha americana, maicitos, plátano, papas a la francesa, queso, tomate, cebolla grille, lechuga, huevos de codorniz y salsa de la casa.'
      }
    ]
  },
  {
    category: 'Bowls',
    description: 'Bowls cargados con las mejores combinaciones',
    products: [
      {
        name: 'Bowl Clásico',
        price: 15000,
        description: 'Carne artesanal, papas a la francesa, queso, ripio, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Bowl Mixto',
        price: 19000,
        description: 'Carne artesanal, papas a la francesa, pollo desmechado, queso, ripio, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Bowl Mixto Especial',
        price: 19000,
        description: 'Carne artesanal, papas a la francesa, cerdo desmechado, queso, ripio, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Bowl Extremo',
        price: 23000,
        description: 'Carne artesanal, papas a la francesa, pollo desmechado, cerdo desmechado, maicitos, queso, ripio, lechuga, huevo de codorniz y salsa de la casa.'
      }
    ]
  },
  {
    category: 'Salchipapas',
    description: 'Papas a la francesa crocantes con ingredientes especiales',
    products: [
      {
        name: 'Salchipapa Clásica',
        price: 12000,
        description: 'Papas a la francesa, salchicha americana, queso, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Choripapa',
        price: 14000,
        description: 'Papas a la francesa, chorizo ranchero, queso, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Salchipapa Especial',
        price: 17000,
        description: 'Papas a la francesa, salchicha americana, chorizo ranchero, maicitos, ripio, queso, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Salchipapa Extrema',
        price: 23000,
        description: 'Papas a la francesa, salchicha americana, chorizo ranchero, pollo desmechado, cerdo desmechado, maicitos, queso, ripio, huevo de codorniz, salsa de la casa.'
      }
    ]
  },
  {
    category: 'Perros Calientes',
    description: 'Perros calientes con salchicha americana y salsas de la casa',
    products: [
      {
        name: 'Perro Clásico',
        price: 11000,
        description: 'Pan artesanal, salchicha americana, queso, ripio, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Perro Especial',
        price: 14000,
        description: 'Pan artesanal, salchicha americana, maicitos, cebolla grille, queso, ripio, huevo de codorniz y salsa de la casa.'
      },
      {
        name: 'Perro Extremo',
        price: 19000,
        description: 'Pan artesanal, salchicha americana, pollo desmechado, cerdo desmechado, maicitos, cebolla grille, queso, ripio, huevo de codorniz y salsa de la casa.'
      }
    ]
  },
  {
    category: 'Mazorcadas',
    description: 'Mazorcadas con maicitos tiernos, ripio y salsa de maíz',
    products: [
      {
        name: 'Mazorcada de Pollo',
        price: 25000,
        description: 'Maicitos, papas a la francesa, salchicha americana, pollo desmechado, queso, ripio, huevo de codorniz y salsa de maíz.'
      },
      {
        name: 'Mazorcada de Cerdo',
        price: 25000,
        description: 'Maicitos, papas a la francesa, salchicha americana, cerdo desmechado, queso, ripio, huevo de codorniz y salsa de maíz.'
      },
      {
        name: 'Mazorcada Mixta',
        price: 28000,
        description: 'Maicitos, papas a la francesa, salchicha americana, pollo desmechado, cerdo desmechado, queso, ripio, huevo de codorniz y salsa de maíz.'
      }
    ]
  },
  {
    category: 'Porciones',
    description: 'Acompañamientos y porciones adicionales',
    products: [
      {
        name: 'Papas a la francesa',
        price: 6000,
        description: 'Porción de papas a la francesa.'
      },
      {
        name: 'Carne artesanal',
        price: 6000,
        description: 'Porción de carne artesanal.'
      },
      {
        name: 'Huevos de codorniz (5)',
        price: 3000,
        description: 'Porción de 5 huevos de codorniz.'
      },
      {
        name: 'Chorizo + arepa',
        price: 5000,
        description: 'Porción de chorizo con arepa.'
      }
    ]
  },
  {
    category: 'Bebidas',
    description: 'Bebidas frías y gaseosas',
    products: [
      {
        name: 'Gaseosa personal',
        price: 5000,
        description: 'Gaseosa presentación personal.'
      },
      {
        name: 'Gaseosa 1.5 litros',
        price: 9000,
        description: 'Gaseosa presentación 1.5 litros.'
      },
      {
        name: 'Gaseosa 3 litros',
        price: 13000,
        description: 'Gaseosa presentación 3 litros.'
      },
      {
        name: 'Cerveza',
        price: 3500,
        description: 'Cerveza nacional.'
      }
    ]
  }
];

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'extrema-burger' }
  });

  if (!tenant) {
    console.error('❌ Restaurante Extrema Burger no encontrado');
    process.exit(1);
  }

  console.log(`🚀 Agregando menú para: ${tenant.name} (${tenant.id})`);

  let totalCategories = 0;
  let totalProducts = 0;

  for (const catData of menuData) {
    // 1. Crear o buscar categoría
    let category = await prisma.category.findFirst({
      where: {
        tenantId: tenant.id,
        name: catData.category
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: catData.category,
          description: catData.description,
          isActive: true
        }
      });
      totalCategories++;
      console.log(`📁 Categoría creada: ${category.name}`);
    } else {
      console.log(`📁 Categoría existente: ${category.name}`);
    }

    // 2. Crear productos
    for (const prod of catData.products) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          tenantId: tenant.id,
          name: prod.name,
          categoryId: category.id
        }
      });

      if (!existingProduct) {
        await prisma.product.create({
          data: {
            tenantId: tenant.id,
            categoryId: category.id,
            name: prod.name,
            price: prod.price,
            description: prod.description,
            isAvailable: true,
            showInStore: true,
            trackStock: false,
            isCombo: false,
            stock: 0
          }
        });
        totalProducts++;
        console.log(`   ✔️ Producto creado: ${prod.name} - $${prod.price.toLocaleString('es-CO')}`);
      } else {
        console.log(`   ⚠️ Producto ya existe: ${prod.name}`);
      }
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 MENÚ CARGADO CON ÉXITO:`);
  console.log(`   - Categorías creadas: ${totalCategories}`);
  console.log(`   - Productos creados:  ${totalProducts}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error cargando menú:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
