import api from './api';

const DEFAULT_PRINTER_CONFIG = {
  paperWidth: '80mm',
  autoPrint: false,
  showLogo: true,
  headerText: '',
  footerText: '¡Gracias por su compra! Vuelva pronto.',
  showCustomer: true,
  showTable: true,
  showCashier: true,
  showTax: false,
  tenantInfo: {}
};

export const printerService = {
  /**
   * Obtiene la configuración de impresora POS
   */
  async getPrinterConfig() {
    try {
      const res = await api.get('/config/printer');
      if (res.data?.success && res.data?.data) {
        return { ...DEFAULT_PRINTER_CONFIG, ...res.data.data };
      }
    } catch (err) {
      console.warn('No se pudo cargar la configuración de impresora desde el servidor, usando local/default:', err);
    }
    // Fallback a localStorage si el backend aún no responde
    const local = localStorage.getItem('neofood_printer_config');
    if (local) {
      try {
        return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(local) };
      } catch (e) {
        // Ignorar error de parseo
      }
    }
    return DEFAULT_PRINTER_CONFIG;
  },

  /**
   * Guarda la configuración de impresora POS en backend y local
   */
  async savePrinterConfig(config) {
    try {
      const res = await api.put('/config/printer', config);
      if (res.data?.data) {
        localStorage.setItem('neofood_printer_config', JSON.stringify(res.data.data));
        return res.data.data;
      }
    } catch (err) {
      console.warn('Error guardando en backend, guardando en local:', err);
    }
    localStorage.setItem('neofood_printer_config', JSON.stringify(config));
    return config;
  },

  /**
   * Genera el HTML de la tirilla térmica adaptado para 80mm o 58mm
   */
  generatePosTicketHtml(sale, config = {}) {
    const printerConfig = { ...DEFAULT_PRINTER_CONFIG, ...config };
    const width = printerConfig.paperWidth === '58mm' ? '58mm' : '80mm';
    const is58 = width === '58mm';

    // Información del restaurante
    const store = printerConfig.tenantInfo || {};
    const businessName = store.name || sale.tenant?.name || 'NeoFood Restaurante';
    const businessDoc = store.document || sale.tenant?.document || '';
    const businessPhone = store.phone || sale.tenant?.phone || '';
    const businessAddress = store.address || sale.tenant?.address || '';
    const logoUrl = store.logoUrl || sale.tenant?.logoUrl || null;

    // Información de la factura
    const invoiceNumber = sale.invoiceNumber || `FRA-${Date.now().toString().slice(-6)}`;
    const invoiceDate = sale.createdAt ? new Date(sale.createdAt).toLocaleString('es-CO') : new Date().toLocaleString('es-CO');
    const cashierName = sale.order?.user?.name || sale.cashier || 'Caja Principal';
    const tableName = sale.order?.table?.name || sale.tableName || (sale.order?.orderType === 'TAKE_AWAY' ? 'Para Llevar' : 'Mostrador');
    const orderType = sale.order?.orderType === 'DELIVERY' ? 'Domicilio' : (sale.order?.orderType === 'TAKE_AWAY' ? 'Para Llevar' : 'En Mesa');

    // Cliente
    const customerName = sale.customer?.name || 'Consumidor final';
    const customerDoc = sale.customer?.document || '222222222222';
    const customerPhone = sale.customer?.phone || '';

    // Productos y totales
    const details = sale.details || sale.items || [];
    const totalAmount = parseFloat(sale.totalAmount || sale.finalAmount || 0);
    const discount = parseFloat(sale.discount || 0);
    const finalAmount = parseFloat(sale.finalAmount || (totalAmount - discount));
    const paymentMethodName = sale.paymentMethod?.name || (typeof sale.paymentMethod === 'string' ? sale.paymentMethod : 'Efectivo');

    const formatCurr = (num) => '$ ' + Math.round(parseFloat(num || 0)).toLocaleString('es-CO');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Ticket POS - ${invoiceNumber}</title>
        <style>
          @page {
            size: ${width} auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Courier New', Courier, monospace, 'Segoe UI', Tahoma, sans-serif;
            font-size: ${is58 ? '10px' : '12px'};
            line-height: 1.25;
            color: #000;
            background: #fff;
            width: ${width};
            margin: 0 auto;
            padding: ${is58 ? '6px 4px' : '10px 8px'};
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .divider-double {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          .logo {
            max-width: ${is58 ? '50px' : '75px'};
            max-height: ${is58 ? '50px' : '75px'};
            display: block;
            margin: 0 auto 4px auto;
            filter: grayscale(100%) contrast(150%);
          }
          .header-title {
            font-size: ${is58 ? '12px' : '15px'};
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .info-line {
            font-size: ${is58 ? '9px' : '11px'};
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .table-items {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
          }
          .table-items th {
            font-size: ${is58 ? '9px' : '11px'};
            border-bottom: 1px dashed #000;
            padding-bottom: 3px;
          }
          .table-items td {
            font-size: ${is58 ? '9.5px' : '11.5px'};
            padding: 3px 0;
            vertical-align: top;
          }
          .item-addon {
            font-size: ${is58 ? '8.5px' : '10px'};
            color: #222;
            padding-left: 8px;
          }
          .totals-table {
            width: 100%;
            margin-top: 4px;
          }
          .totals-table td {
            padding: 2px 0;
            font-size: ${is58 ? '10px' : '12px'};
          }
          .total-highlight {
            font-size: ${is58 ? '13px' : '16px'};
            font-weight: bold;
          }
          .footer-section {
            margin-top: 10px;
            font-size: ${is58 ? '8.5px' : '10.5px'};
            line-height: 1.3;
          }
          .cut-space {
            height: 35px;
          }
        </style>
      </head>
      <body>
        <!-- ENCABEZADO -->
        <div class="text-center">
          ${printerConfig.showLogo && logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
          <div class="header-title">${businessName}</div>
          ${businessDoc ? `<div>NIT: ${businessDoc}</div>` : ''}
          ${businessAddress ? `<div>${businessAddress}</div>` : ''}
          ${businessPhone ? `<div>Tel: ${businessPhone}</div>` : ''}
          ${printerConfig.headerText ? `<div style="margin-top:3px; font-style:italic;">${printerConfig.headerText}</div>` : ''}
        </div>

        <div class="divider"></div>

        <!-- DATOS DE LA FACTURA -->
        <div class="info-line">
          <span class="bold">FACTURA:</span>
          <span class="bold">${invoiceNumber}</span>
        </div>
        <div class="info-line">
          <span>Fecha:</span>
          <span>${invoiceDate}</span>
        </div>
        ${printerConfig.showTable ? `
        <div class="info-line">
          <span>Ubicación:</span>
          <span class="bold">${tableName} (${orderType})</span>
        </div>` : ''}
        ${printerConfig.showCashier ? `
        <div class="info-line">
          <span>Atendido por:</span>
          <span>${cashierName}</span>
        </div>` : ''}

        <!-- DATOS DEL CLIENTE -->
        ${printerConfig.showCustomer ? `
        <div class="divider"></div>
        <div class="info-line">
          <span class="bold">CLIENTE:</span>
          <span>${customerName}</span>
        </div>
        <div class="info-line">
          <span>Doc / NIT:</span>
          <span>${customerDoc}</span>
        </div>
        ${customerPhone ? `
        <div class="info-line">
          <span>Teléfono:</span>
          <span>${customerPhone}</span>
        </div>` : ''}
        ` : ''}

        <div class="divider-double"></div>

        <!-- ITEMS / PRODUCTOS -->
        <table class="table-items">
          <thead>
            <tr>
              <th class="text-left" style="width: 15%;">Cant</th>
              <th class="text-left" style="width: 55%;">Producto</th>
              <th class="text-right" style="width: 30%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${details.map(d => {
              const qty = d.quantity || d.qty || 1;
              const name = d.product?.name || d.name || d.product || 'Producto';
              const sub = parseFloat(d.subtotal || (qty * (d.unitPrice || 0)));
              
              const variations = d.saleDetailVariations || d.variations || d.modifiers || [];
              const additions = d.saleDetailAdditions || d.additions || [];

              return `
                <tr>
                  <td class="bold">${qty}x</td>
                  <td>
                    <div class="bold">${name}</div>
                    ${variations.length > 0 ? variations.map(v => `<div class="item-addon">• ${v.name || v.variation?.name || ''}</div>`).join('') : ''}
                    ${additions.length > 0 ? additions.map(a => `<div class="item-addon">+ ${a.name || a.addition?.name || ''} (x${a.quantity || 1})</div>`).join('') : ''}
                    ${d.notes ? `<div class="item-addon" style="font-style:italic;">Nota: ${d.notes}</div>` : ''}
                  </td>
                  <td class="text-right bold">${formatCurr(sub)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <!-- TOTALES -->
        <table class="totals-table">
          ${discount > 0 ? `
          <tr>
            <td class="text-left">Subtotal:</td>
            <td class="text-right">${formatCurr(totalAmount)}</td>
          </tr>
          <tr>
            <td class="text-left">Descuento:</td>
            <td class="text-right">- ${formatCurr(discount)}</td>
          </tr>` : ''}
          <tr class="total-highlight">
            <td class="text-left">TOTAL A PAGAR:</td>
            <td class="text-right">${formatCurr(finalAmount)}</td>
          </tr>
          ${sale.payments && sale.payments.length > 1 ? `
          <tr>
            <td class="text-left" style="padding-top: 4px;">Medio de Pago:</td>
            <td class="text-right bold" style="padding-top: 4px;">Cuenta Dividida</td>
          </tr>
          ${sale.payments.map(p => `
          <tr>
            <td class="text-left" style="padding-left: 8px; font-size: ${is58 ? '9px' : '11px'}; color: #444;">• ${p.paymentMethod?.name || p.method || 'Pago'}:</td>
            <td class="text-right" style="font-size: ${is58 ? '9px' : '11px'};">${formatCurr(p.amount)}</td>
          </tr>
          `).join('')}
          ` : `
          <tr>
            <td class="text-left" style="padding-top: 4px;">Medio de Pago:</td>
            <td class="text-right bold" style="padding-top: 4px;">${paymentMethodName}</td>
          </tr>
          `}
        </table>

        <div class="divider-double"></div>

        <!-- PIE DE PÁGINA -->
        <div class="text-center footer-section">
          ${printerConfig.footerText ? `<div>${printerConfig.footerText}</div>` : ''}
          <div style="margin-top: 6px; font-weight: bold; letter-spacing: 1px;">*** DOCUMENTO DE CONTROL INTERNO ***</div>
          <div style="font-size: 8px; color: #444; margin-top: 2px;">Software NeoFood POS v1.9.0</div>
        </div>

        <div class="cut-space"></div>
      </body>
      </html>
    `;
  },

  /**
   * Envía directamente el documento a imprimir a la impresora térmica seleccionada en el navegador
   */
  printPosTicket(sale, config = {}) {
    return new Promise((resolve) => {
      const html = this.generatePosTicketHtml(sale, config);

      // Usar un iframe oculto para no abrir nuevas pestañas ni alterar la pantalla actual del POS
      let printFrame = document.getElementById('neofood-pos-print-frame');
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'neofood-pos-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentWindow || printFrame.contentDocument.document || printFrame.contentDocument;
      frameDoc.document.open();
      frameDoc.document.write(html);
      frameDoc.document.close();

      // Esperar a que se carguen estilos e imágenes antes de disparar el cuadro de impresión
      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (e) {
          console.error('Error al invocar impresión POS:', e);
        }
        resolve(true);
      }, 350);
    });
  }
};

export default printerService;
