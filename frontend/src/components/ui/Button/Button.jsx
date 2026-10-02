import React from 'react';
import styles from './Button.module.css';

const Button = ({
  children,
  variant = 'primary', // primary, secondary, danger, success, outline, ghost
  size = 'md', // sm, md, lg, iconOnly
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const variantClass = styles[variant] || styles.primary;
  const sizeClass = size !== 'md' ? styles[size] : '';

  return (
    <button
      type={type}
      className={`${styles.btn} ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
