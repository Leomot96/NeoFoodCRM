/**
 * Middleware para controlar el acceso a módulos y características según el Plan SaaS del Tenant
 */

const requirePlanFeature = (featureKey, featureName = 'esta función', planRequired = 'pro') => {
  return (req, res, next) => {
    try {
      // 1. SuperAdmin tiene acceso irrestricto a todos los módulos
      const roleName = req.user?.role?.name || (typeof req.user?.role === 'string' ? req.user?.role : '');
      const isSuper = roleName === 'SuperAdmin' || roleName === 'SUPERADMIN';
      if (isSuper) {
        return next();
      }

      // 2. Extraer el plan del tenant
      const plan = req.user?.tenant?.plan || req.tenant?.plan;
      if (!plan) {
        // Si no hay plan asignado, permitir para evitar bloqueos por migraciones intermedias
        return next();
      }

      // 3. Normalizar objeto features
      let features = plan.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch (e) {
          features = {};
        }
      }

      // 4. Si la característica está explícitamente deshabilitada (false)
      if (features && features[featureKey] === false) {
        return res.status(403).json({
          success: false,
          featureLocked: true,
          featureKey,
          planRequired,
          currentPlan: plan.name,
          message: `Tu plan actual (${plan.name}) no incluye acceso a ${featureName}. Actualiza al Plan ${planRequired === 'enterprise' ? 'Enterprise' : 'Pro'} para desbloquear este módulo.`
        });
      }

      next();
    } catch (error) {
      console.error(`Error en requirePlanFeature (${featureKey}):`, error);
      next();
    }
  };
};

module.exports = {
  requirePlanFeature
};
