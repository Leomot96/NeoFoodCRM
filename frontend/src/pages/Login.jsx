import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  MessageCircle,
  Pizza,
  Coffee,
  Flame,
  Beer,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import styles from './Login.module.css';

const QUICK_DEMOS = [
  { id: 'pizzeria', name: 'Pizzería', email: 'pizzeria@demo.com', icon: Pizza, color: '#e11d48' },
  { id: 'cafe', name: 'Café', email: 'cafe@demo.com', icon: Coffee, color: '#d97706' },
  { id: 'parrilla', name: 'Parrilla', email: 'parrilla@demo.com', icon: Flame, color: '#ea580c' },
  { id: 'gastrobar', name: 'Gastrobar', email: 'gastrobar@demo.com', icon: Beer, color: '#8b5cf6' },
  { id: 'rapidas', name: 'Rápidas', email: 'rapidas@demo.com', icon: UtensilsCrossed, color: '#2563eb' }
];

const Login = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email');
  const isDemoFromUrl = searchParams.get('demo') === '1' || !!urlEmail;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemoName, setActiveDemoName] = useState('');

  useEffect(() => {
    if (urlEmail) {
      setEmail(urlEmail);
      setPassword('demo1234');
      const found = QUICK_DEMOS.find(d => d.email.toLowerCase() === urlEmail.toLowerCase());
      if (found) setActiveDemoName(found.name);
    }
  }, [urlEmail]);

  const handleSelectDemo = (demo) => {
    if (email.toLowerCase() === demo.email.toLowerCase()) {
      // Al volver a clickear el demo activo: deseleccionar y limpiar campos
      setEmail('');
      setPassword('');
      setActiveDemoName('');
      setError('');
      return;
    }
    setEmail(demo.email);
    setPassword('demo1234');
    setActiveDemoName(demo.name);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginTopNavRow}>
            <Link to="/landing" className={styles.loginBackLink}>
              ← Conoce más sobre NeoFood
            </Link>
          </div>
          <div className={styles.loginLogoBox}>
            <img src="/isotipo.svg" alt="NeoFood" className={styles.loginIsotipoImg} />
            <img src="/logo_negro.svg" alt="NeoFood" className={styles.loginLogoTextImg} />
          </div>
          {/* Quick Demos Selector Bar (En una sola línea) */}
          <div className={styles.loginDemosBox}>
            <div className={styles.loginDemosHeader}>
              <Sparkles size={13} style={{ color: '#4f46e5' }} />
              <span>Acceso Rápido a Demos en Vivo:</span>
            </div>
            <div className={styles.loginDemosRow}>
              {QUICK_DEMOS.map((d) => {
                const Icon = d.icon;
                const isSelected = email === d.email;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDemo(d)}
                    className={`${styles.loginDemoPill} ${isSelected ? styles.loginDemoPillActive : ''}`}
                    style={{
                      '--demo-color': d.color
                    }}
                    title={isSelected ? `Demo ${d.name} activa (Clic para deseleccionar)` : `Entrar como Demo ${d.name}`}
                  >
                    <Icon size={13} style={{ color: isSelected ? '#ffffff' : d.color }} />
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>
            {activeDemoName && (
              <div className={styles.loginDemoActiveNotice}>
                <CheckCircle2 size={13} />
                <span>Demo {activeDemoName} activa &bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    setPassword('');
                    setActiveDemoName('');
                  }}
                  className={styles.loginDemoClearBtn}
                  title="Limpiar campos para escribir mi correo y contraseña"
                >
                  Deseleccionar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.loginBody}>
          {error && (
            <div className={styles.loginError}>
              <p className={styles.loginErrorText}>{error}</p>
              {(error.includes('verificación de pago') || error.includes('finalizado')) && (
                <div style={{ marginTop: '0.65rem' }}>
                  <a
                    href={`https://wa.me/573101234567?text=Hola%20Soporte%20NeoFood,%20mi%20cuenta%20(${encodeURIComponent(email)})%20está%20pendiente%20de%20activación/verificación%20de%20pago.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.775rem',
                      fontWeight: '700',
                      color: '#047857',
                      backgroundColor: '#ecfdf5',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #a7f3d0',
                      textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={14} />
                    <span>Contactar a Soporte por WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <div className={styles.loginField}>
              <label className={styles.loginLabel}>
                Correo Electrónico
              </label>
              <div className={styles.loginInputWrapper}>
                <div className={styles.loginInputIcon}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (activeDemoName) setActiveDemoName('');
                  }}
                  className={styles.loginInput}
                  placeholder="admin@neofood.com"
                />
              </div>
            </div>

            <div className={styles.loginField}>
              <label className={styles.loginLabel}>
                Contraseña
              </label>
              <div className={styles.loginInputWrapper}>
                <div className={styles.loginInputIcon}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (activeDemoName) setActiveDemoName('');
                  }}
                  className={`${styles.loginInput} ${styles.loginInputPassword}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.loginPasswordToggle}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.loginSubmitBtn}
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>

          <div className={styles.loginRegisterPrompt}>
            <p className={styles.loginRegisterText}>¿Quieres abrir una nueva sede o restaurante?</p>
            <Link to="/registro" className={styles.loginRegisterBtn}>
              <Store size={15} />
              <span>Registra tu restaurante aquí</span>
            </Link>
          </div>
        </div>

        <div className={styles.loginFooter}>
          <div className={styles.loginFooterSecurity}>
            <ShieldCheck size={15} />
            <span>Acceso Seguro &bull;</span>
            <img src="/logo_negro.svg" alt="NeoFood" className={styles.loginCardFooterLogo} />
          </div>
        </div>
      </div>

      <footer className={styles.loginPageFooter}>
        <div className={styles.loginFooterLegalLinks}>
          <Link to="/terminos" target="_blank">Términos de Servicio</Link>
          <span>&bull;</span>
          <Link to="/privacidad" target="_blank">Privacidad</Link>
          <span>&bull;</span>
          <Link to="/cookies" target="_blank">Cookies</Link>
          <span>&bull;</span>
          <Link to="/sla" target="_blank">SLA</Link>
        </div>
        <p className={styles.loginFooterCopy}>
          &copy; {new Date().getFullYear()} NeoFood &bull; v1.9.0 &bull; Diseñado por <strong>Leonardo Ramirez</strong>
        </p>
      </footer>
    </div>
  );
};

export default Login;