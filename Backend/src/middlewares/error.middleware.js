const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  const isDev = process.env.NODE_ENV === 'development';

  // Manejo de errores específicos de Prisma
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'No es posible eliminar o modificar este registro porque está vinculado a otros datos del sistema (compras, kárdex, recetas, ventas, etc.).';
  } else if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Ya existe un registro con esos datos únicos en el sistema.';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'El registro solicitado no fue encontrado o ya fue eliminado.';
  } else if (err.name === 'PrismaClientValidationError' || err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = isDev ? err.message : 'Los datos enviados en la solicitud no tienen un formato válido.';
  } else if (statusCode === 500 && !isDev) {
    message = 'Error interno del servidor. Por favor intenta más tarde.';
  }

  console.error(`[Error] ${statusCode} - ${err.message || message}`);

  if (err.stack && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: isDev ? err.stack : undefined,
  });
};

module.exports = errorHandler;
