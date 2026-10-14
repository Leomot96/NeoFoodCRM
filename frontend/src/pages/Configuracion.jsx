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
  Sliders,
  Printer,
  FileText
} from 'lucide-react';
import configService from '../services/config.service';
import storeService from '../services/store.service';
import printerService from '../services/printerService';
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

  // Estado Impresora POS
  const [printerConfig, setPrinterConfig] = useState({
    paperWidth: '80mm',
    autoPrint: false,
    showLogo: true,
    headerText: '',
    footerText: '¡Gracias por su compra! Vuelva pronto.',
    showCustomer: true,
    showTable: true,
    showCashier: true,
    showTax: false
  });
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);
  const [printerSaveSuccess, setPrinterSaveSuccess] = useState(false);

  const plan = user?.tenant?.plan;
  const maxTables = typeof plan?.maxTables === 'number' ? plan.maxTables : -1;
  const isLimitReached = maxTables !== -1 && tables.length >= maxTables;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tableRes, methodRes, storeRes, printerRes] = await Promise.all([
        api.get('/tables'),
        configService.getPaymentMethods(),
        storeService.getStoreConfig().catch(() => null),
        printerService.getPrinterConfig().catch(() => null)
      ]);
      setTables(tableRes.data.data);
      setMethods(methodRes);
      if (storeRes) {
        setStoreData(storeRes);
        setWeeklySchedule(parseSchedule(storeRes.storeSchedule));
      }
      if (printerRes) {
        setPrinterConfig(prev => ({ ...prev, ...printerRes }));
      }
    } catch (err) { console.error(err); }
  };

  const handleSavePrinter = async (e) => {
    if (e) e.preventDefault();
    setIsSavingPrinter(true);
    setPrinterSaveSuccess(false);
    try {
      const saved = await printerService.savePrinterConfig(printerConfig);
      setPrinterConfig(prev => ({ ...prev, ...saved }));
      setPrinterSaveSuccess(true);
      setTimeout(() => setPrinterSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error guardando configuración de impresora');
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const sampleSale = {
    invoiceNumber: 'FE-000123',
    createdAt: new Date().toISOString(),
    cashier: user?.name || 'Administrador',
    tableName: 'Mesa 1',
    customer: {
      name: 'Consumidor final',
      document: '222222222222'
    },
    paymentMethod: { name: 'Efectivo' },
    details: [
      { quantity: 2, product: { name: 'Hamburguesa Especial' }, subtotal: 36000 },
      { quantity: 2, product: { name: 'Gaseosa 400ml' }, subtotal: 8000 }
    ],
    totalAmount: 44000,
    discount: 0,
    finalAmount: 44000,
    tenant: {
      name: user?.tenant?.name || storeData.name || 'NeoFood Restaurante',
      document: user?.tenant?.document || storeData.document || '900.123.456-7',
      phone: user?.tenant?.phone || storeData.phone || '+57 300 123 4567',
      address: user?.tenant?.address || storeData.address || 'Calle 10 # 5-20',
      logoUrl: user?.tenant?.logoUrl || storeData.logoUrl || null
    }
  };

  const handleTestPrint = async () => {
    await printerService.printPosTicket(sampleSale, printerConfig);
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

        <button
          type="button"
          onClick={() => setActiveTab('printer')}
          className={`${styles.configTabBtn} ${activeTab === 'printer' ? styles.configTabBtnActive : ''}`}
        >
          <div className={styles.configTabIconWrap}>
            <Printer size={20} />
          </div>
          <div className={styles.configTabInfo}>
            <span className={styles.configTabTitle}>Impresora POS</span>
            <span className={styles.configTabDesc}>Tirilla térmica 80mm / 58mm & auto-impresión</span>
          </div>
          <span className={styles.configTabBadge} style={{
            backgroundColor: '#f1f5f9',
            color: '#334155',
            fontWeight: 700
          }}>
            {printerConfig.paperWidth}
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
        ) : activeTab === 'printer' ? (
          /* PESTAÑA: IMPRESORA POS Y FORMATO TICKET */
          <div style={{ padding: '1.5rem' }}>
            {/* ENCABEZADO DE SECCIÓN */}
            <div className={styles.configCardHeader} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.configCardHeaderLeft}>
                <h3 className={styles.configCardTitle}>
                  <Printer size={20} /> Impresora POS y Formato de Tirilla
                </h3>
                <p className={styles.configCardSubtitle}>
                  Configura el formato térmico para recibos, tamaño de papel y comportamiento de auto-impresión
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="neo-btn neo-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem' }}
                  title="Enviar ticket de prueba a la impresora conectada"
                >
                  <Printer size={16} /> Probar Impresión
                </button>
              </div>
            </div>

            <div className={styles.printerLayout}>
              {/* COLUMNA IZQUIERDA: CONFIGURACIONES */}
              <form onSubmit={handleSavePrinter} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. SELECCIÓN DE ANCHO DE PAPEL */}
                <div className={styles.storeSectionCard}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sliders size={18} /> Ancho del Papel Térmico
                  </h4>
                  <p style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                    Selecciona el ancho según el modelo de tu impresora térmica (Epson, Xprinter, Bixolon, etc.)
                  </p>

                  <div className={styles.printerWidthCards}>
                    <div
                      className={`${styles.printerWidthCard} ${printerConfig.paperWidth === '80mm' ? styles.printerWidthCardActive : ''}`}
                      onClick={() => setPrinterConfig({ ...printerConfig, paperWidth: '80mm' })}
                    >
                      {printerConfig.paperWidth === '80mm' && (
                        <span className={styles.printerWidthCardBadge}>Activo</span>
                      )}
                      <div className={styles.printerWidthTitle}>
                        <FileText size={18} /> 80 mm (Estándar)
                      </div>
                      <p className={styles.printerWidthDesc}>
                        Ancho tradicional de restaurantes y puntos de venta fijos. Permite nombres completos de productos y adiciones.
                      </p>
                    </div>

                    <div
                      className={`${styles.printerWidthCard} ${printerConfig.paperWidth === '58mm' ? styles.printerWidthCardActive : ''}`}
                      onClick={() => setPrinterConfig({ ...printerConfig, paperWidth: '58mm' })}
                    >
                      {printerConfig.paperWidth === '58mm' && (
                        <span className={styles.printerWidthCardBadge}>Activo</span>
                      )}
                      <div className={styles.printerWidthTitle}>
                        <FileText size={18} /> 58 mm (Compacto)
                      </div>
                      <p className={styles.printerWidthDesc}>
                        Ideal para impresoras portátiles Bluetooth, mini impresoras de mostrador o quioscos compactos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. OPCIONES DE IMPRESIÓN Y CONTENIDO */}
                <div className={styles.storeSectionCard}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} /> Contenido del Ticket y Auto-Impresión
                  </h4>

                  <div className={styles.printerSwitchesGrid}>
                    {/* Auto Print */}
                    <div className={styles.printerToggleItem}>
                      <div className={styles.printerToggleInfo}>
                        <span className={styles.printerToggleTitle}>Auto-Imprimir al Cobrar</span>
                        <span className={styles.printerToggleDesc}>Abre el diálogo de impresión automáticamente al registrar cada venta en POS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrinterConfig({ ...printerConfig, autoPrint: !printerConfig.autoPrint })}
                        className={`${styles.printerToggleSwitch} ${printerConfig.autoPrint ? styles.printerToggleSwitchActive : ''}`}
                      >
                        <div className={styles.printerToggleThumb} />
                      </button>
                    </div>

                    {/* Mostrar Logo */}
                    <div className={styles.printerToggleItem}>
                      <div className={styles.printerToggleInfo}>
                        <span className={styles.printerToggleTitle}>Imprimir Logotipo</span>
                        <span className={styles.printerToggleDesc}>Incluye el logo del restaurante en blanco y negro en el encabezado</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrinterConfig({ ...printerConfig, showLogo: !printerConfig.showLogo })}
                        className={`${styles.printerToggleSwitch} ${printerConfig.showLogo ? styles.printerToggleSwitchActive : ''}`}
                      >
                        <div className={styles.printerToggleThumb} />
                      </button>
                    </div>

                    {/* Datos del Cliente */}
                    <div className={styles.printerToggleItem}>
                      <div className={styles.printerToggleInfo}>
                        <span className={styles.printerToggleTitle}>Datos del Cliente</span>
                        <span className={styles.printerToggleDesc}>Imprime Nombre y Documento (o "Consumidor final" / 222222222222)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrinterConfig({ ...printerConfig, showCustomer: !printerConfig.showCustomer })}
                        className={`${styles.printerToggleSwitch} ${printerConfig.showCustomer ? styles.printerToggleSwitchActive : ''}`}
                      >
                        <div className={styles.printerToggleThumb} />
                      </button>
                    </div>

                    {/* Mesa y Ubicación */}
                    <div className={styles.printerToggleItem}>
                      <div className={styles.printerToggleInfo}>
                        <span className={styles.printerToggleTitle}>Mesa y Tipo de Pedido</span>
                        <span className={styles.printerToggleDesc}>Indica el número de mesa, para llevar o domicilio</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrinterConfig({ ...printerConfig, showTable: !printerConfig.showTable })}
                        className={`${styles.printerToggleSwitch} ${printerConfig.showTable ? styles.printerToggleSwitchActive : ''}`}
                      >
                        <div className={styles.printerToggleThumb} />
                      </button>
                    </div>

                    {/* Nombre del Cajero */}
                    <div className={styles.printerToggleItem}>
                      <div className={styles.printerToggleInfo}>
                        <span className={styles.printerToggleTitle}>Nombre del Cajero</span>
                        <span className={styles.printerToggleDesc}>Muestra quién atendió o cobró la orden</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrinterConfig({ ...printerConfig, showCashier: !printerConfig.showCashier })}
                        className={`${styles.printerToggleSwitch} ${printerConfig.showCashier ? styles.printerToggleSwitchActive : ''}`}
                      >
                        <div className={styles.printerToggleThumb} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. MENSAJES PERSONALIZADOS */}
                <div className={styles.storeSectionCard}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} /> Textos Personalizados del Ticket
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className={styles.storeFieldBox}>
                      <label className={styles.storeLabel}>Mensaje de Encabezado (Opcional - Slogan o Lema)</label>
                      <input
                        type="text"
                        value={printerConfig.headerText || ''}
                        onChange={(e) => setPrinterConfig({ ...printerConfig, headerText: e.target.value })}
                        placeholder="Ej: ¡El mejor sabor de la ciudad!"
                        className={styles.storeInput}
                      />
                    </div>

                    <div className={styles.storeFieldBox}>
                      <label className={styles.storeLabel}>Mensaje de Pie de Página (Agradecimiento o Leyenda)</label>
                      <textarea
                        rows={2}
                        value={printerConfig.footerText || ''}
                        onChange={(e) => setPrinterConfig({ ...printerConfig, footerText: e.target.value })}
                        placeholder="Ej: ¡Gracias por su compra! Vuelva pronto. Propina voluntaria sugerida."
                        className={styles.storeInput}
                      />
                    </div>
                  </div>
                </div>

                {/* BOTÓN GUARDAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                  {printerSaveSuccess && (
                    <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={16} /> ¡Configuración de impresora guardada con éxito!
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingPrinter}
                    className="neo-btn neo-btn-primary flex items-center gap-2 px-6 py-3 text-sm font-bold shadow-md"
                    style={{ borderRadius: '0.75rem' }}
                  >
                    {isSavingPrinter ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{isSavingPrinter ? 'Guardando...' : 'Guardar Configuración de Impresora'}</span>
                  </button>
                </div>
              </form>

              {/* COLUMNA DERECHA: VISTA PREVIA EN VIVO DE LA TIRILLA TÉRMICA */}
              <div className={styles.printerPreviewCard}>
                <div className={styles.printerPreviewHeader}>
                  <div className={styles.printerPreviewTitle}>
                    <Eye size={16} /> Vista Previa Tirilla ({printerConfig.paperWidth})
                  </div>
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    className="neo-btn neo-btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Printer size={14} /> Imprimir Muestra
                  </button>
                </div>

                <div
                  className={`${styles.printerReceiptPaper} ${
                    printerConfig.paperWidth === '58mm' ? styles.printerReceiptPaper58 : styles.printerReceiptPaper80
                  }`}
                >
                  <iframe
                    key={`${printerConfig.paperWidth}-${printerConfig.showLogo}-${printerConfig.showCustomer}-${printerConfig.headerText}-${printerConfig.footerText}`}
                    srcDoc={printerService.generatePosTicketHtml(sampleSale, printerConfig)}
                    title="Live Ticket Preview"
                    className={styles.printerReceiptFrame}
                  />
                </div>
                <p style={{ fontSize: '0.7rem', color: '#a1a1aa', textAlign: 'center', margin: 0 }}>
                  Renderizado en vivo con tipografía e interlineado óptimo para cabezal térmico POS.
                </p>
              </div>
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
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center justify-between w-full sm:w-auto">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
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

                              {!dayItem.isOpen && (
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-200/70 px-2.5 py-0.5 rounded-full sm:hidden">
                                  Cerrado
                                </span>
                              )}
                            </div>

                            {dayItem.isOpen ? (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                                <input
                                  type="time"
                                  value={dayItem.openTime || '11:00'}
                                  onChange={(e) => handleDayTimeChange(index, 'openTime', e.target.value)}
                                  className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-semibold focus:border-indigo-500 outline-none flex-1 sm:flex-none sm:w-[90px] text-center"
                                />
                                <span className="text-[11px] text-slate-400 font-medium">-</span>
                                <input
                                  type="time"
                                  value={dayItem.closeTime || '22:00'}
                                  onChange={(e) => handleDayTimeChange(index, 'closeTime', e.target.value)}
                                  className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-semibold focus:border-indigo-500 outline-none flex-1 sm:flex-none sm:w-[90px] text-center"
                                />

                                {!dayItem.hasSecondShift && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSecondShift(index, true)}
                                    className="p-1 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-dashed border-indigo-300 transition-colors ml-0.5 shrink-0"
                                    title="Agregar 2do turno a este día"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="hidden sm:flex items-center justify-end flex-1">
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                                  Cerrado
                                </span>
                              </div>
                            )}
                          </div>

                          {/* FILA SEGUNDO TURNO (SI ESTÁ ACTIVO Y TIENE 2DO TURNO) */}
                          {dayItem.isOpen && dayItem.hasSecondShift && (
                            <div className="flex items-center justify-end gap-1.5 pt-1.5 mt-1 border-t border-slate-100 text-xs flex-wrap sm:flex-nowrap">
                              <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                2do Turno:
                              </span>
                              <input
                                type="time"
                                value={dayItem.openTime2 || '18:00'}
                                onChange={(e) => handleDayTimeChange(index, 'openTime2', e.target.value)}
                                className="text-xs px-2 py-1 bg-white border border-amber-200 rounded-md text-slate-800 font-semibold focus:border-amber-500 outline-none flex-1 sm:flex-none sm:w-[90px] text-center"
                              />
                              <span className="text-[11px] text-slate-400 font-medium">-</span>
                              <input
                                type="time"
                                value={dayItem.closeTime2 || '23:00'}
                                onChange={(e) => handleDayTimeChange(index, 'closeTime2', e.target.value)}
                                className="text-xs px-2 py-1 bg-white border border-amber-200 rounded-md text-slate-800 font-semibold focus:border-amber-500 outline-none flex-1 sm:flex-none sm:w-[90px] text-center"
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleSecondShift(index, false)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                                title="Eliminar segundo turno"
                              >
                                <Trash2 size={14} />
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