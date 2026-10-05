const prisma = require('../../../config/prisma');
const bcrypt = require('bcrypt');
const { getTenantId } = require('../../../context/tenantContext');
const { validatePassword } = require('../../../utils/passwordValidator');

class UserService {
  // 1. Obtener todos los roles para el formulario del Frontend
  async getRoles() {
    return await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
  }

  // 2. Obtener usuarios (excluyendo password e incluyendo los datos del Rol y Teléfono)
  async getAllUsers() {
    return await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        isActive: true, 
        createdAt: true,
        roleId: true,
        role: true // Traemos el objeto del rol relacional
      },
      orderBy: { name: 'asc' }
    });
  }

  // 3. Crear Usuario (ahora valida límite de maxUsers y usa roleId)
  async createUser(data) {
    const tenantId = getTenantId();
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true }
      });

      if (tenant?.plan && tenant.plan.maxUsers !== -1) {
        const currentCount = await prisma.user.count({
          where: { tenantId, isActive: true }
        });

        if (currentCount >= tenant.plan.maxUsers) {
          const error = new Error(`Has alcanzado el límite máximo de ${tenant.plan.maxUsers} usuarios permitidos en tu ${tenant.plan.name}. Para registrar más personal, actualiza a un plan superior (Pro o Enterprise).`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      const error = new Error('El correo o usuario ya está registrado');
      error.statusCode = 400;
      throw error;
    }

    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      const error = new Error(passwordValidation.message);
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ? data.phone.trim() : null,
        password: hashedPassword,
        roleId: data.roleId
      }
    });

    delete user.password;
    return user;
  }

  // 4. Actualizar Usuario
  async updateUser(id, data) {
    const updateData = {
      name: data.name,
      email: data.email,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      roleId: data.roleId,
      isActive: data.isActive
    };

    if (data.password && data.password.trim() !== '') {
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        const error = new Error(passwordValidation.message);
        error.statusCode = 400;
        throw error;
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    delete user.password;
    return user;
  }

  // 5. Eliminar Usuario Definitivamente y sus Registros
  async deleteUser(id) {
    const currentTenantId = getTenantId();
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, tenant: true }
    });

    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Si la petición viene con contexto de tenant específico, no permitir borrar de otro tenant
    if (currentTenantId && user.tenantId && user.tenantId !== currentTenantId) {
      const error = new Error('No tienes permisos para eliminar este usuario');
      error.statusCode = 403;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Logs de auditoría
      await tx.auditLog.deleteMany({ where: { userId: id } });

      // 2. Auditorías de caja
      await tx.cashAudit.deleteMany({
        where: {
          OR: [{ auditorId: id }, { cashierId: id }]
        }
      });

      // 3. Gastos
      await tx.expense.deleteMany({ where: { userId: id } });

      // 4. Movimientos de inventario
      await tx.inventoryMovement.deleteMany({ where: { userId: id } });

      // 5. Sesiones de caja
      const userCashSessions = await tx.cashSession.findMany({
        where: { userId: id },
        select: { id: true }
      });
      const cashSessionIds = userCashSessions.map(cs => cs.id);

      if (cashSessionIds.length > 0) {
        await tx.cashMovement.deleteMany({
          where: { cashSessionId: { in: cashSessionIds } }
        });

        const sales = await tx.sale.findMany({
          where: { cashSessionId: { in: cashSessionIds } },
          select: { id: true, orderId: true }
        });
        const saleIds = sales.map(s => s.id);
        const orderIds = sales.map(s => s.orderId).filter(Boolean);

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
          await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
        }

        if (orderIds.length > 0) {
          await tx.orderDetail.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.order.deleteMany({ where: { id: { in: orderIds } } });
        }

        await tx.cashSession.deleteMany({ where: { id: { in: cashSessionIds } } });
      }

      // 6. Órdenes tomadas por este usuario
      const userOrders = await tx.order.findMany({
        where: { userId: id },
        select: { id: true }
      });
      const userOrderIds = userOrders.map(o => o.id);
      if (userOrderIds.length > 0) {
        const linkedSales = await tx.sale.findMany({
          where: { orderId: { in: userOrderIds } },
          select: { id: true }
        });
        const linkedSaleIds = linkedSales.map(s => s.id);
        if (linkedSaleIds.length > 0) {
          const details = await tx.saleDetail.findMany({
            where: { saleId: { in: linkedSaleIds } },
            select: { id: true }
          });
          const detailIds = details.map(d => d.id);
          if (detailIds.length > 0) {
            await tx.saleDetailAddition.deleteMany({ where: { saleDetailId: { in: detailIds } } });
            await tx.saleDetailVariation.deleteMany({ where: { saleDetailId: { in: detailIds } } });
            await tx.saleDetail.deleteMany({ where: { id: { in: detailIds } } });
          }
          await tx.sale.deleteMany({ where: { id: { in: linkedSaleIds } } });
        }

        await tx.orderDetail.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await tx.order.deleteMany({ where: { id: { in: userOrderIds } } });
      }

      // 7. Borrar usuario
      const deletedUser = await tx.user.delete({
        where: { id }
      });

      delete deletedUser.password;
      return deletedUser;
    });
  }
}

module.exports = new UserService();