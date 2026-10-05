import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingCart,
  ChefHat,
  ShoppingBag,
  Wallet,
  Package,
  Factory,
  FileText,
  Users,
  ChevronDown,
  Star,
  MessageCircle,
  Clock,
  Laptop,
  Smartphone,
  Store,
  Layers,
  Check,
  X,
  CreditCard,
  Percent,
  TrendingUp,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Shield
} from 'lucide-react';
import api from '../../api/axios';
import {
  DEFAULT_PLANS,
  TRIAL_DAYS,
  SUPPORT_WHATSAPP,
  formatCOP,
  calculatePlanCost,
  annualSavingsPercent,
  formatLimit,
  getPlanFeatures,
  FEATURE_LABELS
} from '../../constants/plans';
import styles from './LandingPage.module.css';

const FAQS = [
  {
    q: '¿Cómo funciona la prueba gratuita de 7 días?',
    a: `Al registrarte, tu restaurante recibe acceso inmediato y completo al sistema durante ${TRIAL_DAYS} días. Podrás configurar tu menú, registrar tus mesas, abrir turnos de caja, probar la pantalla de cocina y compartir el enlace de tu tienda virtual para recibir pedidos por WhatsApp sin pagar un solo peso.`
  },
  {
    q: '¿Necesito ingresar tarjeta de crédito para iniciar la prueba?',
    a: 'No. No te pediremos tarjeta de crédito ni datos bancarios para comenzar tu prueba gratuita. Solo necesitas el nombre de tu restaurante, tu correo y teléfono celular.'
  },
  {
    q: '¿Qué pasa cuando terminen los 7 días de prueba?',
    a: 'Tu información, catálogo y configuraciones quedarán guardados de forma segura. Podrás elegir el plan que mejor se adapte a tu tamaño (Básico, Pro o Enterprise) y realizar el pago mensual, semestral o anual para continuar operando sin interrupciones.'
  },
  {
    q: '¿Cómo funciona la Tienda Virtual con WhatsApp?',
    a: 'NeoFood te entrega una URL propia (ej. neofood.com/tienda/tu-restaurante) con tu logotipo, horarios y catálogo. Tus clientes eligen sus platillos, personalizan términos o adiciones y, al pulsar "Confirmar Pedido", se genera automáticamente un mensaje estructurado y listo para enviar directo al WhatsApp de tu restaurante.'
  },
  {
    q: '¿Cobran comisiones por las ventas o pedidos en línea?',
    a: '0% comisiones. A diferencia de las plataformas tradicionales de delivery que descuentan entre el 20% y 30% de tus ventas, con NeoFood todo lo que vendes es 100% tuyo.'
  },
  {
    q: '¿En qué dispositivos puedo usar NeoFood?',
    a: 'NeoFood funciona 100% en la nube a través de cualquier navegador moderno. Puedes usarlo en computadores portátiles o de escritorio (Windows, Mac, Linux), tabletas (iPad o Android) y smartphones para meseros y administradores.'
  },
  {
    q: '¿Puedo cambiar de plan o cancelar en cualquier momento?',
    a: 'Sí, totalmente. No tenemos cláusulas de permanencia mínima obligatoria. Puedes subir de plan cuando tu restaurante crezca o cambiar tu ciclo de facturación cuando lo desees.'
  }
];

