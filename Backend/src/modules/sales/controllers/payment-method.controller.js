const paymentMethodService = require('../services/payment-method.service');

class PaymentMethodController {
  async create(req, res, next) {
    try {
      const pm = await paymentMethodService.createPaymentMethod(req.body);
      res.status(201).json({ success: true, data: pm });
    } catch (error) { next(error); }
  }

  async getAll(req, res, next) {
    try {
      const pms = await paymentMethodService.getAllPaymentMethods();
      const formattedPms = pms.map(pm => ({
        ...pm,
        id: String(pm.id)
      }));
      res.status(200).json({ success: true, data: pms });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const pm = await paymentMethodService.updatePaymentMethod(req.params.id, req.body);
      res.status(200).json({ success: true, data: pm });
    } catch (error) { next(error); }
  }

  // NUEVO MÉTODO PARA EL INTERRUPTOR
  async toggleStatus(req, res, next) {
    try {
      const pm = await paymentMethodService.toggleStatus(req.params.id);
      res.status(200).json({ success: true, data: pm });
    } catch (error) { next(error); }
  }

  // ELIMINAR MÉTODO DE PAGO
  async delete(req, res, next) {
    try {
      await paymentMethodService.deletePaymentMethod(req.params.id);
      res.status(200).json({ success: true, message: 'Método de pago eliminado exitosamente' });
    } catch (error) { next(error); }
  }
}

module.exports = new PaymentMethodController();