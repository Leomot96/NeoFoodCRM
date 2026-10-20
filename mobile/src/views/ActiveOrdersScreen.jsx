import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Clock, RefreshCw, ChefHat, ShoppingBag, DollarSign } from 'lucide-react';
import { CheckoutModal } from '../components/CheckoutModal';
import styles from './ActiveOrdersScreen.module.css';

export const ActiveOrdersScreen = () => {
  const { triggerHaptic } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderToCheckout, setOrderToCheckout] = useState(null);

  const fetchOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await api.get('/tables').catch(() => ({ data: [] }));
      const tablesData = res.data?.data || res.data || [];
      // Filtrar mesas ocupadas o con activeOrder
      const active = tablesData.filter((t) => t.isOccupied || Boolean(t.activeOrder) || t.currentOrder || t.status === 'OCCUPIED');
      setOrders(active);
    } catch (e) {
      console.error('Error fetching active orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    triggerHaptic();
    fetchOrders(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>
            <Clock size={18} color="var(--primary-light)" />
            <span>Pedidos en Curso</span>
          </h2>
          <p className={styles.subtitle}>Comandas activas y despacho de mesas</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={styles.refreshBtn}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 110, borderRadius: 16, backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <ShoppingBag size={36} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>No hay pedidos en curso</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Las comandas abiertas en mesas o para llevar aparecerán aquí.</p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((table) => {
            const order = table.activeOrder || table.currentOrder || table.order || {};
            const items = order.details || order.items || [];
            const total = order.totalAmount || order.total || 0;

            return (
              <div key={table.id} className={styles.orderCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.tableGroup}>
                    <span className={styles.tableBadge}>
                      {table.number || '#'}
                    </span>
                    <div>
                      <h3 className={styles.tableName}>
                        {table.name || `Mesa ${table.number}`}
                      </h3>
                      <p className={styles.tableZone}>
                        {order.customer?.name ? `Cliente: ${order.customer.name}` : (table.zone || 'Salón Principal')}
                      </p>
                    </div>
                  </div>

                  <span className={styles.statusBadge}>
                    <ChefHat size={12} />
                    <span>En Cocina</span>
                  </span>
                </div>

                {/* Ítems del pedido */}
                <div className={styles.itemsList}>
                  {items.length > 0 ? (
                    items.map((it, idx) => (
                      <div key={idx} className={styles.itemRow}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemQuantity}>{it.quantity}x</span>
                          <span className={styles.itemName}>{it.product?.name || it.name}</span>
                          {it.notes && (
                            <span className={styles.itemNotes}>({it.notes})</span>
                          )}
                        </div>
                        <span className={styles.itemPrice}>
                          ${Number((it.unitPrice || it.price || 0) * it.quantity).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>Mesa abierta sin comanda detallada</p>
                  )}
                </div>

                {/* Total y botón de cobro */}
                <div className={styles.cardFooter}>
                  <div>
                    <span className={styles.totalLabel}>Total mesa: </span>
                    <span className={styles.totalValue}>
                      ${Number(total).toLocaleString('es-CO')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic();
                      setOrderToCheckout(table);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      backgroundColor: 'var(--secondary)',
                      color: '#090D16',
                      fontWeight: 800,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <DollarSign size={14} />
                    <span>Cobrar</span>
                  </button>
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
          table={orderToCheckout}
          items={orderToCheckout.activeOrder?.details || []}
          total={orderToCheckout.activeOrder?.totalAmount || 0}
          orderType="DINE_IN"
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
