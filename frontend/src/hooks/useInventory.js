import { useState, useEffect, useCallback } from 'react';
import inventoryService from '../services/inventory.service';

export const useInventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addProduct = async (productData) => {
    try {
      const newProduct = await inventoryService.createProduct(productData);
      setProducts(prev => [...prev, newProduct]);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al crear producto' };
    }
  };

  const editProduct = async (id, productData) => {
    try {
      const updatedProduct = await inventoryService.updateProduct(id, productData);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al actualizar producto' };
    }
  };

  const removeProduct = async (id) => {
    try {
      await inventoryService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al eliminar producto' };
    }
  };

  // NUEVO: Función para añadir categoría
  const addCategory = async (categoryData) => {
    try {
      const newCategory = await inventoryService.createCategory(categoryData);
      setCategories(prev => [...prev, newCategory]);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al crear categoría' };
    }
  };

  const removeCategory = async (id) => {
    try {
      await inventoryService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al eliminar categoría' };
    }
  };

  const updatedCategory = async (id, categoryData) => {
    try {
      const updatedCategory = await inventoryService.updatedCategory(id, categoryData);
      setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al actualizar categoría' };
    }
  };

  return {
    products,
    categories,
    loading,
    error,
    refetch: fetchData,
    addProduct,
    editProduct,
    removeProduct,
    addCategory, // La exportamos aquí
    removeCategory,
    updatedCategory
  };
};