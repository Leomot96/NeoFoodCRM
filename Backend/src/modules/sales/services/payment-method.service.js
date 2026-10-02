const prisma = require('../../../config/prisma');

class PaymentMethodService {
  async createPaymentMethod(data) {
    return await prisma.paymentMethod.create({ data });
  }

  async getAllPaymentMethods() {
    // Quitamos el 'where: { isActive: true }' para que la configuración 
    // pueda ver TODOS los métodos (incluso los inactivos).
    // El POS ya se encarga de mostrar solo los activos.
    return await prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updatePaymentMethod(id, data) {
    // Verificación de seguridad por si tu ID es Int o UUID (String)
    const parsedId = isNaN(id) ? id : parseInt(id);
    
    return await prisma.paymentMethod.update({
      where: { id: parsedId },
      data,
    });
  }

  // NUEVO: Método para apagar/encender (Toggle)
  async toggleStatus(id) {
    const parsedId = isNaN(id) ? id : parseInt(id);
    
    const method = await prisma.paymentMethod.findUnique({ 
      where: { id: parsedId } 
    });
    
    if (!method) {
      throw Object.assign(new Error('Método de pago no encontrado'), { statusCode: 404 });
    }

    return await prisma.paymentMethod.update({
      where: { id: parsedId },
      data: { isActive: !method.isActive }
    });
  }

  // Eliminar método de pago (si no tiene historial de ventas o créditos)
  async deletePaymentMethod(id) {
    const parsedId = isNaN(id) ? id : parseInt(id);

    const method = await prisma.paymentMethod.findUnique({
      where: { id: parsedId },
      include: {
        _count: {
          select: { sales: true, customerCredits: true }
        }
      }
    });

    if (!method) {
      throw Object.assign(new Error('Método de pago no encontrado'), { statusCode: 404 });
    }

    if ((method._count?.sales || 0) > 0 || (method._count?.customerCredits || 0) > 0) {
      const count = (method._count?.sales || 0) + (method._count?.customerCredits || 0);
      throw Object.assign(
        new Error(`No se puede eliminar "${method.name}" porque ya tiene ${count} registro(s) de ventas o créditos asociados. Te sugerimos desactivarlo con el interruptor para ocultarlo de caja sin alterar el historial contable.`),
        { statusCode: 400 }
      );
    }

    return await prisma.paymentMethod.delete({
      where: { id: parsedId }
    });
  }
}

module.exports = new PaymentMethodService();