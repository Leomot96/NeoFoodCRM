import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, ShoppingBag, X } from "lucide-react";
import Datepicker from "react-tailwindcss-datepicker";
import CustomSelect from "../../components/ui/CustomSelect";
import api from "../../services/api";

const PurchaseForm = ({ isOpen = true, onClose, onSuccess, onBack }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = onClose || onBack;

  // Datos generales de la compra
  const [formData, setFormData] = useState({
    supplierId: "",
    invoiceNumber: "",
    purchaseDate: {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    },
  });

  // Detalle de la compra (Filas dinámicas)
  const [details, setDetails] = useState([
    {
      id: Date.now(),
      ingredientId: "",
      quantity: "",
      unitCost: "",
      totalCost: "",
    },
  ]);

  // ==========================================
  // ESTADOS PARA MODALES DE CREACIÓN RÁPIDA
  // ==========================================
  const [supplierModal, setSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    nit: "",
    phone: "",
    email: "",
    address: "",
  });

  // Guardamos también el ID de la fila desde donde se abrió para autoseleccionarlo luego
  const [ingredientModal, setIngredientModal] = useState({
    isOpen: false,
    rowId: null,
  });
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    unit: "Unidad",
    minStock: 0,
  });

  const resetForm = () => {
    setFormData({
      supplierId: "",
      invoiceNumber: "",
      purchaseDate: {
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      },
    });
    setDetails([
      {
        id: Date.now(),
        ingredientId: "",
        quantity: "",
        unitCost: "",
        totalCost: "",
      },
    ]);
    setError("");
  };

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, ingredientsRes] = await Promise.all([
        api.get("/purchases/suppliers"),
        api.get("/inventory/ingredients"),
      ]);
      setSuppliers(suppliersRes.data.data);
      setIngredients(ingredientsRes.data.data);
    } catch (err) {
      setError("Error al cargar datos base. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // ==========================================
  // MANEJO DE FILAS
  // ==========================================
  const addRow = () =>
    setDetails([
      ...details,
      { id: Date.now(), ingredientId: "", quantity: "", unitCost: "", totalCost: "" },
    ]);

  const removeRow = (id) => {
    if (details.length > 1) setDetails(details.filter((row) => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    setDetails(
      details.map((row) => {
        if (row.id !== id) return row;

        const newRow = { ...row, [field]: value };
        const q = parseFloat(newRow.quantity) || 0;

        // Si el usuario cambia la Cantidad o el Costo Unitario -> Calculamos el Total
        if (field === "quantity" || field === "unitCost") {
          const c = parseFloat(newRow.unitCost) || 0;
          newRow.totalCost = q > 0 && c > 0 ? (q * c).toFixed(2) : "";
        }
        // Si el usuario cambia el Costo Total (lo que dice la factura) -> Calculamos el Unitario
        else if (field === "totalCost") {
          const t = parseFloat(newRow.totalCost) || 0;
          newRow.unitCost = q > 0 && t > 0 ? (t / q).toFixed(2) : "";
        }

        return newRow;
      }),
    );
  };

  const calculateGrandTotal = () => {
    return details.reduce(
      (sum, row) => sum + (parseFloat(row.totalCost) || 0),
      0,
    );
  };

  // ==========================================
  // CREACIÓN RÁPIDA DE PROVEEDOR
  // ==========================================
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/purchases/suppliers", newSupplier);
      const createdSupplier = response.data.data;

      setSuppliers([...suppliers, createdSupplier]);
      setFormData({ ...formData, supplierId: createdSupplier.id });

      setSupplierModal(false);
      setNewSupplier({ name: "", nit: "", phone: "", email: "", address: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Error al crear proveedor");
    }
  };

  // ==========================================
  // CREACIÓN RÁPIDA DE INGREDIENTE
  // ==========================================
  const handleCreateIngredient = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/inventory/ingredients", newIngredient);
      const createdIngredient = response.data.data;

      setIngredients([...ingredients, createdIngredient]);
      updateRow(ingredientModal.rowId, "ingredientId", createdIngredient.id);

      setIngredientModal({ isOpen: false, rowId: null });
      setNewIngredient({ name: "", unit: "Unidad", minStock: 0 });
    } catch (err) {
      alert(err.response?.data?.message || "Error al crear ingrediente");
    }
  };

  // ==========================================
  // ENVIAR COMPRA
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.supplierId)
      return setError("Debes seleccionar un proveedor.");
    const validDetails = details.filter(
      (row) => row.ingredientId && row.quantity && row.unitCost,
    );
    if (validDetails.length === 0)
      return setError("Debes agregar al menos un ingrediente válido.");

    try {
      setIsSubmitting(true);
      await api.post("/purchases", {
        supplierId: formData.supplierId,
        invoiceNumber: formData.invoiceNumber,
        purchaseDate:
          formData.purchaseDate?.startDate ||
          new Date().toISOString().split("T")[0],
        details: validDetails.map((row) => ({
          ingredientId: row.ingredientId,
          quantity: parseFloat(row.quantity),
          unitCost: parseFloat(row.unitCost),
        })),
      });
      alert("Compra registrada exitosamente.");
      resetForm();
      if (onSuccess) {
        onSuccess();
      } else if (handleClose) {
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error al registrar la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="neo-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && handleClose) handleClose();
      }}
    >
      <div className="neo-modal neo-modal-2xl" style={{ maxHeight: "92vh", maxWidth: "64rem" }}>
        {/* MODAL HEADER */}
        <div className="neo-modal-header">
          <h2 className="neo-modal-title">
            <ShoppingBag style={{ color: "var(--primary)" }} size={22} />
            <span>Registrar Nueva Compra</span>
          </h2>
          {handleClose && (
            <button
              type="button"
              onClick={handleClose}
              className="neo-modal-close-btn"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Cargando datos del sistema...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}
          >
            {/* MODAL BODY (SCROLLABLE) */}
            <div className="neo-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {error && (
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    backgroundColor: "var(--danger-bg)",
                    color: "var(--danger-text)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              {/* DATOS DE LA FACTURA */}
              <div className="compras-card">
                <div className="compras-form-grid">
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Proveedor *</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ flex: 1 }}>
                        <CustomSelect
                          value={formData.supplierId}
                          onChange={(val) =>
                            setFormData({ ...formData, supplierId: val })
                          }
                          options={suppliers.map((s) => ({
                            value: s.id,
                            label: `${s.name} ${s.nit ? `(${s.nit})` : ""}`,
                          }))}
                          placeholder="-- Selecciona un proveedor --"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSupplierModal(true)}
                        className="neo-btn neo-btn-secondary"
                        style={{ padding: "0.65rem" }}
                        title="Nuevo Proveedor"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Número de Factura</label>
                    <input
                      type="text"
                      placeholder="Ej. FAC-2026-104"
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, invoiceNumber: e.target.value })
                      }
                      className="neo-input"
                    />
                  </div>

                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Fecha de Compra *</label>
                    <Datepicker
                      primaryColor="indigo"
                      useRange={false}
                      asSingle={true}
                      value={formData.purchaseDate}
                      onChange={(newValue) =>
                        setFormData({ ...formData, purchaseDate: newValue })
                      }
                      displayFormat="DD/MM/YYYY"
                      inputClassName="neo-input"
                    />
                  </div>
                </div>
              </div>

              {/* DETALLE DE INGREDIENTES */}
              <div className="compras-card">
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      margin: 0,
                    }}
                  >
                    Detalle de Ingredientes
                  </h3>
                </div>

                <div className="compras-table-wrapper">
                  <table className="compras-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: "42%" }}>Ingrediente</th>
                        <th style={{ width: "16%" }}>Cantidad</th>
                        <th style={{ width: "18%" }}>Costo Unit. ($)</th>
                        <th style={{ width: "18%", textAlign: "right" }}>Subtotal</th>
                        <th style={{ width: "6%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <div style={{ flex: 1 }}>
                                <CustomSelect
                                  value={row.ingredientId}
                                  onChange={(val) =>
                                    updateRow(row.id, "ingredientId", val)
                                  }
                                  options={ingredients.map((ing) => ({
                                    value: ing.id,
                                    label: `${ing.name} (${ing.unit})`,
                                  }))}
                                  placeholder="Selecciona ingrediente..."
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setIngredientModal({ isOpen: true, rowId: row.id })
                                }
                                className="neo-btn neo-btn-secondary"
                                style={{ padding: "0.6rem" }}
                                title="Crear nuevo ingrediente"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(row.id, "quantity", e.target.value)
                              }
                              className="neo-input"
                              style={{ padding: "0.45rem 0.65rem" }}
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="$ 0"
                              value={row.unitCost}
                              onChange={(e) =>
                                updateRow(row.id, "unitCost", e.target.value)
                              }
                              className="neo-input"
                              style={{ padding: "0.45rem 0.65rem" }}
                            />
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="$ 0"
                              value={row.totalCost}
                              onChange={(e) =>
                                updateRow(row.id, "totalCost", e.target.value)
                              }
                              className="neo-input"
                              style={{ padding: "0.45rem 0.65rem", textAlign: "right" }}
                            />
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              disabled={details.length === 1}
                              className="neo-btn neo-btn-ghost"
                              style={{
                                padding: "0.4rem",
                                color: details.length === 1 ? "var(--text-muted)" : "#ef4444",
                              }}
                              title="Eliminar fila"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-subtle)",
                  }}
                >
                  <button
                    type="button"
                    onClick={addRow}
                    className="neo-btn neo-btn-secondary"
                  >
                    <Plus size={16} /> Agregar Fila
                  </button>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        margin: "0 0 0.15rem 0",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Total de la Compra
                    </p>
                    <p
                      className="compras-total-amount"
                      style={{
                        color: "var(--primary)",
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: 900,
                      }}
                    >
                      $ {calculateGrandTotal().toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="neo-modal-footer">
              {handleClose && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="neo-btn neo-btn-secondary"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="neo-btn neo-btn-primary"
                style={{ padding: "0.65rem 1.75rem" }}
              >
                <Save size={18} />
                <span>{isSubmitting ? "Registrando..." : "Confirmar Compra"}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL: NUEVO PROVEEDOR */}
      {/* ========================================= */}
      {supplierModal && (
        <div
          className="neo-modal-backdrop"
          style={{ zIndex: 100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSupplierModal(false);
          }}
        >
          <div className="neo-modal" style={{ maxWidth: "28rem" }}>
            <div className="neo-modal-header">
              <h3 className="neo-modal-title">Crear Proveedor Rápido</h3>
              <button
                type="button"
                onClick={() => setSupplierModal(false)}
                className="neo-modal-close-btn"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div
                className="neo-modal-body"
                style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
              >
                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">Nombre / Razón Social *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Distribuidora Central"
                    value={newSupplier.name}
                    onChange={(e) =>
                      setNewSupplier({ ...newSupplier, name: e.target.value })
                    }
                    className="neo-input"
                  />
                </div>
                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">NIT / Documento</label>
                  <input
                    type="text"
                    placeholder="Ej. 900.123.456-7"
                    value={newSupplier.nit}
                    onChange={(e) =>
                      setNewSupplier({ ...newSupplier, nit: e.target.value })
                    }
                    className="neo-input"
                  />
                </div>
                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. 310 123 4567"
                    value={newSupplier.phone}
                    onChange={(e) =>
                      setNewSupplier({ ...newSupplier, phone: e.target.value })
                    }
                    className="neo-input"
                  />
                </div>
              </div>
              <div className="neo-modal-footer">
                <button
                  type="button"
                  onClick={() => setSupplierModal(false)}
                  className="neo-btn neo-btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="neo-btn neo-btn-primary">
                  Crear Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL: NUEVO INGREDIENTE */}
      {/* ========================================= */}
      {ingredientModal.isOpen && (
        <div
          className="neo-modal-backdrop"
          style={{ zIndex: 100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setIngredientModal({ isOpen: false, rowId: null });
          }}
        >
          <div className="neo-modal" style={{ maxWidth: "26rem" }}>
            <div className="neo-modal-header">
              <h3 className="neo-modal-title">Crear Ingrediente Rápido</h3>
              <button
                type="button"
                onClick={() =>
                  setIngredientModal({ isOpen: false, rowId: null })
                }
                className="neo-modal-close-btn"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateIngredient}>
              <div
                className="neo-modal-body"
                style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
              >
                <div className="neo-form-group" style={{ marginBottom: 0 }}>
                  <label className="neo-label">Nombre del Ingrediente *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Tomate, Carne de res..."
                    value={newIngredient.name}
                    onChange={(e) =>
                      setNewIngredient({ ...newIngredient, name: e.target.value })
                    }
                    className="neo-input"
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                  }}
                >
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Unidad de Medida</label>
                    <CustomSelect
                      value={newIngredient.unit}
                      onChange={(val) =>
                        setNewIngredient({ ...newIngredient, unit: val })
                      }
                      options={[
                        { value: "Unidad", label: "Unidad (un)" },
                        { value: "Kg", label: "Kilogramo (Kg)" },
                        { value: "Gr", label: "Gramo (Gr)" },
                        { value: "Litro", label: "Litro (L)" },
                        { value: "Ml", label: "Mililitro (ml)" },
                        { value: "Lbs", label: "Libra (Lbs)" },
                      ]}
                      placeholder="Unidad (un)"
                    />
                  </div>
                  <div className="neo-form-group" style={{ marginBottom: 0 }}>
                    <label className="neo-label">Stock Mínimo</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newIngredient.minStock}
                      onChange={(e) =>
                        setNewIngredient({
                          ...newIngredient,
                          minStock: parseFloat(e.target.value),
                        })
                      }
                      className="neo-input"
                    />
                  </div>
                </div>
              </div>
              <div className="neo-modal-footer">
                <button
                  type="button"
                  onClick={() =>
                    setIngredientModal({ isOpen: false, rowId: null })
                  }
                  className="neo-btn neo-btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="neo-btn neo-btn-primary">
                  Crear Ingrediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseForm;
