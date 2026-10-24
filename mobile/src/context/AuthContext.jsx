import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import api, { getServerUrl, setServerUrl, pingServer, setOnUnauthorizedCallback } from '../services/api';

const AuthContext = createContext();

// Tiempo de inactividad antes de cerrar sesión automáticamente (15 minutos)
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setCurrentServerUrl] = useState('');
  const inactivityTimerRef = useRef(null);

  const triggerHaptic = async (style = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Haptics no soportado en web o emulador básico
    }
  };

  const logout = useCallback(async (isSilent = false) => {
    try {
      if (user?.id) {
        await api.post('/auth/logout', { userId: user.id }).catch(() => {});
      }
    } catch (e) {}

    setUser(null);
    setTenant(null);
    setToken(null);

    // Limpiar sessionStorage (sesión actual)
    sessionStorage.removeItem('neofood_token');
    sessionStorage.removeItem('neofood_user');
    sessionStorage.removeItem('neofood_tenant_id');

    // Limpiar cualquier persistencia permanente para que al cerrar la app o caducar no quede guardada
    localStorage.removeItem('neofood_token');
    localStorage.removeItem('neofood_user');
    localStorage.removeItem('neofood_tenant_id');
    try {
      await Preferences.remove({ key: 'neofood_token' });
      await Preferences.remove({ key: 'neofood_user' });
      await Preferences.remove({ key: 'neofood_tenant_id' });
    } catch (e) {}

    if (!isSilent) {
      triggerHaptic(ImpactStyle.Medium);
    }
  }, [user?.id]);

  // Manejador del temporizador de inactividad
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('[AUTH] Cierre de sesión por inactividad');
        logout(true);
      }, INACTIVITY_LIMIT_MS);
    }
  }, [user, logout]);

  // Escuchar eventos de interacción del usuario para resetear el reloj de inactividad
  useEffect(() => {
    if (!user) return;

    resetInactivityTimer();

    const activityEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'scroll'];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetInactivityTimer]);

  // Configurar callback cuando una petición responda 401 (token expirado)
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      console.warn('[AUTH] Token no autorizado o expirado (401). Cerrando sesión.');
      logout(true);
    });
  }, [logout]);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      setLoading(true);
      const currentUrl = await getServerUrl();
      setCurrentServerUrl(currentUrl);

      // Al cerrar la aplicación, la sesión se cierra automáticamente
      // Por ende, solo se recupera si existe en la sesión activa actual (sessionStorage)
      let storedToken = sessionStorage.getItem('neofood_token');
      let storedUser = null;

      try {
        const rawUser = sessionStorage.getItem('neofood_user');
        storedUser = rawUser ? JSON.parse(rawUser) : null;
      } catch (err) {}

      // Limpiar residuos en Preferences permanentes para garantizar que al abrir la app de nuevo siempre pida login
      try {
        await Preferences.remove({ key: 'neofood_token' });
        await Preferences.remove({ key: 'neofood_user' });
      } catch (e) {}
      localStorage.removeItem('neofood_token');
      localStorage.removeItem('neofood_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        setTenant(storedUser.tenant || null);
      }
    } catch (error) {
      console.error('Error cargando sesión previa:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, accessToken } = response.data.data || response.data;

      setUser(userData);
      setTenant(userData.tenant || null);
      setToken(accessToken);

      // Guardar exclusivamente en sessionStorage para que al cerrar la app se cierre la sesión
      sessionStorage.setItem('neofood_token', accessToken);
      sessionStorage.setItem('neofood_user', JSON.stringify(userData));
      if (userData.tenantId) {
        sessionStorage.setItem('neofood_tenant_id', userData.tenantId);
      }

      // Limpiar persistencias permanentes antiguas
      try {
        await Preferences.remove({ key: 'neofood_token' });
        await Preferences.remove({ key: 'neofood_user' });
      } catch (e) {}
      localStorage.removeItem('neofood_token');
      localStorage.removeItem('neofood_user');

      triggerHaptic(ImpactStyle.Light);
      return { ok: true, user: userData };
    } catch (error) {
      triggerHaptic(ImpactStyle.Heavy);
      const msg = error.response?.data?.message || 'Error de autenticación o servidor inalcanzable';
      return { ok: false, message: msg };
    }
  };

  const changeServerUrl = async (newUrl) => {
    const saved = await setServerUrl(newUrl);
    setCurrentServerUrl(saved);
    return saved;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        loading,
        serverUrl,
        login,
        logout,
        changeServerUrl,
        pingServer,
        triggerHaptic
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
