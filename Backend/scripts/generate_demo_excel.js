const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outputPath = path.resolve(__dirname, '../../NeoFood_Cuentas_Demo.xlsx');

// 1. Hoja 1: Resumen de Cuentas Demo
const accountsData = [
  {
    'Restaurante': 'Bella Napoli Pizzería (Demo)',
    'Concepto / Categoría': 'Pizzería & Trattoria Italiana',
    'Email de Acceso': 'pizzeria@demo.com',
    'Contraseña': 'demo1234',
    'Rol': 'Administrador',
    'Mesas Activas': 8,
    'Planes Activos': 'Plan Profesional',
    'URL Tienda Virtual': 'https://neo-food-crm-ezb8.vercel.app/tienda/demo-pizzeria',
    'Especialidades': 'Pizzas tradicionales, gourmet, bordes de queso, pastas y lasagnas'
  },
  {
    'Restaurante': 'Café Origen & Brunch (Demo)',
    'Concepto / Categoría': 'Cafetería de Especialidad & Brunch',
    'Email de Acceso': 'cafe@demo.com',
    'Contraseña': 'demo1234',
    'Rol': 'Administrador',
    'Mesas Activas': 8,
    'Planes Activos': 'Plan Profesional',
    'URL Tienda Virtual': 'https://neo-food-crm-ezb8.vercel.app/tienda/demo-cafe',
    'Especialidades': 'Espressos, lattes con tipo de leche, frappés, tostadas francesas y repostería'
  },
  {
    'Restaurante': 'Fuego Criollo Parrilla (Demo)',
    'Concepto / Categoría': 'Parrilla, Carnes & Asados',
    'Email de Acceso': 'parrilla@demo.com',
    'Contraseña': 'demo1234',
    'Rol': 'Administrador',
    'Mesas Activas': 8,
    'Planes Activos': 'Plan Profesional',
    'URL Tienda Virtual': 'https://neo-food-crm-ezb8.vercel.app/tienda/demo-parrilla',
    'Especialidades': 'Baby Beef, Punta de anca, términos de carne, costillas BBQ en leña y picadas'
  },
  {
    'Restaurante': 'La Taberna Gastrobar (Demo)',
    'Concepto / Categoría': 'Cervecería Artesanal & Gastrobar',
    'Email de Acceso': 'gastrobar@demo.com',
    'Contraseña': 'demo1234',
    'Rol': 'Administrador',
    'Mesas Activas': 8,
    'Planes Activos': 'Plan Profesional',
    'URL Tienda Virtual': 'https://neo-food-crm-ezb8.vercel.app/tienda/demo-gastrobar',
    'Especialidades': 'Cervezas de barril (pintas/jarras), alitas con variedad de salsas, coctelería y nachos'
  },
  {
    'Restaurante': 'Burger & Street Food (Demo)',
    'Concepto / Categoría': 'Comidas Rápidas & Street Food',
    'Email de Acceso': 'rapidas@demo.com',
    'Contraseña': 'demo1234',
    'Rol': 'Administrador',
    'Mesas Activas': 8,
    'Planes Activos': 'Plan Profesional',
    'URL Tienda Virtual': 'https://neo-food-crm-ezb8.vercel.app/tienda/demo-rapidas',
    'Especialidades': 'Smash burgers, salchipapas familiares, perros calientes americanos y malteadas'
  },
  {
    'Restaurante': 'Extrema Burger (Principal)',
    'Concepto / Categoría': 'Comida Rápida Extrema Artesanal',
    'Email de Acceso': 'extrema4burger@gmail.com',
    'Contraseña': 'Consultar con Administrador',
    'Rol': 'SuperAdmin / Dueño',
    'Mesas Activas': 12,
    'Planes Activos': 'Plan Enterprise',
    'URL Tienda Virtual': 'https://neo-food-crm-ezb8.vercel.app/tienda/extrema-burger',
    'Especialidades': 'Hamburguesas gigantes, bowls mixtos, choripapas y mazorcadas'
  }
];

