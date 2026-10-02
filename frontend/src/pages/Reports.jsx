import React, { useState } from 'react';
import api from '../api/axios';
import { Download, FileText, FileSpreadsheet, Search, RefreshCw } from 'lucide-react';
import Datepicker from "react-tailwindcss-datepicker";
import CustomSelect from '../components/ui/CustomSelect';
import { Pagination } from '../components/ui';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import styles from './Reports.module.css';

const Reports = () => {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const reportOptions = [
    { value: 'sales', label: 'Ventas y Ganancias' },
    { value: 'purchases', label: 'Compras a Proveedores' },
    { value: 'inventory', label: 'Valor del Inventario Actual' },
    { value: 'cash', label: 'Sesiones y Arqueos de Caja' },
    { value: 'top-products', label: 'Productos Más Vendidos' },
    { value: 'top-customers', label: 'Clientes Frecuentes' },
  ];

  const fetchReport = async () => {
    if (reportType !== 'inventory' && (!dateRange.startDate || !dateRange.endDate)) {
      setError('Por favor selecciona las fechas de inicio y fin.');
      return;
    }
    setError(null);
    setLoading(true);
    setCurrentPage(1);
    try {
      const response = await api.get(`/reports/data`, {
        params: { type: reportType, startDate: dateRange.startDate, endDate: dateRange.endDate }
      });
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  // Configurador dinámico de Columnas según el reporte seleccionado
  const getTableConfig = () => {
    switch (reportType) {
      case 'sales':
        return {
          headers: ['Factura', 'Fecha', 'Cliente', 'Método', 'Costo', 'Total', 'Ganancia'],
          mapRow: (row) => [
            row.invoice, 
            new Date(row.date).toLocaleDateString(), 
            row.customer, 
            row.method, 
            `$${row.cost.toLocaleString()}`, 
            `$${row.amount.toLocaleString()}`, 
            `$${row.profit.toLocaleString()}`
          ]
        };
      case 'purchases':
        return {
          headers: ['Factura', 'Fecha', 'Proveedor', 'Estado', 'Costo Total'],
          mapRow: (row) => [
            row.invoice, 
            new Date(row.date).toLocaleDateString(), 
            row.supplier, 
            row.status, 
            `$${row.totalCost.toLocaleString()}`
          ]
        };
      case 'inventory':
        return {
          headers: ['Nombre', 'Tipo', 'Stock', 'Unidad', 'Costo Unit.', 'Valor Total'],
          mapRow: (row) => [
            row.name, 
            row.type, 
            row.stock, 
            row.unit, 
            `$${row.unitCost.toLocaleString()}`, 
            `$${row.totalValue.toLocaleString()}`
          ]
        };
      case 'cash':
        return {
          headers: ['Fecha Apertura', 'Cajero', 'Estado', 'Base', 'Cierre', 'Diferencia (Arqueo)'],
          mapRow: (row) => [
            new Date(row.date).toLocaleString(), 
            row.user, 
            row.status, 
            `$${row.opening.toLocaleString()}`, 
            `$${row.closing.toLocaleString()}`, 
            `$${row.difference.toLocaleString()} (${row.audited})`
          ]
        };
      case 'top-products':
        return {
          headers: ['Producto', 'Cantidad Vendida', 'Ingresos Generados'],
          mapRow: (row) => [
            row.productName, 
            row.quantitySold, 
            `$${row.revenue.toLocaleString()}`
          ]
        };
      case 'top-customers':
        return {
          headers: ['Cliente', 'Documento', 'Compras', 'Total Gastado'],
          mapRow: (row) => [
            row.name, 
            row.document, 
            row.purchasesCount, 
            `$${row.totalSpent.toLocaleString()}`
          ]
        };
      default:
        return { headers: [], mapRow: () => [] };
    }
  };

  const exportToExcel = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_${reportType}_${new Date().getTime()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF('landscape'); // Horizontal para que quepan las columnas
    const config = getTableConfig();
    
    doc.text(`Reporte: ${reportOptions.find(r => r.value === reportType).label}`, 14, 15);
    if (reportType !== 'inventory') {
      doc.setFontSize(10);
      doc.text(`Desde: ${dateRange.startDate} Hasta: ${dateRange.endDate}`, 14, 22);
    }

    doc.autoTable({
      startY: 30,
      head: [config.headers],
      body: data.map(config.mapRow),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });

    doc.save(`Reporte_${reportType}_${new Date().getTime()}.pdf`);
  };

  const tableConfig = getTableConfig();

  return (
    <div className={styles.reportsContainer}>
      <div className={styles.reportsHeader}>
        <h1 className={styles.reportsTitle}>Generador de Reportes</h1>
        <p className={styles.reportsSubtitle}>Exporta la información financiera y operativa</p>
      </div>

      {/* Controles y Filtros */}
      <div className={styles.reportsFilterCard}>
        <div className={`${styles.reportsFilterGrid} ${reportType === 'inventory' ? styles.reportsFilterGridNoDates : ''}`}>
          
          <div>
            <label className="neo-label">Tipo de Reporte</label>
            <CustomSelect
              value={reportType}
              onChange={(val) => setReportType(val)}
              options={reportOptions}
            />
          </div>

          {reportType !== 'inventory' && (
            <div>
              <label className="neo-label">Rango de Fechas</label>
              <Datepicker 
                primaryColor="indigo"
                useRange={true} 
                value={dateRange} 
                onChange={newValue => setDateRange(newValue)} 
                displayFormat="DD/MM/YYYY"
                placeholder="Selecciona el rango de fechas"
                inputClassName="neo-input"
              />
            </div>
          )}

          <div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="neo-btn neo-btn-primary"
              style={{ width: '100%', padding: '0.65rem', justifyContent: 'center' }}
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
              <span>Generar Consulta</span>
            </button>
          </div>
        </div>
        
        {error && <p style={{ color: 'var(--danger-text)', margin: '1rem 0 0 0', fontSize: '0.875rem', fontWeight: 600 }}>{error}</p>}
      </div>

      {/* Resultados y Botones de Exportación */}
      {data.length > 0 && (
        <div className={styles.reportsResultsCard}>
          <div className={styles.reportsResultsHeader}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Resultados ({data.length} registros)
            </h3>
            <div className={styles.reportsResultsActions}>
              <button 
                onClick={exportToExcel}
                className="neo-btn neo-btn-success"
                style={{ padding: '0.45rem 0.85rem' }}
              >
                <FileSpreadsheet size={16} /> <span>Excel</span>
              </button>
              <button 
                onClick={exportToPDF}
                className="neo-btn neo-btn-danger"
                style={{ padding: '0.45rem 0.85rem' }}
              >
                <FileText size={16} /> <span>PDF</span>
              </button>
            </div>
          </div>

          <div className={styles.reportsTableWrapper}>
            <table className={styles.reportsTable}>
              <thead>
                <tr>
                  {tableConfig.headers.map((head, idx) => (
                    <th key={idx}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row, idx) => (
                  <tr key={idx}>
                    {tableConfig.mapRow(row).map((cell, cellIdx) => (
                      <td key={cellIdx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={currentPage} 
            totalItems={data.length} 
            pageSize={pageSize} 
            onPageChange={setCurrentPage} 
            itemName="registros" 
          />
        </div>
      )}
    </div>
  );
};

export default Reports;
