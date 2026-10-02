const prisma = require('../../../config/prisma');

class KitchenService {
  async getKitchenOrders(tenantId, query = {}) {
    const { status, origin } = query;

    const where = { tenantId };

    if (status && status !== 'all') {
      if (status === 'active') {
        where.status = { in: ['PENDING', 'PREPARING', 'READY'] };
      } else if (status === 'history') {
        where.status = { in: ['DELIVERED', 'CANCELLED'] };
      } else {
        where.status = status;
      }
    } else if (!status) {
      where.status = { in: ['PENDING', 'PREPARING', 'READY'] };
    }

    if (origin === 'tables') {
      where.tableId = { not: null };
    } else if (origin === 'store') {
      where.isOnlineStore = true;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: {
          select: { id: true, name: true }
        },
        customer: {
          select: { id: true, name: true, phone: true }
        },
        details: {
          include: {
            product: {
              select: { id: true, name: true, isCombo: true, imageUrl: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: where.status && (where.status === 'history' || (Array.isArray(where.status.in) && where.status.in.includes('DELIVERED')))
          ? 'desc'
          : 'asc' // Orden FIFO en cocina: los más antiguos primero
      },
      take: 80
    });

    return orders.map(order => {
      // Determinar origen legible
      let originType = 'DIRECT';
      let originLabel = 'Venta Directa';
      if (order.table) {
        originType = 'TABLE';
        originLabel = `Mesa ${order.table.name}`;
      } else if (order.isOnlineStore) {
        originType = 'STORE';
        originLabel = order.orderType === 'DELIVERY' ? 'Tienda (Domicilio)' : 'Tienda (Retiro)';
      } else if (order.orderType === 'TAKEAWAY') {
        originType = 'TAKEAWAY';
        originLabel = 'Para Llevar';
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        orderType: order.orderType,
        isOnlineStore: order.isOnlineStore,
        originType,
        originLabel,
        table: order.table,
        tableName: order.table?.name || null,
        customerName: order.customerName || order.customer?.name || (order.table ? `Mesa ${order.table.name}` : 'Cliente General'),
        customerPhone: order.customerPhone || order.customer?.phone || null,
        deliveryAddress: order.deliveryAddress,
        deliveryNeighborhood: order.deliveryNeighborhood,
        notes: order.notes,
        totalAmount: parseFloat(order.totalAmount || 0),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        details: (order.details || []).map(d => ({
          id: d.id,
          productId: d.productId,
          productName: d.product?.name || 'Producto',
          isCombo: d.product?.isCombo || false,
          quantity: d.quantity,
          notes: d.notes,
          modifiers: Array.isArray(d.modifiers) ? d.modifiers : [],
          additions: Array.isArray(d.additions) ? d.additions : []
        }))
      };
    });
  }

  async updateOrderStatus(tenantId, orderId, status) {
    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error(`Estado no válido. Debe ser uno de: ${validStatuses.join(', ')}`), { statusCode: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { sale: true }
    });

    if (!order) {
      throw Object.assign(new Error('Pedido no encontrado en este restaurante'), { statusCode: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // Si es un pedido de tienda virtual y se despacha/entrega desde cocina, registrar automáticamente como venta en Caja y Facturas
    if (status === 'DELIVERED' && order.isOnlineStore && !order.sale) {
      try {
        const storeService = require('../../store/services/store.service');
        await storeService.convertOrderToSale(tenantId, orderId, null);
      } catch (saleErr) {
        console.warn(`[KITCHEN] Advertencia al convertir comanda de tienda #${order.orderNumber} a venta:`, saleErr.message);
      }
    }

    return updated;
  }
}

module.exports = new KitchenService();
