import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  ExternalLink,
  DollarSign,
  TrendingUp,
  PackageCheck,
  ChefHat,
  Bike,
  Receipt,
  Eye,
  X,
  FileText,
  Send,
  Loader2
} from 'lucide-react';
import storeService from '../services/store.service';
import { useAuth } from '../context/AuthContext';
import styles from './StoreOrdersManager.module.css';

const StoreOrdersManager = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null); // Modal detalle

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [actives, history] = await Promise.all([
        storeService.getStoreOrders({ filter: 'active' }),
        storeService.getStoreOrders({ filter: 'history' })
      ]);
      setActiveOrders(actives);
      setHistoryOrders(history);
    } catch (err) {
      console.error('Error cargando pedidos de la tienda:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresco cada 15 segundos para pedidos en tiempo real
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Formato Moneda COP
  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Tiempo relativo transcurrido
  const getElapsedMinutes = (dateStr) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Hace un momento';
    if (mins === 1) return 'Hace 1 min';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Hace ${hours} h`;
  };

  // KPIs
  const kpis = useMemo(() => {
    const delivered = historyOrders.filter(o => o.status === 'DELIVERED');
    const totalSales = delivered.reduce((acc, o) => acc + parseFloat(o.totalAmount || 0), 0);
    const avgTicket = delivered.length > 0 ? totalSales / delivered.length : 0;

    return {
      activeCount: activeOrders.length,
      pendingCount: activeOrders.filter(o => o.status === 'PENDING').length,
      deliveredCount: delivered.length,
      totalSales,
      avgTicket
    };
  }, [activeOrders, historyOrders]);

  // Manejo de cambio de estado
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await storeService.updateOrderStatus(orderId, newStatus);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar el estado del pedido');
    }
  };

  // Facturar en Caja
  const handleConvertToSale = async (order) => {
    if (!window.confirm(`¿Deseas registrar y facturar el pedido #${order.orderNumber} por ${formatMoney(order.totalAmount)} en la caja activa del restaurante?`)) {
      return;
    }
    try {
      await storeService.convertToSale(order.id);
      alert(`¡Pedido #${order.orderNumber} facturado con éxito!`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al facturar el pedido. Asegúrate de tener una caja abierta.');
    }
  };

  // Filtrado de historial
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyOrders;
    const q = searchQuery.toLowerCase();
    return historyOrders.filter(o =>
      String(o.orderNumber).includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(q)) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q))
    );
  }, [historyOrders, searchQuery]);

  return (
    <div className={styles.managerContainer}>

      {/* HEADER INSTITUCIONAL */}
      <div className={styles.headerSection}>
        <h1 className={styles.headerTitle}>
          <ShoppingBag style={{ color: 'var(--primary, #4f46e5)' }} />
          <span>Pedidos de la Tienda Virtual</span>
        </h1>
        <p className={styles.headerSubtitle}>
          Atiende pedidos web en tiempo real, despacha comandas y revisa el historial contable
        </p>
      </div>

      {/* TARJETAS KPI */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Pedidos Activos</span>
            <span className={styles.kpiValue} style={{ color: kpis.pendingCount > 0 ? '#d97706' : '#0f172a' }}>
              {kpis.activeCount}
              {kpis.pendingCount > 0 && (
                <span className="text-xs text-amber-600 font-bold ml-2">({kpis.pendingCount} nuevos)</span>
              )}
            </span>
          </div>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Ventas Tienda</span>
            <span className={styles.kpiValue} style={{ color: '#16a34a' }}>
              {formatMoney(kpis.totalSales)}
            </span>
          </div>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Pedidos Entregados</span>
            <span className={styles.kpiValue}>{kpis.deliveredCount}</span>
          </div>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
            <PackageCheck size={24} />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Ticket Promedio Web</span>
            <span className={styles.kpiValue}>{formatMoney(kpis.avgTicket)}</span>
          </div>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* TABS Y BOTÓN REFRESCO */}
      <div className={styles.tabsBar}>
        <div className={styles.segmentedTabs}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`${styles.tabBtn} ${activeTab === 'active' ? styles.tabBtnActive : ''}`}
          >
            <Clock size={16} />
            <span>Pedidos Activos</span>
            <span className={styles.tabBadge}>{activeOrders.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          >
            <Receipt size={16} />
            <span>Historial de Ventas Web</span>
            <span className={styles.tabBadge}>{historyOrders.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className={styles.refreshBtn}
          title="Actualizar pedidos"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* CONTENIDO SEGÚN TAB */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <span className="text-sm font-semibold">Cargando pedidos...</span>
        </div>
      ) : activeTab === 'active' ? (
        /* VISTA: PEDIDOS ACTIVOS */
        activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No hay pedidos activos en este momento</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Los nuevos pedidos que realicen tus clientes desde la tienda virtual aparecerán automáticamente aquí con alerta sonora y visual.
            </p>
          </div>
        ) : (
          <div className={styles.activeOrdersGrid}>
            {activeOrders.map(order => {
              const isPending = order.status === 'PENDING';
              const isPreparing = order.status === 'PREPARING';
              const isReady = order.status === 'READY';

              return (
                <div
                  key={order.id}
                  className={`${styles.orderCard} ${isPending ? styles.orderCardPending : ''}`}
                >
                  {/* Cabecera de la Tarjeta */}
                  <div className={styles.orderCardHeader}>
                    <div className={styles.orderNumberRow}>
                      <span className={styles.orderNumberBadge}>#{order.orderNumber}</span>
                      <span className={styles.orderTypeBadge}>
                        {order.orderType === 'DELIVERY' ? '🛵 Domicilio' : '🛍️ Para Retirar'}
                      </span>
                    </div>
                    <span className={styles.orderTimeText}>
                      <Clock size={12} />
                      {getElapsedMinutes(order.createdAt)}
                    </span>
                  </div>

                  {/* Cuerpo */}
                  <div className={styles.orderCardBody}>
                    {/* Estado actual */}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-black px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isPending ? '#fef3c7' : isPreparing ? '#dbeafe' : '#dcfce7',
                          color: isPending ? '#b45309' : isPreparing ? '#1d4ed8' : '#15803d'
                        }}
                      >
                        {isPending ? '🟡 Por Confirmar' : isPreparing ? '🔵 En Cocina' : '🟢 Listo / En Camino'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {order.paymentMethodName || 'Efectivo'}
                      </span>
                    </div>

                    {/* Cliente & Contacto */}
                    <div className={styles.customerBox}>
                      <div className={styles.customerNameRow}>
                        <span className={styles.customerName}>{order.customerName}</span>
                        {order.customerPhone && (
                          <a
                            href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.whatsappChatBtn}
                            title="Chatear con el cliente en WhatsApp"
                          >
                            <Send size={11} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                      {order.deliveryAddress && (
                        <span className={styles.customerAddress}>
                          <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{order.deliveryAddress} {order.deliveryNeighborhood && `(${order.deliveryNeighborhood})`}</span>
                        </span>
                      )}
                    </div>

                    {/* Ítems del Pedido con Bases/Variedades y Adiciones */}
                    <div className={styles.orderItemsBox}>
                      {(order.details || []).map(detail => {
                        let mods = [];
                        let adds = [];
                        try {
                          mods = typeof detail.modifiers === 'string' ? JSON.parse(detail.modifiers) : (detail.modifiers || []);
                        } catch { mods = []; }
                        try {
                          adds = typeof detail.additions === 'string' ? JSON.parse(detail.additions) : (detail.additions || []);
                        } catch { adds = []; }

                        return (
                          <div key={detail.id} className="flex flex-col py-1.5 border-b border-dashed border-slate-100 last:border-none">
                            <div className={styles.orderItemLine}>
                              <span>
                                <span className={styles.orderItemQty}>{detail.quantity}x</span>
                                <strong className="text-slate-900">{detail.product?.name || 'Producto'}</strong>
                              </span>
                              <span className="font-bold text-slate-800">{formatMoney(detail.subtotal)}</span>
                            </div>

                            {/* Variaciones / Bases seleccionadas */}
                            {mods && mods.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 ml-6 mt-1">
                                {mods.map((m, mIdx) => (
                                  <span key={mIdx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
                                    <span className="text-indigo-500 font-medium mr-1">{m.modifierName}:</span>
                                    <span>{m.optionName}</span>
                                    {parseFloat(m.priceExtra) > 0 && (
                                      <span className="text-indigo-600 font-normal ml-1">
                                        (+{formatMoney(m.priceExtra)})
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Adiciones */}
                            {adds && adds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 ml-6 mt-1">
                                {adds.map((a, aIdx) => (
                                  <span key={aIdx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    + {a.name} ({formatMoney(a.price)})
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Nota particular del plato */}
                            {detail.notes && (
                              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 ml-6 mt-1 inline-block">
                                📝 Nota: "{detail.notes}"
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Nota general */}
                    {order.notes && (
                      <div className={styles.orderNotesAlert}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Nota:</strong> {order.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer & Botones de Acción */}
                  <div className={styles.orderCardFooter}>
                    <div className={styles.orderTotalRow}>
                      <span className={styles.orderTotalLabel}>Total a Cobrar:</span>
                      <span className={styles.orderTotalAmount}>{formatMoney(order.totalAmount)}</span>
                    </div>

                    <div className={styles.orderActionsRow}>
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className={styles.actionBtnPrimary}
                        >
                          <ChefHat size={15} />
                          <span>Pasar a Cocina</span>
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'READY')}
                          className={styles.actionBtnSuccess}
                        >
                          <Bike size={15} />
                          <span>Listo / Enviar</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          type="button"
                          onClick={() => handleConvertToSale(order)}
                          className={styles.actionBtnSuccess}
                          title="Entregar pedido y registrar venta en caja y facturas"
                        >
                          <CheckCircle2 size={15} />
                          <span>Marcar Entregado y Facturar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleConvertToSale(order)}
                        className={styles.actionBtnInvoice}
                        title="Facturar venta en caja"
                      >
                        <Receipt size={14} />
                        <span>Facturar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de cancelar el pedido #${order.orderNumber}?`)) {
                            handleUpdateStatus(order.id, 'CANCELLED');
                          }
                        }}
                        className={styles.actionBtnCancel}
                        title="Cancelar pedido"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VISTA: HISTORIAL DE VENTAS TIENDA */
        <div className={styles.historyCard}>
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, teléfono, dirección o # orden..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              {filteredHistory.length} pedidos registrados
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha & Hora</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Total</th>
                  <th>Método Pago</th>
                  <th>Estado</th>
                  <th>Factura</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No se encontraron registros de pedidos completados en el historial
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(order => (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.orderNumber}</strong>
                      </td>
                      <td>
                        {new Date(order.createdAt).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{order.customerName}</span>
                          <span className="text-xs text-slate-500">{order.customerPhone}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-semibold">
                          {order.orderType === 'DELIVERY' ? '🛵 Domicilio' : '🛍️ Retiro'}
                        </span>
                      </td>
                      <td>
                        <strong className="text-emerald-700">{formatMoney(order.totalAmount)}</strong>
                      </td>
                      <td>{order.paymentMethodName || 'Efectivo'}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{
                            backgroundColor: order.status === 'DELIVERED' ? '#dcfce7' : '#fee2e2',
                            color: order.status === 'DELIVERED' ? '#15803d' : '#b91c1c'
                          }}
                        >
                          {order.status === 'DELIVERED' ? '✓ Entregado' : '✕ Cancelado'}
                        </span>
                      </td>
                      <td>
                        {order.sale ? (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            {order.sale.invoiceNumber}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConvertToSale(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                            title="Registrar esta venta en la caja activa y en el módulo de Facturas"
                          >
                            <Receipt size={13} />
                            <span>Facturar a Caja</span>
                          </button>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="neo-btn neo-btn-secondary py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE COMANDA */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900">
                Detalle del Pedido #{selectedOrder.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-700">
              <p><strong>Cliente:</strong> {selectedOrder.customerName} ({selectedOrder.customerPhone})</p>
              {selectedOrder.deliveryAddress && (
                <p><strong>Dirección:</strong> {selectedOrder.deliveryAddress} {selectedOrder.deliveryNeighborhood && `(${selectedOrder.deliveryNeighborhood})`}</p>
              )}
              <p><strong>Tipo de Entrega:</strong> {selectedOrder.orderType === 'DELIVERY' ? 'A Domicilio' : 'Retiro en Local'}</p>
              <p><strong>Método de Pago:</strong> {selectedOrder.paymentMethodName || 'Efectivo'}</p>
              <p><strong>Fecha:</strong> {new Date(selectedOrder.createdAt).toLocaleString('es-CO')}</p>
              {selectedOrder.notes && (
                <p className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800">
                  <strong>Notas:</strong> {selectedOrder.notes}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t pt-3">
              <span className="text-xs font-bold text-slate-800">Productos del Pedido:</span>
              {(selectedOrder.details || []).map(d => {
                let mods = [];
                let adds = [];
                try {
                  mods = typeof d.modifiers === 'string' ? JSON.parse(d.modifiers) : (d.modifiers || []);
                } catch { mods = []; }
                try {
                  adds = typeof d.additions === 'string' ? JSON.parse(d.additions) : (d.additions || []);
                } catch { adds = []; }

                return (
                  <div key={d.id} className="flex flex-col py-1.5 border-b border-slate-100 last:border-none">
                    <div className="flex justify-between text-xs">
                      <span><strong>{d.quantity}x</strong> {d.product?.name || 'Producto'}</span>
                      <strong className="text-slate-800">{formatMoney(d.subtotal)}</strong>
                    </div>

                    {/* Modificadores / Bases */}
                    {mods && mods.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mods.map((m, mIdx) => (
                          <span key={mIdx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {m.modifierName}: {m.optionName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Adiciones */}
                    {adds && adds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {adds.map((a, aIdx) => (
                          <span key={aIdx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            + {a.name} ({formatMoney(a.price)})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notas */}
                    {d.notes && (
                      <span className="text-[11px] text-amber-800 italic mt-0.5">
                        Nota: "{d.notes}"
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-sm font-black pt-2">
              <span>Total:</span>
              <span className="text-lg text-emerald-700">{formatMoney(selectedOrder.totalAmount)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="neo-btn neo-btn-secondary px-5 py-2 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreOrdersManager;
