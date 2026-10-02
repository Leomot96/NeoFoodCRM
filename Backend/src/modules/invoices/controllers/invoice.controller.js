const invoiceService = require('../services/invoice.service');

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await invoiceService.getInvoices(req.query);
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId, date } = req.body;
    const userId = req.user.id;
    const sale = await invoiceService.updatePaymentMethod(req.params.id, paymentMethodId, date, userId);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

exports.addAbono = async (req, res, next) => {
  try {
    const { amount, paymentMethodId } = req.body;
    const userId = req.user.id;
    const sale = await invoiceService.addAbono(req.params.id, amount, paymentMethodId, userId);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};