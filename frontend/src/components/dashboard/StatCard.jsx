import React from 'react';
import styles from './StatCard.module.css';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => {
  const colorMap = {
    'stat-icon-blue': styles.iconBlue || 'stat-icon-blue',
    'stat-icon-indigo': styles.iconIndigo || 'stat-icon-indigo',
    'stat-icon-emerald': styles.iconEmerald || 'stat-icon-emerald',
    'stat-icon-amber': styles.iconAmber || 'stat-icon-amber',
  };
  const appliedClass = colorMap[colorClass] || styles[colorClass] || colorClass;

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <p className={styles.title}>{title}</p>
        <h3 className={styles.value}>{value}</h3>
        {subtitle && (
          <p className={styles.subtitle}>
            {subtitle}
          </p>
        )}
      </div>
      <div className={`${styles.iconBox} ${appliedClass}`}>
        <Icon size={22} />
      </div>
    </div>
  );
};

export default StatCard;