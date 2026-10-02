import React, { useState, useMemo, useEffect } from 'react';
import { useSales } from '../hooks/useSales';
import CheckoutModal from '../components/sales/CheckoutModal';
import ProductOptionsModal from '../components/sales/ProductOptionsModal';
import CustomSelect from '../components/ui/CustomSelect';
import { getFullImageUrl } from '../utils/imageUrl';
import styles from './Ventas.module.css';
import {
  ShoppingCart, Plus, Minus, Trash2, Tag, AlertCircle, ArrowLeft, Users,
  Sparkles, CheckCircle2, Clock, Bookmark, XCircle, DollarSign, UserCheck,
  Utensils
} from 'lucide-react';

const formatCurrency = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0
}).format(value || 0);

const Ventas = () => {
  const {
    products, paymentMethods, cart, loading, error, cartTotal,
    addToCart, updateQuantity, clearCart, loadCart, saveTableOrder,
    cancelTableOrder, processSale, tables, customers, refreshTables
  } = useSales();

  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Mesa seleccionada y pedido activo
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [tableNotes, setTableNotes] = useState('');
  const [isSavingTable, setIsSavingTable] = useState(false);

  // Modal para productos con opciones/adiciones/combos
  const [selectedProductForOptions, setSelectedProductForOptions] = useState(null);

  // Categorías únicas
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category?.name || 'Sin Categoría'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = selectedCategory === 'Todas'
    ? products
    : products.filter(p => (p.category?.name || 'Sin Categoría') === selectedCategory);

  // Seleccionar Mesa desde la cuadrícula
  const handleSelectTable = (table) => {
    setSelectedTable(table);
    if (table.isOccupied && table.activeOrder) {
      // Cargar pedido activo existente
      setActiveOrderId(table.activeOrder.id);
      setSelectedCustomerId(table.activeOrder.customerId || '');
      setTableNotes(table.activeOrder.notes || '');
      loadCart(table.activeOrder.details);
    } else {
      // Mesa libre
      setActiveOrderId(null);
      setSelectedCustomerId('');
      setTableNotes('');
      clearCart();
    }
  };

  // Guardar pedido en mesa (para continuar comiendo sin cobrar aún)
  const handleSaveToTable = async () => {
    if (!selectedTable?.id) return;
    if (cart.length === 0) {
      alert("Debes agregar al menos un producto para guardar el pedido en la mesa.");
      return;
    }

    setIsSavingTable(true);
    const result = await saveTableOrder({
      tableId: selectedTable.id,
      customerId: selectedCustomerId || null,
      notes: tableNotes
    });
    setIsSavingTable(false);

    if (result.success) {
      setSuccessMessage(`¡Pedido de ${selectedTable.name} guardado con éxito! La mesa permanece ocupada.`);
      setSelectedTable(null);
      setActiveOrderId(null);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage(result.message || 'Error al guardar pedido en mesa.');
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // Cancelar pedido activo y liberar mesa
  const handleCancelTableOrder = async () => {
    if (!selectedTable?.id) return;
    if (!window.confirm(`¿Estás seguro de cancelar el pedido de ${selectedTable.name} y liberar la mesa?`)) {
      return;
    }

    const result = await cancelTableOrder(selectedTable.id);
    if (result.success) {
      setSuccessMessage(`Mesa ${selectedTable.name} liberada correctamente.`);
      setSelectedTable(null);
      setActiveOrderId(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      alert(result.message || 'Error al liberar mesa.');
    }
  };

  // Confirmar cobro de la venta (final y libera mesa)
  const handlePaymentConfirm = async (methodId, receivedAmount, customerId) => {
    const result = await processSale({
      paymentMethodId: methodId,
      receivedAmount,
      customerId: customerId || selectedCustomerId || null,
      tableId: selectedTable?.id || null,
      orderId: activeOrderId || null
    });

    if (result.success) {
      setSuccessMessage('¡Venta cobrada con éxito! Mesa liberada.');
      setErrorMessage('');
      setSelectedTable(null);
      setActiveOrderId(null);
      setTimeout(() => setSuccessMessage(''), 4000);
      return { success: true };
    } else {
      setErrorMessage(result.message || 'Error al procesar la venta');
      setTimeout(() => setErrorMessage(''), 5000);
      return result;
    }
  };

  // Interceptar clic en producto
  const handleProductClick = (product) => {
    const hasModifiers = product.modifiers && product.modifiers.length > 0;
    const hasAdditions = product.additions && product.additions.length > 0;

    if (hasModifiers || hasAdditions || product.isCombo) {
      setSelectedProductForOptions(product);
    } else {
      addToCart({
        product,
        quantity: 1,
        modifiers: [],
        variations: [],
        additions: [],
        finalPrice: parseFloat(product.price)
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // ==========================================
  // VISTA 1: SELECCIÓN DE MESA / SALÓN
  // ==========================================
  if (!selectedTable) {
    return (
      <div className={styles.posPage}>

        {/* Cabecera del Salón */}
        <div className={styles.posTablesHeader}>
          <div>
            <h1 className={styles.posTablesTitle}>
              <Users style={{ color: 'var(--primary)' }} size={26} />
              Control de Mesas y Pedidos
            </h1>
            <p className={styles.posTablesSubtitle}>
              Las mesas ocupadas conservan su cuenta activa hasta que decidas cobrarlas o modificarlas.
            </p>
          </div>

          {/* Estadísticas Rápidas de Mesas */}
          <div className={styles.posTablesStats}>
            <span className={`${styles.posStatBadge} ${styles.posStatBadgeFree || styles.free}`}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              {tables.filter(t => !t.isOccupied).length} Libres
            </span>
            <span className={`${styles.posStatBadge} ${styles.posStatBadgeOccupied || styles.occupied}`}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
              {tables.filter(t => t.isOccupied).length} Ocupadas
            </span>
            <button
              onClick={() => refreshTables()}
              className="neo-btn neo-btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Notificaciones Flash */}
        {successMessage && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ color: '#dc2626' }} />
            {errorMessage}
          </div>
        )}

        {/* Cuadrícula de Mesas */}
        <div className={styles.posTablesGrid}>

          {/* Opción Venta Rápida / Para Llevar */}
          <button
            onClick={() => setSelectedTable({ id: null, name: 'Para Llevar' })}
            className={styles.posQuickSaleCard}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={styles.posQuickSaleBadge}>
                Venta Rápida
              </span>
              <ShoppingCart size={20} style={{ color: '#f97316' }} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '1.125rem' }}>Para Llevar / Domicilio</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cobro inmediato sin asignar mesa fija</p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', marginTop: '0.75rem' }}>
              Iniciar Pedido →
            </span>
          </button>

          {/* Mesas Registradas */}
          {tables?.map(table => {
            const isOcc = Boolean(table.isOccupied);
            const activeOrder = table.activeOrder;
            const itemsCount = activeOrder?.details?.reduce((sum, d) => sum + d.quantity, 0) || 0;

            return (
              <div
                key={table.id}
                onClick={() => handleSelectTable(table)}
                role="button"
                tabIndex={0}
                className={`${styles.posTableCard} ${isOcc ? styles['posTableCard.occupied'] || styles.occupied : styles['posTableCard.available'] || styles.available}`}
              >
                {/* Indicador Superior */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span className={`${styles.posTableStatusPill} ${isOcc ? styles['posTableStatusPill.occupied'] || styles.occupied : styles['posTableStatusPill.available'] || styles.available}`}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isOcc ? '#ffffff' : '#10b981', display: 'inline-block' }}></span>
                    {isOcc ? 'Ocupada' : 'Disponible'}
                  </span>

                  {table.capacity && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Cap: {table.capacity}p
                    </span>
                  )}
                </div>

                {/* Contenido Central: Icono y Nombre de la Mesa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.65rem 0' }}>
                  <div className={`${styles.posTableIconBox} ${isOcc ? styles.posTableIconBoxOccupied : styles.posTableIconBoxAvailable}`}>
                    <Utensils size={20} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 className={styles.posTableName}>
                      {table.name}
                    </h3>
                    {isOcc ? (
                      <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', margin: 0 }}>
                          {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'} en cuenta
                        </p>
                        {activeOrder?.customer && (
                          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Cliente: {activeOrder.customer.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginTop: '0.15rem' }}>
                        Lista para servicio
                      </span>
                    )}
                  </div>
                </div>

                {/* Pie de la Tarjeta */}
                <div style={{ width: '100%', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isOcc ? (
                    <>
                      <div>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Cuenta Total</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#d97706' }}>
                          {formatCurrency(activeOrder?.totalAmount)}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-md)' }}>
                        Ver / Editar →
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                      Abrir Mesa →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: ATENCIÓN DE MESA & CARRITO
  // ==========================================
  return (
    <div className={styles.posActiveLayout}>

      {/* PANEL IZQUIERDO: CATÁLOGO DE PRODUCTOS */}
      <div className={styles.posCatalogPanel}>

        {/* Cabecera de la Mesa Atendida */}
        <div className={`${styles.posActiveTableBar} ${selectedTable.isOccupied ? styles['posActiveTableBar.occupied'] || styles.occupied : styles['posActiveTableBar.available'] || styles.available}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSelectedTable(null)}
              style={{ padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 'var(--radius-lg)', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Volver al Salón"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selectedTable.id === null ? (
                  <ShoppingCart size={22} style={{ color: '#ffffff' }} />
                ) : (
                  <Utensils size={22} style={{ color: '#ffffff' }} />
                )}
                <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>{selectedTable.name}</span>
                {selectedTable.isOccupied && (
                  <span style={{ fontSize: '0.625rem', backgroundColor: '#ffffff', color: '#b45309', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mesa Ocupada · Pedido Activo
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500, margin: 0 }}>
                {selectedTable.isOccupied
                  ? 'Puedes modificar cantidades, agregar más ítems y guardar o cobrar la cuenta.'
                  : 'Agrega los productos que ordenó la mesa y decide si guardar o cobrar ahora.'}
              </p>
            </div>
          </div>

          {selectedTable.isOccupied && (
            <button
              onClick={handleCancelTableOrder}
              className="neo-btn neo-btn-danger"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
              title="Cancelar pedido y dejar la mesa disponible"
            >
              <XCircle size={15} />
              <span>Liberar Mesa</span>
            </button>
          )}
        </div>

        {/* Filtro de Categorías */}
        <div className={styles.posCategoriesContainer}>
          <div className={styles.posCategoriesBar}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`${styles.posCategoryBtn} ${selectedCategory === cat ? styles.active : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cuadrícula de Productos del Menú */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'var(--bg-subtle)' }}>
          {error ? (
            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle /> {error}</div>
          ) : (
            <div className={styles.posProductsGrid}>
              {filteredProducts.map(product => {
                const hasOptions = (product.modifiers?.length > 0) || (product.additions?.length > 0);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={styles.posProductCard}
                  >
                    <div className={styles.posProductMedia}>
                      {product.imageUrl ? (
                        <img
                          src={getFullImageUrl(product.imageUrl)}
                          alt={product.name}
                          className={styles.posProductImg}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.posProductPlaceholder}`);
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}

                      <div
                        className={styles.posProductPlaceholder}
                        style={{ display: product.imageUrl ? 'none' : 'flex' }}
                      >
                        {product.isCombo ? <Sparkles size={26} /> : <Utensils size={26} />}
                      </div>

                      {product.isCombo && (
                        <span className={styles.posProductBadgeCombo}>
                          <Sparkles size={10} /> Combo
                        </span>
                      )}

                      {hasOptions && !product.isCombo && (
                        <span className={styles.posProductBadgeOptions}>
                          Opciones
                        </span>
                      )}
                    </div>

                    <h3 className={styles.posProductName} title={product.name}>
                      {product.name}
                    </h3>
                    <p className={styles.posProductPrice}>
                      {formatCurrency(product.price)}
                    </p>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Tag size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No hay productos disponibles</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>No se encontraron ítems en la categoría "{selectedCategory}".</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: CARRITO / PEDIDO DE LA MESA */}
      <div className={styles.posCartPanel}>

        {/* Cabecera del Carrito */}
        <div className={`${styles.posCartHeader} ${selectedTable.isOccupied ? styles['posCartHeader.occupied'] || styles.occupied : styles['posCartHeader.available'] || styles.available}`}>
          <div>
            <h2 style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0 }}>
              <ShoppingCart size={18} /> Pedido: {selectedTable.name}
            </h2>
            <span style={{ fontSize: '0.6875rem', opacity: 0.9 }}>
              {cart.length} {cart.length === 1 ? 'ítem agregado' : 'ítems agregados'}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', border: 'none', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
              title="Vaciar pedido"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Asignación de Cliente y Notas */}
        <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
              Cliente (Opcional)
            </label>
            <CustomSelect
              value={selectedCustomerId}
              onChange={val => setSelectedCustomerId(val)}
              options={[
                { value: "", label: "Consumidor Final" },
                ...customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))
              ]}
              placeholder="Consumidor Final"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Notas del pedido (ej: Sin cebolla, salsas aparte)..."
              value={tableNotes}
              onChange={e => setTableNotes(e.target.value)}
              className="neo-input"
              style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
            />
          </div>
        </div>

        {/* Notificaciones */}
        {successMessage && (
          <div style={{ margin: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 700 }}>
            {successMessage}
          </div>
        )}

        {/* Lista de Ítems en el Carrito */}
        <div className={styles.posCartItemsContainer}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem', padding: '2rem 0' }}>
              <ShoppingCart size={42} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>El pedido está vacío</p>
              <p style={{ fontSize: '0.75rem', textAlign: 'center', maxWidth: '200px' }}>
                Selecciona productos del catálogo para armar la comanda de la mesa.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className={styles.posCartItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', display: 'block' }}>
                      {item.product.name}
                    </span>

                    {/* Variaciones / Modificadores */}
                    {item.modifiers?.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.15rem' }}>
                        • {item.modifiers.map(m => m.optionName || m.name).filter(Boolean).join(', ')}
                      </div>
                    )}

                    {/* Adiciones Extras */}
                    {item.additions?.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500, marginTop: '0.15rem' }}>
                        • Extras: {item.additions.map(a => `${a.name}${a.quantity > 1 ? ` (x${a.quantity})` : ''}`).join(', ')}
                      </div>
                    )}
                  </div>

                  <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    {formatCurrency(item.finalPrice * item.quantity)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{formatCurrency(item.finalPrice)} c/u</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.2rem', boxShadow: 'var(--shadow-sm)' }}>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      style={{ padding: '0.2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                    >
                      {item.quantity === 1 ? <Trash2 size={14} style={{ color: '#dc2626' }} /> : <Minus size={14} />}
                    </button>
                    <span style={{ fontWeight: 900, fontSize: '0.75rem', width: '1.25rem', textAlign: 'center', color: 'var(--text-main)' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      style={{ padding: '0.2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PIE DEL PANEL: TOTALES Y ACCIONES DOBLES (GUARDAR O COBRAR) */}
        <div className={styles.posCartFooter}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Total de la Cuenta</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(cartTotal)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Si es una mesa física, permitimos "Guardar en Mesa" */}
            {selectedTable.id && (
              <button
                type="button"
                onClick={handleSaveToTable}
                disabled={cart.length === 0 || isSavingTable}
                className="neo-btn neo-btn-secondary"
                style={{ width: '100%', padding: '0.65rem', justifyContent: 'center' }}
              >
                <Bookmark size={16} />
                <span>{isSavingTable ? 'Guardando...' : (selectedTable.isOccupied ? 'Actualizar Pedido en Mesa' : 'Guardar y Dejar Mesa Ocupada')}</span>
              </button>
            )}

            {/* Botón Principal: COBRAR Y LIBERAR */}
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="neo-btn neo-btn-success"
              style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontSize: '1rem', fontWeight: 900 }}
            >
              <DollarSign size={18} />
              <span>COBRAR Y FACTURAR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cobro (Checkout) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartTotal={cartTotal}
        paymentMethods={paymentMethods}
        customers={customers}
        onConfirm={handlePaymentConfirm}
      />

      {/* Modal de Opciones / Adiciones / Combos */}
      {selectedProductForOptions && (
        <ProductOptionsModal
          product={selectedProductForOptions}
          onClose={() => setSelectedProductForOptions(null)}
          onAddToCart={(configuredItem) => {
            addToCart(configuredItem);
            setSelectedProductForOptions(null);
          }}
        />
      )}
    </div>
  );
};

export default Ventas;