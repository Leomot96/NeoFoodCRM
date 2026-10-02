import React from 'react';
import styles from './Card.module.css';

const Card = ({
  children,
  className = '',
  elevated = false,
  interactive = false,
  as: Component = 'div',
  ...props
}) => {
  const variantClass = interactive 
    ? styles.interactiveSurface 
    : elevated 
      ? styles.surfaceElevated 
      : styles.card;

  return (
    <Component className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
};

export default Card;
