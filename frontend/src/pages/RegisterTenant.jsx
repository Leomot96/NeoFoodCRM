import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Store,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Clock,
  Send,
  AlertCircle,
  CreditCard,
  Building
} from 'lucide-react';
import styles from './RegisterTenant.module.css';
import { validatePassword } from '../utils/passwordValidator';

const DEFAULT_PLANS = [
  {
    id: 'plan-basic-001',
    name: 'Plan Básico',
    code: 'basic',
    description: 'Ideal para pequeños cafés, food trucks y panaderías.',
    priceMonthly: 49000,
    priceAnnual: 490000,
    maxTables: 6,
    maxUsers: 2
  },
  {
    id: 'plan-pro-001',
    name: 'Plan Pro',
    code: 'pro',
    description: 'Para restaurantes en crecimiento con control de insumos y recetas.',
    priceMonthly: 89000,
    priceAnnual: 890000,
    maxTables: 20,
    maxUsers: 6
  },
  {
    id: 'plan-enterprise-001',
    name: 'Plan Enterprise',
    code: 'enterprise',
    description: 'Capacidad ilimitada, múltiples sedes y soporte prioritario 24/7.',
    priceMonthly: 149000,
    priceAnnual: 1490000,
    maxTables: -1,
    maxUsers: -1
  }
];

