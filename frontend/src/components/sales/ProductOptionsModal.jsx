import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Minus, Sparkles, Tag, Layers, Package } from 'lucide-react';
import { getFullImageUrl } from '../../utils/imageUrl';
import styles from './ProductOptionsModal.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { 
  style: 'currency', 
  currency: 'COP', 
  minimumFractionDigits: 0 
}).format(value);

const ProductOptionsModal = ({ product, onClose, onAddToCart }) => {
  const [selectedModifiers, setSelectedModifiers] = useState({});
  // selectedAdditions: array of { ...addition, quantity: 1 }
  const [selectedAdditions, setSelectedAdditions] = useState([]);

  useEffect(() => {
    if (product.modifiers) {
      const initialModifiers = {};
      product.modifiers.forEach(mod => {
        if (mod.isRequired && mod.options && mod.options.length > 0) {
          const sortedOptions = [...mod.options].sort((a, b) => (parseFloat(a.priceExtra) || 0) - (parseFloat(b.priceExtra) || 0));
          initialModifiers[mod.id] = sortedOptions[0];
        }
      });
      setSelectedModifiers(initialModifiers);
    }
  }, [product]);

  const toggleAddition = (addition) => {
    setSelectedAdditions(prev => {
      const existing = prev.find(a => a.id === addition.id);
      if (existing) {
        return prev.filter(a => a.id !== addition.id);
      } else {
        return [...prev, { ...addition, quantity: 1 }];
      }
    });
  };

  const updateAdditionQuantity = (additionId, delta, e) => {
    if (e) e.stopPropagation();
    setSelectedAdditions(prev => 
      prev.map(a => {
        if (a.id === additionId) {
          const newQty = (a.quantity || 1) + delta;
          return newQty > 0 ? { ...a, quantity: newQty } : null;
        }
        return a;
      }).filter(Boolean)
    );
  };

  // Calcular precio total dinámico
  const modifiersExtra = Object.values(selectedModifiers).reduce(
    (sum, opt) => sum + (parseFloat(opt?.priceExtra) || 0), 0
  );

  const additionsTotal = selectedAdditions.reduce(
    (sum, add) => sum + ((parseFloat(add.price) || 0) * (add.quantity || 1)), 0
  );

  const basePrice = parseFloat(product.price) || 0;
  const currentTotal = basePrice + modifiersExtra + additionsTotal;

  const handleConfirm = () => {
    for (const mod of product.modifiers || []) {
      if (mod.isRequired && !selectedModifiers[mod.id]) {
        return alert(`Debes seleccionar una opción para: ${mod.name}`);
      }
    }

    const modifiersArray = Object.values(selectedModifiers);

    onAddToCart({
      product,
      quantity: 1,
      modifiers: modifiersArray.map(m => ({
        modifierId: m.id,
        variationId: m.id,
        optionName: m.name,
        name: m.name,
        priceExtra: m.priceExtra,
        price: m.priceExtra
      })),
      variations: modifiersArray.map(m => ({
        variationId: m.id,
        optionName: m.name,
        price: m.priceExtra || 0
      })),
      additions: selectedAdditions.map(a => ({
        additionId: a.id,
        name: a.name,
        price: a.price,
        quantity: a.quantity || 1
      })),
      finalPrice: currentTotal
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        {/* CABECERA */}
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {product.imageUrl ? (
              <img
                src={getFullImageUrl(product.imageUrl)}
                alt={product.name}
                style={{
                  width: '3.25rem',
                  height: '3.25rem',
                  borderRadius: 'var(--radius-lg, 0.75rem)',
                  objectFit: 'cover',
                  border: '1.5px solid var(--border-color, #e2e8f0)',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-xl)', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {product.isCombo ? <Sparkles size={22} style={{ color: '#f59e0b' }} /> : <Tag size={22} />}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, lineHeight: 1.2 }}>
                  {product.name}
                </h2>
                {product.isCombo && (
                  <span style={{ fontSize: '0.625rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Combo
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, margin: '0.2rem 0 0 0' }}>
                Base: {formatCurrency(basePrice)}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="neo-btn neo-btn-ghost"
            style={{ padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className={styles.body}>
          
          {/* MODIFICADORES / PASOS DEL COMBO */}
          {product.modifiers?.map((modifier, modIdx) => (
            <div key={modifier.id || modIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <span className={styles.stepNum}>
                    {modIdx + 1}
                  </span>
                  {modifier.name}
                  {modifier.isRequired && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 900 }}>*</span>}
                </p>
                {modifier.isRequired && (
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Requerido</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {[...modifier.options].sort((a, b) => (parseFloat(a.priceExtra) || 0) - (parseFloat(b.priceExtra) || 0)).map(option => {
                  const isSelected = selectedModifiers[modifier.id]?.id === option.id;
                  const priceExtra = parseFloat(option.priceExtra || 0);

                  return (
                    <div
                      key={option.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedModifiers(prev => ({ ...prev, [modifier.id]: option }))}
                      className={`${styles.posOptionBox} ${isSelected ? styles.selected : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={`${styles.radioCircle} ${isSelected ? styles.active : ''}`}>
                          {isSelected && <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: 'var(--radius-full)', backgroundColor: '#ffffff' }}></div>}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-main)', display: 'block' }}>
                            {option.name}
                          </span>
                          {option.linkedProductId && (
                            <span style={{ fontSize: '0.6875rem', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                              <Sparkles size={11} /> Incluido en el Combo
                            </span>
                          )}
                        </div>
                      </div>

                      {priceExtra > 0 ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
                          +{formatCurrency(priceExtra)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Incluido</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ADICIONES EXTRAS */}
          {product.additions?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Plus size={16} style={{ color: '#10b981' }} />
                  Adiciones Extra
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Opcionales</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {product.additions.map(addition => {
                  const selectedItem = selectedAdditions.find(a => a.id === addition.id);
                  const isSelected = Boolean(selectedItem);
                  const price = parseFloat(addition.price || 0);

                  return (
                    <div
                      key={addition.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleAddition(addition)}
                      className={`${styles.posOptionBox} ${isSelected ? styles['posOptionBox.addition-selected'] || styles['addition-selected'] : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={`${styles.checkboxBox} ${isSelected ? styles.active : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? '#047857' : 'var(--text-main)', display: 'block' }}>
                            {addition.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            +{formatCurrency(price)} c/u
                          </span>
                        </div>
                      </div>

                      {/* Control de Cantidad de Adición si está seleccionada */}
                      {isSelected ? (
                        <div 
                          className={styles.qtyCtrl}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => updateAdditionQuantity(addition.id, -1, e)}
                            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontWeight: 900, fontSize: '0.75rem', width: '1.25rem', textAlign: 'center', color: '#047857' }}>
                            {selectedItem.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => updateAdditionQuantity(addition.id, 1, e)}
                            style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                          +{formatCurrency(price)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PIE DEL MODAL CON TOTAL Y ACCIÓN */}
        <div className={styles.footer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>Total con Extras</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  {formatCurrency(currentTotal)}
                </span>
                {(modifiersExtra > 0 || additionsTotal > 0) && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                    (+{formatCurrency(modifiersExtra + additionsTotal)})
                  </span>
                )}
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="neo-btn neo-btn-ghost"
              style={{ fontSize: '0.75rem', fontWeight: 700 }}
            >
              Cancelar
            </button>
          </div>

          <button 
            type="button"
            onClick={handleConfirm} 
            className="neo-btn neo-btn-primary"
            style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontSize: '1rem', fontWeight: 900 }}
          >
            <span>Agregar al Pedido</span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span>{formatCurrency(currentTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductOptionsModal;