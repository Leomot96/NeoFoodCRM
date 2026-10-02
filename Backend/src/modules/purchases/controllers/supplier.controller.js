const supplierService = require('../services/supplier.service');

class SupplierController {
  async create(req, res, next) {
    try {
      const supplier = await supplierService.createSupplier(req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) { next(error); }
  }

  async getAll(req, res, next) {
    try {
      const suppliers = await supplierService.getAllSuppliers();
      res.status(200).json({ success: true, data: suppliers });
    } catch (error) { next(error); }
  }

  async getById(req, res, next) {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id);
      res.status(200).json({ success: true, data: supplier });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id, req.body);
      res.status(200).json({ success: true, data: supplier });
    } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try {
      await supplierService.deleteSupplier(req.params.id);
      res.status(200).json({ success: true, message: 'Proveedor eliminado correctamente' });
    } catch (error) { next(error); }
  }
}

module.exports = new SupplierController();