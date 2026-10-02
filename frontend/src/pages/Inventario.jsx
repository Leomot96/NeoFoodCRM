import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import ProductForm from '../components/inventory/ProductForm';
import CategoryForm from '../components/inventory/CategoryForm';
import IngredientsList from './Inventory/IngredientsList'; // <-- Importamos la vista de bodega
import { Plus, Edit2, Trash2, Package, AlertTriangle, Layers, Database, ShoppingBag, Store, Image as ImageIcon } from 'lucide-react';
import { Pagination } from '../components/ui';
import { getFullImageUrl } from '../utils/imageUrl';
import styles from './Inventario.module.css';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
};

const Inventario = () => {
  const navigate = useNavigate();
  const { products, categories, loading, error, addProduct, editProduct, removeProduct, addCategory, removeCategory, updatedCategory } = useInventory();

  // Estado para las Pestañas (Tabs)
  const [activeTab, setActiveTab] = useState('products'); // 'products' o 'ingredients'

  // Estados para modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Estados de paginación
  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const pageSize = 6;

  const availableProducts = products.filter(p => p.isAvailable !== false);
  const paginatedProducts = availableProducts.slice((productsPage - 1) * pageSize, productsPage * pageSize);
  const paginatedCategories = categories.slice((categoriesPage - 1) * pageSize, categoriesPage * pageSize);

  const handleOpenProductModal = (product = null) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(false);
  };

  const handleProductSubmit = async (formData) => {
    if (editingProduct) {
      return await editProduct(editingProduct.id, formData);
    } else {
      return await addProduct(formData);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de desactivar el producto: ${name}?`)) {
      await removeProduct(id);
    }
  };

  const handleOpenCategoryModal = (category = null) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(false);
  };

  const handleCategorySubmit = async (formData) => {
    if (editingCategory) {
      return await updatedCategory(editingCategory.id, formData);
    } else {
      await addCategory(formData);
    }

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id, name) => {
    // Verificamos si hay productos usando esta categoría
    const inUse = products.some(p => p.categoryId === id);
    if (inUse) {
      alert(`No puedes eliminar la categoría "${name}" porque tiene productos asignados. Cambia los productos de categoría primero.`);
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar la categoría: ${name}?`)) {
      await removeCategory(id);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '16rem' }}>
        <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-full)', borderBottom: '2px solid var(--primary)', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-lg)', fontWeight: 600 }}>{error}</div>;
  }

  return (
    <div className={styles.invContainer}>

      {/* HEADER PRINCIPAL */}
      <div className={styles.invHeader}>
        <div>
          <h1 className={styles.invTitle}>
            <Package /> Gestión de Inventario y Menú
          </h1>
          <p className={styles.invSubtitle}>Administra tu catálogo de ventas y tu bodega de insumos</p>
        </div>

        {/* Los botones según la pestaña activa */}
        <div className={styles.invHeaderActions}>
          {activeTab === 'products' && (
            <button onClick={() => handleOpenProductModal()} className="neo-btn neo-btn-primary">
              <Plus size={18} /> Nuevo Producto
            </button>
          )}
          {activeTab === 'categories' && (
            <button onClick={() => handleOpenCategoryModal()} className="neo-btn neo-btn-primary">
              <Plus size={18} /> Nueva Categoría
            </button>
          )}
          {activeTab === 'ingredients' && (
            <button onClick={() => navigate('/compras')} className="neo-btn neo-btn-success">
              <Store size={18} /> Digitar Compra
            </button>
          )}
        </div>
      </div>

      {/* SISTEMA DE PESTAÑAS (TABS) */}
      <div className={styles.invTabsBar}>
        <button
          onClick={() => setActiveTab('products')}
          className={`${styles.invTabBtn} ${activeTab === 'products' ? styles.active : ''}`}
        >
          <ShoppingBag size={18} /> Catálogo de Ventas (Productos)
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`${styles.invTabBtn} ${activeTab === 'categories' ? styles.active : ''}`}
        >
          <Layers size={18} /> Categorías
        </button>

        <button
          onClick={() => setActiveTab('ingredients')}
          className={`${styles.invTabBtn} ${activeTab === 'ingredients' ? styles.active : ''}`}
        >
          <Database size={18} /> Bodega (Materia Prima)
        </button>
      </div>

      {/* CONTENIDO DINÁMICO SEGÚN LA PESTAÑA */}
      {activeTab === 'products' && (
        <div className={styles.invCard}>
          <div className={styles.invTableWrapper}>
            <table className={styles.invTable}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio Base</th>
                  <th>Control de Stock</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {product.imageUrl ? (
                          <img
                            src={getFullImageUrl(product.imageUrl)}
                            alt={product.name}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '0.5rem',
                              objectFit: 'cover',
                              border: '1.5px solid var(--border-color, #e2e8f0)',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '0.5rem',
                              backgroundColor: 'var(--bg-subtle, #f8fafc)',
                              border: '1.5px dashed var(--border-color, #cbd5e1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted, #94a3b8)',
                              flexShrink: 0
                            }}
                            title="Sin foto asignada"
                          >
                            <ImageIcon size={18} />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{product.name}</p>
                            {product.isCombo && (
                              <span className={`${styles.invBadge} ${styles.invBadgeAmber}`}>
                                ⭐ Combo
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                            {product.modifiers?.length > 0 && (
                              <span className={`${styles.invBadge} ${styles.invBadgePrimary}`}>
                                {product.modifiers.length} {product.isCombo ? 'paso(s)' : 'variedad(es)'}
                              </span>
                            )}
                            {product.additions?.length > 0 && (
                              <span className={`${styles.invBadge} ${styles.invBadgeEmerald}`}>
                                +{product.additions.length} extras
                              </span>
                            )}
                            {product.description && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {product.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.invBadge} ${styles.invBadgeGray}`}>
                        {product.category?.name || 'Sin Categoría'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                      {formatCurrency(product.price)}
                    </td>
                    <td>
                      {product.isCombo ? (
                        <span className={`${styles.invBadge} ${styles.invBadgeAmber}`}>
                          Combo Multiproducto
                        </span>
                      ) : product.trackStock ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: product.stock <= 5 ? '#ef4444' : '#10b981' }}>
                            {product.stock} unds
                          </span>
                          {product.stock <= 5 && <AlertTriangle size={16} style={{ color: '#ef4444' }} title="Stock Bajo" />}
                        </div>
                      ) : (
                        <span className={`${styles.invBadge} ${styles.invBadgePrimary}`}>
                          Por Receta
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenProductModal(product)}
                          className="neo-btn neo-btn-ghost"
                          style={{ padding: '0.35rem' }}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="neo-btn neo-btn-ghost"
                          style={{ padding: '0.35rem', color: '#ef4444' }}
                          title="Desactivar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {availableProducts.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <ShoppingBag size={36} style={{ opacity: 0.4 }} />
                        <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>No hay productos en el menú</p>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>Registra tus platos, bebidas o combos para comenzar a vender.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={productsPage}
            totalItems={availableProducts.length}
            pageSize={pageSize}
            onPageChange={setProductsPage}
            itemName="productos"
          />
        </div>
      )}

      {activeTab === 'categories' && (
        <div className={styles.invCard}>
          <div className={styles.invTableWrapper}>
            <table className={styles.invTable}>
              <thead>
                <tr>
                  <th>Nombre de Categoría</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((category) => (
                  <tr key={category.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{category.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{category.description || 'Sin descripción'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenCategoryModal(category)} className="neo-btn neo-btn-ghost" style={{ padding: '0.35rem' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteCategory(category.id, category.name)} className="neo-btn neo-btn-ghost" style={{ padding: '0.35rem', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Layers size={36} style={{ opacity: 0.4 }} />
                        <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>No hay categorías registradas</p>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>Crea categorías como Hamburguesas, Bebidas o Entradas para organizar el catálogo.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={categoriesPage}
            totalItems={categories.length}
            pageSize={pageSize}
            onPageChange={setCategoriesPage}
            itemName="categorías"
          />
        </div>
      )}

      {activeTab === 'ingredients' && <IngredientsList />}

      {/* Modales (se mantienen igual) */}
      <ProductForm
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        onSubmit={handleProductSubmit}
        initialData={editingProduct}
        categories={categories}
      />
      <CategoryForm
        isOpen={isCategoryModalOpen}
        onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
        onSubmit={handleCategorySubmit}
        initialData={editingCategory}
      />
    </div>
  );
};

export default Inventario;