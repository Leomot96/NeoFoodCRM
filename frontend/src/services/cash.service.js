import api from '../api/axios';

const cashService = {
  openSession: async (openingAmount) => {
    const response = await api.post('/cash/session/open', { openingAmount });
    return response.data.data;
  },
  closeSession: async (sessionId, closingAmount) => {
    const response = await api.post(`/cash/session/${sessionId}/close`, { closingAmount });
    return response.data.data;
  },
  registerMovement: async (sessionId, data) => {
    const response = await api.post(`/cash/session/${sessionId}/movements`, data);
    return response.data.data;
  },
  getHistory: async () => {
    const response = await api.get('/cash/history');
    return response.data.data;
  }
};

export default cashService;