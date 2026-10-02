import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, DollarSign, FileText, Calendar, User, CreditCard, RefreshCw, Eye, Download, Edit3 } from 'lucide-react';
import Datepicker from "react-tailwindcss-datepicker";
import CustomSelect from '../components/ui/CustomSelect';
import { Pagination } from '../components/ui';
import api from '../services/api'; // Ajusta tu ruta
import { generateInvoicePdf } from '../services/reportPdfService';
import styles from './InvoicesManager.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);

const InvoicesManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('cliente') || '';

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Filtros
  const [filters, setFilters] = useState({
    invoiceNumber: '',
    customerId: initialCustomerId,
    paymentMethodId: '',
    date: { startDate: null, endDate: null }
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Modal de Pago
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [editData, setEditData] = useState({ paymentMethodId: '', date: { startDate: null, endDate: null }, amount: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carga inicial de selectores
  useEffect(() => {
    api.get('/customers').then(res => setCustomers(res.data.data));
    api.get('/sales/payment-methods').then(res => setPaymentMethods((res.data.data || []).filter(pm => pm.isActive !== false)));
  }, []);

  useEffect(() => {
    // Si cambia el ID del cliente en la URL, actualizamos el filtro
    if (initialCustomerId) {
      setFilters(prev => ({ ...prev, customerId: initialCustomerId }));
    }
  }, [initialCustomerId]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      // Pasamos los filtros como query params al backend
      const res = await api.get('/invoices', { params: filters });
      setInvoices(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  // Filtrado local (o puedes conectarlo al backend para que filtre en la base de datos)
  const filteredInvoices = invoices.filter(inv => {
    const matchInvoice = inv.invoiceNumber?.toLowerCase().includes(filters.invoiceNumber.toLowerCase());
    const matchCustomer = filters.customerId ? inv.customerId === filters.customerId : true;
    const matchMethod = filters.paymentMethodId ? inv.paymentMethodId === filters.paymentMethodId : true;
    const matchDate = filters.date?.startDate ? new Date(inv.createdAt).toISOString().split('T')[0] === filters.date.startDate : true;

    return matchInvoice && matchCustomer && matchMethod && matchDate;
  });

  // Manejo de Detalles
  const handleOpenDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsModalOpen(true);
  };

  // ----------------------------------------------------
  // NUEVO: MANEJO DEL CAMBIO MANUAL DE MÉTODO DE PAGO
  // ----------------------------------------------------
  const handleOpenEdit = (invoice) => {
    setSelectedInvoice(invoice);
    // Formatear la fecha para el input type="date"
    const invoiceDate = new Date(invoice.createdAt).toISOString().split('T')[0];

    // Buscar un método de pago por defecto (que no sea crédito)
    const nonCreditMethod = paymentMethods.find(pm => !pm.name.toLowerCase().includes('crédito') && !pm.name.toLowerCase().includes('credito'));

    setEditData({
      paymentMethodId: nonCreditMethod ? nonCreditMethod.id : (invoice.paymentMethodId || ''),
      date: { startDate: invoiceDate, endDate: invoiceDate },
      amount: invoice.finalAmount
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amountToPay = parseFloat(editData.amount);
      const invoiceTotal = parseFloat(selectedInvoice.finalAmount);

      // Abono parcial o total
      await api.put(`/invoices/${selectedInvoice.id}/abono`, {
        amount: amountToPay,
        paymentMethodId: editData.paymentMethodId
      });
      alert(amountToPay >= invoiceTotal
        ? "Factura pagada en su totalidad correctamente."
        : `Abono registrado correctamente. El saldo de la factura ha disminuido a ${formatCurrency(invoiceTotal - amountToPay)}`);

      setIsEditModalOpen(false);
      loadInvoices();
      // Re-cargar clientes para reflejar el nuevo saldo de deuda en los filtros
      api.get('/customers').then(res => setCustomers(res.data.data));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar la factura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // PDF
  // ----------------------------------------------------
  const handleDownloadPDF = (invoice) => {
    generateInvoicePdf(invoice);
  };

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  useEffect(() => {
    api.get('/customers').then(res => setCustomers(res.data.data));
  }, []);

  const totalSum = invoices.reduce((acc, inv) => acc + parseFloat(inv.finalAmount), 0);

  return (
    <div className={styles.invoicesPage}>
      <div className={styles.invoicesHeader}>
        <div>
          <h1 className={styles.invoicesTitle}>
            <FileText style={{ color: 'var(--primary)' }} /> Historial de Facturas
          </h1>
          <p className={styles.invoicesSubtitle}>Consulta de ventas, filtros y abonos directos</p>
        </div>
        <div className={styles.invoicesTotalBox}>
          <p className={styles.invoicesTotalLabel}>Total Filtrado</p>
          <p className={styles.invoicesTotalValue}>{formatCurrency(totalSum)}</p>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className={styles.invoicesFiltersCard}>
        <div className={styles.invoicesFilterCol}>
          <label className={styles.invoicesFilterLabel}><Search size={14} /> Buscar Factura</label>
          <input
            type="text"
            placeholder="Ej: FE-123456"
            value={filters.invoiceNumber}
            onChange={e => setFilters({ ...filters, invoiceNumber: e.target.value })}
            className="neo-input"
          />
        </div>

        <div className={styles.invoicesFilterCol}>
          <label className={styles.invoicesFilterLabel}><User size={14} /> Cliente</label>
          <CustomSelect
            options={[{ value: '', label: 'Todos los clientes' }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
            value={filters.customerId}
            onChange={val => setFilters({ ...filters, customerId: val })}
            placeholder="Todos los clientes"
          />
        </div>

        <div className={styles.invoicesFilterCol}>
          <label className={styles.invoicesFilterLabel}><CreditCard size={14} /> Método de Pago</label>
          <CustomSelect
            options={[{ value: '', label: 'Todos los métodos' }, ...paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))]}
            value={filters.paymentMethodId}
            onChange={val => setFilters({ ...filters, paymentMethodId: val })}
            placeholder="Todos los métodos"
          />
        </div>

        <div className={styles.invoicesFilterCol} style={{ zIndex: 30 }}>
          <label className={styles.invoicesFilterLabel}><Calendar size={14} /> Fecha Exacta</label>
          <div style={{ width: '100%' }}>
            <Datepicker
              primaryColor="indigo"
              useRange={false}
              asSingle={true}
              value={filters.date}
              onChange={newValue => setFilters({ ...filters, date: newValue })}
              displayFormat="DD/MM/YYYY"
              placeholder="Filtrar fecha"
              inputClassName="neo-input"
            />
          </div>
        </div>

        <button
          onClick={() => { setFilters({ invoiceNumber: '', customerId: '', paymentMethodId: '', date: { startDate: null, endDate: null } }); setSearchParams({}); }}
          className="neo-btn neo-btn-secondary"
        >
          Limpiar
        </button>
      </div>

      {/* TABLA DE FACTURAS */}
      <div className="neo-table-card">
        <div className="neo-table-responsive">
          <table className="neo-table">
            <thead>
              <tr>
                <th>Factura / Fecha</th>
                <th>Cliente</th>
                <th>Método de pago</th>
                <th className="text-right">Total</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando facturas...</td></tr>
              ) : filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(invoice => {
                const methodName = invoice.paymentMethod?.name?.toLowerCase() || '';
                const isCredit = methodName.includes('crédito') || methodName.includes('credito') || methodName.includes('fiao') || methodName.includes('Crédito');
                return (
                  <tr key={invoice.id}>
                    <td>
                      <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{invoice.invoiceNumber}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(invoice.createdAt).toLocaleString()}</p>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {invoice.customer?.name || 'Consumidor Final'}
                    </td>
                    <td>
                      <span className={`${styles.badgePayment} ${isCredit ? styles.badgePaymentCredit : styles.badgePaymentCash}`}>
                        {invoice.paymentMethod?.name}
                      </span>
                    </td>
                    <td className="text-right">
                      {isCredit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatCurrency(invoice.totalAmount)}</span>
                          <span style={{ fontWeight: 900, color: parseFloat(invoice.finalAmount) <= 0 ? '#16a34a' : '#dc2626' }}>
                            {parseFloat(invoice.finalAmount) <= 0 ? '✓ Pagada' : formatCurrency(invoice.finalAmount)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(invoice.finalAmount)}</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenDetails(invoice)} className="neo-action-icon-btn" style={{ color: '#2563eb' }} title="Ver Detalles">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleDownloadPDF(invoice)} className="neo-action-icon-btn" title="Descargar PDF">
                          <Download size={18} />
                        </button>
                        {isCredit && (
                          <button onClick={() => handleOpenEdit(invoice)} className="neo-action-icon-btn" style={{ color: '#ea580c' }} title="Cambiar Método de Pago">
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={36} style={{ opacity: 0.5 }} />
                      <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No se encontraron facturas</p>
                      <p style={{ fontSize: '0.75rem' }}>No hay registros de ventas o no coinciden con los filtros aplicados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="facturas"
        />
      </div>

      {/* ------------------------------------------------ */}
      {/* MODAL 1: DETALLES DE LA FACTURA (LO QUE CONSUMIÓ) */}
      {/* ------------------------------------------------ */}
      {isDetailsModalOpen && selectedInvoice && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal neo-modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="neo-modal-header">
              <h2 className="neo-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText style={{ color: 'var(--primary)' }} /> Detalle {selectedInvoice.invoiceNumber}
              </h2>
              <button onClick={() => setIsDetailsModalOpen(false)} className="neo-modal-close-btn" title="Cerrar">✕</button>
            </div>

            <div className="neo-modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              {/* Info General */}
              <div className={styles.invoiceDetailGrid}>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>Cliente:</p>
                  <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedInvoice.customer?.name || 'Consumidor Final'}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>Método de Pago:</p>
                  <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedInvoice.paymentMethod?.name}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>Fecha y Hora:</p>
                  <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Productos Consumidos */}
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Productos Consumidos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedInvoice.details?.length > 0 ? (
                  selectedInvoice.details.map(detail => (
                    <div key={detail.id} className={styles.invoiceProductRow}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>{detail.quantity}x</span>
                        <div>
                          <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{detail.product?.name || 'Producto Eliminado'}</p>

                          {/* Renderizar Variaciones */}
                          {detail.saleDetailVariations && detail.saleDetailVariations.length > 0 && (
                            <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                              <span className={styles.invoiceBadgeVariation}>
                                {detail.saleDetailVariations.map(v => v.name || v.variation?.name).filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}

                          {/* Renderizar Adiciones */}
                          {detail.saleDetailAdditions && detail.saleDetailAdditions.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                              {detail.saleDetailAdditions.map(a => (
                                <span key={a.id} className={styles.invoiceBadgeAddition}>
                                  + {a.name || a.addition?.name || 'Adición'} (x{a.quantity})
                                </span>
                              ))}
                            </div>
                          )}

                          {detail.notes && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>Nota: {detail.notes}</p>}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(detail.subtotal)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>No se encontraron productos en esta factura.</p>
                )}
              </div>

              {/* HISTORIAL DE ABONOS (solo si la factura es/fue a crédito) */}
              {(() => {
                const creditHistory = (selectedInvoice.customerCredits || []);
                if (creditHistory.length === 0) return null;
                const abonosDone = creditHistory.filter(c => c.type === 'PAYMENT');
                const debtEntry = creditHistory.find(c => c.type === 'DEBT');
                const originalDebt = debtEntry ? parseFloat(debtEntry.amount) : parseFloat(selectedInvoice.totalAmount);
                const totalPaid = abonosDone.reduce((s, a) => s + parseFloat(a.amount), 0);
                const remaining = originalDebt - totalPaid;
                const isPaid = remaining <= 0;

                return (
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Historial de Crédito</h3>
                      {isPaid
                        ? <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(22,163,74,0.12)', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '99px' }}>✓ Saldada</span>
                        : <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(220,38,38,0.1)', color: '#dc2626', padding: '0.2rem 0.6rem', borderRadius: '99px' }}>Pendiente {formatCurrency(remaining)}</span>
                      }
                    </div>

                    {/* Barra progreso */}
                    {originalDebt > 0 && (
                      <div style={{ height: '6px', borderRadius: '99px', background: 'var(--border-color)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                        <div style={{ height: '100%', width: `${Math.min((totalPaid / originalDebt) * 100, 100)}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '99px' }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {/* Fila de deuda original */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderLeft: '3px solid #dc2626', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Deuda Inicial</span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{new Date(selectedInvoice.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span style={{ fontWeight: 800, color: '#dc2626' }}>- {formatCurrency(originalDebt)}</span>
                      </div>

                      {/* Abonos realizados */}
                      {abonosDone.map((ab, i) => (
                        <div key={ab.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)', borderLeft: '3px solid #16a34a', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ab.paymentMethod?.name || 'Abono'}</span>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{new Date(ab.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span style={{ fontWeight: 800, color: '#16a34a' }}>+ {formatCurrency(ab.amount)}</span>
                        </div>
                      ))}

                      {/* Saldo final */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Saldo Final</span>
                        <span style={{ color: isPaid ? '#16a34a' : '#dc2626', fontWeight: 900 }}>
                          {isPaid ? '✓ Saldada' : formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="neo-modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Total de la Factura:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(selectedInvoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* MODAL 2: ABONO A CRÉDITOS */}
      {/* ------------------------------------------------ */}
      {isEditModalOpen && selectedInvoice && (() => {
        // Calcular deuda original y saldo pendiente
        const originalDebt = parseFloat(selectedInvoice.totalAmount);
        const currentBalance = parseFloat(selectedInvoice.finalAmount);
        const totalPaid = originalDebt - currentBalance;
        const paidPercent = originalDebt > 0 ? Math.min((totalPaid / originalDebt) * 100, 100) : 0;

        // Historial de abonos ya realizados
        const abonoHistory = (selectedInvoice.customerCredits || []).filter(c => c.type === 'PAYMENT');

        return (
          <div className="neo-modal-backdrop">
            <div className="neo-modal neo-modal-md">
              <div className="neo-modal-header">
                <h2 className="neo-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={18} /> Registrar Abono — Fra. {selectedInvoice.invoiceNumber}
                </h2>
                <button onClick={() => setIsEditModalOpen(false)} className="neo-modal-close-btn" title="Cerrar">✕</button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="neo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* RESUMEN DE LA DEUDA */}
                  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deuda Original</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{formatCurrency(originalDebt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Abonado</span>
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>+ {formatCurrency(totalPaid)}</span>
                    </div>

                    {/* Barra de progreso */}
                    <div style={{ height: '8px', borderRadius: '99px', background: 'var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${paidPercent}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Saldo Pendiente</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: currentBalance <= 0 ? '#16a34a' : 'var(--danger, #dc2626)' }}>
                        {currentBalance <= 0 ? '✓ Pagada' : formatCurrency(currentBalance)}
                      </span>
                    </div>
                  </div>

                  {/* HISTORIAL DE ABONOS PREVIOS */}
                  {abonoHistory.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Abonos Realizados ({abonoHistory.length})
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                        {abonoHistory.map((ab, i) => (
                          <div key={ab.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ab.paymentMethod?.name || 'Efectivo'}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(ab.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#16a34a' }}>+ {formatCurrency(ab.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO DE NUEVO ABONO */}
                  {currentBalance > 0 ? (
                    <>
                      <div className="neo-form-group" style={{ marginBottom: 0 }}>
                        <label className="neo-label">Monto a Abonar</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="1"
                          max={currentBalance}
                          value={editData.amount}
                          onChange={e => setEditData({ ...editData, amount: e.target.value })}
                          className="neo-input"
                          placeholder={`Máx: ${formatCurrency(currentBalance)}`}
                        />
                        {parseFloat(editData.amount) > 0 && parseFloat(editData.amount) < currentBalance && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                            Saldo restante tras este abono: <b style={{ color: 'var(--text-main)' }}>{formatCurrency(currentBalance - parseFloat(editData.amount))}</b>
                          </p>
                        )}
                      </div>

                      <div className="neo-form-group" style={{ marginBottom: 0 }}>
                        <label className="neo-label">Método de Pago del Abono</label>
                        <CustomSelect
                          value={editData.paymentMethodId}
                          onChange={val => setEditData({ ...editData, paymentMethodId: val })}
                          options={paymentMethods
                            .filter(pm => !pm.name.toLowerCase().includes('crédito') && !pm.name.toLowerCase().includes('credito') && !pm.name.toLowerCase().includes('fiao'))
                            .map(pm => ({ value: pm.id, label: pm.name }))}
                        />
                      </div>

                      <div className="neo-form-group" style={{ marginBottom: 0 }}>
                        <label className="neo-label">Fecha (Solo si paga el total)</label>
                        <Datepicker
                          primaryColor="indigo"
                          useRange={false}
                          asSingle={true}
                          value={editData.date}
                          onChange={newValue => setEditData({ ...editData, date: newValue })}
                          displayFormat="DD/MM/YYYY"
                          disabled={parseFloat(editData.amount) < currentBalance}
                          inputClassName="neo-input"
                        />
                      </div>
                    </>
                  ) : (
                    <p style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a', padding: '0.5rem' }}>
                      ✓ Esta factura ya fue pagada en su totalidad.
                    </p>
                  )}
                </div>

                <div className="neo-modal-footer">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="neo-btn neo-btn-secondary">
                    Cerrar
                  </button>
                  {currentBalance > 0 && (
                    <button type="submit" disabled={isSubmitting} className="neo-btn neo-btn-primary">
                      {isSubmitting ? 'Guardando...' : (parseFloat(editData.amount) >= currentBalance ? 'Pagar Totalidad' : 'Registrar Abono')}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InvoicesManager;