const purchaseService = require('../services/purchase.service');

class PurchaseController {
  async create(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const purchase = await purchaseService.createPurchase(req.body, req.user.id, tenantId);
      res.status(201).json({ 
        success: true, 
        message: 'Compra registrada y stock actualizado',
        data: purchase 
      });
    } catch (error) { next(error); }
  }

  async getAll(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const purchases = await purchaseService.getPurchasesHistory(req.query, tenantId);
      res.status(200).json({ success: true, data: purchases });
    } catch (error) { next(error); }
  }

  async getById(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const purchase = await purchaseService.getPurchaseById(req.params.id, tenantId);
      res.status(200).json({ success: true, data: purchase });
    } catch (error) { next(error); }
  }

  async cancel(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const purchase = await purchaseService.cancelPurchase(req.params.id, req.user.id, tenantId);
      res.status(200).json({ 
        success: true, 
        message: 'Compra anulada y stock revertido',
        data: purchase 
      });
    } catch (error) { next(error); }
  }

  async getReport(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate y endDate son requeridos' });
      }
      const report = await purchaseService.getPurchasesReport(startDate, endDate, tenantId);
      res.status(200).json({ success: true, data: report });
    } catch (error) { next(error); }
  }
}

module.exports = new PurchaseController();
