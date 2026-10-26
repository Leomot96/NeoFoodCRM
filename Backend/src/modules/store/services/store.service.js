const prisma = require('../../../config/prisma');
const MovementService = require('../../inventory/services/movement.service');
const { deleteUploadedFile } = require('../../../utils/fileCleaner');
const { compareCategories } = require('../../../utils/categoryOrder');

class StoreService {

  // ==========================================
  // 1. CONSULTA PÚBLICA DE LA TIENDA POR SLUG
  // ==========================================
  async getPublicStoreBySlug(slug) {
    if (!slug) {
      throw Object.assign(new Error('El identificador del restaurante es requerido'), { statusCode: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      throw Object.assign(new Error('Restaurante no encontrado'), { statusCode: 404 });
    }

    const isExpired = tenant.subscriptionEndsAt && new Date(tenant.subscriptionEndsAt) < new Date();
    if (tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE' || tenant.paymentStatus === 'PENDING' || isExpired) {
      throw Object.assign(new Error('El restaurante se encuentra temporalmente inactivo'), { statusCode: 403 });
    }

    // Categorías y Productos disponibles para la tienda (ocultando stock interno exacto)
    const categories = await prisma.category.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        products: {
          some: {
            isAvailable: true,
            showInStore: true
          }
        }
      },
      include: {
        products: {
          where: {
            isAvailable: true,
            showInStore: true
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
            showInStore: true,
            categoryId: true,
            modifiers: {
              include: {
                options: true
              }
            },
            additions: true
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Ordenar categorías según la prioridad comercial del negocio
    categories.sort(compareCategories);

    // Métodos de pago activos del restaurante (excluyendo 'Crédito' ya que es cartera interna)
    const rawPaymentMethods = await prisma.paymentMethod.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    let paymentMethods = rawPaymentMethods.filter(pm => {
      const lower = (pm.name || '').toLowerCase();
      return !lower.includes('crédito') && !lower.includes('credito');
    });

    // Garantizar que Efectivo siempre esté presente como opción principal
    if (!paymentMethods.some(pm => pm.name.toLowerCase().includes('efectivo'))) {
      paymentMethods.unshift({ id: 'cash-default', name: 'Efectivo' });
    } else {
      paymentMethods.sort((a, b) => {
        const aIsCash = a.name.toLowerCase().includes('efectivo');
        const bIsCash = b.name.toLowerCase().includes('efectivo');
        if (aIsCash && !bIsCash) return -1;
        if (!aIsCash && bIsCash) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return {
      restaurant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        document: tenant.document,
        phone: tenant.phone,
        whatsappNumber: tenant.whatsappNumber || tenant.phone,
        address: tenant.address,
        logoUrl: tenant.logoUrl,
        bannerUrl: tenant.bannerUrl,
        bannerPosition: tenant.bannerPosition || 'center',
        storeSchedule: tenant.storeSchedule || '',
        storeDescription: tenant.storeDescription,
        storeAnnouncement: tenant.storeAnnouncement,
        isStoreActive: tenant.isStoreActive !== false
      },
      categories,
      paymentMethods
    };
  }

  // ==========================================
  // 2. CREACIÓN DE PEDIDO ONLINE (PÚBLICO)
  // ==========================================
  async createPublicOrder(slug, data) {
    const {
      customerName,
      customerPhone,
      customerEmail,
      orderType = 'DELIVERY',
      deliveryAddress,
      deliveryNeighborhood,
      notes,
      paymentMethodName = 'Efectivo',
      items = []
    } = data;

    if (!items || items.length === 0) {
      throw Object.assign(new Error('El pedido debe contener al menos un producto'), { statusCode: 400 });
    }

    if (!customerName || !customerName.trim()) {
      throw Object.assign(new Error('El nombre del cliente es obligatorio'), { statusCode: 400 });
    }

    if (!customerPhone || !customerPhone.trim()) {
      throw Object.assign(new Error('El teléfono/WhatsApp es obligatorio para confirmar tu pedido'), { statusCode: 400 });
    }

    if (orderType === 'DELIVERY' && (!deliveryAddress || !deliveryAddress.trim())) {
      throw Object.assign(new Error('La dirección de entrega es obligatoria para pedidos a domicilio'), { statusCode: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      throw Object.assign(new Error('Restaurante no encontrado'), { statusCode: 404 });
    }

    const isExpired = tenant.subscriptionEndsAt && new Date(tenant.subscriptionEndsAt) < new Date();
    if (tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE' || tenant.paymentStatus === 'PENDING' || isExpired) {
      throw Object.assign(new Error('El restaurante no está aceptando pedidos en este momento'), { statusCode: 403 });
    }

    if (tenant.isStoreActive === false) {
      throw Object.assign(new Error('La tienda virtual se encuentra en pausa temporalmente. Por favor intenta más tarde o comunícate directamente.'), { statusCode: 400 });
    }

    // Validar productos, modificadores y adiciones consultando precios reales en BD
    let totalCalculated = 0;
    const processedDetails = [];

    for (const item of items) {
      const prodId = item.productId || item.id;
      const product = await prisma.product.findFirst({
        where: {
          id: prodId,
          tenantId: tenant.id,
          isAvailable: true,
          showInStore: true
        },
        include: {
          modifiers: {
            include: {
              options: true
            }
          },
          additions: true
        }
      });

      if (!product) {
        throw Object.assign(new Error(`Uno de los productos seleccionados no está disponible en la tienda`), { statusCode: 400 });
      }

      const qty = parseInt(item.quantity, 10);
      if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
        throw Object.assign(new Error(`Cantidad inválida para el producto "${product.name}"`), { statusCode: 400 });
      }

      let unitPrice = parseFloat(product.price);

      // Validar y sumar modificadores exclusivamente desde la BD
      const selectedModifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
      const validatedModifiers = [];
      const dbOptions = (product.modifiers || []).flatMap(group =>
        (group.options || []).map(opt => ({
          ...opt,
          modifierName: group.name
        }))
      );

      for (const mod of selectedModifiers) {
        const modOptionId = mod.optionId || mod.id;
        const modOptionName = mod.optionName || mod.name;
        const dbOpt = dbOptions.find(o =>
          (modOptionId && o.id === modOptionId) ||
          (modOptionName && o.name === modOptionName)
        );
        if (!dbOpt) {
          throw Object.assign(new Error(`Opción de modificador inválida en "${product.name}"`), { statusCode: 400 });
        }
        const priceExtra = Math.max(0, parseFloat(dbOpt.priceExtra || 0));
        unitPrice += priceExtra;
        validatedModifiers.push({
          id: dbOpt.id,
          optionId: dbOpt.id,
          variationId: dbOpt.id,
          modifierName: dbOpt.modifierName,
          optionName: dbOpt.name,
          priceExtra
        });
      }

      // Verificar que los grupos de modificadores obligatorios tengan al menos una opción seleccionada
      const selectedOptionIds = new Set(validatedModifiers.map(m => m.optionId).filter(Boolean));
      for (const modGroup of (product.modifiers || [])) {
        if (modGroup.isRequired && Array.isArray(modGroup.options) && modGroup.options.length > 0) {
          const hasSelection = modGroup.options.some(opt => selectedOptionIds.has(opt.id));
          if (!hasSelection) {
            throw Object.assign(new Error(`El modificador "${modGroup.name}" es obligatorio para "${product.name}"`), { statusCode: 400 });
          }
        }
      }

      // Validar y sumar adiciones exclusivamente desde la BD
      const selectedAdditions = Array.isArray(item.additions) ? item.additions : [];
      const validatedAdditions = [];
      const dbAdditions = product.additions || [];

      for (const add of selectedAdditions) {
        const addQty = parseInt(add.quantity, 10) || 1;
        if (!Number.isInteger(addQty) || addQty <= 0 || addQty > 50) {
          throw Object.assign(new Error(`Cantidad de adición inválida en "${product.name}"`), { statusCode: 400 });
        }
        const addId = add.additionId || add.id;
        const addName = add.name;
        const dbAdd = dbAdditions.find(a =>
          (addId && a.id === addId) ||
          (addName && a.name === addName)
        );
        if (!dbAdd) {
          throw Object.assign(new Error(`Adición inválida en "${product.name}"`), { statusCode: 400 });
        }
        const addPrice = Math.max(0, parseFloat(dbAdd.price || 0));
        unitPrice += addPrice * addQty;
        validatedAdditions.push({
          id: dbAdd.id,
          name: dbAdd.name,
          price: addPrice,
          quantity: addQty
        });
      }

      const subtotal = unitPrice * qty;
      totalCalculated += subtotal;

      processedDetails.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        subtotal,
        notes: item.notes ? String(item.notes).slice(0, 500) : null,
        modifiers: validatedModifiers,
        additions: validatedAdditions
      });
    }

    // Registrar en BD dentro de una transacción
    const order = await prisma.$transaction(async (tx) => {
      // Intentar vincular o registrar cliente en la agenda del restaurante
      let customer = await tx.customer.findFirst({
        where: {
          tenantId: tenant.id,
          phone: customerPhone.trim()
        }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId: tenant.id,
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail?.trim() || null,
            address: deliveryAddress?.trim() || null
          }
        });
      }

      // Crear el pedido
      return await tx.order.create({
        data: {
          tenantId: tenant.id,
          userId: null,
          customerId: customer.id,
          status: 'PENDING',
          orderType: orderType === 'TAKEAWAY' ? 'TAKEAWAY' : 'DELIVERY',
          notes: notes?.trim() || null,
          totalAmount: totalCalculated,
          isOnlineStore: true,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail?.trim() || null,
          deliveryAddress: deliveryAddress?.trim() || null,
          deliveryNeighborhood: deliveryNeighborhood?.trim() || null,
          paymentMethodName: paymentMethodName || 'Efectivo',
          details: {
            create: processedDetails.map(pd => ({
              productId: pd.productId,
              quantity: pd.quantity,
              unitPrice: pd.unitPrice,
              subtotal: pd.subtotal,
              notes: pd.notes,
              modifiers: pd.modifiers || [],
              additions: pd.additions || []
            }))
          }
        },
        include: {
          details: {
            include: {
              product: true
            }
          }
        }
      });
    });

    const targetPhone = tenant.whatsappNumber || tenant.phone;

    return {
      order,
      whatsappNumber: targetPhone,
      restaurantName: tenant.name
    };
  }

  // ==========================================
  // 3. ADMINISTRACIÓN: CONFIGURACIÓN DE TIENDA
  // ==========================================
  async getStoreConfig(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw Object.assign(new Error('Establecimiento no encontrado'), { statusCode: 404 });
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      document: tenant.document,
      phone: tenant.phone,
      whatsappNumber: tenant.whatsappNumber || tenant.phone || '',
      address: tenant.address || '',
      logoUrl: tenant.logoUrl,
      bannerUrl: tenant.bannerUrl,
      bannerPosition: tenant.bannerPosition || 'center',
      storeSchedule: tenant.storeSchedule || '',
      storeDescription: tenant.storeDescription || '',
      storeAnnouncement: tenant.storeAnnouncement || '',
      isStoreActive: tenant.isStoreActive !== false
    };
  }

  async updateStoreConfig(tenantId, data) {
    const {
      name,
      document,
      phone,
      whatsappNumber,
      address,
      storeDescription,
      storeAnnouncement,
      isStoreActive,
      storeSchedule,
      bannerPosition
    } = data;

    const cleanStr = (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return String(val).trim();
    };

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: cleanStr(name) || undefined,
        document: cleanStr(document),
        phone: cleanStr(phone),
        whatsappNumber: cleanStr(whatsappNumber),
        address: cleanStr(address),
        storeDescription: cleanStr(storeDescription),
        storeAnnouncement: cleanStr(storeAnnouncement),
        isStoreActive: isStoreActive !== undefined ? Boolean(isStoreActive) : undefined,
        storeSchedule: cleanStr(storeSchedule),
        bannerPosition: cleanStr(bannerPosition) || undefined
      }
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      document: updated.document,
      phone: updated.phone,
      whatsappNumber: updated.whatsappNumber,
      address: updated.address,
      logoUrl: updated.logoUrl,
      bannerUrl: updated.bannerUrl,
      bannerPosition: updated.bannerPosition,
      storeSchedule: updated.storeSchedule,
      storeDescription: updated.storeDescription,
      storeAnnouncement: updated.storeAnnouncement,
      isStoreActive: updated.isStoreActive
    };
  }

