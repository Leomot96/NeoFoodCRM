import { useState, useEffect, useCallback, useMemo } from 'react';
import salesService from '../services/sales.service';
import api from '../services/api';

export const useSales = () => {
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshTables = useCallback(async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data?.data || []);
    } catch (err) {
      console.error('Error al actualizar mesas:', err);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, methodsData, tablesRes, customersRes] = await Promise.all([
        salesService.getProducts(),
        salesService.getPaymentMethods(),
        api.get('/tables').catch(() => ({ data: { data: [] } })),
        api.get('/customers').catch(() => ({ data: { data: [] } }))
      ]);

      setProducts(productsData.filter(p => p.isAvailable !== false));
      setPaymentMethods(methodsData.filter(m => m.isActive === true));
      setTables(tablesRes.data?.data || []);
      setCustomers(customersRes.data?.data || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar datos del punto de venta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Cargar carrito desde un pedido existente (para mesa ocupada)
  const loadCart = useCallback((items) => {
    const formatted = (items || []).map(item => ({
      cartItemId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      product: item.product,
      quantity: item.quantity,
      finalPrice: parseFloat(item.unitPrice || item.finalPrice || item.product?.price || 0),
      modifiers: item.modifiers || item.variations || [],
      variations: item.variations || item.modifiers || [],
      additions: item.additions || [],
      notes: item.notes || ''
    }));
    setCart(formatted);
  }, []);

  // Agregar al carrito (Manejo de productos simples y con variantes/adiciones)
  const addToCart = useCallback((payload) => {
    setCart(prev => {
      // 1. Si viene directo de la cuadrícula (Sin modal, producto simple)
      if (!payload.finalPrice) {
        const existing = prev.find(item => item.product.id === payload.id && !item.modifiers?.length && !item.additions?.length);
        if (existing) {
          return prev.map(item => item.cartItemId === existing.cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, {
          cartItemId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          product: payload,
          quantity: 1,
          finalPrice: parseFloat(payload.price),
          modifiers: [],
          variations: [],
          additions: []
        }];
      }

      // 2. Si viene del Modal (Trae modificadores y adiciones)
      return [...prev, {
        ...payload,
        cartItemId: Date.now().toString() + Math.random().toString(36).substr(2, 5)
      }];
    });
  }, []);

  // Modificar cantidad
  const updateQuantity = useCallback((cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // Calcular total
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.finalPrice * item.quantity), 0);
  }, [cart]);

  // Guardar o actualizar pedido en la mesa (para comensales que aún no pagan)
  const saveTableOrder = async ({ tableId, customerId, notes }) => {
    try {
      const payload = {
        customerId: customerId || null,
        notes: notes || null,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          finalPrice: item.finalPrice,
          unitPrice: item.finalPrice,
          modifiers: item.modifiers || [],
          variations: item.variations || item.modifiers || [],
          additions: item.additions || [],
          notes: item.notes || null
        }))
      };

      const res = await api.post(`/tables/${tableId}/order`, payload);
      await refreshTables();
      clearCart();
      return { success: true, data: res.data?.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al guardar el pedido en la mesa' };
    }
  };

  // Cancelar / Liberar pedido de mesa sin cobrar
  const cancelTableOrder = async (tableId) => {
    try {
      await api.delete(`/tables/${tableId}/order`);
      await refreshTables();
      clearCart();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al liberar la mesa' };
    }
  };

  // Procesar pago (Cobro final y liberación de mesa)
  const processSale = async ({ paymentMethodId, receivedAmount, customerId, tableId, orderId }) => {
    try {
      const saleData = {
        paymentMethodId: String(paymentMethodId),
        customerId: customerId || null,
        tableId: tableId || null,
        orderId: orderId || null,
        receivedAmount: receivedAmount || null,
        details: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.finalPrice,
          modifiers: item.modifiers || [],
          variations: item.variations || item.modifiers || [],
          additions: item.additions || [],
          notes: item.notes || null
        }))
      };

      const result = await salesService.createSale(saleData);
      clearCart();
      await refreshTables();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al procesar la venta' };
    }
  };

  return {
    products, paymentMethods, tables, customers, cart, loading, error, cartTotal,
    addToCart, updateQuantity, clearCart, loadCart, saveTableOrder, cancelTableOrder,
    processSale, refreshTables
  };
};