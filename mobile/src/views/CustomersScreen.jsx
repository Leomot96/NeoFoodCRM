import React, { useState, useEffect } from 'react';
import { 
  Users, Search, DollarSign, AlertCircle, Phone, 
  MapPin, FileText, ChevronRight, X, ShieldAlert, CheckCircle2, ArrowDownCircle, ArrowUpCircle,
  Receipt
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './CustomersScreen.module.css';

// Helpers para validar si una factura tiene crédito activo con saldo pendiente
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

export const CustomersScreen = ({ onNavigateToInvoices }) => {
  const { user, tenant, triggerHaptic } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'DEBT' | 'CLEAN'

  // Modal de Detalle / Abono
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [credits, setCredits] = useState([]);
  const [customerPendingInvoices, setCustomerPendingInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [payNote, setPayNote] = useState('Abono desde app móvil');
  const [submittingPay, setSubmittingPay] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Verificar si es administrador o supervisor
  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toLowerCase();
  const isAdmin = roleName === 'administrador' || roleName === 'admin' || roleName === 'superadmin' || roleName === 'supervisor';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custRes, payRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: { data: [] } })),
        api.get('/sales/payment-methods').catch(() => ({ data: { data: [] } }))
      ]);

      const custList = custRes.data?.data || custRes.data || [];
      const payList = (payRes.data?.data || payRes.data || [])
        .filter((p) => p.isActive !== false)
        .filter((p) => {
          const n = (p.name || '').toLowerCase();
          return !n.includes('crédito') && !n.includes('credito') && !n.includes('fiao');
        });

      setCustomers(Array.isArray(custList) ? custList : []);
      setPaymentMethods(Array.isArray(payList) ? payList : []);
      if (payList.length > 0) {
        setPayMethodId(payList[0].id);
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (cust) => {
    triggerHaptic();
    setSelectedCustomer(cust);
    setPayAmount('');
    setFeedbackMsg(null);
    setSelectedInvoiceId('');

    try {
      setLoadingCredits(true);
      const [credRes, invRes] = await Promise.all([
        api.get(`/customers/${cust.id}/credits`).catch(() => ({ data: { data: [] } })),
        api.get('/invoices', { params: { customerId: cust.id } }).catch(() => ({ data: { data: [] } }))
      ]);

      const creditsList = credRes.data?.data || credRes.data || [];
      setCredits(Array.isArray(creditsList) ? creditsList : []);

      const allCustInvoices = invRes.data?.data || [];
      // Solo incluir facturas que tengan crédito activo con saldo pendiente
      const pendingList = (Array.isArray(allCustInvoices) ? allCustInvoices : []).filter(isInvoiceActiveCredit);

      setCustomerPendingInvoices(pendingList);

      if (pendingList.length > 0) {
        setSelectedInvoiceId(pendingList[0].id);
        const pendAmt = getInvoicePendingBalance(pendingList[0]);
        setPayAmount(String(pendAmt));
        setPayNote(`Abono a Factura #${pendingList[0].invoiceNumber || pendingList[0].id}`);
      } else {
        setSelectedInvoiceId('');
        const bal = parseFloat(cust.balance || 0);
        setPayAmount(bal > 0 ? String(bal) : '');
        setPayNote('Abono general a cuenta');
      }
    } catch (e) {
      console.error('Error al cargar créditos o facturas del cliente:', e);
      setCredits([]);
      setCustomerPendingInvoices([]);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleSelectInvoiceToPay = (invId) => {
    setSelectedInvoiceId(invId);
    if (invId) {
      const inv = customerPendingInvoices.find((i) => i.id === invId);
      if (inv) {
        const pendAmt = getInvoicePendingBalance(inv);
        setPayAmount(String(pendAmt));
        setPayNote(`Abono a Factura #${inv.invoiceNumber || inv.id}`);
      }
    } else {
      const bal = parseFloat(selectedCustomer?.balance || 0);
      setPayAmount(bal > 0 ? String(bal) : '');
      setPayNote('Abono general a cuenta');
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Ingresa un monto válido para el abono');
      return;
    }

    try {
      setSubmittingPay(true);
      triggerHaptic();

      if (selectedInvoiceId) {
        // Se aplica directamente a la factura seleccionada (idéntico al módulo de facturas)
        await api.put(`/invoices/${selectedInvoiceId}/abono`, {
          amount: amountNum,
          paymentMethodId: payMethodId
        });
      } else {
        // Abono general a la deuda del cliente
        await api.post(`/customers/${selectedCustomer.id}/pay`, {
          amount: amountNum,
          paymentMethodId: payMethodId,
          description: payNote.trim() || 'Abono general a deuda'
        });
      }

      setFeedbackMsg({
        type: 'success',
        text: `Abono de $${amountNum.toLocaleString('es-CO')} registrado exitosamente ${selectedInvoiceId ? 'a la factura seleccionada' : 'a la cuenta del cliente'}`
      });

      // Recargar créditos, facturas pendientes del cliente y lista general
      const [updatedCredits, custRes, updatedInvoices] = await Promise.all([
        api.get(`/customers/${selectedCustomer.id}/credits`),
        api.get('/customers'),
        api.get('/invoices', { params: { customerId: selectedCustomer.id } }).catch(() => ({ data: { data: [] } }))
      ]);

      setCredits(updatedCredits.data?.data || updatedCredits.data || []);
      const updatedList = custRes.data?.data || custRes.data || [];
      setCustomers(updatedList);

      const updatedCurr = updatedList.find((c) => c.id === selectedCustomer.id);
      if (updatedCurr) setSelectedCustomer(updatedCurr);

      const allCustInvoices = updatedInvoices.data?.data || [];
      const pendingList = (Array.isArray(allCustInvoices) ? allCustInvoices : []).filter(isInvoiceActiveCredit);
      setCustomerPendingInvoices(pendingList);

      if (pendingList.length > 0) {
        setSelectedInvoiceId(pendingList[0].id);
        const pendAmt = getInvoicePendingBalance(pendingList[0]);
        setPayAmount(String(pendAmt));
        setPayNote(`Abono a Factura #${pendingList[0].invoiceNumber || pendingList[0].id}`);
      } else {
        setSelectedInvoiceId('');
        const bal = parseFloat(updatedCurr?.balance || 0);
        setPayAmount(bal > 0 ? String(bal) : '');
        setPayNote('Abono general a cuenta');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al procesar el abono';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setSubmittingPay(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.deniedCard}>
          <ShieldAlert size={48} color="#EF4444" />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Acceso Restringido</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Este módulo de gestión de clientes y cartera está reservado exclusivamente para Administradores y Supervisores del restaurante.
          </p>
        </div>
      </div>
    );
  }

  // Filtrado
  const filteredCustomers = customers.filter((c) => {
    const term = searchQuery.toLowerCase().trim();
    const matchSearch =
      !term ||
      c.name?.toLowerCase().includes(term) ||
      c.document?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term);

    const balance = parseFloat(c.balance || 0);
    if (filterMode === 'DEBT') return matchSearch && balance > 0;
    if (filterMode === 'CLEAN') return matchSearch && balance <= 0;
    return matchSearch;
  });

  // Métricas
  const totalDebt = customers.reduce((sum, c) => sum + Math.max(0, parseFloat(c.balance || 0)), 0);
  const customersWithDebt = customers.filter((c) => parseFloat(c.balance || 0) > 0).length;

  return (
    <div className={styles.container}>
      {/* Banner de multi-tenancy */}
      <div className={styles.adminNotice}>
        <Users size={16} style={{ flexShrink: 0 }} />
        <span>
          Cartera exclusiva de: <strong>{tenant?.name || 'Este Restaurante'}</strong>
        </span>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Deuda Total Cartera</span>
            <DollarSign size={16} color="#EF4444" />
          </div>
          <span className={`${styles.kpiValue} ${totalDebt > 0 ? styles.kpiValueDanger : styles.kpiValueSuccess}`}>
            ${totalDebt.toLocaleString('es-CO')}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Clientes con Deuda</span>
            <AlertCircle size={16} color="#FBBF24" />
          </div>
          <span className={styles.kpiValue}>
            {customersWithDebt} <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>de {customers.length}</span>
          </span>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className={styles.searchCard}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula o teléfono..."
            className={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={styles.clearSearchBtn}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filterTabs}>
          <button
            onClick={() => {
              triggerHaptic();
              setFilterMode('ALL');
            }}
            className={`${styles.filterChip} ${filterMode === 'ALL' ? styles.filterChipActive : ''}`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setFilterMode('DEBT');
            }}
            className={`${styles.filterChip} ${filterMode === 'DEBT' ? styles.filterChipActive : ''}`}
          >
            Con Deuda ({customersWithDebt})
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              setFilterMode('CLEAN');
            }}
            className={`${styles.filterChip} ${filterMode === 'CLEAN' ? styles.filterChipActive : ''}`}
          >
            Al Día ({customers.length - customersWithDebt})
          </button>
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 75, borderRadius: 14, backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p style={{ fontSize: 13 }}>No se encontraron clientes con este filtro</p>
        </div>
      ) : (
        <div className={styles.customerList}>
          {filteredCustomers.map((cust) => {
            const balance = parseFloat(cust.balance || 0);
            const hasDebt = balance > 0;

            return (
              <div
                key={cust.id}
                onClick={() => handleSelectCustomer(cust)}
                className={styles.customerCard}
              >
                <div className={styles.customerCardHeader}>
                  <div className={styles.customerNameGroup}>
                    <div className={styles.avatar}>
                      {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h4 className={styles.customerName}>{cust.name}</h4>
                      <p className={styles.customerDoc}>
                        {cust.document ? `Doc: ${cust.document}` : 'Sin documento'}
                      </p>
                    </div>
                  </div>

                  <div className={`${styles.debtBadge} ${hasDebt ? styles.debtBadgeDanger : styles.debtBadgeClean}`}>
                    {hasDebt ? `Debe $${balance.toLocaleString('es-CO')}` : 'Al Día'}
                  </div>
                </div>

                {(cust.phone || cust.address) && (
                  <div className={styles.customerMeta}>
                    {cust.phone && (
                      <span className={styles.metaItem}>
                        <Phone size={11} />
                        {cust.phone}
                      </span>
                    )}
                    {cust.address && (
                      <span className={styles.metaItem}>
                        <MapPin size={11} />
                        {cust.address}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Deuda y Abonos */}
      {selectedCustomer && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} animate-slide-up`}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{selectedCustomer.name}</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  {selectedCustomer.document ? `CC/NIT: ${selectedCustomer.document}` : 'Cliente Registrado'}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className={styles.modalCloseBtn}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Banner de Estado de Deuda */}
              {(() => {
                const bal = parseFloat(selectedCustomer.balance || 0);
                const hasDebt = bal > 0;
                return (
                  <div className={`${styles.debtBanner} ${!hasDebt ? styles.debtBannerClean : ''}`}>
                    <span className={styles.debtBannerLabel}>
                      {hasDebt ? 'Saldo Pendiente por Cobrar' : 'Cliente sin deuda pendiente'}
                    </span>
                    <span className={`${styles.debtBannerAmount} ${!hasDebt ? styles.debtBannerAmountClean : ''}`}>
                      ${bal.toLocaleString('es-CO')}
                    </span>
                  </div>
                );
              })()}

              {feedbackMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: feedbackMsg.type === 'success' ? '#34D399' : '#F87171',
                  border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {feedbackMsg.text}
                </div>
              )}

              {/* Formulario de Registro de Abono */}
              {parseFloat(selectedCustomer.balance || 0) > 0 && (
                <form onSubmit={handleRegisterPayment} className={styles.formSection}>
                  <span className={styles.sectionTitle}>Registrar Abono a la Deuda</span>

                  {onNavigateToInvoices && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        onNavigateToInvoices(selectedCustomer);
                      }}
                      className={styles.goToInvoicesBtn}
                    >
                      <Receipt size={15} />
                      <span>Ver Facturas en Facturación ({selectedCustomer.name})</span>
                    </button>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Factura a Abonar
                      {customerPendingInvoices.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--primary-light)', marginLeft: 6, fontWeight: 700 }}>
                          ({customerPendingInvoices.length} {customerPendingInvoices.length === 1 ? 'factura pendiente' : 'facturas pendientes'})
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => handleSelectInvoiceToPay(e.target.value)}
                      className={styles.selectField}
                    >
                      <option value="">Abono general a la cuenta del cliente</option>
                      {customerPendingInvoices.map((inv) => {
                        const pendingAmt = getInvoicePendingBalance(inv);
                        const invDate = new Date(inv.createdAt).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short'
                        });
                        return (
                          <option key={inv.id} value={inv.id}>
                            Factura #{inv.invoiceNumber || inv.id} — Pendiente: ${pendingAmt.toLocaleString('es-CO')} ({invDate})
                          </option>
                        );
                      })}
                    </select>
                    <p className={styles.invoiceHint}>
                      {selectedInvoiceId
                        ? 'El abono se aplicará directamente a la factura seleccionada y reducirá la deuda del cliente.'
                        : 'El abono se registrará como un abono general en la cuenta y cartera del cliente.'}
                    </p>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Monto del Abono ($)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={
                        selectedInvoiceId
                          ? `Pendiente factura: $${getInvoicePendingBalance(customerPendingInvoices.find((i) => i.id === selectedInvoiceId)).toLocaleString('es-CO')}`
                          : `Máx: $${parseFloat(selectedCustomer.balance).toLocaleString('es-CO')}`
                      }
                      max={
                        selectedInvoiceId
                          ? getInvoicePendingBalance(customerPendingInvoices.find((i) => i.id === selectedInvoiceId)) || selectedCustomer.balance
                          : parseFloat(selectedCustomer.balance)
                      }
                      min="100"
                      className={styles.inputField}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Método de Pago</label>
                    <select
                      value={payMethodId}
                      onChange={(e) => setPayMethodId(e.target.value)}
                      className={styles.selectField}
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Descripción / Comprobante</label>
                    <input
                      type="text"
                      value={payNote}
                      readOnly
                      placeholder="Abono a Factura"
                      className={styles.inputField}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        opacity: 0.85,
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPay || !payAmount}
                    className={styles.payBtn}
                  >
                    <CheckCircle2 size={16} />
                    <span>{submittingPay ? 'Procesando Abono...' : selectedInvoiceId ? 'Aplicar Abono a Factura' : 'Aplicar Abono a Cuenta'}</span>
                  </button>
                </form>
              )}

              {/* Historial de Movimientos de Crédito */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className={styles.sectionTitle}>Historial de Facturas y Pagos</span>

                {loadingCredits ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando historial...</p>
                ) : credits.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hay movimientos registrados para este cliente.</p>
                ) : (
                  <div className={styles.creditHistoryList}>
                    {credits.map((cr) => {
                      const isDebt = cr.type === 'DEBT';
                      const amt = parseFloat(cr.amount || 0);
                      const dateStr = new Date(cr.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={cr.id} className={styles.creditItem}>
                          <div className={styles.creditItemLeft}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isDebt ? (
                                <ArrowDownCircle size={14} color="#EF4444" />
                              ) : (
                                <ArrowUpCircle size={14} color="#10B981" />
                              )}
                              <span className={styles.creditDesc}>{cr.description}</span>
                            </div>
                            <span className={styles.creditDate}>{dateStr}</span>
                          </div>

                          <span className={isDebt ? styles.creditAmountDebt : styles.creditAmountPay}>
                            {isDebt ? `+$${amt.toLocaleString('es-CO')}` : `-$${amt.toLocaleString('es-CO')}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersScreen;
