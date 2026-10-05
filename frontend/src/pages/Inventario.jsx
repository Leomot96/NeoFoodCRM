import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import ProductForm from '../components/inventory/ProductForm';
import CategoryForm from '../components/inventory/CategoryForm';
import IngredientsList from './Inventory/IngredientsList'; // <-- Importamos la vista de bodega
import CustomSelect from '../components/ui/CustomSelect';
import { Plus, Edit2, Trash2, Package, AlertTriangle, Layers, Database, ShoppingBag, Store, Image as ImageIcon, Search, X } from 'lucide-react';
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

  // Estados de búsqueda y filtros
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // Estados de paginación independientes
  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const productsPageSize = 6;
  const categoriesPageSize = 8;

  const availableProducts = products.filter(p => p.isAvailable !== false);

  // Filtrado reactivo de productos
  const filteredProducts = availableProducts.filter(p => {
    const matchSearch = !productSearchTerm.trim() || 
      p.name.toLowerCase().includes(productSearchTerm.toLowerCase().trim()) ||
      (p.description && p.description.toLowerCase().includes(productSearchTerm.toLowerCase().trim())) ||
      (p.category?.name && p.category.name.toLowerCase().includes(productSearchTerm.toLowerCase().trim()));
    const matchCategory = productCategoryFilter === 'ALL' || p.categoryId === productCategoryFilter;
    return matchSearch && matchCategory;
  });
  const paginatedProducts = filteredProducts.slice((productsPage - 1) * productsPageSize, productsPage * productsPageSize);

  // Filtrado reactivo de categorías
  const filteredCategories = categories.filter(c => {
    if (!categorySearchTerm.trim()) return true;
    const term = categorySearchTerm.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.description && c.description.toLowerCase().includes(term))
    );
  });
  const paginatedCategories = filteredCategories.slice((categoriesPage - 1) * categoriesPageSize, categoriesPage * categoriesPageSize);

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
          {/* BARRA DE BÚSQUEDA Y FILTRO DE PRODUCTOS */}
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
                  placeholder="Buscar producto por nombre o descripción..."
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setProductsPage(1);
                  }}
                  className="neo-input neo-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ minWidth: '200px' }}>
                <CustomSelect
                  value={productCategoryFilter}
                  onChange={(val) => {
                    setProductCategoryFilter(val);
                    setProductsPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Todas las Categorías' },
                    ...categories.map(c => ({ value: c.id, label: c.name }))
                  ]}
                  placeholder="Filtrar por categoría..."
                />
              </div>

              {(productSearchTerm || productCategoryFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearchTerm('');
                    setProductCategoryFilter('ALL');
                    setProductsPage(1);
                  }}
                  className="neo-btn neo-btn-ghost text-xs"
                  style={{ padding: '0.4rem 0.75rem' }}
                >
                  <X size={14} /> Limpiar filtros
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
            </div>
          </div>

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
                          ⭐ Combo Multiproducto
                        </span>
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
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <ShoppingBag size={36} style={{ opacity: 0.4 }} />
                        <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                          {productSearchTerm || productCategoryFilter !== 'ALL'
                            ? 'No se encontraron productos con los filtros aplicados'
                            : 'No hay productos en el menú'}
                        </p>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>
                          {productSearchTerm || productCategoryFilter !== 'ALL'
                            ? 'Prueba modificando la búsqueda o seleccionando otra categoría.'
                            : 'Registra tus platos, bebidas o combos para comenzar a vender.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={productsPage}
            totalItems={filteredProducts.length}
            pageSize={productsPageSize}
            onPageChange={setProductsPage}
            itemName="productos"
          />
        </div>
      )}

      {activeTab === 'categories' && (
        <div className={styles.invCard}>
          {/* BARRA DE BÚSQUEDA DE CATEGORÍAS */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '380px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
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
                  placeholder="Buscar categoría..."
                  value={categorySearchTerm}
                  onChange={(e) => {
                    setCategorySearchTerm(e.target.value);
                    setCategoriesPage(1);
                  }}
                  className="neo-input neo-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              {categorySearchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setCategorySearchTerm('');
                    setCategoriesPage(1);
                  }}
                  className="neo-btn neo-btn-ghost text-xs"
                  style={{ padding: '0.4rem 0.75rem' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
              {filteredCategories.length} {filteredCategories.length === 1 ? 'categoría encontrada' : 'categorías encontradas'}
            </div>
          </div>

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
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Layers size={36} style={{ opacity: 0.4 }} />
                        <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                          {categorySearchTerm ? 'No se encontraron categorías coincidentes' : 'No hay categorías registradas'}
                        </p>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>
                          {categorySearchTerm ? 'Intenta con otro término de búsqueda.' : 'Crea categorías como Hamburguesas, Bebidas o Entradas para organizar el catálogo.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={categoriesPage}
            totalItems={filteredCategories.length}
            pageSize={categoriesPageSize}
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