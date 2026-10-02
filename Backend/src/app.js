require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const path = require('path');
const errorHandler = require('./middlewares/error.middleware');

// Importación de rutas
const authRoutes = require('./modules/auth/auth.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const purchasesRoutes = require('./modules/purchases/purchases.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const usersRoutes = require('./modules/users/users.routes'); 
const tablesRoutes = require('./modules/tables/tables.routes'); 
const invoicesRoutes = require('./modules/invoices/invoices.route'); // <-- Nuevo
const saasRoutes = require('./modules/saas/saas.routes');
const storeRoutes = require('./modules/store/store.routes');
const kitchenRoutes = require('./modules/kitchen/kitchen.routes');

const app = express();

app.use((req, res, next) => {
  console.log(">>", req.method, req.originalUrl);
  next();
});

// Habilitar CORS en primer lugar para que todas las respuestas (incluso errores o 429) tengan los headers permitidos
app.use(cors({
  origin: true,
  credentials: true
}));

// Seguridad de Cabeceras
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Servir archivos estáticos subidos (fotos de productos, logos, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate Limiting (Prevenir ataques de fuerza bruta)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 10000 : 1000, // Límite amplio en desarrollo para no bloquear el uso normal
  skip: () => process.env.NODE_ENV === 'development', // Omitir límite en desarrollo
  message: { success: false, message: 'Demasiadas peticiones desde esta IP, intente más tarde.' }
});
app.use('/api/', limiter);

const tenantMiddleware = require('./middlewares/tenant.middleware');

app.use(express.json({ limit: '10mb' })); // Limitar el tamaño del body permitiendo imágenes
app.use(express.urlencoded({ limit: '10mb', extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware Multi-Tenant para resolver contexto de empresa/restaurante
app.use('/api/', tenantMiddleware);

// Registro de rutas base
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/purchases`, purchasesRoutes);
app.use(`${API_PREFIX}/sales`, salesRoutes);
app.use(`${API_PREFIX}/cash`, cashRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes); 
app.use(`${API_PREFIX}/customers`, customersRoutes); 
app.use(`${API_PREFIX}/users`, usersRoutes); 
app.use(`${API_PREFIX}/tables`, tablesRoutes);
app.use(`${API_PREFIX}/invoices`, invoicesRoutes); // <-- Nuevo
app.use(`${API_PREFIX}/saas`, saasRoutes);
app.use(`${API_PREFIX}/store`, storeRoutes);
app.use(`${API_PREFIX}/kitchen`, kitchenRoutes);

// Manejo de rutas no encontradas (404)
app.all('*', (req, res, next) => {
  const err = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

app.use((req, res, next) => {
  console.log("Terminó la ruta:", req.method, req.originalUrl);
  next();
});

// Manejador global de errores
app.use(errorHandler);

module.exports = app;