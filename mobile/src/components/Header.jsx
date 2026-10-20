import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Store } from 'lucide-react';
import styles from './Header.module.css';

export const Header = ({ title, subtitle, isOnline = true }) => {
  const { user, tenant } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brandGroup}>
          {tenant?.logoUrl ? (
            <img 
              src={tenant.logoUrl} 
              alt={tenant.name} 
              className={styles.logoImage} 
            />
          ) : (
            <div className={styles.logoPlaceholder}>
              <Store size={18} />
            </div>
          )}
          
          <div className={styles.info}>
            <h1 className={styles.title}>
              {title || tenant?.name || 'NeoFood Móvil'}
            </h1>
            <p className={styles.subtitle}>
              <span>{subtitle || user?.name || 'Operación'}</span>
              <span>•</span>
              <span className={styles.roleBadge}>{user?.role || 'Mesero'}</span>
            </p>
          </div>
        </div>

        <div 
          className={`${styles.statusIndicator} ${!isOnline ? styles.statusOffline : ''}`}
          title={isOnline ? 'Conectado al servidor' : 'Sin conexión'}
        />
      </div>
    </header>
  );
};

export default Header;
