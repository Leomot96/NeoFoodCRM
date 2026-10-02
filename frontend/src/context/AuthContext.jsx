import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          // Verifica el token obteniendo los datos del usuario
          const response = await api.get('/auth/me');
          const userData = response.data.data.user;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Token inválido o expirado');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al iniciar sesión' 
      };
    }
  };

  const registerTenant = async (tenantData) => {
    try {
      const response = await api.post('/auth/register-tenant', tenantData);
      const resData = response.data.data;
      
      if (resData.paymentPending) {
        return { 
          success: true, 
          paymentPending: true, 
          data: resData,
          message: response.data.message 
        };
      }

      const { user, accessToken, refreshToken } = resData;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { 
        success: true, 
        paymentPending: false, 
        isTrial: Boolean(resData.isTrial),
        data: resData 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al registrar el restaurante' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, tenant: user?.tenant, login, registerTenant, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};