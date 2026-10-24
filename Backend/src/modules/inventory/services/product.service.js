const prisma = require("../../../config/prisma");
const { deleteUploadedFile } = require("../../../utils/fileCleaner");
const { getTenantId } = require("../../../context/tenantContext");
const { compareProducts } = require("../../../utils/categoryOrder");

class ProductService {
  // =====================================
  // OBTENER TODOS LOS PRODUCTOS
  // =====================================
  async getAllProducts() {
    const tenantId = getTenantId();
    const where = {};
    if (tenantId) where.tenantId = tenantId;

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
        modifiers: {
          include: {
            options: {
              include: {
                ingredient: true,
                ingredients: { include: { ingredient: true } },
                linkedProduct: {
                  include: {
                    ingredients: { include: { ingredient: true } },
                  },
                },
              },
            },
          },
        },
        additions: { include: { ingredient: true } },
      },
      orderBy: { name: "asc" },
    });

    return products.sort(compareProducts);
  }

  // =====================================
  // OBTENER PRODUCTO POR ID
  // =====================================
  async getProductById(id) {
    const tenantId = getTenantId();
    const where = { id };
    if (tenantId) where.tenantId = tenantId;

    const product = await prisma.product.findFirst({
      where,
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
        modifiers: {
          include: {
            options: {
              include: {
                ingredient: true,
                ingredients: { include: { ingredient: true } },
                linkedProduct: true,
              },
            },
          },
        },
        additions: { include: { ingredient: true } },
      },
    });

    if (!product) {
      const error = new Error('Producto no encontrado');
      error.statusCode = 404;
      throw error;
    }
    return product;
  }

  // =====================================
  // CREAR PRODUCTO CON RELACIONES
  // =====================================
  async createProduct(data) {
    const tenantId = getTenantId();
    const {
      name,
      description,
      price,
      imageUrl,
      categoryId,
      showInStore = true,
      trackStock,
      isCombo,
      stock,
      ingredients,
      modifiers,
      additions,
    } = data;

    // Si ya existía un producto inactivo con el mismo nombre y categoría en este restaurante, lo reactivamos
    const whereInactive = {
      name: { equals: name },
      categoryId: categoryId,
      isAvailable: false
    };
    if (tenantId) whereInactive.tenantId = tenantId;

    const existingInactive = await prisma.product.findFirst({
      where: whereInactive
    });

    if (existingInactive) {
      return await this.updateProduct(existingInactive.id, {
        ...data,
        isAvailable: true
      });
    }

    return await prisma.product.create({
      data: {
        ...(tenantId && !data.tenantId ? { tenantId } : {}),
        name,
        description,
        price,
        imageUrl: imageUrl || null,
        categoryId,
        showInStore: showInStore !== undefined ? Boolean(showInStore) : true,
        trackStock,
        isCombo: Boolean(isCombo),
        stock,

        // 1. Receta (Ingredientes)
        ingredients:
          ingredients?.length > 0
            ? {
                create: ingredients
                  .filter(
                    (ing) => ing.ingredientId && ing.ingredientId.trim() !== "",
                  )
                  .map((ing) => ({
                    ingredientId: ing.ingredientId,
                    quantity: ing.quantity,
                  })),
              }
            : undefined,

        // 2. Modificadores y sus Opciones anidadas
        modifiers:
          modifiers?.length > 0
            ? {
                create: modifiers.map((mod) => ({
                  name: mod.name,
                  isRequired: mod.isRequired !== false,
                  options: {
                    create: mod.options.map((opt) => ({
                      name: opt.name,
                      priceExtra: opt.priceExtra || 0,
                      ingredientId: opt.ingredientId || null,
                      quantity: opt.quantity ? opt.quantity : null,
                      linkedProductId: opt.linkedProductId || null,
                      ingredients:
                        opt.ingredients?.length > 0
                          ? {
                              create: opt.ingredients.map((oi) => ({
                                ingredientId: oi.ingredientId,
                                quantity: oi.quantity,
                              })),
                            }
                          : undefined,
                    })),
                  },
                })),
              }
            : undefined,

        // 3. Adiciones
        additions:
          additions?.length > 0
            ? {
                create: additions.map((add) => ({
                  name: add.name,
                  price: add.price,
                  ingredientId: add.ingredientId || null,
                  quantity: add.quantity || null,
                })),
              }
            : undefined,
      },
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
        modifiers: {
          include: {
            options: {
              include: {
                ingredient: true,
                ingredients: { include: { ingredient: true } },
                linkedProduct: true,
              },
            },
          },
        },
        additions: { include: { ingredient: true } },
      },
    });
  }

  // =====================================
  // ACTUALIZAR PRODUCTO (REEMPLAZO TOTAL)
  // =====================================
  async updateProduct(id, data) {
    const {
      name,
      description,
      price,
      imageUrl,
      categoryId,
      showInStore,
      trackStock,
      isCombo,
      stock,
      ingredients,
      modifiers,
      additions,
    } = data;

    // Si viene imageUrl y es distinto al actual, eliminamos la imagen física previa
    if (imageUrl !== undefined) {
      const current = await prisma.product.findUnique({
        where: { id },
        select: { imageUrl: true }
      });
      if (current?.imageUrl && current.imageUrl !== imageUrl) {
        deleteUploadedFile(current.imageUrl);
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Borramos las relaciones anteriores
      await tx.productIngredient.deleteMany({ where: { productId: id } });
      await tx.productModifier.deleteMany({ where: { productId: id } });
      await tx.productAddition.deleteMany({ where: { productId: id } });

      // 2. Actualizamos el producto e insertamos la nueva configuración
      return await tx.product.update({
        where: { id },
        data: {
          name,
          description,
          price,
          imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
          categoryId,
          showInStore: showInStore !== undefined ? Boolean(showInStore) : undefined,
          trackStock,
          isCombo: Boolean(isCombo),
          stock,

          ingredients:
            ingredients?.length > 0
              ? {
                  create: ingredients
                    .filter(
                      (ing) =>
                        ing.ingredientId && ing.ingredientId.trim() !== "",
                    )
                    .map((ing) => ({
                      ingredientId: ing.ingredientId,
                      quantity: ing.quantity,
                    })),
                }
              : undefined,

          modifiers:
            modifiers?.length > 0
              ? {
                  create: modifiers.map((mod) => ({
                    name: mod.name,
                    isRequired: mod.isRequired !== false,
                    options: {
                      create: mod.options.map((opt) => ({
                        name: opt.name,
                        priceExtra: opt.priceExtra || 0,
                        ingredientId: opt.ingredientId || null,
                        quantity: opt.quantity ? opt.quantity : null,
                        linkedProductId: opt.linkedProductId || null,
                        ingredients:
                          opt.ingredients?.length > 0
                            ? {
                                create: opt.ingredients.map((oi) => ({
                                  ingredientId: oi.ingredientId,
                                  quantity: oi.quantity,
                                })),
                              }
                            : undefined,
                      })),
                    },
                  })),
                }
              : undefined,

          additions:
            additions?.length > 0
              ? {
                  create: additions.map((add) => ({
                    name: add.name,
                    price: add.price,
                    ingredientId: add.ingredientId || null,
                    quantity: add.quantity || null,
                  })),
                }
              : undefined,
        },
        include: {
          category: true,
          ingredients: { include: { ingredient: true } },
          modifiers: {
            include: {
              options: {
                include: {
                  ingredient: true,
                  ingredients: { include: { ingredient: true } },
                  linkedProduct: true,
                },
              },
            },
          },
          additions: { include: { ingredient: true } },
        },
      });
    });
  }

  // =====================================
  // ELIMINAR / DESACTIVAR PRODUCTO
  // =====================================
  async deleteProduct(id) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      const error = new Error('Producto no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const [salesCount, ordersCount] = await Promise.all([
      prisma.saleDetail.count({ where: { productId: id } }),
      prisma.orderDetail.count({ where: { productId: id } }),
    ]);

    if (salesCount > 0 || ordersCount > 0) {
      // Tiene historial de ventas o pedidos -> Desactivar (Soft delete)
      await prisma.product.update({
        where: { id },
        data: { isAvailable: false },
      });

      return {
        action: 'deactivated',
        message: `El producto "${product.name}" tiene historial de ventas/pedidos, por lo que fue desactivado de la carta para proteger tus reportes.`
      };
    }

    // No tiene historial de ventas ni pedidos -> Borrado permanente (Hard delete)
    await prisma.product.delete({ where: { id } });
    return {
      action: 'deleted',
      message: `El producto "${product.name}" fue eliminado permanentemente.`
    };
  }
}

module.exports = new ProductService();
