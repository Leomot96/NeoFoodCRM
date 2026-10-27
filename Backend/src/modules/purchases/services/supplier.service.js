const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class SupplierService {
  async createSupplier(data) {
    const tenantId = getTenantId();

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      const error = new Error('El nombre del proveedor es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const normalizedNit = typeof data.nit === 'string' && data.nit.trim() !== '' ? data.nit.trim() : null;

    // Verificamos si el NIT ya existe dentro del mismo establecimiento
    if (normalizedNit) {
      const whereNit = { nit: normalizedNit };
      if (tenantId) whereNit.tenantId = tenantId;
      const existing = await prisma.supplier.findFirst({ where: whereNit });
      if (existing) {
        const error = new Error('Ya existe un proveedor con este NIT');
        error.statusCode = 400;
        throw error;
      }
    }

    const allowedFields = ['name', 'nit', 'phone', 'email', 'address'];
    const supplierData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        supplierData[key] = data[key];
      }
    }
    supplierData.name = data.name.trim();
    supplierData.nit = normalizedNit;
    if (supplierData.phone && typeof supplierData.phone === 'string') supplierData.phone = supplierData.phone.trim();
    if (supplierData.email && typeof supplierData.email === 'string') supplierData.email = supplierData.email.trim();
    if (supplierData.address && typeof supplierData.address === 'string') supplierData.address = supplierData.address.trim();

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
    const existingSupplier = await this.getSupplierById(id);
    const tenantId = getTenantId();

    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        const error = new Error('El nombre del proveedor es obligatorio');
        error.statusCode = 400;
        throw error;
      }
    }

    const allowedFields = ['name', 'nit', 'phone', 'email', 'address'];
    const safeData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        safeData[key] = data[key];
      }
    }

    if (safeData.name && typeof safeData.name === 'string') {
      safeData.name = safeData.name.trim();
    }

    if (safeData.nit !== undefined) {
      safeData.nit = typeof safeData.nit === 'string' && safeData.nit.trim() !== '' ? safeData.nit.trim() : null;
      if (safeData.nit) {
        const whereNit = {
          nit: safeData.nit,
          id: { not: id }
        };
        const effectiveTenantId = existingSupplier.tenantId || tenantId;
        if (effectiveTenantId) whereNit.tenantId = effectiveTenantId;
        const duplicate = await prisma.supplier.findFirst({ where: whereNit });
        if (duplicate) {
          const error = new Error('Ya existe otro proveedor con este NIT');
          error.statusCode = 400;
          throw error;
        }
      }
    }

    if (safeData.phone && typeof safeData.phone === 'string') safeData.phone = safeData.phone.trim();
    if (safeData.email && typeof safeData.email === 'string') safeData.email = safeData.email.trim();
    if (safeData.address && typeof safeData.address === 'string') safeData.address = safeData.address.trim();

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
