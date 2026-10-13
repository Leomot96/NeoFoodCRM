import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, ShieldCheck } from 'lucide-react';
import styles from './CookieBanner.module.css';

const COOKIE_STORAGE_KEY = 'neofood_cookies_accepted';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!accepted) {
        // Retraso de 1 segundo para no competir con el primer render
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // Ignorar si localStorage está deshabilitado
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'true');
    } catch (e) {}
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside className={styles.bannerWrapper} role="dialog" aria-live="polite" aria-label="Aviso de Cookies">
      <div className={styles.bannerCard}>
        <div className={styles.bannerIconWrapper}>
          <Cookie size={22} className={styles.cookieIcon} />
        </div>

        <div className={styles.bannerContent}>
          <div className={styles.bannerHeader}>
            <span className={styles.bannerTitle}>Tu Privacidad y Uso de Cookies</span>
            <div className={styles.securityPill}>
              <ShieldCheck size={12} />
              <span>Sin rastreo publicitario</span>
            </div>
          </div>
          <p className={styles.bannerText}>
            Utilizamos almacenamiento local y cookies técnicas indispensables para mantener tu sesión segura en el POS y recordar la sede de tu restaurante. No vendemos ni compartimos tus datos.{' '}
            <Link to="/cookies" className={styles.bannerLink}>
              Conoce nuestra Política de Cookies
            </Link>{' '}
            y{' '}
            <Link to="/privacidad" className={styles.bannerLink}>
              Privacidad
            </Link>.
          </p>
        </div>

        <div className={styles.bannerActions}>
          <button
            type="button"
            onClick={handleAccept}
            className={styles.acceptBtn}
          >
            Aceptar y Continuar
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className={styles.closeBtn}
            aria-label="Cerrar aviso de cookies"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CookieBanner;
