import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  Server,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageCircle,
  Printer,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import styles from './LegalPages.module.css';

const SUPPORT_WHATSAPP = '573009123456';

const LegalPages = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar tab activo a partir de query params o ruta
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['terminos', 'privacidad', 'cookies', 'sla'].includes(tabParam.toLowerCase())) {
      return tabParam.toLowerCase();
    }
    if (location.pathname.includes('terminos')) return 'terminos';
    if (location.pathname.includes('privacidad')) return 'privacidad';
    if (location.pathname.includes('cookies')) return 'cookies';
    if (location.pathname.includes('sla')) return 'sla';
    return 'terminos';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const scrollContainerRef = React.useRef(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const currentTab = getInitialTab();
    setActiveTab(currentTab);
    scrollToTop();
  }, [location]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/legal?tab=${tabKey}`, { replace: true });
    scrollToTop();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div ref={scrollContainerRef} className={styles.legalPage}>
      {/* Header Superior */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.brandRow}>
            <Link to="/" className={styles.brandLink}>
              <span className={styles.brandNeo}>Neo</span>
              <span className={styles.brandFood}>FOOD</span>
              <span className={styles.brandBadge}>Centro Legal</span>
            </Link>

            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={handlePrint}
                className={styles.printBtn}
                title="Imprimir documento"
              >
                <Printer size={16} />
                <span>Imprimir</span>
              </button>
              <Link to="/" className={styles.backBtn}>
                <ArrowLeft size={16} />
                <span>Volver al Inicio</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero del Centro Legal */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroPill}>
            <ShieldCheck size={14} /> Marco Jurídico y Protección Integral
          </div>
          <h1 className={styles.heroTitle}>Términos, Privacidad y Políticas Legales</h1>
          <p className={styles.heroDesc}>
            Transparencia total sobre el uso de nuestro software SaaS, la custodia de tus datos gastronómicos, la prueba gratuita de 7 días y la protección de tu información.
          </p>
          <span className={styles.heroUpdatedDate}>
            Última actualización: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Versión 1.8.0
          </span>
        </div>
      </section>

      {/* Contenido Principal con Pestañas */}
      <main className={styles.mainContainer}>
        {/* Navegación por pestañas */}
        <nav className={styles.tabsNav} aria-label="Secciones Legales">
          <button
            type="button"
            onClick={() => handleTabChange('terminos')}
            className={`${styles.tabBtn} ${activeTab === 'terminos' ? styles.tabBtnActive : ''}`}
          >
            <FileText size={18} />
            <span>Términos y Condiciones</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('privacidad')}
            className={`${styles.tabBtn} ${activeTab === 'privacidad' ? styles.tabBtnActive : ''}`}
          >
            <Lock size={18} />
            <span>Política de Privacidad</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('cookies')}
            className={`${styles.tabBtn} ${activeTab === 'cookies' ? styles.tabBtnActive : ''}`}
          >
            <Cookie size={18} />
            <span>Política de Cookies</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('sla')}
            className={`${styles.tabBtn} ${activeTab === 'sla' ? styles.tabBtnActive : ''}`}
          >
            <Server size={18} />
            <span>Garantía y SLA</span>
          </button>
        </nav>

        {/* ========================================================= */}
        {/* TAB 1: TÉRMINOS Y CONDICIONES DEL SERVICIO */}
        {/* ========================================================= */}
        {activeTab === 'terminos' && (
          <article className={styles.docArticle}>
            <div className={styles.docHeader}>
              <div className={styles.docBadge}>Contrato de Licencia SaaS</div>
              <h2 className={styles.docTitle}>Términos y Condiciones de Uso del Software NeoFood</h2>
              <p className={styles.docSubtitle}>
                Por favor, lee detenidamente este contrato antes de registrar o utilizar la plataforma NeoFood CRM & POS.
              </p>
            </div>

            <div className={styles.highlightBox}>
              <AlertCircle size={20} className={styles.highlightIcon} />
              <div>
                <strong>Resumen Clave:</strong>
                <p>
                  NeoFood es una plataforma en la nube (SaaS) para restaurantes. Tú eres el único dueño de tu información, clientes y ventas. Te otorgamos <strong>7 días de prueba gratuita</strong> en cualquier plan. Al terminar la prueba, tus datos no se borran; simplemente se suspende el acceso hasta que actives tu suscripción. En tu tienda virtual por WhatsApp, no cobramos comisiones por plato.
                </p>
              </div>
            </div>

            <section className={styles.sectionBlock}>
              <h3>1. Aceptación de los Términos</h3>
              <p>
                Al crear una cuenta en <strong>NeoFood</strong>, iniciar una prueba gratuita o acceder a cualquiera de sus módulos (Punto de Venta POS, Cocina KDS, Control de Caja, Tienda Virtual, Producción o Inventario), la persona natural o jurídica que contrata (en adelante, el <strong>"Cliente"</strong> o el <strong>"Restaurante"</strong>) acepta expresamente y sin reservas someterse a estos Términos y Condiciones. Si no estás de acuerdo con alguna cláusula, debes abstenerte de utilizar la plataforma.
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>2. Descripción del Servicio y Modelo SaaS</h3>
              <p>
                NeoFood opera como un software como servicio (<strong>Software as a Service - SaaS</strong>) alojado en la nube. NeoFood concede al Cliente una licencia de uso limitada, no exclusiva, intransferible y revocable para operar sus establecimientos gastronómicos de acuerdo con los límites establecidos en su plan de suscripción contratado (mesas, usuarios administradores, sedes y módulos activos).
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>3. Período de Prueba Gratuita (7 Días) y Política de Vencimiento</h3>
              <div className={styles.bulletList}>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Acceso Completo de Prueba:</strong> Todo nuevo restaurante registrado recibe automáticamente un período de <strong>siete (7) días de prueba gratuita</strong>, con acceso a las características del plan seleccionado (Básico, Pro o Cadenas).
                  </div>
                </div>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Sin Cargos Ocultos ni Tarjeta Forzada:</strong> No se realizan cobros sorpresa durante el registro.
                  </div>
                </div>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Comportamiento al Finalizar la Prueba:</strong> Una vez concluidos los 7 días continuos, si el Cliente no ha formalizado el pago de su suscripción, el sistema restringirá temporalmente el acceso a los módulos operativos.
                  </div>
                </div>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Custodia y Conservación de Datos:</strong> NeoFood <strong>no eliminará</strong> tus recetas, inventarios, mesas ni configuraciones creadas durante los 7 días. Toda tu información permanecerá resguardada de forma segura para que puedas retomar la operación tan pronto como actives tu plan.
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <h3>4. Tienda Virtual por WhatsApp (0% Comisiones por Pedido)</h3>
              <p>
                NeoFood pone a disposición del Cliente un catálogo digital en línea (StoreFront) para que sus comensales puedan estructurar pedidos y enviarlos directamente al WhatsApp oficial del restaurante.
              </p>
              <div className={styles.warningBox}>
                <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <p>
                  <strong>Claridad Comercial:</strong> NeoFood <strong>no es pasarela de pagos ni cobra porcentaje o comisión</strong> por los platos vendidos a través del catálogo. La transacción monetaria, el despacho y la entrega del alimento son responsabilidad exclusiva y directa entre el Restaurante y su Cliente final.
                </p>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <h3>5. Propiedad Intelectual y Propiedad de los Datos</h3>
              <p>
                <strong>Propiedad de NeoFood:</strong> Todo el código fuente, arquitectura, diseño gráfico, logotipos, marcas comerciales y desarrollos asociados a NeoFood son propiedad exclusiva de sus desarrolladores y están protegidos por las leyes de propiedad intelectual internacionales y colombianas (Decisión 351 de la CAN y Ley 23 de 1982).
              </p>
              <p>
                <strong>Propiedad del Restaurante:</strong> El Cliente es el único titular de todos los datos ingresados en el sistema (listas de precios, recetas, datos de proveedores, registros de ventas y bases de clientes). NeoFood no comercializa ni transferirá dicha información a competidores ni a terceros no autorizados.
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>6. Responsabilidades y Obligaciones del Restaurante</h3>
              <ul>
                <li>Custodiar con estricta confidencialidad las credenciales y contraseñas de sus usuarios.</li>
                <li>Garantizar que el uso del software cumpla con las leyes sanitarias, laborales y comerciales locales.</li>
                <li>Cumplir con las obligaciones tributarias y de facturación fiscal exigidas en su país (ej. DIAN en Colombia). NeoFood provee herramientas de impresión de comandas y recibos de control interno, siendo potestad del restaurante la emisión formal de sus facturas electrónicas.</li>
                <li>No realizar ingeniería inversa, descompilación ni pruebas de penetración no autorizadas contra los servidores de NeoFood.</li>
              </ul>
            </section>

            <section className={styles.sectionBlock}>
              <h3>7. Limitación de Responsabilidad</h3>
              <p>
                NeoFood emplea estándares de alta disponibilidad en la nube; no obstante, el software se suministra "tal como está". NeoFood no se hace responsable por lucro cesante, pérdidas indirectas ocasionadas por fallas en el servicio de Internet del establecimiento, cortes de energía eléctrica local, fallos en la red de WhatsApp o mal uso deliberado de las credenciales de caja por parte del personal del Cliente.
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>8. Ley Aplicable y Jurisdicción</h3>
              <p>
                Estos términos se rigen e interpretan bajo las leyes de la <strong>República de Colombia</strong>. Cualquier controversia que no pueda resolverse de común acuerdo entre las partes será sometida a los mecanismos alternativos de resolución de conflictos o a los tribunales competentes de la jurisdicción colombiana.
              </p>
            </section>
          </article>
        )}

        {/* ========================================================= */}
        {/* TAB 2: POLÍTICA DE PRIVACIDAD Y HABEAS DATA */}
        {/* ========================================================= */}
        {activeTab === 'privacidad' && (
          <article className={styles.docArticle}>
            <div className={styles.docHeader}>
              <div className={styles.docBadge}>Protección de Datos Personales</div>
              <h2 className={styles.docTitle}>Política de Privacidad y Tratamiento de Datos</h2>
              <p className={styles.docSubtitle}>
                En cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (Colombia) y estándares internacionales de protección de datos.
              </p>
            </div>

            <div className={styles.highlightBox}>
              <ShieldCheck size={20} className={styles.highlightIcon} />
              <div>
                <strong>Aislamiento de Información Multi-Tenant:</strong>
                <p>
                  Cada restaurante opera en un entorno de datos estrictamente aislado mediante su propio identificador único (Tenant ID). La información de tu cocina, precios y clientes nunca es compartida con otros negocios de la plataforma.
                </p>
              </div>
            </div>

            <section className={styles.sectionBlock}>
              <h3>1. Responsable y Encargado del Tratamiento</h3>
              <p>
                <strong>NeoFood</strong> actúa como:
              </p>
              <ul>
                <li><strong>Responsable del Tratamiento:</strong> Respecto a los datos de registro, contacto y facturación proporcionados por los administradores y dueños de los restaurantes.</li>
                <li><strong>Encargado del Tratamiento:</strong> Respecto a los datos de comensales, clientes y proveedores que el Restaurante almacena o gestiona dentro de sus módulos de Punto de Venta y Tienda Virtual. En este escenario, el Restaurante es el Responsable directo ante sus clientes.</li>
              </ul>
            </section>

            <section className={styles.sectionBlock}>
              <h3>2. Datos Personales que Recolectamos</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.legalTable}>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Datos Recolectados</th>
                      <th>Finalidad Principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Datos del Negocio</strong></td>
                      <td>Nombre comercial, NIT/RUT, teléfono, dirección, logo.</td>
                      <td>Configuración del restaurante, encabezados de comanda y recibos.</td>
                    </tr>
                    <tr>
                      <td><strong>Datos del Administrador</strong></td>
                      <td>Nombre completo, correo electrónico, celular, contraseña cifrada.</td>
                      <td>Creación de la cuenta, autenticación segura y emisión de códigos OTP.</td>
                    </tr>
                    <tr>
                      <td><strong>Datos de Clientes del Local</strong></td>
                      <td>Nombre, teléfono, dirección de entrega (opcional para delivery).</td>
                      <td>Asignación de mesas, facturación y recepción de pedidos por WhatsApp.</td>
                    </tr>
                    <tr>
                      <td><strong>Registros Técnicos y Logs</strong></td>
                      <td>Dirección IP, tipo de navegador, fecha y hora de inicio de sesión.</td>
                      <td>Seguridad, prevención de ataques de fuerza bruta y auditoría interna.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <h3>3. Mecanismos de Seguridad y Cifrado</h3>
              <div className={styles.bulletList}>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Cifrado de Contraseñas:</strong> Todas las contraseñas se almacenan mediante el algoritmo <code>bcrypt</code> con factores de salt aleatorio. Nunca son visibles en texto plano, ni siquiera para nuestro equipo técnico.
                  </div>
                </div>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Tokens de Autenticación JWT:</strong> Las sesiones se gestionan mediante tokens JSON Web Token (JWT) con tiempo de expiración y rotación de Refresh Tokens.
                  </div>
                </div>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Pre-Verificación de Correo (Anti-Spam):</strong> Validamos tu correo con códigos OTP de 6 dígitos enviados por servidores seguros (Resend) con expiración de 10 minutos.
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <h3>4. Derechos de los Titulares (Habeas Data)</h3>
              <p>
                De acuerdo con la legislación vigente, como titular de los datos personales tienes derecho a:
              </p>
              <ul>
                <li><strong>Conocer, actualizar y rectificar</strong> tus datos personales frente a NeoFood.</li>
                <li><strong>Solicitar prueba</strong> de la autorización otorgada para el tratamiento.</li>
                <li><strong>Revocar la autorización</strong> o solicitar la supresión de los datos cuando no exista un deber legal o contractual de conservarlos.</li>
                <li><strong>Acceder en forma gratuita</strong> a tus datos personales recolectados.</li>
              </ul>
            </section>

            <section className={styles.sectionBlock}>
              <h3>5. Canales de Atención para Peticiones, Quejas y Reclamos (PQR)</h3>
              <p>
                Para ejercer cualquiera de tus derechos de Habeas Data o solicitar la rectificación de tu información, puedes contactar a nuestro oficial de privacidad a través de:
              </p>
              <div className={styles.contactCard}>
                <div>
                  <strong>Canal Oficial de Privacidad NeoFood</strong>
                  <p>Correo de soporte: <a href="mailto:privacidad@neofood.com">privacidad@neofood.com</a></p>
                  <p>Atención directa WhatsApp: +57 300 912 3456</p>
                </div>
              </div>
            </section>
          </article>
        )}

        {/* ========================================================= */}
        {/* TAB 3: POLÍTICA DE COOKIES */}
        {/* ========================================================= */}
        {activeTab === 'cookies' && (
          <article className={styles.docArticle}>
            <div className={styles.docHeader}>
              <div className={styles.docBadge}>Uso de Tecnologías Web</div>
              <h2 className={styles.docTitle}>Política de Cookies y Almacenamiento Local</h2>
              <p className={styles.docSubtitle}>
                Cómo y por qué utilizamos cookies y almacenamiento en el navegador para hacer funcionar el sistema.
              </p>
            </div>

            <div className={styles.highlightBox}>
              <Cookie size={20} className={styles.highlightIcon} />
              <div>
                <strong>Cero Cookies Publicitarias Invasivas:</strong>
                <p>
                  En NeoFood <strong>no vendemos tus datos a intermediarios publicitarios</strong> ni utilizamos cookies para rastrearte en sitios web de terceros. Únicamente empleamos almacenamiento estrictamente necesario para la operatividad del CRM y POS.
                </p>
              </div>
            </div>

            <section className={styles.sectionBlock}>
              <h3>1. ¿Qué son las Cookies y el Almacenamiento Local?</h3>
              <p>
                Una cookie es un pequeño archivo de texto que un sitio web guarda en tu ordenador o dispositivo móvil cuando lo visitas. De forma similar, el <strong>Local Storage</strong> y <strong>Session Storage</strong> permiten que el navegador recuerde tu sesión de forma ultra-rápida sin recargar la página.
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>2. Tipos de Cookies y Almacenamiento que Utilizamos</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.legalTable}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Tecnología</th>
                      <th>Propósito</th>
                      <th>Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Autenticación y Seguridad (Esencial)</strong></td>
                      <td><code>accessToken</code> / JWT</td>
                      <td>Permite mantener tu sesión abierta mientras usas el POS, cocina y mesas sin pedirte contraseña en cada clic.</td>
                      <td>Sesión activa / Rotación</td>
                    </tr>
                    <tr>
                      <td><strong>Contexto de Restaurante (Esencial)</strong></td>
                      <td><code>tenant_id</code> / <code>slug</code></td>
                      <td>Garantiza que todas las ventas y productos pertenezcan a la sede correcta de tu restaurante.</td>
                      <td>Permanente mientras estés logueado</td>
                    </tr>
                    <tr>
                      <td><strong>Preferencias de Usuario (Funcional)</strong></td>
                      <td><code>neofood_theme</code>, filtros</td>
                      <td>Recuerda filtros de búsqueda de inventario y estado de paneles colapsados.</td>
                      <td>Persistente en navegador</td>
                    </tr>
                    <tr>
                      <td><strong>Consentimiento Legal</strong></td>
                      <td><code>neofood_cookies_accepted</code></td>
                      <td>Registra que aceptaste el uso de cookies para no mostrarte el aviso nuevamente.</td>
                      <td>12 meses</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <h3>3. ¿Cómo Gestionar o Desactivar las Cookies?</h3>
              <p>
                Puedes configurar tu navegador web para bloquear o eliminar las cookies en cualquier momento a través del menú de opciones o ajustes de tu navegador:
              </p>
              <ul>
                <li><strong>Google Chrome:</strong> Configuración &rarr; Privacidad y seguridad &rarr; Cookies y otros datos de sitios.</li>
                <li><strong>Mozilla Firefox:</strong> Opciones &rarr; Privacidad & Seguridad &rarr; Cookies y datos del sitio.</li>
                <li><strong>Apple Safari:</strong> Preferencias &rarr; Privacidad &rarr; Bloquear todas las cookies.</li>
                <li><strong>Microsoft Edge:</strong> Configuración &rarr; Cookies y permisos del sitio.</li>
              </ul>
              <p>
                <em>Ten en cuenta que si deshabilitas el almacenamiento local de autenticación, no podrás iniciar sesión de forma segura en el software del restaurante.</em>
              </p>
            </section>
          </article>
        )}

        {/* ========================================================= */}
        {/* TAB 4: GARANTÍA Y ACUERDO DE NIVEL DE SERVICIO (SLA) */}
        {/* ========================================================= */}
        {activeTab === 'sla' && (
          <article className={styles.docArticle}>
            <div className={styles.docHeader}>
              <div className={styles.docBadge}>Compromiso de Disponibilidad</div>
              <h2 className={styles.docTitle}>Acuerdo de Nivel de Servicio (SLA) y Garantía Operativa</h2>
              <p className={styles.docSubtitle}>
                Estándares de infraestructura, respaldo de base de datos y canales de soporte técnico continuo.
              </p>
            </div>

            <section className={styles.sectionBlock}>
              <h3>1. Compromiso de Disponibilidad de la Plataforma (Uptime)</h3>
              <p>
                Sabemos que un restaurante no puede detener su atención ni en la hora punta del almuerzo ni en las cenas de fin de semana. Por ello, NeoFood está alojado en infraestructura de servidores en la nube de alta disponibilidad, con un objetivo de operación del <strong>99.5% de disponibilidad mensual</strong>.
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>2. Mantenimientos Programados</h3>
              <p>
                Las actualizaciones de nuevas funcionalidades o parches de seguridad críticos se programan preferentemente en horarios de bajo impacto para el sector gastronómico (habitualmente entre las <strong>02:00 AM y 05:00 AM hora de Colombia</strong>), con notificación previa a los administradores.
              </p>
            </section>

            <section className={styles.sectionBlock}>
              <h3>3. Copias de Seguridad y Respaldo de Datos (Backups)</h3>
              <div className={styles.bulletList}>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Respaldos Automáticos Diarios:</strong> Toda la base de datos de transacciones, comandas, recetas e inventarios cuenta con copias de seguridad automáticas diarias.
                  </div>
                </div>
                <div className={styles.bulletItem}>
                  <CheckCircle2 size={16} className={styles.bulletIcon} />
                  <div>
                    <strong>Redundancia Geográfica:</strong> Las copias de respaldo se almacenan en centros de datos con aislamiento físico para prevenir pérdidas ante eventualidades mayores.
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <h3>4. Canales Oficiales y Tiempos de Respuesta</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.legalTable}>
                  <thead>
                    <tr>
                      <th>Nivel de Incidencia</th>
                      <th>Descripción</th>
                      <th>Tiempo Objetivo de Respuesta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Crítico (Severidad 1)</strong></td>
                      <td>Imposibilidad total de ingresar al POS o cobrar pedidos en todo el restaurante.</td>
                      <td>Menos de 2 horas (Horario de servicio)</td>
                    </tr>
                    <tr>
                      <td><strong>Medio (Severidad 2)</strong></td>
                      <td>Problema puntual en un módulo no bloqueante (ej. reporte PDF o filtro de compras).</td>
                      <td>Menos de 12 horas hábiles</td>
                    </tr>
                    <tr>
                      <td><strong>Bajo (Severidad 3)</strong></td>
                      <td>Consultas operativas, configuración de productos, solicitudes de mejoras.</td>
                      <td>Menos de 24 horas hábiles</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </article>
        )}

        {/* Banner de Contacto Legal Directo */}
        <div className={styles.helpBanner}>
          <div className={styles.helpBannerContent}>
            <MessageCircle size={28} style={{ color: '#25D366', flexShrink: 0 }} />
            <div>
              <h4>¿Tienes alguna duda sobre nuestras políticas o necesitas un acuerdo especial?</h4>
              <p>Nuestro equipo legal y de operaciones está disponible para ayudarte a aclarar cualquier inquietud.</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hola%20NeoFood,%20tengo%20una%20consulta%20sobre%20los%20términos%20legales%20y%20políticas.`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.helpWhatsAppBtn}
          >
            <span>Consultar por WhatsApp</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </main>

      {/* Footer Legal */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <span className={styles.brandNeo}>Neo</span>
              <span className={styles.brandFood}>FOOD</span>
              <span className={styles.footerTagline}>&bull; Sistema Integral de Gestión Gastronómica</span>
            </div>
            <div className={styles.footerLinksRow}>
              <button type="button" onClick={() => handleTabChange('terminos')}>Términos y Condiciones</button>
              <span>•</span>
              <button type="button" onClick={() => handleTabChange('privacidad')}>Privacidad y Habeas Data</button>
              <span>•</span>
              <button type="button" onClick={() => handleTabChange('cookies')}>Cookies</button>
              <span>•</span>
              <button type="button" onClick={() => handleTabChange('sla')}>SLA</button>
              <span>•</span>
              <Link to="/registro">Crear Restaurante (7 Días Gratis)</Link>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} NeoFood SaaS. Todos los derechos reservados.</p>
            <p className={styles.footerAuthor}>Diseñado por <strong>Leonardo Ramirez</strong></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPages;
