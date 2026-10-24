const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo1234';

const demoTenantsData = [
  // ===========================================================================
  // 1. PIZZERÍA & TRATTORIA
  // ===========================================================================
  {
    slug: 'demo-pizzeria',
    name: 'Bella Napoli Pizzería (Demo)',
    email: 'pizzeria@demo.com',
    phone: '+57 310 111 2233',
    address: 'Calle 45 # 12-34, Zona Gourmet',
    description: 'Pizzas artesanales al horno de piedra, pastas tradicionales y lasagnas.',
    announcement: '¡Bienvenidos a Bella Napoli! Disfruta nuestras auténticas pizzas italianas.',
    schedule: 'Martes a Domingo: 12:00 PM - 11:00 PM',
    categories: [
      {
        name: 'Pizzas Tradicionales',
        description: 'Masa fina artesanal con salsa de tomates frescos y mozzarella.',
        products: [
          {
            name: 'Pizza Pepperoni',
            price: 28000,
            description: 'Salsa pomodoro de la casa, doble queso mozzarella y abundante pepperoni crocante.',
            modifiers: [
              {
                name: 'Tamaño',
                isRequired: true,
                options: [
                  { name: 'Personal (4 porciones)', priceExtra: 0 },
                  { name: 'Mediana (8 porciones)', priceExtra: 14000 },
                  { name: 'Familiar (12 porciones)', priceExtra: 26000 }
                ]
              },
              {
                name: 'Tipo de Borde',
                isRequired: false,
                options: [
                  { name: 'Borde Tradicional', priceExtra: 0 },
                  { name: 'Borde Relleno de Queso Mozzarella', priceExtra: 6000 },
                  { name: 'Borde Relleno de Arequipe', priceExtra: 5000 }
                ]
              }
            ],
            additions: [
              { name: 'Extra Queso Mozzarella', price: 4500 },
              { name: 'Tocineta Crispy', price: 4000 },
              { name: 'Champiñones Frescos', price: 3500 }
            ]
          },
          {
            name: 'Pizza Hawaiana Especial',
            price: 26000,
            description: 'Jamón premium en cubos, piña melada caramelizada y queso mozzarella fundido.',
            modifiers: [
              {
                name: 'Tamaño',
                isRequired: true,
                options: [
                  { name: 'Personal (4 porciones)', priceExtra: 0 },
                  { name: 'Mediana (8 porciones)', priceExtra: 13000 },
                  { name: 'Familiar (12 porciones)', priceExtra: 24000 }
                ]
              }
            ],
            additions: [
              { name: 'Tocineta Ahumada', price: 4000 },
              { name: 'Cereza confitada', price: 2000 }
            ]
          },
          {
            name: 'Pizza Margarita',
            price: 25000,
            description: 'Salsa pomodoro, mozzarella fresca, rodajas de tomate y hojas de albahaca fresca.',
            modifiers: [
              {
                name: 'Tamaño',
                isRequired: true,
                options: [
                  { name: 'Personal', priceExtra: 0 },
                  { name: 'Mediana', priceExtra: 12000 },
                  { name: 'Familiar', priceExtra: 23000 }
                ]
              }
            ],
            additions: [
              { name: 'Parmesano Reggiano', price: 5000 },
              { name: 'Reducción de balsámico', price: 3000 }
            ]
          }
        ]
      },
      {
        name: 'Pizzas Gourmet',
        description: 'Combinaciones de autor con ingredientes importados y selectos.',
        products: [
          {
            name: 'Pizza Prosciutto & Rúcula',
            price: 36000,
            description: 'Jamón prosciutto di Parma, rúcula fresca, lascas de parmesano y aceite de oliva virgen extra.',
            modifiers: [
              {
                name: 'Tamaño',
                isRequired: true,
                options: [
                  { name: 'Mediana (8 porciones)', priceExtra: 0 },
                  { name: 'Familiar (12 porciones)', priceExtra: 16000 }
                ]
              }
            ]
          },
          {
            name: 'Pizza Cuatro Quesos & Nuez',
            price: 34000,
            description: 'Mozzarella, gorgonzola azul, provolone ahumado, parmesano y nueces tostadas.',
            modifiers: [
              {
                name: 'Tamaño',
                isRequired: true,
                options: [
                  { name: 'Mediana (8 porciones)', priceExtra: 0 },
                  { name: 'Familiar (12 porciones)', priceExtra: 15000 }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Pastas & Lasagnas',
        description: 'Pastas artesanales preparadas al dente con salsas de larga cocción.',
        products: [
          {
            name: 'Lasagna Boloñesa de la Nona',
            price: 28000,
            description: 'Capas de pasta fresca, carne molida en ragú clásico, bechamel y gratinado de mozzarella.'
          },
          {
            name: 'Fettuccine Alfredo con Pollo',
            price: 27000,
            description: 'Pasta fettuccine en salsa cremosa de parmesano, mantequilla, ajo y pechuga a la plancha.'
          },
          {
            name: 'Spaghetti Carbonara Tradicional',
            price: 29000,
            description: 'Spaghetti con panceta dorada, yema de huevo, pimienta negra molida y queso pecorino.'
          }
        ]
      },
      {
        name: 'Entradas & Acompañamientos',
        description: 'Para iniciar la experiencia italiana.',
        products: [
          {
            name: 'Pan de Ajo con Mozzarella',
            price: 14000,
            description: 'Baguette horneado con mantequilla de ajo, finas hierbas y mozzarella gratinado.'
          },
          {
            name: 'Bruschettas Clásicas (4 und)',
            price: 16000,
            description: 'Pan rústico tostado, tomate picado en oliva, albahaca, ajo y reducción balsámica.'
          }
        ]
      },
      {
        name: 'Bebidas & Vinos',
        description: 'Bebidas refrescantes y carta básica de vinos.',
        products: [
          { name: 'Cerveza Stella Artois (330ml)', price: 11000, description: 'Cerveza premium lager europea.' },
          { name: 'Copa de Vino Tinto Chianti', price: 18000, description: 'Vino tinto italiano fresco y aromático.' },
          { name: 'Limonada de Coco', price: 10000, description: 'Limonada cremosa natural con leche de coco.' },
          { name: 'Coca-Cola 400ml', price: 5000, description: 'Bebida gaseosa personal.' }
        ]
      }
    ]
  },

  // ===========================================================================
  // 2. CAFETERÍA & BRUNCH
  // ===========================================================================
  {
    slug: 'demo-cafe',
    name: 'Café Origen & Brunch (Demo)',
    email: 'cafe@demo.com',
    phone: '+57 311 222 3344',
    address: 'Avenida 9 # 18-40, Barrio Las Palmas',
    description: 'Café de especialidad colombiano, repostería artesanal, brunch y desayunos todo el día.',
    announcement: '¡El mejor aroma de café de origen y desayunos deliciosos te esperan!',
    schedule: 'Lunes a Domingo: 7:30 AM - 8:30 PM',
    categories: [
      {
        name: 'Cafetería Caliente',
        description: 'Bebidas a base de espresso con granos 100% arábica colombiano.',
        products: [
          {
            name: 'Cappuccino de la Casa',
            price: 8500,
            description: 'Espresso doble, leche texturizada sedosa y ligera corona de espuma con cacao.',
            modifiers: [
              {
                name: 'Tipo de Leche',
                isRequired: true,
                options: [
                  { name: 'Leche Entera', priceExtra: 0 },
                  { name: 'Leche Deslactosada', priceExtra: 0 },
                  { name: 'Leche de Almendras', priceExtra: 2500 },
                  { name: 'Leche de Avena', priceExtra: 2500 }
                ]
              },
              {
                name: 'Jarabe de Sabor',
                isRequired: false,
                options: [
                  { name: 'Sin Jarabe', priceExtra: 0 },
                  { name: 'Vainilla Francesa', priceExtra: 1500 },
                  { name: 'Caramelo Toffee', priceExtra: 1500 },
                  { name: 'Avellana', priceExtra: 1500 }
                ]
              }
            ],
            additions: [
              { name: 'Shot Extra de Espresso', price: 3000 },
              { name: 'Crema Chantilly', price: 2000 }
            ]
          },
          {
            name: 'Café Latte Vainilla',
            price: 9500,
            description: 'Espresso suave con abundante leche vaporizada y esencia de vainilla natural.',
            modifiers: [
              {
                name: 'Tipo de Leche',
                isRequired: true,
                options: [
                  { name: 'Leche Entera', priceExtra: 0 },
                  { name: 'Leche Deslactosada', priceExtra: 0 },
                  { name: 'Leche de Almendras', priceExtra: 2500 }
                ]
              }
            ]
          },
          {
            name: 'Café Americano de Origen',
            price: 6000,
            description: 'Extracción limpia de café especial con notas frutales y acidez balanceada.'
          },
          {
            name: 'Mocaccino Especial',
            price: 10500,
            description: 'Espresso, chocolate oscuro 70% fundido, leche cremada y polvo de canela.'
          }
        ]
      },
      {
        name: 'Bebidas Frías & Frappés',
        description: 'Opciones refrescantes y frappés cremosos.',
        products: [
          {
            name: 'Iced Caramel Macchiato',
            price: 11000,
            description: 'Leche fría con hielo, espresso vertido por encima y abundante salsa de caramelo salado.',
            modifiers: [
              {
                name: 'Tipo de Leche',
                isRequired: true,
                options: [
                  { name: 'Leche Entera', priceExtra: 0 },
                  { name: 'Leche Deslactosada', priceExtra: 0 },
                  { name: 'Leche de Almendras', priceExtra: 2500 }
                ]
              }
            ]
          },
          {
            name: 'Frappuccino Café & Moca',
            price: 13500,
            description: 'Batido frappé con café espresso, chocolate, hielo triturado y corona de chantilly.'
          },
          {
            name: 'Cold Brew Tónica & Cítricos',
            price: 12000,
            description: 'Café infusionado en frío durante 18 horas, agua tónica y rodajas de naranja deshidratada.'
          }
        ]
      },
      {
        name: 'Desayunos & Brunch',
        description: 'Platos completos y energéticos disponibles todo el día.',
        products: [
          {
            name: 'Tostadas Francesas Supreme',
            price: 21000,
            description: 'Brioche artesanal dorado, miel de maple pura, frutos rojos y crema batida.',
            additions: [
              { name: 'Tocineta Caramelo', price: 4500 },
              { name: 'Bola de Helado de Vainilla', price: 4000 }
            ]
          },
          {
            name: 'Tostada de Aguacate & Huevo Poché',
            price: 19000,
            description: 'Pan de masa madre tostado, guacamole cremoso, dos huevos poché y semillas de sésamo.',
            additions: [
              { name: 'Salmón Ahumado', price: 9000 },
              { name: 'Queso Feta', price: 3500 }
            ]
          },
          {
            name: 'Pancakes Esponjosos con Miel',
            price: 18000,
            description: 'Torre de 3 pancakes suaves, mantequilla de campo y jarabe de maple.'
          },
          {
            name: 'Bowl de Açaí & Granola',
            price: 17000,
            description: 'Pulpa de açaí orgánico batida con plátano, granola crocante, fresas, arándanos y chía.'
          }
        ]
      },
      {
        name: 'Sandwiches & Repostería',
        description: 'Pastelería fresca horneada a diario y sándwiches salados.',
        products: [
          {
            name: 'Croissant Jamón & Queso Brie',
            price: 15000,
            description: 'Croissant 100% mantequilla recién horneado con jamón de pavo y queso brie fundido.'
          },
          {
            name: 'Panini Pollo Pesto',
            price: 18000,
            description: 'Pan ciabatta tostado, pechuga desmechada, salsa pesto de albahaca, tomate y mozzarella.'
          },
          {
            name: 'Cheesecake de Frutos Rojos',
            price: 12000,
            description: 'Porción individual de cheesecake horneado estilo New York con coulis de frutos silvestres.'
          },
          {
            name: 'Torta de Chocolate Húmeda',
            price: 11000,
            description: 'Bizcocho esponjoso bañado en ganache de chocolate 60% cacao.'
          }
        ]
      }
    ]
  },

  // ===========================================================================
  // 3. PARRILLA & CARNES
  // ===========================================================================
  {
    slug: 'demo-parrilla',
    name: 'Fuego Criollo Parrilla (Demo)',
    email: 'parrilla@demo.com',
    phone: '+57 312 333 4455',
    address: 'Km 3 Vía al Norte, Salón Campestre',
    description: 'Cortes premium a la brasa, costillas ahumadas en leña, chunchullo crocante y picadas campestres.',
    announcement: '¡El auténtico sabor del carbón y los mejores cortes de carne seleccionados!',
    schedule: 'Miércoles a Domingo: 11:30 AM - 10:00 PM',
    categories: [
      {
        name: 'Cortes a la Brasa',
        description: 'Carnes maduradas asadas al carbón con sal marina y mantequilla de hierbas.',
        products: [
          {
            name: 'Baby Beef (350g)',
            price: 42000,
            description: 'Corte magro y extremadamente tierno a la brasa, acompañado de chimichurri de la casa.',
            modifiers: [
              {
                name: 'Término de la Carne',
                isRequired: true,
                options: [
                  { name: 'Término Azul (Sellada, centro rojo frío)', priceExtra: 0 },
                  { name: 'Término Medio (Centro rojo caliente)', priceExtra: 0 },
                  { name: 'Tres Cuartos (Poco rosado)', priceExtra: 0 },
                  { name: 'Bien Asada', priceExtra: 0 }
                ]
              },
              {
                name: 'Acompañamiento Incluido',
                isRequired: true,
                options: [
                  { name: 'Papas a la Francesa', priceExtra: 0 },
                  { name: 'Papas Rústicas al Romero', priceExtra: 1000 },
                  { name: 'Yuca al Vapor con Hogao', priceExtra: 0 },
                  { name: 'Ensalada Fresca de la Casa', priceExtra: 0 }
                ]
              }
            ],
            additions: [
              { name: 'Arepa de Choclo con Queso', price: 5000 },
              { name: 'Guacamole Rústico (120g)', price: 4500 }
            ]
          },
          {
            name: 'Punta de Anca (400g)',
            price: 45000,
            description: 'Corte tradicional con su generoso borde de grasa crocante que le aporta máximo sabor.',
            modifiers: [
              {
                name: 'Término de la Carne',
                isRequired: true,
                options: [
                  { name: 'Término Medio', priceExtra: 0 },
                  { name: 'Tres Cuartos', priceExtra: 0 },
                  { name: 'Bien Asada', priceExtra: 0 }
                ]
              },
              {
                name: 'Acompañamiento',
                isRequired: true,
                options: [
                  { name: 'Papas a la Francesa', priceExtra: 0 },
                  { name: 'Papas Criollas Fritas', priceExtra: 0 },
                  { name: 'Yuca Frita', priceExtra: 0 }
                ]
              }
            ]
          },
          {
            name: 'Pechuga a la Parrilla (350g)',
            price: 32000,
            description: 'Pechuga de pollo marinada en cítricos y finas hierbas, asada a la parrilla jugosa.',
            modifiers: [
              {
                name: 'Acompañamiento',
                isRequired: true,
                options: [
                  { name: 'Papas a la Francesa', priceExtra: 0 },
                  { name: 'Ensalada César', priceExtra: 2000 }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Costillas & Ahumados',
        description: 'Cocción lenta durante 6 horas con leña de manzano.',
        products: [
          {
            name: 'Costillas BBQ en Leña (500g)',
            price: 46000,
            description: 'Costillar de cerdo tierno que se desprende del hueso, bañado en salsa BBQ ahumada artesanal.',
            modifiers: [
              {
                name: 'Salsa',
                isRequired: true,
                options: [
                  { name: 'BBQ Clásica Ahumada', priceExtra: 0 },
                  { name: 'BBQ Miel y Mostaza', priceExtra: 0 },
                  { name: 'BBQ Chipotle Picante', priceExtra: 0 }
                ]
              }
            ]
          },
          {
            name: 'Pork Belly Crocante al Carbón',
            price: 38000,
            description: 'Panceta de cerdo con piel extra crujiente, servida con cascos de limón y arepas campesinas.'
          }
        ]
      },
      {
        name: 'Picadas Familiares',
        description: 'Platos gigantes para compartir entre amigos y familia.',
        products: [
          {
            name: 'Gran Picada Criolla (4 Personas)',
            price: 95000,
            description: 'Carne de res, pechuga de pollo, lomo de cerdo, chorizo parrillero, morcilla, chunchullo, plátano maduro, papas criollas y arepitas.',
            additions: [
              { name: 'Porción Extra de Chunchullo', price: 14000 },
              { name: 'Porción Extra de Papas Criollas', price: 7000 }
            ]
          },
          {
            name: 'Picada Mixta Personal',
            price: 32000,
            description: 'Carne de res, pollo, chorizo campesino, papas criollas, arepa y salsa guacamole.'
          }
        ]
      },
      {
        name: 'Bebidas & Refrescos',
        description: 'Bebidas para acompañar tus asados.',
        products: [
          { name: 'Cerveza Club Colombia Dorada', price: 7000, description: 'Cerveza rubia tipo premium lager.' },
          { name: 'Jarra de Limonada Natural (1.5L)', price: 16000, description: 'Jarra refrescante con limones recién exprimidos.' },
          { name: 'Copa de Vino Tinto Malbec', price: 17000, description: 'Vino argentino con cuerpo, perfecto maridaje para carnes rojas.' }
        ]
      }
    ]
  },

  // ===========================================================================
  // 4. CERVECERÍA & GASTROBAR
  // ===========================================================================
  {
    slug: 'demo-gastrobar',
    name: 'La Taberna Gastrobar (Demo)',
    email: 'gastrobar@demo.com',
    phone: '+57 313 444 5566',
    address: 'Carrera 14 # 82-20, Zona Rosa',
    description: 'Cervezas artesanales de barril, coctelería de autor, alitas crocantes, tapas y ambiente nocturno.',
    announcement: '¡Disfruta de nuestras cervezas de barril y las mejores alitas y tapas de la ciudad!',
    schedule: 'Miércoles a Sábado: 4:00 PM - 2:00 AM',
    categories: [
      {
        name: 'Cervezas de Barril & Artesanales',
        description: 'Cervezas servidas directamente del tap a temperatura ideal.',
        products: [
          {
            name: 'Cerveza Artesanal IPA Tropical',
            price: 15000,
            description: 'India Pale Ale aromática con notas de maracuyá, mango y lúpulo cítrico.',
            modifiers: [
              {
                name: 'Presentación',
                isRequired: true,
                options: [
                  { name: 'Pinta (500ml)', priceExtra: 0 },
                  { name: 'Media Pinta (300ml)', priceExtra: -4000 },
                  { name: 'Jarra para Compartir (1.5L)', priceExtra: 24000 }
                ]
              }
            ]
          },
          {
            name: 'Cerveza Red Ale Ambar',
            price: 14000,
            description: 'Cerveza roja con maltas tostadas, notas a caramelo suave y cuerpo medio.',
            modifiers: [
              {
                name: 'Presentación',
                isRequired: true,
                options: [
                  { name: 'Pinta (500ml)', priceExtra: 0 },
                  { name: 'Jarra (1.5L)', priceExtra: 22000 }
                ]
              }
            ]
          },
          {
            name: 'Cerveza Rubia Blonde Ale',
            price: 13000,
            description: 'Cerveza suave, dorada, ligera y sumamente refrescante.'
          }
        ]
      },
      {
        name: 'Coctelería de Autor',
        description: 'Bebidas preparadas por nuestros bartenders profesionales.',
        products: [
          {
            name: 'Gin Tonic de Frutos Rojos',
            price: 28000,
            description: 'Ginebra Bombay Sapphire, agua tónica premium, infusión de frutos del bosque, enebro y romero quemado.'
          },
          {
            name: 'Margarita Pasión & Jalapeño',
            price: 26000,
            description: 'Tequila blanco reposado, triple sec, maracuyá natural, sal escarchada y toque sutil picante.'
          },
          {
            name: 'Mojito Cubano Clásico',
            price: 24000,
            description: 'Ron añejo, hierbabuena fresca macerada, azúcar morena, zumo de lima y soda.'
          },
          {
            name: 'Aperol Spritz Clásico',
            price: 27000,
            description: 'Aperol, prosecco espumoso italiano, toque de soda y rodaja de naranja fresca.'
          }
        ]
      },
      {
        name: 'Alitas & Tenders Crocantes',
        description: 'Alitas apanadas o tradicionales bañadas en salsa.',
        products: [
          {
            name: 'Alitas de Pollo (8 Piezas)',
            price: 22000,
            description: 'Ocho piezas de alitas doradas bañadas en tu salsa favorita, servidas con bastones de zanahoria y apio.',
            modifiers: [
              {
                name: 'Salsa Principal',
                isRequired: true,
                options: [
                  { name: 'BBQ Melosa Dulce', priceExtra: 0 },
                  { name: 'Búfalo Tradicional Picante', priceExtra: 0 },
                  { name: 'Miel Mostaza Cremosa', priceExtra: 0 },
                  { name: 'Teriyaki Ajonjolí', priceExtra: 0 },
                  { name: 'Picante Extremo Fuego', priceExtra: 1000 }
                ]
              }
            ],
            additions: [
              { name: 'Salsa Ranch Extra', price: 2500 },
              { name: 'Bastones de Apio & Zanahoria Extra', price: 2000 },
              { name: 'Papas Francesa Acompañamiento', price: 5000 }
            ]
          },
          {
            name: 'Alitas de Pollo (16 Piezas)',
            price: 39000,
            description: 'Dieciséis alitas ideales para picar en pareja o grupo, puedes elegir hasta 2 salsas diferentes.',
            modifiers: [
              {
                name: 'Salsa Principal',
                isRequired: true,
                options: [
                  { name: 'BBQ Melosa', priceExtra: 0 },
                  { name: 'Búfalo Picante', priceExtra: 0 },
                  { name: 'Miel Mostaza', priceExtra: 0 }
                ]
              }
            ]
          },
          {
            name: 'Chicken Tenders Crocantes (6 und)',
            price: 21000,
            description: 'Tiras de pura pechuga marinada, apanadas en panko crocante con dip tártara y BBQ.'
          }
        ]
      },
      {
        name: 'Tapas & Picoteo Gastro',
        description: 'Entradas para compartir al centro de la mesa.',
        products: [
          {
            name: 'Nachos Supremos Tex-Mex',
            price: 26000,
            description: 'Totopos de maíz artesanales, queso cheddar fundido, fríjoles refritos, pico de gallo, jalapeños, guacamole y crema agria.',
            additions: [
              { name: 'Carne Molida Sazonada', price: 5000 },
              { name: 'Pollo Desmechado', price: 4500 }
            ]
          },
          {
            name: 'Papas Loaded con Cheddar & Tocineta',
            price: 19000,
            description: 'Papas a la francesa crocantes cubiertas con salsa de queso cheddar casera y tocineta ahumada picadita.'
          },
          {
            name: 'Aros de Cebolla Rebozados a la Cerveza',
            price: 15000,
            description: 'Aros de cebolla rebozados con masa crujiente de cerveza rubia y salsa tártara.'
          }
        ]
      }
    ]
  },

  // ===========================================================================
  // 5. COMIDAS RÁPIDAS & BURGERS (FAST FOOD)
  // ===========================================================================
  {
    slug: 'demo-rapidas',
    name: 'Burger & Street Food (Demo)',
    email: 'rapidas@demo.com',
    phone: '+57 314 555 6677',
    address: 'Carrera 7 # 45-10, Plaza de Comidas',
    description: 'Hamburguesas smash, salchipapas monumentales, perros calientes americanos y desgranados.',
    announcement: '¡El mejor sabor urbano de comidas rápidas con ingredientes de primera!',
    schedule: 'Lunes a Domingo: 4:00 PM - 12:00 AM',
    categories: [
      {
        name: 'Hamburguesas Smash & Especiales',
        description: 'Carne 100% res aplastada en plancha caliente con costra caramelizada.',
        products: [
          {
            name: 'Smash Burger Doble Queso',
            price: 18000,
            description: 'Doble carne smash (180g), doble queso cheddar americano, cebolla picada, pepinillos y salsa burger en pan brioche.',
            modifiers: [
              {
                name: 'Tipo de Pan',
                isRequired: true,
                options: [
                  { name: 'Pan Brioche Mantequilla', priceExtra: 0 },
                  { name: 'Pan con Ajonjolí', priceExtra: 0 },
                  { name: 'Envoltura en Lechuga (Keto)', priceExtra: 0 }
                ]
              }
            ],
            additions: [
              { name: 'Tocineta Ahumada Crispy', price: 3500 },
              { name: 'Huevo Frito', price: 2000 },
              { name: 'Carne Smash Extra (90g)', price: 5000 }
            ]
          },
          {
            name: 'Hamburguesa La Criolla',
            price: 21000,
            description: 'Carne artesanal, queso costeño asado, plátano maduro melado, tocineta y salsa tártara de la casa.'
          },
          {
            name: 'Burger Pollo Crispy',
            price: 19000,
            description: 'Pechuga marinada apanada ultra crocante, ensalada coleslaw, pepinillos y mayonesa spicy.'
          }
        ]
      },
      {
        name: 'Salchipapas & Desgranados',
        description: 'Bandejas cargadas con papas y carnes al gusto.',
        products: [
          {
            name: 'Salchipapa Salvaje (2 Personas)',
            price: 32000,
            description: 'Cama de papas a la francesa, salchicha americana en rodajas, chorizo ranchero, pollo desmechado, maíz tierno, queso costeño rallado y ripio de papa.',
            additions: [
              { name: 'Queso Mozzarella Gratinado', price: 4000 },
              { name: 'Carne de Res Desmechada', price: 6000 }
            ]
          },
          {
            name: 'Desgranado Mixto de Maíz',
            price: 24000,
            description: 'Maíz tierno salteado con mantequilla, pollo, tocineta, trocitos de carne, cubierto de abundante queso gratinado y papitas fósforo.'
          }
        ]
      },
      {
        name: 'Perros Calientes',
        description: 'Perros calientes con salchicha de res o pollo y salsas caseras.',
        products: [
          {
            name: 'Perro Especial Americano',
            price: 15000,
            description: 'Pan suave, salchicha americana jumbo, tocineta, queso mozzarella fundido, ripio crocante y salsas de la casa.'
          },
          {
            name: 'Choridog Campesino',
            price: 16000,
            description: 'Pan artesanal, chorizo parrillero a la plancha, chimichurri, queso gratinado y papitas fosforito.'
          }
        ]
      },
      {
        name: 'Bebidas & Malteadas',
        description: 'Para bajar la comida rápida como se debe.',
        products: [
          { name: 'Malteada de Oreo & Vainilla', price: 12000, description: 'Helado cremoso de vainilla batido con galletas Oreo y chantilly.' },
          { name: 'Malteada de Arequipe & Torta', price: 12000, description: 'Helado con arequipe de leche y galleta.' },
          { name: 'Coca-Cola 400ml', price: 5000, description: 'Gaseosa fría.' },
          { name: 'Manzana Postobón 400ml', price: 4500, description: 'Gaseosa sabor manzana.' }
        ]
      }
    ]
  }
];

async function seedDemoTenants() {
  console.log('================================================================');
  console.log('🌱 INICIANDO CARGA DE RESTAURANTES DEMO MULTI-CATEGORÍA');
  console.log('================================================================\n');

  // Asegurar que exista el Plan Profesional
  let plan = await prisma.plan.findFirst({ where: { code: 'pro' } });
  if (!plan) {
    plan = await prisma.plan.findFirst();
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const tenantData of demoTenantsData) {
    console.log(`\n🏢 Configurando Tenant: ${tenantData.name} (${tenantData.slug})...`);

    // 1. Crear o actualizar Tenant
    let tenant = await prisma.tenant.findUnique({
      where: { slug: tenantData.slug }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: tenantData.name,
          slug: tenantData.slug,
          email: tenantData.email,
          phone: tenantData.phone,
          address: tenantData.address,
          status: 'ACTIVE',
          planId: plan ? plan.id : null,
          billingCycle: 'monthly',
          paymentStatus: 'VERIFIED',
          isStoreActive: true,
          storeDescription: tenantData.description,
          storeAnnouncement: tenantData.announcement,
          storeSchedule: tenantData.schedule
        }
      });
      console.log(`   ✅ Tenant creado: ID ${tenant.id}`);
    } else {
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          name: tenantData.name,
          email: tenantData.email,
          phone: tenantData.phone,
          address: tenantData.address,
          status: 'ACTIVE',
          planId: plan ? plan.id : tenant.planId,
          isStoreActive: true,
          storeDescription: tenantData.description,
          storeAnnouncement: tenantData.announcement,
          storeSchedule: tenantData.schedule
        }
      });
      console.log(`   🔄 Tenant existente actualizado: ID ${tenant.id}`);
    }

    // 2. Roles
    let adminRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: 'Administrador' }
    });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Administrador',
          description: 'Control total de la sede y configuración'
        }
      });
    }

    const defaultRoles = ['Cajero', 'Mesero', 'Cocina'];
    for (const rName of defaultRoles) {
      const exists = await prisma.role.findFirst({
        where: { tenantId: tenant.id, name: rName }
      });
      if (!exists) {
        await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: rName,
            description: `Rol de ${rName} para operaciones del restaurante`
          }
        });
      }
    }

    // 3. Usuario Administrador Demo
    let user = await prisma.user.findFirst({
      where: { email: tenantData.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: tenantData.email,
          password: hashedPassword,
          name: `Gerente ${tenantData.name.replace(' (Demo)', '')}`,
          phone: tenantData.phone,
          roleId: adminRole.id,
          isActive: true
        }
      });
      console.log(`   👤 Usuario creado: ${user.email} (Contraseña: ${DEMO_PASSWORD})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          tenantId: tenant.id,
          password: hashedPassword,
          roleId: adminRole.id,
          isActive: true
        }
      });
      console.log(`   👤 Usuario actualizado: ${user.email} (Contraseña: ${DEMO_PASSWORD})`);
    }

    // 4. Métodos de Pago
    const paymentMethods = [
      { name: 'Efectivo', isActive: true },
      { name: 'Nequi / Daviplata', isActive: true },
      { name: 'Tarjeta Débito / Crédito', isActive: true }
    ];

    for (const pm of paymentMethods) {
      const exists = await prisma.paymentMethod.findFirst({
        where: { tenantId: tenant.id, name: pm.name }
      });
      if (!exists) {
        await prisma.paymentMethod.create({
          data: {
            tenantId: tenant.id,
            name: pm.name,
            isActive: pm.isActive
          }
        });
      }
    }

    // 5. Mesas (8 mesas por defecto)
    for (let i = 1; i <= 8; i++) {
      const tableName = `Mesa ${i}`;
      const exists = await prisma.table.findFirst({
        where: { tenantId: tenant.id, name: tableName }
      });
      if (!exists) {
        await prisma.table.create({
          data: {
            tenantId: tenant.id,
            name: tableName,
            capacity: i <= 2 ? 2 : i <= 6 ? 4 : 8,
            isActive: true
          }
        });
      }
    }

    // 6. Cliente por defecto
    const customerExists = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, document: '222222222222' }
    });
    if (!customerExists) {
      await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name: 'Consumidor final',
          document: '222222222222'
        }
      });
    }

    // 7. Configuraciones de negocio
    const configs = [
      { key: 'business_name', value: tenantData.name },
      { key: 'business_phone', value: tenantData.phone },
      { key: 'business_address', value: tenantData.address },
      { key: 'currency_symbol', value: '$' },
      { key: 'tax_percentage', value: '0' }
    ];

    for (const cfg of configs) {
      const existing = await prisma.configuration.findFirst({
        where: { tenantId: tenant.id, key: cfg.key }
      });
      if (!existing) {
        await prisma.configuration.create({
          data: {
            tenantId: tenant.id,
            key: cfg.key,
            value: cfg.value
          }
        });
      } else {
        await prisma.configuration.update({
          where: { id: existing.id },
          data: { value: cfg.value }
        });
      }
    }

    // 8. Insumos básicos para inventario
    const basicIngredients = [
      { name: 'Queso Mozzarella Tajado', unit: 'kg', currentStock: 25.5, minStock: 5.0, costPerUnit: 22000 },
      { name: 'Carne Molida Especial', unit: 'kg', currentStock: 30.0, minStock: 8.0, costPerUnit: 28000 },
      { name: 'Pechuga de Pollo Fresca', unit: 'kg', currentStock: 20.0, minStock: 6.0, costPerUnit: 18000 },
      { name: 'Papas a la Francesa Congeladas', unit: 'kg', currentStock: 45.0, minStock: 10.0, costPerUnit: 9500 },
      { name: 'Tocineta Ahumada Premium', unit: 'kg', currentStock: 12.0, minStock: 3.0, costPerUnit: 34000 },
      { name: 'Salsa Pomodoro Casera', unit: 'lt', currentStock: 18.0, minStock: 4.0, costPerUnit: 12000 },
      { name: 'Pan Brioche Artesanal', unit: 'und', currentStock: 80.0, minStock: 20.0, costPerUnit: 1800 },
      { name: 'Leche Entera de Campo', unit: 'lt', currentStock: 40.0, minStock: 10.0, costPerUnit: 4200 },
      { name: 'Café Grano Especial (Tolima)', unit: 'kg', currentStock: 15.0, minStock: 3.0, costPerUnit: 45000 }
    ];

    for (const ing of basicIngredients) {
      const exists = await prisma.ingredient.findFirst({
        where: { tenantId: tenant.id, name: ing.name }
      });
      if (!exists) {
        await prisma.ingredient.create({
          data: {
            tenantId: tenant.id,
            name: ing.name,
            unit: ing.unit,
            currentStock: ing.currentStock,
            minStock: ing.minStock,
            costPerUnit: ing.costPerUnit,
            averageCost: ing.costPerUnit,
            lastCost: ing.costPerUnit,
            isActive: true
          }
        });
      }
    }

    // 9. Categorías y Productos
    let catCount = 0;
    let prodCount = 0;

    for (const catData of tenantData.categories) {
      let category = await prisma.category.findFirst({
        where: {
          tenantId: tenant.id,
          name: catData.name
        }
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            tenantId: tenant.id,
            name: catData.name,
            description: catData.description,
            isActive: true
          }
        });
        catCount++;
      }

      for (const prodData of catData.products) {
        let product = await prisma.product.findFirst({
          where: {
            tenantId: tenant.id,
            categoryId: category.id,
            name: prodData.name
          }
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              tenantId: tenant.id,
              categoryId: category.id,
              name: prodData.name,
              price: prodData.price,
              description: prodData.description || null,
              isAvailable: true,
              showInStore: true,
              trackStock: false,
              stock: 50
            }
          });
          prodCount++;
        } else {
          product = await prisma.product.update({
            where: { id: product.id },
            data: {
              price: prodData.price,
              description: prodData.description || product.description,
              isAvailable: true,
              showInStore: true
            }
          });
        }

        // Modificadores del producto
        if (prodData.modifiers && prodData.modifiers.length > 0) {
          for (const mod of prodData.modifiers) {
            const existingMod = await prisma.productModifier.findFirst({
              where: { productId: product.id, name: mod.name }
            });

            if (!existingMod) {
              await prisma.productModifier.create({
                data: {
                  productId: product.id,
                  name: mod.name,
                  isRequired: mod.isRequired,
                  options: {
                    create: mod.options.map(opt => ({
                      name: opt.name,
                      priceExtra: opt.priceExtra
                    }))
                  }
                }
              });
            }
          }
        }

        // Adiciones del producto
        if (prodData.additions && prodData.additions.length > 0) {
          for (const add of prodData.additions) {
            const existingAdd = await prisma.productAddition.findFirst({
              where: { productId: product.id, name: add.name }
            });

            if (!existingAdd) {
              await prisma.productAddition.create({
                data: {
                  productId: product.id,
                  name: add.name,
                  price: add.price
                }
              });
            }
          }
        }
      }
    }

    console.log(`   🍽️ Categorías procesadas: ${tenantData.categories.length} | Productos procesados: ${prodCount}`);
  }

  console.log('\n================================================================');
  console.log('🎉 TODOS LOS RESTAURANTES DEMO HAN SIDO SEMBRADOS EXITOSAMENTE');
  console.log('================================================================\n');
  console.log('📋 CREDENCIALES DE ACCESO DEMO (Contraseña para todos: demo1234):');
  console.log('----------------------------------------------------------------');
  demoTenantsData.forEach(t => {
    console.log(`🍕/☕/🥩 ${t.name}`);
    console.log(`   - Email: ${t.email}`);
    console.log(`   - Contraseña: ${DEMO_PASSWORD}`);
    console.log(`   - Slug tienda online: /tienda/${t.slug}`);
    console.log('----------------------------------------------------------------');
  });
}

seedDemoTenants()
  .catch((e) => {
    console.error('❌ Error sembrando demos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
