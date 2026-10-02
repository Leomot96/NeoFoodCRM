import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Plus, Store, Edit2, Trash2, X, Search } from 'lucide-react';
import CustomSelect from '../../components/ui/CustomSelect';
import { Pagination } from '../../components/ui';
import api from '../../services/api';
import styles from '../Inventario.module.css';

const IngredientsList = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  
  // Estados para el Modal de Insumos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Kilogramos (kg)',
    minStock: '0'
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory/ingredients');
      setIngredients(response.data.data || []);
    } catch (err) {
      console.error('Error al cargar insumos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const openModal = (ingredient = null) => {
    setError('');
    if (ingredient) {
      setEditingId(ingredient.id);
      setFormData({
        name: ingredient.name || '',
        unit: ingredient.unit || 'Kilogramos (kg)',
        minStock: String(ingredient.minStock || 0)
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        unit: 'Kilogramos (kg)',
        minStock: '0'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setError('');
  };

  // Cerrar modal al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('El nombre del insumo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        minStock: parseFloat(formData.minStock) || 0
      };

      if (editingId) {
        await api.put(`/inventory/ingredients/${editingId}`, payload);
      } else {
        await api.post('/inventory/ingredients', payload);
      }

      closeModal();
      fetchIngredients();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el insumo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el insumo "${name}"?`)) return;
    try {
      await api.delete(`/inventory/ingredients/${id}`);
      fetchIngredients();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el insumo. Puede estar vinculado a recetas o compras.');
    }
  };

  const filteredIngredients = ingredients.filter(ing => {
    const term = searchTerm.toLowerCase();
    return ing.name.toLowerCase().includes(term) || (ing.unit && ing.unit.toLowerCase().includes(term));
  });

  const paginatedIngredients = filteredIngredients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={styles.invCard}>
      {/* HEADER DE LA BODEGA CON ACCIONES */}
      <div className={styles.invFilterBar}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Package style={{ color: 'var(--primary)' }} /> Stock de Materia Prima e Insumos
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Control de insumos para cocina y stock de compras.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div className={styles.invSearchInputWrapper}>
            <Search className={styles.invSearchIcon} size={16} />
            <input
              type="text"
              placeholder="Buscar insumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`neo-input ${styles.invSearchInput}`}
            />
          </div>

          <button
            onClick={() => navigate('/compras')}
            className="neo-btn neo-btn-success"
            title="Ir a registrar una compra de insumos"
          >
            <Store size={16} />
            <span>Digitar Compra</span>
          </button>

          <button
            onClick={() => openModal()}
            className="neo-btn neo-btn-primary"
          >
            <Plus size={16} />
            <span>Nuevo Insumo</span>
          </button>
        </div>
      </div>

      {/* TABLA DE INGREDIENTES */}
      <div className={styles.invTableWrapper}>
        <table className={styles.invTable}>
          <thead>
            <tr>
              <th>Insumo</th>
              <th style={{ textAlign: 'center' }}>Unidad de Medida</th>
              <th style={{ textAlign: 'right' }}>Stock Actual</th>
              <th style={{ textAlign: 'right' }}>Stock Mínimo</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando materia prima...</td></tr>
            ) : filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Package size={36} style={{ opacity: 0.4 }} />
                    <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>No se encontraron insumos</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>Agrega materias primas o digita una compra para comenzar a registrar inventario.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <button onClick={() => openModal()} className="neo-btn neo-btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                        <Plus size={14} /> Crear Insumo
                      </button>
                      <button onClick={() => navigate('/compras')} className="neo-btn neo-btn-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                        <Store size={14} /> Digitar Compra
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedIngredients.map((ing) => {
                const stock = parseFloat(ing.currentStock || 0);
                const minStock = parseFloat(ing.minStock || 0);
                const isLow = stock <= minStock;

                return (
                  <tr key={ing.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ing.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`${styles.invBadge} ${styles.invBadgeGray}`}>
                        {ing.unit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: isLow ? '#ef4444' : 'var(--text-main)' }}>
                      {stock.toLocaleString('es-CO')}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {minStock.toLocaleString('es-CO')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isLow ? (
                        <span className={`${styles.invBadge} ${styles.invBadgeDanger}`}>
                          <AlertTriangle size={13} /> Bajo Stock
                        </span>
                      ) : (
                        <span className={`${styles.invBadge} ${styles.invBadgeEmerald}`}>
                          Normal
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => openModal(ing)}
                          className="neo-btn neo-btn-ghost"
                          style={{ padding: '0.35rem' }}
                          title="Editar Insumo"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(ing.id, ing.name)}
                          className="neo-btn neo-btn-ghost"
                          style={{ padding: '0.35rem', color: '#ef4444' }}
                          title="Eliminar Insumo"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalItems={filteredIngredients.length} 
        pageSize={pageSize} 
        onPageChange={setCurrentPage} 
        itemName="insumos" 
      />

      {/* MODAL PARA AGREGAR / EDITAR INSUMO */}
      {isModalOpen && (
        <div 
          className="neo-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="neo-modal neo-modal-md">
            <div className="neo-modal-header">
              <h3 className="neo-modal-title">
                <Package style={{ color: 'var(--primary)' }} size={20} />
                {editingId ? 'Editar Insumo' : 'Nuevo Insumo / Materia Prima'}
              </h3>
              <button 
                type="button"
                onClick={closeModal} 
                className="neo-modal-close-btn" 
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}>
              <div className="neo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger-text)', fontSize: '0.8125rem', borderRadius: 'var(--radius-lg)' }}>
                    {error}
                  </div>
                )}

                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label className="neo-label">
                    Nombre del Insumo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carne de Res, Pan Brioche, Queso Mozzarella"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="neo-input"
                  />
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label className="neo-label">
                    Unidad de Medida
                  </label>
                  <CustomSelect
                    value={formData.unit}
                    onChange={(val) => setFormData({ ...formData, unit: val })}
                    options={[
                      { value: "Kilogramos (kg)", label: "Kilogramos (kg)" },
                      { value: "Gramos (g)", label: "Gramos (g)" },
                      { value: "Litros (L)", label: "Litros (L)" },
                      { value: "Mililitros (ml)", label: "Mililitros (ml)" },
                      { value: "Unidades (und)", label: "Unidades (und)" },
                      { value: "Porciones", label: "Porciones" },
                      { value: "Libras (lb)", label: "Libras (lb)" },
                      { value: "Cajas", label: "Cajas" }
                    ]}
                    placeholder="Kilogramos (kg)"
                  />
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label className="neo-label">
                    Stock Mínimo para Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej: 5"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="neo-input"
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', margin: 0 }}>El sistema te avisará cuando el stock baje de este valor.</p>
                </div>
              </div>

              <div className="neo-modal-footer">
                <button
                  type="button"
                  onClick={closeModal}
                  className="neo-btn neo-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="neo-btn neo-btn-primary"
                >
                  {isSubmitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsList;