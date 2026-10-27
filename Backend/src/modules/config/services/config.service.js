const prisma = require('../../../config/prisma');

class ConfigService {
  /**
   * Obtiene la configuración de impresora POS para el restaurante actual
   */
  async getPrinterConfig(tenantId) {
    if (!tenantId) {
      throw Object.assign(new Error('Contexto de establecimiento requerido'), { statusCode: 400 });
    }

    const configs = await prisma.configuration.findMany({
      where: { tenantId }
    });

    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        document: true,
        phone: true,
        address: true,
        logoUrl: true
      }
    });

    return {
      paperWidth: configMap['printer_paper_width'] || '80mm', // '80mm' o '58mm'
      autoPrint: configMap['printer_auto_print'] === 'true',
      showLogo: configMap['printer_show_logo'] !== 'false',
      headerText: configMap['printer_header_text'] || '',
      footerText: configMap['printer_footer_text'] || '¡Gracias por su compra! Vuelva pronto.',
      showCustomer: configMap['printer_show_customer'] !== 'false',
      showTable: configMap['printer_show_table'] !== 'false',
      showCashier: configMap['printer_show_cashier'] !== 'false',
      showTax: configMap['printer_show_tax'] === 'true',
      tenantInfo: tenant || {}
    };
  }

  /**
   * Guarda o actualiza la configuración de la impresora POS
   */
  async updatePrinterConfig(tenantId, data) {
    if (!tenantId) {
      throw Object.assign(new Error('Contexto de establecimiento requerido'), { statusCode: 400 });
    }

    const keysToSave = [
      { key: 'printer_paper_width', value: data.paperWidth === '58mm' ? '58mm' : '80mm' },
      { key: 'printer_auto_print', value: String(Boolean(data.autoPrint)) },
      { key: 'printer_show_logo', value: String(data.showLogo !== false) },
      { key: 'printer_header_text', value: (data.headerText || '').trim() },
      { key: 'printer_footer_text', value: (data.footerText || '').trim() },
      { key: 'printer_show_customer', value: String(data.showCustomer !== false) },
      { key: 'printer_show_table', value: String(data.showTable !== false) },
      { key: 'printer_show_cashier', value: String(data.showCashier !== false) },
      { key: 'printer_show_tax', value: String(Boolean(data.showTax)) }
    ];

    await prisma.$transaction(async (tx) => {
      for (const item of keysToSave) {
        await tx.configuration.upsert({
          where: {
            tenantId_key: {
              tenantId,
              key: item.key
            }
          },
          update: { value: item.value },
          create: {
            tenantId,
            key: item.key,
            value: item.value
          }
        });
      }
    });

    return await this.getPrinterConfig(tenantId);
  }
}

module.exports = new ConfigService();
