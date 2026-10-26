const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');
const MovementService = require('../../inventory/services/movement.service');

class SaleService {
  
  // ==========================================
  // CREACIÓN DE VENTA Y DESCUENTO DE INVENTARIO
  // ==========================================
  async createSale(data, userId) {
    const { customerId, paymentMethodId, discount = 0, orderType = 'DINE_IN', notes, details, tableId, orderId } = data;

    if (!details || details.length === 0) {
      throw Object.assign(new Error('La venta debe incluir al menos un producto'), { statusCode: 400 });
    }

    let effectiveTenantId = getTenantId() || data.tenantId || null;

    let activeSession = await prisma.cashSession.findFirst({
      where: { userId, status: 'OPEN', ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}) }
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

    const parsedDiscount = Math.max(0, parseFloat(discount) || 0);

    return await prisma.$transaction(async (tx) => {
      let subtotalTotal = 0;
      const processedDetails = [];

      // Pre-cargar opciones de modificadores y adiciones válidas desde la BD para calcular precios seguros
      const candidateVarIds = [];
      const candidateAddIds = [];
      details.forEach(item => {
        (item.variations || item.modifiers || []).forEach(v => {
          const vid = typeof v === 'string' ? v : (v.variationId || v.modifierId || v.optionId || v.id);
          if (vid) candidateVarIds.push(vid);
        });
        (item.additions || []).forEach(a => {
          const aid = a.additionId || a.id;
          if (aid) candidateAddIds.push(aid);
        });
      });

      const validOptions = candidateVarIds.length > 0 
        ? await tx.productModifierOption.findMany({
            where: {
              id: { in: candidateVarIds },
              ...(effectiveTenantId ? { modifier: { product: { tenantId: effectiveTenantId } } } : {})
            },
            select: { id: true, name: true, priceExtra: true }
          })
        : [];
      const validOptionsMap = new Map(validOptions.map(o => [o.id, o]));

      const validAdditions = candidateAddIds.length > 0
        ? await tx.productAddition.findMany({
            where: {
              id: { in: candidateAddIds },
              ...(effectiveTenantId ? { product: { tenantId: effectiveTenantId } } : {})
            },
            select: { id: true, name: true, price: true }
          })
        : [];
      const validAdditionsMap = new Map(validAdditions.map(a => [a.id, a]));

      for (const item of details) {
        const prodId = item.productId || item.product?.id;
        const product = await tx.product.findFirst({ 
          where: {
            id: prodId,
            ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {})
          },
          include: {
            ingredients: true,
            modifiers: { include: { options: true } },
            additions: true
          }
        });

        if (!product || !product.isAvailable) {
          throw Object.assign(new Error(`Producto no disponible o no pertenece a este establecimiento`), { statusCode: 400 });
        }

        const quantity = parseInt(item.quantity, 10);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw Object.assign(new Error(`Cantidad inválida para el producto ${product.name}`), { statusCode: 400 });
        }

        // Calcular precio en el servidor basado en el precio base del producto + modificadores + adiciones de BD
        let basePlusModifiersPrice = parseFloat(product.price);
        const itemMods = item.variations || item.modifiers || [];
        const prodOptions = (product.modifiers || []).flatMap(g => g.options || []);
        const prodAdds = product.additions || [];

        const normalizedMods = itemMods.map(v => {
          const rawId = typeof v === 'string' ? v : (v.variationId || v.modifierId || v.optionId || v.id);
          const explicitName = typeof v === 'object' ? (v.name || v.optionName) : null;
          const dbOpt = prodOptions.find(o => (rawId && o.id === rawId) || (explicitName && o.name === explicitName))
            || (rawId ? validOptionsMap.get(rawId) : null);
          if (!dbOpt) {
            throw Object.assign(new Error(`Opción de modificador inválida en el producto "${product.name}"`), { statusCode: 400 });
          }
          const extra = Math.max(0, parseFloat(dbOpt.priceExtra || 0));
          basePlusModifiersPrice += extra;
          return {
            id: dbOpt.id,
            variationId: dbOpt.id,
            name: dbOpt.name,
            price: extra,
            priceExtra: extra
          };
        });

        // Verificar que los grupos de modificadores obligatorios tengan al menos una opción seleccionada
        const selectedOptionIds = new Set(normalizedMods.map(m => m.variationId).filter(Boolean));
        for (const modGroup of (product.modifiers || [])) {
          if (modGroup.isRequired && Array.isArray(modGroup.options) && modGroup.options.length > 0) {
            const hasGroupSelection = modGroup.options.some(opt => selectedOptionIds.has(opt.id));
            if (!hasGroupSelection) {
              throw Object.assign(new Error(`El modificador "${modGroup.name}" es obligatorio para "${product.name}"`), { statusCode: 400 });
            }
          }
        }

        let additionsUnitSum = 0;
        const itemAdds = item.additions || [];
        const normalizedAdds = itemAdds.map(a => {
          const rawId = a.additionId || a.id;
          const explicitName = a.name || null;
          const dbAdd = prodAdds.find(pa => (rawId && pa.id === rawId) || (explicitName && pa.name === explicitName))
            || (rawId ? validAdditionsMap.get(rawId) : null);
          if (!dbAdd) {
            throw Object.assign(new Error(`Adición inválida en el producto "${product.name}"`), { statusCode: 400 });
          }
          const addQty = Math.max(1, parseInt(a.quantity, 10) || 1);
          const addPrice = Math.max(0, parseFloat(dbAdd.price || 0));
          additionsUnitSum += addPrice * addQty;
          return {
            id: dbAdd.id,
            additionId: dbAdd.id,
            name: dbAdd.name,
            quantity: addQty,
            price: addPrice
          };
        });

        // En POS, las adiciones pueden venir sumadas por unidad o al subtotal; garantizamos precio >= base de BD
        const computedUnitPrice = basePlusModifiersPrice + additionsUnitSum;
        const unitPrice = computedUnitPrice;
        const subtotal = quantity * unitPrice;
        subtotalTotal += subtotal;

        processedDetails.push({ 
          ...product, 
          productId: product.id,
          quantity, 
          subtotal, 
          unitPrice, 
          notes: item.notes,
          modifiers: normalizedMods,
          additions: normalizedAdds
        });
      }

      const finalAmount = Math.max(0, subtotalTotal - parsedDiscount);

      // Si no se especifica cliente, asociar automáticamente al "Consumidor final" del establecimiento
      let effectiveCustomerId = customerId || null;
      let selectedCustomerDoc = null;
      let selectedCustomerName = '';
      if (effectiveCustomerId && effectiveTenantId) {
        const checkCust = await tx.customer.findFirst({
          where: { id: effectiveCustomerId, tenantId: effectiveTenantId }
        });
        if (!checkCust) {
          throw Object.assign(new Error('El cliente seleccionado no pertenece a este establecimiento'), { statusCode: 400 });
        }
        selectedCustomerDoc = checkCust.document;
        selectedCustomerName = checkCust.name || '';
      }
      if (!effectiveCustomerId && effectiveTenantId) {
        const defaultCustomer = await tx.customer.findFirst({
          where: {
            tenantId: effectiveTenantId,
            OR: [
              { document: '222222222222' },
              { name: { contains: 'Consumidor' } }
            ]
          }
        });
        if (defaultCustomer) {
          effectiveCustomerId = defaultCustomer.id;
        }
      }

      // Si se envía tableId, verificar que pertenezca al establecimiento
      if (tableId && effectiveTenantId) {
        const checkTable = await tx.table.findFirst({
          where: { id: tableId, tenantId: effectiveTenantId }
        });
        if (!checkTable) {
          throw Object.assign(new Error('La mesa seleccionada no pertenece a este establecimiento'), { statusCode: 400 });
        }
      }

      // 1. Obtener orden existente de mesa o crear una nueva
      let order;
      if (orderId) {
        order = await tx.order.findFirst({
          where: { id: orderId, ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}) }
        });
        if (order) {
          await tx.orderDetail.deleteMany({ where: { orderId: order.id } });
          order = await tx.order.update({
            where: { id: order.id },
            data: {
              customerId: effectiveCustomerId || order.customerId,
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
            customerId: effectiveCustomerId || null,
            tableId: tableId || null,
            status: (orderType === 'TAKEAWAY' || orderType === 'DELIVERY') ? 'PENDING' : 'DELIVERED',
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

      // 2. Determinar medios de pago (Soporte para cobro único o cuenta dividida / pagos múltiples)
      let paymentsToRecord = [];
      if (Array.isArray(data.payments) && data.payments.length > 0) {
        paymentsToRecord = data.payments
          .filter(p => p.paymentMethodId && parseFloat(p.amount) > 0)
          .map(p => ({
            paymentMethodId: String(p.paymentMethodId),
            amount: parseFloat(p.amount),
            notes: p.notes || null
          }));
      }

      if (paymentsToRecord.length === 0) {
        if (!paymentMethodId) {
          throw Object.assign(new Error('Método de pago no válido o no encontrado'), { statusCode: 400 });
        }
        paymentsToRecord = [{
          paymentMethodId: String(paymentMethodId),
          amount: finalAmount,
          notes: null
        }];
      }

      // Validar que la suma coincida con el total final
      const totalPaid = paymentsToRecord.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(totalPaid - finalAmount) > 1) {
        throw Object.assign(new Error(`La suma de los pagos ($${Math.round(totalPaid).toLocaleString('es-CO')}) no coincide con el total de la venta ($${Math.round(finalAmount).toLocaleString('es-CO')})`), { statusCode: 400 });
      }

      // Validar existencia y pertenencia al tenant de cada método de pago
      const requestedMethodIds = [...new Set(paymentsToRecord.map(p => p.paymentMethodId))];
      const dbPaymentMethods = await tx.paymentMethod.findMany({
        where: {
          id: { in: requestedMethodIds },
          ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {})
        }
      });
      const paymentMethodsMap = new Map(dbPaymentMethods.map(m => [m.id, m]));

      for (const p of paymentsToRecord) {
        if (!paymentMethodsMap.has(p.paymentMethodId)) {
          throw Object.assign(new Error('Uno o más métodos de pago no son válidos o no pertenecen a este establecimiento'), { statusCode: 400 });
        }
      }

      // Elegir el método principal para la cabecera de la venta (el de mayor monto)
      const primaryPayment = [...paymentsToRecord].sort((a, b) => b.amount - a.amount)[0];
      const primaryPaymentMethod = paymentMethodsMap.get(primaryPayment.paymentMethodId);

      // 3. Crear Venta
      const invoiceNumber = `FE-${Date.now().toString().slice(-6)}-${order.orderNumber}`;

      const costedDetails = await MovementService.processSaleInventoryAndCost(processedDetails, invoiceNumber, effectiveTenantId, userId, tx);

      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          totalAmount: finalAmount,
          finalAmount: finalAmount,
          discount: parsedDiscount,
          tenantId: effectiveTenantId,
          orderId: order.id,
          paymentMethodId: primaryPaymentMethod.id,
          cashSessionId: activeSession.id,
          customerId: effectiveCustomerId || null,
          details: {
            create: costedDetails.map(item => {
              const detailData = {
                productId: item.productId || item.product?.id,
                quantity: parseInt(item.quantity, 10),
                unitPrice: parseFloat(item.unitPrice || item.finalPrice),
                subtotal: parseInt(item.quantity, 10) * parseFloat(item.unitPrice || item.finalPrice),
                unitCost: item.unitCost || 0,
                totalCost: item.totalCost || 0,
                notes: item.notes
              };

              if (item.additions && item.additions.length > 0) {
                detailData.saleDetailAdditions = {
                  create: item.additions.map(add => ({
                    additionId: add.additionId || null,
                    name: add.name || 'Adición Extra',
                    quantity: add.quantity || 1,
                    price: parseFloat(add.price) || 0
                  }))
                };
              }

              const variationsList = item.variations || item.modifiers || [];
              if (variationsList.length > 0) {
                detailData.saleDetailVariations = {
                  create: variationsList.map(v => ({
                    variationId: v.variationId || null,
                    name: v.name || 'Variedad',
                    price: parseFloat(v.price || v.priceExtra) || 0 
                  }))
                };
              }

              return detailData;
            })
          },
          payments: {
            create: paymentsToRecord.map(p => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
              notes: p.notes
            }))
          }
        }
      });

      // 4. Lógica de Crédito (soporta crédito parcial o total)
      const creditPayments = paymentsToRecord.filter(p => {
        const m = paymentMethodsMap.get(p.paymentMethodId);
        const mName = m?.name?.toLowerCase() || '';
        return mName.includes('crédito') || mName.includes('credito') || mName.includes('fiao');
      });

      const totalCredit = creditPayments.reduce((acc, p) => acc + p.amount, 0);
      if (totalCredit > 0) {
        const isGenericFinalConsumer = !customerId ||
          selectedCustomerDoc === '222222222222' ||
          selectedCustomerName.trim().toLowerCase() === 'consumidor final';
        if (!effectiveCustomerId || isGenericFinalConsumer) {
          throw Object.assign(
            new Error('Debes seleccionar un cliente real (distinto a Consumidor Final) para registrar ventas a crédito'),
            { statusCode: 400 }
          );
        }

        await tx.customer.update({
          where: { id: effectiveCustomerId },
          data: { balance: { increment: totalCredit } }
        });

        await tx.customerCredit.create({
          data: {
            customerId: effectiveCustomerId,
            type: 'DEBT',
            amount: totalCredit,
            description: `Venta a crédito (${creditPayments.length > 1 || paymentsToRecord.length > 1 ? 'Parcial/Dividido' : 'Total'}) - Factura ${invoiceNumber}`,
            saleId: newSale.id,
            paymentMethodId: creditPayments[0]?.paymentMethodId || primaryPaymentMethod.id,
            cashSessionId: activeSession.id
          }
        });
      }

      const fullSale = await tx.sale.findUnique({
        where: { id: newSale.id },
        include: {
          tenant: true,
          customer: { select: { name: true, document: true, phone: true } },
          paymentMethod: { select: { id: true, name: true } },
          payments: {
            include: {
              paymentMethod: { select: { id: true, name: true } }
            }
          },
          order: {
            select: {
              orderNumber: true,
              orderType: true,
              notes: true,
              table: { select: { name: true } },
              user: { select: { name: true } }
            }
          },
          details: {
            include: {
              product: { select: { name: true } },
              saleDetailAdditions: { include: { addition: { select: { name: true } } } },
              saleDetailVariations: { include: { variation: { select: { name: true } } } }
            }
          }
        }
      });

      return fullSale || newSale;
    });
  }

  _parseDateRange(startDate, endDate) {
    if (!startDate || !endDate) return undefined;
    const startRaw = String(startDate).trim();
    const endRaw = String(endDate).trim();
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startRaw)
      ? new Date(`${startRaw}T00:00:00.000`)
      : new Date(startRaw);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(endRaw)
      ? new Date(`${endRaw}T23:59:59.999`)
      : new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw Object.assign(new Error('Rango de fechas inválido'), { statusCode: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endRaw) && end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
      end.setHours(23, 59, 59, 999);
    }
    return { gte: start, lte: end };
  }

  // ==========================================
  // HISTORIAL Y FACTURACIÓN
  // ==========================================
  async getSalesHistory(filters = {}, page = 1, limit = 50, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const { startDate, endDate, paymentMethodId, cashSessionId } = filters;
    const whereClause = {};

    if (tenantId) whereClause.tenantId = tenantId;
    if (paymentMethodId) whereClause.paymentMethodId = paymentMethodId;
    if (cashSessionId) whereClause.cashSessionId = cashSessionId;
    if (startDate && endDate) {
      whereClause.createdAt = this._parseDateRange(startDate, endDate);
    }

    const skip = (page - 1) * limit;

    const [total, sales] = await prisma.$transaction([
      prisma.sale.count({ where: whereClause }),
      prisma.sale.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          invoiceNumber: true,
          finalAmount: true,
          createdAt: true,
          paymentMethod: { select: { id: true, name: true } },
          payments: {
            include: {
              paymentMethod: { select: { id: true, name: true } }
            }
          },
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

  async getInvoiceData(saleId, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        ...(tenantId ? { tenantId } : {})
      },
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
        payments: {
          include: {
            paymentMethod: true
          }
        },
        order: { include: { user: { select: { name: true } }, table: true } },
        customer: true
      }
    });

    if (!sale) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });

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
        taxAmount: taxAmount.toFixed(2),
        total: sale.finalAmount,
        paymentMethod: sale.paymentMethod.name,
        payments: sale.payments?.map(p => ({
          id: p.id,
          method: p.paymentMethod?.name,
          amount: parseFloat(p.amount)
        })) || []
      }
    };
  }

  // ==========================================
  // REPORTE DE UTILIDAD (VENTAS VS COSTOS)
  // ==========================================
  async getUtilityReport(startDate, endDate, tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const dateRange = this._parseDateRange(startDate, endDate);
    // 1. Obtener todas las ventas del periodo filtradas estrictamente por tenantId
    const sales = await prisma.saleDetail.findMany({
      where: {
        sale: {
          ...(tenantId ? { tenantId } : {}),
          createdAt: dateRange
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

    // 2. Calcular costo por cada producto vendido (priorizando el costo histórico persistido en SaleDetail)
    sales.forEach(sd => {
      const saleRevenue = parseFloat(sd.subtotal);
      const historicalTotalCost = parseFloat(sd.totalCost || 0);
      let productCost = 0;

      if (historicalTotalCost > 0) {
        productCost = historicalTotalCost;
      } else if (sd.product.ingredients && sd.product.ingredients.length > 0) {
        sd.product.ingredients.forEach(prodIng => {
          const qtyRequired = parseFloat(prodIng.quantity);
          const ingCost = parseFloat(prodIng.ingredient.averageCost || prodIng.ingredient.costPerUnit || prodIng.ingredient.lastCost || 0);
          productCost += (qtyRequired * ingCost) * sd.quantity;
        });
      } else if (sd.product.trackStock) {
        productCost = saleRevenue * 0.60; 
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
        cogs: totalCost,
        grossProfit: grossProfit,
        marginPercent: profitMargin.toFixed(2) + '%'
      }
    };
  }

  // ==========================================
  // RESUMEN UNIFICADO PARA EL DASHBOARD
  // ==========================================
  async getDashboardSummary(userId = null, tenantIdParam = null) {
    const now = new Date();
    const tenantId = tenantIdParam || getTenantId();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Ventas de Hoy
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        ...(tenantId ? { tenantId } : {})
      },
      _sum: { finalAmount: true },
      _count: true
    });
    const dailySales = parseFloat(todaySales._sum.finalAmount || 0);

    // 2. Ventas del Mes
    const monthSales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        ...(tenantId ? { tenantId } : {})
      },
      _sum: { finalAmount: true },
      _count: true
    });
    const monthlySales = parseFloat(monthSales._sum.finalAmount || 0);

    // 3. Compras del Mes
    const monthPurchases = await prisma.purchase.aggregate({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: 'COMPLETED',
        ...(tenantId ? { tenantId } : {})
      },
      _sum: { totalCost: true }
    });
    const totalPurchases = parseFloat(monthPurchases._sum.totalCost || 0);

    // 4. Ganancia Estimada
    const monthlyProfit = Math.max(0, monthlySales - totalPurchases);

    // 5. Estado de Caja (buscar sesión OPEN activa)
    const openSession = await prisma.cashSession.findFirst({
      where: {
        status: 'OPEN',
        ...(tenantId ? { tenantId } : {})
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        cashMovements: true,
        sales: {
          select: {
            finalAmount: true,
            paymentMethod: { select: { name: true } },
            payments: { include: { paymentMethod: { select: { name: true } } } },
            customerCredits: { select: { type: true } }
          }
        },
        customerCredits: {
          where: { type: 'PAYMENT' },
          select: { amount: true }
        }
      },
      orderBy: { openedAt: 'desc' }
    });

    let activeCashSession = { status: 'CLOSED' };
    if (openSession) {
      let sessionNonCreditSales = 0;
      for (const s of openSession.sales || []) {
        if (Array.isArray(s.payments) && s.payments.length > 0) {
          for (const p of s.payments) {
            const mName = (p.paymentMethod?.name || s.paymentMethod?.name || '').toLowerCase();
            const isCredit = mName.includes('crédito') || mName.includes('credito') || mName.includes('fiao');
            if (!isCredit) {
              sessionNonCreditSales += parseFloat(p.amount || 0);
            }
          }
        } else {
          const hadInitialDebt = Array.isArray(s.customerCredits) && s.customerCredits.some(c => c.type === 'DEBT');
          if (hadInitialDebt) continue;
          const mName = (s.paymentMethod?.name || '').toLowerCase();
          const isCredit = mName.includes('crédito') || mName.includes('credito') || mName.includes('fiao');
          if (!isCredit) {
            sessionNonCreditSales += parseFloat(s.finalAmount || 0);
          }
        }
      }
      const sessionAbonos = (openSession.customerCredits || []).reduce(
        (sum, c) => sum + parseFloat(c.amount || 0),
        0
      );

      activeCashSession = {
        id: openSession.id,
        status: 'OPEN',
        openedAt: openSession.openedAt,
        openingAmount: parseFloat(openSession.openingAmount),
        user: openSession.user,
        userId: openSession.userId,
        totalSales: sessionNonCreditSales + sessionAbonos
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
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          ...(tenantId ? { tenantId } : {})
        },
        _sum: { finalAmount: true }
      });

      chartData.push({
        name: daysOfWeek[d.getDay()],
        ventas: parseFloat(dayAgg._sum.finalAmount || 0),
        fullDate: d.toLocaleDateString('es-CO')
      });
    }

    // 7. Top 5 Productos más vendidos (filtrado por tenantId de la venta)
    const topSaleDetails = await prisma.saleDetail.groupBy({
      by: ['productId'],
      where: tenantId ? { sale: { tenantId } } : undefined,
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const topProductIds = topSaleDetails.map(t => t.productId);
    const productsData = await prisma.product.findMany({
      where: {
        id: { in: topProductIds },
        ...(tenantId ? { tenantId } : {})
      },
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
      where: {
        isActive: true,
        ...(tenantId ? { tenantId } : {})
      },
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
