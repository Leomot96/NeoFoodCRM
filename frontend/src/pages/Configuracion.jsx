import React, { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  Plus,
  Trash2,
  LayoutGrid,
  Utensils,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertTriangle,
  Store,
  Copy,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  MapPin,
  Megaphone,
  Save,
  Check,
  Loader2,
  Clock,
  Eye,
  Sliders
} from 'lucide-react';
import configService from '../services/config.service';
import storeService from '../services/store.service';
import { getFullImageUrl } from '../utils/imageUrl';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Configuracion.module.css';

const DEFAULT_WEEKLY_SCHEDULE = [
  { dayIndex: 1, dayName: 'Lunes', isOpen: true, openTime: '11:00', closeTime: '22:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' },
  { dayIndex: 2, dayName: 'Martes', isOpen: true, openTime: '11:00', closeTime: '22:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' },
  { dayIndex: 3, dayName: 'Miércoles', isOpen: true, openTime: '11:00', closeTime: '22:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' },
  { dayIndex: 4, dayName: 'Jueves', isOpen: true, openTime: '11:00', closeTime: '22:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' },
  { dayIndex: 5, dayName: 'Viernes', isOpen: true, openTime: '11:00', closeTime: '23:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' },
  { dayIndex: 6, dayName: 'Sábado', isOpen: true, openTime: '11:00', closeTime: '23:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' },
  { dayIndex: 0, dayName: 'Domingo', isOpen: true, openTime: '11:00', closeTime: '22:00', hasSecondShift: false, openTime2: '18:00', closeTime2: '23:00' }
];

const parseSchedule = (scheduleRaw) => {
  if (!scheduleRaw) return DEFAULT_WEEKLY_SCHEDULE;
  try {
    const parsed = JSON.parse(scheduleRaw);
    if (Array.isArray(parsed) && parsed.length === 7) {
      return parsed.map((item, idx) => ({
        dayIndex: item.dayIndex !== undefined ? item.dayIndex : DEFAULT_WEEKLY_SCHEDULE[idx].dayIndex,
        dayName: item.dayName || DEFAULT_WEEKLY_SCHEDULE[idx].dayName,
        isOpen: Boolean(item.isOpen),
        openTime: item.openTime || '11:00',
        closeTime: item.closeTime || '22:00',
        hasSecondShift: Boolean(item.hasSecondShift),
        openTime2: item.openTime2 || '18:00',
        closeTime2: item.closeTime2 || '23:00'
      }));
    }
  } catch (err) {
    // Fallback a default si es texto antiguo o no parseable
  }
  return DEFAULT_WEEKLY_SCHEDULE;
};

