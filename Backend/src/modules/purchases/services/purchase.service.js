const prisma = require('../../../config/prisma');

class PurchaseService {
  
  // ==========================================
  // CREACIÓN DE COMPRA (Actualiza Inventario)
  // ==========================================
  async createPurchase(data, userId) {
    const { supplierId, invoiceNumber, purchaseDate, details } = data;

    const dateToSave = purchaseDate ? new Date(`${purchaseDate}T12:00:00.000Z`) : undefined;

    if (!details || details.length === 0) {
      throw Object.assign(new Error('La compra debe incluir al menos un detalle (ingrediente)'), { statusCode: 400 });
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Calcular el costo total de la compra verificando los detalles
      let totalPurchaseCost = 0;
      const processedDetails = details.map(detail => {
        const qty = parseFloat(detail.quantity);
        const cost = parseFloat(detail.unitCost);
        const total = qty * cost;
        totalPurchaseCost += total;

        return {
          ingredientId: detail.ingredientId,
          quantity: qty,
          unitCost: cost,
          totalCost: total
        };
      });

      // 2. Crear la Compra Principal
      const purchase = await tx.purchase.create({
        data: {
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
            ingredientId: item.ingredientId,
            userId: userId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Compra. Factura: ${invoiceNumber || 'N/A'}`
          }
        });

        // Actualizar el stock actual del ingrediente (y el último costo unitario si se desea)
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { 
            currentStock: { increment: item.quantity },
            costPerUnit: item.unitCost // Actualiza al precio de la compra más reciente
          }
        });
      }

      return purchase;
    });
  }

  // ==========================================
  // ANULACIÓN DE COMPRA (Revierte Inventario)
  // ==========================================
  async cancelPurchase(purchaseId, userId) {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { details: true }
      });

      if (!purchase) throw Object.assign(new Error('Compra no encontrada'), { statusCode: 404 });
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
            ingredientId: item.ingredientId,
            userId: userId,
            type: 'OUT',
            quantity: item.quantity,
            reason: `Anulación de Compra #${purchase.id}`
          }
        });

        // Descontar del stock (se asume que la anulación es inmediata y el stock existe)
        const ingredient = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
        const newStock = parseFloat(ingredient.currentStock) - parseFloat(item.quantity);

        if (newStock < 0) {
          throw Object.assign(new Error(`No se puede anular: El ingrediente ${ingredient.name} quedaría con stock negativo`), { statusCode: 400 });
        }

        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: newStock }
        });
      }

      return cancelledPurchase;
    });
  }

  // ==========================================
  // HISTORIAL Y REPORTES
  // ==========================================
  async getPurchasesHistory(filters = {}) {
    const { startDate, endDate, supplierId, status } = filters;
    const whereClause = {};

    if (supplierId) whereClause.supplierId = supplierId;
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
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

  async getPurchaseById(id) {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        details: { include: { ingredient: true } }
      }
    });

    if (!purchase) throw Object.assign(new Error('Compra no encontrada'), { statusCode: 404 });
    return purchase;
  }

  async getPurchasesReport(startDate, endDate) {
    // Retorna el total gastado agrupado por proveedor en un rango de fechas
    const report = await prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _sum: {
        totalCost: true
      }
    });

    // Enriquecer con los nombres de los proveedores
    const enrichedReport = await Promise.all(report.map(async (row) => {
      const supplier = await prisma.supplier.findUnique({ where: { id: row.supplierId }, select: { name: true } });
      return {
        supplierName: supplier.name,
        totalSpent: row._sum.totalCost
      };
    }));

    return enrichedReport;
  }
  async updatePurchaseMetadata(id, data) {
    const { invoiceNumber, purchaseDate } = data;
    
    return await prisma.purchase.update({
      where: { id: String(id) },
      data: {
        invoiceNumber: invoiceNumber || undefined,
        createdAt: purchaseDate ? new Date(`${purchaseDate}T12:00:00.000Z`) : undefined
      }
    });
  }
}

module.exports = new PurchaseService();