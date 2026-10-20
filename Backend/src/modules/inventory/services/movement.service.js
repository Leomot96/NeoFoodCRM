const prisma = require('../../../config/prisma');

class MovementService {
  
  // Movimiento manual (Entradas, Salidas por avería, Ajustes) tanto para insumos de bodega como productos
  async registerManualMovement(data, userId) {
    const { ingredientId, productId, type, quantity, reason } = data; // type: 'IN', 'OUT', 'ADJUSTMENT' | 'SET'
    const normalizedType = type === 'SET' ? 'ADJUSTMENT' : type;

    const numericQuantity = parseFloat(quantity);
    if (isNaN(numericQuantity) || numericQuantity < 0) {
      throw Object.assign(new Error('La cantidad ingresada no es válida'), { statusCode: 400 });
    }
    if ((normalizedType === 'IN' || normalizedType === 'OUT') && numericQuantity <= 0) {
      throw Object.assign(new Error('La cantidad a sumar o restar debe ser mayor a 0'), { statusCode: 400 });
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Ajuste de Producto de Catálogo
      if (productId) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
        }

        const currentStock = parseFloat(product.stock || 0);
        let stockChange = 0;

        if (normalizedType === 'IN') stockChange = numericQuantity;
        if (normalizedType === 'OUT') stockChange = -numericQuantity;
        if (normalizedType === 'ADJUSTMENT') stockChange = numericQuantity - currentStock;

        const newStock = currentStock + stockChange;
        if (newStock < 0) {
          throw Object.assign(new Error(`El movimiento resulta en stock negativo (Stock actual: ${currentStock})`), { statusCode: 400 });
        }

        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock, trackStock: true }
        });

        return {
          productId,
          productName: product.name,
          type: normalizedType,
          quantity: Math.abs(stockChange),
          newStock,
          reason: reason || 'Ajuste manual de stock de producto'
        };
      }

      // 2. Ajuste de Insumo / Materia Prima de Bodega
      if (!ingredientId) {
        throw Object.assign(new Error('Debe especificar un insumo o producto para registrar el movimiento'), { statusCode: 400 });
      }

      const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId } });
      if (!ingredient) {
        throw Object.assign(new Error('Ingrediente no encontrado'), { statusCode: 404 });
      }

      const currentStock = parseFloat(ingredient.currentStock || 0);
      let stockChange = 0;

      if (normalizedType === 'IN') stockChange = numericQuantity;
      if (normalizedType === 'OUT') stockChange = -numericQuantity;
      if (normalizedType === 'ADJUSTMENT') stockChange = numericQuantity - currentStock;

      const newStock = currentStock + stockChange;
      
      if (newStock < 0) {
        throw Object.assign(new Error(`El movimiento resulta en stock negativo (Stock actual: ${currentStock})`), { statusCode: 400 });
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          ingredientId,
          userId,
          type: normalizedType,
          quantity: Math.abs(stockChange),
          reason: reason || 'Movimiento manual',
        }
      });

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: newStock }
      });

      return {
        ...movement,
        newStock,
        ingredientName: ingredient.name
      };
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