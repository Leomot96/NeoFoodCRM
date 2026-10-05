import api from '../api/axios';
import { getFullImageUrl } from '../utils/imageUrl';

export { getFullImageUrl };

const inventoryService = {
  // Productos
  getProducts: async () => {
    const response = await api.get('/inventory/products');
    return response.data.data;
  },
  createProduct: async (data) => {
    const response = await api.post('/inventory/products', data);
    return response.data.data;
  },
  updateProduct: async (id, data) => {
    const response = await api.put(`/inventory/products/${id}`, data);
    return response.data.data;
  },
  deleteProduct: async (id) => {
    const response = await api.delete(`/inventory/products/${id}`);
    return response.data;
  },
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/inventory/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  deleteProductImage: async (imageUrl) => {
    const response = await api.delete('/inventory/products/image', {
      data: { imageUrl }
    });
    return response.data;
  },


   // Categorías
  getCategories: async () => {
    const response = await api.get('/inventory/categories');
    return response.data.data;
  },
  createCategory: async (data) => {
    const response = await api.post('/inventory/categories', data);
    return response.data.data;
  },
  updatedCategory: async (id, data) => {
    const response = await api.put(`/inventory/categories/${id}`, data);
    return response.data.data;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`/inventory/categories/${id}`);
    return response.data;
  },
};

export default inventoryService;