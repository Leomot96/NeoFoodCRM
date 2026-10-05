import React from 'react';
import styles from './ProductionDetailsModal.module.css';

const ProductionDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

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

  return (
    <div 
      className="neo-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="neo-modal neo-modal-lg">
        <div className="neo-modal-header">
          <h2 className="neo-modal-title">Detalle de Lote #{order.id.slice(-6).toUpperCase()}</h2>
          <button className="neo-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="neo-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Elaborado</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{order.ingredient?.name}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Cantidad Producida</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{parseFloat(order.quantityProduced)} {order.ingredient?.unit}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Costo Total</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(order.totalCost)}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Costo Unitario</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(order.unitCost)}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Fecha</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{formatDate(order.createdAt)}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Estado</span>
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
            </div>
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Insumos Consumidos
          </h3>
          
          {order.consumptions && order.consumptions.length > 0 ? (
            <div className="neo-table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Costo Unitario (CMP)</th>
                    <th style={{ textAlign: 'right' }}>Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.consumptions.map(cons => (
                    <tr key={cons.id}>
                      <td style={{ fontWeight: 600 }}>{cons.ingredient?.name}</td>
                      <td style={{ textAlign: 'right' }}>{parseFloat(cons.quantity)} {cons.ingredient?.unit}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(cons.unitCost)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(cons.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>No hay detalles de consumo para este lote.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionDetailsModal;
