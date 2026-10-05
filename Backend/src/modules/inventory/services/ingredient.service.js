const prisma = require('../../../config/prisma');

class IngredientService {
  async createIngredient(data) {
    const existing = await prisma.ingredient.findFirst({
      where: { name: { equals: data.name } } // Dependiendo de tu BD, puedes usar mode: 'insensitive'
    });
    if (existing) {
      const error = new Error(`Ya existe un ingrediente llamado "${data.name}"`);
      error.statusCode = 400;
      throw error;
    }

  return await prisma.ingredient.create({
      data: {
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

  async getAllIngredients() {
    const list = await prisma.ingredient.findMany({
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
    await this.getIngredientById(id);
    return await prisma.ingredient.delete({ where: { id } });
  }

  // Alertas de Stock Mínimo
  async getLowStockAlerts() {
    return await prisma.ingredient.findMany({
      where: {
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