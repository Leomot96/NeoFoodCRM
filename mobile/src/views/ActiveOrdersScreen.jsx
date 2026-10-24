import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, RefreshCw, ChefHat, ShoppingBag, DollarSign, 
  Bike, Utensils, Check, X, MapPin, Phone, AlertCircle, ArrowRight,
  CheckCircle2, Globe, MessageSquare, Layers, Plus
} from 'lucide-react';
import { CheckoutModal } from '../components/CheckoutModal';
import styles from './ActiveOrdersScreen.module.css';

export const ActiveOrdersScreen = () => {
  const { triggerHaptic } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'TABLE', 'TAKEAWAY', 'DELIVERY', 'STORE'
  const [orderToCheckout, setOrderToCheckout] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);

      // Traer órdenes activas de cocina y estado de mesas en paralelo
      const [kitchenRes, tablesRes] = await Promise.all([
        api.get('/kitchen/orders?status=active').catch(() => ({ data: [] })),
        api.get('/tables').catch(() => ({ data: [] }))
      ]);

      const kitchenData = kitchenRes.data?.data || kitchenRes.data || [];
      const tablesData = tablesRes.data?.data || tablesRes.data || [];

      // Mapear órdenes de cocina
      const formattedKitchenOrders = Array.isArray(kitchenData) ? kitchenData : [];

      // Detectar mesas ocupadas que no estén aún en kitchenData (por si se abrieron recientemente)
      const kitchenTableIds = new Set(
        formattedKitchenOrders
          .filter(o => o.table?.id)
          .map(o => o.table.id)
      );

      const additionalTableOrders = [];
      if (Array.isArray(tablesData)) {
        tablesData.forEach(t => {
          if ((t.isOccupied || t.activeOrder) && !kitchenTableIds.has(t.id) && t.activeOrder) {
            additionalTableOrders.push({
              id: t.activeOrder.id,
              orderNumber: t.activeOrder.orderNumber,
              status: 'PENDING',
              orderType: 'DINE_IN',
              isOnlineStore: false,
              originType: 'TABLE',
              originLabel: t.name || `Mesa ${t.number}`,
              table: t,
              tableName: t.name || `Mesa ${t.number}`,
              customerName: t.activeOrder.customer?.name || `Mesa ${t.name || t.number}`,
              customerPhone: t.activeOrder.customer?.phone || null,
              notes: t.activeOrder.notes || '',
              totalAmount: Number(t.activeOrder.totalAmount || 0),
              createdAt: t.activeOrder.createdAt || new Date(),
              details: (t.activeOrder.details || []).map(d => {
                const uPrice = Number(d.unitPrice || d.price || d.product?.price || 0);
                const qty = Number(d.quantity || 1);
                return {
                  id: d.id,
                  productId: d.productId,
                  productName: d.product?.name || d.name,
                  isCombo: d.product?.isCombo || false,
                  quantity: qty,
                  unitPrice: uPrice,
                  price: uPrice,
                  subtotal: Number(d.subtotal || (uPrice * qty)),
                  notes: d.notes,
                  modifiers: d.modifiers || [],
                  additions: d.additions || []
                };
              })
            });
          }
        });
      }

      const allActiveOrders = [...formattedKitchenOrders, ...additionalTableOrders];
      setOrders(allActiveOrders);
    } catch (e) {
      console.error('Error fetching active orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 12000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    triggerHaptic();
    fetchOrders(true);
  };

  const handleAdvanceStatus = async (order) => {
    triggerHaptic();
    let nextStatus = 'PREPARING';
    if (order.status === 'PREPARING') nextStatus = 'READY';
    else if (order.status === 'READY') nextStatus = 'DELIVERED';

    try {
      setUpdatingId(order.id);
      await api.patch(`/kitchen/orders/${order.id}/status`, { status: nextStatus });
      fetchOrders();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    const targetLabel = order.tableName || order.originLabel || order.customerName || `Pedido #${order.orderNumber || ''}`;
    if (!window.confirm(`¿Seguro que deseas cancelar el pedido de ${targetLabel}?`)) {
      return;
    }

    try {
      triggerHaptic();
      setUpdatingId(order.id);
      await api.patch(`/kitchen/orders/${order.id}/status`, { status: 'CANCELLED' });
      fetchOrders();
    } catch (err) {
      console.error('Error al cancelar pedido:', err);
      alert('Error al cancelar el pedido');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'TABLE') return o.originType === 'TABLE' || o.orderType === 'DINE_IN';
    if (activeFilter === 'TAKEAWAY') return o.originType === 'TAKEAWAY' || o.orderType === 'TAKEAWAY';
    if (activeFilter === 'DELIVERY') return (o.originType === 'DELIVERY' || o.orderType === 'DELIVERY') && !o.isOnlineStore;
    if (activeFilter === 'STORE') return o.isOnlineStore || o.originType === 'STORE';
    return true;
  });

  const getOriginBadge = (order) => {
    if (order.originType === 'TABLE' || order.orderType === 'DINE_IN') {
      return {
        icon: <Utensils size={13} color="var(--primary-light)" />,
        label: order.tableName || order.originLabel || 'Mesa',
        color: 'var(--primary-light)',
        bg: 'var(--primary-subtle)'
      };
    }
    if (order.originType === 'TAKEAWAY' || order.orderType === 'TAKEAWAY') {
      return {
        icon: <ShoppingBag size={13} color="#FBBF24" />,
        label: 'Para Llevar',
        color: '#FBBF24',
        bg: 'rgba(245, 158, 11, 0.15)'
      };
    }
    if (order.isOnlineStore || order.originType === 'STORE') {
      return {
        icon: <Globe size={13} color="#C084FC" />,
        label: order.orderType === 'DELIVERY' ? 'Tienda (Domicilio)' : 'Tienda (Retiro)',
        color: '#C084FC',
        bg: 'rgba(192, 132, 252, 0.15)'
      };
    }
    return {
      icon: <Bike size={13} color="#38BDF8" />,
      label: 'Domicilio',
      color: '#38BDF8',
      bg: 'rgba(56, 189, 248, 0.15)'
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return { 
          icon: <Clock size={11} />, 
          label: 'Pendiente', 
          color: '#F87171', 
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)'
        };
      case 'PREPARING':
        return { 
          icon: <ChefHat size={11} />, 
          label: 'En Cocina', 
          color: '#FBBF24', 
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'READY':
        return { 
          icon: <CheckCircle2 size={11} />, 
          label: 'Listo Despacho', 
          color: '#34D399', 
          bg: 'rgba(52, 211, 153, 0.15)',
          border: 'rgba(52, 211, 153, 0.3)'
        };
      default:
        return { 
          icon: <Clock size={11} />, 
          label: status, 
          color: 'var(--text-muted)', 
          bg: 'var(--surface)',
          border: 'var(--border)'
        };
    }
  };

  const filterTabs = [
    { key: 'ALL', label: `Todos (${orders.length})`, icon: <Clock size={12} /> },
    { key: 'TABLE', label: 'Mesas', icon: <Utensils size={12} /> },
    { key: 'TAKEAWAY', label: 'Para Llevar', icon: <ShoppingBag size={12} /> },
    { key: 'DELIVERY', label: 'Domicilios', icon: <Bike size={12} /> },
    { key: 'STORE', label: 'Tienda Virtual', icon: <Globe size={12} /> }
  ];

  return (
    <div className={styles.container}>
      {/* Cabecera */}
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>
            <ChefHat size={20} color="var(--primary-light)" />
            <span>Cocina</span>
          </h2>
          <p className={styles.subtitle}>
            {orders.length} comandas en preparación y despacho
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={styles.refreshBtn}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros por Origen con Iconos limpios (Sin Emojis) */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {filterTabs.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              triggerHaptic();
              setActiveFilter(f.key);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: '1px solid',
              backgroundColor: activeFilter === f.key ? 'var(--primary)' : 'var(--surface)',
              color: activeFilter === f.key ? '#FFFFFF' : 'var(--text-muted)',
              borderColor: activeFilter === f.key ? 'var(--primary)' : 'var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            {f.icon}
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Lista de Órdenes */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 110, borderRadius: 16, backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <ShoppingBag size={36} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>No hay pedidos en curso</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Las comandas activas de salón, para llevar y domicilios aparecerán aquí.</p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {filteredOrders.map((order) => {
            const badge = getOriginBadge(order);
            const statusB = getStatusBadge(order.status);
            const items = order.details || [];
            const total = Number(order.totalAmount || 0);

            return (
              <div key={order.id} className={styles.orderCard}>
                {/* Cabecera del pedido */}
                <div className={styles.cardHeader}>
                  <div className={styles.tableGroup}>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: 8,
                      backgroundColor: badge.bg,
                      color: badge.color,
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>

                    <div>
                      <h3 className={styles.tableName}>
                        {order.customerName ? order.customerName : (order.tableName || 'Comanda')}
                      </h3>
                      {order.customerPhone && (
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                          <Phone size={10} /> {order.customerPhone}
                        </p>
                      )}
                      {order.deliveryAddress && (
                        <p style={{ fontSize: 10, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                          <MapPin size={10} /> {order.deliveryAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    backgroundColor: statusB.bg,
                    color: statusB.color,
                    border: `1px solid ${statusB.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {statusB.icon}
                    <span>{statusB.label}</span>
                  </span>
                </div>

                {/* Ítems del pedido con Precios Individuales, Variantes, Adiciones y Notas */}
                <div className={styles.itemsList}>
                  {items.map((it, idx) => {
                    const qty = Number(it.quantity || 1);
                    // Cálculo robusto del precio unitario y subtotal
                    let unitPrice = Number(it.unitPrice || it.price || it.product?.price || 0);
                    let subtotal = Number(it.subtotal || 0);

                    if (unitPrice === 0 && subtotal > 0 && qty > 0) {
                      unitPrice = subtotal / qty;
                    } else if (subtotal === 0 && unitPrice > 0) {
                      subtotal = unitPrice * qty;
                    } else if (unitPrice === 0 && subtotal === 0 && items.length === 1 && total > 0) {
                      // Fallback en caso de comanda previa donde el subtotal era el total
                      subtotal = total;
                      unitPrice = total / qty;
                    }

                    return (
                      <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemQuantity}>{qty}x</span>
                            <span className={styles.itemName}>
                              {it.productName || it.product?.name || it.name}
                            </span>
                          </div>

                          {/* Precio del plato individual y subtotal */}
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 12 }}>
                              ${subtotal.toLocaleString('es-CO')}
                            </span>
                            {qty > 1 && unitPrice > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                (${unitPrice.toLocaleString('es-CO')} c/u)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Variantes */}
                        {it.modifiers && it.modifiers.length > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--primary-light)', paddingLeft: 18, marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {it.modifiers.map((m, mIdx) => (
                              <span key={mIdx} style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                {m.optionName || m.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Adiciones */}
                        {it.additions && it.additions.length > 0 && (
                          <div style={{ fontSize: 10, color: '#38BDF8', paddingLeft: 18, marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {it.additions.map((a, aIdx) => (
                              <span key={aIdx} style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                + {a.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Nota individual del plato */}
                        {it.notes && (
                          <div style={{ fontSize: 10, color: '#FBBF24', fontStyle: 'italic', paddingLeft: 18, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MessageSquare size={10} />
                            <span>Nota: "{it.notes}"</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Nota general de la comanda */}
                {order.notes && (
                  <div style={{ fontSize: 11, color: '#FBBF24', padding: '6px 10px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 8, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MessageSquare size={12} />
                    <span>Nota orden: "{order.notes}"</span>
                  </div>
                )}

                {/* Pie con Total y Acciones */}
                <div className={styles.cardFooter}>
                  <div>
                    <span className={styles.totalLabel}>Total: </span>
                    <span className={styles.totalValue}>
                      ${total.toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => handleCancelOrder(order)}
                      disabled={updatingId === order.id}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#F87171',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Cancelar pedido"
                    >
                      <X size={13} />
                      <span>Cancelar</span>
                    </button>

                    {order.status !== 'READY' && order.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        disabled={updatingId === order.id}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border)',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {updatingId === order.id ? (
                          <span>...</span>
                        ) : order.status === 'PENDING' ? (
                          <>
                            <ChefHat size={12} />
                            <span>Preparar</span>
                          </>
                        ) : (
                          <>
                            <Check size={12} color="#34D399" />
                            <span>Listo</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        triggerHaptic();
                        setOrderToCheckout({
                          ...order,
                          activeOrder: {
                            id: order.id,
                            totalAmount: total,
                            details: items.map(i => ({
                              ...i,
                              unitPrice: i.unitPrice || i.price,
                              name: i.productName || i.name
                            }))
                          }
                        });
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 8,
                        backgroundColor: 'var(--secondary)',
                        color: '#090D16',
                        fontWeight: 800,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <DollarSign size={13} />
                      <span>Cobrar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cobro */}
      {orderToCheckout && (
        <CheckoutModal
          isOpen={Boolean(orderToCheckout)}
          onClose={() => setOrderToCheckout(null)}
          table={orderToCheckout.table || { id: orderToCheckout.id, name: orderToCheckout.originLabel }}
          items={(orderToCheckout.details || []).map(i => ({
            productId: i.productId,
            name: i.productName || i.name,
            quantity: i.quantity,
            price: Number(i.unitPrice || i.price || 0),
            modifiers: i.modifiers || [],
            additions: i.additions || [],
            notes: i.notes || ''
          }))}
          total={Number(orderToCheckout.totalAmount || 0)}
          orderType={orderToCheckout.orderType || 'DINE_IN'}
          onSaleSuccess={() => {
            setOrderToCheckout(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default ActiveOrdersScreen;
