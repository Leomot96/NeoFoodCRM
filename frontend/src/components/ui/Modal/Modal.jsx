import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md', // sm, md, lg, xl, xxl
  className = '',
  headerStyle = {},
  titleStyle = {},
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = styles[size] || styles.md;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className={`${styles.modal} ${sizeClass} ${className}`.trim()}>
        {(title || icon) && (
          <div className={styles.header} style={headerStyle}>
            <h2 className={styles.title} style={titleStyle}>
              {icon && <span>{icon}</span>}
              {title}
            </h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={styles.closeBtn}
                title="Cerrar"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
