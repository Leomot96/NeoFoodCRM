const app = require('./app');
const prisma = require('./config/prisma');
const saasService = require('./modules/saas/services/saas.service');

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos mediante Prisma Multi-Tenant');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);

      // Rutina automática de eliminación de restaurantes inactivos o suspendidos por más de 2 meses
      saasService.purgeExpiredInactiveTenants()
        .then(result => {
          if (result.count > 0) {
            console.log(`🧹 [AutoPurge] Se eliminaron ${result.count} restaurantes con más de 2 meses inactivos/suspendidos.`);
          }
        })
        .catch(err => console.error('Error en AutoPurge al iniciar:', err));

      // Intervalo diario (cada 24 horas)
      setInterval(() => {
        saasService.purgeExpiredInactiveTenants()
          .then(result => {
            if (result.count > 0) {
              console.log(`🧹 [AutoPurge] Se eliminaron ${result.count} restaurantes con más de 2 meses inactivos/suspendidos.`);
            }
          })
          .catch(err => console.error('Error en AutoPurge diario:', err));
      }, 24 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();