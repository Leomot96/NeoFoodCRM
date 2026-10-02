const saasService = require('../services/saas.service');

class SaasController {
  async getStats(req, res, next) {
    try {
      const stats = await saasService.getPlatformStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenants(req, res, next) {
    try {
      const result = await saasService.getAllTenants(req.query);
      res.status(200).json({
        success: true,
        data: result.tenants,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenant(req, res, next) {
    try {
      const tenant = await saasService.getTenantById(req.params.id);
      res.status(200).json({
        success: true,
        data: tenant
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const updated = await saasService.updateTenantStatus(req.params.id, status, reason);
      res.status(200).json({
        success: true,
        message: `Estado del restaurante actualizado a ${status}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const { planId, billingCycle, daysToAdd } = req.body;
      const updated = await saasService.updateTenantPlan(req.params.id, planId, billingCycle, daysToAdd);
      res.status(200).json({
        success: true,
        message: 'Plan de suscripción actualizado exitosamente',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async activatePlan(req, res, next) {
    try {
      const updated = await saasService.activateTenantPlan(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: '¡Plan verificado y activado exitosamente!',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const result = await saasService.getAllPlatformUsers(req.query);
      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlans(req, res, next) {
    try {
      const plans = await saasService.getAllPlans();
      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTenant(req, res, next) {
    try {
      const result = await saasService.deleteTenantPermanently(req.params.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.tenant
      });
    } catch (error) {
      next(error);
    }
  }

  async purgeInactiveTenants(req, res, next) {
    try {
      const result = await saasService.purgeExpiredInactiveTenants();
      res.status(200).json({
        success: true,
        message: `Se han eliminado automáticamente ${result.count} restaurantes con más de 2 meses de inactividad o suspensión`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getPurgeCount(req, res, next) {
    try {
      const count = await saasService.getExpiredInactiveCount();
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      if (req.user?.id === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta de SuperAdmin'
        });
      }
      const deleted = await saasService.deletePlatformUser(req.params.id);
      res.status(200).json({
        success: true,
        message: `Usuario ${deleted.name} eliminado definitivamente de la plataforma`,
        data: deleted
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SaasController();
