const prisma = require('../../../config/prisma');

class MovementService {
  
  // Movimiento manual (Entradas, Salidas por avería, Ajustes)
  async registerManualMovement(data, userId) {
    const { ingredientId, type, quantity, reason } = data; // type: 'IN', 'OUT', 'ADJUSTMENT'

    return await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId } });
      if (!ingredient) {
        throw Object.assign(new Error('Ingrediente no encontrado'), { statusCode: 404 });
      }

      const numericQuantity = parseFloat(quantity);
      let stockChange = 0;

      if (type === 'IN') stockChange = numericQuantity;
      if (type === 'OUT') stockChange = -numericQuantity;
      if (type === 'ADJUSTMENT') stockChange = numericQuantity - parseFloat(ingredient.currentStock);

      const newStock = parseFloat(ingredient.currentStock) + stockChange;
      
      if (newStock < 0) {
        throw Object.assign(new Error('El movimiento resulta en stock negativo'), { statusCode: 400 });
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          ingredientId,
          userId,
          type,
          quantity: Math.abs(stockChange),
          reason: reason || 'Movimiento manual',
        }
      });

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: newStock }
      });

      return movement;
    });
  }

  // Movimiento Automático (Ventas) unificado con costeo
  async processSaleInventoryAndCost(processedDetails, invoiceNumber, tenantId, userId, tx) {
    const costedDetails = [];

    for (const item of processedDetails) {
      let totalInventoryCostForOne = 0;
      const pd = item; // El producto base (ya fue expandido con ...product)
      const quantity = parseInt(item.quantity, 10);
      
      // Helper para deducir un ingrediente y sumar costo
      const deductIngredient = async (ingId, qtyNeeded, reason) => {
        const ing = await tx.ingredient.findUnique({ where: { id: ingId } });
        if (ing) {
          await tx.inventoryMovement.create({
            data: {
              tenantId,
              ingredientId: ingId,
              userId,
              type: 'OUT',
              quantity: qtyNeeded,
              reason
            }
          });
          await tx.ingredient.update({
            where: { id: ingId },
            data: { currentStock: { decrement: qtyNeeded } }
          });
          // Usamos averageCost para el costeo. Si es 0, usamos costPerUnit o lastCost como fallback.
          let costToUse = parseFloat(ing.averageCost);
          if (costToUse === 0) costToUse = parseFloat(ing.costPerUnit || ing.lastCost || 0);
          
          return costToUse * qtyNeeded;
        }
        return 0;
      };

      // A. Descuento de Receta Base
      if (pd.trackStock) {
        // Disminuir el stock visual del producto (para el POS)
        await tx.product.update({ where: { id: pd.id }, data: { stock: { decrement: quantity } } });
      }
      
      // Siempre deducimos de la receta de inventario (Ingredients)
      if (pd.ingredients && pd.ingredients.length > 0) {
        for (const prodIng of pd.ingredients) {
          const totalQty = parseFloat(prodIng.quantity) * quantity;
          const cost = await deductIngredient(prodIng.ingredientId, totalQty, `Venta ${invoiceNumber} (${pd.name})`);
          totalInventoryCostForOne += (cost / quantity);
        }
      }

      // B. Descuento de Adiciones
      const additionsList = item.additions || [];
      for (const add of additionsList) {
        const additionId = add.additionId || add.id;
        if (additionId) {
          const prodAdd = await tx.productAddition.findUnique({ where: { id: additionId } });
          if (prodAdd && prodAdd.ingredientId && prodAdd.quantity) {
            const addMultiplier = parseInt(add.quantity || 1, 10);
            const totalAddQty = parseFloat(prodAdd.quantity) * addMultiplier * quantity;
            const cost = await deductIngredient(prodAdd.ingredientId, totalAddQty, `Venta ${invoiceNumber} (Adición: ${prodAdd.name})`);
            totalInventoryCostForOne += (cost / quantity);
          }
        }
      }

      // C. Descuento de Variedades / Bases / Opciones
      const variationsList = item.modifiers || item.variations || [];
      for (const v of variationsList) {
        const variationId = typeof v === 'string' ? v : (v.variationId || v.modifierId || v.id);
        if (variationId) {
          const opt = await tx.productModifierOption.findUnique({
            where: { id: variationId },
            include: {
              ingredients: true,
              linkedProduct: { include: { ingredients: true } }
            }
          });

          if (opt) {
            // 1. Insumo directo
            if (opt.ingredientId && opt.quantity) {
              const totalVarQty = parseFloat(opt.quantity) * quantity;
              const cost = await deductIngredient(opt.ingredientId, totalVarQty, `Venta ${invoiceNumber} (Variedad: ${opt.name})`);
              totalInventoryCostForOne += (cost / quantity);
            }

            // 2. Múltiples insumos
            if (opt.ingredients && opt.ingredients.length > 0) {
              for (const optIng of opt.ingredients) {
                const totalOptIngQty = parseFloat(optIng.quantity) * quantity;
                const cost = await deductIngredient(optIng.ingredientId, totalOptIngQty, `Venta ${invoiceNumber} (Variedad: ${opt.name})`);
                totalInventoryCostForOne += (cost / quantity);
              }
            }

            // 3. Producto ligado (Combo)
            if (opt.linkedProduct) {
              if (opt.linkedProduct.trackStock) {
                await tx.product.update({
                  where: { id: opt.linkedProduct.id },
                  data: { stock: { decrement: quantity } }
                });
              }
              if (opt.linkedProduct.ingredients && opt.linkedProduct.ingredients.length > 0) {
                for (const linkedIng of opt.linkedProduct.ingredients) {
                  const totalLinkedQty = parseFloat(linkedIng.quantity) * quantity;
                  const cost = await deductIngredient(linkedIng.ingredientId, totalLinkedQty, `Venta ${invoiceNumber} (Combo: ${opt.linkedProduct.name})`);
                  totalInventoryCostForOne += (cost / quantity);
                }
              }
            }
          }
        }
      }

      costedDetails.push({
        ...item,
        unitCost: totalInventoryCostForOne,
        totalCost: totalInventoryCostForOne * quantity
      });
    }

    return costedDetails;
  }
}

module.exports = new MovementService();