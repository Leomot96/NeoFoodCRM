const prisma = require('../../../config/prisma');

class SaasService {
  /**
   * Obtiene métricas globales de toda la plataforma SaaS
   */
  async getPlatformStats() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      totalUsers,
      totalSales,
      salesRevenueAgg,
      plans
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      prisma.tenant.count({ where: { status: 'TRIAL' } }),
      prisma.user.count(),
      prisma.sale.count(),
      prisma.sale.aggregate({
        _sum: { finalAmount: true }
      }),
      prisma.plan.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { tenants: true } }
        }
      })
    ]);

    const totalRevenue = salesRevenueAgg._sum.finalAmount
      ? parseFloat(salesRevenueAgg._sum.finalAmount)
      : 0;

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        trial: trialTenants
      },
      users: {
        total: totalUsers
      },
      sales: {
        total: totalSales,
        revenue: totalRevenue
      },
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        priceMonthly: parseFloat(p.priceMonthly),
        tenantsCount: p._count.tenants
      }))
    };
  }

  /**
   * Lista todos los restaurantes/tenants con filtros y estadísticas operativas
   */
  async getAllTenants(query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    // Filtro por búsqueda
    if (query.search && query.search.trim() !== '') {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term } },
        { slug: { contains: term } },
        { email: { contains: term } },
        { document: { contains: term } }
      ];
    }

    // Filtro por estado
    if (query.status && query.status.trim() !== '' && query.status !== 'ALL') {
      where.status = query.status.trim().toUpperCase();
    }

    // Filtro por plan
    if (query.planCode && query.planCode.trim() !== '' && query.planCode !== 'ALL') {
      where.plan = { code: query.planCode.trim() };
    }

    const [total, tenants, salesByTenant] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              priceMonthly: true,
              priceAnnual: true,
              maxTables: true,
              maxUsers: true
            }
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
              createdAt: true,
              role: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: {
              users: true,
              tables: true,
              products: true,
              sales: true
            }
          }
        }
      }),
      prisma.sale.groupBy({
        by: ['tenantId'],
        _sum: { finalAmount: true }
      })
    ]);

    // Mapear ingresos por tenant
    const salesMap = {};
    salesByTenant.forEach(s => {
      if (s.tenantId) {
        salesMap[s.tenantId] = s._sum.finalAmount ? parseFloat(s._sum.finalAmount) : 0;
      }
    });

    const formattedTenants = tenants.map(t => {
      // Identificar al creador (primer admin o primer usuario registrado)
      const creator = t.users.find(u => u.role?.name?.toLowerCase().includes('admin')) || t.users[0] || null;

      // Calcular días restantes
      let daysRemaining = null;
      let isExpired = false;
      if (t.subscriptionEndsAt) {
        const diffMs = new Date(t.subscriptionEndsAt).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining < 0;
      }

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        document: t.document,
        phone: t.phone,
        email: t.email,
        address: t.address,
        status: t.status,
        billingCycle: t.billingCycle || 'monthly',
        paymentStatus: t.paymentStatus || 'VERIFIED',
        subscriptionEndsAt: t.subscriptionEndsAt,
        daysRemaining,
        isExpired,
        creator: creator ? {
          id: creator.id,
          name: creator.name,
          email: creator.email,
          phone: creator.phone || t.phone,
          role: creator.role?.name,
          createdAt: creator.createdAt
        } : null,
        plan: t.plan,
        stats: {
          users: t._count.users,
          tables: t._count.tables,
          products: t._count.products,
          sales: t._count.sales,
          totalRevenue: salesMap[t.id] || 0
        },
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    });

    return {
      tenants: formattedTenants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtiene todos los usuarios registrados en la plataforma con filtros por nombre, correo y restaurante
   */
  async getAllPlatformUsers(query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where = {};

    // Filtro por restaurante / tenant específico (MUY IMPORTANTE)
    if (query.tenantId && query.tenantId.trim() !== '' && query.tenantId !== 'ALL') {
      where.tenantId = query.tenantId.trim();
    }

    // Filtro por nombre
    if (query.name && query.name.trim() !== '') {
      where.name = { contains: query.name.trim() };
    }

    // Filtro por correo
    if (query.email && query.email.trim() !== '') {
      where.email = { contains: query.email.trim() };
    }

    // Búsqueda libre (nombre o correo)
    if (query.search && query.search.trim() !== '') {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term } },
        { email: { contains: term } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              status: true,
              billingCycle: true,
              paymentStatus: true,
              subscriptionEndsAt: true,
              plan: { select: { id: true, name: true, code: true } }
            }
          }
        }
      })
    ]);

    const formattedUsers = users.map(u => {
      let daysRemaining = null;
      let isExpired = false;
      if (u.tenant?.subscriptionEndsAt) {
        const diffMs = new Date(u.tenant.subscriptionEndsAt).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining < 0;
      }

      return {
        ...u,
        tenant: u.tenant ? {
          ...u.tenant,
          daysRemaining,
          isExpired
        } : null
      };
    });

    return {
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtiene información detallada de una sede específica incluyendo el creador completo
   */
  async getTenantById(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            role: { select: { name: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        configurations: true,
        _count: {
          select: {
            tables: true,
            products: true,
            sales: true,
            customers: true,
            orders: true
          }
        }
      }
    });

    if (!tenant) {
      const error = new Error('Establecimiento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const salesAgg = await prisma.sale.aggregate({
      where: { tenantId: id },
      _sum: { finalAmount: true },
      _count: { id: true }
    });

    // Identificar creador
    const creator = tenant.users.find(u => u.role?.name?.toLowerCase().includes('admin')) || tenant.users[0] || null;

    let daysRemaining = null;
    let isExpired = false;
    if (tenant.subscriptionEndsAt) {
      const diffMs = new Date(tenant.subscriptionEndsAt).getTime() - Date.now();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining < 0;
    }

    return {
      ...tenant,
      creator: creator ? {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        phone: creator.phone || tenant.phone,
        role: creator.role?.name,
        createdAt: creator.createdAt
      } : null,
      daysRemaining,
      isExpired,
      totalSalesRevenue: salesAgg._sum.finalAmount ? parseFloat(salesAgg._sum.finalAmount) : 0
    };
  }

  /**
   * Cambia el estado de un tenant (ACTIVE, SUSPENDED, TRIAL, INACTIVE)
   */
  async updateTenantStatus(id, status, reason = '') {
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'TRIAL', 'INACTIVE'];
    const cleanStatus = status?.toUpperCase();

    if (!validStatuses.includes(cleanStatus)) {
      const error = new Error(`Estado inválido. Opciones válidas: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      const error = new Error('Establecimiento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: cleanStatus },
      include: { plan: true }
    });

    return updated;
  }

  /**
   * Cambia o actualiza el plan asignado a un tenant
   */
  async updateTenantPlan(id, planId, billingCycle = null, daysToAdd = null) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      const error = new Error('El plan especificado no existe');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { planId: plan.id };
    if (billingCycle) {
      updateData.billingCycle = billingCycle;
    }
    if (typeof daysToAdd === 'number' && daysToAdd > 0) {
      updateData.subscriptionEndsAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: { plan: true }
    });

    return updated;
  }

  /**
   * Verifica el pago y activa la suscripción del restaurante de acuerdo al plan y periodo escogido
   */
  async activateTenantPlan(id, data = {}) {
    const { planId, billingCycle, durationDays, customEndsAt } = data;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!tenant) {
      const error = new Error('Establecimiento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const targetPlanId = planId || tenant.planId;
    let targetPlan = null;
    if (targetPlanId) {
      targetPlan = await prisma.plan.findUnique({ where: { id: targetPlanId } });
    }

    const targetCycle = billingCycle || tenant.billingCycle || 'monthly';

    // Determinar la nueva fecha de vencimiento
    let newEndsAt = null;
    if (customEndsAt) {
      newEndsAt = new Date(customEndsAt);
    } else {
      let days = 30; // default mensual
      if (typeof durationDays === 'number' && durationDays > 0) {
        days = durationDays;
      } else if (targetCycle === 'annual') {
        days = 365;
      } else if (targetCycle === 'semiannual') {
        days = 180;
      } else if (targetCycle === 'trial') {
        days = 7;
      }

      // Si aún no ha vencido, extendemos desde la fecha actual de fin o desde ahora
      const baseTime = (tenant.subscriptionEndsAt && new Date(tenant.subscriptionEndsAt) > new Date())
        ? new Date(tenant.subscriptionEndsAt).getTime()
        : Date.now();

      newEndsAt = new Date(baseTime + days * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        paymentStatus: 'VERIFIED',
        billingCycle: targetCycle,
        planId: targetPlan ? targetPlan.id : tenant.planId,
        subscriptionEndsAt: newEndsAt
      },
      include: { plan: true }
    });

    return updated;
  }

  /**
   * Obtiene la lista completa de planes SaaS
   */
  async getAllPlans() {
    return await prisma.plan.findMany({
      orderBy: { priceMonthly: 'asc' },
      include: {
        _count: { select: { tenants: true } }
      }
    });
  }

  /**
   * Elimina un restaurante definitivamente y absolutamente todo lo relacionado con él
   */
  async deleteTenantPermanently(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            sales: true,
            products: true,
            tables: true
          }
        }
      }
    });

    if (!tenant) {
      const error = new Error('Establecimiento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Ejecución transaccional en orden inverso de dependencias de Clave Foránea
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar relaciones de Ventas
      const sales = await tx.sale.findMany({ where: { tenantId }, select: { id: true } });
      const saleIds = sales.map(s => s.id);

      if (saleIds.length > 0) {
        const saleDetails = await tx.saleDetail.findMany({
          where: { saleId: { in: saleIds } },
          select: { id: true }
        });
        const detailIds = saleDetails.map(sd => sd.id);

        if (detailIds.length > 0) {
          await tx.saleDetailAddition.deleteMany({ where: { saleDetailId: { in: detailIds } } });
          await tx.saleDetailVariation.deleteMany({ where: { saleDetailId: { in: detailIds } } });
          await tx.saleDetail.deleteMany({ where: { id: { in: detailIds } } });
        }

        await tx.customerCredit.deleteMany({ where: { saleId: { in: saleIds } } });
        await tx.sale.deleteMany({ where: { tenantId } });
      }

      // 2. Eliminar Órdenes
      const orders = await tx.order.findMany({ where: { tenantId }, select: { id: true } });
      const orderIds = orders.map(o => o.id);
      if (orderIds.length > 0) {
        await tx.orderDetail.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { tenantId } });
      }

      // 3. Eliminar Sesiones de Caja, Movimientos y Auditorías
      const cashSessions = await tx.cashSession.findMany({ where: { tenantId }, select: { id: true } });
      const sessionIds = cashSessions.map(cs => cs.id);
      if (sessionIds.length > 0) {
        await tx.cashAudit.deleteMany({ where: { cashSessionId: { in: sessionIds } } });
        await tx.cashMovement.deleteMany({ where: { cashSessionId: { in: sessionIds } } });
        await tx.cashSession.deleteMany({ where: { tenantId } });
      }

      // 4. Eliminar Gastos
      await tx.expense.deleteMany({ where: { tenantId } });

      // 5. Eliminar Compras y Proveedores
      const purchases = await tx.purchase.findMany({ where: { tenantId }, select: { id: true } });
      const purchaseIds = purchases.map(p => p.id);
      if (purchaseIds.length > 0) {
        await tx.purchaseDetail.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
        await tx.purchase.deleteMany({ where: { tenantId } });
      }
      await tx.supplier.deleteMany({ where: { tenantId } });

      // 6. Eliminar Movimientos de Inventario
      await tx.inventoryMovement.deleteMany({ where: { tenantId } });

      // 7. Eliminar Modificadores, Adiciones, Ingredientes de Productos y Productos
      const products = await tx.product.findMany({ where: { tenantId }, select: { id: true } });
      const productIds = products.map(p => p.id);
      if (productIds.length > 0) {
        await tx.productAddition.deleteMany({ where: { productId: { in: productIds } } });
        await tx.productIngredient.deleteMany({ where: { productId: { in: productIds } } });
        
        const modifiers = await tx.productModifier.findMany({
          where: { productId: { in: productIds } },
          select: { id: true }
        });
        const modifierIds = modifiers.map(m => m.id);
        if (modifierIds.length > 0) {
          const options = await tx.productModifierOption.findMany({
            where: { modifierId: { in: modifierIds } },
            select: { id: true }
          });
          const optionIds = options.map(o => o.id);
          if (optionIds.length > 0) {
            await tx.modifierOptionIngredient.deleteMany({ where: { optionId: { in: optionIds } } });
            await tx.productModifierOption.deleteMany({ where: { id: { in: optionIds } } });
          }
          await tx.productModifier.deleteMany({ where: { id: { in: modifierIds } } });
        }

        await tx.product.deleteMany({ where: { tenantId } });
      }

      await tx.ingredient.deleteMany({ where: { tenantId } });
      await tx.category.deleteMany({ where: { tenantId } });

      // 8. Eliminar Clientes y Créditos
      await tx.customerCredit.deleteMany({ where: { customer: { tenantId } } });
      await tx.customer.deleteMany({ where: { tenantId } });

      // 9. Eliminar Mesas, Métodos de Pago, Configuraciones y Auditorías
      await tx.table.deleteMany({ where: { tenantId } });
      await tx.paymentMethod.deleteMany({ where: { tenantId } });
      await tx.configuration.deleteMany({ where: { tenantId } });
      await tx.auditLog.deleteMany({ where: { tenantId } });

      // 10. Eliminar Usuarios y Roles
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });

      // 11. Eliminar el Tenant finalmente
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    return {
      success: true,
      message: `El restaurante "${tenant.name}" y todos sus datos asociados fueron eliminados permanentemente.`,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    };
  }

  /**
   * Elimina automáticamente los restaurantes que llevan más de 2 meses (60 días)
   * en estado INACTIVO o SUSPENDIDO.
   */
  async purgeExpiredInactiveTenants() {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const expiredTenants = await prisma.tenant.findMany({
      where: {
        status: { in: ['SUSPENDED', 'INACTIVE'] },
        updatedAt: { lte: twoMonthsAgo }
      },
      select: { id: true, name: true, slug: true, status: true, updatedAt: true }
    });

    const purged = [];
    for (const t of expiredTenants) {
      try {
        await this.deleteTenantPermanently(t.id);
        purged.push(t);
        console.log(`[AutoPurge] Restaurante inactivo purgado exitosamente: ${t.name} (${t.slug})`);
      } catch (err) {
        console.error(`[AutoPurge] Error purgando restaurante ${t.id}:`, err);
      }
    }

    return {
      count: purged.length,
      purged
    };
  }

  /**
   * Obtiene la cantidad de restaurantes que llevan más de 2 meses inactivos o suspendidos
   */
  async getExpiredInactiveCount() {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    return await prisma.tenant.count({
      where: {
        status: { in: ['SUSPENDED', 'INACTIVE'] },
        updatedAt: { lte: twoMonthsAgo }
      }
    });
  }

  /**
   * Elimina un usuario de la plataforma y todos sus registros
   */
  async deletePlatformUser(userId) {
    const userService = require('../../users/services/user.service');
    return await userService.deleteUser(userId);
  }
}

module.exports = new SaasService();
