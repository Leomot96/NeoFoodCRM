import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, User, Server, LogOut, Smartphone } from 'lucide-react';
import { getFullImageUrl } from '../utils/imageUrl';
import styles from './SettingsScreen.module.css';

export const SettingsScreen = () => {
  const { user, tenant, logout, serverUrl, changeServerUrl, pingServer, triggerHaptic } = useAuth();
  const [editingServer, setEditingServer] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [testingPing, setTestingPing] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingStatus(null);
    triggerHaptic();
    const res = await pingServer(tempUrl);
    setTestingPing(false);
    setPingStatus(res);
  };

  const handleSaveUrl = async () => {
    triggerHaptic();
    await changeServerUrl(tempUrl);
    setEditingServer(false);
    setPingStatus(null);
  };

  const handleLogout = () => {
    triggerHaptic();
    if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
      logout();
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Ajustes & Restaurante</h2>

      {/* Tarjeta del Restaurante (Tenant) */}
      <div className={styles.card}>
        <div className={styles.tenantHeader}>
          {tenant?.logoUrl && !logoError ? (
            <img
              src={getFullImageUrl(tenant.logoUrl)}
              alt={tenant.name}
              className={styles.tenantLogo}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className={styles.tenantLogoPlaceholder}>
              <Store size={22} />
            </div>
          )}

          <div>
            <span className={styles.tenantTag}>
              Restaurante Activo
            </span>
            <h3 className={styles.tenantName}>
              {tenant?.name || 'NeoFood CRM'}
            </h3>
            <p className={styles.tenantPlan}>
              Plan: <span className={styles.planHighlight}>{tenant?.plan?.name || 'Estándar'}</span>
            </p>
          </div>
        </div>

        {tenant?.phone && (
          <div className={styles.cardDividerRow}>
            <span>Contacto:</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{tenant.phone}</span>
          </div>
        )}
      </div>

      {/* Tarjeta del Usuario */}
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={styles.userAvatar}>
            <User size={18} />
          </div>
          <div>
            <h3 className={styles.userName}>{user?.name}</h3>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
        </div>

        <div className={styles.cardDividerRow}>
          <span>Rol asignado:</span>
          <span className={styles.roleBadge}>
            {user?.role || 'Mesero'}
          </span>
        </div>
      </div>

      {/* Tarjeta de Servidor & Red */}
      <div className={styles.card}>
        <div className={styles.serverHeaderRow}>
          <div className={styles.serverTitleGroup}>
            <Server size={16} color="var(--primary-light)" />
            <span>Servidor Backend</span>
          </div>

          <button
            onClick={() => {
              triggerHaptic();
              setEditingServer(!editingServer);
            }}
            className={styles.changeIpBtn}
          >
            {editingServer ? 'Cancelar' : 'Cambiar IP'}
          </button>
        </div>

        {editingServer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className={styles.serverInput}
            />
            {pingStatus && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: pingStatus.ok ? 'var(--secondary-light)' : '#F87171',
                }}
              >
                {pingStatus.ok ? '✓ Conexión establecida' : '✗ Falló la conexión'}
              </p>
            )}
            <div className={styles.serverEditGrid}>
              <button
                type="button"
                onClick={handleTestPing}
                disabled={testingPing}
                className={styles.btnTest}
              >
                {testingPing ? 'Probando...' : 'Probar'}
              </button>
              <button
                type="button"
                onClick={handleSaveUrl}
                className={styles.btnSave}
              >
                Guardar IP
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.serverIpBox}>
            {serverUrl}
          </p>
        )}
      </div>

      {/* Información de la App */}
      <div className={styles.versionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Smartphone size={16} color="var(--text-dim)" />
          <span>Versión Nativa</span>
        </div>
        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>v1.8.1-mobile</span>
      </div>

      {/* Botón de Cerrar Sesión */}
      <button
        onClick={handleLogout}
        className={styles.logoutBtn}
      >
        <LogOut size={16} />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
};

export default SettingsScreen;
