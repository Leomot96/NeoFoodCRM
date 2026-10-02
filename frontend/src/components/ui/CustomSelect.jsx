import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
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

  const selectedOption = options.find(opt => opt.value === value) || null;

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
    const dropdownEstimatedHeight = 220;

    // Abrir hacia arriba si no hay espacio suficiente abajo y hay más espacio arriba
    const openUpwards = spaceBelow < dropdownEstimatedHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    let width = rect.width;

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

  // Recalcular posición al abrir y suscribirse a eventos de resize / scroll
  useEffect(() => {
    if (isOpen) {
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

      // Scroll automático hacia el elemento seleccionado si existe
      const timer = setTimeout(() => {
        if (selectedItemRef.current && dropdownMenuRef.current) {
          selectedItemRef.current.scrollIntoView({ block: 'nearest' });
        }
      }, 10);

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

      {/* Hidden input to handle native HTML5 form validation without focus issues */}
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
            zIndex: 999999
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <ul className="custom-select-list" role="listbox">
            {options.map((option, index) => {
              const isSelected = value === option.value;
              return (
                <li
                  key={`${option.value}-${index}`}
                  ref={isSelected ? selectedItemRef : null}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
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
            {options.length === 0 && (
              <li className="custom-select-empty">
                No hay opciones
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
