const prisma = require('../../../config/prisma');

class CategoryService {

async createCategory(data) {
    // 1. Buscamos si ya existe alguna en la base de datos con ese nombre exacto
    const existing = await prisma.category.findFirst({
      where: { name: data.name }
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
        description: data.description
      }
    });
  }

  async getAllCategories() {
    return await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getCategoryById(id) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      const error = new Error('Categoría no encontrada');
      error.statusCode = 404;
      throw error;
    }
    return category;
  }

  async updateCategory(id, data) {
    await this.getCategoryById(id); // Verifica si existe
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