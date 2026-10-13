const rateLimit = require('express-rate-limit');

// 1. Limitador para envío de códigos OTP (evita bombardeo de correos y agotamiento de cuota)
const sendCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 25 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Has solicitado demasiados códigos de verificación. Por favor espera 15 minutos antes de volver a intentar.'
  }
});

// 2. Limitador para validación de código OTP (protección anti-fuerza bruta de 6 dígitos)
const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 40 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de verificación de código desde esta dirección IP. Por favor espera 15 minutos.'
  }
});

// 3. Limitador para registro de nuevos restaurantes
const registerTenantLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'development' ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de registros alcanzado para esta dirección IP en la última hora. Por favor intenta más tarde.'
  }
});

// 4. Limitador para login de usuarios
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 60 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión desde esta dirección IP. Por favor espera 15 minutos.'
  }
});

// 5. Middleware Honeypot contra Bots (campos trampa invisibles para humanos)
const honeypotMiddleware = (trapFields = ['website', 'hp_url', 'business_website']) => {
  return (req, res, next) => {
    if (req.body) {
      for (const field of trapFields) {
        if (req.body[field] && String(req.body[field]).trim().length > 0) {
          console.warn(`[Anti-Bot Honeypot] Bot detectado completando campo trampa '${field}' desde IP: ${req.ip}`);
          // Respuesta simulada de éxito (shadow-drop): el bot cree que tuvo éxito y no reintenta,
          // mientras que el servidor no envía correos ni crea registros en base de datos.
          return res.status(200).json({
            success: true,
            message: 'Solicitud procesada correctamente.'
          });
        }
      }
    }
    next();
  };
};

module.exports = {
  sendCodeLimiter,
  verifyCodeLimiter,
  registerTenantLimiter,
  loginLimiter,
  honeypotMiddleware
};
