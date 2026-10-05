import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import productionService from '../../../services/production.service';
import styles from './ProductionForm.module.css';

const ProductionForm = ({ onClose, onSuccess }) => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    ingredientId: '',
    quantityProduced: '',
    notes: ''
  });

  useEffect(() => {
    const fetchManufacturedIngredients = async () => {
      try {
        const response = await api.get('/inventory/ingredients');
        // Filtrar solo los que son elaborados
        const elaborados = response.data.data.filter(i => i.isManufactured);
        setIngredients(elaborados);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
        alert('Error al cargar la lista de artículos elaborados');
      } finally {
        setLoading(false);
      }
    };

    fetchManufacturedIngredients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectedIngredient = ingredients.find(i => i.id === formData.ingredientId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ingredientId || !formData.quantityProduced) return;
    
    const qty = parseFloat(formData.quantityProduced);
    if (isNaN(qty) || qty <= 0) {
      return alert('La cantidad a producir debe ser mayor a 0');
    }

    try {
      setSubmitting(true);
      await productionService.createProductionOrder(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating production order:', error);
      alert(error.response?.data?.message || 'Error al registrar lote de producción');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="neo-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="neo-modal neo-modal-md">
        <div className="neo-modal-header">
          <h2 className="neo-modal-title">Registrar Lote de Producción</h2>
          <button className="neo-modal-close-btn" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <div className="neo-modal-body">
          {loading ? (
            <p>Cargando artículos...</p>
          ) : (
            <form id="production-form" onSubmit={handleSubmit}>
              <div className="neo-form-group">
                <label className="neo-label">Artículo Elaborado a Producir</label>
                <select 
                  name="ingredientId" 
                  value={formData.ingredientId} 
                  onChange={handleChange}
                  className="neo-select"
                  required
                >
                  <option value="">-- Seleccione el elaborado --</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="neo-form-group">
                <label className="neo-label">Cantidad a Producir {selectedIngredient ? `(en ${selectedIngredient.unit})` : ''}</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="quantityProduced"
                  value={formData.quantityProduced}
                  onChange={handleChange}
                  className="neo-input"
                  placeholder="Ej: 10"
                  required
                />
              </div>

              <div className="neo-form-group">
                <label className="neo-label">Notas (Opcional)</label>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="neo-textarea"
                  rows="2"
                  placeholder="Ej: Lote con más picante, responsable: Juan"
                ></textarea>
              </div>

              {selectedIngredient && formData.quantityProduced && parseFloat(formData.quantityProduced) > 0 && (
                <div style={{ marginTop: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#334155' }}>Proyección de Consumo</h3>
                  {selectedIngredient.recipeIngredients && selectedIngredient.recipeIngredients.length > 0 ? (
                    selectedIngredient.recipeIngredients.map(req => {
                      const qtyNeeded = (parseFloat(req.quantity) * parseFloat(formData.quantityProduced)).toFixed(2);
                      const currentStock = parseFloat(req.inputIngredient?.currentStock || 0);
                      const willBeNegative = currentStock - qtyNeeded < 0;

                      return (
                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                          <div>
                            <strong style={{ color: '#0f172a' }}>{req.inputIngredient?.name}</strong>
                            {willBeNegative && (
                              <span style={{ color: '#dc2626', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Faltará stock)</span>
                            )}
                          </div>
                          <div style={{ color: '#64748b' }}>
                            {qtyNeeded} {req.inputIngredient?.unit}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#d97706', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '0.25rem' }}>
                      Este artículo no tiene una receta configurada. No se descontarán insumos.
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        <div className="neo-modal-footer">
          <button type="button" className="neo-btn neo-btn-ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" form="production-form" className="neo-btn neo-btn-primary" disabled={submitting || loading}>
            {submitting ? 'Registrando...' : 'Confirmar Producción'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionForm;
