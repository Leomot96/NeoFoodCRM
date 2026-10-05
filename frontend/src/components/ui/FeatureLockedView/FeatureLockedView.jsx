import React from 'react';
import { Crown, Sparkles, Check, ArrowRight, MessageCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { SUPPORT_WHATSAPP } from '../../../constants/plans';
import styles from './FeatureLockedView.module.css';

const MODULE_DETAILS = {
  inventory: {
    title: 'Control Total de Inventario y Stock de Materias Primas',
    tag: 'Módulo Pro',
    description: 'Monitorea tus existencias en tiempo real, registra ingresos y salidas de materia prima, y recibe alertas automáticas cuando un ingrediente esté por agotarse.',
    benefits: [
      'Registro de materias primas con unidades de medida precisas (kg, gr, lt, ml, unidad)',
      'Alertas automáticas de stock crítico y reorden',
      'Kárdex de movimientos auditables por fecha y usuario',
      'Descuento automático de existencias'
    ]
  },
  recipes: {
    title: 'Sub-Recetas, Fórmulas y Producción con Costo CMP',
    tag: 'Módulo Pro',
    description: 'Estandariza tus recetas y preparaciones intermedias (salsas, masas, marinados) con costeo exacto mediante Costo Medio Ponderado (CMP).',
    benefits: [
      'Creación de fórmulas maestras con rendimiento y mermas calculadas',
      'Órdenes de producción por lotes que descargan materia prima automáticamente',
      'Cálculo en vivo del costo real por porción de cada platillo',
      'Rentabilidad y margen de ganancia exacto por producto'
    ]
  },
  purchases: {
    title: 'Gestión de Compras y Directorio de Proveedores',
    tag: 'Módulo Pro',
    description: 'Centraliza tus compras de insumos, cuentas por pagar y mantén el historial comercial con cada uno de tus proveedores.',
    benefits: [
      'Órdenes de compra que actualizan el stock de ingredientes automáticamente',
      'Historial de precios de compra para detectar aumentos de costos',
      'Directorio completo de proveedores con NIT, contacto y plazos de pago',
      'Reporte consolidado de egresos por compras de insumos'
    ]
  },
  analytics: {
    title: 'Analítica Avanzada, KPIs y Reportes Financieros en PDF',
    tag: 'Módulo Pro',
    description: 'Toma decisiones basadas en datos reales. Analiza tus ventas horarias, platillos estrella, rentabilidad por categoría y exporta reportes en PDF.',
    benefits: [
      'Consolidado de ventas diarias, semanales y mensuales',
      'Ranking de platillos más vendidos y con mayor margen',
      'Exportación institucional de reportes financieros en PDF',
      'Comparativas históricas de rendimiento del restaurante'
    ]
  }
};

const FeatureLockedView = ({ featureKey = 'inventory', planRequired = 'Plan Pro' }) => {
  const { user } = useAuth();
  const details = MODULE_DETAILS[featureKey] || MODULE_DETAILS.inventory;
  const restaurantName = user?.tenant?.name || 'Mi Restaurante';
  const currentPlanName = user?.tenant?.plan?.name || 'Plan Básico';

  const getWhatsAppUpgradeUrl = () => {
    const message = encodeURIComponent(
      `👋 ¡Hola soporte NeoFood! Deseo solicitar el ascenso al ${planRequired} para mi restaurante "${restaurantName}" y desbloquear el módulo de ${details.title}. ¿Podrían brindarme información para activarlo?`
    );
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`;
  };

  return (
    <div className={styles.lockedContainer}>
      <div className={styles.lockedCard}>
        {/* Encabezado con Corona / Badge */}
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}>
            <Crown size={32} className={styles.crownIcon} />
          </div>
          <span className={styles.badgePro}>{planRequired}</span>
          <h2 className={styles.title}>{details.title}</h2>
          <p className={styles.subtitle}>
            Tu plan actual es <strong>{currentPlanName}</strong>. Este módulo está disponible a partir del <strong>{planRequired}</strong>.
          </p>
        </div>

        {/* Descripción & Beneficios */}
        <div className={styles.contentBody}>
          <p className={styles.description}>{details.description}</p>

          <div className={styles.benefitsGrid}>
            {details.benefits.map((b, idx) => (
              <div key={idx} className={styles.benefitItem}>
                <div className={styles.checkWrapper}>
                  <Check size={16} />
                </div>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparativa Rápida */}
        <div className={styles.compareBox}>
          <div className={styles.planColCurrent}>
            <span className={styles.colLabel}>Tu Plan Actual</span>
            <strong className={styles.colPlanName}>{currentPlanName}</strong>
            <span className={styles.colStatus}>POS, Comandas KDS, Caja y Tienda WhatsApp</span>
          </div>
          <div className={styles.planColDivider}>
            <ArrowRight size={20} />
          </div>
          <div className={styles.planColUpgrade}>
            <span className={styles.colLabel}>Sube a</span>
            <strong className={styles.colPlanNamePro}>{planRequired}</strong>
            <span className={styles.colStatusPro}>Desbloquea Inventario, Sub-Recetas CMP, Compras y Analítica</span>
          </div>
        </div>

        {/* Acciones */}
        <div className={styles.actionsGroup}>
          <a
            href={getWhatsAppUpgradeUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.upgradeBtn}
          >
            <MessageCircle size={18} />
            <span>Actualizar a {planRequired} por WhatsApp</span>
          </a>

          <a
            href="/landing#precios"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryBtn}
          >
            <ExternalLink size={16} />
            <span>Ver Tabla Comparativa de Planes</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FeatureLockedView;
