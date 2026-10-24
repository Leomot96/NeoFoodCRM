import React, { useState, useEffect } from 'react';
import { 
  X, Check, Banknote, CreditCard, Send, Search, 
  User, AlertCircle, RefreshCw, ChevronRight, ShieldCheck,
  Plus, Trash2, Users, CheckCircle2
} from 'lucide-react';
import { getPaymentMethods, getCustomers, getCustomerCredits, processSale } from '../services/sales';
import { useAuth } from '../context/AuthContext';
import styles from './CheckoutModal.module.css';

export const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  table, 
  items = [], 
  total = 0, 
  orderType = 'DINE_IN', // 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
  onSaleSuccess 
}) => {
  const { triggerHaptic } = useAuth();

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerCreditInfo, setCustomerCreditInfo] = useState(null);

  // Modo de cobro: 'single' (total) o 'split' (dividir cuenta / mixto)
  const [payMode, setPayMode] = useState('single');
  const [splitPayments, setSplitPayments] = useState([]);

  // Estados de modal de búsqueda de clientes
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customersList, setCustomersList] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Efectivo recibido y cambio
  const [receivedAmount, setReceivedAmount] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (showCustomerSearch && customersList.length === 0) {
      handleSearchCustomers('');
    }
  }, [showCustomerSearch]);

  const loadInitialData = async () => {
    const methods = await getPaymentMethods();
    setPaymentMethods(methods);
    if (methods.length > 0) {
      setSelectedMethodId(methods[0].id);

      const targetTotal = Math.max(0, total - Number(discount || 0));
      const half = Math.floor(targetTotal / 2);
      const rem = targetTotal - half;
      setSplitPayments([
        {
          id: 'sp-1',
          paymentMethodId: methods[0].id,
          amount: rem,
          notes: 'Pago 1'
        },
        {
          id: 'sp-2',
          paymentMethodId: methods[1]?.id || methods[0].id,
          amount: half,
          notes: 'Pago 2'
        }
      ]);
    }
    setPayMode('single');
    // Si la mesa ya tenía cliente asignado
    if (table?.activeOrder?.customer) {
      handleSelectCustomer(table.activeOrder.customer);
    }
  };

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setShowCustomerSearch(false);
    triggerHaptic();

    if (cust?.id) {
      try {
        const credits = await getCustomerCredits(cust.id);
        const creditsList = Array.isArray(credits) ? credits : [];

        // Calcular saldo desde los registros de DEBT y PAYMENT
        const debtRecords = creditsList
          .filter((c) => c.type === 'DEBT')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const paymentRecords = creditsList
          .filter((c) => c.type === 'PAYMENT')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const computedDebt = Math.max(0, debtRecords - paymentRecords);

        // Saldo balance oficial en el cliente
        const officialBalance = cust.balance !== undefined && cust.balance !== null
          ? parseFloat(cust.balance)
          : 0;

        const currentDebt = Math.max(officialBalance, computedDebt);

        setCustomerCreditInfo({
          currentDebt,
          hasDebt: currentDebt > 0,
          creditsCount: creditsList.length
        });
      } catch (e) {
        console.error('Error al consultar crédito del cliente:', e);
        const debt = cust.balance ? parseFloat(cust.balance) : 0;
        setCustomerCreditInfo({
          currentDebt: debt,
          hasDebt: debt > 0,
          creditsCount: 0
        });
      }
    } else {
      setCustomerCreditInfo(null);
    }
  };

  const handleSearchCustomers = async (text) => {
    setCustomerSearchQuery(text);
    setLoadingCustomers(true);
    const list = await getCustomers(text);
    setCustomersList(list);
    setLoadingCustomers(false);
  };

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);
  const isCash = selectedMethod?.name?.toLowerCase().includes('efectivo') || selectedMethod?.code === 'CASH';
  const isCredit = selectedMethod?.name?.toLowerCase().includes('crédito') || 
                   selectedMethod?.name?.toLowerCase().includes('credito') || 
                   selectedMethod?.name?.toLowerCase().includes('fiao');

  const finalTotal = Math.max(0, total - Number(discount || 0));
  const changeAmount = Number(receivedAmount) > finalTotal ? Number(receivedAmount) - finalTotal : 0;

  // Cálculos para cuenta dividida
  const splitTotalAssigned = splitPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const splitDifference = finalTotal - splitTotalAssigned;
  const isSplitExact = Math.abs(splitDifference) <= 1;

  const hasSplitCredit = splitPayments.some(p => {
    const pm = paymentMethods.find(m => m.id === p.paymentMethodId);
    const name = pm?.name?.toLowerCase() || '';
    return name.includes('crédito') || name.includes('credito') || name.includes('fiao');
  });

  const handleQuickPreset = (n) => {
    triggerHaptic();
    const base = Math.floor(finalTotal / n);
    const rem = finalTotal - (base * n);
    const newRows = [];
    for (let i = 0; i < n; i++) {
      const pm = paymentMethods[i % paymentMethods.length] || paymentMethods[0];
      newRows.push({
        id: `sp-${Date.now()}-${i}`,
        paymentMethodId: pm?.id || '',
        amount: i === 0 ? base + rem : base,
        notes: `Pago ${i + 1}`
      });
    }
    setSplitPayments(newRows);
  };

  const handleAddSplitRow = () => {
    triggerHaptic();
    const remaining = Math.max(0, splitDifference);
    const nextIndex = splitPayments.length + 1;
    const pm = paymentMethods[splitPayments.length % paymentMethods.length] || paymentMethods[0];
    setSplitPayments([
      ...splitPayments,
      {
        id: `sp-${Date.now()}`,
        paymentMethodId: pm?.id || '',
        amount: remaining,
        notes: `Pago ${nextIndex}`
      }
    ]);
  };

  const handleUpdateSplitRow = (id, field, value) => {
    setSplitPayments(splitPayments.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleRemoveSplitRow = (id) => {
    triggerHaptic();
    if (splitPayments.length <= 1) return;
    setSplitPayments(splitPayments.filter(p => p.id !== id));
  };

  const handleProcessCheckout = async () => {
    if (payMode === 'single') {
      if (isCredit && !selectedCustomer) {
        setErrorMsg('Debes seleccionar un cliente para registrar una venta a crédito / fiado');
        return;
      }
    } else {
      if (!isSplitExact) {
        if (splitDifference > 0) {
          setErrorMsg(`Falta por asignar $${splitDifference.toLocaleString('es-CO')} para cubrir la totalidad`);
        } else {
          setErrorMsg(`La suma de pagos excede el total por $${Math.abs(splitDifference).toLocaleString('es-CO')}`);
        }
        return;
      }
      if (hasSplitCredit && !selectedCustomer) {
        setErrorMsg('Debes seleccionar un cliente para registrar pagos con parte a crédito / fiado');
        return;
      }
    }

    setProcessing(true);
    setErrorMsg('');
    triggerHaptic();

    try {
      const salePayload = {
        tableId: table?.id || null,
        orderId: table?.activeOrder?.id || null,
        orderType: orderType,
        customerId: selectedCustomer?.id || null,
        paymentMethodId: payMode === 'split' ? splitPayments[0].paymentMethodId : selectedMethodId,
        payments: payMode === 'split' ? splitPayments.map(p => ({
          paymentMethodId: p.paymentMethodId,
          amount: Number(p.amount || 0),
          notes: p.notes || null
        })) : undefined,
        discount: Number(discount || 0),
        notes: notes || '',
        details: items.map((it) => ({
          productId: it.productId || it.product?.id || it.id,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice || it.price || it.salePrice || 0),
          modifiers: it.modifiers || it.variations || [],
          additions: it.additions || [],
          notes: it.notes || ''
        })),
        receivedAmount: isCash && payMode === 'single' ? Number(receivedAmount || finalTotal) : finalTotal,
      };

      const result = await processSale(salePayload);
      triggerHaptic();

      if (onSaleSuccess) {
        onSaleSuccess(result);
      }
      onClose();
    } catch (err) {
      console.error('Error al procesar cobro:', err);
      setErrorMsg(err.response?.data?.message || 'Error al procesar la venta en caja');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const getMethodIcon = (method) => {
    const name = method.name.toLowerCase();
    if (name.includes('efectivo')) return <Banknote size={16} />;
    if (name.includes('tarjeta')) return <CreditCard size={16} />;
    return <Send size={16} />;
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} animate-slide-up`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h3 className={styles.title}>
              <span>Cobrar Pedido</span>
            </h3>
            <p className={styles.subtitle}>
              {table ? `Mesa: ${table.name}` : orderType === 'TAKEAWAY' ? 'Pedido Para Llevar' : 'Domicilio'}
            </p>
          </div>

          <button onClick={onClose} className={styles.closeBtn}>
            <X size={16} />
          </button>
        </div>

        {/* Contenido del Cobro */}
        <div className={styles.content}>
          {/* Banner de Total */}
          <div className={styles.totalBanner}>
            <span className={styles.totalBannerLabel}>Total a Cobrar</span>
            <span className={styles.totalBannerAmount}>
              ${finalTotal.toLocaleString('es-CO')}
            </span>
          </div>

          {/* Selector de Modo: Pago Total vs Dividir Cuenta */}
          <div className={styles.modeSelector}>
            <button
              type="button"
              className={`${styles.modeBtn} ${payMode === 'single' ? styles.modeBtnActive : ''}`}
              onClick={() => {
                triggerHaptic();
                setPayMode('single');
              }}
            >
              <CreditCard size={14} /> Pago Total
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${payMode === 'split' ? styles.modeBtnActive : ''}`}
              onClick={() => {
                triggerHaptic();
                setPayMode('split');
              }}
            >
              <Users size={14} /> Dividir Cuenta
            </button>
          </div>

          {/* ==================================================== */}
          {/* MODO 1: PAGO TOTAL / ÚNICO                           */}
          {/* ==================================================== */}
          {payMode === 'single' && (
            <>
              {/* Selección de Cliente */}
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Cliente</span>
                <div 
                  onClick={() => {
                    setShowCustomerSearch(true);
                    handleSearchCustomers('');
                  }}
                  className={styles.customerSelector}
                >
                  <div className={styles.customerInfo}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <User size={16} />
                    </div>
                    <div>
                      <h4 className={styles.customerName}>
                        {selectedCustomer ? selectedCustomer.name : 'Cliente General / Ocasional'}
                      </h4>
                      {selectedCustomer && (
                        <p className={styles.customerPhone}>
                          {selectedCustomer.phone || selectedCustomer.document || 'Sin documento'}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={styles.changeCustomerBtn}>Cambiar</span>
                </div>

                {/* Información de Deuda / Crédito del Cliente */}
                {selectedCustomer && customerCreditInfo && (
                  <div 
                    className={styles.creditBadgeCard}
                    style={{
                      borderLeft: customerCreditInfo.hasDebt 
                        ? '4px solid #EF4444' 
                        : '4px solid #10B981',
                      background: customerCreditInfo.hasDebt 
                        ? 'rgba(239, 68, 68, 0.08)' 
                        : 'rgba(16, 185, 129, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div className={styles.creditHeader}>
                      <span style={{ fontWeight: 800, color: customerCreditInfo.hasDebt ? '#F87171' : '#34D399', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {customerCreditInfo.hasDebt ? 'Cuenta con Deuda Activa' : 'Cliente al Día (Sin Deuda)'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                        {customerCreditInfo.creditsCount > 0 ? `${customerCreditInfo.creditsCount} movimientos` : 'Sin movimientos'}
                      </span>
                    </div>

                    <div className={styles.creditRow}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>Deuda actual acumulada:</span>
                      <span style={{ color: customerCreditInfo.hasDebt ? '#EF4444' : '#10B981', fontWeight: 900, fontSize: 14 }}>
                        ${customerCreditInfo.currentDebt.toLocaleString('es-CO')}
                      </span>
                    </div>

                    {isCredit && (
                      <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Nueva deuda tras fiar:</span>
                        <strong style={{ color: '#F59E0B', fontWeight: 800, fontSize: 12 }}>
                          ${(customerCreditInfo.currentDebt + finalTotal).toLocaleString('es-CO')}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Métodos de Pago */}
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Método de Pago</span>
                <div className={styles.paymentGrid}>
                  {paymentMethods.map((method) => {
                    const isSelected = selectedMethodId === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setSelectedMethodId(method.id);
                        }}
                        className={`${styles.paymentOption} ${isSelected ? styles.paymentOptionActive : ''}`}
                      >
                        {getMethodIcon(method)}
                        <span>{method.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Si es Efectivo: Monto recibido y cambio */}
              {isCash && (
                <div className={styles.cashDetailsBox}>
                  <div className={styles.cashInputGroup}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Efectivo Recibido</label>
                    <input
                      type="number"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      placeholder={`Mínimo: $${finalTotal.toLocaleString('es-CO')}`}
                      className={styles.cashInput}
                    />
                  </div>

                  <div className={styles.cashShortcuts}>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(String(finalTotal))}
                      className={styles.shortcutBtn}
                    >
                      Exacto
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount('20000')}
                      className={styles.shortcutBtn}
                    >
                      $20.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount('50000')}
                      className={styles.shortcutBtn}
                    >
                      $50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount('100000')}
                      className={styles.shortcutBtn}
                    >
                      $100.000
                    </button>
                  </div>

                  <div className={styles.changeRow}>
                    <span className={styles.changeLabel}>Cambio / Vuelto</span>
                    <span className={styles.changeValue}>
                      ${changeAmount.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================================================== */}
          {/* MODO 2: DIVIDIR CUENTA / PAGO MIXTO                   */}
          {/* ==================================================== */}
          {payMode === 'split' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Presets de división */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className={styles.sectionLabel}>Dividir en partes iguales:</span>
                <div className={styles.splitPresetsContainer}>
                  <button type="button" onClick={() => handleQuickPreset(2)} className={styles.presetChip}>
                    2 personas (${Math.round(finalTotal / 2).toLocaleString('es-CO')})
                  </button>
                  <button type="button" onClick={() => handleQuickPreset(3)} className={styles.presetChip}>
                    3 personas (${Math.round(finalTotal / 3).toLocaleString('es-CO')})
                  </button>
                  <button type="button" onClick={() => handleQuickPreset(4)} className={styles.presetChip}>
                    4 personas (${Math.round(finalTotal / 4).toLocaleString('es-CO')})
                  </button>
                </div>
              </div>

              {/* Lista de pagos de las personas */}
              <div className={styles.splitList}>
                {splitPayments.map((p, idx) => (
                  <div key={p.id} className={styles.splitCard}>
                    <div className={styles.splitCardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={styles.splitBadge}>Pago #{idx + 1}</span>
                        <input
                          type="text"
                          value={p.notes || ''}
                          onChange={(e) => handleUpdateSplitRow(p.id, 'notes', e.target.value)}
                          placeholder="Nota (ej. Chica 1)"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-dim)',
                            fontSize: 11,
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                      </div>

                      {splitPayments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplitRow(p.id)}
                          className={styles.splitDeleteBtn}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className={styles.splitCardInputs}>
                      <select
                        value={p.paymentMethodId}
                        onChange={(e) => handleUpdateSplitRow(p.id, 'paymentMethodId', e.target.value)}
                        className={styles.splitSelect}
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={p.amount}
                        onChange={(e) => handleUpdateSplitRow(p.id, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className={styles.splitAmountInput}
                        placeholder="$0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para agregar otro pago */}
              <button
                type="button"
                onClick={handleAddSplitRow}
                className={styles.addSplitBtn}
              >
                <Plus size={16} /> Agregar otro pago
                {splitDifference > 0 && ` ($${splitDifference.toLocaleString('es-CO')} restante)`}
              </button>

              {/* Balance / Cuadre */}
              <div className={`${styles.splitBalanceBox} ${
                isSplitExact 
                  ? styles.splitBalanceExact 
                  : splitDifference > 0 
                    ? styles.splitBalancePending 
                    : styles.splitBalanceExcess
              }`}>
                <div className={styles.splitBalanceRow}>
                  <span>Total asignado:</span>
                  <strong>${splitTotalAssigned.toLocaleString('es-CO')} / ${finalTotal.toLocaleString('es-CO')}</strong>
                </div>

                <div className={styles.splitBalanceRow}>
                  {isSplitExact ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> ¡Cuenta cuadrada perfectamente!
                    </span>
                  ) : splitDifference > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <AlertCircle size={16} /> Falta por asignar: ${splitDifference.toLocaleString('es-CO')}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <AlertCircle size={16} /> Excede el total por: ${Math.abs(splitDifference).toLocaleString('es-CO')}
                    </span>
                  )}
                </div>
              </div>

              {/* Cliente opcional u obligatorio si hay crédito */}
              <div className={styles.section} style={{ marginTop: 4 }}>
                <span className={styles.sectionLabel}>
                  Cliente {hasSplitCredit ? <span style={{ color: '#EF4444' }}>* Obligatorio por crédito</span> : '(Opcional)'}
                </span>
                <div 
                  onClick={() => {
                    setShowCustomerSearch(true);
                    handleSearchCustomers('');
                  }}
                  className={styles.customerSelector}
                >
                  <div className={styles.customerInfo}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <User size={14} />
                    </div>
                    <div>
                      <h4 className={styles.customerName}>
                        {selectedCustomer ? selectedCustomer.name : 'Cliente General / Ocasional'}
                      </h4>
                    </div>
                  </div>
                  <span className={styles.changeCustomerBtn}>Cambiar</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer y Botón de Cobro */}
        <div className={styles.footer}>
          <button
            onClick={handleProcessCheckout}
            disabled={processing || (payMode === 'split' && !isSplitExact)}
            className={`${styles.confirmBtn} ${processing ? styles.confirmBtnLoading : ''}`}
          >
            {processing ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                <Check size={18} />
                <span>
                  {payMode === 'split'
                    ? `Confirmar Pago Dividido ($${splitTotalAssigned.toLocaleString('es-CO')})`
                    : `Confirmar y Cobrar $${finalTotal.toLocaleString('es-CO')}`
                  }
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Búsqueda de Clientes */}
      {showCustomerSearch && (
        <div className={styles.customerModalOverlay}>
          <div className={`${styles.customerModalCard} animate-slide-up`}>
            <div className={styles.header}>
              <h3 className={styles.title}>Seleccionar Cliente</h3>
              <button onClick={() => setShowCustomerSearch(false)} className={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => handleSearchCustomers(e.target.value)}
              placeholder="Buscar por nombre, cédula o teléfono..."
              className={styles.customerSearchInput}
              autoFocus
            />

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {/* Opción Cliente General */}
              <div 
                onClick={() => handleSelectCustomer(null)}
                className={styles.customerItem}
              >
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Cliente General / Consumidor Final
                  </h4>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>Venta sin asignación</p>
                </div>
                <ChevronRight size={16} color="var(--text-dim)" />
              </div>

              {customersList.map((c) => {
                const bal = parseFloat(c.balance || 0);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={styles.customerItem}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </h4>
                      <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {c.phone ? `Tel: ${c.phone} • ` : ''}{c.document || 'Sin cédula'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {bal > 0 ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: 6 }}>
                          Debe: ${bal.toLocaleString('es-CO')}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: 6 }}>
                          Al día
                        </span>
                      )}
                      <ChevronRight size={16} color="var(--text-dim)" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutModal;
