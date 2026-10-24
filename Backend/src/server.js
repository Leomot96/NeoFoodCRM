const app = require('./app');
const prisma = require('./config/prisma');
const saasService = require('./modules/saas/services/saas.service');

const PORT = process.env.PORT || 4000;

let isMaintenanceRunning = false;

const runMaintenanceJobSafely = async (jobName, fn) => {
  if (isMaintenanceRunning) return;
  isMaintenanceRunning = true;
  try {
    await fn();
  } catch (err) {
    console.error(`Error en ${jobName}:`, err.message);
  } finally {
    isMaintenanceRunning = false;
  }
};

const startServer = async () => {
  try {
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('Variables críticas faltantes en entorno: DATABASE_URL, JWT_SECRET y JWT_REFRESH_SECRET son obligatorias.');
    }

    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos mediante Prisma Multi-Tenant');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'production'}`);

      // Rutina automática de eliminación de restaurantes inactivos o suspendidos por más de 2 meses
      runMaintenanceJobSafely('AutoPurge inicial', async () => {
        const result = await saasService.purgeExpiredInactiveTenants();
        if (result.count > 0) {
          console.log(`🧹 [AutoPurge] Se eliminaron ${result.count} restaurantes con más de 2 meses inactivos/suspendidos.`);
        }
      });

      // Intervalo diario (cada 24 horas): Purga y limpieza de demos sin solapamiento
      setInterval(() => {
        runMaintenanceJobSafely('Mantenimiento diario', async () => {
          const purgeResult = await saasService.purgeExpiredInactiveTenants();
          if (purgeResult.count > 0) {
            console.log(`🧹 [AutoPurge] Se eliminaron ${purgeResult.count} restaurantes con más de 2 meses inactivos/suspendidos.`);
          }

          const resetResult = await saasService.resetDemoTenants();
          if (resetResult.count > 0) {
            console.log(`🔄 [AutoDemoReset] Se limpiaron y restauraron ${resetResult.count} restaurantes de demostración.`);
          }
        });
      }, 24 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
