<template>
  <div class="image-scanner">
    <!-- Информация о подключении -->
    <div v-if="platformInfo.isBrowser && !platformInfo.isSecure" class="connection-info q-pa-sm bg-warning text-dark text-center">
      <q-icon name="info" size="sm" class="q-mr-xs" />
      <span class="text-caption">
        Камера доступна только по HTTPS или localhost. Сейчас используется загрузка файла.
      </span>
    </div>

    <div class="scanner-controls q-pa-md">
      <div class="row justify-center q-gutter-md">
        <q-btn
          color="primary"
          icon="photo_camera"
          label="Сделать снимок"
          @click="handleTakePhoto"
          :loading="cameraLoading"
        />
        <q-btn
          color="secondary"
          icon="photo_library"
          label="Выбрать из галереи"
          @click="handlePickFromGallery"
          :loading="cameraLoading"
        />
      </div>
    </div>

    <!-- Индикатор активной камеры -->
    <div v-if="isCameraActive" class="camera-active-indicator q-pa-sm bg-positive text-white text-center">
      <q-icon name="videocam" size="sm" class="q-mr-xs" />
      <span class="text-caption">Камера активна - сделайте снимок</span>
    </div>

    <div v-if="selectedImage" class="image-preview q-pa-md">
      <!-- Информация о выделении -->
      <div class="selection-info q-mb-md text-center">
        <div class="text-h6">Выделение областей</div>
        <div class="text-caption text-grey q-mt-sm">
          • Выделите прямоугольник на изображении для области {{ selectionMode === 'area1' ? '1' : '2' }}
          • После выделения области автоматически начнется распознавание
          • Выделите вторую область для сравнения
        </div>
        <div class="current-selection-info q-mt-sm">
          <q-badge :color="selectionMode === 'area1' ? 'red' : 'green'">
            Текущая область: {{ selectionMode === 'area1' ? '1' : '2' }}
          </q-badge>
          <q-badge v-if="hasArea1" color="red" class="q-ml-sm">
            Область 1 ✓
          </q-badge>
          <q-badge v-if="hasArea2" color="green" class="q-ml-sm">
            Область 2 ✓
          </q-badge>
        </div>
      </div>

      <!-- Контейнер изображения с возможностью выделения -->
      <div class="image-container"
           :style="imageContainerStyle"
           @mousedown="handleMouseDown"
           @mousemove="handleMouseMove"
           @mouseup="handleMouseUp"
           @mouseleave="handleMouseLeave"
           ref="imageContainer">

        <q-img
          :src="selectedImage.webPath"
          :style="imageStyle"
          class="scanned-image"
          fit="contain"
        >
          <template v-slot:loading>
            <q-spinner-gears color="white" />
          </template>
        </q-img>

        <!-- Выделенные области -->
        <div v-for="selection in selections"
             :key="selection.mode"
             :class="['selection-overlay', getSelectionClass(selection.mode)]"
             :style="getSelectionStyle(selection)">

          <div class="selection-label" :style="{ background: getSelectionColor(selection.mode) }">
            {{ getSelectionLabel(selection.mode) }}
          </div>
        </div>

        <!-- Текущее выделение (в процессе) -->
        <div v-if="currentSelection && isSelecting"
             :class="['selection-overlay', 'selection-active', getSelectionClass(currentSelection.mode)]"
             :style="getSelectionStyle(currentSelection)">
          <div class="selection-label" :style="{ background: getSelectionColor(currentSelection.mode) }">
            {{ getSelectionLabel(currentSelection.mode) }} (выделение...)
          </div>
        </div>
      </div>

      <div class="image-info q-mt-sm text-center">
        <div class="text-caption text-grey">
          Источник: {{ getImageSource(selectedImage.source) }}
        </div>
        <div class="rotation-info text-caption">
          Поворот: {{ rotationAngle }}°
        </div>
      </div>

      <div class="image-actions q-mt-md row justify-center q-gutter-md">
        <q-btn
          color="orange"
          icon="rotate_left"
          label="Повернуть влево"
          @click="rotateLeft"
        />
        <q-btn
          color="orange"
          icon="rotate_right"
          label="Повернуть вправо"
          @click="rotateRight"
        />
      </div>
    </div>

    <div v-if="isProcessing" class="q-pa-md">
      <q-linear-progress :value="progress / 100" class="q-mb-md" />
      <div class="text-center">Обработка: {{ progress }}%</div>
      <div class="text-center text-caption text-grey">
        Распознавание области {{ selectionMode === 'area1' ? '1' : '2' }}...
      </div>
    </div>

    <!-- Результаты распознавания -->
    <div v-if="recognizedArea1 || recognizedArea2" class="results-section q-pa-md">
      <q-card>
        <q-card-section>
          <div class="text-h6">Результаты распознавания</div>
          <q-separator class="q-my-md" />

          <!-- Результаты областей -->
          <div class="area-results">
            <div v-if="recognizedArea1" class="area-result q-mb-md">
              <div class="text-subtitle2" style="color: #ff4444;">
                📍 Область 1
              </div>
              <div class="recognized-text area-text">
                {{ recognizedArea1 }}
              </div>
            </div>

            <div v-if="recognizedArea2" class="area-result q-mb-md">
              <div class="text-subtitle2" style="color: #44ff44;">
                📍 Область 2
              </div>
              <div class="recognized-text area-text">
                {{ recognizedArea2 }}
              </div>
            </div>
          </div>

          <!-- Сравнение результатов -->
          <div v-if="recognizedArea1 && recognizedArea2" class="comparison-section q-mt-lg">
            <q-separator class="q-my-md" />
            <div class="text-subtitle2 text-center q-mb-md">Сравнение результатов</div>

            <div :class="['comparison-status', comparisonResult.identical ? 'bg-positive' : 'bg-warning']"
                 class="q-pa-sm text-white text-center rounded-borders q-mb-md">
              <q-icon :name="comparisonResult.identical ? 'check' : 'warning'" class="q-mr-sm" />
              {{ comparisonResult.message }}
            </div>

            <!-- Поле для ручного ввода если результаты отличаются -->
            <div v-if="!comparisonResult.identical" class="manual-input-section">
              <div class="text-caption text-grey text-center q-mb-sm">
                Результаты отличаются. Пожалуйста, введите номер купюры вручную:
              </div>
              <q-input
                v-model="manualInput"
                label="Номер купюры"
                placeholder="Введите номер купюры с заглавными буквами и цифрами"
                :rules="[val => !!val || 'Поле обязательно для заполнения']"
                class="q-mb-md"
                @keyup.enter="handleSendToServer"
              />
              <div class="row justify-center">
                <q-btn
                  color="primary"
                  icon="send"
                  label="Отправить на проверку"
                  @click="handleSendToServer"
                  :disable="!manualInput"
                  :loading="isSending"
                />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div v-else-if="!selectedImage" class="placeholder q-pa-xl text-center">
      <q-icon name="document_scanner" size="xl" color="grey" />
      <div class="text-grey q-mt-md">Выберите изображение для распознавания текста</div>
      <div class="text-caption text-grey q-mt-sm">
        • "Сделать снимок" - сфотографируйте через камеру<br>
        • "Выбрать из галереи" - загрузите существующее фото
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCamera } from 'src/composables/useCamera';
import { useOCR } from 'src/composables/useOCR';
import { useSelection } from 'src/composables/useSelection';
import { useQuasar } from 'quasar';

