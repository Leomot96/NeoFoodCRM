import React from 'react';
import styles from './Table.module.css';

export const TableCard = ({ children, className = '' }) => (
  <div className={`${styles.card} ${className}`.trim()}>{children}</div>
);

export const TableResponsive = ({ children, className = '' }) => (
  <div className={`${styles.responsive} ${className}`.trim()}>{children}</div>
);

export const Table = ({ children, className = '' }) => (
  <table className={`${styles.table} ${className}`.trim()}>{children}</table>
);

export default Table;
