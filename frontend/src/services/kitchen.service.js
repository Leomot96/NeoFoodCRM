import api from './api';

const kitchenService = {
  getOrders: async (params = {}) => {
    const response = await api.get('/kitchen/orders', { params });
    return response.data.data;
  },

  updateStatus: async (orderId, status) => {
    const response = await api.patch(`/kitchen/orders/${orderId}/status`, { status });
    return response.data.data;
  }
};

export default kitchenService;
