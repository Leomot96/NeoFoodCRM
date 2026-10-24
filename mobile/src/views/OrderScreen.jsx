import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, Minus, Utensils, 
  Send, X, MessageSquare, Check, AlertCircle, DollarSign, ShoppingBag, Bike, Sparkles, ChefHat
} from 'lucide-react';
import { CheckoutModal } from '../components/CheckoutModal';
import { ProductCustomizerModal } from '../components/ProductCustomizerModal';
import { compareCategories, compareProducts } from '../utils/categoryOrder';
import { getFullImageUrl } from '../utils/imageUrl';
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
  
  // Clave para guardar borrador de pedido por mesa o modo
  const draftKey = useMemo(() => {
    if (selectedTable?.id) return `neofood_draft_cart_table_${selectedTable.id}`;
    return `neofood_draft_cart_${orderType}`;
  }, [selectedTable?.id, orderType]);

  // Carrito de nuevos platos por enviar: array de { product, quantity, modifiers, additions, notes, unitPrice }
  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showCartSheet, setShowCartSheet] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [editingNotesItemIndex, setEditingNotesItemIndex] = useState(null);
  const [tempNotes, setTempNotes] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal de cobro directo
  const [showCheckout, setShowCheckout] = useState(false);

  // Platos existentes en la mesa si ya está ocupada
  const existingItems = useMemo(() => {
    return selectedTable?.activeOrder?.details || [];
  }, [selectedTable]);

  const existingTotal = useMemo(() => {
    return Number(selectedTable?.activeOrder?.totalAmount || 0);
  }, [selectedTable]);

  // Al cambiar de mesa o modo, cargar su borrador correspondiente
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      setCart(saved ? JSON.parse(saved) : []);
    } catch {
      setCart([]);
    }
  }, [draftKey]);

  // Guardar cambios en el borrador de comanda
  useEffect(() => {
    try {
      if (cart.length > 0) {
        sessionStorage.setItem(draftKey, JSON.stringify(cart));
      } else {
        sessionStorage.removeItem(draftKey);
      }
    } catch (e) {
      console.warn('Error saving draft cart:', e);
    }
  }, [cart, draftKey]);

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

      const sortedCats = Array.isArray(catData) ? [...catData].sort(compareCategories) : [];
      const sortedProds = Array.isArray(prodData) ? [...prodData].sort(compareProducts) : [];

      setCategories(sortedCats);
      setProducts(sortedProds);
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

  // Totales nuevos acumulados
  const newItemsTotal = cart.reduce((acc, item) => {
    const price = Number(item.unitPrice || item.product.price || item.product.salePrice || 0);
    return acc + price * item.quantity;
  }, 0);

  const newItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Total combinado (existentes en comanda + nuevos en borrador)
  const combinedTotal = existingTotal + newItemsTotal;
  const combinedCount = existingItems.reduce((acc, i) => acc + (i.quantity || 1), 0) + newItemsCount;

  // Categorías ordenadas por prioridad comercial
  const sortedCategories = useMemo(() => {
    return [...categories].sort(compareCategories);
  }, [categories]);

  // Productos ordenados por prioridad de categoría y nombre
  const sortedProducts = useMemo(() => {
    return [...products].sort(compareProducts);
  }, [products]);

  // Filtrado de productos por categoría y búsqueda
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((prod) => {
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
  }, [sortedProducts, activeCategoryId, searchQuery]);

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
      const isAppending = Boolean(selectedTable?.activeOrder && existingItems.length > 0);

      const payload = {
        tableId: selectedTable?.id || null,
        orderType: orderType,
        append: isAppending,
        mode: isAppending ? 'append' : 'replace',
        items: cart.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice || i.product.price || i.product.salePrice || 0),
          finalPrice: Number(i.unitPrice || i.product.price || i.product.salePrice || 0),
          price: Number(i.unitPrice || i.product.price || i.product.salePrice || 0),
          modifiers: i.modifiers || [],
          variations: i.modifiers || [],
          additions: i.additions || [],
          notes: i.notes || '',
        })),
        total: newItemsTotal,
      };

      if (selectedTable?.id) {
        await api.post(`/tables/${selectedTable.id}/order`, payload);
      } else {
        // Pedido para llevar o domicilio directo
        await api.post('/kitchen/orders', payload);
      }

      setOrderSuccess(true);
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
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

  // Preparar lista combinada de ítems para el cobro
  const combinedItemsForCheckout = useMemo(() => {
    const list = [];
    
    // Ítems ya en comanda
    existingItems.forEach((d) => {
      list.push({
        productId: d.productId || d.product?.id,
        name: d.product?.name || d.name,
        quantity: d.quantity,
        price: Number(d.unitPrice || d.price || d.product?.price || 0),
        modifiers: d.modifiers || d.variations || [],
        additions: d.additions || [],
        notes: d.notes || ''
      });
    });

    // Ítems nuevos en borrador
    cart.forEach((i) => {
      list.push({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        price: Number(i.unitPrice || i.product.price || i.product.salePrice || 0),
        modifiers: i.modifiers || [],
        additions: i.additions || [],
        notes: i.notes || ''
      });
    });

    return list;
  }, [existingItems, cart]);

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
              {orderType === 'DINE_IN' 
                ? (existingItems.length > 0 ? `Comanda activa: $${existingTotal.toLocaleString('es-CO')}` : (selectedTable?.zone || 'Salón Principal'))
                : 'Despacho directo'
              }
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
        {sortedCategories.map((cat) => (
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
            const imgSrc = product.imageUrl ? getFullImageUrl(product.imageUrl) : null;

            return (
              <div 
                key={product.id} 
                onClick={() => handleProductClick(product)}
                className={styles.productCard}
                style={{ cursor: 'pointer' }}
              >
                {/* Detalles del producto (Lado izquierdo) */}
                <div className={styles.productDetails}>
                  <div>
                    <h4 className={styles.productName}>{product.name}</h4>
                    {product.description && (
                      <p className={styles.productDesc}>{product.description}</p>
                    )}
                  </div>

                  <div className={styles.productPriceRow}>
                    <p className={styles.productPrice}>
                      ${price.toLocaleString('es-CO')}
                    </p>
                    {hasOptions && (
                      <span className={styles.optionsBadge}>
                        Opciones
                      </span>
                    )}
                    {product.isCombo && (
                      <span className={styles.comboBadge}>
                        <Sparkles size={9} /> Combo
                      </span>
                    )}
                  </div>
                </div>

                {/* Foto estilo Rappi con botón de añadir integrado (Lado derecho) */}
                <div className={styles.productMediaWrap}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className={styles.productImg}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.productImgPlaceholder}`);
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  <div
                    className={styles.productImgPlaceholder}
                    style={{ display: imgSrc ? 'none' : 'flex' }}
                  >
                    {product.isCombo ? <Sparkles size={24} color="#FBBF24" /> : <Utensils size={24} color="var(--text-muted)" />}
                  </div>

                  {inCartItemsCount > 0 && (
                    <span className={styles.inCartBadge}>
                      {inCartItemsCount}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                    className={styles.rappiAddBtn}
                    title="Añadir producto"
                  >
                    <Plus size={15} strokeWidth={3} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra Flotante de Pedido (Visible si hay platos en el carrito O comanda activa en la mesa) */}
      {(cart.length > 0 || existingItems.length > 0) && !showCartSheet && (
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
                {newItemsCount > 0 ? newItemsCount : combinedCount}
              </span>
              <div>
                <p className={styles.floatingTitle}>
                  {newItemsCount > 0 ? 'Ver Pedido en Curso' : 'Ver Comanda de la Mesa'}
                </p>
                <p className={styles.floatingSubtitle}>
                  {getTargetTitle()} {existingItems.length > 0 && newItemsCount > 0 ? `(${existingItems.length} en cocina + ${newItemsCount} nuevos)` : existingItems.length > 0 ? '(En cocina)' : ''}
                </p>
              </div>
            </div>

            <span className={styles.floatingTotal}>
              ${combinedTotal.toLocaleString('es-CO')}
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
                  Comanda: {getTargetTitle()}
                </h3>
                <p className={styles.sheetSubtitle}>
                  {combinedCount} platos en total {existingItems.length > 0 ? `(${existingItems.length} en cocina, ${newItemsCount} por enviar)` : ''}
                </p>
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
              {/* Sección 1: Platos ya enviados a cocina */}
              {existingItems.length > 0 && (
                <div>
                  <div className={styles.existingSectionHeader}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Utensils size={13} />
                      <span>Platos ya en cocina ({existingItems.length})</span>
                    </span>
                    <span className={styles.existingItemBadge}>En preparación</span>
                  </div>

                  {existingItems.map((item, index) => {
                    const itemUnitPrice = Number(item.unitPrice || item.price || item.product?.price || 0);

                    return (
                      <div key={`exist_${index}`} className={styles.sheetItem} style={{ opacity: 0.9 }}>
                        <div className={styles.sheetItemTop}>
                          <div style={{ flex: 1, paddingRight: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <h4 className={styles.sheetItemName}>{item.product?.name || item.name}</h4>
                              <span className={styles.existingItemBadge}>En cocina</span>
                            </div>

                            {/* Variantes seleccionadas */}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div style={{ fontSize: 11, color: 'var(--primary-light)', marginTop: 2 }}>
                                {item.modifiers.map((m, mIdx) => (
                                  <span key={mIdx} style={{ marginRight: 6 }}>
                                    • {m.optionName || m.name}
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

                          <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24', padding: '4px 10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 8 }}>
                            {item.quantity}x
                          </div>
                        </div>

                        {item.notes && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                            Nota: "{item.notes}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sección 2: Nuevos platos por enviar a cocina */}
              {cart.length > 0 && (
                <div>
                  {existingItems.length > 0 && (
                    <div className={styles.newSectionHeader}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={13} />
                        <span>Nuevos platos para agregar ({cart.length})</span>
                      </span>
                      <span>Por enviar</span>
                    </div>
                  )}

                  {cart.map((item, index) => {
                    const itemUnitPrice = Number(item.unitPrice || item.product.price || item.product.salePrice || 0);

                    return (
                      <div key={`new_${index}`} className={styles.sheetItem}>
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
              )}
            </div>

            {/* Pie con opciones: Enviar a Cocina o Cobrar Cuenta */}
            <div className={styles.sheetFooter}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>
                  {existingItems.length > 0 && cart.length > 0 ? 'Total Comanda Completa' : 'Total a Cobrar'}
                </span>
                <span className={styles.totalValue}>
                  ${combinedTotal.toLocaleString('es-CO')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => setShowCheckout(true)}
                  className={styles.sendOrderBtn}
                  style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, #059669 100%)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                >
                  <DollarSign size={16} />
                  <span>Cobrar Cuenta</span>
                </button>

                <button
                  onClick={handleSendOrder}
                  disabled={cart.length === 0 || sendingOrder || orderSuccess}
                  className={`${styles.sendOrderBtn} ${orderSuccess ? styles.sendOrderBtnSuccess : ''}`}
                  style={cart.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {sendingOrder ? (
                    <span>Enviando...</span>
                  ) : orderSuccess ? (
                    <>
                      <Check size={16} />
                      <span>¡Enviado!</span>
                    </>
                  ) : cart.length === 0 ? (
                    <>
                      <ChefHat size={15} />
                      <span>Al Día</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>{existingItems.length > 0 ? 'Agregar a Cocina' : 'A Cocina'}</span>
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
          items={combinedItemsForCheckout}
          total={combinedTotal}
          orderType={orderType}
          onSaleSuccess={() => {
            try {
              sessionStorage.removeItem(draftKey);
            } catch {}
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
