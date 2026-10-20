import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
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

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('tables');
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState('DINE_IN'); // 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
  const [cashCustomerFilter, setCashCustomerFilter] = useState('');

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
        return 'Pedidos en Curso';
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
        onSelectTab={(tab) => {
          if (tab === 'order' && !selectedTable && orderType === 'DINE_IN') {
            // Si va directo a tomar pedido sin mesa, por defecto Para Llevar o mantiene
            setOrderType('TAKEAWAY');
          }
          setActiveTab(tab);
        }}
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
