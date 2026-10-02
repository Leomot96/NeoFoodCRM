import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import styles from './SalesChart.module.css';

const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>
          {label} {dataItem.fullDate ? `(${dataItem.fullDate})` : ''}
        </p>
        <p className={styles.tooltipVal}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const SalesChart = ({ data = [] }) => {
  const totalWeek = data.reduce((acc, curr) => acc + (curr.ventas || 0), 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
            Ventas de los últimos 7 días
          </h3>
          <p className={styles.subtitle}>Ingresos diarios acumulados</p>
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>Total Semana</span>
          <span className={styles.totalVal}>{formatCurrency(totalWeek)}</span>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
              dy={8}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(value) => `$${value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
            <Bar dataKey="ventas" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={45} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;