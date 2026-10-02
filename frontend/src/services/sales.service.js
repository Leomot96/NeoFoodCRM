import api from '../api/axios';

const salesService = {
  getProducts: async () => {
    const response = await api.get('/inventory/products');
    return response.data.data;
  },
  getPaymentMethods: async () => {
    try {
      const response = await api.get('/sales/payment-methods');
      return response.data.data;
    } catch (error) {
      // Fallback temporal por si el endpoint de métodos de pago aún no está listo en el backend
      return [
        { id: 1, name: 'Efectivo' },
        { id: 2, name: 'Transferencia (Nequi/Daviplata)' },
        { id: 3, name: 'Tarjeta (Datáfono)' }
      ];
    }
  },
  createSale: async (saleData) => {
    const response = await api.post('/sales', saleData);
    return response.data;
  }
};

export default salesService;