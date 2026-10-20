import React from 'react';
import { LayoutGrid, PlusCircle, Clock, Settings, DollarSign, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './BottomNav.module.css';

export const BottomNav = ({ activeTab, onSelectTab, cartCount = 0 }) => {
  const { user, triggerHaptic } = useAuth();

  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toLowerCase();
  const isAdmin = roleName === 'administrador' || roleName === 'admin' || roleName === 'superadmin' || roleName === 'supervisor';

  const tabs = [
    { id: 'tables', label: 'Mesas', icon: LayoutGrid },
    { id: 'order', label: 'Pedido', icon: PlusCircle, badge: cartCount },
    { id: 'orders', label: 'En Curso', icon: Clock },
    { id: 'cash', label: 'Caja', icon: DollarSign },
    ...(isAdmin ? [{ id: 'customers', label: 'Clientes', icon: Users }] : []),
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const handleTabClick = (tabId) => {
    triggerHaptic();
    onSelectTab(tabId);
  };

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.inner}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
            >
              <div className={styles.iconWrapper}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.badge > 0 && (
                  <span className={styles.badge}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={styles.label}>{tab.label}</span>

              {isActive && <div className={styles.activeIndicator} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
