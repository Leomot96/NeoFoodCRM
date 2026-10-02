import React, { forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({
  className = '',
  icon: Icon,
  disabled = false,
  error,
  ...props
}, ref) => {
  if (Icon) {
    return (
      <div className={styles.inputIconWrapper}>
        <span className={styles.inputIconLeft}>
          <Icon size={18} />
        </span>
        <input
          ref={ref}
          disabled={disabled}
          className={`${styles.input} ${styles.inputWithIcon} ${className}`.trim()}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      ref={ref}
      disabled={disabled}
      className={`${styles.input} ${className}`.trim()}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
