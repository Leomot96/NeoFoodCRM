import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, Minus, Utensils, 
  Send, X, MessageSquare, Check, AlertCircle, DollarSign, ShoppingBag, Bike 
} from 'lucide-react';
import { CheckoutModal } from '../components/CheckoutModal';
import { ProductCustomizerModal } from '../components/ProductCustomizerModal';
import styles from './OrderScreen.module.css';

export const OrderScreen = ({ 
  selectedTable, 
  orderType = 'DINE_IN', // 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
  onChangeTable, 
  onOrderCompleted 
}) => {
  const { triggerHaptic } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito de la comanda: array de { product, quantity, modifiers, additions, notes, unitPrice }
  const [cart, setCart] = useState([]);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [editingNotesItemIndex, setEditingNotesItemIndex] = useState(null);
  const [tempNotes, setTempNotes] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal de cobro directo
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        api.get('/inventory/categories').catch(() => ({ data: [] })),
        api.get('/inventory/products').catch(() => ({ data: [] })),
      ]);

      const catData = catRes.data?.data || catRes.data || [];
      const prodData = prodRes.data?.data || prodRes.data || [];

      setCategories(Array.isArray(catData) ? catData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error('Error al cargar menú:', err);
      setErrorMsg('Error al conectar con el inventario del restaurante');
    } finally {
      setLoading(false);
    }
  };

  // Al presionar un producto de la lista (abre modal de personalización con variantes, adiciones, cantidad y notas)
  const handleProductClick = (product) => {
    triggerHaptic();
    setCustomizingProduct(product);
  };

  const handleAddDirectItem = (product) => {
    const basePrice = Number(product.price || product.salePrice || 0);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && (!item.modifiers || item.modifiers.length === 0) && (!item.additions || item.additions.length === 0));
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, modifiers: [], additions: [], notes: '', unitPrice: basePrice }];
    });
  };

  const handleConfirmCustomization = (configuredItem) => {
    setCart((prev) => [...prev, configuredItem]);
  };

  // Reducir cantidad o eliminar ítem por índice
  const handleRemoveFromCartByIndex = (index) => {
    triggerHaptic();
    setCart((prev) => {
      const target = prev[index];
      if (target?.quantity > 1) {
        return prev.map((it, idx) => idx === index ? { ...it, quantity: it.quantity - 1 } : it);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleIncreaseCartByIndex = (index) => {
    triggerHaptic();
    setCart((prev) => prev.map((it, idx) => idx === index ? { ...it, quantity: it.quantity + 1 } : it));
  };

  // Total acumulado
  const totalAmount = cart.reduce((acc, item) => {
    const price = Number(item.unitPrice || item.product.price || item.product.salePrice || 0);
    return acc + price * item.quantity;
  }, 0);

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Filtrado de productos por categoría y búsqueda
  const filteredProducts = products.filter((prod) => {
    const matchCategory =
      activeCategoryId === 'ALL' ||
      prod.categoryId === activeCategoryId ||
      prod.category?.id === activeCategoryId;

    const matchSearch =
      !searchQuery.trim() ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCategory && matchSearch && prod.isActive !== false;
  });

  const handleSaveNotes = (index) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes: tempNotes };
      return copy;
    });
    setEditingNotesItemIndex(null);
    setTempNotes('');
  };

  // Enviar pedido a la mesa / cocina
  const handleSendOrder = async () => {
    if (orderType === 'DINE_IN' && !selectedTable?.id) {
      alert('Debes seleccionar una mesa primero');
      return;
    }
    if (cart.length === 0) return;

    setSendingOrder(true);
    setErrorMsg('');
    triggerHaptic();

    try {
      const payload = {
        tableId: selectedTable?.id || null,
        orderType: orderType,
        items: cart.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: Number(i.product.price || i.product.salePrice || 0),
          notes: i.notes || '',
        })),
        total: totalAmount,
      };

      if (selectedTable?.id) {
        await api.post(`/tables/${selectedTable.id}/order`, payload);
      } else {
        // Pedido para llevar o domicilio directo
        await api.post('/kitchen/orders', payload).catch(() => {});
      }

      setOrderSuccess(true);
      setCart([]);
      setTimeout(() => {
        setOrderSuccess(false);
        setShowCartSheet(false);
        if (onOrderCompleted) onOrderCompleted();
      }, 1200);
    } catch (err) {
      console.error('Error enviando pedido:', err);
      setErrorMsg(err.response?.data?.message || 'Error al enviar pedido a la cocina');
    } finally {
      setSendingOrder(false);
    }
  };

  const getTargetTitle = () => {
    if (orderType === 'TAKEAWAY') return 'Pedido Para Llevar';
    if (orderType === 'DELIVERY') return 'Pedido a Domicilio';
    return selectedTable ? (selectedTable.name || `Mesa ${selectedTable.number}`) : 'Mesa no seleccionada';
  };

  const getTargetIcon = () => {
    if (orderType === 'TAKEAWAY') return <ShoppingBag size={16} color="#FBBF24" />;
    if (orderType === 'DELIVERY') return <Bike size={16} color="#38BDF8" />;
    return selectedTable?.number || '#';
  };

  return (
    <div className={styles.container}>
      {/* Selector de Destino de la Orden */}
      <div className={styles.tableHeaderCard}>
        <div className={styles.tableInfoGroup}>
          <div className={styles.tableBadgeNumber}>
            {getTargetIcon()}
          </div>
          <div>
            <h2 className={styles.tableTitle}>{getTargetTitle()}</h2>
            <p className={styles.tableZone}>
              {orderType === 'DINE_IN' ? (selectedTable?.zone || 'Salón Principal') : 'Despacho directo'}
            </p>
          </div>
        </div>

        <button
          onClick={onChangeTable}
          className={styles.changeTableBtn}
        >
          {orderType === 'DINE_IN' ? 'Cambiar Mesa' : 'Cambiar Modo'}
        </button>
      </div>

      {/* Buscador de Platos */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar bebidas, entradas, platos..."
          className={styles.searchInput}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={styles.clearSearchBtn}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Carrusel de Categorías */}
      <div className={styles.categoriesScroll}>
        <button
          onClick={() => {
            triggerHaptic();
            setActiveCategoryId('ALL');
          }}
          className={`${styles.categoryChip} ${activeCategoryId === 'ALL' ? styles.categoryChipActive : ''}`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              triggerHaptic();
              setActiveCategoryId(cat.id);
            }}
            className={`${styles.categoryChip} ${activeCategoryId === cat.id ? styles.categoryChipActive : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Lista de Productos */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 60, borderRadius: 14, backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', margin: 'auto 0' }}>
          <Utensils size={32} color="var(--text-dim)" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No se encontraron productos en esta categoría</p>
        </div>
      ) : (
        <div className={styles.productList}>
          {filteredProducts.map((product) => {
            const hasOptions = (product.modifiers && product.modifiers.length > 0) || (product.additions && product.additions.length > 0);
            const inCartItemsCount = cart
              .filter((i) => i.product.id === product.id)
              .reduce((sum, i) => sum + i.quantity, 0);
            const price = Number(product.price || product.salePrice || 0);

            return (
              <div 
                key={product.id} 
                onClick={() => handleProductClick(product)}
                className={styles.productCard}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.productDetails}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h4 className={styles.productName}>{product.name}</h4>
                    {hasOptions && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99, backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        Opciones
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className={styles.productDesc}>{product.description}</p>
                  )}
                  <p className={styles.productPrice}>
                    ${price.toLocaleString('es-CO')}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {inCartItemsCount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 900, width: 22, height: 22, borderRadius: 99, backgroundColor: 'var(--secondary)', color: '#090D16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {inCartItemsCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                    className={styles.addBtn}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra Flotante de Pedido */}
      {cart.length > 0 && !showCartSheet && (
        <div className={`${styles.floatingBar} animate-slide-up`}>
          <div
            onClick={() => {
              triggerHaptic();
              setShowCartSheet(true);
            }}
            className={styles.floatingInner}
          >
            <div className={styles.floatingGroup}>
              <span className={styles.floatingCountBadge}>
                {totalItemsCount}
              </span>
              <div>
                <p className={styles.floatingTitle}>Ver Pedido en Curso</p>
                <p className={styles.floatingSubtitle}>
                  {getTargetTitle()}
                </p>
              </div>
            </div>

            <span className={styles.floatingTotal}>
              ${totalAmount.toLocaleString('es-CO')}
            </span>
          </div>
        </div>
      )}

      {/* Hoja Deslizante del Pedido (Bottom Sheet) */}
      {showCartSheet && (
        <div className={styles.sheetOverlay}>
          <div className={`${styles.sheetCard} animate-slide-up`}>
            {/* Header del pedido */}
            <div className={styles.sheetHeader}>
              <div>
                <h3 className={styles.sheetTitle}>
                  Pedido: {getTargetTitle()}
                </h3>
                <p className={styles.sheetSubtitle}>{totalItemsCount} platos en orden</p>
              </div>

              <button
                onClick={() => setShowCartSheet(false)}
                className={styles.closeBtn}
              >
                <X size={16} />
              </button>
            </div>

            {/* Error si ocurre */}
            {errorMsg && (
              <div style={{ margin: '12px 16px 0', padding: 12, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Lista de Ítems */}
            <div className={styles.sheetItemsList}>
              {cart.map((item, index) => {
                const itemUnitPrice = Number(item.unitPrice || item.product.price || item.product.salePrice || 0);

                return (
                  <div key={index} className={styles.sheetItem}>
                    <div className={styles.sheetItemTop}>
                      <div style={{ flex: 1, paddingRight: 8 }}>
                        <h4 className={styles.sheetItemName}>{item.product.name}</h4>
                        
                        {/* Variantes seleccionadas */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--primary-light)', marginTop: 2 }}>
                            {item.modifiers.map((m, mIdx) => (
                              <span key={mIdx} style={{ marginRight: 6 }}>
                                • {m.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Adiciones seleccionadas */}
                        {item.additions && item.additions.length > 0 && (
                          <div style={{ fontSize: 11, color: '#38BDF8', marginTop: 1 }}>
                            {item.additions.map((a, aIdx) => (
                              <span key={aIdx} style={{ marginRight: 6 }}>
                                + {a.name} (${Number(a.price).toLocaleString('es-CO')})
                              </span>
                            ))}
                          </div>
                        )}

                        <p className={styles.sheetItemSubtotal} style={{ marginTop: 4 }}>
                          ${(itemUnitPrice * item.quantity).toLocaleString('es-CO')}
                        </p>
                      </div>

                      <div className={styles.quantityGroup}>
                        <button
                          onClick={() => handleRemoveFromCartByIndex(index)}
                          className={styles.quantityBtn}
                        >
                          <Minus size={13} />
                        </button>
                        <span className={styles.quantityValue}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleIncreaseCartByIndex(index)}
                          className={`${styles.quantityBtn} ${styles.quantityBtnPrimary}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Notas de preparación */}
                    <div className={styles.noteRow}>
                      {editingNotesItemIndex === index ? (
                        <div className={styles.noteInputGroup}>
                          <input
                            type="text"
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            placeholder="Ej: Sin cebolla, término 3/4..."
                            className={styles.noteInput}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNotes(index)}
                            className={styles.noteSaveBtn}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingNotesItemIndex(index);
                            setTempNotes(item.notes || '');
                          }}
                          className={styles.noteBtn}
                        >
                          <MessageSquare size={12} />
                          <span>{item.notes ? `Nota: "${item.notes}"` : '+ Agregar nota de cocina'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie con opciones: Enviar a Cocina o Cobrar Inmediato */}
            <div className={styles.sheetFooter}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Total pedido</span>
                <span className={styles.totalValue}>
                  ${totalAmount.toLocaleString('es-CO')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => setShowCheckout(true)}
                  className={styles.sendOrderBtn}
                  style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, #059669 100%)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                >
                  <DollarSign size={16} />
                  <span>Cobrar Directo</span>
                </button>

                <button
                  onClick={handleSendOrder}
                  disabled={sendingOrder || orderSuccess}
                  className={`${styles.sendOrderBtn} ${orderSuccess ? styles.sendOrderBtnSuccess : ''}`}
                >
                  {sendingOrder ? (
                    <span>Enviando...</span>
                  ) : orderSuccess ? (
                    <>
                      <Check size={16} />
                      <span>¡Enviado!</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>A Cocina</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalización de Producto (Variantes y Adiciones) */}
      {customizingProduct && (
        <ProductCustomizerModal
          key={customizingProduct.id}
          isOpen={Boolean(customizingProduct)}
          onClose={() => setCustomizingProduct(null)}
          product={customizingProduct}
          onConfirm={handleConfirmCustomization}
        />
      )}

      {/* Modal de Cobro Directo */}
      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          table={selectedTable}
          items={cart.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price: Number(i.unitPrice || i.product.price || i.product.salePrice || 0),
            modifiers: i.modifiers || [],
            additions: i.additions || [],
            notes: i.notes || ''
          }))}
          total={totalAmount}
          orderType={orderType}
          onSaleSuccess={() => {
            setCart([]);
            setShowCartSheet(false);
            setShowCheckout(false);
            if (onOrderCompleted) onOrderCompleted();
          }}
        />
      )}
    </div>
  );
};

export default OrderScreen;