const RegisterTenant = () => {
  const { registerTenant } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    restaurantName: '',
    slug: '',
    document: '',
    phone: '',
    adminName: '',
    adminPhone: '',
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Modalidad: 'trial' (7 días gratis) o 'paid' (plan de pago mensual, semestral o anual)
  const [registrationMode, setRegistrationMode] = useState('trial');
  const [selectedPlanCode, setSelectedPlanCode] = useState('basic');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'semiannual' | 'annual'

  // Lista de planes dinámicos desde backend
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  // Pantalla de confirmación de pago pendiente
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await api.get('/auth/plans');
        if (res.data?.data && res.data.data.length > 0) {
          setPlans(res.data.data);
        }
      } catch (err) {
        console.warn('Usando planes por defecto:', err);
      }
    };
    loadPlans();
  }, []);

  // Generador de slug en tiempo real
  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => {
      if (!slugManuallyEdited) {
        const autoSlug = name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return { ...prev, restaurantName: name, slug: autoSlug };
      }
      return { ...prev, restaurantName: name };
    });
  };

  const handleSlugChange = (e) => {
    setSlugManuallyEdited(true);
    const cleanSlug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, slug: cleanSlug }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Cálculo del monto total según ciclo
  const calculatePlanCost = (plan, cycle) => {
    if (!plan) return 0;
    const monthly = parseFloat(plan.priceMonthly) || 0;
    const annual = parseFloat(plan.priceAnnual) || monthly * 10;
    if (cycle === 'annual') return annual;
    if (cycle === 'semiannual') return monthly * 6;
    return monthly;
  };

  const currentPlan = plans.find(p => p.code === selectedPlanCode) || plans[0];
  const totalAmountToPay = registrationMode === 'trial' ? 0 : calculatePlanCost(currentPlan, billingCycle);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (!formData.adminPhone || !formData.adminPhone.trim()) {
      setError('Por favor ingresa el número de celular del administrador');
      return;
    }

    setLoading(true);

    const payload = {
      restaurantName: formData.restaurantName,
      slug: formData.slug || undefined,
      document: formData.document || undefined,
      phone: formData.phone || formData.adminPhone || undefined,
      adminName: formData.adminName,
      adminPhone: formData.adminPhone,
      email: formData.email,
      password: formData.password,
      planCode: registrationMode === 'trial' ? 'basic' : selectedPlanCode,
      billingCycle: registrationMode === 'trial' ? 'trial' : billingCycle,
      isTrial: registrationMode === 'trial'
    };

    const result = await registerTenant(payload);

    if (result.success) {
      if (result.paymentPending) {
        // Plan de pago: mostrar pantalla de verificación y pago pendiente
        setPendingPaymentInfo({
          restaurantName: formData.restaurantName,
          slug: formData.slug,
          adminName: formData.adminName,
          adminPhone: formData.adminPhone,
          email: formData.email,
          planName: currentPlan?.name || 'Plan de Pago',
          billingCycle: billingCycle,
          totalAmount: totalAmountToPay,
          ...result.data
        });
      } else {
        // Prueba gratuita de 7 días: sesión iniciada automáticamente
        navigate('/', { replace: true });
      }
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  // Mensaje predeterminado de WhatsApp para enviar comprobante
  const getWhatsAppMessage = () => {
    const cycleLabel = billingCycle === 'annual' ? 'Anual (1 año)' : billingCycle === 'semiannual' ? 'Semestral (6 meses)' : 'Mensual (1 mes)';
    const text = `Hola Soporte NeoFood, acabo de registrar mi restaurante "${formData.restaurantName}" (Enlace: neofood/${formData.slug}) con el ${currentPlan?.name} en periodo ${cycleLabel} por valor de ${formatCurrency(totalAmountToPay)}.
Mi nombre es ${formData.adminName} y mi correo es ${formData.email}.
Adjunto el comprobante de pago para que verifiquen y activen mi cuenta. ¡Muchas gracias!`;
    return encodeURIComponent(text);
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.registerCard}>
        
        {/* Cabecera */}
        <div className={styles.registerHeader}>
          <div className={styles.brandTitleContainer}>
            <span className={styles.brandNeo}>Neo</span>
            <span className={styles.brandFood}>FOOD</span>
            <span className={styles.saasBadge}>SaaS Multi-Tenant</span>
          </div>
          <h1 className={styles.registerTitle}>
            {pendingPaymentInfo ? '¡Registro Completado!' : 'Registra tu Establecimiento'}
          </h1>
          <p className={styles.registerSubtitle}>
            {pendingPaymentInfo
              ? 'Tu restaurante ha sido creado en el sistema. A continuación los pasos para la activación del plan.'
              : 'Configura en segundos el sistema de punto de venta, inventario y facturación para tu restaurante'}
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className={styles.registerBody}>
          {error && (
            <div className={styles.registerError}>
              <p className={styles.registerErrorText}>{error}</p>
            </div>
          )}

          {/* VISTA 1: PANTALLA DE PAGO PENDIENTE Y CONFIRMACIÓN */}
          {pendingPaymentInfo ? (
            <div className={styles.pendingPaymentCard}>
              <div className={styles.pendingHeaderNotice}>
                <Clock size={36} className={styles.pendingNoticeIcon} />
                <h3 className={styles.pendingNoticeTitle}>Suscripción Pendiente de Verificación de Pago</h3>
                <p className={styles.pendingNoticeSubtitle}>
                  Para activar tu cuenta de <strong>"{pendingPaymentInfo.restaurantName}"</strong>, realiza la transferencia del valor correspondiente y envíanos tu comprobante por WhatsApp. El SuperAdmin verificará el pago y activará tu sede de inmediato.
                </p>
              </div>

              {/* Caja de Total a Pagar */}
              <div className={styles.totalToPayBox}>
                <span className={styles.totalToPayLabel}>Valor total a cancelar</span>
                <span className={styles.totalToPayAmount}>{formatCurrency(totalAmountToPay)} COP</span>
                <span className={styles.totalToPayCycle}>
                  {currentPlan?.name} &bull; Ciclo {billingCycle === 'annual' ? 'Anual (12 Meses)' : billingCycle === 'semiannual' ? 'Semestral (6 Meses)' : 'Mensual (30 Días)'}
                </span>
              </div>

              {/* Resumen de Datos Registrados */}
              <div className={styles.pendingSummaryGrid}>
                <div className={styles.summaryBox}>
                  <div className={styles.summaryBoxTitle}>
                    <Store size={14} />
                    <span>Datos del Negocio</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Restaurante:</span>
                    <span className={styles.summaryValue}>{pendingPaymentInfo.restaurantName}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Enlace:</span>
                    <span className={styles.summaryValue}>neofood/{pendingPaymentInfo.slug}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Capacidad:</span>
                    <span className={styles.summaryValue}>
                      {currentPlan?.maxTables === -1 ? 'Mesas Ilimitadas' : `${currentPlan?.maxTables} mesas`}
                    </span>
                  </div>
                </div>

                <div className={styles.summaryBox}>
                  <div className={styles.summaryBoxTitle}>
                    <User size={14} />
                    <span>Administrador Principal</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Nombre:</span>
                    <span className={styles.summaryValue}>{pendingPaymentInfo.adminName}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Celular:</span>
                    <span className={styles.summaryValue}>{pendingPaymentInfo.adminPhone}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Correo:</span>
                    <span className={styles.summaryValue}>{pendingPaymentInfo.email}</span>
                  </div>
                </div>
              </div>

              {/* Datos de Transferencia / Cuentas Bancarias */}
              <div className={styles.bankAccountsCard}>
                <h4 className={styles.bankAccountsTitle}>
                  <CreditCard size={18} />
                  <span>Medios de Pago Disponibles en Colombia</span>
                </h4>
                <div className={styles.bankAccountList}>
                  <div className={styles.bankAccountItem}>
                    <div className={styles.bankAccountInfo}>
                      <span className={styles.bankAccountName}>Bancolombia (Ahorros)</span>
                      <span className={styles.bankAccountNumber}>123-456789-00</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Titular: NeoFood Software</span>
                  </div>
                  <div className={styles.bankAccountItem}>
                    <div className={styles.bankAccountInfo}>
                      <span className={styles.bankAccountName}>Nequi / Daviplata</span>
                      <span className={styles.bankAccountNumber}>310 123 4567</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>A nombre de: Leonardo Ramirez</span>
                  </div>
                </div>
              </div>

              {/* Botón WhatsApp de Acción Directa */}
              <a
                href={`https://wa.me/573101234567?text=${getWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappActionBtn}
              >
                <Send size={18} />
                <span>Enviar Comprobante por WhatsApp para Activar</span>
              </a>

              <Link to="/login" className={styles.returnLoginBtn}>
                <span>Entendido &bull; Ir al Inicio de Sesión</span>
              </Link>
            </div>
          ) : (

            /* VISTA 2: FORMULARIO DE REGISTRO CON SELECCIÓN DE PLAN Y PERIODICIDAD */
            <form onSubmit={handleSubmit} className={styles.registerForm}>

              {/* SELECTOR DE MODALIDAD: PRUEBA GRATUITA vs PLAN DE PAGO */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <Sparkles size={18} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Escoge tu modalidad de inicio</span>
                </div>

                <div className={styles.modeSelector}>
                  {/* Opción 1: Prueba Gratuita 7 Días */}
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('trial')}
                    className={`${styles.modeBtn} ${registrationMode === 'trial' ? styles.modeBtnTrialActive : ''}`}
                  >
                    <div className={styles.modeTitle}>
                      <Sparkles size={16} color="#10b981" />
                      <span>Prueba Gratuita (7 Días)</span>
                    </div>
                    <span className={styles.modeSubtitle}>
                      Sin costo. Acceso inmediato y completo por 7 días.
                    </span>
                  </button>

                  {/* Opción 2: Planes de Pago */}
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('paid')}
                    className={`${styles.modeBtn} ${registrationMode === 'paid' ? styles.modeBtnActive : ''}`}
                  >
                    <div className={styles.modeTitle}>
                      <Layers size={16} color="#4f46e5" />
                      <span>Elegir Plan de Pago</span>
                    </div>
                    <span className={styles.modeSubtitle}>
                      Básico, Pro o Enterprise (Mensual, Semestral o Anual).
                    </span>
                  </button>
                </div>

                {/* Si elige Plan de Pago, mostramos los ciclos y las tarjetas de plan */}
                {registrationMode === 'paid' && (
                  <div>
                    {/* Selector de Ciclo (Mensual, Semestral, Anual) */}
                    <div className={styles.cycleSelector}>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`${styles.cycleTab} ${billingCycle === 'monthly' ? styles.cycleTabActive : ''}`}
                      >
                        <span>Mensual (1 mes)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('semiannual')}
                        className={`${styles.cycleTab} ${billingCycle === 'semiannual' ? styles.cycleTabActive : ''}`}
                      >
                        <span>Semestral (6 meses)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`${styles.cycleTab} ${billingCycle === 'annual' ? styles.cycleTabActive : ''}`}
                      >
                        <span>Anual (12 meses)</span>
                        <span className={styles.discountPill}>Ahorra 2 meses</span>
                      </button>
                    </div>

                    {/* Grid de Selección de Planes */}
                    <div className={styles.planCardsGrid}>
                      {plans.map(p => {
                        const isSelected = selectedPlanCode === p.code;
                        const cost = calculatePlanCost(p, billingCycle);
                        return (
                          <div
                            key={p.code}
                            onClick={() => setSelectedPlanCode(p.code)}
                            className={`${styles.planCard} ${isSelected ? styles.planCardActive : ''}`}
                          >
                            <div className={styles.planCardHeader}>
                              <span className={styles.planCardName}>{p.name}</span>
                              <input
                                type="radio"
                                name="planSelection"
                                checked={isSelected}
                                onChange={() => setSelectedPlanCode(p.code)}
                                className={styles.planCardRadio}
                              />
                            </div>

                            <div className={styles.planCardPriceContainer}>
                              <div className={styles.planCardPrice}>
                                {billingCycle === 'monthly'
                                  ? formatCurrency(p.priceMonthly)
                                  : formatCurrency(cost)}
                              </div>
                              <span className={styles.planCardPricePeriod}>
                                {billingCycle === 'annual'
                                  ? 'facturado anual'
                                  : billingCycle === 'semiannual'
                                  ? 'facturado cada 6 meses'
                                  : 'al mes'}
                              </span>
                              {billingCycle !== 'monthly' && (
                                <div className={styles.planCardTotalBilled}>
                                  Equiv. {formatCurrency(Math.round(cost / (billingCycle === 'annual' ? 12 : 6)))}/mes
                                </div>
                              )}
                            </div>

                            <div className={styles.planCardLimits}>
                              <div className={styles.planCardLimitItem}>
                                <CheckCircle2 size={13} className={styles.planCardLimitIcon} />
                                <span>{p.maxTables === -1 ? 'Mesas Ilimitadas' : `Hasta ${p.maxTables} mesas`}</span>
                              </div>
                              <div className={styles.planCardLimitItem}>
                                <CheckCircle2 size={13} className={styles.planCardLimitIcon} />
                                <span>{p.maxUsers === -1 ? 'Usuarios Ilimitados' : `Hasta ${p.maxUsers} usuarios`}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sección: Datos del Restaurante */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <Store size={18} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Datos del Negocio / Sede</span>
                </div>

                <div className={styles.formGrid}>
                  {/* Nombre del Restaurante */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Nombre del Restaurante *</label>
                    <div className={styles.inputWrapper}>
                      <Store size={18} className={styles.inputIcon} />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Pizzería Di Napoli"
                        value={formData.restaurantName}
                        onChange={handleNameChange}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Slug / Enlace */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Identificador / Enlace (Slug) *</label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.slugPrefix}>neofood/</span>
                      <input
                        type="text"
                        required
                        placeholder="pizzeria-di-napoli"
                        value={formData.slug}
                        onChange={handleSlugChange}
                        className={`${styles.input} ${styles.slugInput}`}
                      />
                    </div>
                    <span className={styles.fieldHelp}>Enlace único para tu sucursal en el sistema</span>
                  </div>

                  {/* NIT o Documento */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>NIT / Cédula Fiscal (Opcional)</label>
                    <div className={styles.inputWrapper}>
                      <FileText size={18} className={styles.inputIcon} />
                      <input
                        type="text"
                        placeholder="900.123.456-7"
                        value={formData.document}
                        onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Teléfono del Restaurante */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Teléfono Fijo / Local (Opcional)</label>
                    <div className={styles.inputWrapper}>
                      <Phone size={18} className={styles.inputIcon} />
                      <input
                        type="tel"
                        placeholder="601 234 5678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Datos del Administrador */}
              <div className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <User size={18} className={styles.sectionIcon} />
                  <span className={styles.sectionTitle}>Cuenta del Administrador Principal</span>
                </div>

                <div className={styles.formGrid}>
                  {/* Nombre del Admin */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Tu Nombre Completo *</label>
                    <div className={styles.inputWrapper}>
                      <User size={18} className={styles.inputIcon} />
                      <input
                        type="text"
                        required
                        placeholder="Juan Pérez"
                        value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Celular / WhatsApp del Administrador */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Celular / WhatsApp (Contacto Directo) *</label>
                    <div className={styles.inputWrapper}>
                      <Phone size={18} className={styles.inputIcon} />
                      <input
                        type="tel"
                        required
                        placeholder="310 123 4567"
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                    <span className={styles.fieldHelp}>Para soporte y verificación de tu establecimiento</span>
                  </div>

                  {/* Correo Electrónico */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Correo Electrónico (Acceso) *</label>
                    <div className={styles.inputWrapper}>
                      <Mail size={18} className={styles.inputIcon} />
                      <input
                        type="email"
                        required
                        placeholder="administrador@dinapoli.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>Contraseña de Acceso *</label>
                    <div className={styles.inputWrapper}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9, @#$)"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`${styles.input} ${styles.passwordInput}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.passwordToggle}
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {formData.password && (
                      <div className={styles.passwordRequirements}>
                        <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.length ? styles.requirementMet : ''}`}>
                          {validatePassword(formData.password).checks.length ? '✓' : '○'} Mínimo 8 caracteres
                        </span>
                        <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.uppercase ? styles.requirementMet : ''}`}>
                          {validatePassword(formData.password).checks.uppercase ? '✓' : '○'} Mayúscula (A-Z)
                        </span>
                        <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.lowercase ? styles.requirementMet : ''}`}>
                          {validatePassword(formData.password).checks.lowercase ? '✓' : '○'} Minúscula (a-z)
                        </span>
                        <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.number ? styles.requirementMet : ''}`}>
                          {validatePassword(formData.password).checks.number ? '✓' : '○'} Número (0-9)
                        </span>
                        <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.special ? styles.requirementMet : ''}`}>
                          {validatePassword(formData.password).checks.special ? '✓' : '○'} Carácter especial (!@#$...)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={loading}
                className={styles.submitBtn}
              >
                {loading ? (
                  <span>Procesando registro...</span>
                ) : registrationMode === 'trial' ? (
                  <>
                    <span>Comenzar Prueba Gratuita de 7 Días</span>
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    <span>Registrar Restaurante ({formatCurrency(totalAmountToPay)})</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Pie de la Tarjeta */}
        <div className={styles.registerFooter}>
          <p className={styles.loginRedirectText}>
            ¿Ya tienes una sede registrada?{' '}
            <Link to="/login" className={styles.loginRedirectLink}>
              Inicia sesión aquí
            </Link>
          </p>
          <div className={styles.securityTag}>
            <ShieldCheck size={14} />
            <span>Infraestructura Segura Multi-Tenant &bull; NeoFood Cloud</span>
          </div>
        </div>
      </div>

      {/* Footer General */}
      <footer className={styles.pageFooter}>
        <p>&copy; {new Date().getFullYear()} NeoFood &bull; Sistema Integral de Gestión Gastronómica</p>
        <p className={styles.pageFooterAuthor}>Diseñado por <strong>Leonardo Ramirez</strong></p>
      </footer>
    </div>
  );
};

export default RegisterTenant;