  async updateLogo(tenantId, logoUrl) {
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true }
    });

    if (existing?.logoUrl && existing.logoUrl !== logoUrl) {
      deleteUploadedFile(existing.logoUrl);
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl }
    });
    return { logoUrl: updated.logoUrl };
  }

  async deleteLogo(tenantId) {
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true }
    });

    if (existing?.logoUrl) {
      deleteUploadedFile(existing.logoUrl);
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: null }
    });
    return { logoUrl: null };
  }

  async updateBanner(tenantId, bannerUrl) {
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { bannerUrl: true }
    });

    if (existing?.bannerUrl && existing.bannerUrl !== bannerUrl) {
      deleteUploadedFile(existing.bannerUrl);
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { bannerUrl }
    });
    return { bannerUrl: updated.bannerUrl };
  }

  async deleteBanner(tenantId) {
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { bannerUrl: true }
    });

    if (existing?.bannerUrl) {
      deleteUploadedFile(existing.bannerUrl);
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { bannerUrl: null }
    });
    return { bannerUrl: null };
  }

  // ==========================================
  // 4. ADMINISTRACIÓN: GESTIÓN DE PEDIDOS
  // ==========================================
  async getStoreOrders(tenantId, query = {}) {
    const { filter = 'active', dateFrom, dateTo, search } = query;

    const where = {
      tenantId,
      isOnlineStore: true
    };

    if (filter === 'active') {
      where.status = { in: ['PENDING', 'PREPARING', 'READY'] };
    } else if (filter === 'history') {
      where.status = { in: ['DELIVERED', 'CANCELLED'] };
    } else if (filter && filter !== 'all') {
      where.status = filter;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { customerName: { contains: s } },
        { customerPhone: { contains: s } },
        { deliveryAddress: { contains: s } }
      ];
      if (/^\d+$/.test(s)) {
        where.OR.push({ orderNumber: parseInt(s, 10) });
      }
    }

    return await prisma.order.findMany({
      where,
      include: {
        details: {
          include: {
            product: true
          }
        },
        customer: true,
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            finalAmount: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getActiveCount(tenantId) {
    const [pendingCount, activeCount] = await Promise.all([
      prisma.order.count({
        where: {
          tenantId,
          isOnlineStore: true,
          status: 'PENDING'
        }
      }),
      prisma.order.count({
        where: {
          tenantId,
          isOnlineStore: true,
          status: { in: ['PENDING', 'PREPARING', 'READY'] }
        }
      })
    ]);

    const latestPending = await prisma.order.findFirst({
      where: {
        tenantId,
        isOnlineStore: true,
        status: 'PENDING'
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      pendingCount,
      activeCount,
      latestPending
    };
  }

  async updateOrderStatus(tenantId, orderId, status, userId = null) {
    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error(`Estado no válido: ${status}`), { statusCode: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { sale: true }
    });

    if (!order) {
      throw Object.assign(new Error('Pedido no encontrado'), { statusCode: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    if (status === 'DELIVERED' && !order.sale) {
      try {
        await this.convertOrderToSale(tenantId, orderId, userId);
      } catch (saleErr) {
        console.warn(`[STORE] Aviso: No se pudo auto-facturar el pedido #${order.orderNumber}: ${saleErr.message}`);
        return {
          ...updated,
          invoicingWarning: `El pedido fue entregado, pero no se pudo facturar automáticamente en caja: ${saleErr.message}. Realiza la facturación manualmente.`
        };
      }
    }

    return updated;
  }

  // ==========================================
  // 5. FACTURAR / CONVERTIR PEDIDO A VENTA
  // ==========================================
  async convertOrderToSale(tenantId, orderId, userId, data = {}) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        details: {
          include: {
            product: {
              include: {
                ingredients: true,
                modifiers: {
                  include: {
                    options: {
                      include: {
                        linkedProduct: { include: { ingredients: true } }
                      }
                    }
                  }
                },
                additions: true
              }
            }
          }
        },
        sale: true
      }
    });

    if (!order) {
      throw Object.assign(new Error('Pedido no encontrado'), { statusCode: 404 });
    }

    if (order.sale) {
      return order.sale;
    }

    let activeSession = null;
    if (userId) {
      activeSession = await prisma.cashSession.findFirst({
        where: { userId, status: 'OPEN' }
      });
    }

    if (!activeSession) {
      activeSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' }
      });
    }

    if (!activeSession) {
      throw Object.assign(new Error('No hay una sesión de caja abierta en este momento para registrar la venta en Caja y Facturas.'), { statusCode: 400 });
    }

    let paymentMethod = null;
    if (data.paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: data.paymentMethodId, tenantId }
      });
    }

    if (!paymentMethod && order.paymentMethodName) {
      const trimmed = order.paymentMethodName.trim();
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { tenantId, name: trimmed }
      });
      if (!paymentMethod) {
        const allMethods = await prisma.paymentMethod.findMany({ where: { tenantId } });
        paymentMethod = allMethods.find(m =>
          m.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          trimmed.toLowerCase().includes(m.name.toLowerCase())
        );
      }
    }

    if (!paymentMethod) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { tenantId, isActive: true, name: 'Efectivo' }
      });
    }
    if (!paymentMethod) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' }
      });
    }

    if (!paymentMethod) {
      throw Object.assign(new Error('No hay métodos de pago activos configurados en el establecimiento'), { statusCode: 400 });
    }

    const isCreditSale = paymentMethod.name.toLowerCase().includes('crédito') ||
                         paymentMethod.name.toLowerCase().includes('credito') ||
                         paymentMethod.name.toLowerCase().includes('fiao');

    if (isCreditSale) {
      if (!order.customerId) {
        throw Object.assign(new Error('No se puede facturar a crédito un pedido sin cliente registrado asociado.'), { statusCode: 400 });
      }
      const orderCustomer = await prisma.customer.findFirst({
        where: { id: order.customerId, tenantId }
      });
      if (
        !orderCustomer ||
        orderCustomer.document === '222222222222' ||
        (orderCustomer.name || '').trim().toLowerCase() === 'consumidor final'
      ) {
        throw Object.assign(new Error('No se puede facturar a crédito al cliente genérico "Consumidor final".'), { statusCode: 400 });
      }
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `FE-WEB-${order.orderNumber}-${randomSuffix.toString().slice(0, 2)}`;

    return await prisma.$transaction(async (tx) => {
      const processedDetails = order.details.map(d => {
        const parsedModifiers = typeof d.modifiers === 'string' ? JSON.parse(d.modifiers) : (d.modifiers || []);
        const parsedAdditions = typeof d.additions === 'string' ? JSON.parse(d.additions) : (d.additions || []);
        return {
          ...(d.product || {}),
          ...d,
          id: d.productId,
          productId: d.productId,
          name: d.product?.name || 'Producto',
          trackStock: Boolean(d.product?.trackStock),
          isCombo: Boolean(d.product?.isCombo),
          ingredients: d.product?.ingredients || [],
          modifiers: parsedModifiers,
          additions: parsedAdditions
        };
      });

      const costedDetails = await MovementService.processSaleInventoryAndCost(processedDetails, invoiceNumber, tenantId, userId, tx);

      const sale = await tx.sale.create({
        data: {
          tenantId,
          orderId: order.id,
          customerId: order.customerId,
          paymentMethodId: paymentMethod.id,
          cashSessionId: activeSession.id,
          invoiceNumber,
          totalAmount: order.totalAmount,
          discount: 0,
          finalAmount: order.totalAmount,
          details: {
            create: costedDetails.map(d => {
              const mods = Array.isArray(d.modifiers) ? d.modifiers : [];
              const adds = Array.isArray(d.additions) ? d.additions : [];
              const descParts = [];
              if (mods.length > 0) descParts.push(mods.map(m => `${m.modifierName || 'Opción'}: ${m.optionName || m.name || ''}`).join(', '));
              if (adds.length > 0) descParts.push(adds.map(a => `+ ${a.name}`).join(', '));
              if (d.notes) descParts.push(`Nota: "${d.notes}"`);
              const finalNotes = descParts.length > 0 ? descParts.join(' | ') : (d.notes || null);

              const validAdditions = adds
                .map(a => ({
                  additionId: a.additionId || a.id,
                  name: a.name || 'Adición',
                  quantity: parseInt(a.quantity || 1, 10),
                  price: parseFloat(a.price || 0)
                }))
                .filter(a => Boolean(a.additionId));

              const validVariations = mods
                .map(m => ({
                  variationId: m.variationId || m.optionId || m.id,
                  name: m.optionName || m.name || 'Variedad',
                  price: parseFloat(m.priceExtra ?? m.price ?? 0)
                }))
                .filter(m => Boolean(m.variationId));

              return {
                productId: d.productId,
                quantity: d.quantity,
                unitPrice: d.unitPrice,
                subtotal: d.subtotal,
                unitCost: d.unitCost || 0,
                totalCost: d.totalCost || 0,
                notes: finalNotes,
                ...(validAdditions.length > 0 ? { saleDetailAdditions: { create: validAdditions } } : {}),
                ...(validVariations.length > 0 ? { saleDetailVariations: { create: validVariations } } : {})
              };
            })
          },
          payments: {
            create: [{
              paymentMethodId: paymentMethod.id,
              amount: order.totalAmount
            }]
          }
        }
      });

      if (isCreditSale && order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { increment: order.totalAmount } }
        });

        await tx.customerCredit.create({
          data: {
            customerId: order.customerId,
            type: 'DEBT',
            amount: order.totalAmount,
            description: `Venta a Crédito Tienda Virtual #${invoiceNumber}`,
            saleId: sale.id,
            paymentMethodId: paymentMethod.id,
            cashSessionId: activeSession.id
          }
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'DELIVERED' }
      });

      return sale;
    });
  }
}

module.exports = new StoreService();
