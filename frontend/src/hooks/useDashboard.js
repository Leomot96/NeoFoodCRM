import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboard.service';

export const useDashboard = () => {
  const [data, setData] = useState({
    kpis: {
      dailySales: 0,
      monthlySales: 0,
      monthlyProfit: 0,
      totalPurchases: 0,
      cashSession: { status: 'CLOSED' },
      lowStockItems: []
    },
    chartData: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const realData = await dashboardService.getDashboardData();
      setData(realData);
      setError(null);
    } catch (err) {
      console.error('Error al cargar datos reales del dashboard:', err);
      setError('No se pudieron sincronizar algunos datos del panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
};