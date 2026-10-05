import api from './api';

const productionService = {
  createProductionOrder: async (data) => {
    const response = await api.post('/production', data);
    return response.data;
  },

  getProductionOrders: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/production?${params.toString()}`);
    return response.data.data.orders;
  },

  cancelProductionOrder: async (id) => {
    const response = await api.post(`/production/${id}/cancel`);
    return response.data;
  }
};

export default productionService;
