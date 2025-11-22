import { createWorker } from 'tesseract.js';
import { ref } from 'vue';
import { Notify } from 'quasar';

export function useOCR() {
  const recognizedText = ref('');
  const recognizedArea1 = ref('');
  const recognizedArea2 = ref('');
  const isProcessing = ref(false);
  const progress = ref(0);
  const worker = ref(null);

  // Инициализация воркера с русским языком
  const initializeWorker = async () => {
    if (!worker.value) {
      worker.value = await createWorker('rus+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            progress.value = Math.round(m.progress * 100);
          }
        },
        errorHandler: err => {
          console.error('OCR Worker Error:', err);
          Notify.create({
            type: 'negative',
            message: 'Ошибка OCR: ' + err.message,
            position: 'top'
          });
        }
      });

      await worker.value.setParameters({
        tessedit_char_whitelist: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789 ',
        tessedit_pageseg_mode: '6',
        tessedit_ocr_engine_mode: '1',
      });
    }
    return worker.value;
  };

  // Распознавание текста со всего изображения
  const recognizeText = async (imageUrl, rotationAngle = 0) => {
    isProcessing.value = true;
    progress.value = 0;

    try {
      const ocrWorker = await initializeWorker();
      const { data: { text } } = await ocrWorker.recognize(imageUrl);

      recognizedText.value = cleanRecognizedText(text);
      return recognizedText.value;
    } catch (error) {
      console.error('OCR Recognition Error:', error);
      Notify.create({
        type: 'negative',
        message: 'Ошибка распознавания текста: ' + error.message,
        position: 'top'
      });
      return '';
    } finally {
      isProcessing.value = false;
      progress.value = 0;
    }
  };

  // Распознавание текста из конкретной области
  const recognizeArea = async (imageUrl, area, areaName = 'области') => {
    if (!area || !area.width || !area.height) {
      console.error('Invalid area provided');
      return '';
    }

    try {
      const ocrWorker = await initializeWorker();

      const { data: { text } } = await ocrWorker.recognize(imageUrl, {
        rectangle: {
          left: Math.round(area.x),
          top: Math.round(area.y),
          width: Math.round(area.width),
          height: Math.round(area.height)
        }
      });

      const cleanedText = cleanRecognizedText(text);

      // Сохраняем в соответствующую область
      if (area.mode === 'area1') {
        recognizedArea1.value = cleanedText;
      } else if (area.mode === 'area2') {
        recognizedArea2.value = cleanedText;
      }

      return cleanedText;
    } catch (error) {
      console.error(`OCR Area Recognition Error for ${areaName}:`, error);
      return '';
    }
  };

  // Распознавание выделенной области
  const recognizeSelectedArea = async (imageUrl, selections, mode) => {
    isProcessing.value = true;
    progress.value = 0;

    try {
      const selection = selections.find(s => s.mode === mode);
      if (!selection) {
        throw new Error(`Область ${mode} не найдена`);
      }

      const text = await recognizeArea(imageUrl, selection, mode);
      progress.value = 100;
      return text;
    } catch (error) {
      console.error(`OCR Selected Area Error for ${mode}:`, error);
      return '';
    } finally {
      isProcessing.value = false;
      progress.value = 0;
    }
  };

  // Сравнение текстов двух областей
  const compareAreaTexts = () => {
    const text1 = recognizedArea1.value;
    const text2 = recognizedArea2.value;

    if (!text1 || !text2) {
      return {
        identical: false,
        similarity: 0,
        message: 'Оба текста должны быть распознаны для сравнения'
      };
    }

    // Нормализация текстов для сравнения
    const normalized1 = text1.trim().toLowerCase();
    const normalized2 = text2.trim().toLowerCase();

    const identical = normalized1 === normalized2;
    const similarity = identical ? 100 : calculateSimilarity(normalized1, normalized2);

    return {
      identical,
      similarity: Math.round(similarity),
      message: identical ? 'Тексты идентичны!' : `Тексты отличаются. Сходство: ${Math.round(similarity)}%`
    };
  };

  // Расчет схожести текстов
  const calculateSimilarity = (text1, text2) => {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 100;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return (matches / longer.length) * 100;
  };

  // Очистка распознанного текста
  const cleanRecognizedText = (text) => {
    if (!text) return '';

    return text
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Очистка результатов областей
  const clearAreaResults = () => {
    recognizedArea1.value = '';
    recognizedArea2.value = '';
  };

  // Отправка данных на сервер
  const sendToServer = async (imageData, area1Text, area2Text, userInput) => {
    try {
      const response = await fetch('/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          area1: area1Text,
          area2: area2Text,
          userInput: userInput,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending data to server:', error);
      throw error;
    }
  };

  // Освобождение ресурсов
  const terminateWorker = async () => {
    if (worker.value) {
      await worker.value.terminate();
      worker.value = null;
    }
  };

  return {
    recognizedText,
    recognizedArea1,
    recognizedArea2,
    isProcessing,
    progress,
    recognizeText,
    recognizeArea,
    recognizeSelectedArea,
    compareAreaTexts,
    sendToServer,
    clearAreaResults,
    terminateWorker
  };
}
