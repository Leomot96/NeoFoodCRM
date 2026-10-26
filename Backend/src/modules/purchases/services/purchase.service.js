const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class PurchaseService {
  _parsePurchaseDate(purchaseDate) {
    if (!purchaseDate) return undefined;
    const raw = String(purchaseDate).trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00.000Z`)
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw Object.assign(new Error('Fecha de compra inválida'), { statusCode: 400 });
    }
    return parsed;
  }
  
  // ==========================================
  // CREACIÓN DE COMPRA (Actualiza Inventario)
  // ==========================================
  async createPurchase(data, userId, tenantIdParam = null) {
    const { supplierId, invoiceNumber, purchaseDate, details } = data;
    const tenantId = tenantIdParam || getTenantId();

    const dateToSave = this._parsePurchaseDate(purchaseDate);

    if (!details || details.length === 0) {
      throw Object.assign(new Error('La compra debe incluir al menos un detalle (ingrediente)'), { statusCode: 400 });
    }

    return await prisma.$transaction(async (tx) => {
      if (supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: supplierId, ...(tenantId ? { tenantId } : {}) }
        });
        if (!supplier) {
          throw Object.assign(new Error('El proveedor seleccionado no pertenece a este establecimiento'), { statusCode: 404 });
        }
      }

      // 1. Calcular el costo total de la compra verificando los detalles
      let totalPurchaseCost = 0;
      const processedDetails = [];
      for (const detail of details) {
        const qty = parseFloat(detail.quantity);
        const cost = parseFloat(detail.unitCost);
        if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) {
          throw Object.assign(new Error('Cantidad o costo unitario inválido en el detalle de la compra'), { statusCode: 400 });
        }

        const ingExists = await tx.ingredient.findFirst({
          where: { id: detail.ingredientId, ...(tenantId ? { tenantId } : {}) }
        });
        if (!ingExists) {
          throw Object.assign(new Error('Uno de los insumos seleccionados no pertenece a este establecimiento'), { statusCode: 404 });
        }

        const total = qty * cost;
        totalPurchaseCost += total;

        processedDetails.push({
          ingredientId: detail.ingredientId,
          quantity: qty,
          unitCost: cost,
          totalCost: total
        });
      }

      // 2. Crear la Compra Principal
      const purchase = await tx.purchase.create({
        data: {
          tenantId: tenantId || null,
          supplierId,
          invoiceNumber,
          totalCost: totalPurchaseCost,
          status: 'COMPLETED', // Asumimos que ingresa al inventario inmediatamente
          createdAt: dateToSave,
          details: {
            create: processedDetails
          }
        },
        include: { details: true }
      });

      // 3. Actualizar Inventario y Registrar Movimientos
      for (const item of processedDetails) {
        // Ingresar movimiento en la bitácora de inventario
        await tx.inventoryMovement.create({
          data: {
            tenantId: tenantId || null,
            ingredientId: item.ingredientId,
            userId: userId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Compra. Factura: ${invoiceNumber || 'N/A'}`
          }
        });

        const ing = await tx.ingredient.findFirst({
          where: { id: item.ingredientId, ...(tenantId ? { tenantId } : {}) }
        });
        const oldStock = parseFloat(ing?.currentStock || 0);
        const oldAvgCost = parseFloat(ing?.averageCost || ing?.costPerUnit || ing?.lastCost || 0);
        
        const newStock = oldStock + item.quantity;
        let newAvgCost = item.unitCost;
        if (newStock > 0) {
            // Evitar stocks negativos arruinando el CMP: Si venía de negativo, asume el nuevo costo
            if (oldStock <= 0) {
                newAvgCost = item.unitCost;
            } else {
                newAvgCost = ((oldStock * oldAvgCost) + (item.quantity * item.unitCost)) / newStock;
            }
        }

        // Actualizar el stock actual del ingrediente y los costos (CMP y último costo)
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { 
            currentStock: { increment: item.quantity },
            lastCost: item.unitCost,
            averageCost: newAvgCost,
            costPerUnit: item.unitCost // Mantenemos compatibilidad con campos legacy
          }
        });
      }

      return purchase;
    });
  }

  // ==========================================
  // ANULACIÓN DE COMPRA (Revierte Inventario)
  // ==========================================
  async cancelPurchase(purchaseId, userId, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, ...(tenantId ? { tenantId } : {}) },
        include: { details: true }
      });

      if (!purchase) throw Object.assign(new Error('Compra no encontrada en este establecimiento'), { statusCode: 404 });
      if (purchase.status === 'CANCELLED') throw Object.assign(new Error('La compra ya está anulada'), { statusCode: 400 });

      // 1. Cambiar estado
      const cancelledPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' }
      });

      // 2. Revertir inventario
      for (const item of purchase.details) {
        // Registrar el movimiento de salida por anulación
        await tx.inventoryMovement.create({
          data: {
            tenantId: purchase.tenantId || tenantId || null,
            ingredientId: item.ingredientId,
            userId: userId,
            type: 'OUT',
            quantity: item.quantity,
            reason: `Anulación de Compra #${purchase.id}`
          }
        });

        // Descontar del stock (se asume que la anulación es inmediata y el stock existe)
        const ingredient = await tx.ingredient.findFirst({
          where: { id: item.ingredientId, ...(tenantId ? { tenantId } : {}) }
        });
        const currentStockVal = parseFloat(ingredient?.currentStock || 0);
        const newStock = currentStockVal - parseFloat(item.quantity);

        if (newStock < 0) {
          throw Object.assign(new Error(`No se puede anular: El ingrediente ${ingredient?.name || item.ingredientId} quedaría con stock negativo`), { statusCode: 400 });
        }

        const prevPurchaseDetail = await tx.purchaseDetail.findFirst({
          where: {
            ingredientId: item.ingredientId,
            purchaseId: { not: purchaseId },
            purchase: {
              status: 'COMPLETED',
              ...(tenantId ? { tenantId } : {})
            }
          },
          orderBy: { purchase: { createdAt: 'desc' } }
        });

        const costUpdate = {};
        if (prevPurchaseDetail) {
          const prevUnitCost = parseFloat(prevPurchaseDetail.unitCost || 0);
          costUpdate.lastCost = prevUnitCost;
          costUpdate.costPerUnit = prevUnitCost;
          if (newStock <= 0) {
            costUpdate.averageCost = prevUnitCost;
          } else {
            const currentTotalVal = currentStockVal * parseFloat(ingredient.averageCost || item.unitCost || 0);
            const removedVal = parseFloat(item.quantity) * parseFloat(item.unitCost || 0);
            const recalcAvg = (currentTotalVal - removedVal) / newStock;
            costUpdate.averageCost = recalcAvg > 0 ? recalcAvg : prevUnitCost;
          }
        }

        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: newStock, ...costUpdate }
        });
      }

      return cancelledPurchase;
    });
  }

  _parseDateRange(startDate, endDate) {
    if (!startDate || !endDate) return undefined;
    const startRaw = String(startDate).trim();
    const endRaw = String(endDate).trim();
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startRaw)
      ? new Date(`${startRaw}T00:00:00.000`)
      : new Date(startRaw);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(endRaw)
      ? new Date(`${endRaw}T23:59:59.999`)
      : new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw Object.assign(new Error('Rango de fechas inválido'), { statusCode: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endRaw) && end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
      end.setHours(23, 59, 59, 999);
    }
    return { gte: start, lte: end };
  }

  // ==========================================
  // HISTORIAL Y REPORTES
  // ==========================================
  async getPurchasesHistory(filters = {}, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const { startDate, endDate, supplierId, status } = filters;
    const whereClause = {};
    if (tenantId) whereClause.tenantId = tenantId;

    if (supplierId) whereClause.supplierId = supplierId;
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.createdAt = this._parseDateRange(startDate, endDate);
    }

    return await prisma.purchase.findMany({
      where: whereClause,
      include: {
        supplier: { select: { name: true, nit: true } },
        details: { include: { ingredient: { select: { name: true, unit: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPurchaseById(id, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const purchase = await prisma.purchase.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: {
        supplier: true,
        details: { include: { ingredient: true } }
      }
    });

    if (!purchase) throw Object.assign(new Error('Compra no encontrada en este establecimiento'), { statusCode: 404 });
    return purchase;
  }

  async getPurchasesReport(startDate, endDate, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const dateRange = this._parseDateRange(startDate, endDate);
    // Retorna el total gastado agrupado por proveedor en un rango de fechas filtrado por tenantId
    const report = await prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        status: 'COMPLETED',
        createdAt: dateRange,
        ...(tenantId ? { tenantId } : {})
      },
      _sum: {
        totalCost: true
      }
    });

    // Enriquecer con los nombres de los proveedores asegurando pertenencia al tenant
    const enrichedReport = await Promise.all(report.map(async (row) => {
      const supplier = await prisma.supplier.findFirst({
        where: { id: row.supplierId, ...(tenantId ? { tenantId } : {}) },
        select: { name: true }
      });
      return {
        supplierName: supplier?.name || 'Proveedor',
        totalSpent: row._sum.totalCost
      };
    }));

    return enrichedReport;
  }

  async updatePurchaseMetadata(id, data, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const { invoiceNumber, purchaseDate } = data;
    const dateToSave = this._parsePurchaseDate(purchaseDate);

    const existing = await prisma.purchase.findFirst({
      where: { id: String(id), ...(tenantId ? { tenantId } : {}) }
    });
    if (!existing) {
      throw Object.assign(new Error('Compra no encontrada en este establecimiento'), { statusCode: 404 });
    }
    
    return await prisma.purchase.update({
      where: { id: String(id) },
      data: {
        invoiceNumber: invoiceNumber || undefined,
        createdAt: dateToSave
      }
    });
  }
}

module.exports = new PurchaseService();
