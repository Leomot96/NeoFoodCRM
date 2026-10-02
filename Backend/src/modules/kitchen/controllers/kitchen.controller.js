const kitchenService = require('../services/kitchen.service');

class KitchenController {
  async getOrders(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Contexto de restaurante no encontrado' });
      }

      const orders = await kitchenService.getKitchenOrders(tenantId, req.query);
      res.status(200).json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Contexto de restaurante no encontrado' });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'El estado es requerido' });
      }

      const updated = await kitchenService.updateOrderStatus(tenantId, id, status);
      res.status(200).json({
        success: true,
        message: 'Estado del pedido actualizado',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KitchenController();
