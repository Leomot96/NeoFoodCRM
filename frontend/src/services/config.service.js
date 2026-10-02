import api from '../api/axios';

const configService = {
  getPaymentMethods: async () => {
    const response = await api.get('/sales/payment-methods');
    return response.data.data;
  },
  createPaymentMethod: async (name) => {
    const response = await api.post('/sales/payment-methods', { name });
    return response.data.data;
  },
  togglePaymentMethod: async (id) => {
    const response = await api.patch(`/sales/payment-methods/${id}/toggle`);
    return response.data.data;
  },
  deletePaymentMethod: async (id) => {
    const response = await api.delete(`/sales/payment-methods/${id}`);
    return response.data;
  }
};

export default configService;