// Инициализация composables
const cameraComposable = useCamera();
const {
  recognizedArea1,
  recognizedArea2,
  isProcessing,
  progress,
  recognizeSelectedArea,
  compareAreaTexts,
  sendToServer,
  clearAreaResults,
  terminateWorker
} = useOCR();
const selectionComposable = useSelection();
const $q = useQuasar();

// Реактивные переменные
const {
  selectedImage,
  rotationAngle,
  getPlatformInfo,
  isCameraActive,
  takePhoto,
  pickFromGallery,
  rotateImage,
  resetRotation
} = cameraComposable;

const {
  selections,
  currentSelection,
  isSelecting,
  selectionMode,
  hasArea1,
  hasArea2,
  startSelection,
  updateSelection,
  endSelection,
  clearSelections,
  getSelectionStyle,
  getSelectionClass,
  getSelectionLabel,
  getSelectionColor
} = selectionComposable;

const cameraLoading = ref(false);
const platformInfo = ref({
  isBrowser: true,
  isSecure: false,
  platform: 'browser'
});
const imageContainer = ref(null);
const comparisonResult = ref({ identical: false, similarity: 0, message: '' });
const manualInput = ref('');
const isSending = ref(false);

// Стили для контейнера изображения
const imageContainerStyle = computed(() => ({
  position: 'relative',
  maxWidth: '100%',
  maxHeight: '400px',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  cursor: 'crosshair'
}));

// Стили для изображения с поворотом
const imageStyle = computed(() => ({
  transform: `rotate(${rotationAngle.value}deg)`,
  transition: 'transform 0.3s ease',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain'
}));

// Получение текстового описания источника изображения
const getImageSource = (source) => {
  const sources = {
    'camera': 'Камера',
    'photos': 'Галерея'
  };
  return sources[source] || 'Неизвестно';
};

// Обработчики мыши для выделения областей
const handleMouseDown = (event) => {
  if (!imageContainer.value) return;

  const started = startSelection(selectionMode.value, event, imageContainer.value);
  if (started) {
    event.preventDefault();
  }
};

