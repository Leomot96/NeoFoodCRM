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

  // Movimiento Automático (Llamado desde el módulo de Ventas/Pedidos)
  async deductInventoryForOrder(orderId, userId, prismaTx = prisma) {
    const order = await prismaTx.order.findUnique({
      where: { id: orderId },
      include: {
        details: {
          include: {
            product: {
              include: { ingredients: true }
            }
          }
        }
      }
    });

    if (!order) throw new Error('Pedido no encontrado');

    for (const detail of order.details) {
      const product = detail.product;
      const orderQty = detail.quantity;

      if (product.trackStock) {
        // Producto de venta directa (Ej: Gaseosas)
        await prismaTx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: orderQty } }
        });
      } else {
        // Producto preparado (Ej: Hamburguesas). Deducir ingredientes
        for (const prodIng of product.ingredients) {
          const totalIngredientQty = parseFloat(prodIng.quantity) * orderQty;

          await prismaTx.inventoryMovement.create({
            data: {
              ingredientId: prodIng.ingredientId,
              userId,
              type: 'OUT',
              quantity: totalIngredientQty,
              reason: `Venta automática. Pedido #${order.orderNumber}`,
            }
          });

          await prismaTx.ingredient.update({
            where: { id: prodIng.ingredientId },
            data: { currentStock: { decrement: totalIngredientQty } }
          });
        }
      }
    }
    return true;
  }
}

module.exports = new MovementService();