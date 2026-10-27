const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { getTenantId, isSuperAdmin } = require('../../context/tenantContext');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../../utils/jwt.util');
const ROLES = require('../../constants/roles');
const { validatePassword } = require('../../utils/passwordValidator');
const emailService = require('../../services/email.service');

// Hash bcrypt señuelo para mitigar ataques de enumeración por tiempo (Timing Attack) en login
const DUMMY_BCRYPT_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D0R6V5G7Y9xL0K2p1m3N5v7B9c1eG';

const hashTokenOrCode = (val) =>
  crypto.createHash('sha256').update(String(val)).digest('hex');

const safeCompareHex = (hexA, hexB) => {
  if (typeof hexA !== 'string' || typeof hexB !== 'string' || hexA.length !== hexB.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(hexA, 'utf8'), Buffer.from(hexB, 'utf8'));
  } catch {
    return false;
  }
};

// Lista de dominios de correos temporales/desechables para prevención de spam
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'dispostable.com',
  'fakeinbox.com', 'getairmail.com', 'throwawaymail.com', 'mytemp.email',
  'mohmal.com', 'crazymailing.com', 'tempr.email', 'tempail.com',
  'burnermail.io', 'inboxkitten.com', 'nada.ltd', 'emailondeck.com',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'grr.la',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'disposablemail.com', 'temp-mail.org', '10minutemail.net'
]);

const isDisposableEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
};

