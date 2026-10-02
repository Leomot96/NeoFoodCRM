import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Wallet,
  FileText,
  TrendingUp,
  RefreshCw,
  CreditCard,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import Datepicker from "react-tailwindcss-datepicker";
import {
  generateDailyReportPdf,
  generateMonthlyReportPdf,
  generateTurnPdf
} from '../services/reportPdfService';
import styles from './Reportes.module.css';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

const Reportes = () => {
  const [reportType, setReportType] = useState('daily'); // 'daily' | 'monthly'

  // Filtros Diarios
  const todayStr = new Date().toISOString().split('T')[0];
  const [dailyDate, setDailyDate] = useState(todayStr);

  // Filtros Mensuales
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [monthlyYear, setMonthlyYear] = useState(currentYear);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);

  // Datos
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Cargar Reporte Diario
  const loadDailyReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/cash/reports/daily?date=${dailyDate}`);
      if (res.data.success) {
        setDailyData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al cargar el reporte diario.');
    } finally {
      setLoading(false);
    }
  }, [dailyDate]);

  // Cargar Reporte Mensual
  const loadMonthlyReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/cash/reports/monthly?year=${monthlyYear}&month=${monthlyMonth}`);
      if (res.data.success) {
        setMonthlyData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al cargar el reporte mensual.');
    } finally {
      setLoading(false);
    }
  }, [monthlyYear, monthlyMonth]);

  useEffect(() => {
    if (reportType === 'daily') {
      loadDailyReport();
    } else {
      loadMonthlyReport();
    }
  }, [reportType, loadDailyReport, loadMonthlyReport]);

  // Descarga PDF Diario
  const handleExportDailyPdf = () => {
    if (!dailyData) return;
    setIsExporting(true);
    try {
      generateDailyReportPdf(dailyData);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF diario.');
    } finally {
      setIsExporting(false);
    }
  };

  // Descarga PDF Mensual
  const handleExportMonthlyPdf = () => {
    if (!monthlyData) return;
    setIsExporting(true);
    try {
      generateMonthlyReportPdf(monthlyData);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF mensual.');
    } finally {
      setIsExporting(false);
    }
  };

  // Años disponibles para selección
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className={styles.reportesPage}>
      {/* HEADER DE LA PÁGINA */}
      <div className={styles.reportesHeader}>
        <div>
          <h1 className={styles.reportesTitle}>
            <BarChart3 style={{ color: 'var(--primary)' }} /> Reportes de Caja y Ventas
          </h1>
          <p className={styles.reportesSubtitle}>
            Consulta de movimientos históricos, cierres de caja y descarga de informes oficiales en PDF
          </p>
        </div>

        <div className={styles.reportesHeaderActions}>
          {reportType === 'daily' ? (
            <button
              onClick={handleExportDailyPdf}
              disabled={loading || !dailyData || isExporting}
              className="neo-btn neo-btn-primary"
            >
              <Download size={18} />
              <span>{isExporting ? 'Generando PDF...' : 'Descargar Reporte Diario (PDF)'}</span>
            </button>
          ) : (
            <button
              onClick={handleExportMonthlyPdf}
              disabled={loading || !monthlyData || isExporting}
              className="neo-btn neo-btn-primary"
            >
              <Download size={18} />
              <span>{isExporting ? 'Generando PDF...' : 'Descargar Reporte Mensual (PDF)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS DE SELECCIÓN Y BARRA DE FILTROS */}
      <div className={styles.reportesFilterBar}>
        <div className={styles.reportesTabs}>
          <button
            onClick={() => setReportType('daily')}
            className={`${styles.reportesTabBtn} ${reportType === 'daily' ? styles.reportesTabBtnActive : ''}`}
          >
            <Calendar size={16} />
            <span>Reporte Diario</span>
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`${styles.reportesTabBtn} ${reportType === 'monthly' ? styles.reportesTabBtnActive : ''}`}
          >
            <TrendingUp size={16} />
            <span>Reporte Mensual</span>
          </button>
        </div>

        <div className={styles.reportesFilterGroup}>
          {reportType === 'daily' ? (
            <>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Fecha del informe:
              </span>
              <div style={{ width: '13rem', position: 'relative' }}>
                <Datepicker
                  primaryColor="indigo"
                  useRange={false}
                  asSingle={true}
                  value={{ startDate: dailyDate, endDate: dailyDate }}
                  onChange={(newValue) => {
                    if (newValue?.startDate) setDailyDate(newValue.startDate);
                  }}
                  displayFormat="DD/MM/YYYY"
                  placeholder="Seleccionar fecha"
                  inputClassName="neo-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setDailyDate(todayStr)}
                className="neo-btn neo-btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
              >
                Hoy
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Período mensual:
              </span>
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                className={styles.reportesSelect}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(parseInt(e.target.value))}
                className={styles.reportesSelect}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          <button
            type="button"
            onClick={reportType === 'daily' ? loadDailyReport : loadMonthlyReport}
            className="neo-action-icon-btn"
            title="Recargar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '16rem', gap: '1rem' }}>
          <div className="neo-spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Cargando datos del informe...</span>
        </div>
      ) : (
        <>
          {/* ========================================================
              VISTA 1: REPORTE DIARIO
              ======================================================== */}
          {reportType === 'daily' && dailyData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* KPIS DIARIOS */}
              <div className={styles.reportesKpiGrid}>
                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardPrimary}`}>
                  <span className={styles.reportesKpiLabel}>
                    <DollarSign size={14} /> Total Ventas Cobradas
                  </span>
                  <span className={styles.reportesKpiValue}>
                    {formatCurrency(dailyData.metrics?.totalSales)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Todos los métodos de pago</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardSuccess}`}>
                  <span className={styles.reportesKpiLabel}>
                    <ArrowUpCircle size={14} /> Ingresos Manuales
                  </span>
                  <span className={styles.reportesKpiValue} style={{ color: '#16a34a' }}>
                    {formatCurrency(dailyData.metrics?.totalIncomes)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Entradas extra a caja</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardDanger}`}>
                  <span className={styles.reportesKpiLabel}>
                    <ArrowDownCircle size={14} /> Gastos / Retiros
                  </span>
                  <span className={styles.reportesKpiValue} style={{ color: '#dc2626' }}>
                    {formatCurrency(dailyData.metrics?.totalExpenses)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Salidas de efectivo</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardNeutral}`}>
                  <span className={styles.reportesKpiLabel}>
                    <Wallet size={14} /> Flujo Neto en Caja
                  </span>
                  <span className={styles.reportesKpiValue}>
                    {formatCurrency(dailyData.metrics?.netCashFlow)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Ventas + Entradas - Salidas</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardWarning}`}>
                  <span className={styles.reportesKpiLabel}>
                    <Clock size={14} /> Turnos Realizados
                  </span>
                  <span className={styles.reportesKpiValue}>
                    {dailyData.sessionsCount || 0}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Sesiones de caja en la fecha</span>
                </div>
              </div>

              {/* CONTENIDO DIARIO: MÉTODOS Y TURNOS */}
              <div className={styles.reportesContentGrid}>
                {/* Desglose por Métodos */}
                <div className={styles.reportesSectionCard}>
                  <div className={styles.reportesSectionHeader}>
                    <h3 className={styles.reportesSectionTitle}>
                      <CreditCard size={18} /> Métodos de Pago
                    </h3>
                  </div>
                  <div className={styles.reportesSectionBody}>
                    {dailyData.metrics?.salesByMethod && Object.keys(dailyData.metrics.salesByMethod).length > 0 ? (
                      <div className={styles.reportesMethodsList}>
                        {Object.entries(dailyData.metrics.salesByMethod).map(([method, amount]) => {
                          const total = dailyData.metrics.totalSales || 1;
                          const pct = ((amount / total) * 100).toFixed(1);
                          return (
                            <div key={method} className={styles.reportesMethodItem}>
                              <span className={styles.reportesMethodName}>{method}</span>
                              <div className={styles.reportesMethodRight}>
                                <span className={styles.reportesMethodBadge}>{pct}%</span>
                                <span className={styles.reportesMethodAmount}>{formatCurrency(amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>
                        No hay cobros registrados en esta fecha.
                      </p>
                    )}
                  </div>
                </div>

                {/* Lista de Turnos / Sesiones */}
                <div className={styles.reportesSectionCard}>
                  <div className={styles.reportesSectionHeader}>
                    <h3 className={styles.reportesSectionTitle}>
                      <Clock size={18} /> Turnos y Arqueos del Día
                    </h3>
                  </div>
                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="neo-table">
                      <thead>
                        <tr>
                          <th>Turno</th>
                          <th>Cajero</th>
                          <th>Apertura</th>
                          <th>Cierre</th>
                          <th className="text-right">Vendido</th>
                          <th className="text-right">Declarado</th>
                          <th className="text-right">Diferencia</th>
                          <th className="text-center">PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!dailyData.sessions || dailyData.sessions.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                              No se encontraron turnos de caja registrados en esta fecha.
                            </td>
                          </tr>
                        ) : (
                          dailyData.sessions.map((s) => {
                            const diff = s.difference || 0;
                            return (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 800 }}>#{s.id}</td>
                                <td>{s.user?.name || 'Cajero'}</td>
                                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                  {formatDate(s.openedAt).substring(11)}
                                </td>
                                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                  {s.closedAt ? formatDate(s.closedAt).substring(11) : <span style={{ color: 'var(--primary)', fontWeight: 700 }}>En curso</span>}
                                </td>
                                <td className="text-right" style={{ fontWeight: 700 }}>
                                  {formatCurrency(s.totalSales)}
                                </td>
                                <td className="text-right" style={{ fontWeight: 600 }}>
                                  {s.closingAmount !== null ? formatCurrency(s.closingAmount) : '-'}
                                </td>
                                <td className="text-right" style={{ fontWeight: 800, color: diff < 0 ? '#dc2626' : diff > 0 ? '#2563eb' : '#16a34a' }}>
                                  {s.closingAmount !== null ? formatCurrency(diff) : '-'}
                                </td>
                                <td className="text-center">
                                  <button
                                    onClick={() => generateTurnPdf(s)}
                                    className="neo-action-icon-btn"
                                    title="Descargar PDF de este turno"
                                  >
                                    <Download size={16} style={{ color: 'var(--primary)' }} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VISTA 2: REPORTE MENSUAL
              ======================================================== */}
          {reportType === 'monthly' && monthlyData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* KPIS MENSUALES */}
              <div className={styles.reportesKpiGrid}>
                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardPrimary}`}>
                  <span className={styles.reportesKpiLabel}>
                    <DollarSign size={14} /> Total Ventas del Mes
                  </span>
                  <span className={styles.reportesKpiValue}>
                    {formatCurrency(monthlyData.metrics?.totalSales)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>{monthlyData.sessionsCount || 0} turnos registrados</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardSuccess}`}>
                  <span className={styles.reportesKpiLabel}>
                    <ArrowUpCircle size={14} /> Total Entradas Extra
                  </span>
                  <span className={styles.reportesKpiValue} style={{ color: '#16a34a' }}>
                    {formatCurrency(monthlyData.metrics?.totalIncomes)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Ingresos manuales de efectivo</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardDanger}`}>
                  <span className={styles.reportesKpiLabel}>
                    <ArrowDownCircle size={14} /> Total Gastos / Retiros
                  </span>
                  <span className={styles.reportesKpiValue} style={{ color: '#dc2626' }}>
                    {formatCurrency(monthlyData.metrics?.totalExpenses)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Salidas de efectivo en el mes</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardDanger}`}>
                  <span className={styles.reportesKpiLabel}>
                    <AlertCircle size={14} /> Faltantes Totales
                  </span>
                  <span className={styles.reportesKpiValue} style={{ color: '#dc2626' }}>
                    {formatCurrency(monthlyData.metrics?.totalMissing)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Descuadres negativos en cierres</span>
                </div>

                <div className={`${styles.reportesKpiCard} ${styles.reportesKpiCardSuccess}`}>
                  <span className={styles.reportesKpiLabel}>
                    <TrendingUp size={14} /> Sobrantes Totales
                  </span>
                  <span className={styles.reportesKpiValue} style={{ color: '#16a34a' }}>
                    {formatCurrency(monthlyData.metrics?.totalSurplus)}
                  </span>
                  <span className={styles.reportesKpiSubtext}>Descuadres positivos en cierres</span>
                </div>
              </div>

              {/* CONTENIDO MENSUAL */}
              <div className={styles.reportesContentGrid}>
                {/* Desglose por Métodos del Mes */}
                <div className={styles.reportesSectionCard}>
                  <div className={styles.reportesSectionHeader}>
                    <h3 className={styles.reportesSectionTitle}>
                      <CreditCard size={18} /> Métodos de Pago del Mes
                    </h3>
                  </div>
                  <div className={styles.reportesSectionBody}>
                    {monthlyData.metrics?.salesByMethod && Object.keys(monthlyData.metrics.salesByMethod).length > 0 ? (
                      <div className={styles.reportesMethodsList}>
                        {Object.entries(monthlyData.metrics.salesByMethod).map(([method, amount]) => {
                          const total = monthlyData.metrics.totalSales || 1;
                          const pct = ((amount / total) * 100).toFixed(1);
                          return (
                            <div key={method} className={styles.reportesMethodItem}>
                              <span className={styles.reportesMethodName}>{method}</span>
                              <div className={styles.reportesMethodRight}>
                                <span className={styles.reportesMethodBadge}>{pct}%</span>
                                <span className={styles.reportesMethodAmount}>{formatCurrency(amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>
                        No hay cobros registrados en este mes.
                      </p>
                    )}
                  </div>
                </div>

                {/* Historial Día a Día del Mes */}
                <div className={styles.reportesSectionCard}>
                  <div className={styles.reportesSectionHeader}>
                    <h3 className={styles.reportesSectionTitle}>
                      <Calendar size={18} /> Resumen Diario del Mes
                    </h3>
                  </div>
                  <div style={{ overflowX: 'auto', width: '100%', maxHeight: '420px', overflowY: 'auto' }}>
                    <table className="neo-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th className="text-center">Turnos</th>
                          <th className="text-right">Ventas del Día</th>
                          <th className="text-right">Gastos / Retiros</th>
                          <th className="text-right">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!monthlyData.dailyBreakdown || monthlyData.dailyBreakdown.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                              No hay movimientos registrados en este mes.
                            </td>
                          </tr>
                        ) : (
                          monthlyData.dailyBreakdown.map((dayItem) => (
                            <tr key={dayItem.date}>
                              <td style={{ fontWeight: 700 }}>{dayItem.date}</td>
                              <td className="text-center">{dayItem.sessionsCount}</td>
                              <td className="text-right" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                {formatCurrency(dayItem.sales)}
                              </td>
                              <td className="text-right" style={{ color: '#dc2626' }}>
                                {formatCurrency(dayItem.expenses)}
                              </td>
                              <td className="text-right" style={{ fontWeight: 700, color: dayItem.diff < 0 ? '#dc2626' : dayItem.diff > 0 ? '#2563eb' : '#16a34a' }}>
                                {formatCurrency(dayItem.diff)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reportes;