// 2. Hoja 2: Muestra de Catálogo y Precios
const menuData = [
  // Pizzería
  { 'Restaurante': 'Bella Napoli Pizzería', 'Categoría': 'Pizzas Tradicionales', 'Producto': 'Pizza Pepperoni', 'Precio COP': 28000, 'Modificadores': 'Tamaño (Personal, Mediana, Familiar), Borde de Queso', 'Adiciones': 'Extra Mozzarella, Tocineta' },
  { 'Restaurante': 'Bella Napoli Pizzería', 'Categoría': 'Pizzas Tradicionales', 'Producto': 'Pizza Hawaiana Especial', 'Precio COP': 26000, 'Modificadores': 'Tamaño (Personal, Mediana, Familiar)', 'Adiciones': 'Tocineta Ahumada' },
  { 'Restaurante': 'Bella Napoli Pizzería', 'Categoría': 'Pizzas Gourmet', 'Producto': 'Pizza Prosciutto & Rúcula', 'Precio COP': 36000, 'Modificadores': 'Tamaño (Mediana, Familiar)', 'Adiciones': 'Parmesano Reggiano' },
  { 'Restaurante': 'Bella Napoli Pizzería', 'Categoría': 'Pastas & Lasagnas', 'Producto': 'Lasagna Boloñesa de la Nona', 'Precio COP': 28000, 'Modificadores': 'Ninguno', 'Adiciones': 'Pan de Ajo Extra' },
  { 'Restaurante': 'Bella Napoli Pizzería', 'Categoría': 'Pastas & Lasagnas', 'Producto': 'Fettuccine Alfredo con Pollo', 'Precio COP': 27000, 'Modificadores': 'Ninguno', 'Adiciones': 'Champiñones' },
  
  // Café
  { 'Restaurante': 'Café Origen & Brunch', 'Categoría': 'Cafetería Caliente', 'Producto': 'Cappuccino de la Casa', 'Precio COP': 8500, 'Modificadores': 'Tipo de Leche (Entera, Deslactosada, Almendras, Avena)', 'Adiciones': 'Shot Extra, Chantilly' },
  { 'Restaurante': 'Café Origen & Brunch', 'Categoría': 'Bebidas Frías', 'Producto': 'Iced Caramel Macchiato', 'Precio COP': 11000, 'Modificadores': 'Tipo de Leche', 'Adiciones': 'Salsa Caramelo Extra' },
  { 'Restaurante': 'Café Origen & Brunch', 'Categoría': 'Desayunos & Brunch', 'Producto': 'Tostadas Francesas Supreme', 'Precio COP': 21000, 'Modificadores': 'Ninguno', 'Adiciones': 'Tocineta Caramelo, Helado' },
  { 'Restaurante': 'Café Origen & Brunch', 'Categoría': 'Desayunos & Brunch', 'Producto': 'Tostada de Aguacate & Huevo Poché', 'Precio COP': 19000, 'Modificadores': 'Ninguno', 'Adiciones': 'Salmón Ahumado' },
  { 'Restaurante': 'Café Origen & Brunch', 'Categoría': 'Sandwiches & Repostería', 'Producto': 'Croissant Jamón & Queso Brie', 'Precio COP': 15000, 'Modificadores': 'Ninguno', 'Adiciones': 'Ninguna' },

  // Parrilla
  { 'Restaurante': 'Fuego Criollo Parrilla', 'Categoría': 'Cortes a la Brasa', 'Producto': 'Baby Beef (350g)', 'Precio COP': 42000, 'Modificadores': 'Término de la carne, Acompañamiento incluido', 'Adiciones': 'Arepa de Choclo, Guacamole' },
  { 'Restaurante': 'Fuego Criollo Parrilla', 'Categoría': 'Cortes a la Brasa', 'Producto': 'Punta de Anca (400g)', 'Precio COP': 45000, 'Modificadores': 'Término de la carne, Acompañamiento', 'Adiciones': 'Chorizo parrillero' },
  { 'Restaurante': 'Fuego Criollo Parrilla', 'Categoría': 'Costillas & Ahumados', 'Producto': 'Costillas BBQ en Leña (500g)', 'Precio COP': 46000, 'Modificadores': 'Tipo de Salsa (BBQ Clásica, Miel Mostaza, Chipotle)', 'Adiciones': 'Papas Francesa' },
  { 'Restaurante': 'Fuego Criollo Parrilla', 'Categoría': 'Picadas Familiares', 'Producto': 'Gran Picada Criolla (4 Personas)', 'Precio COP': 95000, 'Modificadores': 'Ninguno', 'Adiciones': 'Porción Chunchullo, Papas Criollas' },

  // Gastrobar
  { 'Restaurante': 'La Taberna Gastrobar', 'Categoría': 'Cervezas de Barril', 'Producto': 'Cerveza Artesanal IPA Tropical', 'Precio COP': 15000, 'Modificadores': 'Presentación (Pinta 500ml, Jarra 1.5L)', 'Adiciones': 'Ninguna' },
  { 'Restaurante': 'La Taberna Gastrobar', 'Categoría': 'Coctelería de Autor', 'Producto': 'Gin Tonic de Frutos Rojos', 'Precio COP': 28000, 'Modificadores': 'Ninguno', 'Adiciones': 'Ginebra Premium' },
  { 'Restaurante': 'La Taberna Gastrobar', 'Categoría': 'Alitas & Tenders', 'Producto': 'Alitas de Pollo (8 Piezas)', 'Precio COP': 22000, 'Modificadores': 'Salsa (BBQ, Búfalo, Miel Mostaza, Teriyaki, Picante)', 'Adiciones': 'Salsa Ranch, Bastones de Apio' },
  { 'Restaurante': 'La Taberna Gastrobar', 'Categoría': 'Tapas & Picoteo', 'Producto': 'Nachos Supremos Tex-Mex', 'Precio COP': 26000, 'Modificadores': 'Ninguno', 'Adiciones': 'Carne Molida, Pollo Desmechado' },

  // Comidas Rápidas
  { 'Restaurante': 'Burger & Street Food', 'Categoría': 'Hamburguesas Smash', 'Producto': 'Smash Burger Doble Queso', 'Precio COP': 18000, 'Modificadores': 'Tipo de Pan (Brioche, Ajonjolí, Lechuga Keto)', 'Adiciones': 'Tocineta Crispy, Huevo Frito' },
  { 'Restaurante': 'Burger & Street Food', 'Categoría': 'Hamburguesas Smash', 'Producto': 'Hamburguesa La Criolla', 'Precio COP': 21000, 'Modificadores': 'Tipo de Pan', 'Adiciones': 'Plátano maduro extra' },
  { 'Restaurante': 'Burger & Street Food', 'Categoría': 'Salchipapas & Desgranados', 'Producto': 'Salchipapa Salvaje (2 Personas)', 'Precio COP': 32000, 'Modificadores': 'Ninguno', 'Adiciones': 'Queso Mozzarella Gratinado' },
  { 'Restaurante': 'Burger & Street Food', 'Categoría': 'Perros Calientes', 'Producto': 'Perro Especial Americano', 'Precio COP': 15000, 'Modificadores': 'Ninguno', 'Adiciones': 'Tocineta Extra' },
  { 'Restaurante': 'Burger & Street Food', 'Categoría': 'Bebidas & Malteadas', 'Producto': 'Malteada de Oreo & Vainilla', 'Precio COP': 12000, 'Modificadores': 'Ninguno', 'Adiciones': 'Chantilly' }
];

const wb = XLSX.utils.book_new();

const ws1 = XLSX.utils.json_to_sheet(accountsData);
const ws2 = XLSX.utils.json_to_sheet(menuData);

// Ajustar anchos de columnas en Hoja 1
ws1['!cols'] = [
  { wch: 30 }, // Restaurante
  { wch: 32 }, // Concepto
  { wch: 25 }, // Email
  { wch: 15 }, // Password
  { wch: 15 }, // Rol
  { wch: 14 }, // Mesas
  { wch: 18 }, // Plan
  { wch: 55 }, // URL
  { wch: 50 }  // Especialidades
];

// Ajustar anchos de columnas en Hoja 2
ws2['!cols'] = [
  { wch: 28 }, // Restaurante
  { wch: 25 }, // Categoría
  { wch: 35 }, // Producto
  { wch: 12 }, // Precio
  { wch: 45 }, // Modificadores
  { wch: 30 }  // Adiciones
];

XLSX.utils.book_append_sheet(wb, ws1, 'Cuentas_Demo');
XLSX.utils.book_append_sheet(wb, ws2, 'Catalogo_Muestra');

XLSX.writeFile(wb, outputPath);
console.log(`✅ Archivo Excel generado con éxito en: ${outputPath}`);
