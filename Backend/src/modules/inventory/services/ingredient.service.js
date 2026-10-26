const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class IngredientService {
  async _validateRecipeInputs(recipeIngredients, tenantId, selfId = null) {
    if (!Array.isArray(recipeIngredients) || recipeIngredients.length === 0) return;
    const inputIds = [...new Set(recipeIngredients.map(r => r.inputIngredientId).filter(Boolean))];
    if (inputIds.length === 0) return;
    if (selfId && inputIds.includes(selfId)) {
      const error = new Error('Un insumo elaborado no puede incluirse a sí mismo dentro de su propia receta.');
      error.statusCode = 400;
      throw error;
    }
    const count = await prisma.ingredient.count({
      where: {
        id: { in: inputIds },
        ...(tenantId ? { tenantId } : {})
      }
    });
    if (count !== inputIds.length) {
      const error = new Error('Uno o más insumos de la sub-receta no existen o no pertenecen a este establecimiento.');
      error.statusCode = 400;
      throw error;
    }
  }

  async createIngredient(data) {
    const tenantId = getTenantId();
    const whereExisting = { name: { equals: data.name } };
    if (tenantId) whereExisting.tenantId = tenantId;

    const existing = await prisma.ingredient.findFirst({
      where: whereExisting
    });
    if (existing) {
      if (!existing.isActive) {
        return await this.updateIngredient(existing.id, {
          ...data,
          isActive: true
        });
      }
      const error = new Error(`Ya existe un ingrediente activo llamado "${data.name}"`);
      error.statusCode = 400;
      throw error;
    }

    await this._validateRecipeInputs(data.recipeIngredients, tenantId);

    return await prisma.ingredient.create({
      data: {
        tenantId: tenantId || data.tenantId || 'default-tenant-001',
        name: data.name,
        unit: data.unit || 'Unidad',
        minStock: data.minStock ? parseFloat(data.minStock) : 0,
        currentStock: 0,
        costPerUnit: 0,
        isManufactured: Boolean(data.isManufactured),
        recipeIngredients: data.recipeIngredients && data.recipeIngredients.length > 0 ? {
          create: data.recipeIngredients.map(r => ({
            inputIngredientId: r.inputIngredientId,
            quantity: r.quantity,
            unit: r.unit
          }))
        } : undefined
      }
    });
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
    const tenantId = getTenantId();

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.minStock !== undefined) updateData.minStock = parseFloat(data.minStock) || 0;
    if (data.isManufactured !== undefined) updateData.isManufactured = Boolean(data.isManufactured);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    // Si viene la receta, validamos pertenencia de insumos y actualizamos
    if (data.recipeIngredients !== undefined) {
      const recipes = Array.isArray(data.recipeIngredients) ? data.recipeIngredients : [];
      await this._validateRecipeInputs(recipes, tenantId, id);

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

    // Verificamos si tiene historial transaccional o está vinculado en recetas/adiciones/modificadores
    const [
      purchasesCount,
      movesCount,
      productionOrdersCount,
      productionConsumptionsCount,
      productIngredientsCount,
      productAdditionsCount,
      modifierOptionsCount,
      usedInSubRecipesCount,
    ] = await Promise.all([
      prisma.purchaseDetail.count({ where: { ingredientId: id } }),
      prisma.inventoryMovement.count({ where: { ingredientId: id } }),
      prisma.productionOrder.count({ where: { ingredientId: id } }),
      prisma.productionConsumption.count({ where: { ingredientId: id } }),
      prisma.productIngredient.count({ where: { ingredientId: id } }),
      prisma.productAddition.count({ where: { ingredientId: id } }),
      prisma.productModifierOption.count({ where: { ingredientId: id } }),
      prisma.ingredientRecipe.count({ where: { inputIngredientId: id } }),
    ]);

    const hasHistory = (
      purchasesCount +
      movesCount +
      productionOrdersCount +
      productionConsumptionsCount +
      productIngredientsCount +
      productAdditionsCount +
      modifierOptionsCount +
      usedInSubRecipesCount
    ) > 0;

    if (hasHistory) {
      await prisma.ingredient.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        action: 'deactivated',
        message: `El insumo "${ingredient.name}" tiene historial o está vinculado en recetas/productos, por lo que fue desactivado del inventario activo para proteger la integridad contable.`
      };
    }

    await prisma.ingredientRecipe.deleteMany({ where: { outputIngredientId: id } });
    await prisma.ingredient.delete({ where: { id } });
    return {
      action: 'deleted',
      message: `El insumo "${ingredient.name}" fue eliminado permanentemente.`
    };
  }

  // Alertas de Stock Mínimo
  async getLowStockAlerts() {
    const tenantId = getTenantId();
    const activeIngredients = await prisma.ingredient.findMany({
      where: {
        isActive: true,
        ...(tenantId ? { tenantId } : {})
      },
      orderBy: { currentStock: 'asc' }
    });
    return activeIngredients.filter(
      ing => parseFloat(ing.currentStock || 0) <= parseFloat(ing.minStock || 0)
    );
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
