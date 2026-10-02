const cashService = require('../services/cash.service');

class CashController {
  async openSession(req, res, next) {
    try {
      const { openingAmount } = req.body;
      const tenantId = req.tenantId || req.user?.tenantId;
      const session = await cashService.openSession(req.user.id, openingAmount, tenantId);
      res.status(201).json({ success: true, message: 'Caja abierta exitosamente', data: session });
    } catch (error) { next(error); }
  }

  async closeSession(req, res, next) {
    try {
      const { closingAmount } = req.body;
      const session = await cashService.closeSession(req.params.id, req.user.id, closingAmount);
      res.status(200).json({ success: true, message: 'Caja cerrada exitosamente', data: session });
    } catch (error) { next(error); }
  }

  async registerMovement(req, res, next) {
    try {
      const movement = await cashService.registerMovement(req.params.id, req.user.id, req.body);
      res.status(201).json({ success: true, message: 'Movimiento registrado', data: movement });
    } catch (error) { next(error); }
  }

  async auditSession(req, res, next) {
    try {
      // req.user.id corresponde al auditor (Admin/Supervisor)
      const audit = await cashService.createAudit(req.params.id, req.user.id, req.body);
      res.status(201).json({ success: true, message: 'Arqueo guardado exitosamente', data: audit });
    } catch (error) { next(error); }
  }

  async getHistory(req, res, next) {
    try {
      const query = { ...req.query };
      // Si es Cajero, solo puede ver sus propias sesiones de caja
      const roleName = req.user?.role?.name || req.user?.role;
      if (roleName === 'Cajero') {
        query.userId = req.user.id;
      }
      const history = await cashService.getHistory(query);
      res.status(200).json({ success: true, data: history });
    } catch (error) { next(error); }
  }

  async getDailyReport(req, res, next) {
    try {
      const { date } = req.query; // Formato esperado: YYYY-MM-DD
      if (!date) return res.status(400).json({ success: false, message: 'El parámetro date es requerido' });
      
      const report = await cashService.getDailyReport(date);
      res.status(200).json({ success: true, data: report });
    } catch (error) { next(error); }
  }

  async getMonthlyReport(req, res, next) {
    try {
      const { year, month } = req.query;
      if (!year || !month) return res.status(400).json({ success: false, message: 'Los parámetros year y month son requeridos' });
      
      const report = await cashService.getMonthlyReport(parseInt(year), parseInt(month));
      res.status(200).json({ success: true, data: report });
    } catch (error) { next(error); }
  }
}

module.exports = new CashController();