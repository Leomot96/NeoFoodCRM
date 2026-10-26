const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class PaymentMethodService {
  async createPaymentMethod(data) {
    const tenantId = getTenantId();
    return await prisma.paymentMethod.create({
      data: {
        name: data.name,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        ...(tenantId ? { tenantId } : {})
      }
    });
  }

  async getAllPaymentMethods() {
    // Quitamos el 'where: { isActive: true }' para que la configuración 
    // pueda ver TODOS los métodos (incluso los inactivos).
    // El POS ya se encarga de mostrar solo los activos.
    const tenantId = getTenantId();
    const whereClause = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return await prisma.paymentMethod.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
  }

  async updatePaymentMethod(id, data) {
    const tenantId = getTenantId();
    const parsedId = String(id);
    const existing = await prisma.paymentMethod.findFirst({
      where: { id: parsedId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!existing) {
      throw Object.assign(new Error('Método de pago no encontrado en este establecimiento'), { statusCode: 404 });
    }

    const allowedFields = ['name', 'isActive'];
    const safeData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        safeData[key] = data[key];
      }
    }
    return await prisma.paymentMethod.update({
      where: { id: parsedId },
      data: safeData,
    });
  }

  // NUEVO: Método para apagar/encender (Toggle)
  async toggleStatus(id) {
    const tenantId = getTenantId();
    const parsedId = String(id);
    
    const method = await prisma.paymentMethod.findFirst({ 
      where: { id: parsedId, ...(tenantId ? { tenantId } : {}) } 
    });
    
    if (!method) {
      throw Object.assign(new Error('Método de pago no encontrado en este establecimiento'), { statusCode: 404 });
    }

    return await prisma.paymentMethod.update({
      where: { id: parsedId },
      data: { isActive: !method.isActive }
    });
  }

  // Eliminar método de pago (si no tiene historial de ventas, pagos divididos o créditos)
  async deletePaymentMethod(id) {
    const tenantId = getTenantId();
    const parsedId = String(id);

    const method = await prisma.paymentMethod.findFirst({
      where: { id: parsedId, ...(tenantId ? { tenantId } : {}) },
      include: {
        _count: {
          select: { sales: true, customerCredits: true, payments: true }
        }
      }
    });

    if (!method) {
      throw Object.assign(new Error('Método de pago no encontrado en este establecimiento'), { statusCode: 404 });
    }

    const totalLinked = (method._count?.sales || 0) + (method._count?.customerCredits || 0) + (method._count?.payments || 0);
    if (totalLinked > 0) {
      throw Object.assign(
        new Error(`No se puede eliminar "${method.name}" porque ya tiene ${totalLinked} registro(s) de ventas, pagos o créditos asociados. Te sugerimos desactivarlo con el interruptor para ocultarlo de caja sin alterar el historial contable.`),
        { statusCode: 400 }
      );
    }

    return await prisma.paymentMethod.delete({
      where: { id: parsedId }
    });
  }
}

module.exports = new PaymentMethodService();
