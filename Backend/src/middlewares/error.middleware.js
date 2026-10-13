const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Manejo de errores específicos de Prisma
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'No es posible eliminar o modificar este registro porque está vinculado a otros datos del sistema (compras, kárdex, recetas, ventas, etc.).';
  } else if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target ? ` (${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target})` : '';
    message = `Ya existe un registro con esos datos únicos${target}.`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'El registro solicitado no fue encontrado o ya fue eliminado.';
  }

  console.error(`[Error] ${statusCode} - ${message}`);
  
  if (err.stack && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;