import { ref, computed } from 'vue';

export function useSelection() {
  const selections = ref([]);
  const currentSelection = ref(null);
  const isSelecting = ref(false);
  const activeSelectionMode = ref('area1'); // По умолчанию первая область

  // Начало выделения области
  const startSelection = (mode, event, container) => {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    activeSelectionMode.value = mode;
    isSelecting.value = true;

    // Удаляем существующую область с таким же mode
    selections.value = selections.value.filter(s => s.mode !== mode);

    currentSelection.value = {
      mode,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      x,
      y,
      width: 0,
      height: 0
    };

    return true;
  };

  // Обновление выделения при движении мыши
  const updateSelection = (event, container) => {
    if (!isSelecting.value || !currentSelection.value) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    currentSelection.value.endX = x;
    currentSelection.value.endY = y;

    // Вычисляем координаты и размеры прямоугольника
    const startX = Math.min(currentSelection.value.startX, x);
    const startY = Math.min(currentSelection.value.startY, y);
    const endX = Math.max(currentSelection.value.startX, x);
    const endY = Math.max(currentSelection.value.startY, y);

    currentSelection.value.x = startX;
    currentSelection.value.y = startY;
    currentSelection.value.width = endX - startX;
    currentSelection.value.height = endY - startY;
  };

  // Завершение выделения
  const endSelection = () => {
    if (!isSelecting.value || !currentSelection.value) return;

    // Проверяем минимальный размер области
    if (currentSelection.value.width > 10 && currentSelection.value.height > 10) {
      // Добавляем область в список
      const existingIndex = selections.value.findIndex(s => s.mode === currentSelection.value.mode);
      if (existingIndex >= 0) {
        selections.value[existingIndex] = { ...currentSelection.value };
      } else {
        selections.value.push({ ...currentSelection.value });
      }
    }

    isSelecting.value = false;
    currentSelection.value = null;

    // Автоматически переключаемся на следующую область
    if (activeSelectionMode.value === 'area1') {
      activeSelectionMode.value = 'area2';
    }
  };

  // Удаление области
  const removeSelection = (mode) => {
    selections.value = selections.value.filter(s => s.mode !== mode);
  };

  // Очистка всех областей
  const clearSelections = () => {
    selections.value = [];
    currentSelection.value = null;
    isSelecting.value = false;
    activeSelectionMode.value = 'area1';
  };

  // Получение области по mode
  const getSelection = (mode) => {
    return selections.value.find(s => s.mode === mode);
  };

  // Проверка, есть ли область
  const hasSelection = (mode) => {
    return selections.value.some(s => s.mode === mode);
  };

  // Получение стилей для отображения области
  const getSelectionStyle = (selection) => {
    if (!selection) return {};
    return {
      left: `${selection.x}px`,
      top: `${selection.y}px`,
      width: `${selection.width}px`,
      height: `${selection.height}px`
    };
  };

  // Получение класса для области
  const getSelectionClass = (mode) => {
    return mode === 'area1' ? 'selection-area-1' : 'selection-area-2';
  };

  // Получение названия области
  const getSelectionLabel = (mode) => {
    return mode === 'area1' ? 'Область 1' : 'Область 2';
  };

  // Получение цвета области
  const getSelectionColor = (mode) => {
    return mode === 'area1' ? '#ff4444' : '#44ff44';
  };

  return {
    selections: computed(() => selections.value),
    currentSelection: computed(() => currentSelection.value),
    isSelecting: computed(() => isSelecting.value),
    selectionMode: computed(() => activeSelectionMode.value),
    hasArea1: computed(() => hasSelection('area1')),
    hasArea2: computed(() => hasSelection('area2')),

    startSelection,
    updateSelection,
    endSelection,
    removeSelection,
    clearSelections,
    getSelection,
    hasSelection,
    getSelectionStyle,
    getSelectionClass,
    getSelectionLabel,
    getSelectionColor
  };
}
