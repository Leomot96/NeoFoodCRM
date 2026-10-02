import React from 'react';
import styles from './Badge.module.css';

const Badge = ({
  children,
  variant = 'primary', // primary, success, warning, danger, info, credit
  className = '',
  icon,
  ...props
}) => {
  const variantClass = styles[variant] || styles.primary;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`.trim()} {...props}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
