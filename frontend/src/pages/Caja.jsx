import React, { useState } from 'react';
import { useCash } from '../hooks/useCash';
import MovementModal from '../components/cash/MovementModal';
import { Pagination } from '../components/ui';
import { Wallet, Unlock, Lock, ArrowUpCircle, ArrowDownCircle, Eye, EyeOff, ChevronDown, ChevronUp, CreditCard, DollarSign, Download, ListChecks, ShoppingCart, HandCoins } from 'lucide-react';
import api from '../services/api';
import { generateTurnPdf, generateDailyReportPdf } from '../services/reportPdfService';
import styles from './Caja.module.css';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
};

const Caja = () => {
  const { sessions, activeSession, loading, error, openCash, closeCash, addMovement } = useCash();

  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'IN' });
  const [actionError, setActionError] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);

  const [showExpected, setShowExpected] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [sessionPage, setSessionPage] = useState(1);
  const pageSize = 2;

  const handleDownloadTodayReport = async () => {
    try {
      setDownloadingReport(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get(`/cash/reports/daily?date=${todayStr}`);
      if (res.data.success && res.data.data) {
        generateDailyReportPdf(res.data.data);
      } else {
        alert('No se pudo generar el reporte diario.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al obtener el reporte diario.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleOpenCash = async (e) => {
    e.preventDefault();
    setActionError('');
    const result = await openCash(parseFloat(openingAmount));
    if (!result.success) setActionError(result.message);
    else setOpeningAmount('');
  };

  const handleCloseCash = async (e) => {
    e.preventDefault();
    setActionError('');
    if (window.confirm('¿Está seguro de cerrar la caja? Asegúrese de contar solo el EFECTIVO físico. Esta acción no se puede deshacer.')) {
      const result = await closeCash(parseFloat(closingAmount));
      if (!result.success) setActionError(result.message);
      else {
        setClosingAmount('');
        setShowExpected(false);
      }
    }
  };

  const toggleSessionDetails = (id) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  // ==========================================
  // LÓGICA DE CÁLCULO PARA EL RESUMEN
  // ==========================================
  let totalVendido = activeSession?.totalSales || 0;
  let ventasPorMetodo = activeSession?.salesByMethod || {};


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '16rem' }}>
        <div className="neo-spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
      </div>
    );
  }

  return (
    <div className={styles.cajaPage}>

      <div className={styles.cajaHeader}>
        <div>
          <h1 className={styles.cajaTitle}>
            <Wallet style={{ color: 'var(--primary)' }} /> Control de Caja
          </h1>
          <p className={styles.cajaSubtitle}>Aperturas, cierres y resumen de ventas del turno</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadTodayReport}
            disabled={downloadingReport}
            className="neo-btn neo-btn-secondary"
            title="Descargar reporte diario consolidado en PDF"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.85rem' }}
          >
            <Download size={16} />
            <span>{downloadingReport ? 'Generando PDF...' : 'Reporte Diario (PDF)'}</span>
          </button>
          <div className={`${styles.cajaStatusBadge} ${activeSession ? styles.cajaStatusBadgeOpen : styles.cajaStatusBadgeClosed}`}>
            {activeSession ? <Unlock size={18} /> : <Lock size={18} />}
            ESTADO: {activeSession ? 'ABIERTA' : 'CERRADA'}
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>{error}</div>}
      {actionError && <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>{actionError}</div>}

      <div className={styles.cajaGrid}>

        {/* PANEL IZQUIERDO: ACCIONES */}
        {!activeSession ? (
          <div className={styles.cajaCard}>
            <h2 className={styles.cajaCardTitle}>Apertura de Turno</h2>
            <form onSubmit={handleOpenCash} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="neo-form-group" style={{ marginBottom: 0 }}>
                <label className="neo-label">Base Inicial en Efectivo ($)</label>
                <input
                  type="number" step="0.01" required value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
                  className="neo-input"
                  style={{ fontSize: '1.25rem', fontWeight: 700 }}
                  placeholder="Ej: 100000"
                />
              </div>
              <button type="submit" className="neo-btn neo-btn-primary" style={{ padding: '0.85rem', width: '100%', justifyContent: 'center' }}>
                <Unlock size={20} /> Abrir Caja
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={styles.cajaCard}>
              <h2 className={styles.cajaCardTitle}>Movimientos de Efectivo</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Úselo solo para pagos a proveedores, retiros o ingresos en billetes.</p>
              <div className={styles.cajaMovementGrid}>
                <button onClick={() => setModalConfig({ isOpen: true, type: 'IN' })} className={`${styles.cajaBtnMovement} ${styles.cajaBtnMovementIn}`}>
                  <ArrowUpCircle size={32} /> Ingreso
                </button>
                <button onClick={() => setModalConfig({ isOpen: true, type: 'OUT' })} className={`${styles.cajaBtnMovement} ${styles.cajaBtnMovementOut}`}>
                  <ArrowDownCircle size={32} /> Retiro
                </button>
              </div>
            </div>

            <div className={styles.cajaCard}>
              <h2 className={styles.cajaCardTitle}>Cierre de Turno</h2>
              <form onSubmit={handleCloseCash} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">Efectivo Físico Contado ($)</label>
                  <input
                    type="number" step="0.01" required value={closingAmount} onChange={e => setClosingAmount(e.target.value)}
                    className="neo-input"
                    style={{ fontSize: '1.25rem', fontWeight: 700 }}
                    placeholder="Sume solo los billetes y monedas"
                  />
                </div>
                <button type="submit" className="neo-btn neo-btn-danger" style={{ padding: '0.85rem', width: '100%', justifyContent: 'center' }}>
                  <Lock size={20} /> Cerrar Caja
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PANEL DERECHO: HISTORIAL / RESUMEN */}
        <div className={styles.cajaCard} style={{ height: '100%' }}>
          {activeSession ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={styles.cajaCardTitle} style={{ margin: 0 }}>
                Resumen Turno Actual
              </h2>
              <button
                onClick={() => generateTurnPdf(activeSession)}
                className="neo-btn neo-btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                title="Descargar reporte de este turno en PDF"
              >
                <Download size={14} />
                <span>PDF Turno</span>
              </button>
            </div>
          ) : (
            <h2 className={styles.cajaCardTitle}>
              Últimas Sesiones
            </h2>
          )}

          {activeSession ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>

              {/* BLOQUE 1: TOTAL DE VENTAS (INFORMATIVO) */}
              <div className={styles.cajaSummaryBlock}>
                <div className={styles.cajaSummaryRow}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <DollarSign size={18} /> Total Cobrado Hoy:
                  </span>
                  <span className={styles.cajaTotalSold}>{formatCurrency(totalVendido)}</span>
                </div>

                {/* Desglose de Ventas */}
                <div className={styles.cajaBreakdownList}>
                  {Object.entries(ventasPorMetodo).map(([metodo, valor]) => (
                    <div key={metodo} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• {metodo}:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(valor)}</span>
                    </div>
                  ))}
                  {Object.keys(ventasPorMetodo).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>Aún no hay ventas registradas.</p>
                  )}
                </div>
              </div>

              {/* BLOQUE 2: EFECTIVO ESPERADO (LO QUE IMPORTA PARA EL CUADRE) */}
              <div className={styles.cajaExpectedBox}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Efectivo Esperado en Gaveta</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base + Ventas Efectivo ± Movimientos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={styles.cajaExpectedValue}>
                    {showExpected ? formatCurrency(activeSession.expectedCash) : '*********'}
                  </span>
                  <button
                    onClick={() => setShowExpected(!showExpected)}
                    className="neo-action-icon-btn"
                    title={showExpected ? "Ocultar" : "Mostrar"}
                  >
                    {showExpected ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* BLOQUE 3: MOVIMIENTOS EXTRA DE EFECTIVO */}
              {activeSession.cashMovements && activeSession.cashMovements.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Movimientos de Efectivo Extra
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeSession.cashMovements.map(mov => (
                      <div key={mov.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{mov.description}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(mov.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: mov.type === 'IN' ? '#16a34a' : '#dc2626' }}>
                          {mov.type === 'IN' ? '+' : '-'} {formatCurrency(mov.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOQUE 4: MINI HISTORIAL UNIFICADO */}
              {(() => {
                const events = [];

                // Ventas (no crédito)
                if (activeSession.sales) {
                  activeSession.sales.forEach(sale => {
                    const methodName = sale.paymentMethod?.name || '';
                    const isCredit = methodName.toLowerCase().includes('crédit') || methodName.toLowerCase().includes('credit') || methodName.toLowerCase().includes('fiao');
                    events.push({
                      id: sale.id,
                      type: isCredit ? 'credit_sale' : 'sale',
                      label: isCredit ? `Venta a Crédito — Fra. ${sale.invoiceNumber || ''}` : `Venta — Fra. ${sale.invoiceNumber || ''}`,
                      sub: methodName,
                      amount: parseFloat(sale.finalAmount),
                      sign: isCredit ? null : '+',
                      color: isCredit ? '#f59e0b' : '#16a34a',
                      date: new Date(sale.createdAt),
                    });
                  });
                }

                // Abonos recibidos
                if (activeSession.customerCredits) {
                  activeSession.customerCredits.filter(c => c.type === 'PAYMENT').forEach(ab => {
                    events.push({
                      id: ab.id,
                      type: 'abono',
                      label: ab.description || 'Abono a Factura',
                      sub: ab.paymentMethod?.name || '',
                      amount: parseFloat(ab.amount),
                      sign: '+',
                      color: '#6366f1',
                      date: new Date(ab.createdAt),
                    });
                  });
                }

                // Movimientos manuales de efectivo
                if (activeSession.cashMovements) {
                  activeSession.cashMovements
                    .filter(m => !m.description?.startsWith('Abono') && !m.description?.startsWith('Pago Factura'))
                    .forEach(mov => {
                      events.push({
                        id: mov.id,
                        type: mov.type === 'IN' ? 'mov_in' : 'mov_out',
                        label: mov.description,
                        sub: mov.type === 'IN' ? 'Ingreso Manual' : 'Retiro Manual',
                        amount: parseFloat(mov.amount),
                        sign: mov.type === 'IN' ? '+' : '-',
                        color: mov.type === 'IN' ? '#0ea5e9' : '#ef4444',
                        date: new Date(mov.createdAt),
                      });
                    });
                }

                if (events.length === 0) return null;

                // Ordenar desc, mostrar max 30
                events.sort((a, b) => b.date - a.date);
                const recent = events.slice(0, 30);

                return (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ListChecks size={14} /> Actividad del Turno ({events.length} mov.)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto' }}>
                      {recent.map(ev => (
                        <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-subtle)', border: `1px solid var(--border-color)`, borderLeft: `3px solid ${ev.color}`, borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{ev.label}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ev.sub} • {ev.date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span style={{ fontWeight: 800, color: ev.color, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                            {ev.sign} {formatCurrency(ev.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sessions.slice((sessionPage - 1) * pageSize, sessionPage * pageSize).map(session => {
                const dif = session.closingAmount ? parseFloat(session.closingAmount) - session.expectedCash : 0;
                const isExpanded = expandedSessionId === session.id;

                return (
                  <div key={session.id} className={styles.cajaSessionCard}>
                    {/* ENCABEZADO DE LA SESIÓN CERRADA */}
                    <div style={{ padding: '1rem' }}>
                      <div className={styles.cajaSessionHeader}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {new Date(session.openedAt).toLocaleDateString()} - {new Date(session.openedAt).toLocaleTimeString()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateTurnPdf(session);
                            }}
                            className="neo-action-icon-btn"
                            title="Descargar Arqueo de Turno en PDF"
                            style={{ padding: '0.3rem 0.5rem' }}
                          >
                            <Download size={15} style={{ color: 'var(--primary)' }} />
                          </button>
                          <span className={`${styles.cajaStatusBadge} ${session.status === 'OPEN' ? styles.cajaStatusBadgeOpen : styles.cajaStatusBadgeClosed}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                            {session.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.08)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Total Vendido en Turno:</span>
                          <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(session.totalSales || 0)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Esperado en Gaveta (Solo Efectivo):</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(session.expectedCash)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Cierre Físico Declarado:</span>
                          <span style={{ fontWeight: 600 }}>{session.closingAmount ? formatCurrency(session.closingAmount) : 'N/A'}</span>
                        </div>

                        {session.closingAmount !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontWeight: 700, color: dif < 0 ? '#dc2626' : dif > 0 ? '#2563eb' : '#16a34a' }}>
                            <span>{dif < 0 ? 'FALTANTE' : dif > 0 ? 'SOBRANTE' : 'CUADRE EXACTO'}:</span>
                            <span>{formatCurrency(dif)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSessionDetails(session.id)}
                      className={styles.cajaSessionToggleBtn}
                    >
                      {isExpanded ? <><ChevronUp size={16} /> Ocultar Detalles</> : <><ChevronDown size={16} /> Ver Desglose de Métodos y Movimientos</>}
                    </button>

                    {/* DETALLES EXPANDIDOS */}
                    {isExpanded && (
                      <div className={styles.cajaSessionDetails}>

                        {/* SECCIÓN 1: DESGLOSE DE VENTAS */}
                        <div style={{ marginBottom: '1rem' }}>
                          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={14} /> Desglose de Ventas
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>
                            {session.salesByMethod && Object.entries(session.salesByMethod).length > 0 ? (
                              Object.entries(session.salesByMethod).map(([metodo, valor]) => (
                                <div key={metodo} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>• {metodo}:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(valor)}</span>
                                </div>
                              ))
                            ) : (
                              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>No hubo ventas registradas en este turno.</p>
                            )}
                          </div>
                        </div>

                        {/* SECCIÓN 2: DATOS DE APERTURA */}
                        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Base Inicial en Caja:</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(session.openingAmount)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Cajero a cargo:</span>
                            <span style={{ fontWeight: 600 }}>{session.user?.name || 'Usuario'}</span>
                          </div>
                        </div>

                        {/* SECCIÓN 3: MOVIMIENTOS EXTRA */}
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-color)' }}>
                          Movimientos Extra (Entradas/Salidas)
                        </h4>
                        {session.cashMovements && session.cashMovements.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {session.cashMovements.map(mov => (
                              <div key={mov.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{mov.description}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(mov.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <span style={{ fontWeight: 700, color: mov.type === 'IN' ? '#16a34a' : '#dc2626' }}>
                                  {mov.type === 'IN' ? '+' : '-'} {formatCurrency(mov.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                            No se registraron movimientos manuales extra.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Wallet size={36} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No hay historial de caja</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Abre la caja en el panel izquierdo para registrar tu primer turno.</p>
                </div>
              )}
              <Pagination
                currentPage={sessionPage}
                totalItems={sessions.length}
                pageSize={pageSize}
                onPageChange={setSessionPage}
                itemName="turnos de caja"
              />
            </div>
          )}
        </div>
      </div>

      <MovementModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onSubmit={addMovement}
      />
    </div>
  );
};

export default Caja;