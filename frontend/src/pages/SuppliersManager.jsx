import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Building2, Phone, Mail, MapPin, Search } from 'lucide-react';
import { Pagination } from '../components/ui';
import api from '../services/api';
import styles from './SuppliersManager.module.css';

const SuppliersManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nit: '',
    phone: '',
    email: '',
    address: ''
  });

  // 1. Cargar Proveedores
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchases/suppliers');
      setSuppliers(response.data.data);
    } catch (err) {
      setError('Error al cargar los proveedores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.nit && s.nit.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term))
    );
  });

  // 2. Manejar el Formulario (Crear / Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/purchases/suppliers/${editingId}`, formData);
      } else {
        await api.post('/purchases/suppliers', formData);
      }
      closeModal();
      fetchSuppliers(); // Recargamos la lista
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el proveedor');
    }
  };

  // 3. Eliminar Proveedor
  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/purchases/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el proveedor');
    }
  };

  // Utilidades del Modal
  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        name: supplier.name || '',
        nit: supplier.nit || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', nit: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setError('');
  };

  return (
    <div className={styles.suppliersPage}>
      {/* HEADER */}
      <div className={styles.suppliersHeader}>
        <div>
          <h1 className={styles.suppliersTitle}>
            <Building2 style={{ color: 'var(--primary)' }} />
            Proveedores
          </h1>
          <p className={styles.suppliersSubtitle}>Gestiona tus contactos para compras de inventario</p>
        </div>

        <div className={styles.suppliersControls}>
          <div className={styles.suppliersSearchBox}>
            <span className={styles.suppliersSearchIcon}><Search size={18} /></span>
            <input
              type="text"
              placeholder="Buscar proveedor (nombre, NIT...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.suppliersSearchInput}
            />
          </div>
          <button
            onClick={() => openModal()}
            className="neo-btn neo-btn-primary"
          >
            <Plus size={20} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <div className="neo-table-card">
        <div className="neo-table-responsive">
          <table className="neo-table">
            <thead>
              <tr>
                <th>Nombre / Razón Social</th>
                <th>NIT / Documento</th>
                <th>Contacto</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando proveedores...</td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No se encontraron proveedores</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No hay proveedores registrados o no coinciden con la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((supplier) => (
                  <tr key={supplier.id}>
                    <td style={{ fontWeight: 600 }}>{supplier.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{supplier.nit || '-'}</td>
                    <td>
                      <div className={styles.supplierContactInfo}>
                        {supplier.phone && <div className={styles.supplierContactItem}><Phone size={14} /> {supplier.phone}</div>}
                        {supplier.email && <div className={styles.supplierContactItem}><Mail size={14} /> {supplier.email}</div>}
                        {supplier.address && <div className={styles.supplierContactItem} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><MapPin size={14} /> {supplier.address}</div>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => openModal(supplier)} className="neo-action-icon-btn" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(supplier.id)} className="neo-action-icon-btn danger" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSuppliers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="proveedores"
        />
      </div>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal" style={{ maxWidth: '44rem' }}>
            <div className="neo-modal-header">
              <h2 className="neo-modal-title">
                <Building2 size={20} />
                <span>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
              </h2>
              <button onClick={closeModal} className="neo-modal-close-btn" title="Cerrar">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="neo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}

                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="neo-input"
                    placeholder="Ej. Distribuidora Huila"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">NIT / Documento</label>
                    <input
                      type="text"
                      placeholder="Ej. 900.123.456-7"
                      value={formData.nit}
                      onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Teléfono</label>
                    <input
                      type="text"
                      placeholder="Ej. 312 456 7890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="contacto@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Dirección</label>
                    <input
                      type="text"
                      placeholder="Ej. Av. Siempre Viva 123"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                </div>
              </div>

              <div className="neo-modal-footer">
                <button type="button" onClick={closeModal} className="neo-btn neo-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="neo-btn neo-btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersManager;