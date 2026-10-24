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
  Copy,
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

  // Estado para Copiar Receta / Variedades / Adiciones de otro producto
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceProductId, setCopySourceProductId] = useState("");
  const [copyOptions, setCopyOptions] = useState({
    ingredients: true,
    modifiers: true,
    additions: true,
    mode: "append", // "append" | "replace"
  });
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [isCopying, setIsCopying] = useState(false);

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

  // Insumos elegibles para venta y recetas de productos:
  // Se excluyen los insumos que son materias primas para elaboración interna (ej. Carne de res que se usa para elaborar carne de hamburguesa)
  const productEligibleIngredients = ingredients.filter((ing) => !ing.isUsedInProduction);

  // Helper para armar opciones de insumos asegurando que si ya tenía un insumo asignado se preserve
  const getIngredientOptions = (currentSelectedId = null) => {
    let list = productEligibleIngredients;
    if (currentSelectedId && !list.some((i) => i.id === currentSelectedId)) {
      const found = ingredients.find((i) => i.id === currentSelectedId);
      if (found) list = [found, ...list];
    }
    return list.map((ing) => ({
      value: ing.id,
      label: `${ing.name} (${ing.unit})${ing.isManufactured ? ' [Elaborado]' : ''}`,
    }));
  };

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
    const oldImageToDelete = formData.imageUrl;

    try {
      const res = await inventoryService.uploadProductImage(file);
      if (res.success && res.data?.imageUrl) {
        // Si ya había una imagen asignada en el formulario y se sustituye por otra nueva, borramos la anterior
        if (oldImageToDelete && oldImageToDelete !== res.data.imageUrl) {
          inventoryService.deleteProductImage(oldImageToDelete).catch(() => {});
        }
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

  const handleRemoveImage = async () => {
    if (formData.imageUrl) {
      try {
        await inventoryService.deleteProductImage(formData.imageUrl);
      } catch (err) {
        console.warn("No se pudo eliminar la imagen del servidor:", err);
      }
    }
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

  // Receta (los nuevos insumos aparecen de primero)
  const addRecipeItem = () =>
    setFormData((prev) => ({
      ...prev,
      ingredients: [{ ingredientId: "", quantity: "" }, ...prev.ingredients],
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

  // Adiciones (las nuevas adiciones aparecen de primero)
  const addAddition = () =>
    setFormData((prev) => ({
      ...prev,
      additions: [
        {
          id: crypto.randomUUID(),
          name: "",
          price: "",
          ingredientId: "",
          quantity: "",
        },
        ...prev.additions,
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

  // Abrir modal de copia preseleccionando la sección correspondiente
  const openCopyModalForTab = (tabType = "all") => {
    setCopyOptions({
      ingredients: tabType === "recipe" || tabType === "all",
      modifiers: tabType === "modifiers" || tabType === "all",
      additions: tabType === "additions" || tabType === "all",
      mode: "append",
    });
    setCopySourceProductId("");
    setShowCopyModal(true);
  };

  // Ejecutar copia de receta, variedades o adiciones desde el producto seleccionado
  const handleExecuteCopy = async () => {
    if (!copySourceProductId) {
      alert("Por favor selecciona un producto origen de la lista.");
      return;
    }

    if (!copyOptions.ingredients && !copyOptions.modifiers && !copyOptions.additions) {
      alert("Por favor selecciona al menos un elemento para copiar (Receta, Variedades o Adiciones).");
      return;
    }

    setIsCopying(true);
    try {
      let source = allProducts.find((p) => p.id === copySourceProductId);
      try {
        const res = await api.get(`/inventory/products/${copySourceProductId}`);
        if (res.data?.data) {
          source = res.data.data;
        }
      } catch (fetchErr) {
        console.warn("Usando producto de memoria:", fetchErr);
      }

      if (!source) {
        alert("No se encontró la información del producto.");
        return;
      }

      const isReplace = copyOptions.mode === "replace";
      let countIng = 0;
      let countMod = 0;
      let countAdd = 0;

      setFormData((prev) => {
        const next = { ...prev };

        // 1. Receta de Insumos
        if (copyOptions.ingredients) {
          const importedIngs = (source.ingredients || []).map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
          }));
          countIng = importedIngs.length;

          if (isReplace) {
            next.ingredients = importedIngs;
          } else {
            // Anexar sin duplicar el mismo ingrediente
            const existingIds = new Set(next.ingredients.map((i) => i.ingredientId));
            const toAdd = importedIngs.filter((i) => !existingIds.has(i.ingredientId));
            next.ingredients = [...next.ingredients, ...toAdd];
          }
        }

        // 2. Variedades y Opciones (generar nuevos IDs únicos)
        if (copyOptions.modifiers) {
          const importedMods = (source.modifiers || []).map((m) => ({
            id: crypto.randomUUID(),
            name: m.name || "",
            isRequired: m.isRequired !== false,
            options: (m.options || []).map((opt) => {
              let discountMode = "none";
              if (opt.linkedProductId) discountMode = "product";
              else if (opt.ingredients && opt.ingredients.length > 0) discountMode = "multiple";
              else if (opt.ingredientId) discountMode = "single";

              return {
                id: crypto.randomUUID(),
                name: opt.name || "",
                priceExtra: opt.priceExtra || 0,
                discountMode,
                ingredientId: opt.ingredientId || "",
                quantity: opt.quantity || "",
                linkedProductId: opt.linkedProductId || "",
                ingredients: (opt.ingredients || []).map((oi) => ({
                  id: crypto.randomUUID(),
                  ingredientId: oi.ingredientId,
                  quantity: oi.quantity,
                })),
              };
            }),
          }));
          countMod = importedMods.length;

          if (isReplace) {
            next.modifiers = importedMods;
          } else {
            next.modifiers = [...next.modifiers, ...importedMods];
          }
        }

        // 3. Adiciones Extras (generar nuevos IDs únicos)
        if (copyOptions.additions) {
          const importedAdds = (source.additions || []).map((a) => ({
            id: crypto.randomUUID(),
            name: a.name || "",
            price: a.price || "",
            ingredientId: a.ingredientId || "",
            quantity: a.quantity || "",
          }));
          countAdd = importedAdds.length;

          if (isReplace) {
            next.additions = importedAdds;
          } else {
            next.additions = [...next.additions, ...importedAdds];
          }
        }

        return next;
      });

      setShowCopyModal(false);
      setCopyFeedback({
        type: "success",
        message: `¡Configuración copiada exitosamente de "${source.name}"! (${countIng} insumos de receta, ${countMod} grupos de variedad, ${countAdd} adiciones). Ya puedes agregar ingredientes adicionales o ajustar cantidades.`,
      });

      setTimeout(() => setCopyFeedback(null), 8000);
    } catch (err) {
      console.error("Error al copiar configuración:", err);
      alert("Error al copiar datos del producto.");
    } finally {
      setIsCopying(false);
    }
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCopyModalForTab("all")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all shadow-sm active:scale-95"
                title="Copiar receta de insumos, variedades o adiciones de otro producto existente"
              >
                <Copy size={14} />
                <span>Copiar de otro producto</span>
              </button>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
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
          {copyFeedback && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={13} strokeWidth={3} />
                </div>
                <div>
                  <p className="font-bold text-sm">¡Copia exitosa!</p>
                  <p className="mt-0.5 text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                    {copyFeedback.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCopyFeedback(null)}
                className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 p-1"
              >
                <X size={15} />
              </button>
            </div>
          )}

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
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isCombo}
                    onClick={() =>
                      setFormData({ ...formData, isCombo: !formData.isCombo })
                    }
                    style={{
                      position: "relative",
                      width: "48px",
                      height: "26px",
                      borderRadius: "9999px",
                      backgroundColor: formData.isCombo ? "#f59e0b" : "#cbd5e1",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      outline: "none",
                      boxShadow: formData.isCombo
                        ? "0 0 0 3px rgba(245, 158, 11, 0.25)"
                        : "none",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        backgroundColor: "#ffffff",
                        borderRadius: "50%",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transform: formData.isCombo
                          ? "translateX(22px)"
                          : "translateX(0px)",
                        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "block",
                      }}
                    />
                  </button>
                </div>

                {/* Switch de Mostrar en Tienda Virtual */}
                <div
                  className={`md:col-span-2 p-4 rounded-xl flex items-start justify-between gap-4 border ${
                    formData.showInStore
                      ? "border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/30"
                      : "border-gray-200 bg-gray-50/50 dark:bg-gray-800/20"
                  } transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        formData.showInStore
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      } mt-0.5 transition-colors`}
                    >
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
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.showInStore}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        showInStore: !formData.showInStore,
                      })
                    }
                    style={{
                      position: "relative",
                      width: "48px",
                      height: "26px",
                      borderRadius: "9999px",
                      backgroundColor: formData.showInStore ? "#4f46e5" : "#cbd5e1",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      outline: "none",
                      boxShadow: formData.showInStore
                        ? "0 0 0 3px rgba(79, 70, 229, 0.25)"
                        : "none",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        backgroundColor: "#ffffff",
                        borderRadius: "50%",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transform: formData.showInStore
                          ? "translateX(22px)"
                          : "translateX(0px)",
                        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "block",
                      }}
                    />
                  </button>
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
              </div>
            )}

            {/* PESTAÑA: RECETA (INSUMOS) */}
            {activeTab === "recipe" && !formData.isCombo && (
              <div className="space-y-4">
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/90 dark:border-gray-700 shadow-md flex justify-between items-center transition-all">
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      Receta Estándar del Producto
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Insumos que se descuentan automáticamente al vender este
                      producto base.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCopyModalForTab("recipe")}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                      title="Copiar insumos de receta de otro producto"
                    >
                      <Copy size={14} className="text-indigo-600 dark:text-indigo-400" /> Copiar Receta
                    </button>
                    <button
                      type="button"
                      onClick={addRecipeItem}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Plus size={16} /> Añadir Insumo
                    </button>
                  </div>
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
                        options={getIngredientOptions(item.ingredientId)}
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
                <div className="sticky top-0 z-10 bg-indigo-50/95 dark:bg-indigo-950/95 backdrop-blur-md flex flex-wrap justify-between items-center gap-3 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 shadow-md transition-all">
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCopyModalForTab("modifiers")}
                      className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      title="Copiar variedades y opciones de otro producto"
                    >
                      <Copy size={14} /> Copiar Variedades
                    </button>
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
                                                options={getIngredientOptions(opt.ingredientId)}
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
                                                      options={getIngredientOptions(subIng.ingredientId)}
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
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200/90 dark:border-gray-700 shadow-md flex justify-between items-center transition-all">
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      Adiciones Extras para este Producto
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Extras que el cliente puede sumar al pedir (ej. Tocineta,
                      Queso extra, Huevo).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCopyModalForTab("additions")}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                      title="Copiar adiciones extras de otro producto"
                    >
                      <Copy size={14} className="text-indigo-600 dark:text-indigo-400" /> Copiar Adiciones
                    </button>
                    <button
                      type="button"
                      onClick={addAddition}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Plus size={16} /> Nueva Adición
                    </button>
                  </div>
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
                              ...getIngredientOptions(add.ingredientId),
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

      {/* MODAL SECUNDARIO: COPIAR RECETA / VARIEDADES / ADICIONES */}
      {showCopyModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCopyModal(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-lg w-full overflow-hidden flex flex-col scale-100 transition-all">
            {/* Header del Modal de Copia */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <Copy size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Copiar de Otro Producto
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Importa receta de insumos, variedades o adiciones
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido del Modal de Copia */}
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Selector de Producto Origen */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1.5">
                  1. Selecciona el Producto Origen
                </label>
                <CustomSelect
                  value={copySourceProductId}
                  onChange={(val) => setCopySourceProductId(val)}
                  options={allProducts.map((p) => {
                    const ingCount = p.ingredients?.length || 0;
                    const modCount = p.modifiers?.length || 0;
                    const addCount = p.additions?.length || 0;
                    return {
                      value: p.id,
                      label: `${p.name} ($${parseFloat(p.price || 0).toLocaleString("es-CO")}) · [${ingCount} insumos, ${modCount} variedades, ${addCount} adic.]`,
                    };
                  })}
                  placeholder="Selecciona el producto a clonar (ej. Hamburguesa Clásica)..."
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Ejemplo: Si estás creando la "Hamburguesa Mixta", selecciona aquí la "Hamburguesa Clásica".
                </p>
              </div>

              {/* Qué elementos copiar */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                  2. ¿Qué elementos deseas copiar?
                </label>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={copyOptions.ingredients}
                      onChange={(e) =>
                        setCopyOptions((prev) => ({
                          ...prev,
                          ingredients: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <ChefHat size={14} className="text-indigo-600" />
                        Receta de Insumos (Materias primas)
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                        Copia carne, salsas, panes o insumos que se descuentan al vender
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={copyOptions.modifiers}
                      onChange={(e) =>
                        setCopyOptions((prev) => ({
                          ...prev,
                          modifiers: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Settings2 size={14} className="text-indigo-600" />
                        Variedades y Opciones (Bases/Pasos)
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                        Copia opciones como tipo de base, plátano, picada o pasos
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={copyOptions.additions}
                      onChange={(e) =>
                        setCopyOptions((prev) => ({
                          ...prev,
                          additions: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <PlusCircle size={14} className="text-indigo-600" />
                        Adiciones Extras
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                        Copia tocineta, quesos, adiciones con sus precios y recetas
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modo de Copia */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                  3. Modo de Incorporación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                      copyOptions.mode === "append"
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Plus size={14} className="text-indigo-600" />
                        Anexar / Fusionar
                      </span>
                      <input
                        type="radio"
                        name="copyMode"
                        value="append"
                        checked={copyOptions.mode === "append"}
                        onChange={() =>
                          setCopyOptions((prev) => ({ ...prev, mode: "append" }))
                        }
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                      (Recomendado) Conserva lo que ya tengas y agrega lo nuevo sin duplicar insumos.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                      copyOptions.mode === "replace"
                        ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Layers size={14} className="text-amber-600" />
                        Reemplazar Todo
                      </span>
                      <input
                        type="radio"
                        name="copyMode"
                        value="replace"
                        checked={copyOptions.mode === "replace"}
                        onChange={() =>
                          setCopyOptions((prev) => ({ ...prev, mode: "replace" }))
                        }
                        className="text-amber-600"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                      Sustituye por completo los insumos, variedades o adiciones de este producto.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer del Modal de Copia */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                disabled={isCopying || !copySourceProductId}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                {isCopying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Copiando...</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar Configuración</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductForm;
