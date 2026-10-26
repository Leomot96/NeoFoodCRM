const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class TableService {
  async getAllTables() {
    const tenantId = getTenantId();
    const whereClause = { isActive: true };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const tables = await prisma.table.findMany({
      where: whereClause,
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
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw Object.assign(new Error('El nombre de la mesa es requerido'), { statusCode: 400 });
    }
    const trimmedName = name.trim();
    const tenantId = getTenantId();

    if (tenantId) {
      const existing = await prisma.table.findFirst({
        where: {
          tenantId,
          name: { equals: trimmedName, mode: 'insensitive' }
        }
      });
      if (existing) {
        throw Object.assign(new Error(`Ya existe una mesa con el nombre "${trimmedName}" en este establecimiento`), { statusCode: 409 });
      }

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
      data: { name: trimmedName, isActive: true, ...(tenantId ? { tenantId } : {}) }
    });
  }

  async deleteTable(id) {
    const tenantId = getTenantId();
    const exists = await prisma.table.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) }
    });
    if (!exists) {
      throw Object.assign(new Error('Mesa no encontrada en este establecimiento'), { statusCode: 404 });
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId: id,
        sale: null,
        status: { not: 'CANCELLED' }
      }
    });
    if (activeOrder) {
      throw Object.assign(new Error('No se puede eliminar una mesa que tiene un pedido activo sin cobrar'), { statusCode: 400 });
    }

    return await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { tableId: id },
        data: { tableId: null }
      });
      return await tx.table.delete({
        where: { id }
      });
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

    const effectiveTenantId = table.tenantId || getTenantId();

    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}) }
      });
      if (!customer) {
        throw Object.assign(new Error('El cliente seleccionado no pertenece a este restaurante'), { statusCode: 400 });
      }
    }

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
      const product = await prisma.product.findFirst({
        where: { id: prodId, ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}) },
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

    return await prisma.$transaction(async (tx) => {
      let order;
      if (existingOrder && (data.append === true || data.mode === 'append')) {
        // Modo anexar: agrega platos nuevos a la comanda existente sin eliminar los anteriores
        const updatedTotal = parseFloat(existingOrder.totalAmount || 0) + totalAmount;
        order = await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            customerId: customerId || existingOrder.customerId,
            notes: notes ? (existingOrder.notes ? `${existingOrder.notes} | ${notes}` : notes) : existingOrder.notes,
            totalAmount: updatedTotal,
            status: 'PENDING', // Vuelve a poner en PENDING para que cocina vea los nuevos platos añadidos
            details: {
              create: processedDetails
            }
          },
          include: {
            details: { include: { product: true } },
            customer: true
          }
        });
      } else if (existingOrder) {
        // Reemplazo con la lista completa de ítems
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
            tenantId: effectiveTenantId || null,
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
    const tenantId = getTenantId();
    const table = await prisma.table.findFirst({
      where: { id: tableId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!table) {
      throw Object.assign(new Error('Mesa no encontrada en este establecimiento'), { statusCode: 404 });
    }

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
