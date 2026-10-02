import React, { useState, useEffect } from 'react';
import { ShoppingBag, Eye, Plus, Search, Calendar, Building2, X, Ban } from 'lucide-react';
import Datepicker from "react-tailwindcss-datepicker";
import { Pagination } from '../../components/ui';
import api from '../../services/api';
import styles from '../Compras.module.css';

const PurchaseHistory = ({ onAddNew, refreshTrigger }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState({ startDate: null, endDate: null });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);

  // Estado para el modal de detalles
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      // Usamos la ruta exacta que definiste en tu purchase.routes.js
      const response = await api.get('/purchases/history');
      setPurchases(response.data.data);
    } catch (err) {
      setError('Error al cargar el historial de compras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [refreshTrigger]);

  // Filtrado local por factura o proveedor
  const filteredPurchases = purchases.filter(p => {
    const search = searchTerm.toLowerCase();
    const invoiceMatch = p.invoiceNumber?.toLowerCase().includes(search);
    const supplierMatch = p.supplier?.name?.toLowerCase().includes(search);

    let dateMatch = true;
    if (filterDate?.startDate) {
      const dateOnly = new Date(p.createdAt).toISOString().split('T')[0];
      dateMatch = dateOnly === filterDate.startDate;
    }

    return (invoiceMatch || supplierMatch) && dateMatch;
  });

  // Utilidad para colores de estado
  // Utilidad para colores de estado
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className={`${styles.comprasBadge} ${styles.comprasBadgeCompleted}`}>Completada</span>;
      case 'CANCELLED':
        return <span className={`${styles.comprasBadge} ${styles.comprasBadgeCancelled}`}>Anulada</span>;
      case 'PENDING':
        return <span className={`${styles.comprasBadge} ${styles.comprasBadgePending}`}>Pendiente</span>;
      default:
        return <span className={styles.comprasBadge} style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{status}</span>;
    }
  };

  // Función opcional para anular compra (requiere la ruta /:id/cancel en backend)
  const handleCancel = async (id) => {
    if (!window.confirm('¿Estás seguro de anular esta compra? Esto podría afectar el inventario.')) return;
    try {
      await api.put(`/purchases/${id}/cancel`);
      fetchPurchases(); // Recargar para ver el estado actualizado
      setSelectedPurchase(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al anular la compra');
    }
  };

  return (
    <div className={styles.comprasContainer}>
      {/* HEADER Y BUSCADOR */}
      <div className={styles.comprasHeader}>
        <div>
          <h1 className={styles.comprasTitle}>
            <ShoppingBag style={{ color: 'var(--primary)' }} />
            Historial de Compras
          </h1>
          <p className={styles.comprasSubtitle}>Registro de ingresos de inventario y facturas de proveedores</p>
        </div>

        <div className={styles.comprasHeaderActions}>
          <div className={styles.comprasSearchBox}>
            <span className={styles.comprasSearchIcon}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar factura o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.comprasSearchInput}
            />
          </div>
          <div style={{ width: '12rem', position: 'relative' }}>
            <Datepicker
              primaryColor="indigo"
              useRange={false}
              asSingle={true}
              value={filterDate}
              onChange={newValue => setFilterDate(newValue)}
              displayFormat="DD/MM/YYYY"
              placeholder="Filtrar por fecha..."
              inputClassName="neo-input"
            />
            {filterDate?.startDate && (
              <button
                onClick={() => setFilterDate({ startDate: null, endDate: null })}
                style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={onAddNew}
            className="neo-btn neo-btn-primary"
          >
            <Plus size={16} />
            <span>Nueva Compra</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className={styles.comprasCard}>
        <div className={styles.comprasTableWrapper}>
          <table className={styles.comprasTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Factura</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando historial...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron compras.</td></tr>
              ) : (
                filteredPurchases.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((purchase) => (
                  <tr key={purchase.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} />
                        {new Date(purchase.createdAt).toLocaleDateString('es-CO')}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {purchase.invoiceNumber || 'S/N'}
                    </td>
                    <td style={{ color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                        {purchase.supplier?.name || 'Proveedor Eliminado'}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(purchase.status)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>
                      $ {parseFloat(purchase.totalCost).toLocaleString('es-CO')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedPurchase(purchase)}
                        className="neo-btn neo-btn-ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
                      >
                        <Eye size={16} /> Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPurchases.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="compras"
        />
      </div>

      {/* MODAL DE DETALLES DE COMPRA */}
      {selectedPurchase && (
        <div
          className="neo-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPurchase(null);
          }}
        >
          <div className="neo-modal" style={{ maxWidth: '48rem', maxHeight: '90vh' }}>

            {/* Cabecera del Modal */}
            <div className="neo-modal-header">
              <div>
                <h2 className="neo-modal-title">
                  <ShoppingBag size={20} />
                  <span>Factura: {selectedPurchase.invoiceNumber || 'Sin Número'}</span>
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', margin: '0.25rem 0 0 0' }}>
                  Registrada el {new Date(selectedPurchase.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="neo-modal-close-btn" title="Cerrar">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Modal (Scrollable) */}
            <div className="neo-modal-body">

              {/* Info del Proveedor */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--radius-xl)' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Proveedor</p>
                  <p style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.125rem', margin: 0 }}>{selectedPurchase.supplier?.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>NIT: {selectedPurchase.supplier?.nit || 'N/A'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Estado</p>
                  {getStatusBadge(selectedPurchase.status)}
                </div>
              </div>

              {/* Tabla de Artículos */}
              <h3 style={{ fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0 0 0', fontSize: '1rem' }}>Detalle de Artículos</h3>
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: '#1e293b', borderBottom: '2px solid var(--primary, #4f46e5)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', color: '#ffffff', fontWeight: 800, borderBottom: '2px solid var(--primary, #4f46e5)' }}>Ingrediente</th>
                      <th style={{ padding: '0.75rem', color: '#ffffff', fontWeight: 800, textAlign: 'center', borderBottom: '2px solid var(--primary, #4f46e5)' }}>Cant.</th>
                      <th style={{ padding: '0.75rem', color: '#ffffff', fontWeight: 800, textAlign: 'right', borderBottom: '2px solid var(--primary, #4f46e5)' }}>Costo Unit.</th>
                      <th style={{ padding: '0.75rem', color: '#ffffff', fontWeight: 800, textAlign: 'right', borderBottom: '2px solid var(--primary, #4f46e5)' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.details?.map(detail => (
                      <tr key={detail.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {detail.ingredient?.name || 'Ingrediente Desconocido'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {parseFloat(detail.quantity)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          $ {parseFloat(detail.unitCost).toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>
                          $ {parseFloat(detail.totalCost).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <tr>
                      <td colSpan="3" style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: 'var(--text-secondary)' }}>TOTAL DE LA COMPRA:</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, color: 'var(--primary)', fontSize: '1.125rem' }}>
                        $ {parseFloat(selectedPurchase.totalCost).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Pie del Modal (Acciones Extra) */}
            <div className="neo-modal-footer">
              {selectedPurchase.status === 'COMPLETED' ? (
                <button
                  onClick={() => handleCancel(selectedPurchase.id)}
                  className="neo-btn neo-btn-danger"
                >
                  <Ban size={16} /> Anular Factura
                </button>
              ) : (
                <div></div>
              )}

              <button
                onClick={() => setSelectedPurchase(null)}
                className="neo-btn neo-btn-secondary"
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

export default PurchaseHistory;
