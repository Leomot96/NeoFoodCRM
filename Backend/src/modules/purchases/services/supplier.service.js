const prisma = require('../../../config/prisma');

class SupplierService {
  async createSupplier(data) {
    // Verificamos si el NIT ya existe
    if (data.nit) {
      const existing = await prisma.supplier.findFirst({ where: { nit: data.nit } });
      if (existing) {
        const error = new Error('Ya existe un proveedor con este NIT');
        error.statusCode = 400;
        throw error;
      }
    }
    return await prisma.supplier.create({ data });
  }

  async getAllSuppliers() {
    return await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getSupplierById(id) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      const error = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      throw error;
    }
    return supplier;
  }

  async updateSupplier(id, data) {
    await this.getSupplierById(id);
    return await prisma.supplier.update({
      where: { id },
      data,
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