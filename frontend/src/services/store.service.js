import api from './api';

const storeService = {
  // Público
  getPublicStore: async (slug) => {
    const response = await api.get(`/store/public/${slug}`);
    return response.data.data;
  },

  createPublicOrder: async (slug, orderData) => {
    const response = await api.post(`/store/public/${slug}/order`, orderData);
    return response.data.data;
  },

  // Administración
  getStoreConfig: async () => {
    const response = await api.get('/store/config');
    return response.data.data;
  },

  updateStoreConfig: async (data) => {
    const response = await api.put('/store/config', data);
    return response.data.data;
  },

  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post('/store/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  deleteLogo: async () => {
    const response = await api.delete('/store/logo');
    return response.data.data;
  },

  uploadBanner: async (file) => {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await api.post('/store/upload-banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  deleteBanner: async () => {
    const response = await api.delete('/store/banner');
    return response.data.data;
  },

  getStoreOrders: async (params = {}) => {
    const response = await api.get('/store/orders', { params });
    return response.data.data;
  },

  getActiveCount: async () => {
    const response = await api.get('/store/orders/active-count');
    return response.data.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/store/orders/${orderId}/status`, { status });
    return response.data.data;
  },

  convertToSale: async (orderId, data = {}) => {
    const response = await api.post(`/store/orders/${orderId}/convert-to-sale`, data);
    return response.data.data;
  }
};

export default storeService;
