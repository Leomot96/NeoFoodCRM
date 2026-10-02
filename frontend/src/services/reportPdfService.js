import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const getActiveTenant = () => {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.tenant) return parsed.tenant;
    }
  } catch (e) {}
  return null;
};

/**
 * Dibuja el encabezado institucional NeoFood en el PDF
 */
const drawNeoHeader = (doc, title, subtitle, rightInfo = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tenant = getActiveTenant();
  const restaurantName = tenant?.name || 'NeoFood';

  // Banner superior azul pizarra
  doc.setFillColor(30, 41, 59); // #1e293b
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Línea de acento índigo
  doc.setFillColor(79, 70, 229); // #4f46e5
  doc.rect(0, 28, pageWidth, 3, 'F');

  // Logotipo y Nombre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('NEO', 14, 15);
  doc.setTextColor(129, 140, 248); // #818cf8
  doc.text('FOOD', 28, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.text(`${restaurantName} • Gestión Gastronómica`, 14, 21);

  // Título a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth - 14, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(subtitle, pageWidth - 14, 19, { align: 'right' });

  if (rightInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(129, 140, 248);
    doc.text(rightInfo, pageWidth - 14, 25, { align: 'right' });
  }
};

/**
 * Dibuja el pie de página con firmas y créditos
 */
const drawNeoFooter = (doc, showSignatures = true) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  if (showSignatures) {
    const sigY = pageHeight - 32;
    doc.setDrawColor(148, 163, 184); // #94a3b8
    doc.setLineWidth(0.5);

    // Firma Cajero
    doc.line(24, sigY, 84, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('FIRMA RESPONSABLE / CAJERO', 54, sigY + 5, { align: 'center' });

    // Firma Supervisor
    doc.line(pageWidth - 84, sigY, pageWidth - 24, sigY);
    doc.text('FIRMA SUPERVISOR / AUDITOR', pageWidth - 54, sigY + 5, { align: 'center' });
  }

  // Línea inferior
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const printDate = new Date().toLocaleString('es-CO');
  doc.text(`Impreso: ${printDate} • NeoFood v 1.2.1 • Documento de control interno`, 14, pageHeight - 7);
  doc.text('Página ' + doc.internal.getNumberOfPages(), pageWidth - 14, pageHeight - 7, { align: 'right' });
};

/**
 * REPORTE 1: ARQUEO Y CUADRE DE UN TURNO / SESIÓN
 */
export const generateTurnPdf = (session) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const statusText = session.status === 'OPEN' ? 'ESTADO: TURNO ABIERTO' : 'ESTADO: TURNO CERRADO';
  drawNeoHeader(doc, 'REPORTE DE ARQUEO DE CAJA', `TURNO #${session.id}`, statusText);

  let currentY = 38;

  // Cuadro informativo del turno
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DE LA SESIÓN', 20, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Cajero a cargo:', 20, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(session.user?.name || 'Usuario del sistema', 45, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Apertura:', 20, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(session.openedAt), 45, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Cierre:', 20, currentY + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(session.closedAt ? formatDate(session.closedAt) : 'Turno aún en curso', 45, currentY + 23);

  // Columna derecha del cuadro
  const colRightX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Base Inicial:', colRightX, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(session.openingAmount), colRightX + 38, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Vendido:', colRightX, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(formatCurrency(session.totalSales || 0), colRightX + 38, currentY + 18);

  currentY += 32;

  // TABLA 1: CUADRE DE GAVETA (EFECTIVO)
  const dif = session.closingAmount !== null ? parseFloat(session.closingAmount) - session.expectedCash : 0;
  const difLabel = dif < 0 ? 'FALTANTE' : dif > 0 ? 'SOBRANTE' : 'CUADRE EXACTO';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. CUADRE DE GAVETA (SOLO EFECTIVO)', 14, currentY);

  const cashMovementsIn = session.cashMovements
    ?.filter(m => m.type === 'IN')
    .reduce((acc, m) => acc + parseFloat(m.amount || 0), 0) || 0;
  const cashMovementsOut = session.cashMovements
    ?.filter(m => m.type === 'OUT')
    .reduce((acc, m) => acc + parseFloat(m.amount || 0), 0) || 0;

  const cuadreRows = [
    ['(+) Base Inicial en Efectivo', formatCurrency(session.openingAmount)],
    ['(+) Ventas en Efectivo / Abonos', formatCurrency((session.salesByMethod?.['Efectivo'] || 0) + (session.salesByMethod?.['efectivo'] || 0))],
    ['(+) Ingresos Manuales Extra a Caja', formatCurrency(cashMovementsIn)],
    ['(-) Retiros / Pagos Manuales de Caja', formatCurrency(cashMovementsOut)],
    ['(=) EFECTIVO ESPERADO EN GAVETA', formatCurrency(session.expectedCash)],
    ['Efectivo Físico Declarado (Cierre)', session.closingAmount !== null ? formatCurrency(session.closingAmount) : 'Pendiente de Cierre'],
    [`DIFERENCIA FINAL (${difLabel})`, session.closingAmount !== null ? formatCurrency(dif) : 'N/A']
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Concepto de Cuadre', 'Monto']],
    body: cuadreRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [226, 232, 240]
    },
    didParseCell: function(data) {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [238, 242, 255]; // Índigo suave
        data.cell.styles.textColor = [79, 70, 229];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 6) {
        if (dif < 0) {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [220, 38, 38];
        } else if (dif > 0) {
          data.cell.styles.fillColor = [239, 246, 255];
          data.cell.styles.textColor = [37, 99, 235];
        } else {
          data.cell.styles.fillColor = [240, 253, 244];
          data.cell.styles.textColor = [22, 163, 74];
        }
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // TABLA 2: DESGLOSE DE VENTAS POR MÉTODO DE PAGO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. DESGLOSE DE COBROS POR MÉTODO DE PAGO', 14, currentY);

  const methodsList = session.salesByMethod ? Object.entries(session.salesByMethod) : [];
  const totalSales = session.totalSales || 0;

  const methodRows = methodsList.length > 0
    ? methodsList.map(([metodo, valor]) => {
        const pct = totalSales > 0 ? ((valor / totalSales) * 100).toFixed(1) + '%' : '0%';
        return [metodo, formatCurrency(valor), pct];
      })
    : [['Sin cobros registrados en este turno', '$ 0', '0%']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Método de Pago', 'Total Cobrado', '% Participación']],
    body: methodRows,
    foot: [['TOTAL GENERAL VENDIDO', formatCurrency(totalSales), '100%']],
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles: {
      0: { fontStyle: 'normal' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [226, 232, 240]
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // TABLA 3: MOVIMIENTOS EXTRA DE EFECTIVO
  if (session.cashMovements && session.cashMovements.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('3. MOVIMIENTOS MANUALES DE EFECTIVO', 14, currentY);

    const movRows = session.cashMovements.map(m => [
      formatDate(m.createdAt),
      m.type === 'IN' ? 'INGRESO (+)' : 'RETIRO (-)',
      m.description || 'Movimiento sin detalle',
      (m.type === 'IN' ? '+' : '-') + ' ' + formatCurrency(m.amount)
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Hora / Fecha', 'Tipo', 'Descripción / Motivo', 'Monto']],
      body: movRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [226, 232, 240]
      },
      didParseCell: function(data) {
        if (data.column.index === 1) {
          if (data.cell.raw.includes('INGRESO')) {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  drawNeoFooter(doc, true);
  doc.save(`Arqueo_Turno_${session.id}_${session.openedAt.substring(0, 10)}.pdf`);
};

/**
 * REPORTE 2: REPORTE DIARIO CONSOLIDADO
 */
export const generateDailyReportPdf = (reportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  drawNeoHeader(doc, 'REPORTE DIARIO DE CAJA', `FECHA: ${reportData.date}`, `TURNOS: ${reportData.sessionsCount}`);

  let currentY = 38;

  // Cajas de KPIs
  const kpiWidth = (pageWidth - 28 - 9) / 4;
  const metrics = reportData.metrics || {};

  const kpis = [
    { label: 'TOTAL VENTAS', value: formatCurrency(metrics.totalSales), color: [79, 70, 229] },
    { label: 'INGRESOS EXTRA', value: formatCurrency(metrics.totalIncomes), color: [22, 163, 74] },
    { label: 'EGRESOS / GASTOS', value: formatCurrency(metrics.totalExpenses), color: [220, 38, 38] },
    { label: 'FLUJO NETO CAJA', value: formatCurrency(metrics.netCashFlow), color: [30, 41, 59] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, currentY, kpiWidth, 18, 2, 2, 'FD');

    // Barra de color lateral
    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, currentY, 2.5, 18, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 5, currentY + 6);

    doc.setFontSize(9);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 5, currentY + 13);
  });

  currentY += 25;

  // TABLA 1: DESGLOSE POR MÉTODOS DE PAGO DEL DÍA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('CONSOLIDADO DE COBROS POR MÉTODO', 14, currentY);

  const methodsList = metrics.salesByMethod ? Object.entries(metrics.salesByMethod) : [];
  const methodRows = methodsList.length > 0
    ? methodsList.map(([metodo, valor]) => {
        const pct = metrics.totalSales > 0 ? ((valor / metrics.totalSales) * 100).toFixed(1) + '%' : '0%';
        return [metodo, formatCurrency(valor), pct];
      })
    : [['Sin cobros registrados en el día', '$ 0', '0%']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Método de Pago', 'Total Cobrado', '% Participación']],
    body: methodRows,
    foot: [['TOTAL VENTAS DEL DÍA', formatCurrency(metrics.totalSales), '100%']],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 8.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'normal' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' }
    },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240] }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // TABLA 2: TURNOS / SESIONES DEL DÍA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('SESIONES Y TURNOS REALIZADOS EN LA FECHA', 14, currentY);

  const sessionsRows = reportData.sessions?.map(s => {
    const diff = s.difference || 0;
    const diffStr = s.closingAmount !== null ? formatCurrency(diff) : 'Abierto';
    return [
      `#${s.id}`,
      s.user?.name || 'Cajero',
      formatDate(s.openedAt).substring(11),
      s.closedAt ? formatDate(s.closedAt).substring(11) : 'En curso',
      formatCurrency(s.totalSales),
      formatCurrency(s.expectedCash),
      s.closingAmount !== null ? formatCurrency(s.closingAmount) : 'N/A',
      diffStr
    ];
  }) || [];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Turno', 'Cajero', 'Hora Abre', 'Hora Cierra', 'Ventas', 'Esperado', 'Declarado', 'Diferencia']],
    body: sessionsRows.length > 0 ? sessionsRows : [['-', 'No hay turnos registrados en esta fecha', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [226, 232, 240] }
  });

  drawNeoFooter(doc, true);
  doc.save(`Reporte_Diario_${reportData.date}.pdf`);
};

/**
 * REPORTE 3: REPORTE MENSUAL CONSOLIDADO
 */
export const generateMonthlyReportPdf = (reportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const monthsNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthLabel = monthsNames[(reportData.month || 1) - 1] + ' ' + reportData.year;

  drawNeoHeader(doc, 'REPORTE MENSUAL DE CAJA', monthLabel.toUpperCase(), `TOTAL TURNOS: ${reportData.sessionsCount}`);

  let currentY = 38;

  // Cajas de KPIs
  const kpiWidth = (pageWidth - 28 - 9) / 4;
  const metrics = reportData.metrics || {};

  const kpis = [
    { label: 'TOTAL VENTAS MES', value: formatCurrency(metrics.totalSales), color: [79, 70, 229] },
    { label: 'TOTAL INGRESOS EXTRA', value: formatCurrency(metrics.totalIncomes), color: [22, 163, 74] },
    { label: 'TOTAL EGRESOS / GASTOS', value: formatCurrency(metrics.totalExpenses), color: [220, 38, 38] },
    { label: 'FALTANTES TOTALES', value: formatCurrency(metrics.totalMissing), color: [220, 38, 38] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, currentY, kpiWidth, 18, 2, 2, 'FD');

    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, currentY, 2.5, 18, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 5, currentY + 6);

    doc.setFontSize(9);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 5, currentY + 13);
  });

  currentY += 25;

  // TABLA 1: DESGLOSE POR MÉTODOS DE PAGO DEL MES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('CONSOLIDADO MENSUAL POR MÉTODO DE PAGO', 14, currentY);

  const methodsList = metrics.salesByMethod ? Object.entries(metrics.salesByMethod) : [];
  const methodRows = methodsList.length > 0
    ? methodsList.map(([metodo, valor]) => {
        const pct = metrics.totalSales > 0 ? ((valor / metrics.totalSales) * 100).toFixed(1) + '%' : '0%';
        return [metodo, formatCurrency(valor), pct];
      })
    : [['Sin cobros registrados en el mes', '$ 0', '0%']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Método de Pago', 'Total Cobrado', '% Participación']],
    body: methodRows,
    foot: [['TOTAL GENERAL VENDIDO EN EL MES', formatCurrency(metrics.totalSales), '100%']],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontSize: 8.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'normal' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' }
    },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240] }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // TABLA 2: RESUMEN DÍA POR DÍA DEL MES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('HISTORIAL Y BALANCE DIARIO DEL MES', 14, currentY);

  const dailyRows = reportData.dailyBreakdown?.map(d => [
    d.date,
    `${d.sessionsCount} turno(s)`,
    formatCurrency(d.sales),
    formatCurrency(d.incomes),
    formatCurrency(d.expenses),
    formatCurrency(d.diff)
  ]) || [];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Fecha', 'Turnos', 'Ventas del Día', 'Ingresos Extra', 'Gastos/Retiros', 'Diferencia']],
    body: dailyRows.length > 0 ? dailyRows : [['-', '-', 'No hay movimientos registrados', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    },
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [226, 232, 240] }
  });

  drawNeoFooter(doc, true);
  doc.save(`Reporte_Mensual_${reportData.period}.pdf`);
};

