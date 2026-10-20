const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class IngredientService {
  async createIngredient(data) {
    const tenantId = getTenantId();
    const whereExisting = { name: { equals: data.name } };
    if (tenantId) whereExisting.tenantId = tenantId;

    const existing = await prisma.ingredient.findFirst({
      where: whereExisting
    });
    if (existing) {
      if (!existing.isActive) {
        // Si ya existía pero estaba desactivado, lo reactivamos con los datos nuevos
        return await this.updateIngredient(existing.id, {
          ...data,
          isActive: true
        });
      }
      const error = new Error(`Ya existe un ingrediente activo llamado "${data.name}"`);
      error.statusCode = 400;
      throw error;
    }

  return await prisma.ingredient.create({
      data: {
        tenantId: data.tenantId || tenantId || 'default-tenant-001',
        name: data.name,
        unit: data.unit || 'Unidad',
        minStock: data.minStock ? parseFloat(data.minStock) : 0,
        currentStock: 0, // Siempre arranca en 0. Las compras aumentan este valor.
        costPerUnit: 0, // Lo inicializamos en 0 (opcional, pero buena práctica)
        isManufactured: data.isManufactured || false,
        recipeIngredients: data.recipeIngredients && data.recipeIngredients.length > 0 ? {
          create: data.recipeIngredients.map(r => ({
            inputIngredientId: r.inputIngredientId,
            quantity: r.quantity,
            unit: r.unit
          }))
        } : undefined
      }});
  }

  async getAllIngredients(query = {}) {
    const tenantId = getTenantId();
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.includeInactive !== 'true' && query.includeInactive !== true) {
      where.isActive = true;
    }

    const list = await prisma.ingredient.findMany({
      where,
      include: {
        recipeIngredients: {
          include: {
            inputIngredient: true
          }
        },
        usedInRecipes: {
          select: {
            id: true,
            outputIngredientId: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    return list.map(item => ({
      ...item,
      isUsedInProduction: Boolean(item.usedInRecipes && item.usedInRecipes.length > 0)
    }));
  }

  async getIngredientById(id) {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      const error = new Error('Ingrediente no encontrado');
      error.statusCode = 404;
      throw error;
    }
    return ingredient;
  }

  async updateIngredient(id, data) {
    await this.getIngredientById(id);
    
    const updateData = { ...data };
    
    // Si viene la receta, actualizamos (borramos anteriores y creamos nuevas)
    if (updateData.recipeIngredients !== undefined) {
      const recipes = updateData.recipeIngredients;
      delete updateData.recipeIngredients;
      
      updateData.recipeIngredients = {
        deleteMany: {},
        create: recipes.map(r => ({
          inputIngredientId: r.inputIngredientId,
          quantity: r.quantity,
          unit: r.unit
        }))
      };
    }

    return await prisma.ingredient.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteIngredient(id) {
    const ingredient = await this.getIngredientById(id);

    // Verificamos si tiene historial transaccional
    const [
      purchasesCount,
      movesCount,
      productionOrdersCount,
      productionConsumptionsCount,
    ] = await Promise.all([
      prisma.purchaseDetail.count({ where: { ingredientId: id } }),
      prisma.inventoryMovement.count({ where: { ingredientId: id } }),
      prisma.productionOrder.count({ where: { ingredientId: id } }),
      prisma.productionConsumption.count({ where: { ingredientId: id } }),
    ]);

    const hasHistory = (purchasesCount + movesCount + productionOrdersCount + productionConsumptionsCount) > 0;

    if (hasHistory) {
      // DESACTIVACIÓN (Soft delete): se oculta del inventario activo pero se mantiene su historial contable
      await prisma.ingredient.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        action: 'deactivated',
        message: `El insumo "${ingredient.name}" tiene historial de compras/kárdex, por lo que fue desactivado del inventario activo para proteger la integridad contable.`
      };
    }

    // Si NO tiene historial de compras, kárdex ni producción, se elimina permanentemente
    await prisma.ingredient.delete({ where: { id } });
    return {
      action: 'deleted',
      message: `El insumo "${ingredient.name}" fue eliminado permanentemente.`
    };
  }

  // Alertas de Stock Mínimo
  async getLowStockAlerts() {
    return await prisma.ingredient.findMany({
      where: {
        isActive: true,
        currentStock: {
          lte: prisma.ingredient.fields.minStock
        }
      },
      orderBy: { currentStock: 'asc' }
    });
  }

  // Historial / Kardex de un ingrediente
  async getKardex(ingredientId) {
    await this.getIngredientById(ingredientId);
    return await prisma.inventoryMovement.findMany({
      where: { ingredientId },
      include: {
        user: { select: { name: true, role: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

module.exports = new IngredientService();