import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Server, Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './LoginScreen.module.css';

export const LoginScreen = () => {
  const { login, serverUrl, changeServerUrl, pingServer, triggerHaptic } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado del modal de configuración de servidor / IP
  const [showServerModal, setShowServerModal] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  useEffect(() => {
    setTempUrl(serverUrl);
  }, [serverUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const result = await login(email, password);
    setLoading(false);

    if (!result.ok) {
      setErrorMsg(result.message);
    }
  };

  const handleTestConnection = async () => {
    setTestingPing(true);
    setPingResult(null);
    triggerHaptic();
    const res = await pingServer(tempUrl);
    setTestingPing(false);
    setPingResult(res);
  };

  const handleSaveServer = async () => {
    triggerHaptic();
    await changeServerUrl(tempUrl);
    setShowServerModal(false);
    setPingResult(null);
  };

  return (
    <div className={styles.container}>
      {/* Botón superior para configurar servidor */}
      <div className={styles.topBar}>
        <button
          onClick={() => {
            triggerHaptic();
            setShowServerModal(true);
          }}
          className={styles.serverButton}
        >
          <Server size={14} />
          <span>Servidor</span>
        </button>
      </div>

      {/* Marca e Identidad Oficial NeoFood */}
      <div className={styles.centerContent}>
        <div className={styles.logoContainer}>
          <img src="/isotipo.svg" alt="NeoFood Isotipo" className={styles.officialIsotipo} />
          <img src="/logo_blanco.svg" alt="NeoFood" className={styles.officialLogo} />
        </div>

        <div className={styles.brandHeader}>
          <p className={styles.brandSubtitle}>Operación Móvil POS</p>
        </div>

        {/* Mensaje de error */}
        {errorMsg && (
          <div className={`${styles.errorBox} animate-fade-in`}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className={styles.errorTitle}>No se pudo iniciar sesión</p>
              <p className={styles.errorDetail}>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Correo electrónico</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@restaurante.com"
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Contraseña</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePassButton}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                <span>Ingresar al Restaurante</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pie de página Oficial similar a la versión web */}
      <footer className={styles.footer}>
        <div className={styles.footerBrandRow}>
          <img src="/isotipo.svg" alt="NeoFood" className={styles.footerIsotipo} />
          <img src="/logo_blanco.svg" alt="NeoFood" className={styles.footerLogo} />
        </div>
        <p className={styles.footerTagline}>Sistema Integral de Gestión Gastronómica</p>
        <p className={styles.footerCopy}>
          &copy; {new Date().getFullYear()} Todos los derechos reservados &bull; v1.8.1-mobile
        </p>
        <p className={styles.footerAuthor}>
          Creado por <strong>Leonardo Ramirez</strong>
        </p>
        <p className={styles.footerIpInfo}>
          Servidor: <span className={styles.footerIp}>{serverUrl || 'Por configurar'}</span>
        </p>
      </footer>

      {/* Modal de Configuración de Servidor / IP */}
      {showServerModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} animate-slide-up`}>
            <div className={styles.modalHeader}>
              <Server size={20} />
              <h3 className={styles.modalTitle}>Configurar Conexión Local</h3>
            </div>

            <p className={styles.modalDesc}>
              Ingresa la dirección IP de tu computadora para que la app se conecte al backend de NeoFood en tu red WiFi.
            </p>

            <div className={styles.inputGroup}>
              <label className={styles.label}>URL o IP del Servidor</label>
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="http://192.168.0.16:4000/api/v1"
                className={styles.input}
                style={{ paddingLeft: '14px', fontFamily: 'monospace', fontSize: '13px' }}
              />
            </div>

            {/* Resultado de prueba */}
            {pingResult && (
              <div className={pingResult.ok ? styles.pingSuccess : styles.pingError}>
                {pingResult.ok ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>¡Conexión exitosa con el servidor NeoFood!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    <span>{pingResult.message || 'No se pudo conectar.'}</span>
                  </>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingPing}
                className={styles.btnSecondary}
              >
                {testingPing ? 'Probando...' : 'Probar IP'}
              </button>

              <button
                type="button"
                onClick={handleSaveServer}
                className={styles.btnPrimary}
              >
                Guardar
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowServerModal(false)}
              className={styles.btnCancel}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
