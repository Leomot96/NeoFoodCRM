import React from 'react';
import { Search } from 'lucide-react';
import styles from './Input.module.css';

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  ...props
}) => {
  return (
    <div className={`${styles.searchBox} ${className}`.trim()}>
      <Search size={18} className={styles.searchIcon} />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.searchInput}
        {...props}
      />
    </div>
  );
};

export default SearchInput;
