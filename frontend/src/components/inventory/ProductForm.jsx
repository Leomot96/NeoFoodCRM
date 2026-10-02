import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ChefHat,
  Settings2,
  PlusCircle,
  Tag,
  GripVertical,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Package,
  Box,
  Check,
  HelpCircle,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import CustomSelect from "../ui/CustomSelect";
import api from "../../services/api";
import inventoryService, { getFullImageUrl } from "../../services/inventory.service";
import styles from "./ProductForm.module.css";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableOption({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

const ProductForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
}) => {
  const [ingredients, setIngredients] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("basic"); // basic, recipe, modifiers, additions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedOptionId, setExpandedOptionId] = useState(null);

  // Estado del producto
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
    showInStore: true,
    trackStock: false,
    isCombo: false,
    stock: 0,
    ingredients: [], // { ingredientId, quantity }
    modifiers: [], // { id, name, isRequired, options: [{ id, name, priceExtra, discountMode, ingredientId, quantity, linkedProductId, ingredients: [] }] }
    additions: [], // { id, name, price, ingredientId, quantity }
  });

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  // Cargar Ingredientes y Productos de referencia al abrir el modal
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get("/inventory/ingredients"),
        api.get("/inventory/products"),
      ])
        .then(([ingRes, prodRes]) => {
          setIngredients(ingRes.data?.data || []);
          const prods = (prodRes.data?.data || []).filter(
            (p) => !initialData || p.id !== initialData.id,
          );
          setAllProducts(prods);
        })
        .catch((err) => console.error("Error cargando insumos/productos", err));
    }
  }, [isOpen, initialData]);

  // Llenar datos si estamos editando
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        price: initialData.price || "",
        imageUrl: initialData.imageUrl || "",
        categoryId: initialData.categoryId || "",
        showInStore: initialData.showInStore !== undefined ? Boolean(initialData.showInStore) : true,
        trackStock: Boolean(initialData.trackStock),
        isCombo: Boolean(initialData.isCombo),
        stock: initialData.stock || 0,
        ingredients: (initialData.ingredients || []).map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
        })),
        modifiers: (initialData.modifiers || []).map((mod) => ({
          id: mod.id || crypto.randomUUID(),
          name: mod.name || "",
          isRequired: mod.isRequired !== false,
          options: (mod.options || []).map((opt) => {
            let discountMode = "none";
            if (opt.linkedProductId) discountMode = "product";
            else if (opt.ingredients && opt.ingredients.length > 0)
              discountMode = "multiple";
            else if (opt.ingredientId) discountMode = "single";

            return {
              id: opt.id || crypto.randomUUID(),
              name: opt.name || "",
              priceExtra: opt.priceExtra || 0,
              discountMode,
              ingredientId: opt.ingredientId || "",
              quantity: opt.quantity || "",
              linkedProductId: opt.linkedProductId || "",
              ingredients: (opt.ingredients || []).map((oi) => ({
                id: oi.id || crypto.randomUUID(),
                ingredientId: oi.ingredientId,
                quantity: oi.quantity,
              })),
            };
          }),
        })),
        additions: (initialData.additions || []).map((add) => ({
          id: add.id || crypto.randomUUID(),
          name: add.name || "",
          price: add.price || "",
          ingredientId: add.ingredientId || "",
          quantity: add.quantity || "",
        })),
      });
      setImageError("");
      setActiveTab("basic");
    } else if (isOpen) {
      setFormData({
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        categoryId: "",
        trackStock: false,
        isCombo: false,
        stock: 0,
        ingredients: [],
        modifiers: [],
        additions: [],
      });
      setImageError("");
      setActiveTab("basic");
    }
  }, [initialData, isOpen]);

  // Manejo de carga de foto del producto
  const handleImageUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("La imagen no debe superar los 5MB.");
      return;
    }

    setImageError("");
    setIsUploadingImage(true);

    try {
      const res = await inventoryService.uploadProductImage(file);
      if (res.success && res.data?.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: res.data.imageUrl,
        }));
      } else {
        setImageError(res.message || "Error al subir la imagen.");
      }
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      setImageError(err.response?.data?.message || "No se pudo subir la foto del producto.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setImageError("");
  };

  if (!isOpen) return null;

  // Drag and Drop para opciones de modificador
  const handleOptionDragEnd = (modIdx, { active, over }) => {
    if (!over || active.id === over.id) return;
    setFormData((prev) => {
      const modifiers = [...prev.modifiers];
      const options = [...modifiers[modIdx].options];
      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      modifiers[modIdx].options = arrayMove(options, oldIndex, newIndex);
      return { ...prev, modifiers };
    });
  };

  // Receta
  const addRecipeItem = () =>
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredientId: "", quantity: "" }],
    }));
  const removeRecipeItem = (index) =>
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  const updateRecipeItem = (index, field, value) => {
    const newItems = [...formData.ingredients];
    newItems[index][field] = value;
    setFormData((prev) => ({ ...prev, ingredients: newItems }));
  };

  // Modificadores / Variaciones / Pasos de Combo
  const addModifier = (name = "") =>
    setFormData((prev) => ({
      ...prev,
      modifiers: [
        ...prev.modifiers,
        {
          id: crypto.randomUUID(),
          name:
            name ||
            (prev.isCombo ? "Elige tu Opción" : "Tipo de Base / Variedad"),
          isRequired: true,
          options: [],
        },
      ],
    }));
  const removeModifier = (index) =>
    setFormData((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index),
    }));
  const updateModifier = (index, field, value) => {
    const newMods = [...formData.modifiers];
    newMods[index][field] = value;
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };

  // Opciones dentro de un modificador
  const addOption = (modIndex) => {
    const newMods = [...formData.modifiers];
    const newId = crypto.randomUUID();
    newMods[modIndex].options.push({
      id: newId,
      name: "",
      priceExtra: 0,
      discountMode: "none",
      ingredientId: "",
      quantity: "",
      linkedProductId: "",
      ingredients: [],
    });
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
    setExpandedOptionId(newId);
  };
  const removeOption = (modIndex, optIndex) => {
    const newMods = [...formData.modifiers];
    newMods[modIndex].options = newMods[modIndex].options.filter(
      (_, i) => i !== optIndex,
    );
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };
  const updateOption = (modIndex, optIndex, field, value) => {
    const newMods = [...formData.modifiers];
    newMods[modIndex].options[optIndex][field] = value;
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };

  // Sub-ingredientes para opciones compuestas (Picada: papas + plátano)
  const addSubIngredientToOption = (modIndex, optIndex) => {
    const newMods = [...formData.modifiers];
    const opt = newMods[modIndex].options[optIndex];
    opt.ingredients = [
      ...(opt.ingredients || []),
      { id: crypto.randomUUID(), ingredientId: "", quantity: "" },
    ];
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };
  const removeSubIngredientFromOption = (modIndex, optIndex, ingIndex) => {
    const newMods = [...formData.modifiers];
    const opt = newMods[modIndex].options[optIndex];
    opt.ingredients = opt.ingredients.filter((_, i) => i !== ingIndex);
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };
  const updateSubIngredientInOption = (
    modIndex,
    optIndex,
    ingIndex,
    field,
    value,
  ) => {
    const newMods = [...formData.modifiers];
    newMods[modIndex].options[optIndex].ingredients[ingIndex][field] = value;
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };

  // Asistente para Combos: Cargar productos de una categoría como opciones de un grupo
  const importCategoryToModifier = (modIndex, categoryId) => {
    if (!categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    const catProducts = allProducts.filter((p) => p.categoryId === categoryId);
    if (catProducts.length === 0) {
      alert(
        `No hay productos registrados en la categoría "${cat?.name || "Seleccionada"}".`,
      );
      return;
    }

    const newMods = [...formData.modifiers];
    const currentOptions = newMods[modIndex].options || [];
    const newOptions = catProducts.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      priceExtra: 0,
      discountMode: "product",
      linkedProductId: p.id,
      ingredientId: "",
      quantity: "",
      ingredients: [],
    }));

    newMods[modIndex].options = [...currentOptions, ...newOptions];
    setFormData((prev) => ({ ...prev, modifiers: newMods }));
  };

  // Adiciones
  const addAddition = () =>
    setFormData((prev) => ({
      ...prev,
      additions: [
        ...prev.additions,
        {
          id: crypto.randomUUID(),
          name: "",
          price: "",
          ingredientId: "",
          quantity: "",
        },
      ],
    }));
  const removeAddition = (index) =>
    setFormData((prev) => ({
      ...prev,
      additions: prev.additions.filter((_, i) => i !== index),
    }));
  const updateAddition = (index, field, value) => {
    const newAdds = [...formData.additions];
    newAdds[index][field] = value;
    setFormData((prev) => ({ ...prev, additions: newAdds }));
  };

  // Envío del Formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) {
      alert("Por favor selecciona una categoría.");
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanData = {
        ...formData,
        price: parseFloat(formData.price),
        imageUrl: formData.imageUrl?.trim() ? formData.imageUrl.trim() : null,
        showInStore: Boolean(formData.showInStore),
        stock: parseFloat(formData.stock) || 0,
        isCombo: Boolean(formData.isCombo),
        ingredients: formData.ingredients
          .filter(
            (r) => r.ingredientId && r.ingredientId.trim() !== "" && r.quantity,
          )
          .map((r) => ({ ...r, quantity: parseFloat(r.quantity) })),
        modifiers: formData.modifiers
          .filter((m) => m.name && m.options.length > 0)
          .map((m) => ({
            name: m.name,
            isRequired: m.isRequired !== false,
            options: m.options
              .filter((o) => o.name)
              .map((o) => ({
                name: o.name,
                priceExtra: parseFloat(o.priceExtra) || 0,
                ingredientId:
                  o.discountMode === "single" && o.ingredientId
                    ? o.ingredientId
                    : null,
                quantity:
                  o.discountMode === "single" && o.quantity
                    ? parseFloat(o.quantity)
                    : null,
                linkedProductId:
                  o.discountMode === "product" && o.linkedProductId
                    ? o.linkedProductId
                    : null,
                ingredients:
                  o.discountMode === "multiple"
                    ? (o.ingredients || [])
                        .filter((oi) => oi.ingredientId && oi.quantity)
                        .map((oi) => ({
                          ingredientId: oi.ingredientId,
                          quantity: parseFloat(oi.quantity),
                        }))
                    : [],
              })),
          })),
        additions: formData.additions
          .filter((a) => a.name && a.price)
          .map((a) => ({
            name: a.name,
            price: parseFloat(a.price),
            quantity: a.quantity ? parseFloat(a.quantity) : null,
            ingredientId: a.ingredientId || null,
          })),
      };

      const res = await onSubmit(cleanData);
      if (res && res.success === false) {
        alert(res.message || "Error al guardar el producto.");
        return;
      }
      onClose();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert(
        error.response?.data?.message ||
          "Error al guardar el producto. Por favor revisa los campos requeridos.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        {/* HEADER Y PESTAÑAS */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTop}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                {formData.isCombo ? (
                  <Sparkles size={22} className="text-amber-500" />
                ) : (
                  <Tag size={22} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {initialData ? "Editar Producto" : "Crear Nuevo Producto"}
                  {formData.isCombo && (
                    <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Combo
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.isCombo
                    ? "Configura un combo con opciones de hamburguesas, acompañamientos o bebidas"
                    : "Configura precio, receta, variedades con descuento de bodega y adiciones"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.tabsNav}>
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`${styles.tabBtn} ${activeTab === "basic" ? styles.tabBtnActive : ""}`}
            >
              <Tag size={16} /> Datos Básicos
            </button>

            {!formData.isCombo && (
              <button
                type="button"
                onClick={() => setActiveTab("recipe")}
                className={`${styles.tabBtn} ${activeTab === "recipe" ? styles.tabBtnActive : ""}`}
              >
                <ChefHat size={16} /> Receta Insumos (
                {formData.ingredients.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("modifiers")}
              className={`${styles.tabBtn} ${activeTab === "modifiers" ? styles.tabBtnActive : ""}`}
            >
              <Settings2 size={16} />
              {formData.isCombo
                ? `Opciones del Combo (${formData.modifiers.length})`
                : `Variedades y Bases (${formData.modifiers.length})`}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("additions")}
              className={`${styles.tabBtn} ${activeTab === "additions" ? styles.tabBtnActive : ""}`}
            >
              <PlusCircle size={16} /> Adiciones Extras (
              {formData.additions.length})
            </button>
          </div>
        </div>

        {/* CUERPO DEL FORMULARIO (SCROLL) */}
        <div className={styles.modalBody}>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            {/* PESTAÑA: BÁSICOS */}
            {activeTab === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Switch de Combo */}
                <div className={`md:col-span-2 p-4 rounded-xl flex items-start justify-between gap-4 ${styles.comboSection}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400 mt-0.5">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                        ¿Es un Combo Especial?
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Activa esto para combos (ej. Combo 1: cualquiera de
                        nuestras hamburguesas con papas, Combo 2: hamburguesa
                        con gaseosa). Podrás configurar las opciones en la
                        pestaña <strong>Opciones del Combo</strong>.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.isCombo}
                      onChange={(e) =>
                        setFormData({ ...formData, isCombo: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Switch de Mostrar en Tienda Virtual */}
                <div className={`md:col-span-2 p-4 rounded-xl flex items-start justify-between gap-4 border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/20`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mt-0.5">
                      <Box size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        Mostrar en la Tienda Virtual
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Si está activado, tus clientes podrán ver y ordenar este producto directamente desde la tienda online del restaurante.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.showInStore}
                      onChange={(e) =>
                        setFormData({ ...formData, showInStore: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className={`md:col-span-2 ${styles.formFieldBox}`}>
                  <label className={styles.fieldLabel}>
                    <Tag size={15} style={{ color: "var(--primary, #4f46e5)" }} />
                    <span>Nombre del Producto o Combo *</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={styles.fieldInput}
                    placeholder={
                      formData.isCombo
                        ? "Ej. Combo 1 (Hamburguesa + Papas)"
                        : "Ej. Hamburguesa Extrema"
                    }
                  />
                </div>

                <div className={styles.formFieldBox}>
                  <label className={styles.fieldLabel}>
                    <Layers size={15} style={{ color: "var(--primary, #4f46e5)" }} />
                    <span>Categoría *</span>
                  </label>
                  <CustomSelect
                    value={formData.categoryId}
                    onChange={(val) =>
                      setFormData({ ...formData, categoryId: val })
                    }
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    placeholder="Selecciona categoría..."
                    required={true}
                  />
                </div>

                <div className={styles.formFieldBox}>
                  <label className={styles.fieldLabel}>
                    <DollarSign size={15} style={{ color: "var(--primary, #4f46e5)" }} />
                    <span>Precio de Venta ($) *</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className={styles.fieldInput}
                    style={{ fontSize: "1.125rem", fontWeight: 800 }}
                    placeholder="0"
                  />
                </div>

                {/* Foto del Producto (Opcional) */}
                <div className={`md:col-span-2 ${styles.formFieldBox}`}>
                  <div className="flex items-center justify-between">
                    <label className={styles.fieldLabel} style={{ marginBottom: 0 }}>
                      <ImageIcon size={15} style={{ color: "var(--primary, #4f46e5)" }} />
                      <span>Foto del Producto (Opcional)</span>
                    </label>
                    {formData.imageUrl && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={12} /> Foto asignada
                      </span>
                    )}
                  </div>

                  {formData.imageUrl ? (
                    <div className={styles.imagePreviewBox}>
                      <img
                        src={getFullImageUrl(formData.imageUrl)}
                        alt="Vista previa del producto"
                        className={styles.imagePreviewThumb}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className={styles.imagePreviewInfo}>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Foto lista para el catálogo
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Esta imagen aparecerá en la carta del módulo de ventas y en la tabla de inventario.
                        </p>
                        <div className={styles.imageActions}>
                          <label className="neo-btn neo-btn-secondary text-xs py-1 px-3 cursor-pointer">
                            <Upload size={13} />
                            <span>Cambiar foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={isUploadingImage}
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            disabled={isUploadingImage}
                            className="neo-btn neo-btn-danger text-xs py-1 px-3"
                          >
                            <Trash2 size={13} />
                            <span>Quitar foto</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={styles.imageDropZone}>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={isUploadingImage}
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                          }}
                        />
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-2 py-2 text-indigo-600 dark:text-indigo-400">
                            <Loader2 size={26} className="animate-spin" />
                            <span className="text-xs font-bold">Subiendo foto del producto...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                              <Upload size={20} />
                            </div>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Haz clic para seleccionar o subir una foto
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              PNG, JPG, JPEG o WEBP (Máx. 5MB) · Totalmente opcional
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  )}

                  {imageError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                      {imageError}
                    </p>
                  )}
                </div>

                <div className={`md:col-span-2 ${styles.formFieldBox}`}>
                  <label className={styles.fieldLabel}>
                    <FileText size={15} style={{ color: "var(--primary, #4f46e5)" }} />
                    <span>Descripción del Producto (Opcional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={styles.fieldInput}
                    rows="2"
                    placeholder="Breve detalle de los ingredientes o del contenido del combo..."
                  ></textarea>
                </div>

                {/* Venta Directa (No aplica si es combo) */}
                {!formData.isCombo && (
                  <div className={`md:col-span-2 p-4 rounded-xl ${styles.directSaleSection}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.trackStock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trackStock: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-blue-950 dark:text-blue-300 text-sm">
                          Es producto de venta directa terminada (ej. Gaseosa en
                          botella, Cerveza)
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Marca esto si no se prepara en cocina y deseas
                          descontar directamente las unidades del producto.
                        </p>
                      </div>
                    </label>
                    {formData.trackStock && (
                      <div className="mt-3 pl-7">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Stock Actual en Unidades
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({ ...formData, stock: e.target.value })
                          }
                          className="w-40 p-2 bg-white dark:bg-gray-800 border rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: RECETA (INSUMOS) */}
            {activeTab === "recipe" && !formData.isCombo && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      Receta Estándar del Producto
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Insumos que se descuentan automáticamente al vender este
                      producto base.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addRecipeItem}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus size={16} /> Añadir Insumo
                  </button>
                </div>

                {formData.ingredients.length === 0 && (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400">
                    <ChefHat size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">
                      Sin receta base configurada
                    </p>
                    <p className="text-xs mt-0.5">
                      Si vendes este producto, no se descontarán materias primas
                      a menos que selecciones una variedad con insumo.
                    </p>
                  </div>
                )}

                {formData.ingredients.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 items-end p-3 rounded-xl ${styles.recipeItem}`}
                  >
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        Insumo de Bodega
                      </label>
                      <CustomSelect
                        value={item.ingredientId}
                        onChange={(val) =>
                          updateRecipeItem(idx, "ingredientId", val)
                        }
                        options={ingredients.map((ing) => ({
                          value: ing.id,
                          label: `${ing.name} (${ing.unit})`,
                        }))}
                        placeholder="Selecciona materia prima..."
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateRecipeItem(idx, "quantity", e.target.value)
                        }
                        className="w-full p-2 bg-white dark:bg-gray-800 border rounded-lg text-sm dark:text-white font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRecipeItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar insumo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* PESTAÑA: MODIFICADORES / VARIEDADES / COMBOS */}
            {activeTab === "modifiers" && (
              <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-3 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <div>
                    <p className="font-bold text-sm text-indigo-950 dark:text-indigo-300">
                      {formData.isCombo
                        ? "Pasos y Elecciones del Combo (Hamburguesas, Papas, Bebidas)"
                        : "Variedades y Bases con Descuento de Bodega (Pan, Plátano, Picada)"}
                    </p>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-400 mt-0.5">
                      {formData.isCombo
                        ? "Crea cada paso que el cliente elige (ej. Grupo 1: Hamburguesa, Grupo 2: Papas o Gaseosa)."
                        : "Cada opción puede descontar 1 insumo (Pan/Plátano), múltiples insumos (Picada con Papas + Plátano) o un producto."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addModifier()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <Plus size={16} />{" "}
                    {formData.isCombo
                      ? "Nuevo Paso / Grupo"
                      : "Nuevo Grupo de Variedad"}
                  </button>
                </div>

                {formData.modifiers.length === 0 && (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400">
                    <Settings2 size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">
                      {formData.isCombo
                        ? "No has agregado pasos para este combo"
                        : "No has agregado variedades"}
                    </p>
                    <p className="text-xs mt-0.5">
                      {formData.isCombo
                        ? 'Haz clic en "Nuevo Paso / Grupo" para definir las opciones a elegir (ej: hamburguesa, acompañamiento).'
                        : 'Haz clic en "Nuevo Grupo de Variedad" para agregar opciones como Pan, Plátano o Picada.'}
                    </p>
                  </div>
                )}

                {formData.modifiers.map((mod, modIdx) => (
                  <div
                    key={mod.id}
                    className={`rounded-2xl p-5 shadow-sm space-y-4 ${styles.modifierGroupCard}`}
                  >
                    {/* Header del Modificador */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Nombre del Grupo (ej:{" "}
                          {formData.isCombo
                            ? "Elige tu Hamburguesa"
                            : "Tipo de Base / Acompañante"}
                          )
                        </label>
                        <input
                          type="text"
                          placeholder={
                            formData.isCombo
                              ? "Ej: Elige tu Hamburguesa"
                              : "Ej: Tipo de Base"
                          }
                          value={mod.name}
                          onChange={(e) =>
                            updateModifier(modIdx, "name", e.target.value)
                          }
                          className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-bold text-sm dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                          <input
                            type="checkbox"
                            checked={mod.isRequired}
                            onChange={(e) =>
                              updateModifier(
                                modIdx,
                                "isRequired",
                                e.target.checked,
                              )
                            }
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Obligatorio
                          </span>
                        </label>

                        {/* Importar productos de categoría para Combos */}
                        <div className="relative">
                          <div className="w-56">
                            <CustomSelect
                              value=""
                              onChange={(val) => {
                                if (val) importCategoryToModifier(modIdx, val);
                              }}
                              options={categories.map((c) => ({
                                value: c.id,
                                label: `Cargar productos de "${c.name}"`,
                              }))}
                              placeholder="+ Cargar Categoría..."
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeModifier(modIdx)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                          title="Eliminar grupo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Lista de Opciones Drag & Drop */}
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleOptionDragEnd(modIdx, event)}
                    >
                      <SortableContext
                        items={mod.options.map((opt) => opt.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {mod.options.map((opt, optIdx) => {
                            const isExpanded = expandedOptionId === opt.id;
                            return (
                              <SortableOption key={opt.id} id={opt.id}>
                                {({ attributes, listeners }) => (
                                  <div className={`rounded-xl p-3 transition-all ${styles.optionItemRow}`}>
                                    {/* Fila Principal de la Opción */}
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        {...attributes}
                                        {...listeners}
                                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-indigo-600 p-1 rounded"
                                      >
                                        <GripVertical size={18} />
                                      </button>

                                      <div className="flex-1">
                                        <input
                                          type="text"
                                          placeholder={
                                            formData.isCombo
                                              ? "Nombre de la opción (ej. Hamburguesa Clásica)"
                                              : "Ej. Plátano o Picada"
                                          }
                                          value={opt.name}
                                          onChange={(e) =>
                                            updateOption(
                                              modIdx,
                                              optIdx,
                                              "name",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold dark:text-white"
                                        />
                                      </div>

                                      <div className="w-28 relative">
                                        <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">
                                          +$
                                        </span>
                                        <input
                                          type="number"
                                          placeholder="0"
                                          value={opt.priceExtra}
                                          onChange={(e) =>
                                            updateOption(
                                              modIdx,
                                              optIdx,
                                              "priceExtra",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full pl-7 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold dark:text-white"
                                          title="Precio adicional por elegir esta opción"
                                        />
                                      </div>

                                      {/* Botón para expandir configuración de inventario */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedOptionId(
                                            isExpanded ? null : opt.id,
                                          )
                                        }
                                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                          opt.discountMode !== "none"
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                            : "bg-gray-200/70 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300"
                                        }`}
                                      >
                                        <Package size={14} />
                                        <span>
                                          {opt.discountMode === "single"
                                            ? "Insumo Único"
                                            : opt.discountMode === "multiple"
                                              ? `Múltiples (${opt.ingredients?.length || 0})`
                                              : opt.discountMode === "product"
                                                ? "Producto Menú"
                                                : "Bodega"}
                                        </span>
                                        {isExpanded ? (
                                          <ChevronUp size={14} />
                                        ) : (
                                          <ChevronDown size={14} />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeOption(modIdx, optIdx)
                                        }
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="Eliminar opción"
                                      >
                                        <X size={18} />
                                      </button>
                                    </div>

                                    {/* Panel Desplegable: Configuración de Descuento de Inventario */}
                                    {isExpanded && (
                                      <div className={`mt-3 pt-3 p-3.5 rounded-xl space-y-3 ${styles.expandedOptionPanel}`}>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                            <Package
                                              size={14}
                                              className="text-indigo-600"
                                            />
                                            ¿Qué debe descontarse del inventario
                                            al elegir "
                                            {opt.name || "esta opción"}"?
                                          </p>

                                          <div className={styles.discountModeGroup}>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateOption(
                                                  modIdx,
                                                  optIdx,
                                                  "discountMode",
                                                  "none",
                                                )
                                              }
                                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                                opt.discountMode === "none"
                                                  ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm"
                                                  : "text-gray-500 hover:text-gray-800"
                                              }`}
                                            >
                                              Nada
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateOption(
                                                  modIdx,
                                                  optIdx,
                                                  "discountMode",
                                                  "single",
                                                )
                                              }
                                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                                opt.discountMode === "single"
                                                  ? "bg-indigo-600 text-white shadow-sm"
                                                  : "text-gray-500 hover:text-gray-800"
                                              }`}
                                            >
                                              Insumo Único (Pan/Plátano)
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateOption(
                                                  modIdx,
                                                  optIdx,
                                                  "discountMode",
                                                  "multiple",
                                                )
                                              }
                                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                                opt.discountMode === "multiple"
                                                  ? "bg-indigo-600 text-white shadow-sm"
                                                  : "text-gray-500 hover:text-gray-800"
                                              }`}
                                            >
                                              Múltiples (Picada)
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateOption(
                                                  modIdx,
                                                  optIdx,
                                                  "discountMode",
                                                  "product",
                                                )
                                              }
                                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                                opt.discountMode === "product"
                                                  ? "bg-amber-600 text-white shadow-sm"
                                                  : "text-gray-500 hover:text-gray-800"
                                              }`}
                                            >
                                              Producto de Combo
                                            </button>
                                          </div>
                                        </div>

                                        {/* Modo: Insumo Único (Ej: Pan o Plátano) */}
                                        {opt.discountMode === "single" && (
                                          <div className="flex gap-3 items-center bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex-1">
                                              <label className="text-xs font-bold text-gray-500 mb-1 block">
                                                Insumo a descontar (ej. Pan o
                                                Plátano)
                                              </label>
                                              <CustomSelect
                                                value={opt.ingredientId || ""}
                                                onChange={(val) =>
                                                  updateOption(
                                                    modIdx,
                                                    optIdx,
                                                    "ingredientId",
                                                    val,
                                                  )
                                                }
                                                options={ingredients.map(
                                                  (ing) => ({
                                                    value: ing.id,
                                                    label: `${ing.name} (${ing.unit})`,
                                                  }),
                                                )}
                                                placeholder="Selecciona insumo de bodega..."
                                              />
                                            </div>
                                            <div className="w-28">
                                              <label className="text-xs font-bold text-gray-500 mb-1 block">
                                                Cantidad
                                              </label>
                                              <input
                                                type="number"
                                                step="0.01"
                                                placeholder="1"
                                                value={opt.quantity || ""}
                                                onChange={(e) =>
                                                  updateOption(
                                                    modIdx,
                                                    optIdx,
                                                    "quantity",
                                                    e.target.value,
                                                  )
                                                }
                                                className="w-full p-2 bg-white dark:bg-gray-800 border rounded-lg text-xs font-bold dark:text-white"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {/* Modo: Múltiples Insumos (Ej: Picada lleva papas y plátano) */}
                                        {opt.discountMode === "multiple" && (
                                          <div className="space-y-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-1">
                                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                Lista de insumos que componen "
                                                {opt.name || "esta opción"}"
                                                (ej. Papas y Plátano)
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  addSubIngredientToOption(
                                                    modIdx,
                                                    optIdx,
                                                  )
                                                }
                                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1"
                                              >
                                                <Plus size={14} /> Añadir Insumo
                                              </button>
                                            </div>

                                            {(!opt.ingredients ||
                                              opt.ingredients.length === 0) && (
                                              <p className="text-xs text-gray-400 italic">
                                                No has agregado insumos a la
                                                mezcla. Haz clic en "Añadir
                                                Insumo".
                                              </p>
                                            )}

                                            {(opt.ingredients || []).map(
                                              (subIng, subIdx) => (
                                                <div
                                                  key={subIng.id || subIdx}
                                                  className="flex gap-2 items-center"
                                                >
                                                  <div className="flex-1">
                                                    <CustomSelect
                                                      value={
                                                        subIng.ingredientId ||
                                                        ""
                                                      }
                                                      onChange={(val) =>
                                                        updateSubIngredientInOption(
                                                          modIdx,
                                                          optIdx,
                                                          subIdx,
                                                          "ingredientId",
                                                          val,
                                                        )
                                                      }
                                                      options={ingredients.map(
                                                        (ing) => ({
                                                          value: ing.id,
                                                          label: `${ing.name} (${ing.unit})`,
                                                        }),
                                                      )}
                                                      placeholder="Selecciona materia prima..."
                                                    />
                                                  </div>
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Cant."
                                                    value={
                                                      subIng.quantity || ""
                                                    }
                                                    onChange={(e) =>
                                                      updateSubIngredientInOption(
                                                        modIdx,
                                                        optIdx,
                                                        subIdx,
                                                        "quantity",
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="w-20 p-1.5 bg-white dark:bg-gray-800 border rounded text-xs font-bold dark:text-white"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      removeSubIngredientFromOption(
                                                        modIdx,
                                                        optIdx,
                                                        subIdx,
                                                      )
                                                    }
                                                    className="text-red-400 hover:text-red-600 p-1"
                                                  >
                                                    <Trash2 size={16} />
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}

                                        {/* Modo: Producto del Menú (Para Combos) */}
                                        {opt.discountMode === "product" && (
                                          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60">
                                            <label className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1 block">
                                              Vincular con Producto del Menú
                                            </label>
                                            <CustomSelect
                                              value={opt.linkedProductId || ""}
                                              onChange={(val) => {
                                                const prodId = val;
                                                const selectedProd =
                                                  allProducts.find(
                                                    (p) => p.id === prodId,
                                                  );
                                                updateOption(
                                                  modIdx,
                                                  optIdx,
                                                  "linkedProductId",
                                                  prodId,
                                                );
                                                if (selectedProd && !opt.name) {
                                                  updateOption(
                                                    modIdx,
                                                    optIdx,
                                                    "name",
                                                    selectedProd.name,
                                                  );
                                                }
                                              }}
                                              options={allProducts.map((p) => ({
                                                value: p.id,
                                                label: `${p.name} - $${parseFloat(p.price).toLocaleString("es-CO")}`,
                                              }))}
                                              placeholder="Selecciona un producto del catálogo..."
                                            />
                                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                                              Al venderse este combo, el sistema
                                              descontará automáticamente la
                                              receta completa de este producto.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </SortableOption>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => addOption(modIdx)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1.5 pt-1"
                          >
                            <Plus size={16} /> Añadir opción a este grupo
                          </button>
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ))}
              </div>
            )}

            {/* PESTAÑA: ADICIONES */}
            {activeTab === "additions" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      Adiciones Extras para este Producto
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Extras que el cliente puede sumar al pedir (ej. Tocineta,
                      Queso extra, Huevo).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAddition}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus size={16} /> Nueva Adición
                  </button>
                </div>

                {formData.additions.length === 0 && (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400">
                    <PlusCircle size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">
                      Sin adiciones configuradas
                    </p>
                    <p className="text-xs mt-0.5">
                      Haz clic en "Nueva Adición" para ofrecer tocineta, queso
                      extra u otros agregados con su precio y descuento de
                      stock.
                    </p>
                  </div>
                )}

                {formData.additions.map((add, idx) => (
                  <div
                    key={add.id || idx}
                    className={`flex flex-wrap md:flex-nowrap gap-3 items-end p-3.5 rounded-xl ${styles.additionItem}`}
                  >
                    <div className="w-full md:flex-1">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        Nombre de la Adición
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Tocineta Extra"
                        value={add.name}
                        onChange={(e) =>
                          updateAddition(idx, "name", e.target.value)
                        }
                        className="w-full p-2 bg-white dark:bg-gray-800 border rounded-lg text-sm dark:text-white font-medium"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        Precio Venta ($)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={add.price}
                        onChange={(e) =>
                          updateAddition(idx, "price", e.target.value)
                        }
                        className="w-full p-2 bg-white dark:bg-gray-800 border rounded-lg text-sm dark:text-white font-bold"
                      />
                    </div>

                    {/* Descuento de inventario opcional */}
                    <div className="w-full md:flex-1 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-3 dark:border-gray-700">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        Descontar de Bodega (Opcional)
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <CustomSelect
                            value={add.ingredientId || ""}
                            onChange={(val) =>
                              updateAddition(idx, "ingredientId", val)
                            }
                            options={[
                              { value: "", label: "No descontar nada" },
                              ...ingredients.map((ing) => ({
                                value: ing.id,
                                label: `${ing.name} (${ing.unit})`,
                              })),
                            ]}
                            placeholder="No descontar nada"
                          />
                        </div>
                        {add.ingredientId && (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cant."
                            value={add.quantity || ""}
                            onChange={(e) =>
                              updateAddition(idx, "quantity", e.target.value)
                            }
                            className="w-20 p-2 bg-white dark:bg-gray-800 border rounded-lg text-xs font-bold dark:text-white"
                          />
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAddition(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar adición"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {formData.isCombo
              ? "⭐ Modo Combo Gastronómico"
              : "Producto estándar con receta y variantes"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : initialData
                  ? "Guardar Cambios"
                  : "Crear Producto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
