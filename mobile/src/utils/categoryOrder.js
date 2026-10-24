/**
 * Utilidad para ordenar categorías y productos según la prioridad del negocio en la App Móvil:
 * 1. Hamburguesas
 * 2. Bowls
 * 3. Salchipapas
 * 4. Perro Caliente / Perros Calientes
 * 5. Mazorcadas
 * 6. Porciones
 * 7. Bebidas
 * Cualquier otra categoría irá al final ordenada alfabéticamente.
 */

export const getCategoryPriority = (categoryName) => {
  if (!categoryName) return 999;
  const n = String(categoryName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (n.includes('hamburguesa')) return 1;
  if (n.includes('bowl')) return 2;
  if (n.includes('salchipapa')) return 3;
  if (n.includes('perro')) return 4;
  if (n.includes('mazorcada')) return 5;
  if (n.includes('porcion')) return 6;
  if (n.includes('bebida')) return 7;

  return 100;
};

export const compareCategories = (a, b) => {
  const nameA = typeof a === 'string' ? a : (a?.name || '');
  const nameB = typeof b === 'string' ? b : (b?.name || '');
  const rankA = getCategoryPriority(nameA);
  const rankB = getCategoryPriority(nameB);

  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
};

export const compareProducts = (a, b) => {
  const catA = a?.category?.name || a?.categoryName || '';
  const catB = b?.category?.name || b?.categoryName || '';
  const rankA = getCategoryPriority(catA);
  const rankB = getCategoryPriority(catB);

  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return (a?.name || '').localeCompare(b?.name || '', 'es', { sensitivity: 'base' });
};
