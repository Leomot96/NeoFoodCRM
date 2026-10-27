const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');
const { compareCategories } = require('../../../utils/categoryOrder');

class CategoryService {

  async createCategory(data) {
    const tenantId = getTenantId();

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      const error = new Error('El nombre de la categoría es obligatorio');
      error.statusCode = 400;
      throw error;
    }
    const normalizedName = data.name.trim();

    const whereExisting = {
      name: { equals: normalizedName, mode: 'insensitive' }
    };
    if (tenantId) whereExisting.tenantId = tenantId;

    // 1. Buscamos si ya existe alguna en la base de datos con ese nombre para este restaurante
    const existing = await prisma.category.findFirst({
      where: whereExisting
    });

    if (existing) {
      // 2. Si existe pero está inactiva (fue "eliminada"), la revivimos
      if (!existing.isActive) {
        return await prisma.category.update({
          where: { id: existing.id },
          data: {
            name: normalizedName,
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
        name: normalizedName,
        description: data.description ? String(data.description).trim() : null,
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
    const existing = await this.getCategoryById(id); // Verifica si existe en el tenant actual
    const tenantId = getTenantId() || existing.tenantId;

    const allowedFields = ['name', 'description', 'isActive'];
    const safeData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        safeData[key] = data[key];
      }
    }

    if (safeData.name !== undefined) {
      if (!safeData.name || typeof safeData.name !== 'string' || !safeData.name.trim()) {
        const error = new Error('El nombre de la categoría no puede estar vacío');
        error.statusCode = 400;
        throw error;
      }
      safeData.name = safeData.name.trim();
      const duplicate = await prisma.category.findFirst({
        where: {
          name: { equals: safeData.name, mode: 'insensitive' },
          id: { not: id },
          isActive: true,
          ...(tenantId ? { tenantId } : {})
        }
      });
      if (duplicate) {
        const error = new Error('Ya existe otra categoría activa con este nombre');
        error.statusCode = 400;
        throw error;
      }
    }

    if (safeData.description !== undefined && typeof safeData.description === 'string') {
      safeData.description = safeData.description.trim();
    }

    return await prisma.category.update({
      where: { id },
      data: safeData,
    });
  }

  async deleteCategory(id) {
    const category = await this.getCategoryById(id);
    const tenantId = getTenantId();

    const activeProductsCount = await prisma.product.count({
      where: {
        categoryId: id,
        isAvailable: true,
        ...(tenantId ? { tenantId } : {})
      }
    });

    if (activeProductsCount > 0) {
      throw Object.assign(
        new Error(`No se puede eliminar la categoría "${category.name}" porque contiene ${activeProductsCount} producto(s) activo(s). Reasigna o desactiva los productos antes de eliminarla.`),
        { statusCode: 400 }
      );
    }

    // Soft delete (Desactivación) para mantener el historial
    return await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

module.exports = new CategoryService();
