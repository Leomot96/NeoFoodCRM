import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, User } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import styles from './CheckoutModal.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);

const CheckoutModal = ({ isOpen, onClose, cartTotal, paymentMethods, customers, onConfirm }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && paymentMethods.length > 0) {
      setSelectedMethod(paymentMethods[0].id);
      setReceivedAmount(cartTotal.toString());
      setSelectedCustomer('');
    }
  }, [isOpen, paymentMethods, cartTotal]);

  if (!isOpen) return null;

  const currentMethodName = paymentMethods.find(m => m.id === selectedMethod)?.name?.toLowerCase() || '';
  const isCredit = currentMethodName.includes('crédito') || currentMethodName.includes('credito') || currentMethodName.includes('fiao');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isCredit && !selectedCustomer) {
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
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Cobrar Pedido"
      icon={<DollarSign style={{ color: 'var(--success)' }} />}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.body}>
          <div className={styles.totalSection}>
            <p className={styles.totalLabel}>Total a cobrar</p>
            <p className={styles.totalValue}>{formatCurrency(cartTotal)}</p>
          </div>

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16}/> Cliente {isCredit ? <span style={{ color: 'var(--danger)' }}>* Obligatorio</span> : <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Opcional)</span>}
            </label>
            <CustomSelect
              value={selectedCustomer}
              onChange={(val) => setSelectedCustomer(val)}
              options={[
                { value: "", label: "Consumidor Final" },
                ...(customers || []).map(c => ({ value: c.id, label: `${c.name} ${c.document ? `- ${c.document}` : ''}` }))
              ]}
              placeholder="Consumidor Final"
            />
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <Button 
            type="submit" 
            variant="success"
            disabled={isSubmitting || (isCredit && !selectedCustomer)} 
            className={styles.submitBtn}
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CheckoutModal;