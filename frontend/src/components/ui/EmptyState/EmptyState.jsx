import React from 'react';
import styles from './EmptyState.module.css';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`${styles.empty} ${className}`.trim()}>
      {Icon && (
        <div className={styles.icon}>
          <Icon size={48} />
        </div>
      )}
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
