const prisma = require('../../../config/prisma');
const MovementService = require('../../inventory/services/movement.service');
const { deleteUploadedFile } = require('../../../utils/fileCleaner');

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

    if (tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE') {
      throw Object.assign(new Error('El restaurante se encuentra temporalmente inactivo'), { statusCode: 403 });
    }

    // Categorías y Productos disponibles para la tienda
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
          include: {
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
      // Priorizar Efectivo en la primera posición
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

    if (tenant.status === 'SUSPENDED' || tenant.status === 'INACTIVE') {
      throw Object.assign(new Error('El restaurante no está aceptando pedidos en este momento'), { statusCode: 403 });
    }

    if (tenant.isStoreActive === false) {
      throw Object.assign(new Error('La tienda virtual se encuentra en pausa temporalmente. Por favor intenta más tarde o comunícate directamente.'), { statusCode: 400 });
    }

    // Validar productos y calcular subtotales
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
        }
      });

      if (!product) {
        throw Object.assign(new Error(`Uno de los productos seleccionados no está disponible en la tienda`), { statusCode: 400 });
      }

      const qty = parseInt(item.quantity, 10) || 1;
      let unitPrice = parseFloat(product.price);

      // Sumar modificadores si tienen costo extra
      const selectedModifiers = item.modifiers || [];
      for (const mod of selectedModifiers) {
        if (mod.priceExtra) {
          unitPrice += parseFloat(mod.priceExtra);
        }
      }

      // Sumar adiciones
      const selectedAdditions = item.additions || [];
      for (const add of selectedAdditions) {
        if (add.price) {
          unitPrice += parseFloat(add.price) * (add.quantity || 1);
        }
      }

      const subtotal = unitPrice * qty;
      totalCalculated += subtotal;

      processedDetails.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        subtotal,
        notes: item.notes || null,
        modifiers: selectedModifiers,
        additions: selectedAdditions
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

    const updated = await prisma.tenant.update({
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

    const updated = await prisma.tenant.update({
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
        { deliveryAddress: { contains: s } },
        { orderNumber: !isNaN(parseInt(s, 10)) ? parseInt(s, 10) : undefined }
      ].filter(cond => cond.orderNumber !== undefined || !cond.orderNumber);
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

    // Obtener el ID y número del último pedido PENDING para alertas auditivas
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

  async updateOrderStatus(tenantId, orderId, status) {
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

    // Si el pedido se marca como ENTREGADO y aún no tiene venta en caja/facturas, se factura automáticamente
    if (status === 'DELIVERED' && !order.sale) {
      try {
        await this.convertOrderToSale(tenantId, orderId, null);
      } catch (saleErr) {
        console.warn(`[STORE] Aviso: No se pudo auto-facturar el pedido #${order.orderNumber}: ${saleErr.message}`);
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
            product: { include: { ingredients: true } }
          }
        },
        sale: true
      }
    });

    if (!order) {
      throw Object.assign(new Error('Pedido no encontrado'), { statusCode: 404 });
    }

    // Idempotencia: si ya está facturado, retornamos la venta existente sin fallar
    if (order.sale) {
      return order.sale;
    }

    // Buscar caja abierta (del usuario o de la sede activa)
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

    // Resolver método de pago
    let paymentMethod = null;
    if (data.paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: data.paymentMethodId, tenantId }
      });
    }

    // Buscar por el nombre del método registrado en el pedido (ej. Efectivo, Bancolombia, Nequi)
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

    // Fallbacks si no se encontró coincidencia directa
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

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `FE-WEB-${order.orderNumber}-${randomSuffix.toString().slice(0, 2)}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Preparar detalles para el MovementService
      const processedDetails = order.details.map(d => {
        return {
          ...d,
          modifiers: typeof d.modifiers === 'string' ? JSON.parse(d.modifiers) : (d.modifiers || []),
          additions: typeof d.additions === 'string' ? JSON.parse(d.additions) : (d.additions || [])
        };
      });

      // 2. Calcular costos y deducir inventario unificado
      const costedDetails = await MovementService.processSaleInventoryAndCost(processedDetails, invoiceNumber, tenantId, userId, tx);

      // 3. Crear la venta con los costos inyectados
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
              const mods = d.modifiers || [];
              const adds = d.additions || [];
              const descParts = [];
              if (mods.length > 0) descParts.push(mods.map(m => `${m.modifierName}: ${m.optionName}`).join(', '));
              if (adds.length > 0) descParts.push(adds.map(a => `+ ${a.name}`).join(', '));
              if (d.notes) descParts.push(`Nota: "${d.notes}"`);
              const finalNotes = descParts.length > 0 ? descParts.join(' | ') : (d.notes || null);

              return {
                productId: d.productId,
                quantity: d.quantity,
                unitPrice: d.unitPrice,
                subtotal: d.subtotal,
                unitCost: d.unitCost || 0,
                totalCost: d.totalCost || 0,
                notes: finalNotes
              };
            })
          }
        }
      });

      // Actualizar pedido a entregado
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'DELIVERED' }
      });

      return sale;
    });
  }
}

module.exports = new StoreService();
