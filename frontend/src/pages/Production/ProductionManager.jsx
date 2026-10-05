import React, { useState, useEffect } from 'react';
import { Factory, Plus, Search, Eye, XCircle, X } from 'lucide-react';
import productionService from '../../services/production.service';
import ProductionForm from './components/ProductionForm';
import ProductionDetailsModal from './components/ProductionDetailsModal';
import CustomSelect from '../../components/ui/CustomSelect';
import { Pagination } from '../../components/ui';
import styles from './ProductionManager.module.css';

const ProductionManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Estados de búsqueda, filtro y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await productionService.getProductionOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading production orders:', error);
      alert('Error al cargar lotes de producción');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('¿Está seguro de anular esta orden de producción? Esto reversará el inventario ingresado y devolverá las materias primas consumidas.')) {
      return;
    }

    try {
      await productionService.cancelProductionOrder(orderId);
      alert('Orden anulada exitosamente');
      loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert(error.response?.data?.message || 'Error al anular la orden');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Filtrado reactivo de lotes de producción
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (order.ingredient?.name && order.ingredient.name.toLowerCase().includes(term)) ||
      (order.id && order.id.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Factory style={{ color: 'var(--primary)' }} /> Lotes de Producción
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Gestiona la producción interna de elaborados y semielaborados.</p>
        </div>
        <button 
          className="neo-btn neo-btn-primary" 
          onClick={() => setIsFormOpen(true)}
        >
          <Plus size={16} />
          <span>Nuevo Lote</span>
        </button>
      </div>

      <div className="neo-table-card">
        {/* BARRA DE BÚSQUEDA Y FILTRO */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: 'var(--bg-surface, #ffffff)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
              <input
                type="text"
                placeholder="Buscar por insumo elaborado o # lote..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="neo-input neo-search-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ minWidth: '180px' }}>
              <CustomSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Todos los estados' },
                  { value: 'COMPLETED', label: 'Completados' },
                  { value: 'CANCELLED', label: 'Anulados' }
                ]}
                placeholder="Estado..."
              />
            </div>

            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className="neo-btn neo-btn-ghost text-xs"
                style={{ padding: '0.4rem 0.75rem' }}
              >
                <X size={14} /> Limpiar filtros
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
            {filteredOrders.length} {filteredOrders.length === 1 ? 'lote encontrado' : 'lotes encontrados'}
          </div>
        </div>

        <div className="neo-table-responsive">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando lotes...</div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Factory size={36} style={{ opacity: 0.4 }} />
                <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {searchTerm || statusFilter !== 'ALL' ? 'No se encontraron lotes de producción' : 'No hay lotes registrados'}
                </p>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>
                  {searchTerm || statusFilter !== 'ALL' ? 'Prueba cambiando los criterios de búsqueda o estado.' : 'Aún no has registrado ninguna producción.'}
                </p>
              </div>
            </div>
          ) : (
            <table className="neo-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Elaborado</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Costo Unit.</th>
                  <th style={{ textAlign: 'right' }}>Costo Total</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{order.id.slice(-6).toUpperCase()}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{order.ingredient?.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      {parseFloat(order.quantityProduced)} {order.ingredient?.unit}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(order.unitCost)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(order.totalCost)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: order.status === 'COMPLETED' ? '#dcfce7' : '#fee2e2',
                        color: order.status === 'COMPLETED' ? '#166534' : '#991b1b'
                      }}>
                        {order.status === 'COMPLETED' ? 'Completado' : 'Anulado'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button 
                          className="neo-action-icon-btn" 
                          onClick={() => setSelectedOrder(order)}
                          title="Ver detalle de consumos"
                        >
                          <Eye size={16} />
                        </button>
                        {order.status === 'COMPLETED' && (
                          <button 
                            className="neo-action-icon-btn danger"
                            onClick={() => handleCancelOrder(order.id)}
                            title="Anular Lote"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredOrders.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemName="lotes"
          />
        )}
      </div>

      {isFormOpen && (
        <ProductionForm 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => {
            setIsFormOpen(false);
            loadOrders();
          }} 
        />
      )}

      {selectedOrder && (
        <ProductionDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
};

export default ProductionManager;
