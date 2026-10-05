import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import styles from './CustomSelect.module.css';

const CustomSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  className = "",
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    bottom: 'auto',
    left: 0,
    width: 0,
    placement: 'bottom'
  });

  const triggerRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const selectedItemRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value) || null;

  // Filtrado reactivo de opciones según el texto de búsqueda
  const filteredOptions = options.filter(opt => {
    if (!searchTerm.trim()) return true;
    const label = String(opt.label || '').toLowerCase();
    const query = searchTerm.toLowerCase().trim();
    return label.includes(query);
  });

  // Actualizar posición del dropdown relativo al botón trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Si el trigger no es visible en pantalla (o se scrolleó fuera)
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownEstimatedHeight = 260;

    // Abrir hacia arriba si no hay espacio suficiente abajo y hay más espacio arriba
    const openUpwards = spaceBelow < dropdownEstimatedHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    let width = Math.max(rect.width, 220); // Asegura un ancho mínimo legible para el buscador

    // Asegurar que no se salga horizontalmente de la pantalla
    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }

    setMenuPosition({
      top: openUpwards ? 'auto' : `${rect.bottom + 4}px`,
      bottom: openUpwards ? `${viewportHeight - rect.top + 4}px` : 'auto',
      left: `${Math.max(8, left)}px`,
      width: `${width}px`,
      placement: openUpwards ? 'top' : 'bottom'
    });
  }, []);

  // Recalcular posición al abrir y enfocar el input de búsqueda
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      updatePosition();

      const handleScroll = (event) => {
        // No cerrar ni mover si el scroll es dentro del propio menú desplegable
        if (dropdownMenuRef.current && dropdownMenuRef.current.contains(event.target)) {
          return;
        }
        updatePosition();
      };

      const handleResize = () => {
        updatePosition();
      };

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      // Enfocar automáticamente el input de búsqueda
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
        if (selectedItemRef.current && dropdownMenuRef.current) {
          selectedItemRef.current.scrollIntoView({ block: 'nearest' });
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Cerrar si se hace click fuera (tanto del botón trigger como del menú en el portal)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideTrigger = triggerRef.current && triggerRef.current.contains(event.target);
      const isClickInsideMenu = dropdownMenuRef.current && dropdownMenuRef.current.contains(event.target);
      if (!isClickInsideTrigger && !isClickInsideMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Manejador para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  const handleSelectOption = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0].value);
      }
    }
  };

  return (
    <div className={`custom-select-wrapper ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`custom-select-text ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`custom-select-chevron ${isOpen ? 'rotated' : ''}`} 
        />
      </button>

      {/* Input oculto para validación nativa de formularios */}
      <input 
        type="text" 
        value={value || ''} 
        onChange={() => {}} 
        required={required} 
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, bottom: 0, left: '50%' }}
        tabIndex={-1}
      />

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownMenuRef}
          className={`custom-select-dropdown portal-dropdown placement-${menuPosition.placement}`}
          style={{
            position: 'fixed',
            top: menuPosition.top,
            bottom: menuPosition.bottom,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '280px',
            overflow: 'hidden'
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Barra de búsqueda interactiva */}
          <div 
            style={{ 
              padding: '0.45rem 0.5rem', 
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              position: 'sticky',
              top: 0,
              zIndex: 2
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <Search 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '0.6rem', 
                  color: 'var(--text-muted, #94a3b8)',
                  pointerEvents: 'none'
                }} 
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escribe para filtrar..."
                style={{
                  width: '100%',
                  padding: '0.35rem 1.6rem 0.35rem 2rem',
                  fontSize: '0.8rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--bg-subtle, #f8fafc)',
                  color: 'var(--text-main, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted, #94a3b8)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Lista de opciones filtradas con scroll propio */}
          <ul 
            className="custom-select-list" 
            role="listbox"
            style={{
              overflowY: 'auto',
              flex: 1,
              margin: 0,
              padding: '0.25rem 0'
            }}
          >
            {filteredOptions.map((option, index) => {
              const isSelected = value === option.value;
              return (
                <li
                  key={`${option.value}-${index}`}
                  ref={isSelected ? selectedItemRef : null}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(option.value)}
                  className={`custom-select-option ${isSelected ? 'is-selected' : ''}`}
                >
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="custom-select-check">
                      <Check size={16} />
                    </span>
                  )}
                </li>
              );
            })}
            {filteredOptions.length === 0 && (
              <li className="custom-select-empty" style={{ padding: '1rem', color: 'var(--text-muted, #94a3b8)', textAlign: 'center', fontSize: '0.825rem' }}>
                {options.length === 0 ? "No hay opciones disponibles" : `No hay resultados para "${searchTerm}"`}
              </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
