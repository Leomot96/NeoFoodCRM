import api from './api';

class DashboardService {
  async getDashboardData() {
    try {
      // 1. Intentamos obtener el resumen unificado y exacto del backend
      const response = await api.get('/sales/dashboard-summary');
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (apiError) {
      console.warn('Endpoint /sales/dashboard-summary no disponible, usando fallback multi-servicio:', apiError);
    }

    try {
      // Fallback: Obtenemos los datos en paralelo desde los módulos individuales
      const [salesRes, purchasesRes, alertsRes, cashRes] = await Promise.allSettled([
        api.get('/sales/history'),
        api.get('/purchases/history'),
        api.get('/inventory/ingredients/alerts'),
        api.get('/cash/history')
      ]);

      const salesRaw = salesRes.status === 'fulfilled' && salesRes.value.data?.data ? salesRes.value.data.data : [];
      const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw.sales || []);

      const purchasesRaw = purchasesRes.status === 'fulfilled' && purchasesRes.value.data?.data ? purchasesRes.value.data.data : [];
      const purchases = Array.isArray(purchasesRaw) ? purchasesRaw : (purchasesRaw.purchases || []);

      const lowStockItems = alertsRes.status === 'fulfilled' && alertsRes.value.data?.data && Array.isArray(alertsRes.value.data.data) 
        ? alertsRes.value.data.data 
        : [];

      const cashRaw = cashRes.status === 'fulfilled' && cashRes.value.data?.data ? cashRes.value.data.data : [];
      const cashSessions = Array.isArray(cashRaw) ? cashRaw : [];

      const now = new Date();
      const todayStr = now.toDateString();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // 1. Ventas del Día
      const dailySales = sales
        .filter(s => new Date(s.createdAt).toDateString() === todayStr)
        .reduce((sum, s) => sum + (parseFloat(s.finalAmount) || 0), 0);

      // 2. Ventas del Mes
      const monthlySales = sales
        .filter(s => {
          const d = new Date(s.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, s) => sum + (parseFloat(s.finalAmount) || 0), 0);

      // 3. Compras del Mes
      const totalPurchases = purchases
        .filter(p => {
          const d = new Date(p.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.status !== 'CANCELLED';
        })
        .reduce((sum, p) => sum + (parseFloat(p.totalCost) || 0), 0);

      // 4. Ganancia Estimada
      const monthlyProfit = Math.max(0, monthlySales - totalPurchases);

      // 5. Estado de Caja
      const activeCashSession = cashSessions.find(cs => cs.status === 'OPEN') || { status: 'CLOSED' };

      // 6. Gráfico 7 Días
      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() - i);
        const dateString = targetDate.toDateString();
        const dayLabel = daysOfWeek[targetDate.getDay()];

        const dayTotal = sales
          .filter(s => new Date(s.createdAt).toDateString() === dateString)
          .reduce((sum, s) => sum + (parseFloat(s.finalAmount) || 0), 0);

        chartData.push({
          name: dayLabel,
          ventas: dayTotal,
          fullDate: targetDate.toLocaleDateString('es-CO')
        });
      }

      // 7. Top Productos
      const productMap = {};
      sales.forEach(sale => {
        if (sale.details && Array.isArray(sale.details)) {
          sale.details.forEach(detail => {
            const prodName = detail.product?.name || 'Producto';
            const qty = parseInt(detail.quantity) || 1;
            const subtotal = parseFloat(detail.subtotal) || 0;

            if (!productMap[prodName]) {
              productMap[prodName] = { name: prodName, quantity: 0, revenue: 0 };
            }
            productMap[prodName].quantity += qty;
            productMap[prodName].revenue += subtotal;
          });
        }
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return {
        kpis: {
          dailySales,
          monthlySales,
          monthlyProfit,
          totalPurchases,
          cashSession: activeCashSession,
          lowStockItems: lowStockItems.slice(0, 5)
        },
        chartData,
        topProducts
      };
    } catch (err) {
      console.error('Error procesando datos del dashboard:', err);
      throw err;
    }
  }
}

export default new DashboardService();