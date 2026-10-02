import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Building2,
  Users,
  DollarSign,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Store,
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  Send,
  Info,
  Check,
  CreditCard,
  UserCheck,
  Trash2
} from 'lucide-react';
import styles from './SaasDashboard.module.css';

const SaasDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roleName = typeof user?.role === 'object' ? user?.role?.name : user?.role;
  const isSuperAdmin = roleName === 'SuperAdmin' || roleName === 'SUPERADMIN';

  // Pestaña Activa: 'tenants' (Restaurantes) o 'users' (Usuarios globales)
  const [activeTab, setActiveTab] = useState('tenants');

  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [purgeCount, setPurgeCount] = useState(0);

  // Filtros de Restaurantes
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  // Filtros de Usuarios Globales
  const [platformUsers, setPlatformUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userFilterRestaurant, setUserFilterRestaurant] = useState('ALL');
  const [userFilterName, setUserFilterName] = useState('');
  const [userFilterEmail, setUserFilterEmail] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);

  // Modales
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalType, setModalType] = useState(null); // 'status' | 'plan' | 'activate' | 'details' | 'deleteTenant' | 'deleteUser' | 'purge'
  const [newPlanId, setNewPlanId] = useState('');
  const [activationCycle, setActivationCycle] = useState('monthly'); // 'monthly' | 'semiannual' | 'annual' | 'trial'
  const [feedback, setFeedback] = useState(null);

  // Carga de datos globales (Métricas, Restaurantes, Planes, Conteo Purga)
  const fetchGlobalData = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setLoading(true);
      const [statsRes, tenantsRes, plansRes, purgeRes] = await Promise.all([
        api.get('/saas/stats'),
        api.get('/saas/tenants', {
          params: {
            search: search.trim() || undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            planCode: planFilter !== 'ALL' ? planFilter : undefined
          }
        }),
        api.get('/saas/plans'),
        api.get('/saas/tenants/purge-inactive-count')
      ]);

      setStats(statsRes.data.data);
      setTenants(tenantsRes.data.data || []);
      setPlans(plansRes.data.data || []);
      setPurgeCount(purgeRes.data?.data?.count || 0);
    } catch (err) {
      console.error('Error al cargar datos SaaS:', err);
      showFeedback('Error al sincronizar datos del servidor', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter, isSuperAdmin]);

  // Carga de usuarios globales con filtros
  const fetchPlatformUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingUsers(true);
      const res = await api.get('/saas/users', {
        params: {
          tenantId: userFilterRestaurant !== 'ALL' ? userFilterRestaurant : undefined,
          name: userFilterName.trim() || undefined,
          email: userFilterEmail.trim() || undefined
        }
      });
      setPlatformUsers(res.data?.data || []);
    } catch (err) {
      console.error('Error al cargar usuarios de plataforma:', err);
      showFeedback('Error al cargar usuarios de plataforma', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [userFilterRestaurant, userFilterName, userFilterEmail, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchGlobalData();
    }
  }, [fetchGlobalData, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'users') {
      fetchPlatformUsers();
    }
  }, [fetchPlatformUsers, isSuperAdmin, activeTab]);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Manejo de cambio de estado (Suspender / Activar)
  const handleToggleStatus = async () => {
    if (!selectedTenant) return;
    const targetStatus = selectedTenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      setActionLoading(true);
      await api.patch(`/saas/tenants/${selectedTenant.id}/status`, {
        status: targetStatus
      });
      showFeedback(`Restaurante "${selectedTenant.name}" ahora está ${targetStatus === 'ACTIVE' ? 'ACTIVO' : 'SUSPENDIDO'}`);
      setModalType(null);
      setSelectedTenant(null);
      fetchGlobalData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error al actualizar estado', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejo de cambio de plan básico
  const handleUpdatePlan = async () => {
    if (!selectedTenant || !newPlanId) return;
    try {
      setActionLoading(true);
      await api.patch(`/saas/tenants/${selectedTenant.id}/plan`, {
        planId: newPlanId
      });
      showFeedback(`Plan actualizado con éxito para "${selectedTenant.name}"`);
      setModalType(null);
      setSelectedTenant(null);
      fetchGlobalData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error al cambiar plan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejo de verificación de pago y activación del plan
  const handleActivatePlan = async () => {
    if (!selectedTenant) return;
    try {
      setActionLoading(true);
      await api.patch(`/saas/tenants/${selectedTenant.id}/activate-plan`, {
        planId: newPlanId || selectedTenant.plan?.id,
        billingCycle: activationCycle
      });
      showFeedback(`¡Plan activado y pago verificado exitosamente para "${selectedTenant.name}"!`);
      setModalType(null);
      setSelectedTenant(null);
      fetchGlobalData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error al verificar y activar plan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejo de eliminación definitiva de un restaurante
  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    try {
      setActionLoading(true);
      const res = await api.delete(`/saas/tenants/${selectedTenant.id}`);
      showFeedback(res.data?.message || `Restaurante "${selectedTenant.name}" y todos sus datos han sido eliminados permanentemente.`);
      setModalType(null);
      setSelectedTenant(null);
      fetchGlobalData();
      if (activeTab === 'users') fetchPlatformUsers();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error al eliminar restaurante', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejo de depuración automática de restaurantes inactivos (> 2 meses)
  const handlePurgeInactive = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/saas/tenants/purge-inactive');
      showFeedback(res.data?.message || 'Depuración completada.');
      setModalType(null);
      fetchGlobalData();
      if (activeTab === 'users') fetchPlatformUsers();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error al depurar restaurantes inactivos', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejo de eliminación de usuario de la plataforma
  const handleDeletePlatformUser = async () => {
    if (!userToDelete) return;
    try {
      setActionLoading(true);
      const res = await api.delete(`/saas/users/${userToDelete.id}`);
      showFeedback(res.data?.message || `Usuario "${userToDelete.name}" eliminado correctamente.`);
      setModalType(null);
      setUserToDelete(null);
      fetchPlatformUsers();
      fetchGlobalData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error al eliminar usuario', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Generar link de WhatsApp para recordatorio de vencimiento
  const getReminderLink = (tenant, creator) => {
    const phone = creator?.phone || tenant.phone;
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const days = tenant.daysRemaining;

    let msg = '';
    if (tenant.paymentStatus === 'PENDING') {
      msg = `Hola ${creator?.name || 'Administrador'}, te saludamos de NeoFood. Tu restaurante "${tenant.name}" tiene su suscripción lista, pendiente de verificación de pago para su activación. ¿Deseas que te apoyemos con el proceso?`;
    } else if (days !== null && days <= 0) {
      msg = `Hola ${creator?.name || 'Administrador'}, te informamos que la suscripción de tu restaurante "${tenant.name}" en NeoFood ha finalizado. Puedes renovarla para seguir operando tu sistema sin interrupciones.`;
    } else {
      msg = `Hola ${creator?.name || 'Administrador'}, te recordamos que a tu plan en NeoFood para el restaurante "${tenant.name}" le quedan ${days} días de vigencia. ¡Estamos atentos para renovar tu suscripción!`;
    }

    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (!isSuperAdmin) {
    return (
      <div className={styles.restrictedContainer}>
        <ShieldCheck size={56} className={styles.restrictedIcon} />
        <h2 className={styles.restrictedTitle}>Acceso Restringido</h2>
        <p className={styles.restrictedDesc}>
          Esta sección está reservada exclusivamente para el <strong>SuperAdmin</strong> de la plataforma NeoFood SaaS. Tu cuenta actual no cuenta con los permisos necesarios.
        </p>
        <button onClick={() => navigate('/')} className={styles.returnBtn}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className={styles.saasContainer}>
      
      {/* Notificación Feedback */}
      {feedback && (
        <div className={`${styles.feedbackToast} ${feedback.type === 'error' ? styles.errorToast : styles.successToast}`}>
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className={styles.saasHeader}>
        <div>
          <div className={styles.saasHeaderTitleContainer}>
            <h1 className={styles.saasTitle}>Control Global de Plataforma SaaS</h1>
            <span className={styles.saasBadge}>SuperAdmin Multi-Tenant</span>
          </div>
          <p className={styles.saasSubtitle}>
            Supervisa en tiempo real las sedes activas, métricas de facturación, usuarios y planes en la nube
          </p>
        </div>

        <button
          onClick={() => {
            fetchGlobalData();
            if (activeTab === 'users') fetchPlatformUsers();
          }}
          disabled={loading || loadingUsers}
          className={styles.refreshBtn}
          title="Actualizar datos"
        >
          <RefreshCw size={16} className={(loading || loadingUsers) ? styles.spinning : ''} />
          <span>Sincronizar</span>
        </button>
      </div>

      {/* 4 Tarjetas de Métricas Principales */}
      {stats && (
        <div className={styles.kpiGrid}>
          {/* Card 1: Restaurantes */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Restaurantes Registrados</span>
              <div className={`${styles.kpiIconWrapper} ${styles.iconPurple}`}>
                <Store size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{stats.tenants.total}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubGreen}>
                <CheckCircle2 size={13} /> {stats.tenants.active} Activos
              </span>
              {stats.tenants.suspended > 0 && (
                <span className={styles.kpiSubRed}>
                  <AlertTriangle size={13} /> {stats.tenants.suspended} Suspendidos
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Usuarios */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Usuarios en Plataforma</span>
              <div className={`${styles.kpiIconWrapper} ${styles.iconIndigo}`}>
                <Users size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{stats.users.total}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubNeutral}>
                Admins, cajeros y meseros
              </span>
            </div>
          </div>

          {/* Card 3: Ventas Registradas */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Ventas Acumuladas</span>
              <div className={`${styles.kpiIconWrapper} ${styles.iconEmerald}`}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{stats.sales.total}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubNeutral}>
                En todos los restaurantes
              </span>
            </div>
          </div>

          {/* Card 4: Facturación Global */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Facturación Global POS</span>
              <div className={`${styles.kpiIconWrapper} ${styles.iconAmber}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>
              {formatCurrency(stats.sales.revenue)}
            </div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubGreen}>
                Flujo total procesado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TABS SUPERADMIN: RESTAURANTES VS USUARIOS DE LA PLATAFORMA */}
      <div className={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('tenants')}
          className={`${styles.tabBtn} ${activeTab === 'tenants' ? styles.tabBtnActive : ''}`}
        >
          <Store size={18} />
          <span>Restaurantes & Sedes</span>
          <span className={styles.tabBadge}>{tenants.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabBtnActive : ''}`}
        >
          <Users size={18} />
          <span>Usuarios de la Plataforma</span>
          <span className={styles.tabBadge}>{stats?.users?.total || platformUsers.length}</span>
        </button>
      </div>

      {/* ========================================================
          PESTAÑA 1: GESTIÓN DE RESTAURANTES Y SEDES
          ======================================================== */}
      {activeTab === 'tenants' && (
        <>
          {/* Barra de Filtros y Búsqueda de Restaurantes */}
          <div className={styles.filterCard}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por nombre, slug, creador, celular o NIT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filtersWrapper}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Estado:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="SUSPENDED">Suspendidos</option>
                  <option value="TRIAL">En Prueba</option>
                  <option value="INACTIVE">Inactivos / Pendientes</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Plan:</label>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="ALL">Todos los planes</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Restaurantes */}
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <div>
                <h2 className={styles.tableTitle}>
                  Restaurantes Registrados ({tenants.length})
                </h2>
                <span className={styles.tableCount}>
                  Supervisión de planes, creadores y días restantes
                </span>
              </div>

              {/* Botón de Depuración Inactivos > 2 Meses */}
              <button
                type="button"
                onClick={() => setModalType('purge')}
                className={styles.purgeBtn}
                title="Depurar restaurantes con más de 2 meses inactivos o suspendidos"
              >
                <Trash2 size={15} />
                <span>Depuración Inactivos (&gt;2 Meses)</span>
                {purgeCount > 0 && <span className={styles.purgeBadge}>{purgeCount}</span>}
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Establecimiento</th>
                    <th>Creador / Contacto</th>
                    <th>Plan & Periodo</th>
                    <th>Capacidad (Mesas/Users)</th>
                    <th>Vencimiento / Días</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className={styles.emptyCell}>
                        <RefreshCw size={24} className={styles.spinning} />
                        <p>Cargando establecimientos...</p>
                      </td>
                    </tr>
                  ) : tenants.length === 0 ? (
                    <tr>
                      <td colSpan="7" className={styles.emptyCell}>
                        <Building2 size={32} />
                        <p>No se encontraron restaurantes con los filtros aplicados</p>
                      </td>
                    </tr>
                  ) : (
                    tenants.map(t => {
                      const creatorPhone = t.creator?.phone || t.phone;
                      const reminderUrl = getReminderLink(t, t.creator);
                      const isPending = t.paymentStatus === 'PENDING' || t.status === 'INACTIVE';

                      return (
                        <tr key={t.id} className={t.status === 'SUSPENDED' ? styles.suspendedRow : ''}>
                          {/* 1. Establecimiento */}
                          <td>
                            <div className={styles.tenantCell}>
                              <div className={styles.tenantAvatar}>
                                {t.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className={styles.tenantName}>{t.name}</div>
                                <div className={styles.tenantSlug}>
                                  <span>neofood/{t.slug}</span>
                                  {t.document && <span className={styles.tenantDoc}>• NIT: {t.document}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Creador / Celular (Información completa) */}
                          <td>
                            <div className={styles.creatorCell}>
                              <span className={styles.creatorName}>{t.creator?.name || 'Administrador'}</span>
                              {creatorPhone ? (
                                <div className={styles.creatorPhoneRow}>
                                  <a
                                    href={`https://wa.me/${creatorPhone.replace(/[^0-9]/g, '').startsWith('57') ? creatorPhone.replace(/[^0-9]/g, '') : '57' + creatorPhone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.phoneLink}
                                    title="Escribir por WhatsApp"
                                  >
                                    <Phone size={11} />
                                    <span>{creatorPhone}</span>
                                  </a>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Sin celular</span>
                              )}
                              <span className={styles.creatorEmail}>{t.creator?.email || t.email}</span>
                            </div>
                          </td>

                          {/* 3. Plan & Periodicidad */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div className={styles.planBadge}>
                                <Layers size={13} />
                                <span>{t.plan?.name || 'Sin Plan'}</span>
                              </div>
                              <span className={styles.cycleBadge}>
                                {t.billingCycle === 'annual'
                                  ? 'Anual (1 Año)'
                                  : t.billingCycle === 'semiannual'
                                  ? 'Semestral (6 Meses)'
                                  : t.billingCycle === 'trial'
                                  ? 'Prueba (7 Días)'
                                  : 'Mensual'}
                              </span>
                            </div>
                          </td>

                          {/* 4. Capacidad y Uso (Con Límites del Plan) */}
                          <td>
                            <div className={styles.usageGrid}>
                              <span title={`Mesas creadas: ${t.stats.tables} de ${t.plan?.maxTables === -1 ? 'Ilimitadas' : t.plan?.maxTables || 'N/A'}`}>
                                🪑 {t.stats.tables} / {t.plan?.maxTables === -1 ? '∞' : t.plan?.maxTables || 0} mesas
                              </span>
                              <span title={`Usuarios: ${t.stats.users} de ${t.plan?.maxUsers === -1 ? 'Ilimitados' : t.plan?.maxUsers || 'N/A'}`}>
                                👥 {t.stats.users} / {t.plan?.maxUsers === -1 ? '∞' : t.plan?.maxUsers || 0} users
                              </span>
                              <span title="Productos en catálogo">
                                📦 {t.stats.products} prods
                              </span>
                            </div>
                          </td>

                          {/* 5. Vencimiento & Días Restantes + Recordatorio */}
                          <td>
                            <div className={styles.daysCol}>
                              {isPending ? (
                                <span className={`${styles.daysBadge} ${styles.daysPending}`}>
                                  <Clock size={12} />
                                  <span>Pago Pendiente</span>
                                </span>
                              ) : t.daysRemaining !== null ? (
                                <span className={`${styles.daysBadge} ${
                                  t.daysRemaining > 7
                                    ? styles.daysGreen
                                    : t.daysRemaining > 0
                                    ? styles.daysYellow
                                    : styles.daysRed
                                }`}>
                                  <Calendar size={12} />
                                  <span>
                                    {t.daysRemaining > 0
                                      ? `${t.daysRemaining} días restantes`
                                      : t.daysRemaining === 0
                                      ? 'Vence hoy'
                                      : `Vencido (${Math.abs(t.daysRemaining)}d)`}
                                  </span>
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin límite</span>
                              )}

                              {/* Botón directo de Recordatorio por WhatsApp */}
                              {reminderUrl && (
                                <a
                                  href={reminderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.reminderBtn}
                                  title="Enviar recordatorio de pago/vencimiento por WhatsApp"
                                >
                                  <Send size={11} />
                                  <span>Recordatorio</span>
                                </a>
                              )}
                            </div>
                          </td>

                          {/* 6. Estado */}
                          <td>
                            <span className={`${styles.statusChip} ${
                              t.status === 'ACTIVE'
                                ? styles.statusActive
                                : t.status === 'SUSPENDED'
                                ? styles.statusSuspended
                                : styles.statusTrial
                            }`}>
                              {t.status === 'ACTIVE'
                                ? 'Activo'
                                : t.status === 'SUSPENDED'
                                ? 'Suspendido'
                                : t.status === 'TRIAL'
                                ? 'En Prueba'
                                : 'Inactivo'}
                            </span>
                          </td>

                          {/* 7. Acciones */}
                          <td style={{ textAlign: 'right' }}>
                            <div className={styles.actionBtns}>
                              {/* Botón Verificar Pago y Activar (Destacado si está pendiente) */}
                              {isPending && (
                                <button
                                  onClick={() => {
                                    setSelectedTenant(t);
                                    setNewPlanId(t.plan?.id || plans[0]?.id || '');
                                    setActivationCycle(t.billingCycle || 'monthly');
                                    setModalType('activate');
                                  }}
                                  className={styles.activatePlanBtn}
                                  title="Verificar pago y activar suscripción"
                                >
                                  <Check size={14} />
                                  <span>Verificar y Activar</span>
                                </button>
                              )}

                              {/* Botón Ver Ficha Completa */}
                              <button
                                onClick={() => {
                                  setSelectedTenant(t);
                                  setModalType('details');
                                }}
                                className={styles.detailsBtn}
                                title="Ver información completa de registro"
                              >
                                <Info size={14} />
                                <span>Ficha</span>
                              </button>

                              {/* Botón Cambiar Plan */}
                              <button
                                onClick={() => {
                                  setSelectedTenant(t);
                                  setNewPlanId(t.plan?.id || '');
                                  setModalType('plan');
                                }}
                                className={styles.planBtn}
                                title="Cambiar Plan de Suscripción"
                              >
                                <Sliders size={14} />
                                <span>Plan</span>
                              </button>

                              {/* Botón Suspender / Activar */}
                              <button
                                onClick={() => {
                                  setSelectedTenant(t);
                                  setModalType('status');
                                }}
                                className={`${styles.toggleStatusBtn} ${
                                  t.status === 'ACTIVE' ? styles.btnSuspend : styles.btnActivate
                                }`}
                                title={t.status === 'ACTIVE' ? 'Suspender Restaurante' : 'Reactivar Restaurante'}
                              >
                                {t.status === 'ACTIVE' ? <Lock size={14} /> : <Unlock size={14} />}
                                <span>{t.status === 'ACTIVE' ? 'Suspender' : 'Activar'}</span>
                              </button>

                              {/* Botón Eliminar Restaurante y Todo lo Asociado */}
                              <button
                                onClick={() => {
                                  setSelectedTenant(t);
                                  setModalType('deleteTenant');
                                }}
                                className={styles.btnDelete}
                                title="Eliminar restaurante y todos sus datos definitivamente"
                              >
                                <Trash2 size={13} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          PESTAÑA 2: GESTIÓN Y FILTRADO GLOBAL DE USUARIOS
          ======================================================== */}
      {activeTab === 'users' && (
        <>
          {/* Barra de Filtros: Por Restaurante, Por Nombre, Por Correo */}
          <div className={styles.filterCard}>
            <div className={styles.userFiltersGrid}>
              
              {/* Filtro 1: Restaurante (El más importante) */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Filtrar por Restaurante (Sede):</label>
                <select
                  value={userFilterRestaurant}
                  onChange={(e) => setUserFilterRestaurant(e.target.value)}
                  className={styles.userFilterSelect}
                >
                  <option value="ALL">🏢 Todos los restaurantes ({tenants.length})</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (neofood/{t.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro 2: Nombre */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Buscar por Nombre:</label>
                <div className={styles.inputWrapper} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez..."
                    value={userFilterName}
                    onChange={(e) => setUserFilterName(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {/* Filtro 3: Correo */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Buscar por Correo:</label>
                <div className={styles.inputWrapper} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Ej: admin@restaurante.com..."
                    value={userFilterEmail}
                    onChange={(e) => setUserFilterEmail(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {/* Botón Limpiar Filtros */}
              <button
                type="button"
                onClick={() => {
                  setUserFilterRestaurant('ALL');
                  setUserFilterName('');
                  setUserFilterEmail('');
                }}
                className={styles.clearFiltersBtn}
                title="Restablecer filtros"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Tabla de Usuarios Globales */}
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <h2 className={styles.tableTitle}>
                Usuarios Registrados en NeoFood ({platformUsers.length})
              </h2>
              <span className={styles.tableCount}>
                Búsqueda filtrada por nombre, correo y restaurante
              </span>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Celular / WhatsApp</th>
                    <th>Restaurante Asignado</th>
                    <th>Rol en la Sede</th>
                    <th>Vigencia Plan Restaurante</th>
                    <th>Estado</th>
                    <th>Fecha de Registro</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="8" className={styles.emptyCell}>
                        <RefreshCw size={24} className={styles.spinning} />
                        <p>Cargando usuarios...</p>
                      </td>
                    </tr>
                  ) : platformUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className={styles.emptyCell}>
                        <Users size={32} />
                        <p>No se encontraron usuarios con los criterios de búsqueda</p>
                      </td>
                    </tr>
                  ) : (
                    platformUsers.map(u => {
                      const userPhone = u.phone || u.tenant?.phone;
                      const tenant = u.tenant;
                      const days = tenant?.daysRemaining;
                      const reminderUrl = getReminderLink(tenant || {}, u);

                      return (
                        <tr key={u.id}>
                          {/* 1. Usuario */}
                          <td>
                            <div className={styles.tenantCell}>
                              <div className={styles.tenantAvatar} style={{ background: '#ede9fe', color: '#6d28d9' }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className={styles.tenantName}>{u.name}</div>
                                <div className={styles.tenantEmail}>{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Celular / Contacto */}
                          <td>
                            {userPhone ? (
                              <a
                                href={`https://wa.me/${userPhone.replace(/[^0-9]/g, '').startsWith('57') ? userPhone.replace(/[^0-9]/g, '') : '57' + userPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.phoneLink}
                              >
                                <Phone size={12} />
                                <span>{userPhone}</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin celular</span>
                            )}
                          </td>

                          {/* 3. Restaurante Asignado */}
                          <td>
                            {tenant ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span className={styles.restaurantTag}>
                                  <Store size={12} />
                                  <span>{tenant.name}</span>
                                </span>
                                <span style={{ fontSize: '0.725rem', color: '#64748b', fontFamily: 'monospace' }}>
                                  neofood/{tenant.slug}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Plataforma Global</span>
                            )}
                          </td>

                          {/* 4. Rol */}
                          <td>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.4rem',
                              backgroundColor: u.role?.name?.toLowerCase().includes('admin') ? '#dbeafe' : '#f1f5f9',
                              color: u.role?.name?.toLowerCase().includes('admin') ? '#1d4ed8' : '#475569'
                            }}>
                              {u.role?.name || 'Usuario'}
                            </span>
                          </td>

                          {/* 5. Vigencia del Plan del Restaurante */}
                          <td>
                            {days !== null && days !== undefined ? (
                              <div className={styles.daysCol}>
                                <span className={`${styles.daysBadge} ${
                                  days > 7 ? styles.daysGreen : days > 0 ? styles.daysYellow : styles.daysRed
                                }`}>
                                  <Clock size={11} />
                                  <span>{days > 0 ? `${days}d restantes` : 'Vencido'}</span>
                                </span>
                                {reminderUrl && (
                                  <a
                                    href={reminderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.reminderBtn}
                                    title="Enviar recordatorio a este usuario"
                                  >
                                    <Send size={10} />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>N/A</span>
                            )}
                          </td>

                          {/* 6. Estado */}
                          <td>
                            <span className={`${styles.statusChip} ${u.isActive ? styles.statusActive : styles.statusSuspended}`}>
                              {u.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>

                          {/* 7. Fecha de Registro */}
                          <td>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '-'}
                            </span>
                          </td>

                          {/* 8. Acciones */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setUserToDelete(u);
                                setModalType('deleteUser');
                              }}
                              disabled={u.id === user?.id || u.role?.name?.toLowerCase() === 'superadmin'}
                              className={styles.btnDelete}
                              title={
                                u.id === user?.id
                                  ? 'No puedes eliminar tu propia cuenta'
                                  : u.role?.name?.toLowerCase() === 'superadmin'
                                  ? 'No se puede eliminar una cuenta de SuperAdmin'
                                  : 'Eliminar usuario y registros asociados permanentemente'
                              }
                            >
                              <Trash2 size={13} />
                              <span>Eliminar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          MODAL 1: VER FICHA COMPLETA DEL REGISTRO
          ======================================================== */}
      {modalType === 'details' && selectedTenant && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                <Info size={22} className={styles.primaryIcon} />
                <h3>Ficha Completa de Registro</h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Datos íntegros registrados para el establecimiento y su administrador creador.
              </p>

              <div className={styles.detailsGrid}>
                {/* Sección 1: Datos de la Empresa / Restaurante */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsSectionTitle}>
                    <Store size={15} />
                    <span>Datos del Restaurante</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Razón Social:</span>
                    <span className={styles.detailValue}>{selectedTenant.name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Slug / URL:</span>
                    <span className={styles.detailValue} style={{ wordBreak: 'break-all' }}>
                      neofood/{selectedTenant.slug}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>NIT / Doc Fiscal:</span>
                    <span className={styles.detailValue}>{selectedTenant.document || 'No registrado'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Teléfono Local:</span>
                    <span className={styles.detailValue}>{selectedTenant.phone || 'No registrado'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Correo Sede:</span>
                    <span className={`${styles.detailValue} ${styles.detailEmail}`} title={selectedTenant.email || ''}>
                      {selectedTenant.email || 'No registrado'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Fecha Registro:</span>
                    <span className={styles.detailValue}>
                      {selectedTenant.createdAt ? new Date(selectedTenant.createdAt).toLocaleString('es-CO') : '-'}
                    </span>
                  </div>
                </div>

                {/* Sección 2: Creador / Administrador Principal */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsSectionTitle}>
                    <UserCheck size={15} />
                    <span>Creador / Administrador</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Nombre Completo:</span>
                    <span className={styles.detailValue}>{selectedTenant.creator?.name || 'Administrador'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Celular / WhatsApp:</span>
                    <span className={styles.detailValue}>
                      {selectedTenant.creator?.phone ? (
                        <a
                          href={`https://wa.me/${selectedTenant.creator.phone.replace(/[^0-9]/g, '').startsWith('57') ? selectedTenant.creator.phone.replace(/[^0-9]/g, '') : '57' + selectedTenant.creator.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.phoneLink}
                        >
                          <Phone size={11} />
                          <span>{selectedTenant.creator.phone}</span>
                        </a>
                      ) : (
                        'No registrado'
                      )}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Correo Acceso:</span>
                    <span
                      className={`${styles.detailValue} ${styles.detailEmail}`}
                      title={selectedTenant.creator?.email || selectedTenant.email || ''}
                    >
                      {selectedTenant.creator?.email || selectedTenant.email}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Rol Registrado:</span>
                    <span className={styles.detailValue}>{selectedTenant.creator?.role || 'Administrador'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Plan Actual:</span>
                    <span className={styles.detailValue}>{selectedTenant.plan?.name || 'Sin Plan'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Ciclo:</span>
                    <span className={styles.detailValue}>
                      {selectedTenant.billingCycle === 'annual'
                        ? 'Anual'
                        : selectedTenant.billingCycle === 'semiannual'
                        ? 'Semestral'
                        : selectedTenant.billingCycle === 'trial'
                        ? 'Prueba 7D'
                        : 'Mensual'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Estado Pago:</span>
                    <span className={styles.detailValue} style={{
                      color: selectedTenant.paymentStatus === 'VERIFIED' ? '#10b981' : '#f59e0b'
                    }}>
                      {selectedTenant.paymentStatus === 'VERIFIED' ? 'VERIFICADO' : 'PENDIENTE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalPrimaryBtn}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: VERIFICAR PAGO Y ACTIVAR PLAN
          ======================================================== */}
      {modalType === 'activate' && selectedTenant && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                <Check size={22} className={styles.successIcon} />
                <h3>Verificar Pago y Activar Suscripción</h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Vas a verificar el pago y habilitar de inmediato el acceso para{' '}
                <strong>"{selectedTenant.name}"</strong> (Admin: {selectedTenant.creator?.name || 'Admin'}).
              </p>

              {/* Selector de Plan */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.filterLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>
                  Confirmar Plan a Activar:
                </label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className={styles.filterSelect}
                  style={{ width: '100%' }}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.maxTables === -1 ? 'Mesas Ilimitadas' : `${p.maxTables} mesas`}, {p.maxUsers === -1 ? 'Users Ilimitados' : `${p.maxUsers} users`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Periodo a otorgar */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.filterLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>
                  Periodo a Otorgar / Ciclo de Facturación:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setActivationCycle('monthly')}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '0.5rem',
                      border: activationCycle === 'monthly' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      backgroundColor: activationCycle === 'monthly' ? '#ecfdf5' : '#ffffff',
                      color: activationCycle === 'monthly' ? '#065f46' : '#334155',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Mensual (+30d)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivationCycle('semiannual')}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '0.5rem',
                      border: activationCycle === 'semiannual' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      backgroundColor: activationCycle === 'semiannual' ? '#ecfdf5' : '#ffffff',
                      color: activationCycle === 'semiannual' ? '#065f46' : '#334155',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Semestral (+180d)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivationCycle('annual')}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '0.5rem',
                      border: activationCycle === 'annual' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      backgroundColor: activationCycle === 'annual' ? '#ecfdf5' : '#ffffff',
                      color: activationCycle === 'annual' ? '#065f46' : '#334155',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Anual (+365d)
                  </button>
                </div>
              </div>

              <div className={styles.successNotice}>
                <CheckCircle2 size={18} />
                <span>
                  Al hacer clic en <strong>Activar Plan</strong>, el estado del restaurante pasará a <strong>ACTIVO</strong> con pago verificado, y los usuarios podrán iniciar sesión y operar de inmediato.
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivatePlan}
                disabled={actionLoading}
                className={styles.modalPrimaryBtn}
              >
                {actionLoading ? 'Activando...' : 'Verificar Pago y Activar Sede'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: CAMBIAR ESTADO (SUSPENDER / REACTIVAR)
          ======================================================== */}
      {modalType === 'status' && selectedTenant && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                {selectedTenant.status === 'ACTIVE' ? (
                  <AlertTriangle size={22} className={styles.warningIcon} />
                ) : (
                  <CheckCircle2 size={22} className={styles.successIcon} />
                )}
                <h3>
                  {selectedTenant.status === 'ACTIVE'
                    ? '¿Suspender este establecimiento?'
                    : '¿Reactivar este establecimiento?'}
                </h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Estás a punto de modificar el estado de{' '}
                <strong>"{selectedTenant.name}"</strong> (Slug: <code>{selectedTenant.slug}</code>).
              </p>

              {selectedTenant.status === 'ACTIVE' ? (
                <div className={styles.alertNotice}>
                  <AlertTriangle size={18} />
                  <span>
                    Al suspenderlo, ningún usuario de este restaurante podrá iniciar sesión ni registrar
                    ventas hasta que sea reactivado.
                  </span>
                </div>
              ) : (
                <div className={styles.successNotice}>
                  <CheckCircle2 size={18} />
                  <span>
                    Al reactivarlo, el personal de este restaurante podrá operar nuevamente de inmediato.
                  </span>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={selectedTenant.status === 'ACTIVE' ? styles.modalDangerBtn : styles.modalPrimaryBtn}
              >
                {actionLoading
                  ? 'Procesando...'
                  : selectedTenant.status === 'ACTIVE'
                  ? 'Sí, Suspender Acceso'
                  : 'Sí, Reactivar Acceso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CAMBIAR NIVEL DE PLAN
          ======================================================== */}
      {modalType === 'plan' && selectedTenant && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                <Sliders size={22} className={styles.primaryIcon} />
                <h3>Modificar Plan de Suscripción</h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Selecciona el nuevo nivel de plan para <strong>"{selectedTenant.name}"</strong>.
              </p>

              <div className={styles.plansSelectorList}>
                {plans.map(p => (
                  <label
                    key={p.id}
                    className={`${styles.planOption} ${newPlanId === p.id ? styles.selectedPlanOption : ''}`}
                  >
                    <input
                      type="radio"
                      name="selectedPlan"
                      value={p.id}
                      checked={newPlanId === p.id}
                      onChange={(e) => setNewPlanId(e.target.value)}
                    />
                    <div className={styles.planOptionContent}>
                      <div className={styles.planOptionHeader}>
                        <span className={styles.planOptionName}>{p.name}</span>
                        <span className={styles.planOptionPrice}>
                          {p.priceMonthly > 0 ? `${formatCurrency(p.priceMonthly)} / mes` : 'Gratis'}
                        </span>
                      </div>
                      <p className={styles.planOptionDesc}>{p.description}</p>
                      <div className={styles.planOptionCaps}>
                        <span>🪑 Mesas: {p.maxTables === -1 ? 'Ilimitadas' : p.maxTables}</span>
                        <span>👥 Usuarios: {p.maxUsers === -1 ? 'Ilimitados' : p.maxUsers}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={actionLoading}
                className={styles.modalPrimaryBtn}
              >
                {actionLoading ? 'Actualizando...' : 'Guardar Nuevo Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: ELIMINAR RESTAURANTE DEFINITIVAMENTE
          ======================================================== */}
      {modalType === 'deleteTenant' && selectedTenant && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                <Trash2 size={22} style={{ color: '#dc2626' }} />
                <h3 style={{ color: '#b91c1c' }}>¿Eliminar Restaurante y Toda su Información?</h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Estás a punto de eliminar definitivamente a <strong>"{selectedTenant.name}"</strong> (<code>neofood/{selectedTenant.slug}</code>).
              </p>

              <div className={styles.alertNotice} style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
                <div style={{ fontSize: '0.825rem', lineHeight: '1.4' }}>
                  <strong>¡ACCIÓN IRREVERSIBLE!</strong>
                  <p style={{ marginTop: '0.35rem' }}>
                    Esta acción desaparecerá de raíz <strong>absolutamente todo lo registrado</strong> con este restaurante:
                  </p>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem', listStyleType: 'disc' }}>
                    <li>Todos los usuarios, accesos, roles y contraseñas de la sede.</li>
                    <li>Histórico completo de ventas, cobros, créditos y facturas.</li>
                    <li>Mesas, comandas y pedidos registrados.</li>
                    <li>Sesiones de caja, arqueos y movimientos de dinero.</li>
                    <li>Catálogo completo de productos, categorías, modificadores e inventario.</li>
                    <li>Gastos, compras y proveedores de la sede.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTenant}
                disabled={actionLoading}
                className={styles.modalDangerBtn}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
              >
                {actionLoading ? 'Eliminando Todo...' : 'Sí, Eliminar Restaurante y Todo lo Asociado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: ELIMINAR USUARIO DE LA PLATAFORMA
          ======================================================== */}
      {modalType === 'deleteUser' && userToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '480px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                <Trash2 size={22} style={{ color: '#dc2626' }} />
                <h3 style={{ color: '#b91c1c' }}>¿Eliminar Usuario de la Plataforma?</h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Vas a eliminar definitivamente al usuario <strong>"{userToDelete.name}"</strong> ({userToDelete.email}).
              </p>

              <div className={styles.alertNotice} style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, color: '#dc2626' }} />
                <div style={{ fontSize: '0.825rem' }}>
                  <span>
                    Se eliminará su cuenta de acceso y se desvincularán o purgarán de manera limpia sus registros asociados en el sistema sin afectar la integridad del restaurante. Esta acción no se puede deshacer.
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePlatformUser}
                disabled={actionLoading}
                className={styles.modalDangerBtn}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
              >
                {actionLoading ? 'Eliminando...' : 'Sí, Eliminar Usuario Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 7: DEPURACIÓN AUTOMÁTICA DE INACTIVOS (> 2 MESES)
          ======================================================== */}
      {modalType === 'purge' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleContainer}>
                <Trash2 size={22} style={{ color: '#e11d48' }} />
                <h3>Depurar Restaurantes Inactivos (&gt;2 Meses)</h3>
              </div>
              <button onClick={() => setModalType(null)} className={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                El sistema cuenta con una regla automática para depurar restaurantes que lleven más de <strong>60 días (2 meses)</strong> inactivos o suspendidos.
              </p>

              <div style={{
                padding: '1rem',
                backgroundColor: '#fff1f2',
                borderRadius: '0.75rem',
                border: '1px solid #fecdd3',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Clock size={24} style={{ color: '#e11d48', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '800', color: '#9f1239', fontSize: '0.9rem' }}>
                    {purgeCount} {purgeCount === 1 ? 'restaurante cumple' : 'restaurantes cumplen'} con el criterio de depuración
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#be123c', marginTop: '0.2rem' }}>
                    Estado SUSPENDED o INACTIVE sin reactivación desde hace 60+ días.
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                * El servidor ejecuta esta depuración automáticamente cada 24 horas en segundo plano. Al pulsar "Ejecutar Depuración Ahora", forzarás la eliminación inmediata de todos los que apliquen junto con todos sus datos.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalType(null)}
                className={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cerrar
              </button>
              <button
                onClick={handlePurgeInactive}
                disabled={actionLoading || purgeCount === 0}
                className={styles.modalDangerBtn}
                style={{ backgroundColor: '#e11d48', borderColor: '#e11d48', color: '#fff' }}
              >
                {actionLoading ? 'Depurando...' : `Ejecutar Depuración Ahora (${purgeCount})`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SaasDashboard;
