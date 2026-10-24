import React, { useState, useEffect, useRef } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import api from './services/api';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoginScreen from './views/LoginScreen';
import TablesScreen from './views/TablesScreen';
import OrderScreen from './views/OrderScreen';
import ActiveOrdersScreen from './views/ActiveOrdersScreen';
import CashScreen from './views/CashScreen';
import CustomersScreen from './views/CustomersScreen';
import SettingsScreen from './views/SettingsScreen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { ImpactStyle } from '@capacitor/haptics';
import { Sparkles, X } from 'lucide-react';

function MainApp() {
  const { user, loading, triggerHaptic } = useAuth();
  const [activeTab, setActiveTab] = useState('tables');
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState('DINE_IN'); // 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
  const [cashCustomerFilter, setCashCustomerFilter] = useState('');

  // Notificación de nueva orden en tienda virtual
  const [storeAlert, setStoreAlert] = useState(null);
  const lastNotifiedStoreIdRef = useRef(null);

  // Al iniciar sesión siempre mandar a la sección "Mesas"
  useEffect(() => {
    if (user) {
      setActiveTab('tables');
      setSelectedTable(null);
    }
  }, [user?.id]);

  useEffect(() => {
    const initNativeUI = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#090D16' });
        await SplashScreen.hide();
      } catch (e) {
        // En navegador
      }
    };
    initNativeUI();
  }, []);

  // Reproductor de sonido sintetizado para alertas de tienda virtual
  const playStoreChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(523.25, 0.0, 0.18); // C5
      playTone(659.25, 0.14, 0.18); // E5
      playTone(783.99, 0.28, 0.22); // G5
      playTone(1046.50, 0.44, 0.4); // C6
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  // Monitoreo en segundo plano de pedidos de la tienda virtual
  useEffect(() => {
    if (!user) return;

    const checkStoreOrders = async () => {
      try {
        const res = await api.get('/store/orders/active-count');
        const data = res.data?.data || res.data || {};
        const { pendingCount, latestPending } = data;

        if (latestPending && pendingCount > 0) {
          if (lastNotifiedStoreIdRef.current !== latestPending.id) {
            // Si ya se conocía un pedido anterior, esta es una nueva orden entrante
            if (lastNotifiedStoreIdRef.current !== null) {
              playStoreChime();
              triggerHaptic(ImpactStyle.Heavy);
              setStoreAlert(latestPending);
            }
            lastNotifiedStoreIdRef.current = latestPending.id;
          }
        }
      } catch (err) {
        // Silencioso
      }
    };

    checkStoreOrders();
    const interval = setInterval(checkStoreOrders, 10000);
    return () => clearInterval(interval);
  }, [user, triggerHaptic]);

  // Cierre automático del banner de alerta tras 12 segundos
  useEffect(() => {
    if (storeAlert) {
      const timer = setTimeout(() => setStoreAlert(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [storeAlert]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <img src="/isotipo.svg" alt="NeoFood" style={{ width: 50, height: 50, marginBottom: 14 }} className="animate-spin" />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Iniciando NeoFood Móvil...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Al seleccionar mesa de salón
  const handleSelectTableForOrder = (table) => {
    setSelectedTable(table);
    setOrderType('DINE_IN');
    setActiveTab('order');
  };

  // Al seleccionar pedido rápido para llevar o domicilio
  const handleStartSpecialOrder = (type) => {
    setSelectedTable(null);
    setOrderType(type);
    setActiveTab('order');
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'tables':
        return null; // Mostrar nombre del tenant
      case 'order':
        if (orderType === 'TAKEAWAY') return 'Pedido Para Llevar';
        if (orderType === 'DELIVERY') return 'Pedido a Domicilio';
        return selectedTable ? (selectedTable.name || `Mesa ${selectedTable.number}`) : 'Tomar Pedido';
      case 'orders':
        return 'Cocina';
      case 'cash':
        return 'Caja & Ventas de Hoy';
      case 'customers':
        return 'Cartera de Clientes';
      case 'settings':
        return 'Ajustes del Sistema';
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Banner de Notificación de Tienda Virtual */}
      {storeAlert && (
        <div 
          onClick={() => {
            triggerHaptic();
            setActiveTab('orders');
            setStoreAlert(null);
          }}
          style={{
            position: 'fixed',
            top: 14,
            left: 14,
            right: 14,
            zIndex: 9999,
            padding: '12px 16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
            border: '1.5px solid #818CF8',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(129, 140, 248, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A5B4FC' }}>
              <Sparkles size={20} className="animate-bounce" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                ¡Nuevo Pedido en Tienda Virtual! #{storeAlert.orderNumber || ''}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#C7D2FE' }}>
                {storeAlert.customerName || 'Cliente'} • ${Number(storeAlert.totalAmount || 0).toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 8, backgroundColor: '#4F46E5', color: '#FFFFFF' }}>
              Ver
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStoreAlert(null);
              }}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <Header title={getHeaderTitle()} />

      <main className="main-content">
        {activeTab === 'tables' && (
          <TablesScreen 
            onSelectTableForOrder={handleSelectTableForOrder} 
            onStartSpecialOrder={handleStartSpecialOrder}
          />
        )}

        {activeTab === 'order' && (
          <OrderScreen
            selectedTable={selectedTable}
            orderType={orderType}
            onChangeTable={() => setActiveTab('tables')}
            onOrderCompleted={() => setActiveTab('orders')}
          />
        )}

        {activeTab === 'orders' && <ActiveOrdersScreen />}

        {activeTab === 'cash' && (
          <CashScreen 
            initialCustomerSearch={cashCustomerFilter}
            onClearCustomerSearch={() => setCashCustomerFilter('')}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersScreen 
            onNavigateToInvoices={(customer) => {
              setCashCustomerFilter(customer?.name || '');
              setActiveTab('cash');
            }}
          />
        )}

        {activeTab === 'settings' && <SettingsScreen />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
