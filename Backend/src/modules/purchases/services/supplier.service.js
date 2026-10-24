const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class SupplierService {
  async createSupplier(data) {
    const tenantId = getTenantId();
    // Verificamos si el NIT ya existe dentro del mismo establecimiento
    if (data.nit) {
      const whereNit = { nit: data.nit };
      if (tenantId) whereNit.tenantId = tenantId;
      const existing = await prisma.supplier.findFirst({ where: whereNit });
      if (existing) {
        const error = new Error('Ya existe un proveedor con este NIT');
        error.statusCode = 400;
        throw error;
      }
    }

    const allowedFields = ['name', 'nit', 'contactName', 'phone', 'email', 'address'];
    const supplierData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        supplierData[key] = data[key];
      }
    }
    if (tenantId) {
      supplierData.tenantId = tenantId;
    }
    return await prisma.supplier.create({ data: supplierData });
  }

  async getAllSuppliers() {
    const tenantId = getTenantId();
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    return await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getSupplierById(id) {
    const tenantId = getTenantId();
    const where = { id };
    if (tenantId) where.tenantId = tenantId;
    const supplier = await prisma.supplier.findFirst({ where });
    if (!supplier) {
      const error = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      throw error;
    }
    return supplier;
  }

  async updateSupplier(id, data) {
    await this.getSupplierById(id);
    const allowedFields = ['name', 'nit', 'contactName', 'phone', 'email', 'address'];
    const safeData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        safeData[key] = data[key];
      }
    }
    return await prisma.supplier.update({
      where: { id },
      data: safeData,
    });
  }

  async deleteSupplier(id) {
    await this.getSupplierById(id);
    
    // Verificamos si tiene compras asociadas para evitar romper la integridad referencial
    const purchasesCount = await prisma.purchase.count({ where: { supplierId: id } });
    if (purchasesCount > 0) {
      const error = new Error('No se puede eliminar el proveedor porque tiene compras asociadas');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.supplier.delete({ where: { id } });
  }
}

module.exports = new SupplierService();
