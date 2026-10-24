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
const invoicesRoutes = require('./modules/invoices/invoices.route');
const saasRoutes = require('./modules/saas/saas.routes');
const storeRoutes = require('./modules/store/store.routes');
const kitchenRoutes = require('./modules/kitchen/kitchen.routes');
const productionRoutes = require('./modules/production/routes/production.routes');
const configRoutes = require('./modules/config/config.routes');

const app = express();

// Confiar en el primer proxy inverso (Render, Railway, Cloudflare, Nginx) para que express-rate-limit identifique la IP real del cliente
app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(">>", req.method, req.originalUrl);
    next();
  });
}

// Lista blanca de orígenes permitidos por CORS (configurable mediante CORS_ORIGINS)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://neofood.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
];
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin Origin (apps móviles nativas, curl, healthchecks) o en desarrollo local / orígenes autorizados
    if (
      !origin ||
      process.env.NODE_ENV === 'development' ||
      allowedOrigins.has(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por la política CORS'));
  },
  credentials: true
}));

// Seguridad de Cabeceras
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Servir archivos estáticos subidos con cabeceras de aislamiento para evitar ejecución de scripts
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Rate Limiting (Prevenir ataques de fuerza bruta)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 10000 : 1000,
  skip: () => process.env.NODE_ENV === 'development',
  message: { success: false, message: 'Demasiadas peticiones desde esta IP, intente más tarde.' }
});
app.use('/api/', limiter);

const tenantMiddleware = require('./middlewares/tenant.middleware');

app.use(express.json({ limit: '10mb' }));
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
app.use(`${API_PREFIX}/invoices`, invoicesRoutes);
app.use(`${API_PREFIX}/saas`, saasRoutes);
app.use(`${API_PREFIX}/store`, storeRoutes);
app.use(`${API_PREFIX}/kitchen`, kitchenRoutes);
app.use(`${API_PREFIX}/production`, productionRoutes);
app.use(`${API_PREFIX}/config`, configRoutes);

// Manejo de rutas no encontradas (404)
app.all('*', (req, res, next) => {
  const err = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// Manejador global de errores
app.use(errorHandler);

module.exports = app;
