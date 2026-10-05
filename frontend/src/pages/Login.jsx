import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Store } from 'lucide-react';
import styles from './Login.module.css';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
            <Link
              to="/landing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                color: '#4f46e5',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              ← Conoce más sobre NeoFood
            </Link>
          </div>
          <h2 className={styles.loginTitle}>
            <span className={styles.loginTitleNeo1}>Neo</span>
            <span className={styles.loginTitleFood1}>FOOD</span>
          </h2>
          <p className={styles.loginSubtitle}>Ingresa tus credenciales para acceder</p>
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
                    <span>💬 Contactar a Soporte por WhatsApp</span>
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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
            <ShieldCheck size={14} />
            <span>Acceso Seguro &bull; <span className={styles.loginTitleNeo}>NEO</span><span className={styles.loginTitleFood}>FOOD</span></span>
          </div>
        </div>
      </div>

      <footer className={styles.loginPageFooter}>
        <p><span className={styles.loginTitleNeo}>NEO</span><span className={styles.loginTitleFood}>FOOD</span> &bull; Sistema Integral de Gestión Gastronómica</p>
        <p className={styles.loginFooterCopy}>
          &copy; {new Date().getFullYear()} Todos los derechos reservados &bull; v 1.7.5
        </p>
        <p className={styles.loginFooterAuthor}>
          Diseñado por <strong>Leonardo Ramirez</strong>
        </p>
      </footer>
    </div>
  );
};

export default Login;