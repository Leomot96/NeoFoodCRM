import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './ProductCustomizerModal.module.css';

export const ProductCustomizerModal = ({ isOpen, onClose, product, onConfirm }) => {
  const { triggerHaptic } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState({}); // { [modifierId]: optionObject }
  const [selectedAdditions, setSelectedAdditions] = useState([]); // [ additionObject ]
  const [customNotes, setCustomNotes] = useState('');

  // Modificadores / Variantes
  const modifiersList = product?.modifiers || [];
  // Adiciones / Extras
  const additionsList = product?.additions || [];

  // Función auxiliar para ordenar opciones por precio ascendente (0 o vacío va de primero)
  const getSortedOptions = (options = []) => {
    return [...options].sort((a, b) => {
      const priceA = Number(a.priceExtra ?? a.price ?? 0);
      const priceB = Number(b.priceExtra ?? b.price ?? 0);
      return priceA - priceB;
    });
  };

  // Reiniciar estado y pre-seleccionar variantes obligatorias al abrir un producto
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setCustomNotes('');
      setSelectedAdditions([]);

      const initialMods = {};
      (product.modifiers || []).forEach((mod) => {
        if (mod.options && mod.options.length > 0) {
          const sortedOptions = getSortedOptions(mod.options);
          // Si es obligatorio, seleccionamos la primera opción automáticamente (la gratuita / más económica)
          if (mod.isRequired) {
            initialMods[mod.id] = sortedOptions[0];
          }
        }
      });
      setSelectedModifiers(initialMods);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const basePrice = Number(product.price || product.salePrice || 0);

  // Calcular precio unitario con variantes y adiciones
  const modifiersExtra = Object.values(selectedModifiers).reduce(
    (acc, opt) => acc + Number(opt.price || opt.priceExtra || 0),
    0
  );

  const additionsExtra = selectedAdditions.reduce(
    (acc, add) => acc + Number(add.price || 0),
    0
  );

  const unitPrice = basePrice + modifiersExtra + additionsExtra;
  const totalPrice = unitPrice * quantity;

  const handleSelectModifierOption = (modifier, option) => {
    triggerHaptic();
    setSelectedModifiers((prev) => ({
      ...prev,
      [modifier.id]: option
    }));
  };

  const handleToggleAddition = (addition) => {
    triggerHaptic();
    setSelectedAdditions((prev) => {
      const exists = prev.find((a) => a.id === addition.id);
      if (exists) {
        return prev.filter((a) => a.id !== addition.id);
      }
      return [...prev, addition];
    });
  };

  const handleConfirm = () => {
    // Validar modificadores obligatorios
    for (const mod of modifiersList) {
      if (mod.isRequired && !selectedModifiers[mod.id]) {
        alert(`Por favor selecciona una opción para: ${mod.name}`);
        return;
      }
    }

    triggerHaptic();
    const configuredItem = {
      product,
      quantity,
      modifiers: Object.entries(selectedModifiers).map(([modId, opt]) => ({
        modifierId: modId,
        optionId: opt.id,
        name: opt.name,
        optionName: opt.name,
        priceExtra: Number(opt.price || opt.priceExtra || 0)
      })),
      additions: selectedAdditions.map((a) => ({
        additionId: a.id,
        name: a.name,
        price: Number(a.price || 0)
      })),
      notes: customNotes.trim(),
      unitPrice,
      subtotal: totalPrice
    };

    onConfirm(configuredItem);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} animate-slide-up`}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h3 className={styles.productName}>{product.name}</h3>
            {product.description && (
              <p className={styles.productDesc}>{product.description}</p>
            )}
            <p className={styles.productBasePrice}>
              Precio base: ${basePrice.toLocaleString('es-CO')}
            </p>
          </div>

          <button onClick={onClose} className={styles.closeBtn}>
            <X size={16} />
          </button>
        </div>

        {/* Opciones configurables */}
        <div className={styles.content}>
          {modifiersList.length === 0 && additionsList.length === 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Este producto no tiene variantes ni adiciones registradas en el sistema. Puedes especificar notas para cocina y la cantidad deseada.
              </p>
            </div>
          )}

          {/* Secciones de Modificadores (Variantes) */}
          {modifiersList.map((modifier) => (
            <div key={modifier.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{modifier.name}</span>
                {modifier.isRequired && (
                  <span className={styles.requiredBadge}>Obligatorio</span>
                )}
              </div>

              <div className={styles.optionsGrid}>
                {getSortedOptions(modifier.options || []).map((opt) => {
                  const isSelected = selectedModifiers[modifier.id]?.id === opt.id;
                  const extraPrice = Number(opt.priceExtra ?? opt.price ?? 0);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectModifierOption(modifier, opt)}
                      className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                    >
                      <div className={styles.optionName}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 99,
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 99,
                                backgroundColor: 'var(--primary)',
                              }}
                            />
                          )}
                        </div>
                        <span>{opt.name}</span>
                      </div>

                      {extraPrice > 0 ? (
                        <span className={styles.optionPrice}>
                          +${extraPrice.toLocaleString('es-CO')}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-light)' }}>
                          Incluido
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Adiciones Extras */}
          {additionsList.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Adiciones & Extras</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Opcional</span>
              </div>

              <div className={styles.optionsGrid}>
                {additionsList.map((add) => {
                  const isSelected = selectedAdditions.some((a) => a.id === add.id);
                  const addPrice = Number(add.price || 0);

                  return (
                    <div
                      key={add.id}
                      onClick={() => handleToggleAddition(add)}
                      className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                    >
                      <div className={styles.optionName}>
                        <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checkboxIndicatorActive : ''}`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>{add.name}</span>
                      </div>

                      {addPrice > 0 && (
                        <span className={styles.optionPrice}>
                          +${addPrice.toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notas de Cocina */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Notas para la Cocina</span>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ej: Término medio, sin cebolla, salsa aparte..."
              className={styles.notesInput}
            />
          </div>
        </div>

        {/* Footer con Cantidad y Botón de Agregar */}
        <div className={styles.footer}>
          <div className={styles.quantityControls}>
            <button
              onClick={() => {
                triggerHaptic();
                setQuantity(Math.max(1, quantity - 1));
              }}
              className={styles.qtyBtn}
            >
              <Minus size={14} />
            </button>
            <span className={styles.qtyValue}>{quantity}</span>
            <button
              onClick={() => {
                triggerHaptic();
                setQuantity(quantity + 1);
              }}
              className={styles.qtyBtn}
            >
              <Plus size={14} />
            </button>
          </div>

          <button onClick={handleConfirm} className={styles.addBtn}>
            <Check size={18} />
            <span>Agregar • ${totalPrice.toLocaleString('es-CO')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCustomizerModal;
