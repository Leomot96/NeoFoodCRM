import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 5,
  onPageChange,
  itemName = 'registros'
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalItems <= pageSize && totalPages <= 1) {
    return null; // Si todo cabe en una página, no sobrecargamos la vista
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        start = 1;
        end = maxVisible;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages;
      }

      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={styles.paginationBar}>
      <div className={styles.paginationInfo}>
        Mostrando <strong>{startItem}</strong> - <strong>{endItem}</strong> de <strong>{totalItems}</strong> {itemName}
      </div>

      <div className={styles.paginationControls}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={styles.paginationBtn}
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {pages[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className={styles.paginationBtn}
            >
              1
            </button>
            {pages[0] > 2 && <span className={styles.paginationEllipsis}>…</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`${styles.paginationBtn} ${page === currentPage ? styles.paginationBtnActive : ''}`}
          >
            {page}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className={styles.paginationEllipsis}>…</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className={styles.paginationBtn}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={styles.paginationBtn}
          title="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
