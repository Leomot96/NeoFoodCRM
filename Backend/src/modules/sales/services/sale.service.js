const prisma = require('../../../config/prisma');

class SaleService {
  
  // ==========================================
  // CREACIÓN DE VENTA Y DESCUENTO DE INVENTARIO
  // ==========================================
  async createSale(data, userId) {
    const { customerId, paymentMethodId, discount = 0, orderType = 'DINE_IN', notes, details, tableId, orderId } = data;

    if (!details || details.length === 0) {
      throw Object.assign(new Error('La venta debe incluir al menos un producto'), { statusCode: 400 });
    }

    let effectiveTenantId = data.tenantId || null;

    let activeSession = await prisma.cashSession.findFirst({
      where: { userId, status: 'OPEN' }
    });

    // Si el usuario no tiene una sesión individual abierta, verificamos si hay una caja abierta en su mismo establecimiento
    if (!activeSession && effectiveTenantId) {
      activeSession = await prisma.cashSession.findFirst({
        where: { tenantId: effectiveTenantId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' }
      });
    }

    if (!activeSession) {
      throw Object.assign(new Error('La caja se encuentra cerrada. Debes abrir la caja en el módulo de Caja antes de registrar ventas.'), { statusCode: 403 });
    }

    effectiveTenantId = effectiveTenantId || activeSession.tenantId || null;

    return await prisma.$transaction(async (tx) => {
      let subtotalTotal = 0;
      const processedDetails = [];

      for (const item of details) {
        const prodId = item.productId || item.product?.id;
        const product = await tx.product.findUnique({ 
          where: { id: prodId },
          include: { ingredients: true }
        });

        if (!product || !product.isAvailable) {
          throw Object.assign(new Error(`Producto no disponible`), { statusCode: 400 });
        }

        const quantity = parseInt(item.quantity, 10);
        const unitPrice = parseFloat(item.unitPrice || item.finalPrice || product.price);
        const subtotal = quantity * unitPrice;
        subtotalTotal += subtotal;

        processedDetails.push({ 
          ...product, 
          productId: product.id,
          quantity, 
          subtotal, 
          unitPrice, 
          notes: item.notes,
          modifiers: item.modifiers || item.variations || [],
          additions: item.additions || []
        });
      }

      const finalAmount = subtotalTotal - parseFloat(discount);

      // 1. Obtener orden existente de mesa o crear una nueva
      let order;
      if (orderId) {
        order = await tx.order.findUnique({ where: { id: orderId } });
        if (order) {
          await tx.orderDetail.deleteMany({ where: { orderId: order.id } });
          order = await tx.order.update({
            where: { id: order.id },
            data: {
              customerId: customerId || order.customerId,
              tableId: tableId || order.tableId,
              status: 'DELIVERED',
              notes: notes || order.notes,
              totalAmount: finalAmount,
              details: {
                create: processedDetails.map(pd => ({
                  productId: pd.id,
                  quantity: pd.quantity,
                  unitPrice: pd.unitPrice,
                  subtotal: pd.subtotal,
                  notes: pd.notes,
                  modifiers: pd.modifiers || [],
                  additions: pd.additions || []
                }))
              }
            }
          });
        }
      }

      if (!order) {
        order = await tx.order.create({
          data: {
            tenantId: effectiveTenantId,
            userId,
            customerId: customerId || null,
            tableId: tableId || null,
            status: 'DELIVERED',
            orderType,
            notes,
            totalAmount: finalAmount,
            details: {
              create: processedDetails.map(pd => ({
                productId: pd.id,
                quantity: pd.quantity,
                unitPrice: pd.unitPrice,
                subtotal: pd.subtotal,
                notes: pd.notes,
                modifiers: pd.modifiers || [],
                additions: pd.additions || []
              }))
            }
          }
        });
      }

      // 2. Determinar si es crédito
      const paymentMethod = await tx.paymentMethod.findUnique({ where: { id: String(paymentMethodId) } });
      if (!paymentMethod) {
        throw Object.assign(new Error('Método de pago no válido o no encontrado'), { statusCode: 400 });
      }
      const isCredit = paymentMethod.name.toLowerCase().includes('crédito') || 
                      paymentMethod.name.toLowerCase().includes('credito') || 
                      paymentMethod.name.toLowerCase().includes('fiao');

      // 3. Crear Venta
      const invoiceNumber = `FE-${Date.now().toString().slice(-6)}-${order.orderNumber}`;
      
      // Pre-verificar IDs válidos de opciones y adiciones para garantizar integridad
      const candidateVarIds = [];
      const candidateAddIds = [];
      details.forEach(item => {
        (item.variations || item.modifiers || []).forEach(v => {
          const vid = typeof v === 'string' ? v : (v.variationId || v.modifierId || v.id);
          if (vid) candidateVarIds.push(vid);
        });
        (item.additions || []).forEach(a => {
          const aid = a.additionId || a.id;
          if (aid) candidateAddIds.push(aid);
        });
      });

      const validOptions = candidateVarIds.length > 0 
        ? await tx.productModifierOption.findMany({ where: { id: { in: candidateVarIds } }, select: { id: true, name: true } })
        : [];
      const validOptionsMap = new Map(validOptions.map(o => [o.id, o.name]));

      const validAdditions = candidateAddIds.length > 0
        ? await tx.productAddition.findMany({ where: { id: { in: candidateAddIds } }, select: { id: true, name: true } })
        : [];
      const validAdditionsMap = new Map(validAdditions.map(a => [a.id, a.name]));

      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          totalAmount: finalAmount,
          finalAmount: finalAmount,
          discount: parseFloat(discount) || 0,
          tenantId: effectiveTenantId,
          orderId: order.id,
          paymentMethodId: paymentMethod.id,
          cashSessionId: activeSession.id,
          customerId: customerId || null,
          details: {
            create: details.map(item => {
              const detailData = {
                productId: item.productId || item.product?.id,
                quantity: parseInt(item.quantity, 10),
                unitPrice: parseFloat(item.unitPrice || item.finalPrice),
                subtotal: parseInt(item.quantity, 10) * parseFloat(item.unitPrice || item.finalPrice),
                notes: item.notes
              };

              // Si el producto trajo adiciones, las conectamos con su nombre
              if (item.additions && item.additions.length > 0) {
                detailData.saleDetailAdditions = {
                  create: item.additions.map(add => {
                    const rawId = add.additionId || add.id;
                    const isValid = validAdditionsMap.has(rawId);
                    return {
                      additionId: isValid ? rawId : null,
                      name: add.name || (isValid ? validAdditionsMap.get(rawId) : 'Adición Extra'),
                      quantity: add.quantity || 1,
                      price: parseFloat(add.price) || 0
                    };
                  })
                };
              }

              // Normalizamos variaciones o modificadores y guardamos su nombre
              const variationsList = item.variations || item.modifiers || [];
              if (variationsList.length > 0) {
                detailData.saleDetailVariations = {
                  create: variationsList.map(v => {
                    const rawId = typeof v === 'string' ? v : (v.variationId || v.modifierId || v.id);
                    const isValid = validOptionsMap.has(rawId);
                    const explicitName = typeof v === 'object' ? (v.name || v.optionName) : null;
                    return {
                      variationId: isValid ? rawId : null,
                      name: explicitName || (isValid ? validOptionsMap.get(rawId) : 'Variedad'),
                      price: parseFloat(v.price || v.priceExtra) || 0 
                    };
                  })
                };
              }

              return detailData;
            })
          }
        }
      });

      // 4. Lógica de Crédito
      if (isCredit) {
        if (!customerId) throw Object.assign(new Error('Cliente obligatorio para crédito'), { statusCode: 400 });

        // Sumar a deuda
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { increment: finalAmount } }
        });

        // Registrar en historial de crédito
        await tx.customerCredit.create({
          data: {
            customerId,
            type: 'DEBT',
            amount: finalAmount,
            description: `Venta a crédito - Factura ${invoiceNumber}`,
            saleId: newSale.id,
            cashSessionId: activeSession.id
          }
        });
      }

      // 5. Descuento Inteligente de Inventario (Receta, Adiciones, Variedades y Combos)
      for (let i = 0; i < processedDetails.length; i++) {
        const pd = processedDetails[i];
        const rawItem = details[i];

        // A. Descuento de Receta Base del Producto
        if (pd.trackStock) {
          await tx.product.update({ where: { id: pd.id }, data: { stock: { decrement: pd.quantity } } });
        } else if (pd.ingredients && pd.ingredients.length > 0) {
          for (const prodIng of pd.ingredients) {
            const totalQty = parseFloat(prodIng.quantity) * pd.quantity;
            await tx.inventoryMovement.create({
              data: {
                tenantId: effectiveTenantId,
                ingredientId: prodIng.ingredientId,
                userId,
                type: 'OUT',
                quantity: totalQty,
                reason: `Venta ${invoiceNumber} (${pd.name})`
              }
            });
            await tx.ingredient.update({
              where: { id: prodIng.ingredientId },
              data: { currentStock: { decrement: totalQty } }
            });
          }
        }

        // B. Descuento de Adiciones (Extras como Tocineta, Queso, etc.)
        const additionsList = rawItem?.additions || [];
        for (const add of additionsList) {
          const additionId = add.additionId || add.id;
          if (additionId) {
            const prodAdd = await tx.productAddition.findUnique({ where: { id: additionId } });
            if (prodAdd && prodAdd.ingredientId && prodAdd.quantity) {
              const addMultiplier = parseInt(add.quantity || 1, 10);
              const totalAddQty = parseFloat(prodAdd.quantity) * addMultiplier * pd.quantity;
              await tx.inventoryMovement.create({
                data: {
                  tenantId: effectiveTenantId,
                  ingredientId: prodAdd.ingredientId,
                  userId,
                  type: 'OUT',
                  quantity: totalAddQty,
                  reason: `Venta ${invoiceNumber} (Adición: ${prodAdd.name})`
                }
              });
              await tx.ingredient.update({
                where: { id: prodAdd.ingredientId },
                data: { currentStock: { decrement: totalAddQty } }
              });
            }
          }
        }

        // C. Descuento de Variedades / Bases / Opciones (Pan, Plátano, Picada, o Productos de Combo)
        const variationsList = rawItem?.variations || rawItem?.modifiers || [];
        for (const v of variationsList) {
          const variationId = typeof v === 'string' ? v : (v.variationId || v.modifierId || v.id);
          if (variationId) {
            const opt = await tx.productModifierOption.findUnique({
              where: { id: variationId },
              include: {
                ingredients: { include: { ingredient: true } },
                linkedProduct: { include: { ingredients: true } }
              }
            });

            if (opt) {
              // 1. Si la variedad tiene un insumo directo (ej: Pan o Plátano)
              if (opt.ingredientId && opt.quantity) {
                const totalVarQty = parseFloat(opt.quantity) * pd.quantity;
                await tx.inventoryMovement.create({
                  data: {
                    tenantId: effectiveTenantId,
                    ingredientId: opt.ingredientId,
                    userId,
                    type: 'OUT',
                    quantity: totalVarQty,
                    reason: `Venta ${invoiceNumber} (Variedad: ${opt.name})`
                  }
                });
                await tx.ingredient.update({
                  where: { id: opt.ingredientId },
                  data: { currentStock: { decrement: totalVarQty } }
                });
              }

              // 2. Si la variedad tiene múltiples insumos (ej: Picada -> Papas + Plátano)
              if (opt.ingredients && opt.ingredients.length > 0) {
                for (const optIng of opt.ingredients) {
                  const totalOptIngQty = parseFloat(optIng.quantity) * pd.quantity;
                  await tx.inventoryMovement.create({
                    data: {
                      tenantId: effectiveTenantId,
                      ingredientId: optIng.ingredientId,
                      userId,
                      type: 'OUT',
                      quantity: totalOptIngQty,
                      reason: `Venta ${invoiceNumber} (Variedad: ${opt.name} -> ${optIng.ingredient?.name || 'Insumo'})`
                    }
                  });
                  await tx.ingredient.update({
                    where: { id: optIng.ingredientId },
                    data: { currentStock: { decrement: totalOptIngQty } }
                  });
                }
              }

              // 3. Si la variedad está ligada a un Producto completo (ej: Combo -> Hamburguesa Extrema)
              if (opt.linkedProduct) {
                if (opt.linkedProduct.trackStock) {
                  await tx.product.update({
                    where: { id: opt.linkedProduct.id },
                    data: { stock: { decrement: pd.quantity } }
                  });
                } else if (opt.linkedProduct.ingredients && opt.linkedProduct.ingredients.length > 0) {
                  for (const linkedIng of opt.linkedProduct.ingredients) {
                    const totalLinkedQty = parseFloat(linkedIng.quantity) * pd.quantity;
                    await tx.inventoryMovement.create({
                      data: {
                        tenantId: effectiveTenantId,
                        ingredientId: linkedIng.ingredientId,
                        userId,
                        type: 'OUT',
                        quantity: totalLinkedQty,
                        reason: `Venta ${invoiceNumber} (Combo: ${pd.name} -> ${opt.linkedProduct.name})`
                      }
                    });
                    await tx.ingredient.update({
                      where: { id: linkedIng.ingredientId },
                      data: { currentStock: { decrement: totalLinkedQty } }
                    });
                  }
                }
              }
            }
          }
        }
      }

      return newSale;
    });
  }

  // ==========================================
  // HISTORIAL Y FACTURACIÓN
  // ==========================================
  async getSalesHistory(filters = {}, page = 1, limit = 50) {
    const { startDate, endDate, paymentMethodId, cashSessionId } = filters;
    const whereClause = {};

    if (paymentMethodId) whereClause.paymentMethodId = paymentMethodId;
    if (cashSessionId) whereClause.cashSessionId = cashSessionId;
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const [total, sales] = await prisma.$transaction([
      prisma.sale.count({ where: whereClause }),
      prisma.sale.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        select: { // <-- OPTIMIZACIÓN: Solo traemos lo que la tabla UI necesita
          id: true,
          invoiceNumber: true,
          finalAmount: true,
          createdAt: true,
          paymentMethod: { select: { name: true } },
          customer: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
      sales
    };
  }

//    return await prisma.sale.findMany({
//     where: whereClause,
//      include: {
//        paymentMethod: true,
//        order: { select: { orderNumber: true, orderType: true } },
//        customer: { select: { name: true } }
//      },
//      orderBy: { createdAt: 'desc' }
//    });
//  }

  async getInvoiceData(saleId) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        tenant: true,
        details: { 
          include: { 
            product: true,
            saleDetailAdditions: { include: { addition: true } },
            saleDetailVariations: { include: { variation: true } }
          } 
        },
        paymentMethod: true,
        order: { include: { user: { select: { name: true } }, table: true } },
        customer: true
      }
    });

    if (!sale) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });

    // Configuración típica para restaurantes (Impuesto al consumo del 8% incluido o discriminado)
    const TAX_RATE = 0.08;
    const taxAmount = parseFloat(sale.finalAmount) * TAX_RATE;
    const baseAmount = parseFloat(sale.finalAmount) - taxAmount;

    return {
      storeConfig: {
        name: sale.tenant?.name || "NeoFood",
        address: sale.tenant?.address || "Colombia",
        nit: sale.tenant?.document || "900.000.000-1",
        phone: sale.tenant?.phone || ""
      },
      invoice: {
        number: sale.invoiceNumber,
        date: sale.createdAt,
        cashier: sale.order?.user?.name || "Cajero",
        customer: sale.customer ? sale.customer.name : 'Consumidor Final',
        orderType: sale.order?.orderType || 'DINE_IN',
      },
      items: sale.details.map(d => ({
        product: d.product.name,
        qty: d.quantity,
        unitPrice: d.unitPrice,
        subtotal: d.subtotal
      })),
      totals: {
        subtotal: sale.totalAmount,
        discount: sale.discount,
        baseAmount: baseAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2), // Impuesto al consumo
        total: sale.finalAmount,
        paymentMethod: sale.paymentMethod.name
      }
    };
  }

  // ==========================================
  // REPORTE DE UTILIDAD (VENTAS VS COSTOS)
  // ==========================================
  async getUtilityReport(startDate, endDate) {
    // 1. Obtener todas las ventas del periodo
    const sales = await prisma.saleDetail.findMany({
      where: {
        sale: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      },
      include: {
        product: {
          include: { ingredients: { include: { ingredient: true } } }
        },
        sale: true
      }
    });

    let totalRevenue = 0;
    let totalCost = 0;

    // 2. Calcular costo por cada producto vendido
    sales.forEach(sd => {
      const saleRevenue = parseFloat(sd.subtotal);
      let productCost = 0;

      if (sd.product.trackStock) {
        // Asumimos un costo estándar si es compra directa (idealmente guardado en producto)
        // Para simplificar, tomamos el 60% como costo si no hay receta
        productCost = saleRevenue * 0.60; 
      } else {
        // Sumar el costo de los ingredientes según la receta
        sd.product.ingredients.forEach(prodIng => {
          const qtyRequired = parseFloat(prodIng.quantity);
          const ingCost = parseFloat(prodIng.ingredient.costPerUnit);
          productCost += (qtyRequired * ingCost) * sd.quantity;
        });
      }

      totalRevenue += saleRevenue;
      totalCost += productCost;
    });

    // 3. Ajustar por descuentos globales en las ventas
    const uniqueSales = [...new Map(sales.map(item => [item.saleId, item.sale])).values()];
    const totalDiscounts = uniqueSales.reduce((sum, sale) => sum + parseFloat(sale.discount), 0);
    
    const netRevenue = totalRevenue - totalDiscounts;
    const grossProfit = netRevenue - totalCost;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    return {
      period: { startDate, endDate },
      financials: {
        grossRevenue: totalRevenue,
        discounts: totalDiscounts,
        netRevenue: netRevenue,
        cogs: totalCost, // Cost of Goods Sold
        grossProfit: grossProfit,
        marginPercent: profitMargin.toFixed(2) + '%'
      }
    };
  }

  // ==========================================
  // RESUMEN UNIFICADO PARA EL DASHBOARD
  // ==========================================
  async getDashboardSummary() {
    const now = new Date();
    
    // Rango del día actual (00:00:00 a 23:59:59)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Rango del mes actual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Ventas de Hoy
    const todaySales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      _sum: { finalAmount: true },
      _count: true
    });
    const dailySales = parseFloat(todaySales._sum.finalAmount || 0);

    // 2. Ventas del Mes
    const monthSales = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { finalAmount: true },
      _count: true
    });
    const monthlySales = parseFloat(monthSales._sum.finalAmount || 0);

    // 3. Compras del Mes
    const monthPurchases = await prisma.purchase.aggregate({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: 'COMPLETED'
      },
      _sum: { totalCost: true }
    });
    const totalPurchases = parseFloat(monthPurchases._sum.totalCost || 0);

    // 4. Ganancia Estimada
    const monthlyProfit = Math.max(0, monthlySales - totalPurchases);

    // 5. Estado de Caja (buscar sesión OPEN activa)
    const openSession = await prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        cashMovements: true,
        sales: { select: { finalAmount: true, paymentMethod: { select: { name: true } } } }
      },
      orderBy: { openedAt: 'desc' }
    });

    let activeCashSession = { status: 'CLOSED' };
    if (openSession) {
      activeCashSession = {
        id: openSession.id,
        status: 'OPEN',
        openedAt: openSession.openedAt,
        openingAmount: parseFloat(openSession.openingAmount),
        user: openSession.user,
        userId: openSession.userId,
        totalSales: openSession.sales.reduce((sum, s) => sum + parseFloat(s.finalAmount || 0), 0)
      };
    }

    // 6. Gráfico de Ventas de los últimos 7 días
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayAgg = await prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { finalAmount: true }
      });

      chartData.push({
        name: daysOfWeek[d.getDay()],
        ventas: parseFloat(dayAgg._sum.finalAmount || 0),
        fullDate: d.toLocaleDateString('es-CO')
      });
    }

    // 7. Top 5 Productos más vendidos
    const topSaleDetails = await prisma.saleDetail.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const topProductIds = topSaleDetails.map(t => t.productId);
    const productsData = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true }
    });
    const productNameMap = {};
    productsData.forEach(p => { productNameMap[p.id] = p.name; });

    const topProducts = topSaleDetails.map(t => ({
      name: productNameMap[t.productId] || 'Producto',
      quantity: parseInt(t._sum.quantity || 0, 10),
      revenue: parseFloat(t._sum.subtotal || 0)
    }));

    // 8. Insumos con bajo stock
    const allIngredients = await prisma.ingredient.findMany({
      orderBy: { currentStock: 'asc' }
    });
    const lowStockItems = allIngredients
      .filter(i => parseFloat(i.currentStock) <= parseFloat(i.minStock))
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        name: i.name,
        currentStock: parseFloat(i.currentStock),
        minStock: parseFloat(i.minStock),
        unit: i.unit
      }));

    return {
      kpis: {
        dailySales,
        monthlySales,
        monthlyProfit,
        totalPurchases,
        cashSession: activeCashSession,
        lowStockItems
      },
      chartData,
      topProducts
    };
  }
}

module.exports = new SaleService();