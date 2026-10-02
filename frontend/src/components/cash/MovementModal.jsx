import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, FormGroup } from '../ui/Input';
import styles from './MovementModal.module.css';

const MovementModal = ({ isOpen, onClose, onSubmit, type }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isIncome = type === 'IN';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await onSubmit({
      type,
      amount: parseFloat(amount),
      description
    });

    if (!result.success) {
      setError(result.message);
      setLoading(false);
    } else {
      setAmount('');
      setDescription('');
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isIncome ? 'Registrar Ingreso de Caja' : 'Registrar Retiro de Caja'}
      icon={isIncome ? <ArrowUpCircle size={22} style={{ color: '#34d399' }} /> : <ArrowDownCircle size={22} style={{ color: '#f87171' }} />}
      headerStyle={{
        backgroundColor: '#1e293b',
        borderBottom: `2px solid ${isIncome ? '#10b981' : '#ef4444'}`
      }}
      titleStyle={{
        color: '#ffffff'
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="movement-form"
            disabled={loading}
            variant={isIncome ? 'success' : 'danger'}
          >
            {loading ? 'Guardando...' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={handleSubmit}>
        <div className={styles.body}>
          {error && (
            <div className={styles.errorAlert}>
              {error}
            </div>
          )}

          <FormGroup label="Monto ($)" required>
            <Input 
              type="number" 
              step="0.01" 
              required 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              className={styles.amountInput}
              placeholder="0.00"
            />
          </FormGroup>

          <FormGroup label="Concepto / Descripción" required>
            <Input 
              type="text" 
              required 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder={isIncome ? 'Ej: Base adicional' : 'Ej: Pago proveedor hielo'}
            />
          </FormGroup>
        </div>
      </form>
    </Modal>
  );
};

export default MovementModal;