/**
 * REPORTE 4: FACTURA DE VENTA ELECTRÓNICA CON ESTILO VISUAL NEOFOOD
 */
export const generateInvoicePdf = (invoice) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  const isPaid = !invoice.pendingBalance || parseFloat(invoice.pendingBalance) <= 0;
  const statusLabel = isPaid ? 'ESTADO: FACTURA PAGADA' : 'ESTADO: PENDIENTE DE PAGO';

  drawNeoHeader(
    doc,
    'FACTURA ELECTRÓNICA DE VENTA',
    `FACTURA #${invoice.invoiceNumber}`,
    statusLabel
  );

  let currentY = 38;

  // Cuadro informativo de la Factura y Cliente
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

  // Columna Izquierda: Datos del Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL CLIENTE', 20, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Cliente:', 20, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customer?.name || 'Consumidor Final', 42, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Documento / NIT:', 20, currentY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customer?.document || '222222222222', 48, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Teléfono / Dir:', 20, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const contactText = [invoice.customer?.phone, invoice.customer?.address].filter(Boolean).join(' • ') || 'Neiva, Huila';
  doc.text(contactText, 45, currentY + 22);

  // Columna Derecha: Datos de la Venta
  const colRightX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('INFORMACIÓN DE EXPEDICIÓN', colRightX, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Fecha y Hora:', colRightX, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(invoice.createdAt), colRightX + 26, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Método de Pago:', colRightX, currentY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(invoice.paymentMethod?.name || 'Efectivo', colRightX + 26, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Cajero / Atendió:', colRightX, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.user?.name || 'Caja Principal', colRightX + 26, currentY + 22);

  currentY += 34;

  // TABLA DE PRODUCTOS
  const tableColumn = ['Cant', 'Descripción del Producto', 'Precio Unitario', 'Subtotal'];
  const tableRows = [];

  if (invoice.details && invoice.details.length > 0) {
    invoice.details.forEach(detail => {
      let description = detail.product?.name || 'Producto';

      if (detail.saleDetailVariations?.length > 0) {
        const varText = detail.saleDetailVariations
          .map(v => v.name || v.variation?.name)
          .filter(Boolean)
          .join(', ');
        if (varText) description += `\n[${varText}]`;
      }

      if (detail.saleDetailAdditions?.length > 0) {
        const addText = detail.saleDetailAdditions
          .map(a => `+ ${a.name || a.addition?.name || 'Adición'}`)
          .join('\n');
        description += `\n${addText}`;
      }

      if (detail.notes) {
        description += `\n*Nota: ${detail.notes}`;
      }

      const unitPrice = detail.quantity > 0 ? (detail.subtotal / detail.quantity) : detail.subtotal;
      tableRows.push([
        detail.quantity,
        description,
        formatCurrency(unitPrice),
        formatCurrency(detail.subtotal)
      ]);
    });
  } else {
    tableRows.push(['1', 'Consumo general', formatCurrency(invoice.finalAmount), formatCurrency(invoice.finalAmount)]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', fontStyle: 'normal' },
      2: { cellWidth: 34, halign: 'right' },
      3: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const finalY = doc.lastAutoTable.finalY + 6;

  // Cuadro de Totales (a la derecha)
  const totalsBoxWidth = 84;
  const totalsX = pageWidth - 14 - totalsBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(totalsX, finalY, totalsBoxWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalsX + 6, finalY + 6);
  doc.text(formatCurrency(invoice.finalAmount), totalsX + totalsBoxWidth - 6, finalY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Impuesto / IVA:', totalsX + 6, finalY + 11);
  doc.text('$ 0', totalsX + totalsBoxWidth - 6, finalY + 11, { align: 'right' });

  // Franja Total a Pagar destacada
  doc.setFillColor(238, 242, 255); // Índigo suave
  doc.roundedRect(totalsX + 2, finalY + 14, totalsBoxWidth - 4, 8, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(79, 70, 229);
  doc.text('TOTAL FACTURA:', totalsX + 6, finalY + 19.5);
  doc.text(formatCurrency(invoice.finalAmount), totalsX + totalsBoxWidth - 6, finalY + 19.5, { align: 'right' });

  // Mensaje de Agradecimiento a la izquierda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('¡GRACIAS POR SU COMPRA!', 14, finalY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const tenant = getActiveTenant();
  const emitterName = tenant?.name || 'el sistema NeoFood';
  doc.text(`Este documento es un comprobante de venta emitido por ${emitterName}.`, 14, finalY + 14);
  doc.text('Consérvelo ante cualquier solicitud de garantía o soporte.', 14, finalY + 18);

  // Pie de página institucional
  drawNeoFooter(doc, false);

  doc.save(`Factura_${invoice.invoiceNumber}.pdf`);
};