class AuthService {
  async loginUser(credentials) {
    const { email, password } = credentials;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: true,
        tenant: {
          include: {
            plan: true
          }
        }
      }
    });

    // Ejecutar siempre bcrypt.compare para evitar enumeración de usuarios por canal lateral de tiempo
    const targetHash = user?.password || DUMMY_BCRYPT_HASH;
    const isPasswordValid = await bcrypt.compare(String(password || ''), targetHash);

    if (!user || !user.isActive || !isPasswordValid) {
      const error = new Error('Credenciales inválidas o usuario inactivo');
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
    const refreshTokenHash = hashTokenOrCode(refreshToken);

    // Guardamos únicamente el hash SHA-256 del refresh token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshTokenHash }
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
          logoUrl: user.tenant.logoUrl,
          plan: user.tenant.plan ? {
            name: user.tenant.plan.name,
            code: user.tenant.plan.code,
            maxTables: user.tenant.plan.maxTables,
            maxUsers: user.tenant.plan.maxUsers,
            maxBranches: user.tenant.plan.maxBranches,
            features: user.tenant.plan.features
          } : null
        } : null
      },
      accessToken,
      refreshToken,
    };
  }

  async logoutUser(userId) {
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

      // 2. Verificamos que el usuario exista, esté activo y tenga el mismo token (hash o legacy)
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          role: true,
          tenant: true
        }
      });

      const incomingHash = hashTokenOrCode(token);
      const storedToken = user?.refreshToken || '';
      const tokenMatches = safeCompareHex(storedToken, incomingHash) || storedToken === token;

      if (!user || !user.isActive || !storedToken || !tokenMatches) {
        const error = new Error('Refresh token inválido o revocado');
        error.statusCode = 401;
        throw error;
      }

      // 3. Revalidar vigencia del tenant al refrescar
      const isSuper = user.role?.name === 'SuperAdmin' || user.role?.name === 'SUPERADMIN';
      if (!isSuper && user.tenant) {
        const isExpired = user.tenant.subscriptionEndsAt && new Date(user.tenant.subscriptionEndsAt) < new Date();
        if (
          user.tenant.status === 'SUSPENDED' ||
          user.tenant.status === 'INACTIVE' ||
          user.tenant.paymentStatus === 'PENDING' ||
          isExpired
        ) {
          const error = new Error('El establecimiento asociado se encuentra suspendido, inactivo o con suscripción vencida.');
          error.statusCode = 403;
          throw error;
        }
      }

      // 4. Generamos nuevos tokens con rotación de Refresh Token
      const payload = {
        id: user.id,
        role: user.role.name,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug
      };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);
      const newRefreshTokenHash = hashTokenOrCode(newRefreshToken);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshTokenHash }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (err) {
      if (err.statusCode === 403) throw err;
      const error = new Error('Refresh token inválido o expirado');
      error.statusCode = 401;
      throw error;
    }
  }

  // Método auxiliar para crear usuarios (valida límite maxUsers y prohibe escalada a SuperAdmin)
  async registerUser(userData) {
    const { email, password, name, phone, roleName } = userData;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      const error = new Error('El correo electrónico es obligatorio');
      error.statusCode = 400;
      throw error;
    }
    const tenantId = getTenantId();

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const error = new Error(passwordValidation.message);
      error.statusCode = 400;
      throw error;
    }

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
          const error = new Error(`Has alcanzado el límite máximo de ${tenant.plan.maxUsers} usuarios permitidos en tu ${tenant.plan.name}.`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (userExists) {
      const error = new Error('El correo ya está registrado');
      error.statusCode = 400;
      throw error;
    }

    const requestedRoleName = String(roleName || ROLES.CAJERO).trim();
    if (!isSuperAdmin() && requestedRoleName.toUpperCase() === 'SUPERADMIN') {
      const error = new Error('No tienes permisos para asignar el rol SuperAdmin');
      error.statusCode = 403;
      throw error;
    }

    const role = await prisma.role.findFirst({
      where: {
        name: requestedRoleName,
        ...(tenantId ? { tenantId } : {})
      }
    });

    if (!role || (!isSuperAdmin() && String(role.name).trim().toUpperCase() === 'SUPERADMIN')) {
      const error = new Error('El rol especificado no existe en este establecimiento');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: typeof name === 'string' ? name.trim() : name,
        phone: phone ? phone.trim() : null,
        roleId: role.id,
        tenantId: tenantId || null
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

  // ============================================================
  // PRE-VERIFICACIÓN DE CORREO ELECTRÓNICO (ANTI-SPAM)
  // ============================================================

  // 1. Enviar código de 6 dígitos al correo
  async sendVerificationCode(email) {
    if (!email || !email.trim()) {
      const error = new Error('El correo electrónico es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
      const error = new Error('Por favor ingresa un correo electrónico válido');
      error.statusCode = 400;
      throw error;
    }

    if (isDisposableEmail(cleanEmail)) {
      const error = new Error('No se permiten correos electrónicos temporales o desechables. Por favor utiliza una dirección de correo válida y permanente.');
      error.statusCode = 400;
      throw error;
    }

    // A. Verificar si el usuario ya existe en la base de datos
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      const error = new Error('Ya existe una cuenta registrada con este correo electrónico. Por favor inicia sesión.');
      error.statusCode = 400;
      throw error;
    }

    // B. Control de frecuencia (cooldown de 45 segundos)
    const existingVerif = await prisma.emailVerification.findUnique({
      where: { email: cleanEmail }
    });

    if (existingVerif && existingVerif.updatedAt) {
      const timeDiff = Date.now() - new Date(existingVerif.updatedAt).getTime();
      if (timeDiff < 45000) {
        const remaining = Math.ceil((45000 - timeDiff) / 1000);
        const error = new Error(`Por favor espera ${remaining} segundos antes de solicitar otro código`);
        error.statusCode = 429;
        throw error;
      }
    }

    // C. Generar código numérico de 6 dígitos criptográficamente seguro y su hash SHA-256
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashTokenOrCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Válido por 10 minutos

    // D. Guardar el hash del OTP en la base de datos
    await prisma.emailVerification.upsert({
      where: { email: cleanEmail },
      update: {
        code: codeHash,
        expiresAt,
        attempts: 0,
        verified: false,
        token: null,
        updatedAt: new Date()
      },
      create: {
        email: cleanEmail,
        code: codeHash,
        expiresAt,
        attempts: 0,
        verified: false
      }
    });

    // E. Enviar email con plantilla vía Resend
    await emailService.sendVerificationCode(cleanEmail, code);

    return {
      success: true,
      message: 'Código de verificación enviado correctamente a tu correo',
      email: cleanEmail
    };
  }

  // 2. Validar código de 6 dígitos ingresado por el usuario
  async verifyCode(email, code) {
    if (!email || !code) {
      const error = new Error('El correo y el código de verificación son obligatorios');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    const verif = await prisma.emailVerification.findUnique({
      where: { email: cleanEmail }
    });

    if (!verif) {
      const error = new Error('No se ha solicitado ningún código para este correo. Por favor solicita uno nuevo.');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > new Date(verif.expiresAt)) {
      const error = new Error('El código de verificación ha expirado. Por favor solicita uno nuevo.');
      error.statusCode = 400;
      throw error;
    }

    // Incremento atómico condicionado a attempts < 5 y vigencia para impedir carreras TOCTOU
    const reservedAttempt = await prisma.emailVerification.updateMany({
      where: {
        email: cleanEmail,
        attempts: { lt: 5 },
        expiresAt: { gt: new Date() }
      },
      data: {
        attempts: { increment: 1 }
      }
    });

    if (reservedAttempt.count === 0) {
      const error = new Error('Has superado el límite de intentos permitidos o el código expiró. Por favor solicita un nuevo código.');
      error.statusCode = 400;
      throw error;
    }

    const incomingHash = hashTokenOrCode(cleanCode);
    const isCodeValid = safeCompareHex(verif.code, incomingHash);

    if (!isCodeValid) {
      const currentAttempts = (verif.attempts || 0) + 1;
      const remaining = Math.max(0, 5 - currentAttempts);
      const error = new Error(`Código incorrecto. ${remaining > 0 ? `Te quedan ${remaining} intento(s).` : 'Debes solicitar un nuevo código.'}`);
      error.statusCode = 400;
      throw error;
    }

    // Código válido -> Emitir token criptográfico de verificación temporal (almacenando su hash SHA-256)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = hashTokenOrCode(verificationToken);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora para terminar el formulario

    await prisma.emailVerification.update({
      where: { email: cleanEmail },
      data: {
        verified: true,
        attempts: 0,
        token: verificationTokenHash,
        expiresAt: tokenExpiresAt
      }
    });

    return {
      success: true,
      message: 'Correo verificado correctamente',
      verificationToken,
      email: cleanEmail
    };
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
      verificationToken,
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const error = new Error(passwordValidation.message);
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isDisposableEmail(cleanEmail)) {
      const error = new Error('No se permiten correos electrónicos temporales o desechables');
      error.statusCode = 400;
      throw error;
    }

    // Validar token de pre-verificación de correo (Evita registros spam)
    if (!verificationToken) {
      const error = new Error('Debes verificar tu correo electrónico antes de registrar tu restaurante');
      error.statusCode = 400;
      throw error;
    }

    const incomingVerifTokenHash = hashTokenOrCode(verificationToken);
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: cleanEmail,
        token: { in: [incomingVerifTokenHash, String(verificationToken)] },
        verified: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      const error = new Error('La verificación de tu correo electrónico no es válida o ha expirado. Por favor valida tu correo nuevamente.');
      error.statusCode = 400;
      throw error;
    }

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
      targetSlug = 'restaurante-' + crypto.randomInt(1000, 10000);
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: targetSlug }
    });

    if (existingTenant) {
      targetSlug = `${targetSlug}-${crypto.randomInt(100, 1000)}`;
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

    const validCycles = ['monthly', 'semiannual', 'annual'];
    const effectiveBillingCycle = validCycles.includes(billingCycle) ? billingCycle : 'monthly';

    // Duración de la prueba: 7 días desde hoy
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 4. Crear todo atómicamente en transacción
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await prisma.$transaction(async (tx) => {
      // Consumir atómicamente el registro de verificación para evitar reutilización concurrente
      const consumedVerif = await tx.emailVerification.deleteMany({
        where: {
          email: cleanEmail,
          verified: true
        }
      });
      if (consumedVerif.count === 0) {
        const error = new Error('El token de verificación ya fue utilizado o expiró.');
        error.statusCode = 400;
        throw error;
      }

      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName.trim(),
          slug: targetSlug,
          document: document ? document.trim() : null,
          phone: phone ? phone.trim() : (adminPhone ? adminPhone.trim() : null),
          address: address ? address.trim() : null,
          email: cleanEmail,
          status: 'TRIAL',
          billingCycle: effectiveBillingCycle,
          paymentStatus: 'VERIFIED',
          planId: plan ? plan.id : null,
          subscriptionEndsAt: trialEndsAt
        }
      });

      // Crear los 4 Roles operativos para este Tenant (incluyendo Supervisor)
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
          name: 'Supervisor',
          description: 'Supervisión de inventario, compras, producción y arqueos'
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

      // Crear Métodos de Pago iniciales por defecto: Efectivo (activo) y Crédito (inactivo)
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
          name: 'Crédito',
          isActive: false
        }
      });

      // Crear por defecto 3 mesas iniciales
      for (let i = 1; i <= 3; i++) {
        await tx.table.create({
          data: {
            tenantId: tenant.id,
            name: `Mesa ${i}`,
            capacity: 4,
            isActive: true
          }
        });
      }

      // Crear Cliente por defecto: Consumidor final
      await tx.customer.create({
        data: {
          tenantId: tenant.id,
          name: 'Consumidor final',
          document: '222222222222'
        }
      });

      // Crear Proveedor por defecto: Proveedor Genérico
      await tx.supplier.create({
        data: {
          tenantId: tenant.id,
          name: 'Proveedor Genérico',
          nit: '222222222'
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

      const payload = {
        id: newUser.id,
        role: newUser.role.name,
        tenantId: tenant.id,
        tenantSlug: tenant.slug
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      const refreshTokenHash = hashTokenOrCode(refreshToken);

      await tx.user.update({
        where: { id: newUser.id },
        data: { refreshToken: refreshTokenHash }
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
              maxUsers: plan.maxUsers,
              maxBranches: plan.maxBranches,
              features: plan.features
            } : null
          }
        },
        accessToken,
        refreshToken
      };
    });

    // Limpiamos el registro de verificación para que el token no pueda reutilizarse
    await prisma.emailVerification.deleteMany({
      where: { email: cleanEmail }
    }).catch(() => {});

    return result;
  }
}

module.exports = new AuthService();
