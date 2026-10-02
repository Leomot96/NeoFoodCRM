const storeService = require('../services/store.service');

class StoreController {
  // ==========================================
  // PÚBLICOS
  // ==========================================
  async getPublicStore(req, res, next) {
    try {
      const { slug } = req.params;
      const data = await storeService.getPublicStoreBySlug(slug);
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async createPublicOrder(req, res, next) {
    try {
      const { slug } = req.params;
      const result = await storeService.createPublicOrder(slug, req.body);
      res.status(201).json({
        success: true,
        message: '¡Pedido registrado con éxito!',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ADMINISTRACIÓN (PROTEGIDOS)
  // ==========================================
  async getConfig(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Contexto de restaurante no encontrado' });
      }
      const config = await storeService.getStoreConfig(tenantId);
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      next(error);
    }
  }

  async updateConfig(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Contexto de restaurante no encontrado' });
      }
      const updated = await storeService.updateStoreConfig(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: 'Configuración de la tienda actualizada correctamente',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadLogo(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se envió ningún archivo de imagen para el logo' });
      }

      const logoUrl = `/uploads/store/${req.file.filename}`;
      const result = await storeService.updateLogo(tenantId, logoUrl);

      res.status(200).json({
        success: true,
        message: 'Logotipo actualizado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLogo(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Contexto de restaurante no encontrado' });
      }

      const result = await storeService.deleteLogo(tenantId);
      res.status(200).json({
        success: true,
        message: 'Logotipo eliminado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadBanner(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se envió ningún archivo de imagen para el banner' });
      }

      const bannerUrl = `/uploads/store/${req.file.filename}`;
      const result = await storeService.updateBanner(tenantId, bannerUrl);

      res.status(200).json({
        success: true,
        message: 'Banner de portada actualizado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBanner(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Contexto de restaurante no encontrado' });
      }

      const result = await storeService.deleteBanner(tenantId);
      res.status(200).json({
        success: true,
        message: 'Banner eliminado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const orders = await storeService.getStoreOrders(tenantId, req.query);
      res.status(200).json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveCount(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const stats = await storeService.getActiveCount(tenantId);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const { id } = req.params;
      const { status } = req.body;
      const updated = await storeService.updateOrderStatus(tenantId, id, status);
      res.status(200).json({
        success: true,
        message: `Estado de la orden actualizado a ${status}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async convertToSale(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const userId = req.user.id;
      const { id } = req.params;
      const sale = await storeService.convertOrderToSale(tenantId, id, userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Pedido facturado correctamente en caja',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoreController();
