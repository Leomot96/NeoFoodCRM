const saleService = require('../services/sale.service');

class SaleController {
  async createSale(req, res, next) {
    try {
      // req.user.id viene del middleware auth
      const sale = await saleService.createSale({
        ...req.body,
        tenantId: req.tenantId || req.user?.tenantId
      }, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        data: sale
      });
    } catch (error) { next(error); }
  }

  async getHistory(req, res, next) {
    try {
      const history = await saleService.getSalesHistory(req.query);
      res.status(200).json({ success: true, data: history });
    } catch (error) { next(error); }
  }

  async getInvoice(req, res, next) {
    try {
      const invoice = await saleService.getInvoiceData(req.params.id);
      res.status(200).json({ success: true, data: invoice });
    } catch (error) { next(error); }
  }

  async getUtilityReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate y endDate son requeridos' });
      }
      const report = await saleService.getUtilityReport(startDate, endDate);
      res.status(200).json({ success: true, data: report });
    } catch (error) { next(error); }
  }

  async getDashboardSummary(req, res, next) {
    try {
      const summary = await saleService.getDashboardSummary(req.user.id);
      res.status(200).json({ success: true, data: summary });
    } catch (error) { next(error); }
  }
}

module.exports = new SaleController();