import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Plus, Store, Edit2, Trash2, X, Search, ChefHat, ShoppingCart, Factory, Layers } from 'lucide-react';
import CustomSelect from '../../components/ui/CustomSelect';
import { Pagination } from '../../components/ui';
import api from '../../services/api';
import PurchaseForm from '../Purchases/PurchaseForm';
import styles from '../Inventario.module.css';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(value || 0);
};

const IngredientsList = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Estados para el Modal de Insumos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Kilogramos (kg)',
    minStock: '0',
    isManufactured: false,
    recipeIngredients: []
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
        minStock: String(ingredient.minStock || 0),
        isManufactured: ingredient.isManufactured || false,
        recipeIngredients: ingredient.recipeIngredients ? ingredient.recipeIngredients.map(r => ({
          inputIngredientId: r.inputIngredientId,
          quantity: String(r.quantity),
          unit: r.unit,
          name: r.inputIngredient?.name || ''
        })) : []
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        unit: 'Kilogramos (kg)',
        minStock: '0',
        isManufactured: activeTab === 'manufactured',
        recipeIngredients: []
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
        minStock: parseFloat(formData.minStock) || 0,
        isManufactured: formData.isManufactured,
      };

      if (formData.isManufactured) {
        payload.recipeIngredients = formData.recipeIngredients.map(r => ({
          inputIngredientId: r.inputIngredientId,
          quantity: parseFloat(r.quantity) || 0,
          unit: r.unit
        }));
      }

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

  const addRecipeIngredient = () => {
    setFormData(prev => ({
      ...prev,
      recipeIngredients: [
        ...prev.recipeIngredients,
        { inputIngredientId: '', quantity: '', unit: 'Kilogramos (kg)' }
      ]
    }));
  };

  const updateRecipeIngredient = (index, field, value) => {
    const newRecipe = [...formData.recipeIngredients];
    newRecipe[index][field] = value;

    // Auto-completar unidad si se selecciona el ingrediente
    if (field === 'inputIngredientId') {
      const selected = ingredients.find(i => i.id === value);
      if (selected) {
        newRecipe[index].unit = selected.unit;
      }
    }

    setFormData({ ...formData, recipeIngredients: newRecipe });
  };

  const removeRecipeIngredient = (index) => {
    const newRecipe = [...formData.recipeIngredients];
    newRecipe.splice(index, 1);
    setFormData({ ...formData, recipeIngredients: newRecipe });
  };

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'raw' | 'manufactured'

  const filteredIngredients = ingredients.filter(ing => {
    if (activeTab === 'raw' && ing.isManufactured) return false;
    if (activeTab === 'manufactured' && !ing.isManufactured) return false;

    const term = searchTerm.toLowerCase();
    return ing.name.toLowerCase().includes(term) || (ing.unit && ing.unit.toLowerCase().includes(term));
  });

  const paginatedIngredients = filteredIngredients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const rawCount = ingredients.filter(i => !i.isManufactured).length;
  const manufacturedCount = ingredients.filter(i => i.isManufactured).length;

  return (
    <div className={styles.invCard}>
      {/* TABS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', padding: '0 1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'all' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            padding: '1rem 0.6rem',
            color: activeTab === 'all' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'all' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.925rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={18} />
          <span>Todos los Insumos</span>
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'all' ? '#e0e7ff' : '#f1f5f9', color: activeTab === 'all' ? '#4338ca' : '#64748b', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>
            {ingredients.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('raw')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'raw' ? '2.5px solid #10b981' : '2.5px solid transparent',
            padding: '1rem 0.6rem',
            color: activeTab === 'raw' ? '#047857' : 'var(--text-muted)',
            fontWeight: activeTab === 'raw' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.925rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <ShoppingCart size={18} />
          <span>Comprados a Proveedor</span>
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'raw' ? '#dcfce7' : '#f1f5f9', color: activeTab === 'raw' ? '#15803d' : '#64748b', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>
            {rawCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manufactured')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'manufactured' ? '2.5px solid #6366f1' : '2.5px solid transparent',
            padding: '1rem 0.6rem',
            color: activeTab === 'manufactured' ? '#4338ca' : 'var(--text-muted)',
            fontWeight: activeTab === 'manufactured' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.925rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <ChefHat size={18} />
          <span>Elaborados en Cocina</span>
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'manufactured' ? '#e0e7ff' : '#f1f5f9', color: activeTab === 'manufactured' ? '#4338ca' : '#64748b', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>
            {manufacturedCount}
          </span>
        </button>
      </div>

      {/* HEADER DE LA BODEGA CON ACCIONES SEGÚN PESTAÑA */}
      <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            {activeTab === 'all' && (
              <>
                <Layers style={{ color: 'var(--primary)' }} size={22} />
                <span>Inventario General de Insumos y Bodega</span>
              </>
            )}
            {activeTab === 'raw' && (
              <>
                <ShoppingCart style={{ color: '#047857' }} size={22} />
                <span>Insumos Comprados a Proveedores</span>
              </>
            )}
            {activeTab === 'manufactured' && (
              <>
                <ChefHat style={{ color: '#4338ca' }} size={22} />
                <span>Elaborados y Subrecetas de Cocina</span>
              </>
            )}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            {activeTab === 'all' && 'Vista integral: conviven los insumos comerciales (salchichas, chorizos, gaseosas) y las preparaciones elaboradas (carnes porcionadas, salsas).'}
            {activeTab === 'raw' && 'Materias primas, empaques, abarrotes y bebidas adquiridas a distribuidores comerciales.'}
            {activeTab === 'manufactured' && 'Preparaciones internas elaboradas a partir de materias primas con costeo automático (CMP).'}
          </p>
        </div>

        {/* BARRA DE HERRAMIENTAS: BUSCADOR A LA IZQUIERDA Y TODOS LOS BOTONES EN LA MISMA LÍNEA A LA DERECHA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* BUSCADOR CON LUPA BIEN POSICIONADA SIN SUPERPOSICIÓN */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '300px', flex: '1 1 240px' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
                zIndex: 2
              }}
            />
            <input
              type="text"
              placeholder="Buscar insumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neo-input neo-search-input"
              style={{
                paddingLeft: '2.35rem',
                paddingRight: '0.75rem',
                height: '38px',
                fontSize: '0.85rem',
                width: '100%',
                backgroundColor: 'var(--bg-subtle, #f8fafc)'
              }}
            />
          </div>

          {/* GRUPO DE BOTONES ALINEADOS EN LA MISMA LÍNEA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="neo-btn neo-btn-success"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.825rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              title="Registrar factura de compra a proveedor"
            >
              <ShoppingCart size={15} />
              <span>Registrar Compra</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/produccion')}
              className="neo-btn"
              style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '0.5rem 0.85rem', fontSize: '0.825rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              title="Ir al módulo de Producción para registrar lotes de cocina"
            >
              <Factory size={15} />
              <span>Ir a Producción</span>
            </button>

            <button
              type="button"
              onClick={() => openModal()}
              className="neo-btn neo-btn-primary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.825rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={15} />
              <span>{activeTab === 'manufactured' ? 'Nueva Subreceta' : 'Nuevo Insumo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLA DE INGREDIENTES */}
      <div className={styles.invTableWrapper}>
        <table className={styles.invTable}>
          <thead>
            <tr>
              <th>Insumo</th>
              <th style={{ textAlign: 'center' }}>Origen</th>
              <th style={{ textAlign: 'center' }}>Unidad de Medida</th>
              <th style={{ textAlign: 'right' }}>Costo Promedio (CMP)</th>
              <th style={{ textAlign: 'right' }}>Stock Actual</th>
              <th style={{ textAlign: 'right' }}>Stock Mínimo</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando materia prima...</td></tr>
            ) : filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Package size={36} style={{ opacity: 0.4 }} />
                    <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>No se encontraron insumos</p>
                    <p style={{ fontSize: '0.75rem', margin: 0 }}>Agrega materias primas o digita una compra para comenzar a registrar inventario.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <button onClick={() => openModal()} className="neo-btn neo-btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                        <Plus size={14} /> Crear Insumo
                      </button>
                      <button onClick={() => setIsPurchaseModalOpen(true)} className="neo-btn neo-btn-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                        <ShoppingCart size={14} /> Registrar Compra
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
                const cost = parseFloat(ing.averageCost || ing.costPerUnit || 0);

                return (
                  <tr key={ing.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {ing.name}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {ing.isManufactured ? (
                        <span className={styles.invBadge} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.72rem' }}>
                          <ChefHat size={12} /> Elaborado
                        </span>
                      ) : (
                        <span className={styles.invBadge} style={{ backgroundColor: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.72rem' }}>
                          <ShoppingCart size={12} /> Comprado
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`${styles.invBadge} ${styles.invBadgeGray}`}>
                        {ing.unit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                      {formatCurrency(cost)}
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
          <div className={`neo-modal ${formData.isManufactured ? 'neo-modal-lg' : 'neo-modal-md'}`}>
            <div className="neo-modal-header">
              <h3 className="neo-modal-title">
                {formData.isManufactured ? (
                  <ChefHat style={{ color: 'var(--primary)' }} size={20} />
                ) : (
                  <Package style={{ color: 'var(--primary)' }} size={20} />
                )}
                {editingId ? 'Editar Insumo' : (formData.isManufactured ? 'Nueva Subreceta / Elaborado' : 'Nuevo Insumo de Bodega')}
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

                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isManufactured"
                    checked={formData.isManufactured}
                    onChange={(e) => setFormData({ ...formData, isManufactured: e.target.checked })}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: '#4f46e5' }}
                  />
                  <label htmlFor="isManufactured" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    Es un Artículo Elaborado (Subreceta)
                  </label>
                </div>

                {formData.isManufactured && (
                  <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>Subreceta de Elaboración</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#3b82f6' }}>Agrega los insumos necesarios para producir 1 unidad (o lote) de este artículo.</p>

                    {formData.recipeIngredients.map((recipeItem, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'end', backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div>
                          <label className="neo-label" style={{ fontSize: '0.75rem' }}>Insumo</label>
                          <CustomSelect
                            value={recipeItem.inputIngredientId}
                            onChange={(val) => updateRecipeIngredient(index, 'inputIngredientId', val)}
                            options={ingredients.filter(i => i.id !== editingId).map(i => ({ value: i.id, label: i.name }))}
                            placeholder="Seleccionar..."
                          />
                        </div>
                        <div>
                          <label className="neo-label" style={{ fontSize: '0.75rem' }}>Cantidad</label>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={recipeItem.quantity}
                              onChange={(e) => updateRecipeIngredient(index, 'quantity', e.target.value)}
                              className="neo-input"
                              style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{recipeItem.unit || ''}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecipeIngredient(index)}
                          className="neo-btn neo-btn-ghost"
                          style={{ padding: '0.4rem', color: '#ef4444' }}
                          title="Eliminar insumo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addRecipeIngredient}
                      className="neo-btn"
                      style={{ backgroundColor: '#dbeafe', color: '#1e40af', border: '1px dashed #93c5fd', marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                      <Plus size={14} /> Agregar Insumo a la Receta
                    </button>
                  </div>
                )}
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
                  {isSubmitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : (formData.isManufactured ? 'Crear Subreceta' : 'Crear Insumo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR COMPRA DIRECTA DESDE BODEGA */}
      <PurchaseForm
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={() => {
          setIsPurchaseModalOpen(false);
          fetchIngredients();
        }}
      />
    </div>
  );
};

export default IngredientsList;