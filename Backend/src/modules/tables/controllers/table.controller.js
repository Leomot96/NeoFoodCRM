const tableService = require('../services/table.service');

exports.getAllTables = async (req, res, next) => {
  try {
    const tables = await tableService.getAllTables();
    res.status(200).json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
};

exports.createTable = async (req, res, next) => {
  try {
    const { name } = req.body; 
    const newTable = await tableService.createTable(name);
    res.status(201).json({ success: true, data: newTable });
  } catch (error) {
    next(error);
  }
};

exports.deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    await tableService.deleteTable(id);
    res.status(200).json({ success: true, message: 'Mesa eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};

exports.saveOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await tableService.saveTableOrder(id, req.body, req.user.id);
    res.status(200).json({ success: true, data: order, message: 'Pedido guardado en mesa' });
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    await tableService.cancelTableOrder(id);
    res.status(200).json({ success: true, message: 'Pedido cancelado y mesa liberada' });
  } catch (error) {
    next(error);
  }
};