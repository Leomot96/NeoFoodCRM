import React, { useState, useEffect } from 'react';
import { 
  X, PlusCircle, MinusCircle, Target, ArrowUpDown, 
  AlertTriangle, Check, Loader2, Package, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import CustomSelect from '../ui/CustomSelect';
import styles from './StockAdjustmentModal.module.css';

const QUICK_REASONS = {
  IN: [
    'Inventario inicial',
    'Entrada adicional',
    'Ajuste por conteo positivo',
    'Donación / Bonificación'
  ],
  OUT: [
    'Producto dañado / Avería',
    'Merma / Desperdicio',
    'Vencimiento',
    'Consumo interno / Cortesía'
  ],
  SET: [
    'Inventario inicial',
    'Ajuste por conteo físico exacto',
    'Cuadre de inventario'
  ]
};

export const StockAdjustmentModal = ({
  isOpen,
  onClose,
  initialItem = null,
  itemType = 'ingredient', // 'ingredient' | 'product'
  ingredientsList = [],
  productsList = [],
  onSuccess
}) => {
  const [selectedId, setSelectedId] = useState('');
  const [type, setType] = useState('IN'); // 'IN' | 'OUT' | 'SET'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Inventario inicial');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Item seleccionado actualmente
  const currentItem = initialItem 
    ? initialItem 
    : (itemType === 'ingredient' 
        ? ingredientsList.find(i => i.id === selectedId) 
        : productsList.find(p => p.id === selectedId));

  const currentStock = parseFloat(
    (itemType === 'ingredient' ? currentItem?.currentStock : currentItem?.stock) || 0
  );

  const unitName = itemType === 'ingredient' ? (currentItem?.unit || 'unidades') : 'unidades';

  // Al abrir el modal o cambiar el item inicial
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setQuantity('');
      if (initialItem) {
        setSelectedId(initialItem.id);
      } else {
        const first = itemType === 'ingredient' ? ingredientsList[0] : productsList[0];
        if (first) setSelectedId(first.id);
      }
      setType('IN');
      setReason('Inventario inicial');
    }
  }, [isOpen, initialItem, itemType]);

  // Al cambiar el tipo de ajuste, sincronizar motivo por defecto
  const handleTypeChange = (newType) => {
    setType(newType);
    setErrorMsg('');
    const defaultReasons = QUICK_REASONS[newType] || [];
    if (defaultReasons.length > 0) {
      setReason(defaultReasons[0]);
    }
  };

  // Cálculo en tiempo real del nuevo stock
  const numericQty = parseFloat(quantity) || 0;
  let calculatedNewStock = currentStock;

  if (type === 'IN') {
    calculatedNewStock = currentStock + numericQty;
  } else if (type === 'OUT') {
    calculatedNewStock = currentStock - numericQty;
  } else if (type === 'SET') {
    calculatedNewStock = numericQty;
  }

  const isNegative = calculatedNewStock < 0;

  // Manejo de envío
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentItem) {
      setErrorMsg('Debes seleccionar un insumo o producto');
      return;
    }

    if (isNaN(numericQty) || numericQty < 0) {
      setErrorMsg('Por favor ingresa una cantidad válida');
      return;
    }

    if ((type === 'IN' || type === 'OUT') && numericQty <= 0) {
      setErrorMsg('La cantidad a sumar o restar debe ser mayor a 0');
      return;
    }

    if (isNegative) {
      setErrorMsg(`El ajuste resulta en stock negativo (${calculatedNewStock} ${unitName}). El stock actual es de ${currentStock} ${unitName}.`);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type: type === 'SET' ? 'ADJUSTMENT' : type,
        quantity: numericQty,
        reason: reason.trim() || (type === 'IN' ? 'Entrada manual' : type === 'OUT' ? 'Salida por merma/daño' : 'Ajuste exacto'),
        ...(itemType === 'ingredient' ? { ingredientId: currentItem.id } : { productId: currentItem.id })
      };

      const res = await api.post('/inventory/movements', payload);

      if (onSuccess) {
        onSuccess(res.data?.data || { ...currentItem, currentStock: calculatedNewStock, stock: calculatedNewStock });
      }

      onClose();
    } catch (err) {
      console.error('Error al registrar ajuste:', err);
      const msg = err.response?.data?.message || err.message || 'No fue posible registrar el ajuste de stock';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Atajo de teclado Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <div className={styles.headerIcon}>
              <ArrowUpDown size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Ajustar Stock a Voluntad</h2>
              <p className={styles.subtitle}>
                {itemType === 'ingredient' ? 'Bodega de Materia Prima e Insumos' : 'Catálogo de Productos para Venta'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className={styles.closeBtn}
            title="Cerrar modal (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className={styles.body}>
            {/* SELECTOR DE ITEM (Si no vino preseleccionado) */}
            {!initialItem && (
              <div>
                <label className={styles.sectionLabel}>
                  <Package size={14} /> Seleccionar {itemType === 'ingredient' ? 'Insumo' : 'Producto'}
                </label>
                <CustomSelect
                  value={selectedId}
                  onChange={(val) => {
                    setSelectedId(val);
                    setErrorMsg('');
                  }}
                  options={
                    itemType === 'ingredient'
                      ? ingredientsList.map(i => ({ value: i.id, label: `${i.name} (${i.currentStock} ${i.unit})` }))
                      : productsList.map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.stock || 0})` }))
                  }
                  placeholder={`Elige un ${itemType === 'ingredient' ? 'insumo' : 'producto'}...`}
                />
              </div>
            )}

            {/* BANNER DEL ITEM SELECCIONADO */}
            {currentItem && (
              <div className={styles.itemBanner}>
                <div>
                  <h3 className={styles.itemName}>{currentItem.name}</h3>
                  <p className={styles.itemUnit}>
                    Unidad de medida: <strong>{unitName}</strong>
                  </p>
                </div>
                <div className={styles.currentStockBadge}>
                  <div className={styles.stockLabel}>Stock Actual</div>
                  <div className={styles.stockValue}>
                    {currentStock.toLocaleString('es-CO')} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{unitName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TIPO DE AJUSTE (3 OPCIONES) */}
            <div>
              <label className={styles.sectionLabel}>
                <Sparkles size={14} /> Acción a Realizar
              </label>
              <div className={styles.typeGrid}>
                {/* 1. AUMENTAR */}
                <div
                  className={`${styles.typeCard} ${type === 'IN' ? styles.activeIn : ''}`}
                  onClick={() => handleTypeChange('IN')}
                >
                  <PlusCircle size={22} className={styles.typeIcon} color={type === 'IN' ? '#059669' : '#10b981'} />
                  <span className={styles.typeLabel}>Aumentar (+)</span>
                  <span className={styles.typeDesc}>Entrada o stock inicial</span>
                </div>

                {/* 2. DISMINUIR */}
                <div
                  className={`${styles.typeCard} ${type === 'OUT' ? styles.activeOut : ''}`}
                  onClick={() => handleTypeChange('OUT')}
                >
                  <MinusCircle size={22} className={styles.typeIcon} color={type === 'OUT' ? '#dc2626' : '#ef4444'} />
                  <span className={styles.typeLabel}>Disminuir (-)</span>
                  <span className={styles.typeDesc}>Daño, merma o avería</span>
                </div>

                {/* 3. FIJAR EXACTO */}
                <div
                  className={`${styles.typeCard} ${type === 'SET' ? styles.activeSet : ''}`}
                  onClick={() => handleTypeChange('SET')}
                >
                  <Target size={22} className={styles.typeIcon} color={type === 'SET' ? '#4338ca' : '#6366f1'} />
                  <span className={styles.typeLabel}>Fijar Exacto (=)</span>
                  <span className={styles.typeDesc}>Conteo físico exacto</span>
                </div>
              </div>
            </div>

            {/* CANTIDAD A AJUSTAR */}
            <div className={styles.quantityWrapper}>
              <label className={styles.sectionLabel}>
                {type === 'IN' && 'Cantidad a Aumentar:'}
                {type === 'OUT' && 'Cantidad a Restar (Dañado/Merma):'}
                {type === 'SET' && 'Nuevo Stock Exacto:'}
              </label>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder={type === 'SET' ? 'Ej: 50' : 'Ej: 10'}
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrorMsg('');
                  }}
                  className={styles.qtyInput}
                  required
                />
                <span className={styles.unitSuffix}>{unitName}</span>
              </div>

              {/* TARJETA DE CÁLCULO EN TIEMPO REAL */}
              {currentItem && quantity !== '' && !isNaN(numericQty) && (
                <div className={styles.previewCard} style={{ borderColor: isNegative ? '#fca5a5' : '#cbd5e1', backgroundColor: isNegative ? '#fff1f2' : '#f8fafc' }}>
                  <div className={styles.previewStep}>
                    <span className={styles.previewStepLabel}>Stock Actual</span>
                    <span className={styles.previewStepValue}>{currentStock} {unitName}</span>
                  </div>

                  <span className={styles.previewArrow}>
                    {type === 'IN' && `+ ${numericQty}`}
                    {type === 'OUT' && `- ${numericQty}`}
                    {type === 'SET' && `➔`}
                  </span>

                  <div className={styles.previewStep} style={{ textAlign: 'right' }}>
                    <span className={styles.previewStepLabel}>Stock Resultante</span>
                    <span 
                      className={styles.previewStepValue}
                      style={{ 
                        color: isNegative ? '#b91c1c' : (type === 'IN' ? '#047857' : (type === 'OUT' ? '#b45309' : '#3730a3')),
                        fontSize: '1.05rem'
                      }}
                    >
                      {calculatedNewStock} {unitName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* MOTIVO DEL MOVIMIENTO */}
            <div>
              <label className={styles.sectionLabel}>Motivo o Causa del Ajuste</label>
              <div className={styles.chipsContainer}>
                {(QUICK_REASONS[type] || []).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`${styles.chipBtn} ${reason === r ? styles.chipBtnActive : ''}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Escribe o amplía el motivo (opcional)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="neo-input"
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            {/* ALERTA DE ERROR */}
            {errorMsg && (
              <div className={styles.alertError}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className="neo-btn neo-btn-ghost"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`neo-btn ${type === 'OUT' ? 'neo-btn-danger' : 'neo-btn-primary'}`}
              disabled={loading || isNegative || quantity === ''}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px', justifyContent: 'center' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Aplicar Ajuste</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal;