const MODULES_SHOWCASE = [
  {
    id: 'pos',
    tag: 'Salón y Mostrador',
    title: 'Punto de Venta (POS) Táctil & Mesas',
    icon: ShoppingCart,
    color: '#4f46e5',
    description: 'Toma pedidos en segundos, visualiza el mapa de mesas con su estado en vivo, divide cuentas, gestiona propinas y aplica descuentos con un par de toques.',
    highlights: [
      'Mapa interactivo de mesas con tiempo transcurrido',
      'Comandas para salón, retiro y domicilio',
      'Múltiples métodos de pago: Efectivo, Tarjeta, Transferencia y Crédito',
      'Modificadores y adiciones por platillo'
    ]
  },
  {
    id: 'cocina',
    tag: 'Cocina Sin Papeles',
    title: 'Pantalla Digital de Cocina (KDS)',
    icon: ChefHat,
    color: '#ef4444',
    description: 'Elimina las comandas en papel y los retrasos. Tu equipo de cocina recibe los pedidos en tiempo real con alertas de tiempo y estados de preparación claros.',
    highlights: [
      'Actualización instantánea sin recargar la página',
      'Alerta visual por tiempo de espera (normal, atención, crítico)',
      'Organización por número de mesa o tipo de pedido',
      'Cambio de estado en 1 clic (Pendiente, En Preparación, Listo)'
    ]
  },
  {
    id: 'tienda',
    tag: 'Ventas Digitales',
    title: 'Tienda Virtual con Pedidos por WhatsApp',
    icon: ShoppingBag,
    color: '#0ea5e9',
    description: 'Tu propio menú digital online con link personalizado. Tus clientes exploran tu carta desde su celular y envían su orden estructurada directo al chat de tu negocio.',
    highlights: [
      'Enlace único para tu biografía de Instagram y Google Maps',
      '0% de comisión por venta (el dinero entra directo a tu cuenta)',
      'Control de horarios de atención semanales con 2 turnos por día',
      'Checkout con cálculo automático de domicilio y notas de entrega'
    ]
  },
  {
    id: 'caja',
    tag: 'Cero Fugas de Dinero',
    title: 'Control de Caja & Cierres Ciegos',
    icon: Wallet,
    color: '#10b981',
    description: 'Control estricto de cada turno. Apertura de caja con base, registro de gastos imprevistos, arqueos en vivo y cierres ciegos para proteger tu dinero.',
    highlights: [
      'Cierre ciego obligatorio para evitar descuadres intencionales',
      'Registro categorizado de egresos y gastos menores',
      'Control de saldo en efectivo vs pagos digitales',
      'Historial auditable por usuario y fecha'
    ]
  },
  {
    id: 'produccion',
    tag: 'Rentabilidad Real',
    title: 'Inventario, Sub-Recetas & Producción',
    icon: Factory,
    color: '#f59e0b',
    description: 'Calcula con exactitud cuánto cuesta cada platillo. Administra insumos base, elabora lotes de sub-recetas (masas, salsas) y calcula el Costo Medio Ponderado (CMP) automático.',
    highlights: [
      'Separación de materias primas e insumos elaborados',
      'Recetario con cálculo automático de costo por porción',
      'Descuento automático de stock al registrar ventas y lotes',
      'Alertas de stock mínimo para reposición oportuna'
    ]
  },
  {
    id: 'reportes',
    tag: 'Finanzas Claras',
    title: 'Facturación & Reportes PDF Ejecutivos',
    icon: FileText,
    color: '#8b5cf6',
    description: 'Información gerencial en tiempo real. Exporta reportes consolidados mensuales en PDF de alta fidelidad, listos para auditorías contables y toma de decisiones.',
    highlights: [
      'Balance consolidado de ventas, compras y margen bruto',
      'Comprobantes y facturas con tu identidad institucional',
      'Módulo de ventas a crédito con seguimiento de abonos y saldos',
      'Exportación a PDF en 1 solo clic'
    ]
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'semiannual' | 'annual'
  const [openFaq, setOpenFaq] = useState(0);
  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/auth/plans');
        if (res.data?.data && res.data.data.length > 0) {
          setPlans(res.data.data);
        }
      } catch {
        // Fallback a DEFAULT_PLANS
      }
    };
    fetchPlans();
  }, []);

  const handleStartTrial = (planCode = 'basic') => {
    navigate(`/registro?plan=${planCode}&mode=trial&cycle=${billingCycle}`);
  };

  const handleSelectPaid = (planCode) => {
    navigate(`/registro?plan=${planCode}&mode=paid&cycle=${billingCycle}`);
  };

  const scrollToSection = (e, sectionId) => {
    if (e && e.preventDefault) e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeModule = MODULES_SHOWCASE.find(m => m.id === activeTab) || MODULES_SHOWCASE[0];

  return (
    <div className={styles.landingWrapper}>
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className={styles.topAnnouncement}>
        <div className={styles.topAnnouncementInner}>
          <span className={styles.announcementBadge}>
            <Sparkles size={13} /> ¡Lanzamiento v1.7.6!
          </span>
          <span className={styles.announcementText}>
            Prueba <strong>NeoFood Gratis por {TRIAL_DAYS} Días</strong> con acceso completo a todos los módulos. Sin tarjeta de crédito.
          </span>
          <button
            onClick={() => handleStartTrial('pro')}
            className={styles.announcementCta}
          >
            Comenzar Prueba →
          </button>
        </div>
      </div>

      {/* 2. NAVBAR NAVEGACIÓN */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link to="/" className={styles.brandLink}>
            <span className={styles.brandNeo}>Neo</span>
            <span className={styles.brandFood}>FOOD</span>
            <span className={styles.brandBadge}>POS & CRM</span>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')} className={styles.navLink}>Módulos</a>
            <a href="#whatsapp" onClick={(e) => scrollToSection(e, 'whatsapp')} className={styles.navLink}>Tienda WhatsApp</a>
            <a href="#precios" onClick={(e) => scrollToSection(e, 'precios')} className={styles.navLink}>Planes & Precios</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className={styles.navLink}>Preguntas</a>
          </nav>

          <div className={styles.navActions}>
            <Link to="/login" className={styles.loginBtn}>
              Iniciar Sesión
            </Link>
            <button
              onClick={() => handleStartTrial('pro')}
              className={styles.trialNavBtn}
            >
              <Sparkles size={15} />
              <span>Prueba {TRIAL_DAYS} Días Gratis</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackgroundGlow}></div>
        <div className={styles.heroContainer}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} className={styles.heroBadgeIcon} />
            <span>Software Gastronómico Todo-en-Uno • {TRIAL_DAYS} Días Gratis</span>
          </div>

          <h1 className={styles.heroTitle}>
            El Sistema Operativo Definitivo para{' '}
            <span className={styles.heroGradientText}>tu Restaurante</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Unifica tu <strong>Punto de Venta (POS)</strong>, <strong>Pantalla de Cocina (KDS)</strong>, 
            <strong> Tienda Virtual con pedidos por WhatsApp</strong>, <strong>Control de Caja</strong>, 
            <strong> Sub-Recetas e Inventario CMP</strong> en una sola plataforma en la nube.
          </p>

          <div className={styles.heroCtaGroup}>
            <button
              onClick={() => handleStartTrial('pro')}
              className={styles.heroPrimaryBtn}
            >
              <Sparkles size={18} />
              <span>Comenzar Prueba Gratuita de {TRIAL_DAYS} Días</span>
              <ArrowRight size={18} />
            </button>
            <a href="#precios" onClick={(e) => scrollToSection(e, 'precios')} className={styles.heroSecondaryBtn}>
              <span>Ver Planes y Precios</span>
              <ChevronDown size={17} />
            </a>
          </div>

          <div className={styles.heroTrustBadges}>
            <div className={styles.trustItem}>
              <CheckCircle2 size={16} className={styles.trustIcon} />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className={styles.trustItem}>
              <CheckCircle2 size={16} className={styles.trustIcon} />
              <span>Configuración lista en 2 minutos</span>
            </div>
            <div className={styles.trustItem}>
              <CheckCircle2 size={16} className={styles.trustIcon} />
              <span>0% de comisiones por venta</span>
            </div>
            <div className={styles.trustItem}>
              <CheckCircle2 size={16} className={styles.trustIcon} />
              <span>Cancela cuando quieras</span>
            </div>
          </div>

          {/* HERO APP SHOWCASE MOCKUP */}
          <div className={styles.heroMockupWrapper}>
            <div className={styles.heroMockupWindow}>
              {/* Window Header */}
              <div className={styles.windowHeader}>
                <div className={styles.windowDots}>
                  <span className={`${styles.dot} ${styles.dotRed}`}></span>
                  <span className={`${styles.dot} ${styles.dotYellow}`}></span>
                  <span className={`${styles.dot} ${styles.dotGreen}`}></span>
                </div>
                <div className={styles.windowAddress}>
                  <ShieldCheck size={13} style={{ color: '#10b981' }} />
                  <span>app.neofood.com — Dashboard Ejecutivo & POS en Vivo</span>
                </div>
                <div className={styles.windowActions}>
                  <span className={styles.liveIndicator}>
                    <span className={styles.livePulse}></span> En Vivo
                  </span>
                </div>
              </div>

              {/* Window Tabs Bar */}
              <div className={styles.mockupTabsBar}>
                {MODULES_SHOWCASE.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = activeTab === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setActiveTab(mod.id)}
                      className={`${styles.mockupTabBtn} ${isActive ? styles.mockupTabBtnActive : ''}`}
                    >
                      <Icon size={15} style={{ color: isActive ? mod.color : 'inherit' }} />
                      <span>{mod.title.split('(')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mockup Dynamic Content */}
              <div className={styles.mockupBody}>
                <div className={styles.mockupSplit}>
                  <div className={styles.mockupDetails}>
                    <span className={styles.mockupTag} style={{ borderColor: activeModule.color, color: activeModule.color }}>
                      {activeModule.tag}
                    </span>
                    <h3 className={styles.mockupTitle}>{activeModule.title}</h3>
                    <p className={styles.mockupDesc}>{activeModule.description}</p>
                    <ul className={styles.mockupHighlights}>
                      {activeModule.highlights.map((h, i) => (
                        <li key={i}>
                          <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: '1.25rem' }}>
                      <button
                        onClick={() => handleStartTrial('pro')}
                        className={styles.mockupCta}
                      >
                        Probar este módulo gratis →
                      </button>
                    </div>
                  </div>

                  {/* Visual Preview Graphic */}
                  <div className={styles.mockupGraphicCard}>
                    <div className={styles.graphicHeader}>
                      <div className={styles.graphicIconWrapper} style={{ backgroundColor: `${activeModule.color}15`, color: activeModule.color }}>
                        {React.createElement(activeModule.icon, { size: 28 })}
                      </div>
                      <div>
                        <span className={styles.graphicKpiLabel}>Estado del Sistema</span>
                        <h4 className={styles.graphicKpiValue}>100% Operativo</h4>
                      </div>
                    </div>

                    <div className={styles.graphicMetricsGrid}>
                      <div className={styles.graphicMetricBox}>
                        <span className={styles.metricLabel}>Mesas Activas</span>
                        <span className={styles.metricVal}>14 / 20</span>
                        <div className={styles.metricBar}>
                          <div className={styles.metricBarFill} style={{ width: '70%', backgroundColor: '#4f46e5' }}></div>
                        </div>
                      </div>
                      <div className={styles.graphicMetricBox}>
                        <span className={styles.metricLabel}>Tiempo Promedio Cocina</span>
                        <span className={styles.metricVal}>11 min</span>
                        <div className={styles.metricBar}>
                          <div className={styles.metricBarFill} style={{ width: '45%', backgroundColor: '#10b981' }}></div>
                        </div>
                      </div>
                      <div className={styles.graphicMetricBox}>
                        <span className={styles.metricLabel}>Ventas del Turno</span>
                        <span className={styles.metricVal}>$1.840.000</span>
                        <span className={styles.metricSub}>+18% vs ayer</span>
                      </div>
                      <div className={styles.graphicMetricBox}>
                        <span className={styles.metricLabel}>Pedidos WhatsApp</span>
                        <span className={styles.metricVal}>28 Despachados</span>
                        <span className={styles.metricSub}>0% comisiones</span>
                      </div>
                    </div>

                    <div className={styles.graphicAlertBanner}>
                      <Zap size={15} style={{ color: '#f59e0b' }} />
                      <span>Stock y recetas calculados con Costo Medio Ponderado (CMP)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STATS / IMPACT COUNTERS */}
      <section className={styles.statsBarSection}>
        <div className={styles.statsContainer}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>0%</span>
            <span className={styles.statLabel}>Comisión por pedidos online</span>
            <span className={styles.statDesc}>Tus ganancias van directo a ti</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{TRIAL_DAYS} Días</span>
            <span className={styles.statLabel}>De prueba 100% gratuita</span>
            <span className={styles.statDesc}>Sin tarjeta de crédito requerida</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>100%</span>
            <span className={styles.statLabel}>En la Nube (Cloud)</span>
            <span className={styles.statDesc}>Accede desde PC, Mac, Tablet o Celular</span>
          </div>
          <div className={styles.statDivider}></div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>&lt; 2 min</span>
            <span className={styles.statLabel}>Puesta en marcha</span>
            <span className={styles.statDesc}>Regístrate y comienza a vender hoy</span>
          </div>
        </div>
      </section>

      {/* 5. MÓDULOS DEL SISTEMA */}
      <section id="modulos" className={styles.modulesSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPill}>Todo lo que tu negocio necesita</span>
          <h2 className={styles.sectionTitle}>
            Un ecosistema completo diseñado para la gastronomía moderna
          </h2>
          <p className={styles.sectionDesc}>
            Olvídate de pagar 4 o 5 programas diferentes. NeoFood integra cada área operativa de tu restaurante en una sola suscripción accesible.
          </p>
        </div>

        <div className={styles.modulesGrid}>
          {MODULES_SHOWCASE.map((mod) => {
            const Icon = mod.icon;
            return (
              <div key={mod.id} className={styles.moduleCard}>
                <div className={styles.moduleCardHeader}>
                  <div
                    className={styles.moduleIconWrapper}
                    style={{ backgroundColor: `${mod.color}15`, color: mod.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <span className={styles.moduleTagBadge}>{mod.tag}</span>
                </div>

                <h3 className={styles.moduleCardTitle}>{mod.title}</h3>
                <p className={styles.moduleCardDesc}>{mod.description}</p>

                <div className={styles.moduleCardDivider}></div>

                <ul className={styles.moduleFeatureList}>
                  {mod.highlights.map((h, i) => (
                    <li key={i}>
                      <Check size={14} className={styles.checkIcon} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. WHATSAPP & TIENDA VIRTUAL SPOTLIGHT */}
      <section id="whatsapp" className={styles.spotlightSection}>
        <div className={styles.spotlightContainer}>
          <div className={styles.spotlightContent}>
            <span className={styles.spotlightPill}>
              <MessageCircle size={14} /> Tu Propia Tienda Digital Sin Intermediarios
            </span>
            <h2 className={styles.spotlightTitle}>
              Recibe pedidos automáticos a tu WhatsApp sin pagar comisiones abusivas
            </h2>
            <p className={styles.spotlightDesc}>
              Las aplicaciones de delivery tradicionales te cobran hasta el 30% por cada plato que vendes. Con NeoFood, creas tu tienda virtual con tu logo, fotos y horarios de atención, y recibes los pedidos ya sumados y ordenados directo al WhatsApp de tu local.
            </p>

            <div className={styles.spotlightPoints}>
              <div className={styles.spotlightPoint}>
                <div className={styles.pointIcon} style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <Percent size={18} />
                </div>
                <div>
                  <strong>0% de comisión por pedido</strong>
                  <p>Conserva el 100% de tu margen de ganancia en cada plato entregado.</p>
                </div>
              </div>

              <div className={styles.spotlightPoint}>
                <div className={styles.pointIcon} style={{ background: '#ede9fe', color: '#8b5cf6' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <strong>Horarios Semanales Inteligentes (2 Turnos)</strong>
                  <p>Apertura y cierre automático con 2 turnos por día (almuerzo y cena).</p>
                </div>
              </div>

              <div className={styles.spotlightPoint}>
                <div className={styles.pointIcon} style={{ background: '#e0f2fe', color: '#0ea5e9' }}>
                  <Users size={18} />
                </div>
                <div>
                  <strong>Base de Datos Propia de Clientes</strong>
                  <p>Fideliza a tus propios comensales sin ceder tus datos a terceros.</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={() => handleStartTrial('pro')}
                className={styles.heroPrimaryBtn}
              >
                <span>Crear mi Tienda en 2 Minutos</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div className={styles.spotlightPhoneMockup}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneSpeaker}></div>
              <div className={styles.phoneScreen}>
                <div className={styles.phoneAppHeader}>
                  <div className={styles.phoneLogoBadge}>🍽️</div>
                  <div>
                    <h5 className={styles.phoneStoreName}>Burger & Grill Co.</h5>
                    <span className={styles.phoneStatusBadge}>● Abierto Ahora</span>
                  </div>
                </div>

                <div className={styles.phoneBanner}>
                  <span>🔥 20% OFF en Combos Especiales</span>
                </div>

                <div className={styles.phoneMenuGrid}>
                  <div className={styles.phoneDishCard}>
                    <div className={styles.dishEmoji}>🍔</div>
                    <div className={styles.dishInfo}>
                      <h6>Smash Doble Queso</h6>
                      <span>Pan brioche, carne madurada</span>
                      <strong>$28.900</strong>
                    </div>
                  </div>
                  <div className={styles.phoneDishCard}>
                    <div className={styles.dishEmoji}>🍟</div>
                    <div className={styles.dishInfo}>
                      <h6>Papas Rústicas Trufadas</h6>
                      <span>Con queso parmesano</span>
                      <strong>$14.500</strong>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Preview */}
                <div className={styles.phoneChatBubble}>
                  <div className={styles.chatSender}>
                    <MessageCircle size={13} style={{ color: '#25D366' }} />
                    <span>WhatsApp del Restaurante</span>
                  </div>
                  <p className={styles.chatMessage}>
                    👋 ¡Hola! Nuevo Pedido #1042<br />
                    • 1x Smash Doble Queso ($28.900)<br />
                    • 1x Papas Rústicas ($14.500)<br />
                    📍 Domicilio: Cra 15 # 85-20<br />
                    💵 Total: $43.400 (Pago: Efectivo)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PLANES & PRECIOS (PRICING) */}
      <section id="precios" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPill}>Precios Claros y Transparentes</span>
          <h2 className={styles.sectionTitle}>
            Elige el plan ideal para tu restaurante
          </h2>
          <p className={styles.sectionDesc}>
            Todos los planes incluyen <strong>{TRIAL_DAYS} días de prueba gratuita sin tarjeta de crédito</strong>. Activa hoy mismo y comienza a operar.
          </p>

          {/* Selector de Ciclo de Facturación */}
          <div className={styles.cycleSelectorWrapper}>
            <div className={styles.cycleSelector}>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`${styles.cycleBtn} ${billingCycle === 'monthly' ? styles.cycleBtnActive : ''}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('semiannual')}
                className={`${styles.cycleBtn} ${billingCycle === 'semiannual' ? styles.cycleBtnActive : ''}`}
              >
                Semestral (6 meses)
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`${styles.cycleBtn} ${billingCycle === 'annual' ? styles.cycleBtnActive : ''}`}
              >
                <span>Anual</span>
                <span className={styles.savingsBadge}>Ahorra 17% (2 meses gratis)</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {plans.map((plan) => {
            const isPro = plan.code === 'pro';
            const isEnterprise = plan.code === 'enterprise';
            const monthlyPrice = parseFloat(plan.priceMonthly) || 0;
            const annualPrice = parseFloat(plan.priceAnnual) || monthlyPrice * 10;
            const totalCycleCost = calculatePlanCost(plan, billingCycle);
            const savings = annualSavingsPercent(plan);
            const features = getPlanFeatures(plan);

            return (
              <div
                key={plan.id || plan.code}
                className={`${styles.pricingCard} ${isPro ? styles.pricingCardPro : ''}`}
              >
                {isPro && (
                  <div className={styles.popularBadge}>
                    <Star size={13} /> MÁS ELEGIDO POR RESTAURANTES
                  </div>
                )}

                <div className={styles.pricingHeader}>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <p className={styles.planDesc}>{plan.description}</p>

                  <div className={styles.priceContainer}>
                    <div className={styles.priceMain}>
                      <span className={styles.priceCurrency}>$</span>
                      <span className={styles.priceAmount}>
                        {new Intl.NumberFormat('es-CO').format(
                          billingCycle === 'annual'
                            ? Math.round(annualPrice / 12)
                            : monthlyPrice
                        )}
                      </span>
                      <span className={styles.pricePeriod}>/ mes</span>
                    </div>

                    {billingCycle === 'annual' && (
                      <span className={styles.annualBillingNote}>
                        Facturado anualmente: {formatCOP(annualPrice)} / año ({savings}% de ahorro)
                      </span>
                    )}

                    {billingCycle === 'semiannual' && (
                      <span className={styles.annualBillingNote}>
                        Facturado semestralmente: {formatCOP(monthlyPrice * 6)} cada 6 meses
                      </span>
                    )}
                  </div>
                </div>

                {/* Límites de Capacidad */}
                <div className={styles.limitsBox}>
                  <div className={styles.limitRow}>
                    <span className={styles.limitLabel}>Capacidad de Mesas:</span>
                    <strong className={styles.limitValue}>{formatLimit(plan.maxTables, 'mesa', 'mesas')}</strong>
                  </div>
                  <div className={styles.limitRow}>
                    <span className={styles.limitLabel}>Usuarios del Sistema:</span>
                    <strong className={styles.limitValue}>{formatLimit(plan.maxUsers, 'usuario', 'usuarios')}</strong>
                  </div>
                  <div className={styles.limitRow}>
                    <span className={styles.limitLabel}>Sedes / Sucursales:</span>
                    <strong className={styles.limitValue}>{formatLimit(plan.maxBranches, 'sede', 'sedes')}</strong>
                  </div>
                </div>

                {/* Botón Principal: Prueba Gratis */}
                <button
                  onClick={() => handleStartTrial(plan.code)}
                  className={`${styles.planPrimaryBtn} ${isPro ? styles.planPrimaryBtnPro : ''}`}
                >
                  <Sparkles size={16} />
                  <span>Probar {TRIAL_DAYS} Días Gratis</span>
                </button>

                {/* Botón Secundario: Suscribirse Directo */}
                <button
                  onClick={() => handleSelectPaid(plan.code)}
                  className={styles.planSecondaryBtn}
                >
                  Contratar Plan ({billingCycle === 'annual' ? 'Anual' : billingCycle === 'semiannual' ? 'Semestral' : 'Mensual'})
                </button>

                <div className={styles.pricingDivider}></div>

                {/* Lista de Características */}
                <div className={styles.featuresSection}>
                  <span className={styles.featuresTitle}>Incluye:</span>
                  <ul className={styles.featuresList}>
                    {/* Características Base para Todos */}
                    <li>
                      <Check size={16} className={styles.featureCheck} />
                      <span>Tienda Virtual con pedidos por WhatsApp</span>
                    </li>
                    <li>
                      <Check size={16} className={styles.featureCheck} />
                      <span>Pantalla Digital de Cocina (KDS) en tiempo real</span>
                    </li>
                    <li>
                      <Check size={16} className={styles.featureCheck} />
                      <span>Punto de Venta (POS) y comanda en salón</span>
                    </li>
                    <li>
                      <Check size={16} className={styles.featureCheck} />
                      <span>Control de caja, turnos y cierres ciegos</span>
                    </li>
                    <li>
                      <Check size={16} className={styles.featureCheck} />
                      <span>Facturación e impresión de reportes en PDF</span>
                    </li>

                    {/* Características Condicionales según Plan */}
                    <li className={features.inventory ? '' : styles.featureDisabled}>
                      {features.inventory ? (
                        <Check size={16} className={styles.featureCheck} />
                      ) : (
                        <X size={16} className={styles.featureCross} />
                      )}
                      <span>Inventario de materias primas y compras</span>
                    </li>

                    <li className={features.recipes ? '' : styles.featureDisabled}>
                      {features.recipes ? (
                        <Check size={16} className={styles.featureCheck} />
                      ) : (
                        <X size={16} className={styles.featureCross} />
                      )}
                      <span>Sub-recetas y Órdenes de Producción (CMP)</span>
                    </li>

                    <li className={features.analytics ? '' : styles.featureDisabled}>
                      {features.analytics ? (
                        <Check size={16} className={styles.featureCheck} />
                      ) : (
                        <X size={16} className={styles.featureCross} />
                      )}
                      <span>Analítica avanzada de ventas y mermas</span>
                    </li>

                    <li className={features.prioritySupport ? '' : styles.featureDisabled}>
                      {features.prioritySupport ? (
                        <Check size={16} className={styles.featureCheck} />
                      ) : (
                        <X size={16} className={styles.featureCross} />
                      )}
                      <span>Soporte prioritario VIP 24/7</span>
                    </li>
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Garantía y Asesoría */}
        <div className={styles.pricingGuaranteeBox}>
          <div className={styles.guaranteeItem}>
            <ShieldCheck size={22} style={{ color: '#10b981' }} />
            <div>
              <strong>Garantía de Satisfacción</strong>
              <p>Prueba durante {TRIAL_DAYS} días con todas las funciones activas. Sin compromisos.</p>
            </div>
          </div>
          <div className={styles.guaranteeDivider}></div>
          <div className={styles.guaranteeItem}>
            <MessageCircle size={22} style={{ color: '#25D366' }} />
            <div>
              <strong>¿Tienes dudas o necesitas un plan a la medida?</strong>
              <p>Habla directamente con uno de nuestros asesores por WhatsApp.</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hola%20Soporte%20NeoFood,%20quisiera%20asesoría%20sobre%20los%20planes%20y%20la%20prueba%20gratuita.`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.guaranteeWhatsAppBtn}
          >
            <span>Chatear por WhatsApp</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </section>

      {/* 8. PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPill}>Resolvemos tus Inquietudes</span>
          <h2 className={styles.sectionTitle}>Preguntas Frecuentes</h2>
          <p className={styles.sectionDesc}>
            Todo lo que necesitas saber antes de comenzar con NeoFood.
          </p>
        </div>

        <div className={styles.faqContainer}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  className={styles.faqQuestionBtn}
                >
                  <span className={styles.faqQuestionText}>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`${styles.faqChevron} ${isOpen ? styles.faqChevronRotated : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className={styles.faqAnswerBody}>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. FINAL CTA BANNER */}
      <section className={styles.finalCtaSection}>
        <div className={styles.finalCtaContainer}>
          <div className={styles.finalCtaBadge}>
            <Sparkles size={14} /> Tu restaurante merece un sistema moderno
          </div>
          <h2 className={styles.finalCtaTitle}>
            Comienza a transformar tu operación hoy mismo
          </h2>
          <p className={styles.finalCtaDesc}>
            Únete a los restaurantes, cafés y cadenas que ya automatizan sus pedidos, eliminan mermas y aumentan sus ganancias con NeoFood.
          </p>

          <div className={styles.finalCtaButtons}>
            <button
              onClick={() => handleStartTrial('pro')}
              className={styles.finalCtaPrimaryBtn}
            >
              <Sparkles size={18} />
              <span>Iniciar Prueba Gratuita de {TRIAL_DAYS} Días</span>
              <ArrowRight size={18} />
            </button>

            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hola%20NeoFood,%20me%20gustaría%20agendar%20una%20demostración%20en%20vivo%20del%20sistema.`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.finalCtaSecondaryBtn}
            >
              <MessageCircle size={18} />
              <span>Solicitar Demostración</span>
            </a>
          </div>

          <span className={styles.finalCtaMicro}>
            Configuración en 2 minutos • Sin tarjeta de crédito • Soporte en español
          </span>
        </div>
      </section>

      {/* 10. FOOTER INSTITUCIONAL */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrandCol}>
              <div className={styles.brandLink}>
                <span className={styles.brandNeo}>Neo</span>
                <span className={styles.brandFood}>FOOD</span>
                <span className={styles.brandBadge}>POS & CRM</span>
              </div>
              <p className={styles.footerBio}>
                Plataforma integral en la nube para la gestión gastronómica: Punto de Venta (POS), Cocina (KDS), Tienda Virtual por WhatsApp, Control de Caja, Producción e Inventario.
              </p>
              <div className={styles.footerTrust}>
                <ShieldCheck size={16} style={{ color: '#10b981' }} />
                <span>Datos protegidos con arquitectura multi-tenant aislada</span>
              </div>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Módulos</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')}>Punto de Venta (POS)</a></li>
                <li><a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')}>Pantalla de Cocina (KDS)</a></li>
                <li><a href="#whatsapp" onClick={(e) => scrollToSection(e, 'whatsapp')}>Tienda Virtual WhatsApp</a></li>
                <li><a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')}>Control de Caja y Turnos</a></li>
                <li><a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')}>Sub-Recetas y Producción</a></li>
                <li><a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')}>Facturación y Reportes PDF</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Acceso Rápido</h4>
              <ul className={styles.footerLinks}>
                <li><Link to="/login">Iniciar Sesión</Link></li>
                <li><Link to="/registro">Crear Cuenta (Registro)</Link></li>
                <li><a href="#precios" onClick={(e) => scrollToSection(e, 'precios')}>Planes y Precios</a></li>
                <li><a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>Preguntas Frecuentes</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Contacto & Soporte</h4>
              <ul className={styles.footerLinks}>
                <li>
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#10b981', fontWeight: 600 }}
                  >
                    💬 WhatsApp de Asistencia
                  </a>
                </li>
                <li><span>Horario: Lun - Sáb (8:00 AM - 8:00 PM)</span></li>
                <li><span>Colombia & Latinoamérica</span></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.copyright}>
              &copy; {new Date().getFullYear()} NeoFood CRM & POS. Todos los derechos reservados. Diseñado para potenciar el sector gastronómico.
            </p>
            <div className={styles.footerLegal}>
              <span>Versión 1.7.6</span>
              <span>•</span>
              <a href="#precios" onClick={(e) => scrollToSection(e, 'precios')}>Términos del Servicio</a>
              <span>•</span>
              <Link to="/login">Portal de Clientes</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
