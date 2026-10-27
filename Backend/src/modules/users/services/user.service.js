const prisma = require('../../../config/prisma');
const bcrypt = require('bcrypt');
const { getTenantId, isSuperAdmin } = require('../../../context/tenantContext');
const { validatePassword } = require('../../../utils/passwordValidator');

class UserService {
  // 1. Obtener todos los roles para el formulario del Frontend
  async getRoles(tenantIdParam = null) {
    const tenantId = tenantIdParam || getTenantId();
    const where = {};
    if (tenantId) {
      where.OR = [
        { tenantId },
        { tenantId: null }
      ];
    }
    if (!isSuperAdmin()) {
      where.name = { notIn: ['SuperAdmin', 'SUPERADMIN', 'superadmin'] };
    }
    const roles = await prisma.role.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    if (!isSuperAdmin()) {
      return roles.filter(r => String(r.name || '').trim().toUpperCase() !== 'SUPERADMIN');
    }
    return roles;
  }

  // Obtener lista de restaurantes (tenants) para el filtro de SuperAdmin
  async getRestaurants() {
    return await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      },
      orderBy: { name: 'asc' }
    });
  }

  // 2. Obtener usuarios (excluyendo password e incluyendo los datos del Rol, Teléfono y Establecimiento)
  async getAllUsers(filters = {}) {
    const where = {};
    if (isSuperAdmin()) {
      if (filters.tenantId && filters.tenantId !== 'ALL') {
        where.tenantId = filters.tenantId;
      }
    } else {
      where.tenantId = getTenantId();
    }

    return await prisma.user.findMany({
      where,
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        isActive: true, 
        createdAt: true,
        roleId: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        role: true // Traemos el objeto del rol relacional
      },
      orderBy: { name: 'asc' }
    });
  }

  // 3. Crear Usuario (ahora valida límite de maxUsers y pertenencia de roleId)
  async createUser(data) {
    const tenantId = (isSuperAdmin() && data.tenantId) ? data.tenantId : getTenantId();
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

    const targetRole = await prisma.role.findFirst({
      where: {
        id: data.roleId,
        ...(tenantId ? { tenantId } : {})
      }
    });
    if (!targetRole) {
      const error = new Error('El rol seleccionado no existe o no pertenece a este establecimiento');
      error.statusCode = 400;
      throw error;
    }
    if (!isSuperAdmin() && String(targetRole.name || '').trim().toUpperCase() === 'SUPERADMIN') {
      const error = new Error('No tienes permisos para asignar el rol SuperAdmin');
      error.statusCode = 403;
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
        roleId: targetRole.id,
        tenantId: tenantId || null
      }
    });

    delete user.password;
    return user;
  }

  // 4. Actualizar Usuario
  async updateUser(id, data, requestingUserId = null) {
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const currentTenantId = getTenantId();
    if (!isSuperAdmin() && currentTenantId && existingUser.tenantId !== currentTenantId) {
      const error = new Error('No tienes permisos para modificar un usuario de otro establecimiento');
      error.statusCode = 403;
      throw error;
    }

    // Impedir que el usuario autenticado desactive su propia cuenta o cambie su propio rol en sesión
    if (requestingUserId && existingUser.id === requestingUserId) {
      if (data.isActive === false) {
        const error = new Error('No puedes desactivar tu propia cuenta mientras estás en sesión');
        error.statusCode = 400;
        throw error;
      }
      if (data.roleId && data.roleId !== existingUser.roleId) {
        const error = new Error('No puedes cambiar el rol de tu propia cuenta en uso');
        error.statusCode = 400;
        throw error;
      }
    }

    // Protección de seguridad para cuentas demo
    if (existingUser.email && existingUser.email.endsWith('@demo.com')) {
      if (data.password && data.password.trim() !== '') {
        const error = new Error('Por seguridad, la contraseña de las cuentas de demostración no puede ser modificada.');
        error.statusCode = 403;
        throw error;
      }
      if (data.email && data.email !== existingUser.email) {
        const error = new Error('El correo de las cuentas de demostración no puede ser alterado.');
        error.statusCode = 403;
        throw error;
      }
    }

    const targetTenantForRole = (isSuperAdmin() && data.tenantId !== undefined)
      ? (data.tenantId || existingUser.tenantId)
      : existingUser.tenantId;

    // Si se reactiva un usuario inactivo (isActive: false -> true), validar límite maxUsers del plan
    if (!existingUser.isActive && data.isActive === true && targetTenantForRole) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: targetTenantForRole },
        include: { plan: true }
      });
      if (tenant?.plan && tenant.plan.maxUsers !== -1) {
        const activeCount = await prisma.user.count({
          where: { tenantId: targetTenantForRole, isActive: true }
        });
        if (activeCount >= tenant.plan.maxUsers) {
          const error = new Error(`Has alcanzado el límite máximo de ${tenant.plan.maxUsers} usuarios activos permitidos en tu ${tenant.plan.name}.`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    let validatedRoleId = undefined;
    if (data.roleId) {
      const targetRole = await prisma.role.findFirst({
        where: {
          id: data.roleId,
          ...(targetTenantForRole ? { tenantId: targetTenantForRole } : {})
        }
      });
      if (!targetRole) {
        const error = new Error('El rol seleccionado no existe o no pertenece a este establecimiento');
        error.statusCode = 400;
        throw error;
      }
      if (!isSuperAdmin() && String(targetRole.name || '').trim().toUpperCase() === 'SUPERADMIN') {
        const error = new Error('No tienes permisos para asignar el rol SuperAdmin');
        error.statusCode = 403;
        throw error;
      }
      validatedRoleId = targetRole.id;
    }

    // Impedir dejar al restaurante sin al menos un Administrador activo
    const existingRoleName = String(existingUser.role?.name || '').trim().toLowerCase();
    const isCurrentlyAdmin = existingRoleName === 'administrador';
    const isDeactivatingAdmin = isCurrentlyAdmin && existingUser.isActive && data.isActive === false;
    const isDemotingAdmin = isCurrentlyAdmin && existingUser.isActive && validatedRoleId && validatedRoleId !== existingUser.roleId;

    if ((isDeactivatingAdmin || isDemotingAdmin) && existingUser.tenantId) {
      const remainingAdmins = await prisma.user.count({
        where: {
          tenantId: existingUser.tenantId,
          id: { not: existingUser.id },
          isActive: true,
          role: { name: 'Administrador' }
        }
      });
      if (remainingAdmins === 0) {
        const error = new Error('El establecimiento debe conservar al menos un usuario Administrador activo');
        error.statusCode = 400;
        throw error;
      }
    }

    const updateData = {
      name: data.name,
      email: data.email,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      ...(validatedRoleId ? { roleId: validatedRoleId } : {}),
      isActive: data.isActive
    };

    // Si se desactiva al usuario, revocar su refreshToken inmediatamente
    if (data.isActive === false) {
      updateData.refreshToken = null;
    }

    if (isSuperAdmin() && data.tenantId !== undefined) {
      updateData.tenantId = data.tenantId || null;
    }

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

    // Protección de seguridad para cuentas demo
    if (user.email && user.email.endsWith('@demo.com')) {
      const error = new Error('Las cuentas de demostración oficiales están protegidas y no pueden ser eliminadas.');
      error.statusCode = 403;
      throw error;
    }

    // Si la petición viene con contexto de tenant específico, no permitir borrar de otro tenant a menos que sea SuperAdmin
    if (currentTenantId && user.tenantId && user.tenantId !== currentTenantId && !isSuperAdmin()) {
      const error = new Error('No tienes permisos para eliminar este usuario');
      error.statusCode = 403;
      throw error;
    }

    // Impedir eliminar al único Administrador activo del restaurante
    const roleName = String(user.role?.name || '').trim().toLowerCase();
    if (roleName === 'administrador' && user.tenantId && user.isActive) {
      const remainingAdmins = await prisma.user.count({
        where: {
          tenantId: user.tenantId,
          id: { not: user.id },
          isActive: true,
          role: { name: 'Administrador' }
        }
      });
      if (remainingAdmins === 0) {
        const error = new Error('No se puede eliminar al único Administrador activo del establecimiento.');
        error.statusCode = 400;
        throw error;
      }
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
        await tx.cashAudit.deleteMany({
          where: { cashSessionId: { in: cashSessionIds } }
        });
        await tx.customerCredit.deleteMany({
          where: { cashSessionId: { in: cashSessionIds } }
        });
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

          await tx.salePayment.deleteMany({ where: { saleId: { in: saleIds } } });
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
          await tx.salePayment.deleteMany({ where: { saleId: { in: linkedSaleIds } } });
          await tx.customerCredit.deleteMany({ where: { saleId: { in: linkedSaleIds } } });
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
