const customerService = require('../services/customer.service');

exports.getAll = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.status(200).json({ success: true, data: customers });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) { next(error); }
};

exports.edit = async (req, res, next) => {
  try {
    const customer = await customerService.editCustomer(req.params.id, req.body);
    res.status(200).json({ success: true, data: customer });
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    const customer = await customerService.deleteCustomer(req.params.id);
    res.status(200).json({ success: true, data: customer });
  } catch (error) { next(error); } 
};

exports.getCustomerCredits = async (req, res, next) => {
  try {
    const credits = await customerService.getCustomerCredits(req.params.id);
    res.status(200).json({ success: true, data: credits });
  } catch (error) { next(error); }
};

exports.payCustomerCredit = async (req, res, next) => {
  try {
    // req.user viene del middleware protectRoute (tu token)
    const result = await customerService.payCustomerCredit(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};