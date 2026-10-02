import React from 'react';
import styles from './Input.module.css';

export const FormGroup = ({ children, label, required = false, className = '' }) => {
  return (
    <div className={`${styles.formGroup} ${className}`.trim()}>
      {label && (
        <label className={styles.label}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
};

export default FormGroup;
