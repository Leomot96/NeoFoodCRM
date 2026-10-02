const prisma = require("../../../config/prisma");

class ProductService {
  // =====================================
  // OBTENER TODOS LOS PRODUCTOS
  // =====================================
  async getAllProducts() {
    return await prisma.product.findMany({
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
  }

  // =====================================
  // CREAR PRODUCTO CON RELACIONES
  // =====================================
  async createProduct(data) {
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

    return await prisma.product.create({
      data: {
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
  // ELIMINAR (DESACTIVAR) PRODUCTO
  // =====================================
  async deleteProduct(id) {
    return await prisma.product.update({
      where: { id },
      data: { isAvailable: false },
    });
  }
}

module.exports = new ProductService();
