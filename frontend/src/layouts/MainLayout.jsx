import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Wallet,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Crown,
  ShoppingBag,
  Bell,
  ChefHat,
  Factory,
  UserCheck
} from 'lucide-react';
import storeService from '../services/store.service';
import { getFullImageUrl } from '../utils/imageUrl';
import { getPlanFeatures } from '../constants/plans';
import FeatureLockedView from '../components/ui/FeatureLockedView/FeatureLockedView';
import styles from './MainLayout.module.css';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Logotipo dinámico del restaurante para el footer de la sidebar
  const [restaurantLogo, setRestaurantLogo] = useState(user?.tenant?.logoUrl || null);

  useEffect(() => {
    if (user?.tenant?.logoUrl) {
      setRestaurantLogo(user.tenant.logoUrl);
    }
    storeService.getStoreConfig()
      .then(cfg => {
        if (cfg?.logoUrl) {
          setRestaurantLogo(cfg.logoUrl);
        }
      })
      .catch(() => { });
  }, [user]);

  // Alerta en tiempo real de Pedidos de la Tienda
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [newOrderToast, setNewOrderToast] = useState(null);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed);
  }, [isCollapsed]);

  // Sonido sintético de campana suave (Web Audio API)
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch { }
  };

  // Polling cada 12 segundos para detectar pedidos nuevos de la tienda virtual
  useEffect(() => {
    if (!user) return;
    let lastNotifiedId = null;

    const checkOrders = async () => {
      try {
        const stats = await storeService.getActiveCount();
        const pending = stats.pendingCount || 0;
        setPendingOrdersCount(pending);

        // Si hay un nuevo pedido pendiente que no se había notificado
        if (stats.latestPending && stats.latestPending.id !== lastNotifiedId) {
          lastNotifiedId = stats.latestPending.id;
          playAlertSound();
          setNewOrderToast(stats.latestPending);
        }
      } catch (err) {
        // Silencioso
      }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 12000);
    return () => clearInterval(interval);
  }, [user]);

  // Orden estratégico según flujo operativo diario
  const navItems = [
    // 1. Operación Diaria (Venta, Cocina, Despacho y Caja)
    { path: '/', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/ventas', name: 'Ventas (POS)', icon: ShoppingCart },
    { path: '/cocina', name: 'Cocina', icon: ChefHat },
    {
      path: '/pedidos-tienda',
      name: 'Tienda Virtual',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null
    },
    { path: '/caja', name: 'Caja', icon: Wallet },

    // 2. Abastecimiento, Existencias y Lotes
    { path: '/inventario', name: 'Inventario', icon: Package },
    { path: '/produccion', name: 'Producción', icon: Factory },
    { path: '/compras', name: 'Compras', icon: Store },
    { path: '/proveedores', name: 'Proveedores', icon: Building2 },

    // 3. Auditoría y Análisis Financiero
    { path: '/facturas', name: 'Facturas', icon: FileText },
    { path: '/reportes', name: 'Reportes', icon: BarChart3 },

    // 4. Gestión y Parámetros
    { path: '/clientes', name: 'Clientes', icon: UserCheck },
    { path: '/usuarios', name: 'Usuarios', icon: Users },
    { path: '/configuracion', name: 'Configuración', icon: Settings },
  ];

  const roleName = typeof user?.role === 'object' ? user?.role?.name : user?.role;
  const isSuperAdmin = roleName === 'SuperAdmin' || roleName === 'SUPERADMIN';

  // Capacidades del plan del restaurante
  const planFeatures = getPlanFeatures(user?.tenant?.plan);
  const isFeatureLocked = (featureKey) => {
    if (!featureKey || isSuperAdmin) return false;
    return planFeatures && planFeatures[featureKey] === false;
  };

  // Mapeo de rutas que requieren características específicas del plan
  const ROUTE_FEATURE_REQUIREMENTS = {
    '/inventario': { key: 'inventory', plan: 'Plan Pro' },
    '/produccion': { key: 'recipes', plan: 'Plan Pro' },
    '/compras': { key: 'inventory', plan: 'Plan Pro' },
    '/proveedores': { key: 'inventory', plan: 'Plan Pro' },
    '/reportes': { key: 'analytics', plan: 'Plan Pro' }
  };
  const currentRouteLock = !isSuperAdmin && ROUTE_FEATURE_REQUIREMENTS[location.pathname];
  const isCurrentRouteLocked = Boolean(currentRouteLock && planFeatures && planFeatures[currentRouteLock.key] === false);

  // Navegación agrupada por dominios operativos del restaurante
  const navSections = [
    {
      id: 'operaciones',
      title: 'Operaciones',
      items: [
        { path: '/', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/ventas', name: 'Ventas (POS)', icon: ShoppingCart },
        { path: '/cocina', name: 'Cocina', icon: ChefHat },
        {
          path: '/pedidos-tienda',
          name: 'Tienda Virtual',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : null
        },
        { path: '/caja', name: 'Caja', icon: Wallet },
      ]
    },
    {
      id: 'stock',
      title: 'Inventario & Stock',
      items: [
        { path: '/inventario', name: 'Inventario', icon: Package, featureKey: 'inventory' },
        { path: '/produccion', name: 'Producción', icon: Factory, featureKey: 'recipes' },
        { path: '/compras', name: 'Compras', icon: Store, featureKey: 'inventory' },
        { path: '/proveedores', name: 'Proveedores', icon: Building2, featureKey: 'inventory' },
      ]
    },
    {
      id: 'finanzas',
      title: 'Finanzas & Reportes',
      items: [
        { path: '/facturas', name: 'Facturas', icon: FileText },
        { path: '/reportes', name: 'Reportes', icon: BarChart3, featureKey: 'analytics' },
      ]
    },
    {
      id: 'admin',
      title: 'Administración',
      items: [
        { path: '/clientes', name: 'Clientes', icon: UserCheck },
        { path: '/usuarios', name: 'Usuarios', icon: Users },
        { path: '/configuracion', name: 'Configuración', icon: Settings },
        ...(isSuperAdmin ? [{ path: '/saas', name: 'Admin SaaS', icon: Crown }] : [])
      ]
    }
  ];

  const allNavItems = navSections.flatMap(s => s.items);
  const currentRouteName = allNavItems.find(item => item.path === location.pathname)?.name || 'NeoFood';

  return (
    <div className={styles.layoutContainer}>

      {/* Overlay para móvil */}
      {isSidebarOpen && (
        <div
          className={styles.layoutMobileOverlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Retráctil */}
      <aside className={`${styles.layoutSidebar} ${isSidebarOpen ? `${styles.layoutSidebarOpen || ''} ${styles.isOpen || ''} ${styles['is-open'] || ''}` : ''} ${isCollapsed ? `${styles.layoutSidebarCollapsed || ''} ${styles.isCollapsed || ''} ${styles['is-collapsed'] || ''}` : ''}`}>

        {/* Cabecera Sidebar / Logo */}
        <div className={styles.sidebarHeader}>
          <div
            className={`${styles.sidebarBrand} ${isCollapsed ? styles['is-collapsed'] || styles.isCollapsed : ''}`}
            onClick={() => isCollapsed && setIsCollapsed(false)}
            title={isCollapsed ? 'Expandir menú' : undefined}
          >
            <div className={styles.sidebarLogo}>
              NF
            </div>
            {!isCollapsed && (
              <div className={styles.sidebarBrandText}>
                <div className={styles.sidebarBrandNameContainer}>
                  <span className={styles.sidebarBrandName}>Neo</span>
                  <span className={styles.sidebarBrandName1}>Food</span>
                </div>
                <div className={styles.sidebarTenantPill} title={`Establecimiento: ${user?.tenant?.name || 'Sede Principal'}`}>
                  <Store size={11} />
                  <span className={styles.sidebarTenantName}>
                    {user?.tenant?.name || 'Sede Principal'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Botón cerrar en móvil */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className={styles.sidebarCloseBtn}
              title="Cerrar menú"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navegación Principal Agrupada */}
        <nav className={styles.sidebarNav}>
          {navSections.map((section, idx) => (
            <div key={section.id} className={styles.sidebarNavGroup}>
              {/* Título de sección o separador */}
              {!isCollapsed ? (
                <div className={styles.sidebarSectionHeader}>
                  <span>{section.title}</span>
                </div>
              ) : (
                idx > 0 && <div className={styles.sidebarSectionDivider} />
              )}

              {/* Items del grupo */}
              <div className={styles.sidebarGroupItems}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) => `${styles.sidebarNavItem} ${isActive ? styles.active : ''} ${isCollapsed ? styles['is-collapsed'] || styles.isCollapsed : ''}`}
                  >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <item.icon size={19} />
                      {item.badge && isCollapsed && (
                        <span style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#ef4444',
                          borderRadius: '50%',
                          border: '1.5px solid #ffffff'
                        }}></span>
                      )}
                      {isFeatureLocked(item.featureKey) && isCollapsed && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#f59e0b',
                          borderRadius: '50%',
                          border: '1.5px solid #ffffff'
                        }} title="Requiere Plan Pro"></span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span className={styles.sidebarNavItemText}>{item.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isFeatureLocked(item.featureKey) && (
                            <span style={{
                              background: 'linear-gradient(135deg, #4f46e5, #059669)',
                              color: '#ffffff',
                              fontSize: '0.625rem',
                              fontWeight: 900,
                              letterSpacing: '0.05em',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '9999px',
                              boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)'
                            }} title="Módulo exclusivo Plan Pro">
                              PRO
                            </span>
                          )}
                          {item.badge && (
                            <span style={{
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: 900,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '9999px',
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Sidebar (Usuario & Botón Retraer) */}
        <div className={styles.sidebarFooter}>

          {/* Perfil del Usuario */}
          <div className={`${styles.sidebarUser} ${isCollapsed ? styles['is-collapsed'] || styles.isCollapsed : ''}`}>
            <div className={styles.sidebarUserAvatar} title={user?.tenant?.name || 'Logotipo de establecimiento'}>
              {restaurantLogo ? (
                <img
                  src={getFullImageUrl(restaurantLogo)}
                  alt={user?.tenant?.name || 'Logo'}
                  className={styles.sidebarTenantLogoImg}
                />
              ) : (
                <span className={styles.sidebarAvatarInitial}>
                  {user?.tenant?.name?.charAt(0) || user?.name?.charAt(0) || 'R'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className={styles.sidebarUserInfo}>
                <p className={styles.sidebarUserName} title={user?.name || 'Usuario'}>
                  {user?.name || 'Administrador'}
                </p>
                <p className={styles.sidebarUserRole} title={user?.tenant?.name || 'Restaurante'}>
                  {user?.tenant?.name || 'Mi Restaurante'}
                </p>
              </div>
            )}
          </div>

          {/* Botón de Acción (Cerrar sesión) */}
          <div>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className={`${styles.sidebarLogoutBtn} ${isCollapsed ? styles['is-collapsed'] || styles.isCollapsed : ''}`}
            >
              <LogOut size={18} />
              {!isCollapsed && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.layoutMain}>

        {/* Top Navbar */}
        <header className={styles.layoutHeader}>

          <div className={styles.layoutHeaderLeft}>
            {/* Menú Móvil */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`${styles.layoutHeaderBtn} ${styles.mobileToggle}`}
              title="Abrir menú"
            >
              <Menu size={22} />
            </button>

            {/* Indicador de sección actual */}
            <div className={styles.layoutBreadcrumb}>
              <span className={styles.layoutBreadcrumbApp}>NeoFood</span>
              <span className={styles.layoutBreadcrumbSep}>/</span>
              <span className={styles.layoutBreadcrumbCurrent}>{currentRouteName}</span>
            </div>
          </div>

          <div className={styles.layoutHeaderRight} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Botón Alerta Pedidos Tienda */}
            <Link
              to="/pedidos-tienda"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.625rem',
                fontSize: '0.775rem',
                fontWeight: 800,
                textDecoration: 'none',
                backgroundColor: pendingOrdersCount > 0 ? '#fef3c7' : '#f8fafc',
                color: pendingOrdersCount > 0 ? '#b45309' : '#475569',
                border: pendingOrdersCount > 0 ? '1.5px solid #fde68a' : '1px solid #cbd5e1',
                boxShadow: pendingOrdersCount > 0 ? '0 0 10px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
              title="Ver pedidos de la Tienda Virtual"
            >
              <Bell size={15} style={{ color: pendingOrdersCount > 0 ? '#d97706' : '#64748b' }} />
              <span>Pedidos Web</span>
              {pendingOrdersCount > 0 && (
                <span style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.675rem',
                  fontWeight: 900,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '9999px',
                  lineHeight: 1
                }}>
                  {pendingOrdersCount}
                </span>
              )}
            </Link>

            <div className={styles.tenantHeaderBadge} title={`Establecimiento: ${user?.tenant?.name || 'NeoFood Sede Principal'}`}>
              <Store size={15} className={styles.tenantHeaderIcon} />
              <span className={styles.tenantHeaderName}>
                {user?.tenant?.name || 'NeoFood Sede Principal'}
              </span>
              {user?.tenant?.plan && (
                <span className={styles.tenantPlanPill}>
                  {user.tenant.plan.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* TOAST ALERTA NUEVO PEDIDO */}
        {newOrderToast && (
          <div style={{
            position: 'fixed',
            top: '4.5rem',
            right: '1.5rem',
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '1rem 1.25rem',
            borderRadius: '1rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '2px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            maxWidth: '380px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.75rem',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={22} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fde68a' }}>
                ¡Nuevo Pedido Web #{newOrderToast.orderNumber}!
              </span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Cliente: <strong>{newOrderToast.customerName}</strong>
              </span>
            </div>
            <Link
              to="/pedidos-tienda"
              onClick={() => setNewOrderToast(null)}
              style={{
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                flexShrink: 0
              }}
            >
              Atender
            </Link>
            <button
              onClick={() => setNewOrderToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.2rem'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}


        {/* Contenedor de Páginas */}
        <div className={`${styles.layoutContentView} ${location.pathname === '/ventas' ? styles.isPosView : ''}`}>
          <div className={`${styles.layoutPageBody} ${location.pathname === '/ventas' ? styles.isPosPageBody : ''}`}>
            {isCurrentRouteLocked ? (
              <FeatureLockedView
                featureKey={currentRouteLock.key}
                planRequired={currentRouteLock.plan}
              />
            ) : (
              <Outlet />
            )}
          </div>
        </div>

        {/* Footer General del Sistema (Permanente Fijo) */}
        <footer className={styles.layoutFooter}>
          <div className={styles.layoutFooterLeft}>
            <span className={styles.layoutFooterBrand}>NeoFood</span>
            <span className={styles.layoutFooterSep}>•</span>
            <span className={styles.layoutFooterDesc}>Sistema Integral de Gestión Gastronómica</span>
            <span className={styles.layoutFooterSep}>•</span>
            <span className={styles.layoutFooterVersion}>v 1.7.6</span>
          </div>

          <div className={styles.layoutFooterRight}>
            <div className={styles.layoutFooterStatus}>
              <span className={styles.layoutStatusDot}></span>
              <span>Servidor Conectado</span>
            </div>
            <span className={styles.layoutFooterSep}>•</span>
            <span className={styles.layoutFooterAuthor}>
              Diseñado por <strong>Leonardo Ramirez</strong>
            </span>
            <span className={styles.layoutFooterSep}>•</span>
            <span className={styles.layoutFooterCopy}>
              &copy; {new Date().getFullYear()} NeoFood. Todos los derechos reservados.
            </span>
          </div>
        </footer>

        {/* BARRA DE NAVEGACIÓN INFERIOR MÓVIL (TIPO APP NATIVA) */}
        <nav className={styles.mobileBottomNav} aria-label="Navegación móvil del sistema">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.mobileBottomNavItem} ${isActive ? styles.mobileBottomNavActive : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Inicio</span>
          </NavLink>

          <NavLink
            to="/ventas"
            className={({ isActive }) => `${styles.mobileBottomNavItem} ${isActive ? styles.mobileBottomNavActive : ''}`}
          >
            <ShoppingCart size={20} />
            <span>Ventas</span>
          </NavLink>

          <NavLink
            to="/cocina"
            className={({ isActive }) => `${styles.mobileBottomNavItem} ${isActive ? styles.mobileBottomNavActive : ''}`}
          >
            <ChefHat size={20} />
            <span>Cocina</span>
          </NavLink>

          <NavLink
            to="/pedidos-tienda"
            className={({ isActive }) => `${styles.mobileBottomNavItem} ${isActive ? styles.mobileBottomNavActive : ''}`}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <ShoppingBag size={20} />
              {pendingOrdersCount > 0 && (
                <span className={styles.mobileBadge}>{pendingOrdersCount}</span>
              )}
            </div>
            <span>Tienda</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className={`${styles.mobileBottomNavItem} ${isSidebarOpen ? styles.mobileBottomNavActive : ''}`}
          >
            <Menu size={20} />
            <span>Menú</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default MainLayout;