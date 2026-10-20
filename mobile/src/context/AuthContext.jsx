import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import api, { getServerUrl, setServerUrl, pingServer } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setCurrentServerUrl] = useState('');

  useEffect(() => {
    loadStoredSession();
  }, []);

  const triggerHaptic = async (style = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Haptics no soportado en web o emulador básico
    }
  };

  const loadStoredSession = async () => {
    try {
      setLoading(true);
      const currentUrl = await getServerUrl();
      setCurrentServerUrl(currentUrl);

      let storedToken = null;
      let storedUser = null;

      try {
        const tokenRes = await Preferences.get({ key: 'neofood_token' });
        storedToken = tokenRes.value;
        const userRes = await Preferences.get({ key: 'neofood_user' });
        storedUser = userRes.value ? JSON.parse(userRes.value) : null;
      } catch (err) {
        // Fallback
      }

      if (!storedToken) storedToken = localStorage.getItem('neofood_token');
      if (!storedUser) {
        const localUser = localStorage.getItem('neofood_user');
        storedUser = localUser ? JSON.parse(localUser) : null;
      }

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

      try {
        await Preferences.set({ key: 'neofood_token', value: accessToken });
        await Preferences.set({ key: 'neofood_user', value: JSON.stringify(userData) });
        if (userData.tenantId) {
          await Preferences.set({ key: 'neofood_tenant_id', value: userData.tenantId });
        }
      } catch (e) {}

      localStorage.setItem('neofood_token', accessToken);
      localStorage.setItem('neofood_user', JSON.stringify(userData));
      if (userData.tenantId) {
        localStorage.setItem('neofood_tenant_id', userData.tenantId);
      }

      triggerHaptic(ImpactStyle.Light);
      return { ok: true, user: userData };
    } catch (error) {
      triggerHaptic(ImpactStyle.Heavy);
      const msg = error.response?.data?.message || 'Error de autenticación o servidor inalcanzable';
      return { ok: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      if (user?.id) {
        await api.post('/auth/logout', { userId: user.id }).catch(() => {});
      }
    } catch (e) {}

    setUser(null);
    setTenant(null);
    setToken(null);

    try {
      await Preferences.remove({ key: 'neofood_token' });
      await Preferences.remove({ key: 'neofood_user' });
      await Preferences.remove({ key: 'neofood_tenant_id' });
    } catch (e) {}

    localStorage.removeItem('neofood_token');
    localStorage.removeItem('neofood_user');
    localStorage.removeItem('neofood_tenant_id');

    triggerHaptic(ImpactStyle.Medium);
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
