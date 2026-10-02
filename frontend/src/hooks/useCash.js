import { useState, useEffect, useCallback, useRef } from 'react';
import cashService from '../services/cash.service';
import { useAuth } from '../context/AuthContext';

export const useCash = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await cashService.getHistory();
      setSessions(data);
      
      // Buscamos si hay una caja abierta para el usuario actual
      const currentOpen = data.find(s => s.status === 'OPEN' && s.userId === user.id);
      setActiveSession(currentOpen || null);
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los datos de caja');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchSessions();

    // Auto-refresh cada 30 segundos para capturar abonos/pagos hechos desde Facturas
    intervalRef.current = setInterval(() => fetchSessions(true), 30000);

    // Refrescar al volver a la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchSessions(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchSessions]);

  const openCash = async (amount) => {
    try {
      await cashService.openSession(amount);
      await fetchSessions();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al abrir caja' };
    }
  };

  const closeCash = async (amount) => {
    if (!activeSession) return { success: false, message: 'No hay caja abierta' };
    try {
      await cashService.closeSession(activeSession.id, amount);
      await fetchSessions();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al cerrar caja' };
    }
  };

  const addMovement = async (data) => {
    if (!activeSession) return { success: false, message: 'No hay caja abierta' };
    try {
      await cashService.registerMovement(activeSession.id, data);
      await fetchSessions(); // Recargar para actualizar el historial
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al registrar movimiento' };
    }
  };

  return {
    sessions,
    activeSession,
    loading,
    error,
    refetch: fetchSessions,
    openCash,
    closeCash,
    addMovement
  };
};