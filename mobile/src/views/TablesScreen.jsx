import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Plus, RefreshCw, AlertCircle, Sparkles, 
  ShoppingBag, Bike, Check, X, DollarSign, UtensilsCrossed 
} from 'lucide-react';
import { CheckoutModal } from '../components/CheckoutModal';
import styles from './TablesScreen.module.css';

export const TablesScreen = ({ onSelectTableForOrder, onStartSpecialOrder }) => {
  const { triggerHaptic } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeZone, setActiveZone] = useState('ALL');
  const [error, setError] = useState('');

  // Estado para modal de opciones de mesa ocupada
  const [activeTableSelected, setActiveTableSelected] = useState(null);
  
  // Estado para el modal de cobro
  const [tableToCheckout, setTableToCheckout] = useState(null);

  const fetchTables = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError('');
      const response = await api.get('/tables');
      const data = response.data.data || response.data || [];
      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('No se pudieron cargar las mesas del restaurante');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleRefresh = () => {
    triggerHaptic();
    fetchTables(true);
  };

  const zones = ['ALL', ...new Set(tables.map((t) => t.zone || t.location || 'Principal').filter(Boolean))];

  const filteredTables = activeZone === 'ALL'
    ? tables
    : tables.filter((t) => (t.zone || t.location || 'Principal') === activeZone);

  const handleTableClick = (table) => {
    triggerHaptic();
    const isOccupied = table.isOccupied || Boolean(table.activeOrder);
    if (isOccupied) {
      setActiveTableSelected(table);
    } else {
      if (onSelectTableForOrder) {
        onSelectTableForOrder(table);
      }
    }
  };

  const handleCancelOrder = async (tableId) => {
    if (!window.confirm('¿Seguro que deseas cancelar la comanda y liberar la mesa?')) return;
    try {
      triggerHaptic();
      await api.delete(`/tables/${tableId}/order`);
      setActiveTableSelected(null);
      fetchTables();
    } catch (err) {
      alert('Error al cancelar la comanda');
    }
  };

  const handleSaleSuccess = () => {
    triggerHaptic();
    setActiveTableSelected(null);
    setTableToCheckout(null);
    fetchTables();
  };

  return (
    <div className={styles.container}>
      {/* Accesos Rápidos: Para Llevar y Domicilio */}
      <div className={styles.quickActionsRow}>
        <div 
          onClick={() => {
            triggerHaptic();
            if (onStartSpecialOrder) onStartSpecialOrder('TAKEAWAY');
          }}
          className={styles.quickActionBtn}
        >
          <div className={styles.quickActionIconTakeaway}>
            <ShoppingBag size={18} />
          </div>
          <div>
            <h4 className={styles.quickActionTitle}>Para Llevar</h4>
            <p className={styles.quickActionDesc}>Pedido directo</p>
          </div>
        </div>

        <div 
          onClick={() => {
            triggerHaptic();
            if (onStartSpecialOrder) onStartSpecialOrder('DELIVERY');
          }}
          className={styles.quickActionBtn}
        >
          <div className={styles.quickActionIconDelivery}>
            <Bike size={18} />
          </div>
          <div>
            <h4 className={styles.quickActionTitle}>Domicilio</h4>
            <p className={styles.quickActionDesc}>Envío a cliente</p>
          </div>
        </div>
      </div>

      {/* Barra de Zonas y Recargar */}
      <div className={styles.topBar}>
        <div className={styles.zonesScroll}>
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => {
                triggerHaptic();
                setActiveZone(zone);
              }}
              className={`${styles.zoneChip} ${activeZone === zone ? styles.zoneChipActive : ''}`}
            >
              {zone === 'ALL' ? 'Todas' : zone}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={styles.refreshButton}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Mesas */}
      {loading ? (
        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className={styles.emptyState}>
          <Sparkles size={36} color="var(--text-dim)" style={{ margin: '0 auto' }} />
          <h3 className={styles.emptyTitle}>No hay mesas en esta zona</h3>
          <p className={styles.emptySubtitle}>Crea mesas en el sistema para verlas aquí.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredTables.map((table) => {
            const isOccupied = table.isOccupied || Boolean(table.activeOrder);
            const orderTotal = table.activeOrder?.totalAmount || table.currentOrder?.total || 0;

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`${styles.tableCard} ${isOccupied ? styles.cardOccupied : styles.cardAvailable}`}
              >
                {/* Cabecera */}
                <div className={styles.tableHeader}>
                  <div>
                    <h3 className={styles.tableName}>
                      {table.name || `Mesa ${table.number}`}
                    </h3>
                    <p className={styles.tableCapacity}>
                      <Users size={12} />
                      <span>{table.capacity || 4} pers.</span>
                    </p>
                  </div>

                  <span className={`${styles.statusBadge} ${isOccupied ? styles.badgeOccupied : styles.badgeAvailable}`}>
                    <span className={`${styles.statusDot} ${isOccupied ? styles.dotOccupied : styles.dotAvailable}`} />
                    {isOccupied ? 'Ocupada' : 'Libre'}
                  </span>
                </div>

                {/* Pie */}
                <div className={styles.tableFooter}>
                  {isOccupied ? (
                    <div>
                      <span className={styles.orderTotalLabel}>Comanda</span>
                      <span className={styles.orderTotalValue}>
                        ${Number(orderTotal).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ) : (
                    <span className={styles.openTableAction}>
                      <Plus size={13} />
                      Abrir comanda
                    </span>
                  )}

                  <div className={styles.actionIconBtn}>
                    {isOccupied ? <DollarSign size={14} color="#FBBF24" /> : <Plus size={14} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Opciones para Mesa Ocupada */}
      {activeTableSelected && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalSheet} animate-slide-up`}>
            <div className={styles.modalSheetHeader}>
              <div>
                <h3 className={styles.modalSheetTitle}>
                  {activeTableSelected.name || `Mesa ${activeTableSelected.number}`}
                </h3>
                <p className={styles.modalSheetSubtitle}>
                  {activeTableSelected.activeOrder?.customer?.name ? `Cliente: ${activeTableSelected.activeOrder.customer.name}` : 'Mesa con pedido activo'}
                </p>
              </div>

              <button
                onClick={() => setActiveTableSelected(null)}
                style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Resumen de platos en la comanda */}
            <div className={styles.modalOrderItemsBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>
                <span>Platos pedidos</span>
                <span style={{ color: '#FBBF24', fontSize: 13, fontWeight: 800 }}>
                  Total: ${Number(activeTableSelected.activeOrder?.totalAmount || 0).toLocaleString('es-CO')}
                </span>
              </div>

              {(activeTableSelected.activeOrder?.details || []).map((det, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{det.quantity}x</strong> {det.product?.name || det.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>
                      ${(Number(det.unitPrice || det.price || 0) * det.quantity).toLocaleString('es-CO')}
                    </span>
                  </div>
                  {det.modifiers && det.modifiers.length > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--primary-light)', paddingLeft: 12 }}>
                      {det.modifiers.map((m, mi) => (
                        <span key={mi} style={{ marginRight: 6 }}>• {m.optionName || m.name}</span>
                      ))}
                    </div>
                  )}
                  {det.additions && det.additions.length > 0 && (
                    <div style={{ fontSize: 10, color: '#38BDF8', paddingLeft: 12 }}>
                      {det.additions.map((a, ai) => (
                        <span key={ai} style={{ marginRight: 6 }}>+ {a.name}</span>
                      ))}
                    </div>
                  )}
                  {det.notes && (
                    <div style={{ fontSize: 10, color: '#FBBF24', fontStyle: 'italic', paddingLeft: 12 }}>
                      Nota: "{det.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Botones de Acción */}
            <div className={styles.modalSheetActions}>
              <button
                onClick={() => {
                  const target = activeTableSelected;
                  setActiveTableSelected(null);
                  if (onSelectTableForOrder) onSelectTableForOrder(target);
                }}
                className={styles.btnAddPlatos}
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #4338CA 100%)', color: '#fff', border: 'none' }}
              >
                <UtensilsCrossed size={16} />
                <span>Ver Comanda / Agregar Platos</span>
              </button>

              <button
                onClick={() => {
                  setTableToCheckout(activeTableSelected);
                  setActiveTableSelected(null);
                }}
                className={styles.btnCobrar}
              >
                <DollarSign size={18} />
                <span>Cobrar Mesa (${Number(activeTableSelected.activeOrder?.totalAmount || 0).toLocaleString('es-CO')})</span>
              </button>

              <button
                onClick={() => handleCancelOrder(activeTableSelected.id)}
                className={styles.btnLiberarMesa}
              >
                <X size={14} />
                <span>Cancelar Pedido y Liberar Mesa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cobro */}
      {tableToCheckout && (
        <CheckoutModal
          isOpen={Boolean(tableToCheckout)}
          onClose={() => setTableToCheckout(null)}
          table={tableToCheckout}
          items={tableToCheckout.activeOrder?.details || []}
          total={tableToCheckout.activeOrder?.totalAmount || 0}
          orderType="DINE_IN"
          onSaleSuccess={handleSaleSuccess}
        />
      )}
    </div>
  );
};

export default TablesScreen;
