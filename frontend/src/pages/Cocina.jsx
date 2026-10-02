import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Check,
  Bell,
  UtensilsCrossed,
  Layers,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Flame
} from 'lucide-react';
import kitchenService from '../services/kitchen.service';
import styles from './Cocina.module.css';

const Cocina = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'PENDING' | 'PREPARING' | 'READY' | 'history'
  const [originFilter, setOriginFilter] = useState('all'); // 'all' | 'tables' | 'store'
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('neofood_kitchen_sound') !== 'false';
  });

  const [currentTime, setCurrentTime] = useState(Date.now());
  const knownOrderIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // Guardar preferencia de sonido
  useEffect(() => {
    localStorage.setItem('neofood_kitchen_sound', soundEnabled);
  }, [soundEnabled]);

  // Actualizar reloj para el contador de tiempo de las órdenes cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sonido de comanda nueva en cocina (sintetizador Web Audio API de 2 tonos claros)
  const playKitchenChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(523.25, 0, 0.2); // C5
      playTone(659.25, 0.15, 0.3); // E5
      playTone(783.99, 0.3, 0.45); // G5
    } catch {}
  }, [soundEnabled]);

  // Cargar órdenes
  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      setError(null);

      const data = await kitchenService.getOrders({
        status: statusFilter,
        origin: originFilter
      });

      // Detectar si llegaron órdenes nuevas pendientes para reproducir sonido
      if (!isFirstLoadRef.current && soundEnabled) {
        const hasNewOrder = data.some(
          o => o.status === 'PENDING' && !knownOrderIdsRef.current.has(o.id)
        );
        if (hasNewOrder) {
          playKitchenChime();
        }
      }

      // Actualizar mapa de IDs conocidos
      const newIds = new Set(data.map(o => o.id));
      knownOrderIdsRef.current = newIds;
      isFirstLoadRef.current = false;

      setOrders(data);
    } catch (err) {
      console.error('Error cargando órdenes de cocina:', err);
      setError('Error al sincronizar con el servidor de cocina.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, originFilter, soundEnabled, playKitchenChime]);

  // Polling automático cada 8 segundos
  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Manejo de cambio de estado de comanda
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      // Optimistic update
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      await kitchenService.updateStatus(orderId, newStatus);
      fetchOrders(true);
    } catch (err) {
      console.error('Error actualizando comanda:', err);
      alert('No se pudo actualizar el estado de la comanda');
      fetchOrders(true);
    }
  };

  // Calcular tiempo transcurrido
  const getElapsedInfo = (createdAt) => {
    const elapsedMs = currentTime - new Date(createdAt).getTime();
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

    let urgency = styles.urgencyNormal;
    let timerClass = styles.timerNormal;

    if (elapsedMinutes >= 25) {
      urgency = styles.urgencyCritical;
      timerClass = styles.timerCritical;
    } else if (elapsedMinutes >= 12) {
      urgency = styles.urgencyWarning;
      timerClass = styles.timerWarning;
    }

    return {
      minutes: elapsedMinutes,
      urgencyClass: urgency,
      timerClass
    };
  };

  // Conteo de órdenes activas para los badges
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;

  return (
    <div className={styles.container}>

      {/* 1. BARRA SUPERIOR CON CONTADORES Y TÍTULO */}
      <header className={styles.topBar}>
        <div className={styles.headerTitle}>
          <div className={styles.iconWrapper}>
            <ChefHat size={26} />
          </div>
          <div>
            <h1 className={styles.titleText}>Monitor de Cocina (KDS)</h1>
            <p className={styles.subtitleText}>
              Comandero en vivo de mesas, salón, domicilios y tienda virtual
            </p>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={`${styles.statBadge} ${styles.statBadgePending}`}>
            <span>🔴 {pendingCount} Pendientes</span>
          </div>
          <div className={`${styles.statBadge} ${styles.statBadgePreparing}`}>
            <span>🟡 {preparingCount} En Fuego</span>
          </div>
          <div className={`${styles.statBadge} ${styles.statBadgeReady}`}>
            <span>🟢 {readyCount} Listos</span>
          </div>
        </div>
      </header>

      {/* 2. BARRA DE CONTROLES, PESTAÑAS Y HERRAMIENTAS */}
      <section className={styles.controlsBar}>
        <div className={styles.filterTabs}>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`${styles.tabBtn} ${statusFilter === 'active' ? styles.tabBtnActive : ''}`}
          >
            <Flame size={15} />
            <span>Todos en Curso</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`${styles.tabBtn} ${statusFilter === 'PENDING' ? styles.tabBtnActive : ''}`}
          >
            <span>🔴 Pendientes</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PREPARING')}
            className={`${styles.tabBtn} ${statusFilter === 'PREPARING' ? styles.tabBtnActive : ''}`}
          >
            <span>🟡 En Preparación</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('READY')}
            className={`${styles.tabBtn} ${statusFilter === 'READY' ? styles.tabBtnActive : ''}`}
          >
            <span>🟢 Listos para Entrega</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('history')}
            className={`${styles.tabBtn} ${statusFilter === 'history' ? styles.tabBtnActive : ''}`}
          >
            <CheckCircle2 size={15} />
            <span>Despachados Hoy</span>
          </button>
        </div>

        <div className={styles.rightActions}>
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className={styles.originSelect}
          >
            <option value="all">🍽️ Todos los orígenes</option>
            <option value="tables">Salón (Mesas)</option>
            <option value="store">Tienda Virtual / Domicilios</option>
          </select>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`${styles.actionBtn} ${soundEnabled ? styles.soundBtnActive : ''}`}
            title={soundEnabled ? "Silenciar alarmas" : "Activar alarmas sonoras"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Sonido ON' : 'Sonido OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchOrders(false)}
            disabled={refreshing}
            className={styles.actionBtn}
            title="Refrescar comanda"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </section>

      {/* 3. GRILLA DE COMANDAS / TICKETS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <RefreshCw size={32} className="animate-spin text-orange-500" />
          <p className="text-sm font-bold tracking-wide">Cargando comandas de cocina...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <CheckCircle2 size={36} />
          </div>
          <h2 className={styles.emptyTitle}>¡Cocina al día!</h2>
          <p className={styles.emptySubtitle}>
            No hay comandas activas pendientes en este momento. Las nuevas órdenes del salón y de la tienda virtual aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className={styles.ticketsGrid}>
          {orders.map(order => {
            const timeInfo = getElapsedInfo(order.createdAt);
            const isCompleted = order.status === 'DELIVERED' || order.status === 'CANCELLED';

            return (
              <article
                key={order.id}
                className={`${styles.ticketCard} ${!isCompleted ? timeInfo.urgencyClass : ''}`}
              >
                {/* Cabecera del ticket */}
                <div className={styles.ticketHeader}>
                  <div className={styles.ticketOrderInfo}>
                    <span className={styles.ticketNumber}>#{order.orderNumber}</span>
                  </div>

                  <div className={`${styles.ticketTimer} ${timeInfo.timerClass}`}>
                    <Clock size={12} />
                    <span>{timeInfo.minutes} min</span>
                  </div>
                </div>

                {/* Fila de metadatos (Origen y Cliente) */}
                <div className={styles.ticketMetaRow}>
                  <span
                    className={`${styles.originBadge} ${
                      order.originType === 'TABLE'
                        ? styles.originTable
                        : order.originType === 'STORE'
                        ? styles.originStore
                        : styles.originTakeaway
                    }`}
                  >
                    {order.originType === 'TABLE' && '🍽️ '}
                    {order.originType === 'STORE' && '🛵 '}
                    {order.originType === 'TAKEAWAY' && '🛍️ '}
                    {order.originLabel}
                  </span>

                  <span className={styles.customerName} title={order.customerName}>
                    {order.customerName}
                  </span>
                </div>

                {/* Nota general de la orden */}
                {order.notes && (
                  <div className={styles.orderNotesBox}>
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>Nota: "{order.notes}"</span>
                  </div>
                )}

                {/* Lista de Platos / Items */}
                <div className={styles.itemsList}>
                  {order.details.map(item => (
                    <div key={item.id} className={styles.itemRow}>
                      <div className={styles.itemHeader}>
                        <span className={styles.itemQty}>{item.quantity}</span>
                        <span className={styles.itemName}>
                          {item.productName}
                          {item.isCombo && (
                            <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                              COMBO
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Modificadores / Base */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className={styles.modifiersBox}>
                          {item.modifiers.map((mod, idx) => (
                            <span key={idx} className={styles.modifierTag}>
                              <Layers size={11} />
                              {mod.modifierName ? `${mod.modifierName}: ` : 'Base: '}
                              <strong>{mod.optionName || mod.name}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Adiciones Extra */}
                      {item.additions && item.additions.length > 0 && (
                        <div className={styles.modifiersBox}>
                          {item.additions.map((add, idx) => (
                            <span key={idx} className={styles.additionTag}>
                              <strong>+ {add.name}</strong>
                              {add.quantity > 1 && ` (x${add.quantity})`}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Nota individual del plato */}
                      {item.notes && (
                        <span className={styles.itemNote}>
                          ⚠️ "{item.notes}"
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pie de acción según el estado */}
                <div className={styles.ticketFooter}>
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className={`${styles.primaryActionBtn} ${styles.btnPending}`}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Empezar Preparación</span>
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className={`${styles.primaryActionBtn} ${styles.btnPreparing}`}
                    >
                      <Check size={18} />
                      <span>Marcar como Listo</span>
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                      className={`${styles.primaryActionBtn} ${styles.btnReady}`}
                    >
                      <Bell size={16} />
                      <span>Despachar / Entregar</span>
                    </button>
                  )}

                  {order.status === 'DELIVERED' && (
                    <div className={`${styles.primaryActionBtn} ${styles.btnDelivered}`}>
                      <CheckCircle2 size={16} />
                      <span>Despachado</span>
                    </div>
                  )}

                  {order.status === 'CANCELLED' && (
                    <div className={`${styles.primaryActionBtn} ${styles.btnDelivered}`}>
                      <AlertTriangle size={16} />
                      <span>Cancelado</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Cocina;
