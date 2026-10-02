import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import StatCard from '../components/dashboard/StatCard';
import SalesChart from '../components/dashboard/SalesChart';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  Package,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import styles from './Dashboard.module.css';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDashboard();

  const [lowStockPage, setLowStockPage] = useState(1);
  const [topProductsPage, setTopProductsPage] = useState(1);
  const miniPageSize = 2;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '20rem', gap: '0.75rem' }}>
        <div className="animate-spin" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent' }}></div>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Sincronizando métricas en tiempo real...</p>
      </div>
    );
  }

  const { kpis, chartData, topProducts } = data;
  const isCashOpen = kpis?.cashSession?.status === 'OPEN';

  const lowStockItems = kpis?.lowStockItems || [];
  const paginatedLowStock = lowStockItems.slice((lowStockPage - 1) * miniPageSize, lowStockPage * miniPageSize);
  const totalLowStockPages = Math.ceil(lowStockItems.length / miniPageSize) || 1;

  const productsList = topProducts || [];
  const paginatedTopProducts = productsList.slice((topProductsPage - 1) * miniPageSize, topProductsPage * miniPageSize);
  const totalTopProductsPages = Math.ceil(productsList.length / miniPageSize) || 1;

  return (
    <div className={styles.dashboardContainer}>

      {/* HEADER PRINCIPAL */}
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>
            Panel Principal
          </h1>
          <p className={styles.dashboardSubtitle}>
            Resumen operativo, balance y métricas de NeoFood en tiempo real
          </p>
        </div>

        <div className={styles.dashboardActions}>
          {/* Badge Estado de Caja */}
          <div
            onClick={() => navigate('/caja')}
            className={`${styles.cashStatusBadge} ${isCashOpen ? styles.open : styles.closed}`}
            title="Ir a gestión de caja"
          >
            {isCashOpen ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{isCashOpen ? 'TURNO ABIERTO' : 'CAJA CERRADA'}</span>
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={refetch}
            className={styles.dashboardRefreshBtn}
            title="Actualizar métricas"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ERROR BANNER SI FALLA ALGO */}
      {error && (
        <div className={styles.dashboardErrorBanner}>
          <span>{error}</span>
          <button onClick={refetch} style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '0.75rem' }}>Reintentar</button>
        </div>
      )}

      {/* KPIS CARDS GRID */}
      <div className={styles.dashboardKpiGrid}>
        <StatCard
          title="Ventas de Hoy"
          value={formatCurrency(kpis?.dailySales)}
          subtitle="Facturación registrada hoy"
          icon={DollarSign}
          colorClass="stat-icon-blue"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatCurrency(kpis?.monthlySales)}
          subtitle="Total acumulado en el mes"
          icon={TrendingUp}
          colorClass="stat-icon-indigo"
        />
        <StatCard
          title="Ganancia Estimada"
          value={formatCurrency(kpis?.monthlyProfit)}
          subtitle="Ventas menos compras"
          icon={CreditCard}
          colorClass="stat-icon-emerald"
        />
        <StatCard
          title="Compras del Mes"
          value={formatCurrency(kpis?.totalPurchases)}
          subtitle="Gastos en insumos y materia prima"
          icon={ShoppingCart}
          colorClass="stat-icon-amber"
        />
      </div>

      {/* SECCIÓN PRINCIPAL: GRÁFICO + INSIGHTS */}
      <div className={styles.dashboardMainGrid}>

        {/* Gráfico de Ventas de 7 días */}
        <div>
          <SalesChart data={chartData} />
        </div>

        {/* Panel Lateral: Alertas y Top Productos */}
        <div className={styles.dashboardSidePanels}>

          {/* Tarjeta Alertas de Inventario */}
          <div className={styles.dashboardPanelCard}>
            <div className={styles.dashboardPanelHeader}>
              <h3 className={styles.dashboardPanelTitle}>
                <AlertTriangle style={{ color: 'var(--warning)' }} size={18} />
                Alertas de Insumos
              </h3>
              <button
                onClick={() => navigate('/inventario')}
                className={styles.dashboardPanelLink}
              >
                Bodega <ArrowRight size={12} />
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Inventario al día</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>No hay insumos por debajo del stock mínimo.</p>
              </div>
            ) : (
              <>
                <ul className={styles.lowStockList}>
                  {paginatedLowStock.map(item => (
                    <li key={item.id} className={styles.lowStockItem}>
                      <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unit || 'Unidad'}</p>
                      </div>
                      <span className={styles.lowStockBadge}>
                        {parseFloat(item.currentStock || 0)} / {parseFloat(item.minStock || 0)}
                      </span>
                    </li>
                  ))}
                </ul>

                {lowStockItems.length > miniPageSize && (
                  <div className={styles.miniPagination}>
                    <span>Pág. <strong>{lowStockPage}</strong> de <strong>{totalLowStockPages}</strong> ({lowStockItems.length} insumos)</span>
                    <div className={styles.miniPaginationControls}>
                      <button
                        type="button"
                        onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                        disabled={lowStockPage <= 1}
                        className={styles.miniPaginationBtn}
                        title="Página anterior"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLowStockPage(p => Math.min(totalLowStockPages, p + 1))}
                        disabled={lowStockPage >= totalLowStockPages}
                        className={styles.miniPaginationBtn}
                        title="Página siguiente"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tarjeta Top Productos Vendidos */}
          <div className={styles.dashboardPanelCard} style={{ flex: 1 }}>
            <div className={styles.dashboardPanelHeader}>
              <h3 className={styles.dashboardPanelTitle}>
                <ShoppingBag style={{ color: 'var(--primary)' }} size={18} />
                Top Productos
              </h3>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)' }}>Este Mes</span>
            </div>

            {productsList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', margin: 'auto 0' }}>
                <Package size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Sin ventas registradas</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>Los productos más vendidos aparecerán aquí.</p>
                <button
                  onClick={() => navigate('/ventas')}
                  className="neo-btn neo-btn-primary neo-btn-sm"
                  style={{ marginTop: '0.75rem' }}
                >
                  Ir al POS
                </button>
              </div>
            ) : (
              <>
                <ul className={styles.topProductsList} style={{ margin: 'auto 0' }}>
                  {paginatedTopProducts.map((product, index) => {
                    const rank = (topProductsPage - 1) * miniPageSize + index + 1;
                    return (
                      <li key={index} className={styles.topProductItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, paddingRight: '0.5rem' }}>
                          <div className={styles.topProductRank}>
                            #{rank}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{product.quantity} unidades vendidas</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>{formatCurrency(product.revenue)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {productsList.length > miniPageSize && (
                  <div className={styles.miniPagination}>
                    <span>Pág. <strong>{topProductsPage}</strong> de <strong>{totalTopProductsPages}</strong> ({productsList.length} productos)</span>
                    <div className={styles.miniPaginationControls}>
                      <button
                        type="button"
                        onClick={() => setTopProductsPage(p => Math.max(1, p - 1))}
                        disabled={topProductsPage <= 1}
                        className={styles.miniPaginationBtn}
                        title="Página anterior"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopProductsPage(p => Math.min(totalTopProductsPages, p + 1))}
                        disabled={topProductsPage >= totalTopProductsPages}
                        className={styles.miniPaginationBtn}
                        title="Página siguiente"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;