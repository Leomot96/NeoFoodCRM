const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class TableService {
  async getAllTables() {
    const tables = await prisma.table.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: {
            sale: null,
            status: { not: 'CANCELLED' }
          },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            details: {
              include: {
                product: {
                  include: {
                    modifiers: { include: { options: true } },
                    additions: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    return tables.map(t => {
      const activeOrder = t.orders?.[0] || null;
      return {
        id: t.id,
        name: t.name,
        capacity: t.capacity,
        isActive: t.isActive,
        isOccupied: Boolean(activeOrder),
        activeOrder: activeOrder ? {
          id: activeOrder.id,
          orderNumber: activeOrder.orderNumber,
          createdAt: activeOrder.createdAt,
          totalAmount: parseFloat(activeOrder.totalAmount),
          customer: activeOrder.customer,
          customerId: activeOrder.customerId,
          notes: activeOrder.notes,
          details: (activeOrder.details || []).map(d => ({
            id: d.id,
            productId: d.productId,
            product: d.product,
            quantity: d.quantity,
            unitPrice: parseFloat(d.unitPrice),
            subtotal: parseFloat(d.subtotal),
            notes: d.notes,
            modifiers: d.modifiers || [],
            variations: d.modifiers || [],
            additions: d.additions || []
          }))
        } : null
      };
    });
  }

  async createTable(name) {
    const tenantId = getTenantId();
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true }
      });

      if (tenant?.plan && tenant.plan.maxTables !== -1) {
        const currentCount = await prisma.table.count({
          where: { tenantId, isActive: true }
        });

        if (currentCount >= tenant.plan.maxTables) {
          const error = new Error(`Has alcanzado el límite máximo de ${tenant.plan.maxTables} mesas permitidas en tu ${tenant.plan.name}. Para habilitar más mesas, actualiza a un plan superior (Pro o Enterprise).`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    return await prisma.table.create({
      data: { name, isActive: true }
    });
  }

  async deleteTable(id) {
    return await prisma.table.delete({
      where: { id }
    });
  }

  // Guardar o actualizar pedido en mesa
  async saveTableOrder(tableId, data, userId) {
    const { customerId, notes, items = [] } = data;

    if (!items || items.length === 0) {
      throw Object.assign(new Error('El pedido debe incluir al menos un producto'), { statusCode: 400 });
    }

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw Object.assign(new Error('Mesa no encontrada'), { statusCode: 404 });

    // Buscar si ya existe una orden abierta para esta mesa
    const existingOrder = await prisma.order.findFirst({
      where: {
        tableId,
        sale: null,
        status: { not: 'CANCELLED' }
      },
      include: { details: true }
    });

    let totalAmount = 0;
    const processedDetails = [];

    for (const item of items) {
      const prodId = item.productId || item.product?.id;
      const product = await prisma.product.findUnique({ where: { id: prodId } });
      if (!product) continue;

      const quantity = parseInt(item.quantity, 10) || 1;
      const unitPrice = parseFloat(item.finalPrice || item.unitPrice || product.price);
      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      processedDetails.push({
        productId: product.id,
        quantity,
        unitPrice,
        subtotal,
        notes: item.notes || null,
        modifiers: item.modifiers || item.variations || [],
        additions: item.additions || []
      });
    }

    return await prisma.$transaction(async (tx) => {
      let order;
      if (existingOrder) {
        // Borramos detalles viejos y colocamos los nuevos
        await tx.orderDetail.deleteMany({ where: { orderId: existingOrder.id } });
        order = await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            customerId: customerId || null,
            notes: notes || null,
            totalAmount,
            status: 'PENDING',
            details: {
              create: processedDetails
            }
          },
          include: {
            details: { include: { product: true } },
            customer: true
          }
        });
      } else {
        order = await tx.order.create({
          data: {
            userId,
            tableId,
            customerId: customerId || null,
            notes: notes || null,
            totalAmount,
            status: 'PENDING',
            orderType: 'DINE_IN',
            details: {
              create: processedDetails
            }
          },
          include: {
            details: { include: { product: true } },
            customer: true
          }
        });
      }

      return order;
    });
  }

  // Cancelar / Liberar pedido de mesa sin cobrar
  async cancelTableOrder(tableId) {
    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId,
        sale: null,
        status: { not: 'CANCELLED' }
      }
    });

    if (!activeOrder) {
      throw Object.assign(new Error('No hay pedido activo en esta mesa'), { statusCode: 400 });
    }

    return await prisma.order.update({
      where: { id: activeOrder.id },
      data: { status: 'CANCELLED' }
    });
  }
}

module.exports = new TableService();