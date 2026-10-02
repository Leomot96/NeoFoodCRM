import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, FormGroup } from '../ui/Input';
import styles from './CategoryForm.module.css';

const CategoryForm = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || ''
      });
    } else if (isOpen) {
      setFormData({ name: '', description: '' });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error al guardar categoría", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={initialData ? 'Editar Categoría' : 'Nueva Categoría'}
      icon={<Layers style={{ color: 'var(--primary)' }} size={20} />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="category-form"
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Categoría')}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} style={{ margin: 0 }}>
        <div className={styles.body}>
          <FormGroup label="Nombre" required>
            <Input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ej. Hamburguesas"
            />
          </FormGroup>
          
          <FormGroup label="Descripción">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="neo-textarea"
              placeholder="Descripción opcional..."
              rows="3"
            />
          </FormGroup>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryForm;