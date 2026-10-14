import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Building,
  Building2,
  Check,
  X,
  Crown,
  KeyRound
} from 'lucide-react';
import styles from './RegisterTenant.module.css';
import { validatePassword } from '../utils/passwordValidator';
import {
  DEFAULT_PLANS,
  PLANS_CATALOG,
  TRIAL_DAYS,
  formatCOP,
  calculatePlanCost
} from '../constants/plans';

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

  // Estados para Pre-Verificación de Correo (Opción B Anti-Spam)
  const [verificationStep, setVerificationStep] = useState('email_input'); // 'email_input' | 'code_sent' | 'verified'
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');

  // Campo Honeypot invisible contra bots automatizados
  const [honeypot, setHoneypot] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [selectedPlanCode, setSelectedPlanCode] = useState('basic');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'semiannual' | 'annual'

  // Lista de planes dinámicos desde backend
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  // Pantalla de confirmación de pago pendiente
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const cycleParam = searchParams.get('cycle');

    if (planParam && ['basic', 'pro', 'enterprise'].includes(planParam.toLowerCase())) {
      setSelectedPlanCode(planParam.toLowerCase());
    }
    if (cycleParam && ['monthly', 'semiannual', 'annual'].includes(cycleParam.toLowerCase())) {
      setBillingCycle(cycleParam.toLowerCase());
    }
  }, [searchParams]);

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

  const currentPlan = plans.find(p => p.code === selectedPlanCode) || plans[0];
  const planRenewalCost = calculatePlanCost(currentPlan, billingCycle);

  // Temporizador para el cooldown de reenvío de código
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Manejadores para Pre-Verificación de Correo (Opción B)
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setVerificationError('');
    setVerificationSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      setVerificationError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setCodeLoading(true);
    try {
      const res = await api.post('/auth/send-verification-code', {
        email: formData.email.trim().toLowerCase(),
        website: honeypot
      });
      setVerificationSuccess(res.data?.message || 'Código enviado a tu correo');
      setVerificationStep('code_sent');
      setResendCooldown(45);
      setOtpCode(['', '', '', '', '', '']);
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      }, 150);
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Error al enviar código de verificación');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Solo permitir dígitos numéricos
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    // Auto focus al siguiente input si se ingresó dígito
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newOtp = [...otpCode];
        newOtp[index - 1] = '';
        setOtpCode(newOtp);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otpCode];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtpCode(newOtp);
    const focusIndex = Math.min(pastedData.length, 5);
    const targetInput = document.getElementById(`otp-input-${focusIndex}`);
    if (targetInput) targetInput.focus();
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setVerificationError('');
    setVerificationSuccess('');

    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setVerificationError('Ingresa el código completo de 6 dígitos');
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await api.post('/auth/verify-code', {
        email: formData.email.trim().toLowerCase(),
        code: fullCode
      });
      const token = res.data?.verificationToken || res.data?.data?.verificationToken;
      setVerificationToken(token);
      setVerificationStep('verified');
      setVerificationSuccess('¡Correo verificado con éxito! Ahora completa los datos de tu restaurante.');
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Código incorrecto o expirado');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setVerificationStep('email_input');
    setVerificationToken('');
    setOtpCode(['', '', '', '', '', '']);
    setVerificationError('');
    setVerificationSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (verificationStep !== 'verified' || !verificationToken) {
      setError('Debes verificar tu correo electrónico antes de registrar el restaurante');
      return;
    }

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
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      verificationToken: verificationToken,
      planCode: selectedPlanCode,
      billingCycle: billingCycle,
      isTrial: true,
      website: honeypot
    };

    const result = await registerTenant(payload);

    if (result.success) {
      if (result.paymentPending) {
        // En caso de respuesta con pago pendiente
        setPendingPaymentInfo({
          restaurantName: formData.restaurantName,
          slug: formData.slug,
          adminName: formData.adminName,
          adminPhone: formData.adminPhone,
          email: formData.email,
          planName: currentPlan?.name || 'Plan Seleccionado',
          billingCycle: billingCycle,
          totalAmount: planRenewalCost,
          ...result.data
        });
      } else {
        // Prueba gratuita de 7 días activa: acceso directo al sistema
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
    const text = `Hola Soporte NeoFood, acabo de registrar mi restaurante "${formData.restaurantName}" (Enlace: neofood/${formData.slug}) con el ${currentPlan?.name} en periodo ${cycleLabel} por valor de ${formatCurrency(planRenewalCost)}.
Mi nombre es ${formData.adminName} y mi correo es ${formData.email}.
Adjunto el comprobante de pago para que verifiquen y activen mi cuenta. ¡Muchas gracias!`;
    return encodeURIComponent(text);
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.registerCard}>
        
        {/* Cabecera */}
        <div className={styles.registerHeader}>
          <div style={{ marginBottom: '0.85rem' }}>
            <Link
              to="/landing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                color: '#4f46e5',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              ← Volver a la página principal
            </Link>
          </div>
          <div className={styles.brandTitleContainer}>
            <img src="/isotipo.svg" alt="NeoFood" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
            <img src="/logo_negro.svg" alt="NeoFood" style={{ height: '26px', width: 'auto', maxWidth: '170px', objectFit: 'contain' }} />
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

            /* VISTA 2: PROCESO EN 2 PASOS CON PRE-VERIFICACIÓN DE CORREO */
            <div>
              {/* Stepper de Registro */}
              <div className={styles.registrationStepper}>
                <div className={`${styles.stepItem} ${verificationStep !== 'verified' ? styles.stepItemActive : styles.stepItemDone}`}>
                  <span className={`${styles.stepNumber} ${verificationStep !== 'verified' ? styles.stepNumberActive : styles.stepNumberDone}`}>
                    {verificationStep === 'verified' ? '✓' : '1'}
                  </span>
                  <span>Verificar Correo</span>
                </div>
                <div className={styles.stepDivider} />
                <div className={`${styles.stepItem} ${verificationStep === 'verified' ? styles.stepItemActive : ''}`}>
                  <span className={`${styles.stepNumber} ${verificationStep === 'verified' ? styles.stepNumberActive : ''}`}>
                    2
                  </span>
                  <span>Datos del Restaurante</span>
                </div>
              </div>

              {/* Mensajes de Estado de Verificación */}
              {verificationError && (
                <div className={styles.registerError} style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  <p className={styles.registerErrorText}>{verificationError}</p>
                </div>
              )}
              {verificationSuccess && verificationStep !== 'verified' && (
                <div style={{
                  maxWidth: '480px',
                  margin: '0 auto 1.5rem auto',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>{verificationSuccess}</span>
                </div>
              )}

              {/* PASO 1: CAJA DE VERIFICACIÓN OTP */}
              {verificationStep !== 'verified' ? (
                <div className={styles.verificationBox}>
                  <div className={styles.verificationIconContainer}>
                    {verificationStep === 'code_sent' ? <KeyRound size={28} /> : <Mail size={28} />}
                  </div>

                  <h3 className={styles.verificationTitle}>
                    {verificationStep === 'code_sent' ? 'Ingresa el Código de 6 Dígitos' : 'Verifica tu Correo Electrónico'}
                  </h3>

                  <p className={styles.verificationDesc}>
                    {verificationStep === 'code_sent'
                      ? `Hemos enviado un código de seguridad a ${formData.email}. Ingrésalo a continuación para continuar:`
                      : 'Para proteger el sistema y activar tu restaurante, primero validaremos tu dirección de correo.'}
                  </p>

                  {verificationStep === 'email_input' ? (
                    <form onSubmit={handleSendCode}>
                      {/* Campo trampa Honeypot invisible contra bots */}
                      <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
                        <label htmlFor="website-hp-1">Website</label>
                        <input
                          id="website-hp-1"
                          type="text"
                          name="website"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />
                      </div>

                      <div className={styles.formField} style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                        <label className={styles.fieldLabel}>Correo Electrónico del Administrador *</label>
                        <div className={styles.inputWrapper}>
                          <Mail size={18} className={styles.inputIcon} />
                          <input
                            type="email"
                            required
                            placeholder="admin@turestaurante.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={styles.input}
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={codeLoading || !formData.email}
                        className={styles.submitBtn}
                      >
                        {codeLoading ? (
                           <span>Enviando código...</span>
                        ) : (
                          <>
                            <span>Enviar Código de Verificación</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div>
                      {/* Cuadrícula de 6 dígitos para el OTP */}
                      <div className={styles.otpInputsGrid} onPaste={handleOtpPaste}>
                        {otpCode.map((digit, idx) => (
                          <input
                            key={`otp-${idx}`}
                            id={`otp-input-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className={`${styles.otpDigitInput} ${digit ? styles.otpDigitInputFilled : ''}`}
                            autoComplete="one-time-code"
                          />
                        ))}
                      </div>

                      <div className={styles.verificationActions}>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={verifyLoading || otpCode.join('').length !== 6}
                          className={styles.submitBtn}
                        >
                          {verifyLoading ? (
                            <span>Verificando...</span>
                          ) : (
                            <>
                              <span>Verificar y Continuar</span>
                              <CheckCircle2 size={18} />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={resendCooldown > 0 || codeLoading}
                          className={styles.resendBtn}
                        >
                          {resendCooldown > 0
                            ? `Reenviar código en ${resendCooldown}s`
                            : '¿No recibiste el código? Reenviar código'}
                        </button>

                        <button
                          type="button"
                          onClick={handleChangeEmail}
                          className={styles.changeEmailBtn}
                        >
                          Cambiar correo electrónico
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.registerForm}>
                  {/* Campo trampa Honeypot invisible contra bots */}
                  <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
                    <label htmlFor="website-hp-2">Website</label>
                    <input
                      id="website-hp-2"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {/* Banner de Correo Verificado */}
                  <div className={styles.verifiedBanner}>
                    <div className={styles.verifiedBannerLeft}>
                      <span className={styles.verifiedBadge}>
                        <CheckCircle2 size={13} /> Correo Verificado
                      </span>
                      <span><strong>{formData.email}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      className={styles.verifiedBannerChangeBtn}
                    >
                      Cambiar correo
                    </button>
                  </div>

                  {/* 1. SECCIÓN: DATOS DEL RESTAURANTE */}
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

                  {/* 2. SECCIÓN: DATOS DEL ADMINISTRADOR */}
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
                        <span className={styles.fieldHelp}>Para soporte y verificación</span>
                      </div>

                      {/* Correo Electrónico Verificado */}
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Correo Electrónico (Acceso) *</label>
                        <div className={styles.inputWrapper}>
                          <Mail size={18} className={styles.inputIcon} />
                          <input
                            type="email"
                            required
                            readOnly
                            value={formData.email}
                            className={styles.input}
                            style={{ backgroundColor: '#f8fafc', color: '#1e293b', fontWeight: 600, cursor: 'default' }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            <CheckCircle2 size={16} /> Verificado
                          </span>
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
                            placeholder="Mínimo 8 caracteres"
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
                              {validatePassword(formData.password).checks.length ? '✓' : '○'} Mín. 8 caracteres
                            </span>
                            <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.uppercase ? styles.requirementMet : ''}`}>
                              {validatePassword(formData.password).checks.uppercase ? '✓' : '○'} Mayúscula
                            </span>
                            <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.lowercase ? styles.requirementMet : ''}`}>
                              {validatePassword(formData.password).checks.lowercase ? '✓' : '○'} Minúscula
                            </span>
                            <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.number ? styles.requirementMet : ''}`}>
                              {validatePassword(formData.password).checks.number ? '✓' : '○'} Número
                            </span>
                            <span className={`${styles.requirementItem} ${validatePassword(formData.password).checks.special ? styles.requirementMet : ''}`}>
                              {validatePassword(formData.password).checks.special ? '✓' : '○'} Símbolo (!@#)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. SECCIÓN FINAL: PLAN A PROBAR Y VALOR DE RENOVACIÓN */}
                  <div className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                      <Crown size={18} className={styles.sectionIcon} />
                      <span className={styles.sectionTitle}>Plan y Modalidad (Incluye 7 Días de Prueba)</span>
                    </div>

                    {/* Aviso Destacado de Prueba Gratuita */}
                    <div className={styles.planTrialNotice}>
                      <Sparkles size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span>
                        <strong>¡7 Días de Prueba 100% Gratis en cualquier plan!</strong> Disfruta de acceso inmediato con las funciones del plan que elijas. Al finalizar los 7 días tu información queda guardada y podrás activarlo cancelando su valor regular.
                      </span>
                    </div>

                    {/* Selector de Ciclo de Facturación */}
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

                    {/* Tabs de Selección Móvil */}
                    <div className={styles.mobilePlanTabs}>
                      {plans.map(p => {
                        const isSelected = selectedPlanCode === p.code;
                        return (
                          <button
                            key={`tab-${p.code}`}
                            type="button"
                            onClick={() => {
                              setSelectedPlanCode(p.code);
                              const el = document.getElementById(`plan-card-${p.code}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                            }}
                            className={`${styles.mobilePlanTabBtn} ${isSelected ? styles.mobilePlanTabBtnActive : ''}`}
                          >
                            <span>{p.code === 'basic' ? 'Emprendedor' : p.code === 'pro' ? 'Pro ⭐' : 'Cadenas'}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Grid Compacto de Planes */}
                    <div className={styles.planCardsGrid}>
                      {plans.map(p => {
                        const isSelected = selectedPlanCode === p.code;
                        const catalogItem = PLANS_CATALOG.find(cat => cat.code === p.code) || {};
                        const cost = calculatePlanCost(p, billingCycle);

                        return (
                          <div
                            id={`plan-card-${p.code}`}
                            key={p.code}
                            onClick={() => setSelectedPlanCode(p.code)}
                            className={`${styles.planCard} ${isSelected ? styles.planCardActive : ''}`}
                          >
                            {catalogItem.badge && (
                              <span className={`${styles.planBadgeHeader} ${catalogItem.popular ? styles.popularPill : styles.enterprisePill}`}>
                                {catalogItem.badge}
                              </span>
                            )}

                            <div className={styles.planCardHeader}>
                              <span className={styles.planCardName}>{catalogItem.name || p.name}</span>
                              <input
                                type="radio"
                                name="planSelection"
                                checked={isSelected}
                                onChange={() => setSelectedPlanCode(p.code)}
                                className={styles.planCardRadio}
                              />
                            </div>

                            <div className={styles.planCardPriceContainer}>
                              <div className={styles.trialPriceZero}>
                                <span className={styles.planCardPrice}>$0 COP</span>
                                <span className={styles.trialPill}>7 DÍAS GRATIS</span>
                              </div>
                              <span className={styles.planCardPricePeriod}>
                                Luego {billingCycle === 'monthly' ? formatCurrency(p.priceMonthly) : formatCurrency(cost)}/{billingCycle === 'annual' ? 'año' : billingCycle === 'semiannual' ? 'semestre' : 'mes'}
                              </span>
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
                              <div className={styles.planCardLimitItem}>
                                <Building2 size={13} className={styles.planCardLimitIcon} />
                                <span>{(p.maxBranches || 1) > 1 ? `${p.maxBranches} Sedes` : '1 Sede'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Indicadores de Puntos Móvil */}
                    <div className={styles.mobilePlanDots}>
                      {plans.map(p => (
                        <button
                          type="button"
                          key={`dot-${p.code}`}
                          onClick={() => {
                            setSelectedPlanCode(p.code);
                            const el = document.getElementById(`plan-card-${p.code}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }}
                          className={`${styles.mobilePlanDot} ${selectedPlanCode === p.code ? styles.mobilePlanDotActive : ''}`}
                          aria-label={`Ver ${p.name}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 4. BOTÓN DE ENVÍO Y ACTIVACIÓN */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitBtn}
                  >
                    {loading ? (
                      <span>Activando tu establecimiento...</span>
                    ) : (
                      <>
                        <span>Comenzar Prueba Gratuita de 7 Días ({currentPlan?.name})</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', margin: '0.75rem 0 0', lineHeight: 1.4 }}>
                    Al comenzar tu prueba de 7 días, confirmas que aceptas nuestros{' '}
                    <Link to="/terminos" target="_blank" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
                      Términos de Servicio
                    </Link>{' '}
                    y{' '}
                    <Link to="/privacidad" target="_blank" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
                      Política de Privacidad
                    </Link>.
                  </p>
                </form>
          )}
        </div>
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
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/terminos" target="_blank" style={{ color: '#64748b', textDecoration: 'none' }}>Términos</Link>
            <span>&bull;</span>
            <Link to="/privacidad" target="_blank" style={{ color: '#64748b', textDecoration: 'none' }}>Privacidad</Link>
            <span>&bull;</span>
            <Link to="/cookies" target="_blank" style={{ color: '#64748b', textDecoration: 'none' }}>Cookies</Link>
            <span>&bull;</span>
            <Link to="/sla" target="_blank" style={{ color: '#64748b', textDecoration: 'none' }}>SLA</Link>
          </div>
        </div>
      </div>

      {/* Footer General */}
      <footer className={styles.pageFooter}>
        <p>&copy; {new Date().getFullYear()} NeoFood &bull; Sistema Integral de Gestión Gastronómica &bull; v1.8.0</p>
        <p className={styles.pageFooterAuthor}>Diseñado por <strong>Leonardo Ramirez</strong></p>
      </footer>
    </div>
  );
};

export default RegisterTenant;
