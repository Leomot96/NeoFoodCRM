const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');
const { compareCategories } = require('../../../utils/categoryOrder');

class CategoryService {

  async createCategory(data) {
    const tenantId = getTenantId();
    const whereExisting = { name: data.name };
    if (tenantId) whereExisting.tenantId = tenantId;

    // 1. Buscamos si ya existe alguna en la base de datos con ese nombre exacto para este restaurante
    const existing = await prisma.category.findFirst({
      where: whereExisting
    });

    if (existing) {
      // 2. Si existe pero está inactiva (fue "eliminada"), la revivimos
      if (!existing.isActive) {
        return await prisma.category.update({
          where: { id: existing.id },
          data: {
            isActive: true, // La volvemos a mostrar
            description: data.description || existing.description // Actualizamos su descripción
          }
        });
      } else {
        // 3. Si existe y está activa, lanzamos el error normal de duplicado
        const error = new Error('Ya existe una categoría activa con este nombre');
        error.statusCode = 400;
        throw error;
      }
    }

    // 4. Si no existía para nada, la creamos normal
    return await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        ...(tenantId ? { tenantId } : {})
      }
    });
  }

  async getAllCategories() {
    const tenantId = getTenantId();
    const where = {
      isActive: true,
    };
    if (tenantId) where.tenantId = tenantId;

    const categories = await prisma.category.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    return categories.sort(compareCategories);
  }

  async getCategoryById(id) {
    const tenantId = getTenantId();
    const where = { id };
    if (tenantId) where.tenantId = tenantId;

    const category = await prisma.category.findFirst({ where });
    if (!category) {
      const error = new Error('Categoría no encontrada');
      error.statusCode = 404;
      throw error;
    }
    return category;
  }

  async updateCategory(id, data) {
    await this.getCategoryById(id); // Verifica si existe en el tenant actual
    return await prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id) {
    await this.getCategoryById(id);
    // Soft delete (Desactivación) para mantener el historial
    return await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

module.exports = new CategoryService();