const prisma = require('../../../config/prisma');

class ProductionService {
  
  // ==========================================
  // 1. CREACIÓN DE LOTE DE PRODUCCIÓN
  // ==========================================
  async createProductionOrder(data, userId) {
    const { ingredientId, quantityProduced, notes, tenantId } = data;
    
    const quantity = parseFloat(quantityProduced);
    if (isNaN(quantity) || quantity <= 0) {
      throw Object.assign(new Error('La cantidad a producir debe ser mayor a 0'), { statusCode: 400 });
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Validar el ingrediente a producir
      const manufacturedIngredient = await tx.ingredient.findUnique({
        where: { id: ingredientId },
        include: {
          recipeIngredients: {
            include: { inputIngredient: true }
          }
        }
      });

      if (!manufacturedIngredient) {
        throw Object.assign(new Error('El ingrediente elaborado no existe'), { statusCode: 404 });
      }

      if (!manufacturedIngredient.isManufactured) {
        throw Object.assign(new Error('Este artículo no está configurado como "Elaborado/Fabricado"'), { statusCode: 400 });
      }

      const recipe = manufacturedIngredient.recipeIngredients;
      if (!recipe || recipe.length === 0) {
        throw Object.assign(new Error('El artículo no tiene una receta configurada para su producción'), { statusCode: 400 });
      }

      // 2. Calcular consumos y costos
      let totalProductionCost = 0;
      const consumptions = [];

      for (const req of recipe) {
        const qtyRequired = parseFloat(req.quantity) * quantity;
        const rawIngredient = req.inputIngredient;
        
        // Determinar el costo del insumo (CMP > costPerUnit > lastCost)
        let costToUse = parseFloat(rawIngredient.averageCost);
        if (costToUse === 0) {
          costToUse = parseFloat(rawIngredient.costPerUnit || rawIngredient.lastCost || 0);
        }

        const totalCostForRaw = costToUse * qtyRequired;
        totalProductionCost += totalCostForRaw;

        consumptions.push({
          ingredientId: rawIngredient.id,
          quantity: qtyRequired,
          unitCost: costToUse,
          totalCost: totalCostForRaw
        });

        // Descontar inventario de la materia prima
        await tx.ingredient.update({
          where: { id: rawIngredient.id },
          data: { currentStock: { decrement: qtyRequired } }
        });

        // Registrar movimiento OUT
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            ingredientId: rawIngredient.id,
            userId,
            type: 'OUT',
            quantity: qtyRequired,
            reason: `Consumo por Producción de ${manufacturedIngredient.name}`
          }
        });
      }

      const unitCostProduced = totalProductionCost / quantity;

      // 3. Crear Orden de Producción
      const productionOrder = await tx.productionOrder.create({
        data: {
          tenantId,
          ingredientId: manufacturedIngredient.id,
          quantityProduced: quantity,
          totalCost: totalProductionCost,
          unitCost: unitCostProduced,
          status: 'COMPLETED',
          consumptions: {
            create: consumptions
          }
        },
        include: { consumptions: true }
      });

      // 4. Ingresar Inventario del producto elaborado
      const oldStock = parseFloat(manufacturedIngredient.currentStock || 0);
      const oldAvgCost = parseFloat(manufacturedIngredient.averageCost || manufacturedIngredient.costPerUnit || manufacturedIngredient.lastCost || 0);
      
      const newStock = oldStock + quantity;
      let newAvgCost = unitCostProduced;
      
      if (newStock > 0) {
          if (oldStock <= 0) {
              newAvgCost = unitCostProduced;
          } else {
              newAvgCost = ((oldStock * oldAvgCost) + (totalProductionCost)) / newStock;
          }
      }

      await tx.ingredient.update({
        where: { id: manufacturedIngredient.id },
        data: {
          currentStock: { increment: quantity },
          lastCost: unitCostProduced,
          averageCost: newAvgCost
        }
      });

      await tx.inventoryMovement.create({
        data: {
          tenantId,
          ingredientId: manufacturedIngredient.id,
          userId,
          type: 'IN',
          quantity: quantity,
          reason: `Lote de Producción #${productionOrder.id.slice(-6).toUpperCase()}`
        }
      });

      return productionOrder;
    });
  }

  // ==========================================
  // 2. LISTAR ORDENES DE PRODUCCIÓN
  // ==========================================
  async getProductionOrders(filters = {}) {
    const { tenantId, startDate, endDate, status, ingredientId } = filters;
    const where = {};

    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (ingredientId) where.ingredientId = ingredientId;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    return await prisma.productionOrder.findMany({
      where,
      include: {
        ingredient: { select: { name: true, unit: true } },
        consumptions: {
          include: {
            ingredient: { select: { name: true, unit: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ==========================================
  // 3. ANULACIÓN DE LOTE (Reversión)
  // ==========================================
  async cancelProductionOrder(orderId, userId, tenantId) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: orderId },
        include: { consumptions: true, ingredient: true }
      });

      if (!order) {
        throw Object.assign(new Error('Orden de producción no encontrada'), { statusCode: 404 });
      }
      
      if (tenantId && order.tenantId && order.tenantId !== tenantId) {
        throw Object.assign(new Error('Acceso no autorizado a esta orden'), { statusCode: 403 });
      }

      if (order.status === 'CANCELLED') {
        throw Object.assign(new Error('La orden ya está anulada'), { statusCode: 400 });
      }

      // Cambiar estado
      await tx.productionOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      const qtyProduced = parseFloat(order.quantityProduced);

      // Revertir el stock del elaborado (Quitarle stock)
      const currentManStock = parseFloat(order.ingredient.currentStock);
      if (currentManStock - qtyProduced < 0) {
        throw Object.assign(new Error(`No se puede anular: El stock del elaborado (${order.ingredient.name}) quedaría negativo. Puede que ya se haya vendido parte de este lote.`), { statusCode: 400 });
      }

      await tx.ingredient.update({
        where: { id: order.ingredientId },
        data: { currentStock: { decrement: qtyProduced } }
      });

      await tx.inventoryMovement.create({
        data: {
          tenantId: order.tenantId,
          ingredientId: order.ingredientId,
          userId,
          type: 'OUT',
          quantity: qtyProduced,
          reason: `Reversión Lote de Producción #${orderId.slice(-6).toUpperCase()}`
        }
      });

      // Revertir el stock de las materias primas (Devolver stock)
      for (const cons of order.consumptions) {
        const qtyToReturn = parseFloat(cons.quantity);

        await tx.ingredient.update({
          where: { id: cons.ingredientId },
          data: { currentStock: { increment: qtyToReturn } }
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId: order.tenantId,
            ingredientId: cons.ingredientId,
            userId,
            type: 'IN',
            quantity: qtyToReturn,
            reason: `Reversión Consumo Producción #${orderId.slice(-6).toUpperCase()}`
          }
        });
      }

      return { message: 'Orden de producción anulada con éxito' };
    });
  }
}

module.exports = new ProductionService();
