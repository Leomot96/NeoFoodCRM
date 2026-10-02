import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, User, Search, DollarSign, Clock, FileText, X } from 'lucide-react';
import Datepicker from "react-tailwindcss-datepicker";
import { Pagination } from '../components/ui';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import styles from './CustomersManager.module.css';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
};

const CustomersManager = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]); // Para cargar los métodos (Efectivo, Nequi...)
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerForCredit, setSelectedCustomerForCredit] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [historyFilterInvoice, setHistoryFilterInvoice] = useState('');
  const [historyFilterDate, setHistoryFilterDate] = useState({ startDate: null, endDate: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formularios
  const [formData, setFormData] = useState({ name: '', document: '', email: '', phone: '', address: '' });
  const [paymentData, setPaymentData] = useState({ amount: '', paymentMethodId: '', description: 'Abono a cuenta' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, payRes] = await Promise.all([
        api.get('/customers'),
        api.get('/sales/payment-methods') // Ajusta esta ruta si la tienes diferente
      ]);
      setCustomers(custRes.data.data);
      setPaymentMethods((payRes.data.data || []).filter(pm => pm.isActive !== false));
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.document && c.document.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  });

  const filteredCreditHistory = creditHistory.filter(move => {
    let matchInvoice = true;
    let matchDate = true;

    if (historyFilterInvoice.trim() !== '') {
      const invoiceNumber = move.sale?.invoiceNumber || '';
      matchInvoice = String(invoiceNumber).toLowerCase().includes(historyFilterInvoice.trim().toLowerCase());
    }

    if (historyFilterDate?.startDate) {
      const dateOnly = new Date(move.createdAt).toISOString().split('T')[0];
      matchDate = dateOnly === historyFilterDate.startDate;
    }

    return matchInvoice && matchDate;
  });

  // ==========================================
  // MANEJO DE CLIENTES (CRUD BÁSICO)
  // ==========================================
  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || '', document: customer.document || '',
        email: customer.email || '', phone: customer.phone || '', address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', document: '', email: '', phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCustomer) await api.put(`/customers/${editingCustomer.id}`, formData);
      else await api.post('/customers', formData);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar a: ${name}?`)) {
      try {
        await api.delete(`/customers/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || 'Error: Cliente tiene facturas o créditos asociados.');
      }
    }
  };

  // ==========================================
  // MANEJO DEL ESTADO DE CUENTA (CRÉDITOS)
  // ==========================================
  const handleOpenCreditModal = async (customer) => {
    setSelectedCustomerForCredit(customer);
    setIsCreditModalOpen(true);
    setHistoryFilterInvoice('');
    setHistoryFilterDate({ startDate: null, endDate: null });

    // Cargar historial de ese cliente
    try {
      const res = await api.get(`/customers/${customer.id}/credits`);
      setCreditHistory(res.data.data);
    } catch (err) {
      console.error("Error cargando historial de crédito", err);
    }
  };

  return (
    <div className={styles.customersPage}>
      {/* HEADER Y BUSCADOR */}
      <div className={styles.customersHeader}>
        <div>
          <h1 className={styles.customersTitle}>
            <Users style={{ color: 'var(--primary)' }} /> Clientes y Créditos
          </h1>
          <p className={styles.customersSubtitle}>Base de datos y estado de cuenta (fiados)</p>
        </div>

        <div className={styles.customersControls}>
          <div className={styles.customersSearchBox}>
            <span className={styles.customersSearchIcon}><Search size={18} /></span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.customersSearchInput}
            />
          </div>
          <button onClick={() => handleOpenModal()} className="neo-btn neo-btn-primary">
            <Plus size={20} /> Nuevo
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="neo-table-card">
        <div className="neo-table-responsive">
          <table className="neo-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th className="text-right">Saldo Deuda</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando clientes...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={36} style={{ opacity: 0.5 }} />
                      <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No se encontraron clientes</p>
                      <p style={{ fontSize: '0.75rem' }}>No hay clientes registrados o no coinciden con la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(customer => {
                  const balance = parseFloat(customer.balance || 0);
                  return (
                    <tr key={customer.id}>
                      <td>
                        <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{customer.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.document || 'Sin documento'}</p>
                      </td>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{customer.phone || 'Sin teléfono'}</p>
                      </td>
                      <td className="text-right">
                        {balance > 0 ? (
                          <span className={styles.badgeDebt}>
                            {formatCurrency(balance)}
                          </span>
                        ) : (
                          <span className={styles.badgeClear}>Al día</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenCreditModal(customer)}
                            className="neo-action-icon-btn"
                            style={{ color: '#2563eb' }}
                            title="Ver Estado de Cuenta (Historial de Abonos)"
                          >
                            <Clock size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/facturas?cliente=${customer.id}`)}
                            className="neo-action-icon-btn"
                            style={{ color: '#059669' }}
                            title="Ver Facturas del Cliente"
                          >
                            <FileText size={18} />
                          </button>
                          <button onClick={() => handleOpenModal(customer)} className="neo-action-icon-btn" title="Editar">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(customer.id, customer.name)} className="neo-action-icon-btn danger" title="Eliminar">
                            <Trash2 size={18} />
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
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="clientes"
        />
      </div>

      {/* MODAL: ESTADO DE CUENTA Y ABONOS */}
      {isCreditModalOpen && selectedCustomerForCredit && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal neo-modal-lg" style={{ minHeight: '540px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            <div className={styles.creditModalHeader}>
              <div className={styles.creditModalTop}>
                <h2 className="neo-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText style={{ color: '#818cf8' }} /> Estado de Cuenta
                </h2>
                <button onClick={() => setIsCreditModalOpen(false)} className="neo-modal-close-btn" title="Cerrar">✕</button>
              </div>
              <div className={styles.creditModalSummary}>
                <div>
                  <p style={{ fontWeight: 700, color: '#ffffff', margin: 0 }}>{selectedCustomerForCredit.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', margin: '0.2rem 0 0 0' }}>Documento: {selectedCustomerForCredit.document || 'N/A'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 0.15rem 0' }}>Deuda Total</p>
                  <p className={styles.creditModalDebtValue} style={{ margin: 0 }}>{formatCurrency(selectedCustomerForCredit.balance)}</p>
                </div>
              </div>
            </div>

            {/* Filtros fijos */}
            <div className={styles.creditFiltersBar}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} /> Historial
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar Factura..."
                  className="neo-input"
                  style={{ width: '140px', padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
                  value={historyFilterInvoice}
                  onChange={e => setHistoryFilterInvoice(e.target.value)}
                />
                <div style={{ width: '190px' }}>
                  <Datepicker
                    primaryColor="indigo"
                    useRange={false}
                    asSingle={true}
                    value={historyFilterDate}
                    onChange={newValue => setHistoryFilterDate(newValue)}
                    displayFormat="DD/MM/YYYY"
                    placeholder="Filtrar fecha"
                    inputClassName="neo-input"
                  />
                </div>
                {(historyFilterInvoice || historyFilterDate?.startDate) && (
                  <button
                    onClick={() => { setHistoryFilterInvoice(''); setHistoryFilterDate({ startDate: null, endDate: null }); }}
                    className="neo-action-icon-btn danger"
                    title="Limpiar filtros"
                    style={{ alignSelf: 'center' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Historial (Kardex) scrollable */}
            <div className={styles.creditHistoryContainer}>
              {filteredCreditHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={36} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>No hay movimientos que coincidan con la búsqueda</p>
                  <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Prueba seleccionando otra fecha o limpiando el filtro.</p>
                </div>
              ) : (
                filteredCreditHistory.map(move => (
                  <div key={move.id} className={styles.creditHistoryItem}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>{move.description}</p>
                      {move.sale?.invoiceNumber && (
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>Factura #{move.sale.invoiceNumber}</p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(move.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={move.type === 'DEBT' ? styles.creditMoveDebt : styles.creditMovePayment}>
                      {move.type === 'DEBT' ? '+' : '-'} {formatCurrency(move.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Nota: Para registrar un nuevo abono, dirígete al panel de Facturas.
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRUD BÁSICO (Crear/Editar) */}
      {isModalOpen && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal" style={{ maxWidth: '44rem' }}>
            <div className="neo-modal-header">
              <h2 className="neo-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User style={{ color: 'var(--primary)' }} /> {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="neo-modal-close-btn" title="Cerrar">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="neo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">Nombre Completo *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="neo-input"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Documento (CC/NIT)</label>
                    <input
                      type="text"
                      placeholder="Ej. 1075234567"
                      value={formData.document}
                      onChange={e => setFormData({ ...formData, document: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Teléfono</label>
                    <input
                      type="tel"
                      placeholder="Ej. 312 456 7890"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Dirección</label>
                    <input
                      type="text"
                      placeholder="Ej. Calle 10 # 5-23"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                </div>
              </div>

              <div className="neo-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="neo-btn neo-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="neo-btn neo-btn-primary">
                  {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersManager;
