const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../../utils/jwt.util');
const ROLES = require('../../constants/roles');

class AuthService {
  async loginUser(credentials) {
    const { email, password } = credentials;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        tenant: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      const error = new Error('Credenciales inválidas o usuario inactivo');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    // Verificar si el tenant asociado está activo (si no es SuperAdmin)
    const isSuper = user.role?.name === 'SuperAdmin' || user.role?.name === 'SUPERADMIN';
    if (!isSuper && user.tenant) {
      if (user.tenant.status === 'SUSPENDED') {
        const error = new Error('El establecimiento se encuentra suspendido. Por favor, contacta a soporte de NeoFood.');
        error.statusCode = 403;
        throw error;
      }

      if (user.tenant.paymentStatus === 'PENDING' || user.tenant.status === 'INACTIVE') {
        const error = new Error('Tu cuenta está pendiente de verificación de pago. Tan pronto el SuperAdmin confirme tu pago, tu plan será activado.');
        error.statusCode = 403;
        error.paymentPending = true;
        throw error;
      }

      if (user.tenant.subscriptionEndsAt && new Date(user.tenant.subscriptionEndsAt) < new Date()) {
        const error = new Error('El periodo de tu plan o prueba gratuita ha finalizado. Por favor, contacta a soporte para reactivarlo.');
        error.statusCode = 403;
        error.subscriptionExpired = true;
        throw error;
      }
    }

    // Generamos ambos tokens con contexto multi-tenant
    const payload = {
      id: user.id,
      role: user.role.name,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Guardamos el refresh token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role.name,
        tenantId: user.tenantId,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          phone: user.tenant.phone,
          status: user.tenant.status,
          billingCycle: user.tenant.billingCycle,
          paymentStatus: user.tenant.paymentStatus,
          subscriptionEndsAt: user.tenant.subscriptionEndsAt,
          plan: user.tenant.plan ? {
            name: user.tenant.plan.name,
            code: user.tenant.plan.code,
            maxTables: user.tenant.plan.maxTables,
            maxUsers: user.tenant.plan.maxUsers
          } : null
        } : null
      },
      accessToken,
      refreshToken,
    };
  }

  async logoutUser(userId) {
    // Al hacer logout, limpiamos el refresh token de la BD
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
    return true;
  }

  async refreshAccessToken(token) {
    if (!token) {
      const error = new Error('Refresh token requerido');
      error.statusCode = 401;
      throw error;
    }

    try {
      // 1. Verificamos la firma del Refresh Token
      const decoded = verifyToken(token, true);

      // 2. Verificamos que el usuario exista y tenga el mismo token guardado
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          role: true,
          tenant: true
        }
      });

      if (!user || user.refreshToken !== token) {
        const error = new Error('Refresh token inválido o expirado en DB');
        error.statusCode = 401;
        throw error;
      }

      // 3. Generamos nuevos tokens con contexto multi-tenant
      const payload = {
        id: user.id,
        role: user.role.name,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug
      };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      // 4. Actualizamos el Refresh Token en la BD
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (err) {
      const error = new Error('Refresh token inválido o expirado');
      error.statusCode = 401;
      throw error;
    }
  }

  // Método auxiliar para crear usuarios iniciales (Seed)
  async registerUser(userData) {
    const { email, password, name, phone, roleName } = userData;

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      const error = new Error('El correo ya está registrado');
      error.statusCode = 400;
      throw error;
    }

    // Buscamos el rol, si no existe o no se provee, asignamos Cajero por defecto
    let role = await prisma.role.findFirst({ where: { name: roleName || ROLES.CAJERO } });
    
    // Si la BD está vacía y no existe el rol, fallamos con gracia
    if (!role) {
      const error = new Error('El rol especificado no existe en el sistema');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone ? phone.trim() : null,
        roleId: role.id,
      },
      include: { role: true }
    });

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role.name,
    };
  }

  // Obtener planes activos disponibles públicamente
  async getPublicPlans() {
    return await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });
  }

  // Generador de slug seguro y amigable para URL
  generateSlug(text) {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Onboarding / Registro público de nuevo restaurante (Tenant)
  async registerTenant(data) {
    const {
      restaurantName,
      slug: customSlug,
      document,
      phone,
      address,
      adminName,
      adminPhone,
      email,
      password,
      planCode = 'basic',
      billingCycle = 'monthly',
      isTrial = false
    } = data;

    if (!restaurantName || !restaurantName.trim()) {
      const error = new Error('El nombre del restaurante es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    if (!email || !email.trim()) {
      const error = new Error('El correo electrónico es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    if (!password || password.length < 6) {
      const error = new Error('La contraseña debe tener al menos 6 caracteres');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      const error = new Error('Ya existe una cuenta registrada con este correo electrónico');
      error.statusCode = 400;
      throw error;
    }

    // 2. Determinar y verificar el slug
    let targetSlug = customSlug ? this.generateSlug(customSlug) : this.generateSlug(restaurantName);
    if (!targetSlug || targetSlug.length < 2) {
      targetSlug = 'restaurante-' + Math.floor(1000 + Math.random() * 9000);
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: targetSlug }
    });

    if (existingTenant) {
      targetSlug = `${targetSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // 3. Buscar el plan solicitado
    let plan = await prisma.plan.findUnique({
      where: { code: planCode }
    });

    if (!plan) {
      plan = await prisma.plan.findFirst({
        where: { isActive: true }
      });
    }

    // Determinar modalidad (Prueba 7 días vs Plan de pago)
    const isTrialSelected = Boolean(isTrial) || billingCycle === 'trial';
    const validCycles = ['monthly', 'semiannual', 'annual', 'trial'];
    const effectiveBillingCycle = isTrialSelected
      ? 'trial'
      : (validCycles.includes(billingCycle) ? billingCycle : 'monthly');

    // Calcular monto a pagar si es plan de pago
    let amountToPay = 0;
    if (plan && !isTrialSelected) {
      if (effectiveBillingCycle === 'annual') {
        amountToPay = parseFloat(plan.priceAnnual) > 0 ? parseFloat(plan.priceAnnual) : parseFloat(plan.priceMonthly) * 12;
      } else if (effectiveBillingCycle === 'semiannual') {
        amountToPay = parseFloat(plan.priceMonthly) * 6;
      } else {
        amountToPay = parseFloat(plan.priceMonthly);
      }
    }

    // Duración para trial: 7 días
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 4. Crear todo atómicamente en transacción
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await prisma.$transaction(async (tx) => {
      // Crear Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName.trim(),
          slug: targetSlug,
          document: document ? document.trim() : null,
          phone: phone ? phone.trim() : (adminPhone ? adminPhone.trim() : null),
          address: address ? address.trim() : null,
          email: cleanEmail,
          status: isTrialSelected ? 'TRIAL' : 'INACTIVE',
          billingCycle: effectiveBillingCycle,
          paymentStatus: isTrialSelected ? 'VERIFIED' : 'PENDING',
          planId: plan ? plan.id : null,
          subscriptionEndsAt: isTrialSelected ? trialEndsAt : null
        }
      });

      // Crear Roles para este Tenant
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Administrador',
          description: 'Control total de la sede y configuración'
        }
      });

      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Cajero',
          description: 'Gestión de cobro, caja y facturación'
        }
      });

      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Mesero',
          description: 'Toma de comandas y gestión de mesas'
        }
      });

      // Crear Métodos de Pago iniciales
      await tx.paymentMethod.create({
        data: {
          tenantId: tenant.id,
          name: 'Efectivo',
          isActive: true
        }
      });

      await tx.paymentMethod.create({
        data: {
          tenantId: tenant.id,
          name: 'Transferencia / QR',
          isActive: true
        }
      });

      await tx.paymentMethod.create({
        data: {
          tenantId: tenant.id,
          name: 'Tarjeta Débito / Crédito',
          isActive: true
        }
      });

      // Crear Configuraciones iniciales
      const defaultConfigs = [
        { key: 'business_name', value: restaurantName.trim() },
        { key: 'business_document', value: document ? document.trim() : '' },
        { key: 'business_phone', value: (phone || adminPhone || '').trim() },
        { key: 'business_address', value: address ? address.trim() : '' },
        { key: 'currency_symbol', value: '$' },
        { key: 'tax_percentage', value: '0' }
      ];

      for (const config of defaultConfigs) {
        await tx.configuration.create({
          data: {
            tenantId: tenant.id,
            key: config.key,
            value: config.value
          }
        });
      }

      // Crear Usuario Administrador (Creador del Restaurante)
      const creatorPhone = (adminPhone || phone || '').trim() || null;
      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: cleanEmail,
          password: hashedPassword,
          name: adminName ? adminName.trim() : 'Administrador',
          phone: creatorPhone,
          roleId: adminRole.id,
          isActive: true
        },
        include: {
          role: true,
          tenant: {
            include: {
              plan: true
            }
          }
        }
      });

      // Si es plan de pago, NO se activa hasta que se verifique el pago
      if (!isTrialSelected) {
        return {
          paymentPending: true,
          message: '¡Registro completado exitosamente! Tu cuenta ha sido creada y se encuentra pendiente de verificación de pago.',
          restaurant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            phone: tenant.phone
          },
          plan: {
            id: plan ? plan.id : null,
            name: plan ? plan.name : 'Plan Seleccionado',
            code: plan ? plan.code : planCode,
            billingCycle: effectiveBillingCycle,
            amountToPay: amountToPay
          },
          admin: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone
          }
        };
      }

      // Si es prueba gratuita (TRIAL), generamos tokens y entra de inmediato
      const payload = {
        id: newUser.id,
        role: newUser.role.name,
        tenantId: tenant.id,
        tenantSlug: tenant.slug
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await tx.user.update({
        where: { id: newUser.id },
        data: { refreshToken }
      });

      return {
        paymentPending: false,
        isTrial: true,
        trialDays: 7,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role.name,
          tenantId: newUser.tenantId,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            phone: tenant.phone,
            status: tenant.status,
            billingCycle: tenant.billingCycle,
            paymentStatus: tenant.paymentStatus,
            subscriptionEndsAt: tenant.subscriptionEndsAt,
            plan: plan ? {
              name: plan.name,
              code: plan.code,
              maxTables: plan.maxTables,
              maxUsers: plan.maxUsers
            } : null
          }
        },
        accessToken,
        refreshToken
      };
    });

    return result;
  }
}

module.exports = new AuthService();