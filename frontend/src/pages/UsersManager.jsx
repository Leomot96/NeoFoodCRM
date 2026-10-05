import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, UserX, CheckCircle, AlertTriangle, Phone, Eye, EyeOff } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import { Pagination } from '../components/ui';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './UsersManager.module.css';
import { validatePassword } from '../utils/passwordValidator';

const UsersManager = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]); // Nuevo estado para los roles de la BD
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Estado para modal de confirmación de eliminación
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const plan = currentUser?.tenant?.plan;
  const maxUsers = typeof plan?.maxUsers === 'number' ? plan.maxUsers : -1;
  const isLimitReached = maxUsers !== -1 && users.length >= maxUsers;

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', roleId: '', isActive: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Cargamos usuarios y roles al mismo tiempo
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles')
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name, 
        email: user.email, 
        phone: user.phone || '', 
        password: '', 
        roleId: user.roleId, 
        isActive: user.isActive 
      });
    } else {
      if (isLimitReached) {
        alert(`Has alcanzado el límite de ${maxUsers} usuarios permitidos en tu ${plan?.name || 'plan actual'}. Para registrar más personal, actualiza a Plan Pro o Enterprise.`);
        return;
      }
      setEditingUser(null);
      // Seleccionamos el primer rol por defecto si existe
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        password: '', 
        roleId: roles.length > 0 ? roles[0].id : '', 
        isActive: true 
      });
    }
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.roleId) return alert("Debes seleccionar un rol válido.");

    if (!editingUser && isLimitReached) {
      alert(`Has alcanzado el límite de ${maxUsers} usuarios permitidos en tu ${plan?.name || 'plan actual'}.`);
      return;
    }

    if (!editingUser || (formData.password && formData.password.trim() !== '')) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        alert(passwordValidation.message);
        return;
      }
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchData(); // Recargamos la tabla
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/users/${userToDelete.id}`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar usuario');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleBadge = (roleName) => {
    const name = roleName?.toUpperCase() || 'DESCONOCIDO';
    if (name.includes('ADMIN')) return <span className={`${styles.roleBadge} ${styles.roleBadgeAdmin}`}>{name}</span>;
    if (name.includes('SUPERVISOR')) return <span className={`${styles.roleBadge} ${styles.roleBadgeSupervisor}`}>{name}</span>;
    if (name.includes('CAJA') || name.includes('CAJERO')) return <span className={`${styles.roleBadge} ${styles.roleBadgeCaja}`}>{name}</span>;
    return <span className={`${styles.roleBadge} ${styles.roleBadgeDefault}`}>{name}</span>;
  };

  return (
    <div className={styles.usersPage}>
      {/* HEADER */}
      <div className={styles.usersHeader}>
        <div>
          <h1 className={styles.usersTitle}>
            <Users style={{ color: 'var(--primary)' }} /> Personal y Accesos
          </h1>
          <p className={styles.usersSubtitle}>
            Gestiona los usuarios del sistema y sus niveles de permiso
            {maxUsers !== -1 && (
              <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: isLimitReached ? '#ef4444' : 'var(--primary)' }}>
                &bull; {users.length} de {maxUsers} usuarios en {plan?.name || 'Plan Actual'}
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="neo-btn neo-btn-primary"
          disabled={isLimitReached}
          style={isLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          title={isLimitReached ? "Has alcanzado el límite máximo de usuarios para tu plan" : "Crear nuevo usuario"}
        >
          <Plus size={20} /> Nuevo Usuario
        </button>
      </div>

      {/* ALERTA DE LÍMITE DE USUARIOS */}
      {isLimitReached && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          borderRadius: '0.75rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '0.875rem'
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
          <div>
            <strong>Límite de usuarios alcanzado:</strong> Tu plan actual ({plan?.name || 'Básico'}) permite un máximo de {maxUsers} usuarios ({users.length} registrados). Para registrar más personal, actualiza a Plan Pro o Enterprise.
          </div>
        </div>
      )}

      {/* TABLA */}
      <div className="neo-table-card">
        <div className="neo-table-responsive">
          <table className="neo-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario / Correo</th>
                <th>Celular / Teléfono</th>
                <th className="text-center">Rol</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <UserX size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                      <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No hay usuarios registrados</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Crea nuevos usuarios y asígnales roles en el sistema.</p>
                    </div>
                  </td>
                </tr>
              ) : users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(user => (
                <tr key={user.id} style={{ opacity: !user.isActive ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {user.phone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={13} style={{ color: 'var(--text-muted)' }} /> {user.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No registrado</span>
                    )}
                  </td>
                  {/* Rol */}
                  <td className="text-center">{getRoleBadge(user.role?.name)}</td>
                  <td className="text-center">
                    {user.isActive ? (
                      <span className="neo-badge neo-badge-success"><CheckCircle size={14} /> Activo</span>
                    ) : (
                      <span className="neo-badge neo-badge-danger"><UserX size={14} /> Inactivo</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => openModal(user)}
                        className="neo-action-icon-btn"
                        title="Editar usuario"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (user.id === currentUser?.id) {
                            alert('No puedes eliminar tu propia cuenta en uso.');
                            return;
                          }
                          setUserToDelete(user);
                          setIsDeleteModalOpen(true);
                        }}
                        className="neo-action-icon-btn danger"
                        title={user.id === currentUser?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario permanentemente"}
                        disabled={user.id === currentUser?.id}
                        style={user.id === currentUser?.id ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={users.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="usuarios"
        />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal" style={{ maxWidth: '44rem' }}>
            <div className="neo-modal-header">
              <h2 className="neo-modal-title">
                <Shield style={{ color: 'var(--primary)' }} /> {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="neo-modal-close-btn" title="Cerrar">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="neo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Nombre Completo *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="neo-input"
                    />
                  </div>

                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Correo / Usuario de Ingreso *</label>
                    <input
                      required
                      type="text"
                      placeholder="usuario@neofood.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="neo-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Número de Celular / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="Ej. 310 123 4567"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="neo-input"
                    />
                  </div>

                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Rol en el sistema *</label>
                    <CustomSelect
                      value={formData.roleId}
                      onChange={val => setFormData({ ...formData, roleId: val })}
                      options={roles.map(r => ({ value: r.id, label: r.name }))}
                      placeholder="Selecciona..."
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">
                      Contraseña {editingUser ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Dejar en blanco para conservar)</span> : '*'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        required={!editingUser}
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres (A-Z, a-z, 0-9, @#$)'}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="neo-input"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {formData.password && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.3rem 0.6rem',
                        marginTop: '0.4rem',
                        fontSize: '0.72rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        padding: '0.4rem 0.6rem'
                      }}>
                        <span style={{ color: validatePassword(formData.password).checks.length ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                          {validatePassword(formData.password).checks.length ? '✓' : '○'} Mín. 8 caracteres
                        </span>
                        <span style={{ color: validatePassword(formData.password).checks.uppercase ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                          {validatePassword(formData.password).checks.uppercase ? '✓' : '○'} Mayúscula (A-Z)
                        </span>
                        <span style={{ color: validatePassword(formData.password).checks.lowercase ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                          {validatePassword(formData.password).checks.lowercase ? '✓' : '○'} Minúscula (a-z)
                        </span>
                        <span style={{ color: validatePassword(formData.password).checks.number ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                          {validatePassword(formData.password).checks.number ? '✓' : '○'} Número (0-9)
                        </span>
                        <span style={{ color: validatePassword(formData.password).checks.special ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                          {validatePassword(formData.password).checks.special ? '✓' : '○'} Especial (!@#$...)
                        </span>
                      </div>
                    )}
                  </div>

                  {editingUser && (
                    <div className="neo-form-group" style={{ marginBottom: 0 }}>
                      <label className="neo-label">Estado de la cuenta</label>
                      <CustomSelect
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={val => setFormData({ ...formData, isActive: val === 'true' })}
                        options={[
                          { value: 'true', label: 'Activo (Acceso permitido)' },
                          { value: 'false', label: 'Inactivo (Bloqueado)' }
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="neo-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="neo-btn neo-btn-secondary">Cancelar</button>
                <button type="submit" className="neo-btn neo-btn-primary">Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {isDeleteModalOpen && userToDelete && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal" style={{ maxWidth: '32rem' }}>
            <div className="neo-modal-header">
              <h2 className="neo-modal-title" style={{ color: '#ef4444' }}>
                <Trash2 size={20} /> Eliminar Usuario Definitivamente
              </h2>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="neo-modal-close-btn"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                ¿Estás seguro de que deseas eliminar permanentemente al usuario <strong>"{userToDelete.name}"</strong> (<code>{userToDelete.email}</code>)?
              </p>

              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.65rem',
                color: '#991b1b',
                fontSize: '0.825rem',
                lineHeight: 1.4
              }}>
                <strong>Atención:</strong> Esta acción es irreversible y eliminará al usuario junto con todos sus registros vinculados en el sistema.
              </div>
            </div>

            <div className="neo-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={deleteLoading}
                className="neo-btn neo-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.65rem',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;