const handleMouseMove = (event) => {
  if (!isSelecting.value || !imageContainer.value) return;

  updateSelection(event, imageContainer.value);
  event.preventDefault();
};

const handleMouseUp = async () => {
  if (isSelecting.value) {
    endSelection();

    // Автоматически распознаем выделенную область
    if (selections.value.length > 0) {
      const lastSelection = selections.value[selections.value.length - 1];
      await recognizeSelectedArea(selectedImage.value.webPath, selections.value, lastSelection.mode);

      // Если есть обе области, сравниваем результаты
      if (hasArea1.value && hasArea2.value) {
        comparisonResult.value = compareAreaTexts();
      }
    }
  }
};

const handleMouseLeave = () => {
  if (isSelecting.value) {
    endSelection();
  }
};

// Обработчики кнопок камеры и галереи
const handleTakePhoto = async () => {
  cameraLoading.value = true;
  try {
    await takePhoto();
    // Очищаем предыдущие выделения при новом фото
    clearSelections();
    clearAreaResults();
    comparisonResult.value = { identical: false, similarity: 0, message: '' };
    manualInput.value = '';
  } catch (error) {
    console.error('Error taking photo:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при открытии камеры',
      position: 'top'
    });
  } finally {
    cameraLoading.value = false;
  }
};

const handlePickFromGallery = async () => {
  cameraLoading.value = true;
  try {
    await pickFromGallery();
    // Очищаем предыдущие выделения при новой загрузке
    clearSelections();
    clearAreaResults();
    comparisonResult.value = { identical: false, similarity: 0, message: '' };
    manualInput.value = '';
  } catch (error) {
    console.error('Error picking from gallery:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при открытии галереи',
      position: 'top'
    });
  } finally {
    cameraLoading.value = false;
  }
};

// Функции поворота
const rotateLeft = () => {
  rotateImage();
};

const rotateRight = () => {
  for (let i = 0; i < 3; i++) {
    rotateImage();
  }
};

// Отправка данных на сервер
const handleSendToServer = async () => {
  if (!selectedImage.value || !manualInput.value) return;

  isSending.value = true;
  try {
    // Подготовка данных для отправки
    const imageData = selectedImage.value.webPath;

    await sendToServer(
      imageData,
      recognizedArea1.value,
      recognizedArea2.value,
      manualInput.value
    );

    $q.notify({
      type: 'positive',
      message: 'Данные успешно отправлены на проверку!',
      position: 'top',
      timeout: 3000
    });

    // Очищаем форму после успешной отправки
    manualInput.value = '';

  } catch (error) {
    console.error('Error sending data to server:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при отправке данных на сервер',
      position: 'top'
    });
  } finally {
    isSending.value = false;
  }
};

const clearAll = () => {
  selectedImage.value = null;
  clearAreaResults();
  clearSelections();
  comparisonResult.value = { identical: false, similarity: 0, message: '' };
  manualInput.value = '';
  resetRotation();
};

// Инициализация при загрузке компонента
onMounted(() => {
  platformInfo.value = getPlatformInfo();
});

// Освобождаем ресурсы при размонтировании
onUnmounted(async () => {
  await terminateWorker();
});
</script>

<style scoped>
.image-scanner {
  max-width: 100%;
  min-height: 100vh;
}

.connection-info {
  border-radius: 0 0 8px 8px;
}

.camera-active-indicator {
  border-radius: 8px;
  margin: 0 16px 16px 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

/* Стили для выделения областей */
.selection-overlay {
  position: absolute;
  border: 2px solid;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: 10;
}

.selection-area-1 {
  border-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.selection-area-2 {
  border-color: #44ff44;
  background: rgba(68, 255, 68, 0.1);
}

.selection-active {
  background: rgba(255, 255, 255, 0.2);
}

.selection-label {
  position: absolute;
  top: -25px;
  left: 0;
  padding: 2px 8px;
  color: white;
  font-size: 12px;
  border-radius: 4px;
  pointer-events: auto;
  display: flex;
  align-items: center;
}

/* Стили для результатов */
.area-results {
  border-left: 4px solid #1976d2;
  padding-left: 16px;
}

.area-result {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-bottom: 16px;
}

.recognized-text {
  white-space: pre-wrap;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  font-family: 'Courier New', monospace;
  line-height: 1.5;
  font-size: 14px;
  max-height: 200px;
  overflow-y: auto;
}

.comparison-status {
  font-weight: bold;
}

.manual-input-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.image-container {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.scanned-image {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.rotation-info {
  color: #666;
  font-weight: 500;
}

.placeholder {
  opacity: 0.7;
}

.image-info {
  line-height: 1.4;
}

.selection-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.current-selection-info {
  margin-top: 12px;
}
</style>
