import React from 'react';
import styles from './Brand.module.css';

const Brand = ({ className = '', showFood = true }) => {
  return (
    <span className={className}>
      <span className={styles.brandNeo}>NEO</span>
      {showFood && <span className={styles.brandFood}>FOOD</span>}
    </span>
  );
};

export default Brand;
