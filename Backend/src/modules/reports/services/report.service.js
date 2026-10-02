const prisma = require('../../../config/prisma');

class ReportService {
  
  // Helper para generar el filtro de fechas
  _getDateFilter(startDate, endDate) {
    if (!startDate || !endDate) return undefined;
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Incluir todo el último día
    return {
      gte: new Date(startDate),
      lte: end,
    };
  }

  async getSalesAndProfits(startDate, endDate) {
    const dateFilter = this._getDateFilter(startDate, endDate);
    const sales = await prisma.sale.findMany({
      where: { createdAt: dateFilter },
      include: { 
        customer: true, 
        paymentMethod: true,
        details: { 
          include: { 
            product: { include: { ingredients: { include: { ingredient: true } } } } 
          } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    return sales.map(s => {
      let cost = 0;
      s.details.forEach(d => {
        if (d.product.trackStock) {
          // Si es producto directo, asumimos un margen del 60% si no hay costo explícito
          cost += parseFloat(d.subtotal) * 0.6;
        } else {
          // Sumar el costo exacto de los ingredientes de la receta
          d.product.ingredients.forEach(i => {
            cost += (parseFloat(i.quantity) * parseFloat(i.ingredient.costPerUnit)) * d.quantity;
          });
        }
      });

      const amount = parseFloat(s.finalAmount);
      return {
        invoice: s.invoiceNumber,
        date: s.createdAt,
        customer: s.customer ? s.customer.name : 'Consumidor Final',
        method: s.paymentMethod.name,
        cost: cost,
        amount: amount,
        profit: amount - cost
      };
    });
  }

  async getPurchases(startDate, endDate) {
    const dateFilter = this._getDateFilter(startDate, endDate);
    const purchases = await prisma.purchase.findMany({
      where: { createdAt: dateFilter },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' }
    });

    return purchases.map(p => ({
      invoice: p.invoiceNumber || 'Sin Factura',
      date: p.createdAt,
      supplier: p.supplier.name,
      status: p.status,
      totalCost: parseFloat(p.totalCost)
    }));
  }

  async getInventory() {
    // El inventario no se filtra por fecha, es el stock actual
    const ingredients = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
    const products = await prisma.product.findMany({ 
      where: { trackStock: true }, 
      orderBy: { name: 'asc' } 
    });

    const invIngredients = ingredients.map(i => ({
      name: i.name,
      type: 'Ingrediente',
      stock: parseFloat(i.currentStock),
      unit: i.unit,
      unitCost: parseFloat(i.costPerUnit),
      totalValue: parseFloat(i.currentStock) * parseFloat(i.costPerUnit)
    }));

    const invProducts = products.map(p => ({
      name: p.name,
      type: 'Producto Directo',
      stock: parseFloat(p.stock || 0),
      unit: 'UND',
      unitCost: parseFloat(p.price) * 0.6, // Costo estimado
      totalValue: parseFloat(p.stock || 0) * (parseFloat(p.price) * 0.6)
    }));

    return [...invIngredients, ...invProducts];
  }

  async getCashSessions(startDate, endDate) {
    const dateFilter = this._getDateFilter(startDate, endDate);
    const sessions = await prisma.cashSession.findMany({
      where: { openedAt: dateFilter },
      include: { user: true, cashAudit: true },
      orderBy: { openedAt: 'desc' }
    });

    return sessions.map(s => ({
      date: s.openedAt,
      user: s.user.name,
      status: s.status,
      opening: parseFloat(s.openingAmount),
      closing: parseFloat(s.closingAmount || 0),
      difference: s.cashAudit ? parseFloat(s.cashAudit.difference) : 0,
      audited: s.cashAudit ? 'Sí' : 'No'
    }));
  }

  async getTopProducts(startDate, endDate) {
    const dateFilter = this._getDateFilter(startDate, endDate);
    const grouped = await prisma.saleDetail.groupBy({
      by: ['productId'],
      where: { createdAt: dateFilter },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } }
    });

    const products = await prisma.product.findMany({ 
      where: { id: { in: grouped.map(g => g.productId) } } 
    });

    return grouped.map(g => {
      const p = products.find(x => x.id === g.productId);
      return {
        productName: p?.name || 'Producto Eliminado',
        quantitySold: g._sum.quantity,
        revenue: parseFloat(g._sum.subtotal)
      };
    });
  }

  async getTopCustomers(startDate, endDate) {
    const dateFilter = this._getDateFilter(startDate, endDate);
    const grouped = await prisma.sale.groupBy({
      by: ['customerId'],
      where: { customerId: { not: null }, createdAt: dateFilter },
      _count: { id: true },
      _sum: { finalAmount: true },
      orderBy: { _sum: { finalAmount: 'desc' } }
    });

    const customers = await prisma.customer.findMany({ 
      where: { id: { in: grouped.map(g => g.customerId) } } 
    });

    return grouped.map(g => {
      const c = customers.find(x => x.id === g.customerId);
      return {
        name: c?.name || 'Cliente Eliminado',
        document: c?.document || 'N/A',
        purchasesCount: g._count.id,
        totalSpent: parseFloat(g._sum.finalAmount)
      };
    });
  }
}

module.exports = new ReportService();