import api from './api';

// Obtener métodos de pago activos
export const getPaymentMethods = async () => {
  try {
    const res = await api.get('/sales/payment-methods');
    const data = res.data?.data || res.data || [];
    return Array.isArray(data) ? data.filter((pm) => pm.isActive !== false) : [];
  } catch (err) {
    console.error('Error al obtener métodos de pago:', err);
    return [
      { id: '1', name: 'Efectivo', code: 'CASH', isActive: true },
      { id: '2', name: 'Tarjeta / Datafono', code: 'CARD', isActive: true },
      { id: '3', name: 'Transferencia (Nequi / Bancolombia)', code: 'TRANSFER', isActive: true },
    ];
  }
};

// Obtener clientes del restaurante
export const getCustomers = async (search = '') => {
  try {
    const res = await api.get('/customers', { params: { search } });
    const data = res.data?.data || res.data || [];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    return [];
  }
};

// Obtener detalles de crédito de un cliente
export const getCustomerCredits = async (customerId) => {
  try {
    const res = await api.get(`/customers/${customerId}/credits`);
    return res.data?.data || res.data || null;
  } catch (err) {
    console.error('Error al obtener crédito del cliente:', err);
    return null;
  }
};

// Procesar cobro / venta
export const processSale = async (saleData) => {
  const res = await api.post('/sales', saleData);
  return res.data?.data || res.data;
};
