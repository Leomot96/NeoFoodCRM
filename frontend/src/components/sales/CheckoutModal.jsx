import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, User, Users, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import styles from './CheckoutModal.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { 
  style: 'currency', 
  currency: 'COP',
  maximumFractionDigits: 0
}).format(value);

const CheckoutModal = ({ isOpen, onClose, cartTotal, paymentMethods = [], customers = [], onConfirm }) => {
  // Modo de pago: 'single' (Pago único) o 'split' (Dividir cuenta / Pago mixto)
  const [payMode, setPayMode] = useState('single');

  // Estados para Pago Único
  const [selectedMethod, setSelectedMethod] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Cuenta Dividida (Pago Mixto)
  const [splitPayments, setSplitPayments] = useState([]);

  useEffect(() => {
    if (isOpen && paymentMethods.length > 0) {
      setSelectedMethod(paymentMethods[0].id);
      setReceivedAmount(cartTotal.toString());
      setSelectedCustomer('');
      setPayMode('single');

      // Inicializar división por defecto en 2 partes
      const half = Math.floor(cartTotal / 2);
      const rem = cartTotal - half;
      setSplitPayments([
        {
          id: 'p-1',
          paymentMethodId: paymentMethods[0].id,
          amount: rem,
          notes: 'Pago 1'
        },
        {
          id: 'p-2',
          paymentMethodId: paymentMethods[1]?.id || paymentMethods[0].id,
          amount: half,
          notes: 'Pago 2'
        }
      ]);
    }
  }, [isOpen, paymentMethods, cartTotal]);

  if (!isOpen) return null;

  const currentMethodName = paymentMethods.find(m => m.id === selectedMethod)?.name?.toLowerCase() || '';
  const isCreditSingle = currentMethodName.includes('crédito') || currentMethodName.includes('credito') || currentMethodName.includes('fiao');

  // Cálculos para cuenta dividida
  const splitTotalAssigned = splitPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const splitDifference = cartTotal - splitTotalAssigned;
  const isSplitExact = Math.abs(splitDifference) <= 1;

  // Verificar si alguno de los pagos divididos es a crédito
  const hasSplitCredit = splitPayments.some(p => {
    const pm = paymentMethods.find(m => m.id === p.paymentMethodId);
    const name = pm?.name?.toLowerCase() || '';
    return name.includes('crédito') || name.includes('credito') || name.includes('fiao');
  });

  // Presets rápidos (dividir en N partes iguales)
  const handleQuickPreset = (n) => {
    const base = Math.floor(cartTotal / n);
    const rem = cartTotal - (base * n);
    const newRows = [];
    for (let i = 0; i < n; i++) {
      const pm = paymentMethods[i % paymentMethods.length] || paymentMethods[0];
      newRows.push({
        id: `preset-${Date.now()}-${i}`,
        paymentMethodId: pm?.id || '',
        amount: i === 0 ? base + rem : base,
        notes: `Pago ${i + 1}`
      });
    }
    setSplitPayments(newRows);
  };

  // Agregar una nueva fila de pago
  const handleAddSplitRow = () => {
    const remaining = Math.max(0, splitDifference);
    const nextIndex = splitPayments.length + 1;
    const pm = paymentMethods[splitPayments.length % paymentMethods.length] || paymentMethods[0];
    setSplitPayments([
      ...splitPayments,
      {
        id: `row-${Date.now()}`,
        paymentMethodId: pm?.id || '',
        amount: remaining,
        notes: `Pago ${nextIndex}`
      }
    ]);
  };

  // Actualizar un pago específico
  const handleUpdateSplitRow = (id, field, value) => {
    setSplitPayments(splitPayments.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Eliminar un pago
  const handleRemoveSplitRow = (id) => {
    if (splitPayments.length <= 1) return;
    setSplitPayments(splitPayments.filter(p => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (payMode === 'single') {
      if (isCreditSingle && !selectedCustomer) {
        return alert('Obligatorio: Debes seleccionar a qué cliente le vas a fiar este pedido.');
      }

      setIsSubmitting(true);
      try {
        const result = await onConfirm(selectedMethod, parseFloat(receivedAmount), selectedCustomer || null);
        if (result && result.success) {
          onClose();
        } else if (result && !result.success) {
          alert(result.message || 'Error al procesar el pago');
        }
      } catch (error) {
        alert(error.response?.data?.message || 'Error procesando el pago');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Modo dividido
      if (!isSplitExact) {
        if (splitDifference > 0) {
          return alert(`Falta por asignar ${formatCurrency(splitDifference)} para cubrir la totalidad de la cuenta.`);
        } else {
          return alert(`La suma de los pagos excede el total por ${formatCurrency(Math.abs(splitDifference))}.`);
        }
      }

      if (hasSplitCredit && !selectedCustomer) {
        return alert('Obligatorio: Uno o más pagos son a crédito / fiado. Debes seleccionar el cliente.');
      }

      setIsSubmitting(true);
      try {
        const cleanedPayments = splitPayments.map(p => ({
          paymentMethodId: p.paymentMethodId,
          amount: parseFloat(p.amount) || 0,
          notes: p.notes || null
        }));

        const result = await onConfirm(
          cleanedPayments[0].paymentMethodId,
          cartTotal,
          selectedCustomer || null,
          { payments: cleanedPayments }
        );

        if (result && result.success) {
          onClose();
        } else if (result && !result.success) {
          alert(result.message || 'Error al procesar el pago dividido');
        }
      } catch (error) {
        alert(error.response?.data?.message || 'Error procesando el pago');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={payMode === 'split' ? 'lg' : 'md'}
      className={payMode === 'split' ? styles.splitModalWide : styles.modalNarrow}
      title="Cobrar Pedido"
      icon={<DollarSign style={{ color: 'var(--success)' }} />}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.body}>
          {/* Total a Cobrar */}
          <div className={styles.totalSection}>
            <p className={styles.totalLabel}>Total a cobrar</p>
            <p className={styles.totalValue}>{formatCurrency(cartTotal)}</p>
          </div>

          {/* Selector de Modo: Pago Único vs Dividir Cuenta */}
          <div className={styles.modeSelector}>
            <button
              type="button"
              className={`${styles.modeBtn} ${payMode === 'single' ? styles.modeBtnActive : ''}`}
              onClick={() => setPayMode('single')}
            >
              <CreditCard size={16} /> Pago Total
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${payMode === 'split' ? styles.modeBtnActive : ''}`}
              onClick={() => setPayMode('split')}
            >
              <Users size={16} /> Dividir Cuenta / Pago Mixto
            </button>
          </div>

          {/* ==================================================== */}
          {/* MODO 1: PAGO ÚNICO (TRADICIONAL)                     */}
          {/* ==================================================== */}
          {payMode === 'single' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Método de Pago
                </label>
                <div className={styles.methodsGrid}>
                  {paymentMethods.map(method => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setSelectedMethod(method.id);
                          if (method.name.toLowerCase().includes('crédito')) setReceivedAmount(cartTotal.toString());
                        }}
                        className={`${styles.methodBtn} ${isSelected ? styles.methodBtnSelected : ''}`}
                      >
                        <CreditCard size={16} /> {method.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentMethodName.includes('efectivo') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Efectivo Recibido
                  </label>
                  <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder={`Mínimo: ${cartTotal}`}
                    className={styles.splitInput}
                    style={{ fontSize: '1rem', padding: '0.65rem' }}
                  />
                  {parseFloat(receivedAmount) > cartTotal && (
                    <div style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 700, marginTop: '0.25rem' }}>
                      Cambio / Vuelto: {formatCurrency(parseFloat(receivedAmount) - cartTotal)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ==================================================== */}
          {/* MODO 2: DIVIDIR CUENTA / PAGO MIXTO                   */}
          {/* ==================================================== */}
          {payMode === 'split' && (
            <div className={styles.splitContainer}>
              {/* Presets Rápidos: Dividir entre N personas */}
              <div className={styles.presetsRow}>
                <span className={styles.presetsLabel}>
                  <Users size={14} /> Dividir partes iguales:
                </span>
                <button type="button" onClick={() => handleQuickPreset(2)} className={styles.presetBtn}>
                  2 partes ({formatCurrency(cartTotal / 2)})
                </button>
                <button type="button" onClick={() => handleQuickPreset(3)} className={styles.presetBtn}>
                  3 partes ({formatCurrency(cartTotal / 3)})
                </button>
                <button type="button" onClick={() => handleQuickPreset(4)} className={styles.presetBtn}>
                  4 partes ({formatCurrency(cartTotal / 4)})
                </button>
              </div>

              {/* Lista de Pagos / Personas */}
              <div className={styles.splitList}>
                {splitPayments.map((p, index) => {
                  return (
                    <div key={p.id} className={styles.splitCard}>
                      <div className={styles.splitCardHeader}>
                        <div className={styles.splitPersonBadgeGroup}>
                          <span className={styles.splitPersonBadge}>Pago #{index + 1}</span>
                          <input
                            type="text"
                            value={p.notes || ''}
                            onChange={(e) => handleUpdateSplitRow(p.id, 'notes', e.target.value)}
                            placeholder="Nombre o nota (ej. Chica 1 / Amiga)"
                            className={styles.splitNoteInput}
                          />
                        </div>

                        {splitPayments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitRow(p.id)}
                            className={styles.splitDeleteBtn}
                            title="Eliminar este pago"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className={styles.splitCardBody}>
                        <div className={styles.splitField}>
                          <label className={styles.splitFieldLabel}>Medio de Pago</label>
                          <CustomSelect
                            options={paymentMethods.map(m => ({ value: m.id, label: m.name }))}
                            value={p.paymentMethodId}
                            onChange={(val) => handleUpdateSplitRow(p.id, 'paymentMethodId', val)}
                            placeholder="Seleccionar medio..."
                          />
                        </div>

                        <div className={styles.splitField}>
                          <label className={styles.splitFieldLabel}>Monto a pagar</label>
                          <div className={styles.amountInputWrapper}>
                            <span className={styles.currencyPrefix}>$</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={p.amount}
                              onChange={(e) => handleUpdateSplitRow(p.id, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className={styles.splitInput}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón para agregar otro pago */}
              <button
                type="button"
                onClick={handleAddSplitRow}
                className={styles.addPaymentBtn}
              >
                <Plus size={16} /> Agregar otro pago
                {splitDifference > 0 && ` (${formatCurrency(splitDifference)} restante)`}
              </button>

              {/* Resumen de balance / cuadre */}
              <div className={`${styles.splitBalanceBox} ${
                isSplitExact 
                  ? styles.splitBalanceExact 
                  : splitDifference > 0 
                    ? styles.splitBalancePending 
                    : styles.splitBalanceExcess
              }`}>
                <div className={styles.balanceRow}>
                  <span>Total asignado:</span>
                  <strong>{formatCurrency(splitTotalAssigned)} / {formatCurrency(cartTotal)}</strong>
                </div>

                <div className={styles.balanceRow}>
                  {isSplitExact ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> ¡Cuenta cuadrada perfectamente!
                    </span>
                  ) : splitDifference > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                      <AlertTriangle size={16} /> Falta por asignar: {formatCurrency(splitDifference)}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                      <AlertTriangle size={16} /> Excede el total por: {formatCurrency(Math.abs(splitDifference))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selección de Cliente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16}/> Cliente {
                (payMode === 'single' ? isCreditSingle : hasSplitCredit) 
                  ? <span style={{ color: 'var(--danger)' }}>* Obligatorio por crédito</span> 
                  : <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Opcional)</span>
              }
            </label>
            <CustomSelect
              value={selectedCustomer}
              onChange={(val) => setSelectedCustomer(val)}
              options={[
                { value: "", label: "Consumidor Final" },
                ...(customers || [])
                  .filter(c => !(c.document === '222222222222' || c.name?.toLowerCase() === 'consumidor final'))
                  .map(c => ({ value: c.id, label: `${c.name} ${c.document ? `- ${c.document}` : ''}` }))
              ]}
              placeholder="Consumidor Final"
            />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <Button 
            type="submit" 
            variant="success"
            disabled={
              isSubmitting || 
              (payMode === 'single' && isCreditSingle && !selectedCustomer) ||
              (payMode === 'split' && (!isSplitExact || (hasSplitCredit && !selectedCustomer)))
            } 
            className={styles.submitBtn}
          >
            {isSubmitting 
              ? 'Procesando...' 
              : payMode === 'split'
                ? `Confirmar Pago Dividido (${formatCurrency(splitTotalAssigned)})`
                : 'Confirmar Pago'
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CheckoutModal;