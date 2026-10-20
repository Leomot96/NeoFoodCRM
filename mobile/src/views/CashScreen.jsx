import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Lock, Unlock, Clock, Calendar, 
  Receipt, User, CheckCircle2, AlertCircle, X, ChevronRight, Store,
  Banknote, CreditCard, Smartphone, Eye, EyeOff, Plus, Minus,
  ArrowUpCircle, ArrowDownCircle, Search, Sparkles, Edit3, Check
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './CashScreen.module.css';

export const CashScreen = ({ initialCustomerSearch = '', onClearCustomerSearch }) => {
  const { user, tenant, triggerHaptic } = useAuth();
  const [activeView, setActiveView] = useState('CASH'); // 'CASH' | 'SALES'
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [allPaymentMethods, setAllPaymentMethods] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [showExpected, setShowExpected] = useState(true);

  // Filtros de ventas
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');
  const [salesPeriodFilter, setSalesPeriodFilter] = useState('TODAY'); // 'TODAY' | 'ALL'

  // Factura seleccionada para ver detalle
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Modal de Abono a Factura
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoInvoice, setAbonoInvoice] = useState(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethodId, setAbonoMethodId] = useState('');
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const [abonoError, setAbonoError] = useState('');
  const [abonoSuccessMsg, setAbonoSuccessMsg] = useState('');

  // Modales de Caja
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState('OUT'); // 'IN' | 'OUT'
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDesc, setMovementDesc] = useState('');

  const [openingAmount, setOpeningAmount] = useState('50000');
  const [closingAmount, setClosingAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadCashAndSales();
  }, []);

  useEffect(() => {
    if (initialCustomerSearch) {
      setSalesSearch(initialCustomerSearch);
      setActiveView('SALES');
      setSalesPeriodFilter('ALL');
    }
  }, [initialCustomerSearch]);

  const loadCashAndSales = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Obtener historial de sesiones de caja, métodos de pago y facturas con créditos
      const [cashRes, payRes, invoicesRes] = await Promise.all([
        api.get('/cash/history').catch(() => ({ data: { data: [] } })),
        api.get('/sales/payment-methods').catch(() => ({ data: { data: [] } })),
        api.get('/invoices').catch(() => ({ data: { data: [] } }))
      ]);

      const sessions = cashRes.data?.data || cashRes.data || [];
      const openSession = Array.isArray(sessions) ? sessions.find((s) => s.status === 'OPEN') : null;
      setActiveSession(openSession);

      const payMethods = (payRes.data?.data || payRes.data || []).filter((p) => p.isActive !== false);
      setAllPaymentMethods(payMethods);

      const invList = invoicesRes.data?.data || [];
      const invoicesArray = Array.isArray(invList) ? invList : [];
      setAllInvoices(invoicesArray);

      // 2. Filtrar ventas del día de hoy
      const now = new Date();
      const todayList = invoicesArray.filter((inv) => {
        const d = new Date(inv.createdAt);
        return d.getDate() === now.getDate() &&
               d.getMonth() === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      });
      setTodaySales(todayList);
    } catch (err) {
      console.error('Error al cargar datos de caja:', err);
      setErrorMsg('No se pudo sincronizar el estado de la caja');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCash = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(openingAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Por favor ingresa una base inicial válida');
      return;
    }

    try {
      setIsSubmitting(true);
      triggerHaptic();
      await api.post('/cash/session/open', {
        openingAmount: amountNum
      });

      setShowOpenModal(false);
      await loadCashAndSales();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al abrir caja';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCash = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(closingAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Por favor ingresa el monto de efectivo contado en caja');
      return;
    }

    if (!activeSession) return;

    try {
      setIsSubmitting(true);
      triggerHaptic();
      await api.post(`/cash/session/${activeSession.id}/close`, {
        closingAmount: amountNum
      });

      setShowCloseModal(false);
      setClosingAmount('');
      await loadCashAndSales();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cerrar caja';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterMovement = async (e) => {
    e.preventDefault();
    const amt = parseFloat(movementAmount);
    if (!amt || amt <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (!activeSession) return;

    try {
      setIsSubmitting(true);
      triggerHaptic();
      await api.post(`/cash/session/${activeSession.id}/movements`, {
        type: movementType,
        amount: amt,
        description: movementDesc.trim() || (movementType === 'IN' ? 'Ingreso extra' : 'Retiro menor')
      });

      setShowMovementModal(false);
      setMovementAmount('');
      setMovementDesc('');
      await loadCashAndSales();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al registrar movimiento';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInvoiceActiveCredit = (inv) => {
    if (!inv) return false;
    if (inv.order?.status === 'CANCELLED') return false;

    const methodName = (inv.paymentMethod?.name || '').toLowerCase();
    const isCredit = methodName.includes('crédit') || methodName.includes('credito') || methodName.includes('fiao');
    if (!isCredit) return false;

    if (inv.customerCredits && Array.isArray(inv.customerCredits) && inv.customerCredits.length > 0) {
      const debtEntry = inv.customerCredits.find((c) => c.type === 'DEBT');
      const originalDebt = debtEntry ? parseFloat(debtEntry.amount || 0) : parseFloat(inv.totalAmount || inv.finalAmount || 0);
      const payments = inv.customerCredits.filter((c) => c.type === 'PAYMENT');
      const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      const remaining = originalDebt - totalPaid;
      return remaining > 0.01;
    }

    return parseFloat(inv.finalAmount || 0) > 0.01;
  };

  const getInvoicePendingBalance = (inv) => {
    if (!isInvoiceActiveCredit(inv)) return 0;

    if (inv.customerCredits && Array.isArray(inv.customerCredits) && inv.customerCredits.length > 0) {
      const debtEntry = inv.customerCredits.find((c) => c.type === 'DEBT');
      const originalDebt = debtEntry ? parseFloat(debtEntry.amount || 0) : parseFloat(inv.totalAmount || inv.finalAmount || 0);
      const payments = inv.customerCredits.filter((c) => c.type === 'PAYMENT');
      const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      const remaining = originalDebt - totalPaid;
      return remaining > 0 ? remaining : 0;
    }

    return parseFloat(inv.finalAmount || 0);
  };

  const hasPendingBalance = (inv) => {
    return isInvoiceActiveCredit(inv);
  };

  const handleOpenAbono = (invoice) => {
    if (!isInvoiceActiveCredit(invoice)) {
      return;
    }
    triggerHaptic();
    setSelectedInvoice(null);
    setAbonoInvoice(invoice);
    setAbonoError('');
    setAbonoSuccessMsg('');

    const pending = getInvoicePendingBalance(invoice);
    setAbonoAmount(pending > 0 ? String(pending) : '');

    const validMethods = allPaymentMethods.filter((pm) => {
      const n = (pm.name || '').toLowerCase();
      return !n.includes('crédito') && !n.includes('credito') && !n.includes('fiao');
    });
    if (validMethods.length > 0) {
      setAbonoMethodId(validMethods[0].id);
    }
    setShowAbonoModal(true);
  };

  const handleSubmitAbono = async (e) => {
    e.preventDefault();
    if (!activeSession) {
      setAbonoError('Debes tener un turno de caja abierto para registrar un abono.');
      return;
    }

    const amt = parseFloat(abonoAmount);
    const pending = parseFloat(abonoInvoice?.finalAmount || 0);

    if (isNaN(amt) || amt <= 0) {
      setAbonoError('Ingresa un monto válido mayor a 0');
      return;
    }

    if (amt > pending) {
      setAbonoError(`El monto no puede superar el saldo pendiente de $${pending.toLocaleString('es-CO')}`);
      return;
    }

    if (!abonoMethodId) {
      setAbonoError('Selecciona el método de pago para el abono');
      return;
    }

    try {
      setSubmittingAbono(true);
      setAbonoError('');
      triggerHaptic();

      await api.put(`/invoices/${abonoInvoice.id}/abono`, {
        amount: amt,
        paymentMethodId: abonoMethodId
      });

      triggerHaptic();
      setAbonoSuccessMsg(amt >= pending 
        ? '¡Factura pagada en su totalidad con éxito!' 
        : `Abono de $${amt.toLocaleString('es-CO')} registrado con éxito`);

      await loadCashAndSales();

      setTimeout(() => {
        setShowAbonoModal(false);
        setAbonoInvoice(null);
        setAbonoSuccessMsg('');
      }, 1300);
    } catch (err) {
      console.error('Error al registrar abono:', err);
      setAbonoError(err.response?.data?.message || 'Error al procesar el abono');
    } finally {
      setSubmittingAbono(false);
    }
  };

  const handleViewInvoice = async (sale) => {
    triggerHaptic();
    try {
      setLoadingInvoice(true);
      const enriched = allInvoices.find((i) => i.id === sale.id) || sale;
      setSelectedInvoice(enriched);
      const res = await api.get(`/sales/${sale.id}/invoice`).catch(() => null);
      if (res?.data) {
        setSelectedInvoice((prev) => ({ ...prev, ...(res.data.data || res.data) }));
      }
    } catch (err) {
      console.error('Error cargando factura:', err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Helper para asignar icono a métodos de pago
  const getMethodIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('efectivo') || n.includes('cash')) return <Banknote size={16} />;
    if (n.includes('nequi') || n.includes('davi') || n.includes('transf') || n.includes('bancolombia')) return <Smartphone size={16} />;
    if (n.includes('tarjeta') || n.includes('datafono') || n.includes('pos')) return <CreditCard size={16} />;
    if (n.includes('crédito') || n.includes('credito') || n.includes('fiao')) return <Clock size={16} />;
    return <DollarSign size={16} />;
  };

  // Calcular desglose unificado
  const recordedMethods = activeSession?.salesByMethod || {};
  const combinedMethods = [...allPaymentMethods];
  Object.keys(recordedMethods).forEach((recName) => {
    if (!combinedMethods.some((pm) => pm.name.toLowerCase() === recName.toLowerCase())) {
      combinedMethods.push({ id: recName, name: recName });
    }
  });

  const todayTotalAmount = todaySales.reduce((sum, s) => sum + parseFloat(s.finalAmount || 0), 0);

  // Filtrado de facturas según período (Hoy vs Todas) y búsqueda
  const baseInvoicesList = salesPeriodFilter === 'TODAY' ? todaySales : allInvoices;

  const filteredSales = baseInvoicesList.filter((sale) => {
    const term = salesSearch.toLowerCase().trim();
    const matchTerm =
      !term ||
      (sale.invoiceNumber && String(sale.invoiceNumber).toLowerCase().includes(term)) ||
      (sale.customer?.name && sale.customer.name.toLowerCase().includes(term));

    const matchMethod =
      selectedMethodFilter === 'ALL' ||
      sale.paymentMethod?.name === selectedMethodFilter ||
      sale.paymentMethod?.id === selectedMethodFilter;

    return matchTerm && matchMethod;
  });

  return (
    <div className={styles.container}>
      {/* Banner de multi-tenancy */}
      <div className={styles.tenantNotice}>
        <Store size={16} style={{ flexShrink: 0 }} />
        <span>
          Caja de: <strong>{tenant?.name || 'Restaurante Actual'}</strong>
        </span>
      </div>

      {/* Selector de Pestañas Superior */}
      <div className={styles.tabSwitcher}>
        <button
          onClick={() => {
            triggerHaptic();
            setActiveView('CASH');
          }}
          className={`${styles.tabBtn} ${activeView === 'CASH' ? styles.tabBtnActive : ''}`}
        >
          <DollarSign size={14} />
          <span>Cuadre de Caja</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic();
            setActiveView('SALES');
          }}
          className={`${styles.tabBtn} ${activeView === 'SALES' ? styles.tabBtnActive : ''}`}
        >
          <Receipt size={14} />
          <span>Facturación & Ventas</span>
          {todaySales.length > 0 && (
            <span className={styles.tabBadge}>{todaySales.length}</span>
          )}
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: 12, fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {/* ========================================================
          VISTA 1: CUADRE & TURNO DE CAJA
          ======================================================== */}
      {activeView === 'CASH' && (
        <>
          <div className={styles.cashCard}>
            <div className={styles.cashCardHeader}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  Turno Operativo
                </h3>
                {activeSession && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                    Titular: <strong style={{ color: 'var(--text-secondary)' }}>{activeSession.user?.name || user?.name}</strong>
                  </p>
                )}
              </div>

              <div className={`${styles.statusPill} ${activeSession ? styles.statusPillOpen : styles.statusPillClosed}`}>
                {activeSession && <span className={styles.pulseDot} />}
                <span>{activeSession ? 'Caja Abierta' : 'Caja Cerrada'}</span>
              </div>
            </div>

            {activeSession ? (
              <>
                {/* Bloque 1: Total Cobrado en el Turno */}
                <div className={styles.totalSoldBlock}>
                  <div>
                    <span className={styles.totalSoldLabel}>Total Cobrado en Turno</span>
                    <div className={styles.totalSoldValue}>
                      ${parseFloat(activeSession.totalSales || 0).toLocaleString('es-CO')}
                    </div>
                  </div>
                  <DollarSign size={28} color="#818CF8" style={{ opacity: 0.8 }} />
                </div>

                {/* Bloque 2: Desglose por Métodos de Pago */}
                <div className={styles.breakdownSection}>
                  <div className={styles.sectionTitle}>
                    <span>Desglose por Métodos de Pago</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>En este turno</span>
                  </div>

                  <div className={styles.methodsGrid}>
                    {combinedMethods.map((pm) => {
                      const amount = recordedMethods[pm.name] || 0;
                      return (
                        <div key={pm.id || pm.name} className={styles.methodCard}>
                          <div className={styles.methodLeft}>
                            <div className={styles.methodIconBox}>
                              {getMethodIcon(pm.name)}
                            </div>
                            <span className={styles.methodName}>{pm.name}</span>
                          </div>
                          <span className={styles.methodValue}>
                            ${Number(amount).toLocaleString('es-CO')}
                          </span>
                        </div>
                      );
                    })}

                    {combinedMethods.length === 0 && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                        No hay métodos de pago registrados.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bloque 3: Efectivo Esperado en Gaveta (Cuadre de Arqueo) */}
                <div className={styles.expectedDrawerBox}>
                  <div className={styles.expectedHeader}>
                    <div className={styles.expectedTitleGroup}>
                      <span className={styles.expectedTitle}>Efectivo Esperado en Gaveta</span>
                      <span className={styles.expectedSubtitle}>Base + Ventas Efectivo ± Movimientos</span>
                    </div>

                    <button
                      onClick={() => {
                        triggerHaptic();
                        setShowExpected(!showExpected);
                      }}
                      className={styles.eyeBtn}
                      title={showExpected ? 'Ocultar' : 'Mostrar'}
                    >
                      {showExpected ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className={styles.expectedAmount}>
                    {showExpected
                      ? `$${parseFloat(activeSession.expectedCash || activeSession.openingAmount || 0).toLocaleString('es-CO')}`
                      : '••••••••••'}
                  </div>

                  <div className={styles.formulaBadges}>
                    <span className={styles.formulaChip}>
                      Base: ${parseFloat(activeSession.openingAmount || 0).toLocaleString('es-CO')}
                    </span>
                    <span className={styles.formulaChip}>
                      Ventas Efct: ${parseFloat(recordedMethods['Efectivo'] || 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Bloque 4: Movimientos Extra de Efectivo */}
                <div className={styles.breakdownSection}>
                  <div className={styles.movementsHeader}>
                    <span className={styles.sectionTitle}>Movimientos de Efectivo</span>
                    <div className={styles.movementActions}>
                      <button
                        onClick={() => {
                          triggerHaptic();
                          setMovementType('IN');
                          setShowMovementModal(true);
                        }}
                        className={styles.movBtnIn}
                      >
                        <Plus size={12} />
                        <span>Ingreso</span>
                      </button>

                      <button
                        onClick={() => {
                          triggerHaptic();
                          setMovementType('OUT');
                          setShowMovementModal(true);
                        }}
                        className={styles.movBtnOut}
                      >
                        <Minus size={12} />
                        <span>Retiro</span>
                      </button>
                    </div>
                  </div>

                  {activeSession.cashMovements && activeSession.cashMovements.length > 0 ? (
                    <div className={styles.movementsList}>
                      {activeSession.cashMovements.map((mov) => {
                        const isInc = mov.type === 'IN';
                        const timeStr = new Date(mov.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={mov.id} className={styles.movementRow}>
                            <div>
                              <span className={styles.movDesc}>{mov.description}</span>
                              <div className={styles.movTime}>{timeStr}</div>
                            </div>
                            <span className={isInc ? styles.movAmountIn : styles.movAmountOut}>
                              {isInc ? '+' : '-'} ${parseFloat(mov.amount).toLocaleString('es-CO')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                      Sin retiros ni ingresos manuales en este turno.
                    </p>
                  )}
                </div>

                {/* Botón rápido para saltar a ver las ventas del día */}
                <button
                  onClick={() => {
                    triggerHaptic();
                    setActiveView('SALES');
                  }}
                  className={styles.seeSalesBtn}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Receipt size={16} color="var(--primary)" />
                    <span>Ver Facturas y Ventas Realizadas Hoy</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 800, color: 'var(--secondary-light)' }}>
                      {todaySales.length}
                    </span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </button>

                {/* Botón de Cierre de Caja */}
                <button
                  onClick={() => {
                    triggerHaptic();
                    setShowCloseModal(true);
                  }}
                  className={styles.closeCashBtn}
                >
                  <Lock size={16} />
                  <span>Cerrar Turno de Caja</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  No hay una sesión de caja activa en este restaurante. Para realizar cobros y controlar la gaveta, inicia la apertura del turno con la base inicial de efectivo.
                </p>
                <button
                  onClick={() => {
                    triggerHaptic();
                    setShowOpenModal(true);
                  }}
                  className={styles.openCashBtn}
                >
                  <Unlock size={18} />
                  <span>Abrir Turno de Caja</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          VISTA 2: VENTAS DEL DÍA (MÓDULO DEDICADO Y ESPACIOSO)
          ======================================================== */}
      {activeView === 'SALES' && (
        <div className={styles.salesTabContent}>
          {/* Tarjeta KPI Total del Día */}
          <div className={styles.salesKpi}>
            <div>
              <span className={styles.totalSoldLabel}>Facturación Total Hoy</span>
              <div className={styles.totalSoldValue}>
                ${todayTotalAmount.toLocaleString('es-CO')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Transacciones
              </span>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--secondary-light)' }}>
                {todaySales.length}
              </div>
            </div>
          </div>

          {/* Buscador de Ventas y Selector de Período */}
          <div className={styles.searchCard}>
            {/* Toggle Período: Hoy vs Todas las facturas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setSalesPeriodFilter('TODAY');
                }}
                className={`${styles.methodFilterChip} ${salesPeriodFilter === 'TODAY' ? styles.methodFilterChipActive : ''}`}
                style={{ justifyContent: 'center', height: 34 }}
              >
                Hoy ({todaySales.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setSalesPeriodFilter('ALL');
                }}
                className={`${styles.methodFilterChip} ${salesPeriodFilter === 'ALL' ? styles.methodFilterChipActive : ''}`}
                style={{ justifyContent: 'center', height: 34 }}
              >
                Todas ({allInvoices.length})
              </button>
            </div>

            <div className={styles.searchWrapper}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => {
                  setSalesSearch(e.target.value);
                  if (!e.target.value && onClearCustomerSearch) {
                    onClearCustomerSearch();
                  }
                }}
                placeholder="Buscar por # factura o cliente..."
                className={styles.searchInput}
              />
              {salesSearch && (
                <button
                  onClick={() => {
                    setSalesSearch('');
                    if (onClearCustomerSearch) onClearCustomerSearch();
                  }}
                  className={styles.clearSearchBtn}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtros por método de pago */}
            <div className={styles.methodFiltersScroll}>
              <button
                onClick={() => {
                  triggerHaptic();
                  setSelectedMethodFilter('ALL');
                }}
                className={`${styles.methodFilterChip} ${selectedMethodFilter === 'ALL' ? styles.methodFilterChipActive : ''}`}
              >
                Todos ({baseInvoicesList.length})
              </button>
              {allPaymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => {
                    triggerHaptic();
                    setSelectedMethodFilter(pm.name);
                  }}
                  className={`${styles.methodFilterChip} ${selectedMethodFilter === pm.name ? styles.methodFilterChipActive : ''}`}
                >
                  {pm.name}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Facturas */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 62, borderRadius: 12, backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border)' }} />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ fontSize: 13 }}>No se encontraron facturas para este filtro</p>
            </div>
          ) : (
            <div className={styles.salesList}>
              {filteredSales.map((sale) => {
                const timeStr = new Date(sale.createdAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const isActiveCredit = isInvoiceActiveCredit(sale);
                const hasCreditHistory = sale.customerCredits && sale.customerCredits.some((c) => c.type === 'DEBT');
                const isPaidCredit = hasCreditHistory && !isActiveCredit;
                const pending = getInvoicePendingBalance(sale);

                return (
                  <div
                    key={sale.id}
                    onClick={() => handleViewInvoice(sale)}
                    className={styles.saleCard}
                  >
                    <div className={styles.saleCardLeft}>
                      <span className={styles.saleInvoice}>
                        {sale.invoiceNumber ? `#${sale.invoiceNumber}` : 'Venta Directa'}
                      </span>
                      <div className={styles.saleMeta}>
                        <span>{timeStr}</span>
                        <span>•</span>
                        <span>{sale.customer?.name || 'Consumidor Final'}</span>
                      </div>
                    </div>

                    <div className={styles.saleCardRight}>
                      {isActiveCredit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            ${parseFloat(sale.totalAmount || sale.finalAmount || 0).toLocaleString('es-CO')}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: '#F87171' }}>
                            Saldo: ${pending.toLocaleString('es-CO')}
                          </span>
                        </div>
                      ) : isPaidCredit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#10B981' }}>
                            ✓ Pagada
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            ${parseFloat(sale.finalAmount || sale.totalAmount || 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.saleAmount}>
                          ${parseFloat(sale.finalAmount || 0).toLocaleString('es-CO')}
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {sale.paymentMethod?.name && (
                          <span 
                            className={styles.methodBadge}
                            style={isActiveCredit ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)' } : {}}
                          >
                            {sale.paymentMethod.name}
                          </span>
                        )}

                        {isActiveCredit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAbono(sale);
                            }}
                            className={styles.cardAbonoBtn}
                            title="Registrar abono a esta factura"
                          >
                            <Edit3 size={11} />
                            <span>Abonar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Espaciador de seguridad para garantizar que la última tarjeta nunca sea tapada */}
          <div style={{ height: 40 }} />
        </div>
      )}

      {/* ========================================================
          MODALES OPERATIVOS (APERTURA, CIERRE, MOVIMIENTO, FACTURA)
          ======================================================== */}

      {/* Modal para Abrir Caja */}
      {showOpenModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} animate-slide-up`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Apertura de Turno</h3>
              <button onClick={() => setShowOpenModal(false)} className={styles.modalCloseBtn}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleOpenCash} className={styles.modalBody}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Ingresa la base inicial en efectivo con la que inicia la gaveta en este restaurante.
              </p>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Base Inicial en Efectivo ($)</label>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="50000"
                  min="0"
                  className={styles.inputField}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`${styles.submitBtn} ${styles.submitBtnSuccess}`}
              >
                <CheckCircle2 size={18} />
                <span>{isSubmitting ? 'Abriendo Caja...' : 'Confirmar Apertura de Caja'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Cerrar Caja */}
      {showCloseModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} animate-slide-up`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Cierre de Turno de Caja</h3>
              <button onClick={() => setShowCloseModal(false)} className={styles.modalCloseBtn}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCloseCash} className={styles.modalBody}>
              <div style={{ padding: '12px', borderRadius: 10, backgroundColor: 'rgba(51, 65, 85, 0.4)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Efectivo Esperado en Sistema
                </span>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--secondary-light)', marginTop: 2 }}>
                  ${parseFloat(activeSession?.expectedCash || 0).toLocaleString('es-CO')}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Efectivo Físico Contado en Caja ($)</label>
                <input
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="Sume los billetes y monedas"
                  min="0"
                  className={styles.inputField}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !closingAmount}
                className={`${styles.submitBtn} ${styles.submitBtnDanger}`}
              >
                <Lock size={18} />
                <span>{isSubmitting ? 'Cerrando Caja...' : 'Confirmar Cierre de Caja'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Movimiento Extra de Efectivo */}
      {showMovementModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} animate-slide-up`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {movementType === 'IN' ? 'Ingreso de Efectivo' : 'Retiro de Efectivo'}
              </h3>
              <button onClick={() => setShowMovementModal(false)} className={styles.modalCloseBtn}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterMovement} className={styles.modalBody}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {movementType === 'IN'
                  ? 'Registra un ingreso adicional de billetes a la gaveta.'
                  : 'Úselo para pagos menores a proveedores, domiciliarios o retiros en billetes.'}
              </p>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Monto en Efectivo ($)</label>
                <input
                  type="number"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="Ej: 20000"
                  min="100"
                  className={styles.inputField}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Motivo / Descripción</label>
                <input
                  type="text"
                  value={movementDesc}
                  onChange={(e) => setMovementDesc(e.target.value)}
                  placeholder="Ej: Pago de hielo, gas, compra verduras..."
                  className={styles.inputField}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !movementAmount}
                className={`${styles.submitBtn} ${movementType === 'IN' ? styles.submitBtnSuccess : styles.submitBtnDanger}`}
              >
                {movementType === 'IN' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                <span>
                  {isSubmitting
                    ? 'Registrando...'
                    : movementType === 'IN'
                    ? 'Confirmar Ingreso a Caja'
                    : 'Confirmar Retiro de Caja'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Factura */}
      {selectedInvoice && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} animate-slide-up`}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  Factura {selectedInvoice.invoice?.number || selectedInvoice.saleSummary?.invoiceNumber || ''}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  {selectedInvoice.invoice?.customer || selectedInvoice.saleSummary?.customer?.name || 'Consumidor Final'}
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className={styles.modalCloseBtn}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingInvoice ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando detalle de la factura...</p>
              ) : selectedInvoice.items ? (
                <>
                  <div className={styles.invoiceItemsList}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                      Productos Facturados
                    </span>
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className={styles.invoiceItemRow}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {item.qty}x {item.product}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                          ${parseFloat(item.subtotal || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Resumen Totales */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px', borderRadius: 10, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>Subtotal</span>
                      <span>${parseFloat(selectedInvoice.totals?.subtotal || 0).toLocaleString('es-CO')}</span>
                    </div>
                    {parseFloat(selectedInvoice.totals?.discount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#34D399' }}>
                        <span>Descuento</span>
                        <span>-${parseFloat(selectedInvoice.totals?.discount || 0).toLocaleString('es-CO')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>Método de Pago</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedInvoice.totals?.paymentMethod}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, color: 'var(--secondary-light)', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                      <span>Total Facturado</span>
                      <span>${parseFloat(selectedInvoice.totals?.total || selectedInvoice.totalAmount || 0).toLocaleString('es-CO')}</span>
                    </div>
                  </div>

                  {/* Acción de Abono si la factura tiene saldo pendiente */}
                  {hasPendingBalance(selectedInvoice) && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo pendiente de cobro:</span>
                        <strong style={{ color: '#F87171', fontSize: 14 }}>
                          ${getInvoicePendingBalance(selectedInvoice).toLocaleString('es-CO')}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAbono(selectedInvoice)}
                        className={styles.abonoActionBtn}
                      >
                        <Edit3 size={16} />
                        <span>Registrar Abono a Factura</span>
                      </button>
                    </div>
                  )}
                </>
              ) : null}

              <div style={{ height: 20 }} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRAR ABONO A FACTURA (COMO EN ESCRITORIO)
          ======================================================== */}
      {showAbonoModal && abonoInvoice && (() => {
        const originalDebt = parseFloat(abonoInvoice.totalAmount || abonoInvoice.finalAmount || 0);
        const currentPending = getInvoicePendingBalance(abonoInvoice);
        const totalPaid = Math.max(0, originalDebt - currentPending);
        const paidPercent = originalDebt > 0 ? Math.min((totalPaid / originalDebt) * 100, 100) : 0;
        const abonoHistory = (abonoInvoice.customerCredits || []).filter((c) => c.type === 'PAYMENT');
        const validPayMethods = allPaymentMethods.filter((pm) => {
          const n = (pm.name || '').toLowerCase();
          return !n.includes('crédito') && !n.includes('credito') && !n.includes('fiao');
        });

        const parsedAbono = parseFloat(abonoAmount || 0);
        const isFullPay = parsedAbono >= currentPending;

        return (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalCard} animate-slide-up`}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>
                    Registrar Abono — Fra. {abonoInvoice.invoiceNumber ? `#${abonoInvoice.invoiceNumber}` : ''}
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    Cliente: <strong>{abonoInvoice.customer?.name || 'Cliente asignado'}</strong>
                  </p>
                </div>
                <button onClick={() => setShowAbonoModal(false)} className={styles.modalCloseBtn}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitAbono} className={styles.modalBody}>
                {abonoSuccessMsg && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} />
                    <span>{abonoSuccessMsg}</span>
                  </div>
                )}

                {abonoError && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={16} />
                    <span>{abonoError}</span>
                  </div>
                )}

                {/* Resumen de Deuda */}
                <div className={styles.abonoDebtCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Deuda Original</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>${originalDebt.toLocaleString('es-CO')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Total Abonado</span>
                    <strong style={{ color: '#10B981' }}>+${totalPaid.toLocaleString('es-CO')}</strong>
                  </div>

                  <div className={styles.abonoProgressBar}>
                    <div className={styles.abonoProgressFill} style={{ width: `${paidPercent}%` }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Saldo Pendiente</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: currentPending <= 0 ? '#10B981' : '#EF4444' }}>
                      {currentPending <= 0 ? '✓ Pagada' : `$${currentPending.toLocaleString('es-CO')}`}
                    </span>
                  </div>
                </div>

                {/* Historial de Abonos Previos */}
                {abonoHistory.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      Abonos Anteriores ({abonoHistory.length})
                    </span>
                    <div className={styles.abonoHistoryBox}>
                      {abonoHistory.map((ab, idx) => (
                        <div key={ab.id || idx} className={styles.abonoHistoryRow}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{ab.paymentMethod?.name || 'Abono'}</strong>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {new Date(ab.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span style={{ fontWeight: 800, color: '#10B981' }}>
                            +${parseFloat(ab.amount || 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulario de Abono */}
                <div className={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.inputLabel}>Monto a Abonar ($)</label>
                    {currentPending > 0 && (
                      <button
                        type="button"
                        onClick={() => setAbonoAmount(String(currentPending))}
                        className={styles.payAllBtn}
                      >
                        Pagar Todo (${currentPending.toLocaleString('es-CO')})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={abonoAmount}
                    onChange={(e) => setAbonoAmount(e.target.value)}
                    placeholder={`Máx: ${currentPending}`}
                    min="1"
                    max={currentPending}
                    step="0.01"
                    className={styles.inputField}
                    required
                    autoFocus
                  />
                  {parsedAbono > 0 && parsedAbono < currentPending && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Saldo restante tras este abono: <strong style={{ color: 'var(--text-primary)' }}>${(currentPending - parsedAbono).toLocaleString('es-CO')}</strong>
                    </span>
                  )}
                </div>

                {/* Método de Pago del Abono (Excluyendo Crédito) */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Método de Pago para el Abono</label>
                  <div className={styles.methodSelectBox}>
                    {validPayMethods.map((pm) => {
                      const isSel = abonoMethodId === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setAbonoMethodId(pm.id);
                          }}
                          className={`${styles.methodSelectOption} ${isSel ? styles.methodSelectOptionActive : ''}`}
                        >
                          {getMethodIcon(pm.name)}
                          <span>{pm.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingAbono || !abonoAmount || parsedAbono <= 0 || !!abonoSuccessMsg}
                  className={`${styles.submitBtn} ${isFullPay ? styles.submitBtnSuccess : ''}`}
                >
                  <Check size={18} />
                  <span>
                    {submittingAbono
                      ? 'Procesando abono...'
                      : isFullPay
                      ? `Pagar Totalidad ($${currentPending.toLocaleString('es-CO')})`
                      : `Confirmar Abono ($${parsedAbono > 0 ? parsedAbono.toLocaleString('es-CO') : '0'})`}
                  </span>
                </button>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CashScreen;
