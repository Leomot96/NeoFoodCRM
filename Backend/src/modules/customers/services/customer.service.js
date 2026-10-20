const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class CustomerService {
  async getAllCustomers() {
    const tenantId = getTenantId();
    const where = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async createCustomer(data) {
    try {
      const tenantId = getTenantId();
      const customerData = {
        ...data,
        ...(tenantId && !data.tenantId ? { tenantId } : {})
      };
      return await prisma.customer.create({ data: customerData });
    } catch (err) {
      if (err.code === 'P2002') {
        const error = new Error('Ya existe un cliente registrado con ese número de documento.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  async editCustomer(id, data) {
    try {
      const tenantId = getTenantId();
      if (tenantId) {
        const existing = await prisma.customer.findFirst({
          where: { id, tenantId }
        });
        if (!existing) {
          const error = new Error('Cliente no encontrado o no pertenece a este establecimiento');
          error.statusCode = 404;
          throw error;
        }
      }

      return await prisma.customer.update({
        where: { id },
        data
      });
    } catch (err) {
      if (err.code === 'P2002') {
        const error = new Error('Ya existe otro cliente registrado con ese número de documento.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  async deleteCustomer(id) {
    const tenantId = getTenantId();
    if (tenantId) {
      const existing = await prisma.customer.findFirst({
        where: { id, tenantId }
      });
      if (!existing) {
        const error = new Error('Cliente no encontrado o no pertenece a este establecimiento');
        error.statusCode = 404;
        throw error;
      }
    }

    return await prisma.customer.delete({
      where: { id }
    });
  }

  // =====================================
  // HISTORIAL DE CRÉDITO
  // =====================================
  async getCustomerCredits(customerId) {
    const tenantId = getTenantId();
    if (tenantId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId }
      });
      if (!customer) {
        return [];
      }
    }

    return await prisma.customerCredit.findMany({
      where: { customerId },
      include: { 
        sale: {
          select: { invoiceNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async payCustomerCredit(customerId, data, userId) {
      const { amount, paymentMethodId, description, saleId } = data; // <-- Agregamos saleId para vincular a factura si viene del Frontend
      const parsedAmount = parseFloat(amount);

      if (parsedAmount <= 0) {
        const error = new Error('El abono debe ser mayor a 0');
        error.statusCode = 400;
        throw error;
      }

      return await prisma.$transaction(async (tx) => {
        // 1. Verificamos caja abierta
        const activeSession = await tx.cashSession.findFirst({
          where: { userId: userId, status: 'OPEN' }
        });

        if (!activeSession) {
          const error = new Error('No tienes un turno de caja abierto. Abre caja antes de recibir pagos.');
          error.statusCode = 400;
          throw error;
        }

        // 2. Buscamos el nombre del método de pago para saber si es Efectivo
        const paymentMethod = await tx.paymentMethod.findUnique({
          where: { id: paymentMethodId }
        });
        
        const isCash = paymentMethod.name.toLowerCase().includes('efectivo') || paymentMethod.name.toLowerCase().includes('cash');

        // 3. Registramos el abono en el historial del cliente
        const credit = await tx.customerCredit.create({
          data: {
            customerId,
            type: 'PAYMENT',
            amount: parsedAmount,
            description: description || 'Abono a cuenta',
            paymentMethodId,
            cashSessionId: activeSession.id,
            saleId: saleId || null // Vinculamos a la factura si se abonó desde el módulo de Facturas
          }
        });

        // 4. Descontamos la plata de su deuda total
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { decrement: parsedAmount } }
        });

        // 5. CORRECCIÓN: SOLO suma dinero físico si pagaron en Efectivo
        if (isCash) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: activeSession.id,
              type: 'IN', 
              amount: parsedAmount,
              description: `Abono de cliente (${paymentMethod.name}): ${description}`
            }
          });
        }

        return credit;
      });
    }
}
module.exports = new CustomerService();