const Configuracion = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'payments' | 'store'
  const [tables, setTables] = useState([]);
  const [methods, setMethods] = useState([]);
  const [newTableName, setNewTableName] = useState('');
  const [newMethodName, setNewMethodName] = useState('');

  // Estado Tienda Virtual
  const [storeData, setStoreData] = useState({
    name: '',
    document: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    logoUrl: null,
    storeSchedule: '',
    storeDescription: '',
    storeAnnouncement: '',
    isStoreActive: true,
    slug: ''
  });
  const [weeklySchedule, setWeeklySchedule] = useState(DEFAULT_WEEKLY_SCHEDULE);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const plan = user?.tenant?.plan;
  const maxTables = typeof plan?.maxTables === 'number' ? plan.maxTables : -1;
  const isLimitReached = maxTables !== -1 && tables.length >= maxTables;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tableRes, methodRes, storeRes] = await Promise.all([
        api.get('/tables'),
        configService.getPaymentMethods(),
        storeService.getStoreConfig().catch(() => null)
      ]);
      setTables(tableRes.data.data);
      setMethods(methodRes);
      if (storeRes) {
        setStoreData(storeRes);
        setWeeklySchedule(parseSchedule(storeRes.storeSchedule));
      }
    } catch (err) { console.error(err); }
  };

  // --- LÓGICA HORARIOS TIENDA VIRTUAL ---
  const handleDayToggle = (dayIdx) => {
    setWeeklySchedule(prev => {
      const copy = [...prev];
      copy[dayIdx] = { ...copy[dayIdx], isOpen: !copy[dayIdx].isOpen };
      return copy;
    });
  };

  const handleDayTimeChange = (dayIdx, field, value) => {
    setWeeklySchedule(prev => {
      const copy = [...prev];
      copy[dayIdx] = { ...copy[dayIdx], [field]: value };
      return copy;
    });
  };

  const handleToggleSecondShift = (dayIdx, enable) => {
    setWeeklySchedule(prev => {
      const copy = [...prev];
      copy[dayIdx] = {
        ...copy[dayIdx],
        hasSecondShift: enable,
        openTime2: copy[dayIdx].openTime2 || '18:00',
        closeTime2: copy[dayIdx].closeTime2 || '23:00'
      };
      return copy;
    });
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar el logotipo del restaurante?')) {
      return;
    }
    setIsDeletingLogo(true);
    try {
      await storeService.deleteLogo();
      setStoreData(prev => ({ ...prev, logoUrl: null }));
      alert('¡Logotipo eliminado exitosamente!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el logotipo');
    } finally {
      setIsDeletingLogo(false);
    }
  };

  // --- LÓGICA TIENDA VIRTUAL ---
  const handleSaveStore = async (e) => {
    e.preventDefault();
    setIsSavingStore(true);
    try {
      const scheduleString = JSON.stringify(weeklySchedule);
      const payload = {
        ...storeData,
        name: (storeData.name || '').trim(),
        whatsappNumber: (storeData.whatsappNumber || '').trim(),
        phone: (storeData.phone || '').trim(),
        document: (storeData.document || '').trim(),
        address: (storeData.address || '').trim(),
        storeSchedule: scheduleString,
        storeAnnouncement: (storeData.storeAnnouncement || '').trim(),
        storeDescription: (storeData.storeDescription || '').trim()
      };
      const updated = await storeService.updateStoreConfig(payload);
      setStoreData(prev => ({ ...prev, ...updated }));
      if (updated.storeSchedule) {
        setWeeklySchedule(parseSchedule(updated.storeSchedule));
      }
      alert('¡Configuración de la tienda guardada con éxito!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleUploadLogo = async (file) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const res = await storeService.uploadLogo(file);
      setStoreData(prev => ({ ...prev, logoUrl: res.logoUrl }));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al subir logotipo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCopyLink = () => {
    const storeUrl = `${window.location.origin}/tienda/${storeData.slug || user?.tenant?.slug || 'sede-principal'}`;
    navigator.clipboard.writeText(storeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // --- LÓGICA MESAS ---
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    if (isLimitReached) {
      alert(`Has alcanzado el límite de ${maxTables} mesas permitidas en tu ${plan?.name || 'plan actual'}. Para registrar más mesas, actualiza a Plan Pro o Enterprise.`);
      return;
    }

    try {
      await api.post('/tables', { name: newTableName });
      setNewTableName('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al crear mesa');
    }
  };

  const handleDeleteTable = async (id) => {
    if (window.confirm('¿Eliminar mesa?')) {
      await api.delete(`/tables/${id}`);
      loadData();
    }
  };

  // --- LÓGICA MÉTODOS PAGO ---
  const handleAddMethod = async (e) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    try {
      await configService.createPaymentMethod(newMethodName);
      setNewMethodName('');
      loadData();
    } catch (err) { alert('Error al crear método'); }
  };

  const handleDeleteMethod = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el método de pago "${name}"? Esta acción solo se completará si no tiene historial de ventas asociadas.`)) {
      try {
        await configService.deletePaymentMethod(id);
        loadData();
      } catch (err) {
        alert(err.response?.data?.message || 'Error al eliminar método de pago');
      }
    }
  };

  return (
    <div className={styles.configContainer}>
      {/* HEADER INSTITUCIONAL */}
      <div className={styles.configHeader}>
        <h1 className={styles.configTitle}>
          <Settings style={{ color: 'var(--primary)' }} /> Configuración del Sistema
        </h1>
        <p className={styles.configSubtitle}>
          Administra la distribución de mesas del salón y las formas de pago aceptadas
        </p>
      </div>

      {/* TABS DE NAVEGACIÓN FULL-WIDTH Y ESTILIZADOS */}
      <div className={styles.configTabsNav}>
        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`${styles.configTabBtn} ${activeTab === 'tables' ? styles.configTabBtnActive : ''}`}
        >
          <div className={styles.configTabIconWrap}>
            <LayoutGrid size={20} />
          </div>
          <div className={styles.configTabInfo}>
            <span className={styles.configTabTitle}>Mesas del Salón</span>
            <span className={styles.configTabDesc}>Distribución física & comandas</span>
          </div>
          <span className={styles.configTabBadge}>{tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`${styles.configTabBtn} ${activeTab === 'payments' ? styles.configTabBtnActive : ''}`}
        >
          <div className={styles.configTabIconWrap}>
            <CreditCard size={20} />
          </div>
          <div className={styles.configTabInfo}>
            <span className={styles.configTabTitle}>Métodos de Pago</span>
            <span className={styles.configTabDesc}>Caja, datáfono & facturación</span>
          </div>
          <span className={styles.configTabBadge}>{methods.length} {methods.length === 1 ? 'método' : 'métodos'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`${styles.configTabBtn} ${activeTab === 'store' ? styles.configTabBtnActive : ''}`}
        >
          <div className={styles.configTabIconWrap}>
            <Store size={20} />
          </div>
          <div className={styles.configTabInfo}>
            <span className={styles.configTabTitle}>Tienda Virtual</span>
            <span className={styles.configTabDesc}>Catálogo online & pedidos WhatsApp</span>
          </div>
          <span className={styles.configTabBadge} style={{
            backgroundColor: storeData.isStoreActive ? '#dcfce7' : '#fee2e2',
            color: storeData.isStoreActive ? '#15803d' : '#b91c1c',
            borderColor: storeData.isStoreActive ? '#bbf7d0' : '#fecaca'
          }}>
            {storeData.isStoreActive ? '● Activa' : '○ Pausada'}
          </span>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className={styles.configCard}>
        {activeTab === 'tables' ? (
          <div>
            {/* ENCABEZADO DE SECCIÓN ESTILO TABLA */}
            <div className={styles.configCardHeader}>
              <div className={styles.configCardHeaderLeft}>
                <h3 className={styles.configCardTitle}>
                  <Utensils size={18} /> Salón y Distribución de Mesas
                </h3>
                <p className={styles.configCardSubtitle}>
                  Mesas registradas para toma de pedidos y gestión de comandas en punto de venta
                </p>
              </div>
              <span className={styles.configCardBadge} style={isLimitReached ? { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' } : {}}>
                {tables.length} {maxTables !== -1 ? `/ ${maxTables}` : ''} {tables.length === 1 ? 'mesa' : 'mesas'} {isLimitReached ? '(Límite alcanzado)' : 'activas'}
              </span>
            </div>

            <div className={styles.configCardBody}>
              {/* ALERTA DE LÍMITE ALCANZADO SI APLICA */}
              {isLimitReached && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.875rem'
                }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
                  <div>
                    <strong>Límite de mesas alcanzado:</strong> Tu plan actual ({plan?.name || 'Básico'}) permite un máximo de {maxTables} mesas. No podrás crear más mesas hasta que actualices tu plan en administración.
                  </div>
                </div>
              )}

              {/* FORMULARIO AGREGAR MESA */}
              <div className={styles.configAddSection}>
                <label className={styles.configAddLabel}>
                  <Plus size={14} /> Registrar Nueva Mesa
                </label>
                <form onSubmit={handleAddTable} className={styles.configAddForm}>
                  <input
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder={isLimitReached ? "Límite de mesas alcanzado en tu plan" : "Ej: Mesa 1, Terraza 4, Barra VIP..."}
                    className="neo-input"
                    disabled={isLimitReached}
                    style={{ flex: 1, ...(isLimitReached ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  />
                  <button
                    type="submit"
                    disabled={isLimitReached}
                    className="neo-btn neo-btn-primary"
                    style={{ flexShrink: 0, ...(isLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                    title={isLimitReached ? "Límite de mesas alcanzado para tu plan" : "Crear mesa"}
                  >
                    <Plus size={18} /> Crear Mesa
                  </button>
                </form>
              </div>

              {/* GRID O ESTADO VACÍO */}
              {tables.length === 0 ? (
                <div className="neo-empty" style={{ border: '1.5px dashed #cbd5e1', borderRadius: '1rem', padding: '3rem 1.5rem', backgroundColor: '#f8fafc' }}>
                  <LayoutGrid size={40} style={{ marginBottom: '0.75rem', color: '#94a3b8' }} />
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No hay mesas configuradas</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Ingresa un nombre arriba para crear tu primera mesa y comenzar a recibir órdenes.
                  </p>
                </div>
              ) : (
                <div className={styles.configTablesGrid}>
                  {tables.map(t => (
                    <div key={t.id} className={styles.configTableCard}>
                      <div className={styles.configTableCardLeft}>
                        <div className={styles.configTableIconBox}>
                          <Utensils size={18} />
                        </div>
                        <div>
                          <h4 className={styles.configTableName}>{t.name}</h4>
                          <span className={styles.configTableStatus}>
                            <span className={styles.configTableDot}></span> Habilitada
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTable(t.id)}
                        className="neo-action-icon-btn danger"
                        title="Eliminar mesa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'payments' ? (
          <div>
            {/* ENCABEZADO DE SECCIÓN ESTILO TABLA */}
            <div className={styles.configCardHeader}>
              <div className={styles.configCardHeaderLeft}>
                <h3 className={styles.configCardTitle}>
                  <CreditCard size={18} /> Formas y Métodos de Cobro
                </h3>
                <p className={styles.configCardSubtitle}>
                  Opciones disponibles para liquidar facturas y cuadre en el módulo de caja
                </p>
              </div>
              <span className={styles.configCardBadge}>
                {methods.filter(m => m.isActive).length} activos de {methods.length} totales
              </span>
            </div>

            <div className={styles.configCardBody}>
              {/* FORMULARIO AGREGAR MÉTODO */}
              <div className={styles.configAddSection}>
                <label className={styles.configAddLabel}>
                  <Plus size={14} /> Registrar Nuevo Método de Pago
                </label>
                <form onSubmit={handleAddMethod} className={styles.configAddForm}>
                  <input
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    placeholder="Ej: Nequi, Daviplata, Tarjeta Débito, Transferencia..."
                    className="neo-input"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="neo-btn neo-btn-primary" style={{ flexShrink: 0 }}>
                    <Plus size={18} /> Agregar Método
                  </button>
                </form>
              </div>

              {/* LISTA O ESTADO VACÍO */}
              {methods.length === 0 ? (
                <div className="neo-empty" style={{ border: '1.5px dashed #cbd5e1', borderRadius: '1rem', padding: '3rem 1.5rem', backgroundColor: '#f8fafc' }}>
                  <CreditCard size={40} style={{ marginBottom: '0.75rem', color: '#94a3b8' }} />
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>No hay métodos de pago registrados</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Agrega métodos como Efectivo, Nequi, Tarjeta o Transferencia bancaria.
                  </p>
                </div>
              ) : (
                <div className={styles.configMethodsList}>
                  {methods.map(m => (
                    <div
                      key={m.id}
                      className={`${styles.configMethodRow} ${!m.isActive ? styles.configMethodRowInactive : ''}`}
                    >
                      <div className={styles.configMethodLeft}>
                        <div className={`${styles.configMethodIconBox} ${m.isActive ? styles.iconActive : styles.iconInactive}`}>
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <h4 className={styles.configMethodName}>{m.name}</h4>
                          <span className={styles.configMethodDesc}>
                            {m.isActive ? 'Disponible para cobro en caja y facturación' : 'Desactivado temporalmente del punto de venta'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => configService.togglePaymentMethod(m.id).then(loadData)}
                          className={`${styles.configStatusBadgeBtn} ${m.isActive ? styles.configStatusBadgeBtnActive : styles.configStatusBadgeBtnInactive}`}
                          title={m.isActive ? 'Clic para desactivar método' : 'Clic para activar método'}
                        >
                          {m.isActive ? (
                            <>
                              <CheckCircle size={15} /> Activo
                            </>
                          ) : (
                            <>
                              <XCircle size={15} /> Inactivo
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMethod(m.id, m.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.45rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                          title="Eliminar método de pago"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PESTAÑA: TIENDA VIRTUAL */
          <div className={styles.storeContainer} style={{ padding: '1.5rem' }}>

            {/* BANNER ENLACE TIENDA */}
            <div className={styles.storeLinkCard}>
              <div className={styles.storeLinkInfo}>
                <h3 className={styles.storeLinkTitle}>
                  <Store size={22} />
                  <span>Tu Tienda Virtual Pública</span>
                </h3>
                <p className={styles.storeLinkDesc}>
                  Comparte este enlace con tus clientes por WhatsApp, Instagram, redes sociales o código QR para recibir pedidos directamente.
                </p>
                <div className={styles.storeLinkUrlBox}>
                  <span>{`${window.location.origin}/tienda/${storeData.slug || user?.tenant?.slug || 'sede-principal'}`}</span>
                </div>
              </div>
              <div className={styles.storeLinkActions}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`${styles.storeActionBtn} ${styles.storeActionBtnOutline}`}
                  title="Copiar enlace de la tienda"
                >
                  {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copySuccess ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                </button>
                <a
                  href={`/tienda/${storeData.slug || user?.tenant?.slug || 'sede-principal'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.storeActionBtn} ${styles.storeActionBtnPrimary}`}
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={16} />
                  <span>Ver mi Tienda</span>
                </a>
              </div>
            </div>

            {/* FORMULARIO DE CONFIGURACIÓN */}
            <form onSubmit={handleSaveStore} className="flex flex-col gap-6">

              {/* SECCIÓN 1: IDENTIDAD VISUAL & HORARIOS DE ATENCIÓN */}
              <div className={styles.storeSectionCard}>
                <div className={styles.storeSectionHeader}>
                  <h4 className={styles.storeSectionTitle}>
                    <ImageIcon size={18} style={{ color: 'var(--primary, #4f46e5)' }} />
                    <span>Identidad Visual & Horario de Atención</span>
                  </h4>
                  {/* Switch On/Off de la tienda */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <span className="text-xs font-bold text-gray-700">
                      {storeData.isStoreActive ? '🟢 Tienda Abierta' : '🔴 Tienda en Pausa'}
                    </span>
                    <input
                      type="checkbox"
                      checked={storeData.isStoreActive}
                      onChange={(e) => setStoreData({ ...storeData, isStoreActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                  </label>
                </div>

                <div className={styles.storeUploadGroup}>
                  {/* COLUMNA IZQUIERDA: LOGOTIPO (1fr) */}
                  <div className={styles.storeFieldBox}>
                    <div className="flex items-center justify-between mb-1">
                      <label className={styles.storeLabel}>
                        <ImageIcon size={16} style={{ color: 'var(--primary, #4f46e5)' }} />
                        <span>Logotipo del Restaurante</span>
                      </label>
                      <span className="text-[11px] text-slate-400">PNG, JPG o WebP</span>
                    </div>

                    {storeData.logoUrl ? (
                      <div className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl bg-slate-50/80 gap-3 text-center h-full min-h-[220px]">
                        <div className="w-40 h-40 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] rounded-2xl border-2 border-slate-100 shadow-md bg-white overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={getFullImageUrl(storeData.logoUrl)}
                            alt="Logo del Restaurante"
                            className="w-full h-full object-cover block"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold text-slate-800">
                            {storeData.name || 'Logotipo actual'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Visible en tu tienda virtual
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs">
                            <Upload size={13} />
                            <span>Cambiar</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={isUploadingLogo}
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleUploadLogo(e.target.files[0]);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleDeleteLogo}
                            disabled={isDeletingLogo}
                            className="text-xs font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                            title="Eliminar logotipo"
                          >
                            <Trash2 size={13} />
                            <span>{isDeletingLogo ? '...' : 'Eliminar logo'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className={`${styles.storeUploadBox} h-full min-h-[220px] hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer`}>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={isUploadingLogo}
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadLogo(e.target.files[0]);
                          }}
                        />
                        {isUploadingLogo ? (
                          <div className="flex flex-col items-center gap-2 text-indigo-600 py-6">
                            <Loader2 size={28} className="animate-spin" />
                            <span className="text-xs font-bold">Subiendo logotipo...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs border border-indigo-100">
                              <Upload size={22} />
                            </div>
                            <span className="text-sm font-extrabold text-slate-800">Subir Logotipo</span>
                            <span className="text-xs text-slate-400">Recomendado cuadrado (500 x 500 px)</span>
                          </div>
                        )}
                      </label>
                    )}
                  </div>

                  {/* COLUMNA DERECHA: HORARIO SEMANAL (2fr) */}
                  <div className={styles.storeFieldBox}>
                    <div className="flex items-center justify-between mb-1">
                      <label className={styles.storeLabel}>
                        <Clock size={16} style={{ color: 'var(--primary, #4f46e5)' }} />
                        <span>Horarios de Atención Semanal</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Marca los días que abres
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-200/80">
                      {weeklySchedule.map((dayItem, index) => (
                        <div
                          key={dayItem.dayIndex}
                          className={`py-1.5 px-3 rounded-xl border transition-colors ${dayItem.isOpen ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100/50 border-slate-200/40'
                            }`}
                        >
                          {/* FILA PRINCIPAL: CHECKBOX + NOMBRE + HORAS O CERRADO */}
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none min-w-[110px] shrink-0">
                              <input
                                type="checkbox"
                                checked={Boolean(dayItem.isOpen)}
                                onChange={() => handleDayToggle(index)}
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className={`text-xs ${dayItem.isOpen ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>
                                {dayItem.dayName}:
                              </span>
                            </label>

                            {dayItem.isOpen ? (
                              <div className="flex items-center gap-1.5 flex-1 justify-end">
                                <input
                                  type="time"
                                  value={dayItem.openTime || '11:00'}
                                  onChange={(e) => handleDayTimeChange(index, 'openTime', e.target.value)}
                                  className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-800 font-semibold focus:border-indigo-500 outline-none w-[90px]"
                                />
                                <span className="text-[11px] text-slate-400 font-medium">-</span>
                                <input
                                  type="time"
                                  value={dayItem.closeTime || '22:00'}
                                  onChange={(e) => handleDayTimeChange(index, 'closeTime', e.target.value)}
                                  className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-800 font-semibold focus:border-indigo-500 outline-none w-[90px]"
                                />

                                {!dayItem.hasSecondShift && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSecondShift(index, true)}
                                    className="p-1 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-dashed border-indigo-300 transition-colors ml-0.5"
                                    title="Agregar 2do turno a este día"
                                  >
                                    <Plus size={13} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-end flex-1">
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                                  Cerrado
                                </span>
                              </div>
                            )}
                          </div>

                          {/* FILA SEGUNDO TURNO (SI ESTÁ ACTIVO Y TIENE 2DO TURNO) */}
                          {dayItem.isOpen && dayItem.hasSecondShift && (
                            <div className="flex items-center justify-end gap-1.5 pt-1.5 mt-1 border-t border-slate-100 text-xs">
                              <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                2do Turno:
                              </span>
                              <input
                                type="time"
                                value={dayItem.openTime2 || '18:00'}
                                onChange={(e) => handleDayTimeChange(index, 'openTime2', e.target.value)}
                                className="text-xs px-2 py-0.5 bg-white border border-amber-200 rounded-md text-slate-800 font-semibold focus:border-amber-500 outline-none w-[90px]"
                              />
                              <span className="text-[11px] text-slate-400 font-medium">-</span>
                              <input
                                type="time"
                                value={dayItem.closeTime2 || '23:00'}
                                onChange={(e) => handleDayTimeChange(index, 'closeTime2', e.target.value)}
                                className="text-xs px-2 py-0.5 bg-white border border-amber-200 rounded-md text-slate-800 font-semibold focus:border-amber-500 outline-none w-[90px]"
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleSecondShift(index, false)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Eliminar segundo turno"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DEL RESTAURANTE & WHATSAPP */}
              <div className={styles.storeSectionCard}>
                <div className={styles.storeSectionHeader}>
                  <h4 className={styles.storeSectionTitle}>
                    <MapPin size={18} style={{ color: 'var(--primary, #4f46e5)' }} />
                    <span>Datos de Contacto & Recepción de Pedidos</span>
                  </h4>
                </div>

                <div className={styles.storeFormGrid}>
                  <div className={styles.storeFieldBox}>
                    <label className={styles.storeLabel}>Nombre Comercial del Restaurante *</label>
                    <input
                      required
                      type="text"
                      value={storeData.name || ''}
                      onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                      className={styles.storeInput}
                      placeholder="Ej. Extrema Burger"
                    />
                  </div>

                  <div className={styles.storeFieldBox}>
                    <label className={styles.storeLabel}>NIT o Cédula Fiscal</label>
                    <input
                      type="text"
                      value={storeData.document || ''}
                      onChange={(e) => setStoreData({ ...storeData, document: e.target.value })}
                      className={styles.storeInput}
                      placeholder="Ej. 900.123.456-7"
                    />
                  </div>

                  {/* WHATSAPP OFICIAL CON DESTACADO */}
                  <div className={styles.storeFieldBox}>
                    <label className={styles.storeLabel}>
                      <Phone size={15} style={{ color: '#16a34a' }} />
                      <span className="text-emerald-700 font-extrabold">WhatsApp Oficial para Pedidos *</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={storeData.whatsappNumber || ''}
                      onChange={(e) => setStoreData({ ...storeData, whatsappNumber: e.target.value })}
                      className={styles.storeInput}
                      style={{ borderColor: '#86efac', backgroundColor: '#f0fdf4' }}
                      placeholder="Ej. 573001234567 (con indicativo de país)"
                    />
                    <span className="text-[11px] text-emerald-600 font-medium">
                      📱 Aquí tus clientes enviarán automáticamente el resumen y comprobante de su compra.
                    </span>
                  </div>

                  <div className={styles.storeFieldBox}>
                    <label className={styles.storeLabel}>Teléfono Fijo / Secundario</label>
                    <input
                      type="text"
                      value={storeData.phone || ''}
                      onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                      className={styles.storeInput}
                      placeholder="Ej. (601) 2345678"
                    />
                  </div>

                  <div className={`${styles.storeFieldBox} ${styles.storeFieldBoxFull}`}>
                    <label className={styles.storeLabel}>Dirección del Establecimiento *</label>
                    <input
                      required
                      type="text"
                      value={storeData.address || ''}
                      onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                      className={styles.storeInput}
                      placeholder="Ej. Carrera 15 # 85-30, Local 2"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: ANUNCIO Y MENSAJE DE LA TIENDA */}
              <div className={styles.storeSectionCard}>
                <div className={styles.storeSectionHeader}>
                  <h4 className={styles.storeSectionTitle}>
                    <Megaphone size={18} style={{ color: 'var(--primary, #4f46e5)' }} />
                    <span>Anuncio & Mensajes para Clientes</span>
                  </h4>
                </div>

                <div className={styles.storeFormGrid}>
                  <div className={`${styles.storeFieldBox} ${styles.storeFieldBoxFull}`}>
                    <label className={styles.storeLabel}>
                      <Megaphone size={15} style={{ color: '#d97706' }} />
                      <span>Anuncio Destacado / Promoción (Aparece en la cabecera de la tienda)</span>
                    </label>
                    <input
                      type="text"
                      value={storeData.storeAnnouncement || ''}
                      onChange={(e) => setStoreData({ ...storeData, storeAnnouncement: e.target.value })}
                      className={styles.storeInput}
                      placeholder="Ej. 🎉 ¡Envíos gratis en compras superiores a $35.000! Horario: 12:00 PM a 10:00 PM"
                    />
                  </div>

                  <div className={`${styles.storeFieldBox} ${styles.storeFieldBoxFull}`}>
                    <label className={styles.storeLabel}>
                      <MessageSquare size={15} style={{ color: 'var(--primary, #4f46e5)' }} />
                      <span>Descripción o Lema Comercial</span>
                    </label>
                    <textarea
                      rows={2}
                      value={storeData.storeDescription || ''}
                      onChange={(e) => setStoreData({ ...storeData, storeDescription: e.target.value })}
                      className={styles.storeInput}
                      placeholder="Ej. Las mejores hamburguesas artesanales de la ciudad, carnes maduradas y pan brioche horneado a diario."
                    />
                  </div>
                </div>
              </div>

              {/* BOTÓN GUARDAR CAMBIOS */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="neo-btn neo-btn-primary flex items-center gap-2 px-6 py-3 text-sm font-bold shadow-md"
                  style={{ borderRadius: '0.75rem' }}
                >
                  {isSavingStore ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{isSavingStore ? 'Guardando cambios...' : 'Guardar Configuración de la Tienda'}</span>
                </button>
              </div>

            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuracion;