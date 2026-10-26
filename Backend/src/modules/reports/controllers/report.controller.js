const reportService = require('../services/report.service');

class ReportController {
  // Controlador unificado: El tipo de reporte se pasa por query string (?type=sales)
  async getReportData(req, res, next) {
    try {
      const { type, startDate, endDate } = req.query;
      const tenantId = req.tenantId || req.user?.tenantId;
      let data = [];

      switch (type) {
        case 'sales':
          data = await reportService.getSalesAndProfits(startDate, endDate, tenantId);
          break;
        case 'purchases':
          data = await reportService.getPurchases(startDate, endDate, tenantId);
          break;
        case 'inventory':
          data = await reportService.getInventory(tenantId);
          break;
        case 'cash':
          data = await reportService.getCashSessions(startDate, endDate, tenantId);
          break;
        case 'top-products':
          data = await reportService.getTopProducts(startDate, endDate, tenantId);
          break;
        case 'top-customers':
          data = await reportService.getTopCustomers(startDate, endDate, tenantId);
          break;
        default:
          return res.status(400).json({ success: false, message: 'Tipo de reporte inválido' });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
