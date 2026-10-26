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
              select: { id: true, name: true, isCombo: true, imageUrl: true, price: true }
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
      } else if (order.orderType === 'DELIVERY') {
        originType = 'DELIVERY';
        originLabel = 'Domicilio';
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
        details: (order.details || []).map(d => {
          const unitPrice = parseFloat(d.unitPrice || d.product?.price || 0);
          const subtotal = parseFloat(d.subtotal || (unitPrice * (d.quantity || 1)));
          return {
            id: d.id,
            productId: d.productId,
            productName: d.product?.name || 'Producto',
            isCombo: d.product?.isCombo || false,
            quantity: d.quantity,
            unitPrice,
            price: unitPrice,
            subtotal,
            notes: d.notes,
            modifiers: Array.isArray(d.modifiers) ? d.modifiers : [],
            additions: Array.isArray(d.additions) ? d.additions : []
          };
        })
      };
    });
  }

  async updateOrderStatus(tenantId, orderId, status, userId = null) {
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
        await storeService.convertOrderToSale(tenantId, orderId, userId);
      } catch (saleErr) {
        console.warn(`[KITCHEN] Advertencia al convertir comanda de tienda #${order.orderNumber} a venta:`, saleErr.message);
        return {
          ...updated,
          invoicingWarning: `El pedido fue entregado, pero no se pudo auto-facturar en caja: ${saleErr.message}`
        };
      }
    }

    return updated;
  }

  async createKitchenOrder(tenantId, userId, data) {
    const { 
      orderType = 'TAKEAWAY',
      tableId = null,
      customerId = null,
      customerName = null,
      customerPhone = null,
      deliveryAddress = null,
      deliveryNeighborhood = null,
      notes = null,
      items = []
    } = data;

    if (!items || items.length === 0) {
      throw Object.assign(new Error('El pedido debe incluir al menos un producto'), { statusCode: 400 });
    }

    if (tableId) {
      const validTable = await prisma.table.findFirst({
        where: { id: tableId, ...(tenantId ? { tenantId } : {}) }
      });
      if (!validTable) {
        throw Object.assign(new Error('La mesa seleccionada no pertenece a este restaurante'), { statusCode: 400 });
      }
    }

    if (customerId) {
      const validCustomer = await prisma.customer.findFirst({
        where: { id: customerId, ...(tenantId ? { tenantId } : {}) }
      });
      if (!validCustomer) {
        throw Object.assign(new Error('El cliente seleccionado no pertenece a este restaurante'), { statusCode: 400 });
      }
    }

    let totalAmount = 0;
    const processedDetails = [];

    for (const item of items) {
      const prodId = item.productId || item.product?.id || item.id;
      const product = await prisma.product.findFirst({
        where: { id: prodId, tenantId },
        include: {
          modifiers: { include: { options: true } },
          additions: true
        }
      });
      if (!product) {
        throw Object.assign(new Error('Uno de los productos seleccionados no existe en este restaurante'), { statusCode: 404 });
      }

      const quantity = parseInt(item.quantity, 10);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 500) {
        throw Object.assign(new Error(`Cantidad inválida para el producto ${product.name}`), { statusCode: 400 });
      }

      const validOptionMap = new Map();
      for (const mod of product.modifiers || []) {
        for (const opt of mod.options || []) {
          validOptionMap.set(opt.id, opt);
        }
      }
      const validAdditionMap = new Map((product.additions || []).map(a => [a.id, a]));

      let unitPrice = parseFloat(product.price);
      const rawMods = Array.isArray(item.modifiers) ? item.modifiers : (Array.isArray(item.variations) ? item.variations : []);
      const verifiedMods = [];
      for (const m of rawMods) {
        const optId = m.id || m.optionId || m.variationId;
        const optName = m.name || m.optionName;
        const dbOpt = (optId && validOptionMap.get(optId))
          || (optName ? [...validOptionMap.values()].find(o => o.name === optName) : null);
        if (!dbOpt) {
          throw Object.assign(new Error(`Opción de modificador inválida en el producto "${product.name}"`), { statusCode: 400 });
        }
        const extra = Math.max(0, parseFloat(dbOpt.priceExtra || 0));
        unitPrice += extra;
        verifiedMods.push({
          ...m,
          id: dbOpt.id,
          optionId: dbOpt.id,
          name: dbOpt.name,
          priceExtra: extra
        });
      }

      const selectedOptionIds = new Set(verifiedMods.map(m => m.id).filter(Boolean));
      for (const modGroup of (product.modifiers || [])) {
        if (modGroup.isRequired && Array.isArray(modGroup.options) && modGroup.options.length > 0) {
          const hasSelection = modGroup.options.some(opt => selectedOptionIds.has(opt.id));
          if (!hasSelection) {
            throw Object.assign(new Error(`El modificador "${modGroup.name}" es obligatorio para "${product.name}"`), { statusCode: 400 });
          }
        }
      }

      const rawAdds = Array.isArray(item.additions) ? item.additions : [];
      const verifiedAdds = [];
      for (const a of rawAdds) {
        const addId = a.id || a.additionId;
        const dbAdd = (addId && validAdditionMap.get(addId))
          || (a.name ? (product.additions || []).find(pa => pa.name === a.name) : null);
        if (!dbAdd) {
          throw Object.assign(new Error(`Adición inválida en el producto "${product.name}"`), { statusCode: 400 });
        }
        const addQty = Math.max(1, parseInt(a.quantity, 10) || 1);
        const addPrice = Math.max(0, parseFloat(dbAdd.price || 0));
        unitPrice += addPrice * addQty;
        verifiedAdds.push({
          ...a,
          id: dbAdd.id,
          additionId: dbAdd.id,
          name: dbAdd.name,
          price: addPrice,
          quantity: addQty
        });
      }

      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      processedDetails.push({
        productId: product.id,
        quantity,
        unitPrice,
        subtotal,
        notes: item.notes || null,
        modifiers: verifiedMods,
        additions: verifiedAdds
      });
    }

    const order = await prisma.order.create({
      data: {
        tenantId,
        userId: userId || null,
        tableId: tableId || null,
        customerId: customerId || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        deliveryAddress: deliveryAddress || null,
        deliveryNeighborhood: deliveryNeighborhood || null,
        status: 'PENDING',
        orderType,
        notes: notes || null,
        totalAmount,
        details: {
          create: processedDetails
        }
      },
      include: {
        table: true,
        customer: true,
        details: {
          include: { product: true }
        }
      }
    });

    return order;
  }
}

module.exports = new KitchenService();
