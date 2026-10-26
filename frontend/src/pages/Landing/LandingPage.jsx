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
  Shield,
  Pizza,
  Coffee,
  Flame,
  Beer,
  UtensilsCrossed,
  Utensils,
  Sandwich,
  MapPin,
  KeyRound,
  LogIn,
  Menu
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

const DEMOS_DATA = [
  {
    id: 'pizzeria',
    title: 'Bella Napoli Pizzería',
    category: 'Pizzería & Trattoria Italiana',
    tag: 'Pizzas & Pastas',
    icon: Pizza,
    color: '#e11d48',
    description: 'Pizzas artesanales al horno de piedra con tamaños personal/mediana/familiar, bordes de queso mozzarella, pastas y lasagnas.',
    highlights: ['14 Platillos con precios reales', 'Modificadores de tamaño y bordes', '8 Mesas activas configuradas'],
    email: 'pizzeria@demo.com',
    slug: 'demo-pizzeria'
  },
  {
    id: 'cafe',
    title: 'Café Origen & Brunch',
    category: 'Cafetería de Especialidad & Brunch',
    tag: 'Café & Repostería',
    icon: Coffee,
    color: '#d97706',
    description: 'Espressos, lattes con tipo de leche (entera/almendras), frappés fríos, tostadas francesas y repostería artesanal.',
    highlights: ['15 Bebidas y opciones de brunch', 'Opciones de leche y adiciones', 'Tienda virtual con WhatsApp'],
    email: 'cafe@demo.com',
    slug: 'demo-cafe'
  },
  {
    id: 'parrilla',
    title: 'Fuego Criollo Parrilla',
    category: 'Parrilla, Carnes & Asados',
    tag: 'Cortes & Brasa',
    icon: Flame,
    color: '#ea580c',
    description: 'Baby beef, punta de anca, términos de cocción, costillas BBQ ahumadas en leña de manzano y picadas campesinas.',
    highlights: ['10 Cortes y asados al carbón', 'Términos de carne y guarniciones', '8 Mesas para salón y terraza'],
    email: 'parrilla@demo.com',
    slug: 'demo-parrilla'
  },
  {
    id: 'gastrobar',
    title: 'La Taberna Gastrobar',
    category: 'Cervecería Artesanal & Gastrobar',
    tag: 'Cervezas & Tapas',
    icon: Beer,
    color: '#8b5cf6',
    description: 'Cervezas de barril en pintas o jarras, alitas doradas con salsas de autor, nachos supremos, coctelería y picoteo.',
    highlights: ['13 Opciones de bebidas y tapas', 'Alitas con salsas y nachos loaded', 'KDS de cocina en tiempo real'],
    email: 'gastrobar@demo.com',
    slug: 'demo-gastrobar'
  },
  {
    id: 'rapidas',
    title: 'Burger & Street Food',
    category: 'Comidas Rápidas & Burgers',
    tag: 'Burgers & Salchipapas',
    icon: UtensilsCrossed,
    color: '#2563eb',
    description: 'Smash burgers en pan brioche, salchipapas familiares, perros calientes americanos, desgranados y malteadas.',
    highlights: ['11 Platillos urbanos apetitosos', 'Combos y adiciones de tocineta', 'POS táctil ágil para mostrador'],
    email: 'rapidas@demo.com',
    slug: 'demo-rapidas'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Bloqueo de scroll cuando el drawer móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Cerrar drawer móvil con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            <Sparkles size={12} /> Lanzamiento v1.9.0
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

      {/* 2. NAVBAR NAVEGACIÓN (ESTILO FLOATING PILL) */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const wrapper = document.querySelector(`.${styles.landingWrapper}`) || window;
              if (wrapper.scrollTo) {
                wrapper.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
              setMobileMenuOpen(false);
            }}
            className={styles.brandLink}
            title="Volver al inicio de NeoFood"
          >
            <img src="/isotipo.svg" alt="NeoFood" className={styles.navIsotipoImg} />
            <img src="/logo_blanco.svg" alt="NeoFood POS & CRM" className={styles.navLogoImg} />
            <span className={styles.brandBadge}>POS & CRM</span>
          </a>

          <nav className={styles.navLinks}>
            <a href="#modulos" onClick={(e) => scrollToSection(e, 'modulos')} className={styles.navLink}>Módulos</a>
            <a href="#whatsapp" onClick={(e) => scrollToSection(e, 'whatsapp')} className={styles.navLink}>Tienda WhatsApp</a>
            <a href="#demos" onClick={(e) => scrollToSection(e, 'demos')} className={styles.navLink}>Demos en Vivo</a>
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
              title={`Iniciar prueba gratuita de ${TRIAL_DAYS} días`}
            >
              <Sparkles size={14} />
              <span className={styles.trialNavTextLong}>Prueba {TRIAL_DAYS} Días Gratis</span>
              <span className={styles.trialNavTextShort}>Prueba Gratis</span>
            </button>
          </div>

          {/* Botón Burger Móvil inspirado en OlaClick */}
          <button
            type="button"
            className={styles.burgerBtn}
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Menú Drawer Móvil con Fondo Oscurecido */}
      {mobileMenuOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`${styles.mobileDrawer} ${mobileMenuOpen ? styles.mobileDrawerOpen : ''}`}>
        <div className={styles.mobileDrawerHeader}>
          <div className={styles.brandLink}>
            <img src="/isotipo.svg" alt="NeoFood" className={styles.navIsotipoImg} />
            <img src="/logo_blanco.svg" alt="NeoFood" className={styles.navLogoImg} />
          </div>
          <button
            type="button"
            className={styles.mobileCloseBtn}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.mobileNavLinks}>
          <a
            href="#modulos"
            onClick={(e) => {
              scrollToSection(e, 'modulos');
              setMobileMenuOpen(false);
            }}
            className={styles.mobileNavLink}
          >
            <Layers size={18} className={styles.mobileNavIcon} />
            <span>Módulos del Sistema</span>
          </a>
          <a
            href="#whatsapp"
            onClick={(e) => {
              scrollToSection(e, 'whatsapp');
              setMobileMenuOpen(false);
            }}
            className={styles.mobileNavLink}
          >
            <MessageCircle size={18} className={styles.mobileNavIcon} />
            <span>Tienda WhatsApp</span>
          </a>
          <a
            href="#demos"
            onClick={(e) => {
              scrollToSection(e, 'demos');
              setMobileMenuOpen(false);
            }}
            className={styles.mobileNavLink}
          >
            <UtensilsCrossed size={18} className={styles.mobileNavIcon} />
            <span>Demos en Vivo</span>
          </a>
          <a
            href="#precios"
            onClick={(e) => {
              scrollToSection(e, 'precios');
              setMobileMenuOpen(false);
            }}
            className={styles.mobileNavLink}
          >
            <CreditCard size={18} className={styles.mobileNavIcon} />
            <span>Planes & Precios</span>
          </a>
          <a
            href="#faq"
            onClick={(e) => {
              scrollToSection(e, 'faq');
              setMobileMenuOpen(false);
            }}
            className={styles.mobileNavLink}
          >
            <HelpCircle size={18} className={styles.mobileNavIcon} />
            <span>Preguntas Frecuentes</span>
          </a>
        </nav>

        <div className={styles.mobileDrawerDivider}></div>

        <div className={styles.mobileDrawerActions}>
          <Link
            to="/login"
            className={styles.mobileLoginBtn}
            onClick={() => setMobileMenuOpen(false)}
          >
            <LogIn size={18} />
            <span>Iniciar Sesión</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleStartTrial('pro');
            }}
            className={styles.mobileTrialBtn}
          >
            <Sparkles size={18} />
            <span>Prueba {TRIAL_DAYS} Días Gratis</span>
          </button>

          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hola%20NeoFood,%20quisiera%20asesoría%20sobre%20el%20sistema.`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileSupportLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            <MessageCircle size={16} style={{ color: '#25D366' }} />
            <span>¿Dudas? Habla con un Asesor</span>
          </a>
        </div>
      </div>

      {/* 3. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackgroundGlow}></div>
        <div className={styles.heroContainer}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} className={styles.heroBadgeIcon} />
            <span>Software Gastronómico para Colombia • {TRIAL_DAYS} Días Gratis</span>
          </div>

          <h1 className={styles.heroTitle}>
            El Sistema Operativo Definitivo para{' '}
            <span className={styles.heroGradientText}>Tu Restaurante en Colombia</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Unifica tu <strong>Punto de Venta (POS)</strong>, <strong>Pantalla de Cocina (KDS)</strong>,
            <strong> Tienda Virtual con pedidos por WhatsApp</strong>, <strong>Control de Caja</strong>,
            <strong> Sub-Recetas e Inventario CMP</strong> en una sola plataforma en la nube diseñada para restaurantes en Colombia.
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

                  {/* Visual Preview Graphic Screen (Pantallazo real por cada módulo) */}
                  <div className={styles.mockupGraphicCard}>
                    {activeTab === 'pos' && (
                      <div>
                        <div className={styles.screenHeaderRow}>
                          <div className={styles.screenTitleGroup}>
                            <ShoppingCart size={18} style={{ color: '#4f46e5' }} />
                            <span className={styles.screenTitleText}>Punto de Venta POS & Salón</span>
                          </div>
                          <span className={styles.screenStatusPill} style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <span className={styles.livePulse}></span> En Servicio
                          </span>
                        </div>

                        <div className={styles.posTablesGrid}>
                          <div className={styles.posTableCard}>
                            <div className={styles.posTableHeader}>
                              <span className={styles.posTableName}>Mesa 1</span>
                              <span className={styles.posTableStatus} style={{ backgroundColor: '#ef444420', color: '#f87171' }}>Ocupada</span>
                            </div>
                            <div className={styles.posTableDetails}>
                              <span>4 Personas</span>
                              <span className={styles.posTableTotal}>$78.000</span>
                            </div>
                          </div>

                          <div className={styles.posTableCard}>
                            <div className={styles.posTableHeader}>
                              <span className={styles.posTableName}>Mesa 2</span>
                              <span className={styles.posTableStatus} style={{ backgroundColor: '#10b98120', color: '#34d399' }}>Libre</span>
                            </div>
                            <div className={styles.posTableDetails}>
                              <span>Disponible</span>
                              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>$0</span>
                            </div>
                          </div>

                          <div className={styles.posTableCard}>
                            <div className={styles.posTableHeader}>
                              <span className={styles.posTableName}>Mesa 3</span>
                              <span className={styles.posTableStatus} style={{ backgroundColor: '#3b82f620', color: '#60a5fa' }}>Cuenta</span>
                            </div>
                            <div className={styles.posTableDetails}>
                              <span>Pedir Factura</span>
                              <span className={styles.posTableTotal}>$112.500</span>
                            </div>
                          </div>

                          <div className={styles.posTableCard}>
                            <div className={styles.posTableHeader}>
                              <span className={styles.posTableName}>Mesa 4</span>
                              <span className={styles.posTableStatus} style={{ backgroundColor: '#f59e0b20', color: '#fbbf24' }}>En Cocina</span>
                            </div>
                            <div className={styles.posTableDetails}>
                              <span>2 Personas</span>
                              <span className={styles.posTableTotal}>$45.000</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.posBottomOrderBar}>
                          <span className={styles.posOrderText}>
                            <strong>Mesa 3:</strong> 1x Pizza Familiar, 2x Bebidas, 1x Postre
                          </span>
                          <button
                            className={styles.posOrderBtn}
                          >
                            Facturar $112.500 →
                          </button>
                        </div>
                      </div>
                    )}

                    {(activeTab === 'cocina' || activeTab === 'kds') && (
                      <div>
                        <div className={styles.screenHeaderRow}>
                          <div className={styles.screenTitleGroup}>
                            <ChefHat size={18} style={{ color: '#ef4444' }} />
                            <span className={styles.screenTitleText}>Pantalla de Cocina (KDS en Vivo)</span>
                          </div>
                          <span className={styles.screenStatusPill} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            2 Comandas Activas
                          </span>
                        </div>

                        <div className={styles.kdsTicketsStack}>
                          <div className={styles.kdsTicketCard}>
                            <div className={styles.kdsTicketTop}>
                              <span className={styles.kdsOrderNum}>Comanda #108 • Mesa 1</span>
                              <span className={styles.kdsTimerBadge} style={{ backgroundColor: '#ef444420', color: '#f87171' }}>
                                <Clock size={12} /> Hace 6 min
                              </span>
                            </div>
                            <div className={styles.kdsItemList}>
                              <span>&bull; 1x Pizza Suprema Familiar (Sin cebolla)</span>
                              <span>&bull; 2x Lasaña Bolognese Artesanal</span>
                            </div>
                            <button
                              className={styles.kdsActionBtn}
                              style={{ backgroundColor: '#059669', color: '#ffffff' }}
                            >
                              ✓ Listo para Despachar
                            </button>
                          </div>

                          <div className={styles.kdsTicketCard}>
                            <div className={styles.kdsTicketTop}>
                              <span className={styles.kdsOrderNum}>Comanda #109 • Domicilio WhatsApp #24</span>
                              <span className={styles.kdsTimerBadge} style={{ backgroundColor: '#f59e0b20', color: '#fbbf24' }}>
                                <Clock size={12} /> Hace 2 min
                              </span>
                            </div>
                            <div className={styles.kdsItemList}>
                              <span>&bull; 2x Hamburguesas Monster con Papas Rústicas</span>
                            </div>
                            <button
                              className={styles.kdsActionBtn}
                              style={{ backgroundColor: '#d97706', color: '#ffffff' }}
                            >
                              En Preparación...
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'tienda' && (
                      <div>
                        <div className={styles.screenHeaderRow}>
                          <div className={styles.screenTitleGroup}>
                            <ShoppingBag size={18} style={{ color: '#06b6d4' }} />
                            <span className={styles.screenTitleText}>Tienda Virtual & Catálogo WhatsApp</span>
                          </div>
                          <span className={styles.screenStatusPill} style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                            0% Comisión
                          </span>
                        </div>

                        <div className={styles.storePreviewBox}>
                          <div className={styles.storeBannerMini}>
                            <div>
                              <strong style={{ fontSize: '0.825rem', color: '#ffffff', display: 'block' }}>Bella Napoli Pizzería</strong>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Abierto hoy hasta las 11:00 PM &bull; 4.9 ★</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', background: '#059669', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '0.35rem', fontWeight: 700 }}>WhatsApp Directo</span>
                          </div>

                          <div className={styles.storeItemsMiniList}>
                            <div className={styles.storeItemMiniRow}>
                              <div>
                                <span className={styles.storeItemName}>Pizza Margherita al Horno</span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Masa madre, pomodoro y mozzarella</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={styles.storeItemPrice}>$36.000</span>
                                <button className={styles.storeAddBtn}>+ Agregar</button>
                              </div>
                            </div>

                            <div className={styles.storeItemMiniRow}>
                              <div>
                                <span className={styles.storeItemName}>Pasta Carbonara Tradizionale</span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Guanciale, pecorino y pimienta</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={styles.storeItemPrice}>$28.000</span>
                                <button className={styles.storeAddBtn}>+ Agregar</button>
                              </div>
                            </div>
                          </div>

                          <div className={styles.storeWhatsappFloatBar}>
                            <span>2 Platillos en Carrito &bull; $64.000</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <MessageCircle size={14} /> Enviar Pedido →
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'caja' && (
                      <div>
                        <div className={styles.screenHeaderRow}>
                          <div className={styles.screenTitleGroup}>
                            <Wallet size={18} style={{ color: '#10b981' }} />
                            <span className={styles.screenTitleText}>Control de Caja & Turno #142</span>
                          </div>
                          <span className={styles.screenStatusPill} style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            Caja Abierta
                          </span>
                        </div>

                        <div className={styles.cashKpiGrid}>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Base Inicial</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>$200.000</span>
                          </div>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Ventas Efectivo</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>$890.000</span>
                          </div>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Datafono / Transf.</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>$1.450.000</span>
                          </div>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Total del Turno</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#a78bfa' }}>$2.340.000</span>
                          </div>
                        </div>

                        <div className={styles.cashMovementsList}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#34d399' }}>+ Cobro Factura #107 (Efectivo)</span>
                            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>+$54.000</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#f87171' }}>- Gasto Menor: Hielo & Limones</span>
                            <span style={{ fontWeight: 700, color: '#f87171' }}>-$14.000</span>
                          </div>
                        </div>

                        <button
                          className={styles.cashCloseBtn}
                        >
                          <ShieldCheck size={14} /> Realizar Cierre Ciego de Turno
                        </button>
                      </div>
                    )}

                    {activeTab === 'produccion' && (
                      <div>
                        <div className={styles.screenHeaderRow}>
                          <div className={styles.screenTitleGroup}>
                            <Factory size={18} style={{ color: '#f59e0b' }} />
                            <span className={styles.screenTitleText}>Inventario & Sub-Recetas (CMP)</span>
                          </div>
                          <span className={styles.screenStatusPill} style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            Costos Reales
                          </span>
                        </div>

                        <div className={styles.productionItemsList}>
                          <div className={styles.productionItemRow}>
                            <div>
                              <strong style={{ color: '#ffffff', display: 'block' }}>Masa de Pizza Italiana</strong>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Stock: 24 Unidades &bull; CMP: $2.800/ud</span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#10b981', background: '#10b98120', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontWeight: 700 }}>Óptimo</span>
                          </div>

                          <div className={styles.productionItemRow}>
                            <div>
                              <strong style={{ color: '#ffffff', display: 'block' }}>Queso Mozzarella Búfala</strong>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Stock: 3.8 Kg &bull; CMP: $24.000/kg</span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#f59e0b', background: '#f59e0b20', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontWeight: 700 }}>Stock Bajo</span>
                          </div>

                          <div className={styles.productionItemRow}>
                            <div>
                              <strong style={{ color: '#ffffff', display: 'block' }}>Salsa Pomodoro Lote #12</strong>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Stock: 12 Litros &bull; CMP: $7.900/L</span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#10b981', background: '#10b98120', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontWeight: 700 }}>Elaborado</span>
                          </div>
                        </div>

                        <div className={styles.productionBatchBanner}>
                          <Zap size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                          <span>Lotes de sub-recetas descuentan insumos base automáticamente.</span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'reportes' && (
                      <div>
                        <div className={styles.screenHeaderRow}>
                          <div className={styles.screenTitleGroup}>
                            <FileText size={18} style={{ color: '#8b5cf6' }} />
                            <span className={styles.screenTitleText}>Facturación & Reportes Ejecutivos</span>
                          </div>
                          <span className={styles.screenStatusPill} style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                            PDF Certificado
                          </span>
                        </div>

                        <div className={styles.reportsKpiRow}>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Ventas Brutas</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>$48.650.000</span>
                          </div>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Costo (COGS)</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f87171' }}>$15.200.000</span>
                          </div>
                          <div className={styles.cashKpiBox}>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Margen Real</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>68.8%</span>
                          </div>
                        </div>

                        <div className={styles.reportsMiniChartCard}>
                          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>Ventas Semanales del Mes</span>
                          <div className={styles.reportsBarsWrapper}>
                            <div className={styles.reportsBarItem}>
                              <div className={styles.reportsBarFill} style={{ height: '35px' }}></div>
                              <span className={styles.reportsBarLabel}>S1</span>
                            </div>
                            <div className={styles.reportsBarItem}>
                              <div className={styles.reportsBarFill} style={{ height: '44px' }}></div>
                              <span className={styles.reportsBarLabel}>S2</span>
                            </div>
                            <div className={styles.reportsBarItem}>
                              <div className={styles.reportsBarFill} style={{ height: '52px' }}></div>
                              <span className={styles.reportsBarLabel}>S3</span>
                            </div>
                            <div className={styles.reportsBarItem}>
                              <div className={styles.reportsBarFill} style={{ height: '58px', background: 'linear-gradient(180deg, #34d399 0%, #059669 100%)' }}></div>
                              <span className={styles.reportsBarLabel}>S4</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartTrial('pro')}
                          className={styles.reportsDownloadBtn}
                        >
                          <FileText size={14} /> Descargar Reporte PDF de Alta Fidelidad
                        </button>
                      </div>
                    )}
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
                  <div className={styles.phoneLogoBadge}>
                    <Utensils size={18} style={{ color: '#4f46e5' }} />
                  </div>
                  <div>
                    <h5 className={styles.phoneStoreName}>Burger & Grill Co.</h5>
                    <span className={styles.phoneStatusBadge}>● Abierto Ahora</span>
                  </div>
                </div>

                <div className={styles.phoneBanner}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Flame size={14} style={{ color: '#ef4444' }} />
                    <span>20% OFF en Combos Especiales</span>
                  </div>
                </div>

                <div className={styles.phoneMenuGrid}>
                  <div className={styles.phoneDishCard}>
                    <div className={styles.dishEmoji}>
                      <Sandwich size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className={styles.dishInfo}>
                      <h6>Smash Doble Queso</h6>
                      <span>Pan brioche, carne madurada</span>
                      <strong>$28.900</strong>
                    </div>
                  </div>
                  <div className={styles.phoneDishCard}>
                    <div className={styles.dishEmoji}>
                      <Package size={20} style={{ color: '#eab308' }} />
                    </div>
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
                    <span style={{ fontWeight: 700, color: '#15803d' }}>Nuevo Pedido #1042</span><br />
                    • 1x Smash Doble Queso ($28.900)<br />
                    • 1x Papas Rústicas ($14.500)<br />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <MapPin size={11} /> Domicilio: Cra 15 # 85-20
                    </span><br />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                      <CreditCard size={11} /> Total: $43.400 (Pago: Efectivo)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6.5. DEMOS EN VIVO INTERACTIVAS POR CONCEPTO */}
      <section id="demos" className={styles.demosSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPill}>
            <Sparkles size={13} /> Acceso Inmediato Sin Registro
          </span>
          <h2 className={styles.sectionTitle}>
            Prueba NeoFood en Vivo para tu Tipo de Negocio
          </h2>
          <p className={styles.sectionDesc}>
            Explora una demostración real ya configurada con platillos, modificadores, mesas activas y tienda virtual. Elige tu concepto gastronómico y compruébalo tú mismo.
          </p>
        </div>

        <div className={styles.demosGrid}>
          {DEMOS_DATA.map((demo) => {
            const Icon = demo.icon;
            return (
              <div key={demo.id} className={styles.demoCard}>
                <div className={styles.demoCardGlow} style={{ backgroundColor: demo.color }}></div>

                <div>
                  <div className={styles.demoCardHeader}>
                    <div
                      className={styles.demoIconWrapper}
                      style={{ backgroundColor: `${demo.color}15`, color: demo.color }}
                    >
                      <Icon size={26} />
                    </div>
                    <span className={styles.demoTagBadge}>{demo.tag}</span>
                  </div>

                  <h3 className={styles.demoTitle}>{demo.title}</h3>
                  <span className={styles.demoCategory}>{demo.category}</span>
                  <p className={styles.demoDesc}>{demo.description}</p>

                  <ul className={styles.demoHighlightsList}>
                    {demo.highlights.map((h, i) => (
                      <li key={i} className={styles.demoHighlightItem}>
                        <CheckCircle2 size={14} className={styles.demoHighlightIcon} />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.demoActions}>
                  <Link
                    to={`/login?email=${demo.email}&demo=1`}
                    className={styles.demoBtnPrimary}
                    title="Entrar al panel de control y punto de venta POS"
                  >
                    <LogIn size={14} />
                    <span>Probar POS</span>
                  </Link>

                  <a
                    href={`/tienda/${demo.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.demoBtnSecondary}
                    title="Ver la tienda digital interactiva en vivo"
                  >
                    <ExternalLink size={14} />
                    <span>Ver Tienda</span>
                  </a>
                </div>
              </div>
            );
          })}
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
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`${styles.cycleBtn} ${billingCycle === 'monthly' ? styles.cycleBtnActive : ''}`}
              >
                <span>Mensual</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('semiannual')}
                className={`${styles.cycleBtn} ${billingCycle === 'semiannual' ? styles.cycleBtnActive : ''}`}
              >
                <span className={styles.semiannualFull}>Semestral (6 meses)</span>
                <span className={styles.semiannualShort}>Semestral</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`${styles.cycleBtn} ${styles.cycleBtnAnnual} ${billingCycle === 'annual' ? styles.cycleBtnActive : ''}`}
              >
                <span className={styles.annualLabel}>Anual</span>
                <span className={styles.savingsBadge}>
                  <span className={styles.savingsBadgeFull}>Ahorra 17% (2 meses gratis)</span>
                  <span className={styles.savingsBadgeMobile}>-17% Ahorro</span>
                </span>
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

                {/* Botón Principal: Comenzar 7 Días de Prueba con este Plan */}
                <button
                  onClick={() => handleStartTrial(plan.code)}
                  className={`${styles.planPrimaryBtn} ${isPro ? styles.planPrimaryBtnPro : ''}`}
                >
                  <Sparkles size={16} />
                  <span>Comenzar {TRIAL_DAYS} Días de Prueba</span>
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
                <img src="/isotipo.svg" alt="NeoFood" className={styles.footerIsotipoImg} />
                <img src="/logo_blanco.svg" alt="NeoFood POS & CRM" className={styles.footerLogoImg} />
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
                    style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <MessageCircle size={15} />
                    <span>WhatsApp de Asistencia</span>
                  </a>
                </li>
                <li><span>Horario: Lun - Sáb (8:00 AM - 8:00 PM)</span></li>
                <li><span>Disponible en Colombia 🇨🇴</span></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.copyright}>
              &copy; {new Date().getFullYear()} NeoFood CRM & POS. Todos los derechos reservados. Diseñado para potenciar el sector gastronómico en Colombia.
            </p>
            <div className={styles.footerLegal}>
              <span>Versión 1.9.0</span>
              <span>•</span>
              <Link to="/terminos">Términos del Servicio</Link>
              <span>•</span>
              <Link to="/privacidad">Privacidad & Habeas Data</Link>
              <span>•</span>
              <Link to="/cookies">Cookies</Link>
              <span>•</span>
              <Link to="/sla">Garantía SLA</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
