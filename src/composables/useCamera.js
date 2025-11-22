import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ref } from 'vue';
import { Notify } from 'quasar';

export function useCamera() {
  const selectedImage = ref(null);
  const isLoading = ref(false);
  const rotationAngle = ref(0);
  const hasCameraPermission = ref(false);
  const isCameraActive = ref(false);

  // Определяем, запущено ли в браузере или мобильном приложении
  const isRunningInBrowser = () => {
    return !window.Capacitor ||
           !window.Capacitor.isNativePlatform ||
           window.Capacitor.getPlatform() === 'web';
  };

  // Проверка доступности камеры в браузере
  const isBrowserCameraAvailable = async () => {
    // Разрешаем камеру для localhost и безопасных контекстов
    const isSecureContext = window.isSecureContext ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      console.log('Camera not available: insecure context for HTTP');
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera not available: mediaDevices not supported');
      return false;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      console.log('Camera available:', hasCamera);
      return hasCamera;
    } catch (error) {
      console.warn('Cannot enumerate media devices:', error);
      return false;
    }
  };

  // Браузерная камера через HTML5 Media API
  const takePhotoBrowser = async () => {
    try {
      // Проверяем доступность камеры
      const cameraAvailable = await isBrowserCameraAvailable();
      if (!cameraAvailable) {
        Notify.create({
          type: 'warning',
          message: 'Камера недоступна. Используется загрузка файла.',
          position: 'top',
          timeout: 3000
        });
        return takePhotoBrowserFallback();
      }

      // Запрашиваем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      // Создаем интерфейс для съемки фото
      return new Promise((resolve) => {
        // Создаем модальное окно для камеры
        const cameraModal = document.createElement('div');
        cameraModal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `;

        // Видео элемент (инвертируем для предпросмотра)
        const video = document.createElement('video');
        video.style.cssText = `
          width: 100%;
          max-width: 100%;
          height: 70vh;
          object-fit: cover;
          transform: scaleX(-1); /* Инвертируем для предпросмотра */
        `;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;

        // Контейнер для кнопок
        const controls = document.createElement('div');
        controls.style.cssText = `
          display: flex;
          gap: 16px;
          margin: 20px;
          flex-wrap: wrap;
          justify-content: center;
        `;

        // Кнопка съемки
        const captureBtn = document.createElement('button');
        captureBtn.innerHTML = '📷 Снять фото';
        captureBtn.style.cssText = `
          padding: 12px 24px;
          font-size: 16px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          min-width: 140px;
        `;

        // Кнопка отмены
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '❌ Отмена';
        cancelBtn.style.cssText = `
          padding: 12px 24px;
          font-size: 16px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          min-width: 140px;
        `;

        // Функция очистки
        const cleanup = () => {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (document.body.contains(cameraModal)) {
            document.body.removeChild(cameraModal);
          }
          isCameraActive.value = false;
        };

        // Событие съемки фото
        captureBtn.onclick = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Сохраняем изображение БЕЗ инвертирования (оригинальная ориентация)
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            const imageUrl = URL.createObjectURL(blob);
            resolve({
              webPath: imageUrl,
              format: 'jpeg',
              source: 'camera'
            });
            cleanup();
          }, 'image/jpeg', 0.9);
        };

        // Событие отмены
        cancelBtn.onclick = () => {
          resolve(null);
          cleanup();
        };

        // Закрытие по клику на фон
        cameraModal.onclick = (e) => {
          if (e.target === cameraModal) {
            resolve(null);
            cleanup();
          }
        };

        // Собираем интерфейс
        controls.appendChild(captureBtn);
        controls.appendChild(cancelBtn);
        cameraModal.appendChild(video);
        cameraModal.appendChild(controls);
        document.body.appendChild(cameraModal);

        isCameraActive.value = true;
      });

    } catch (error) {
      console.error('Camera error:', error);

      if (error.name === 'NotAllowedError') {
        Notify.create({
          type: 'negative',
          message: 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.',
          position: 'top',
          timeout: 5000
        });
      } else if (error.name === 'NotFoundError') {
        Notify.create({
          type: 'warning',
          message: 'Камера не найдена. Используется загрузка файла.',
          position: 'top'
        });
      } else {
        Notify.create({
          type: 'negative',
          message: 'Ошибка доступа к камере.',
          position: 'top'
        });
      }
      return takePhotoBrowserFallback();
    }
  };

  // Fallback метод через файловый input с камерой
  const takePhotoBrowserFallback = () => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          resolve({
            webPath: imageUrl,
            format: file.type.split('/')[1] || 'jpeg',
            source: 'camera'
          });
        } else {
          resolve(null);
        }

        setTimeout(() => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }, 1000);
      };

      input.oncancel = () => {
        resolve(null);
        setTimeout(() => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }, 1000);
      };

      input.style.display = 'none';
      document.body.appendChild(input);
      input.click();
    });
  };

  // Нативная камера через Capacitor
  const takePhotoNative = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        saveToGallery: false
      });
      image.source = 'camera';
      return image;
    } catch (error) {
      console.error('Native camera error:', error);
      throw error;
    }
  };

  // Браузерная галерея
  const pickFromGalleryBrowser = () => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = false;

      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          resolve({
            webPath: imageUrl,
            format: file.type.split('/')[1] || 'jpeg',
            source: 'photos'
          });
        } else {
          resolve(null);
        }

        // Удаляем input после короткой задержки
        setTimeout(() => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }, 100);
      };

      input.oncancel = () => {
        resolve(null);
        setTimeout(() => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }, 100);
      };

      // Добавляем input в DOM и запускаем выбор файла
      input.style.display = 'none';
      document.body.appendChild(input);

      // Используем setTimeout для избежания блокировки браузера
      setTimeout(() => {
        input.click();
      }, 100);
    });
  };

  // Нативная галерея через Capacitor
  const pickFromGalleryNative = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024
      });
      image.source = 'photos';
      return image;
    } catch (error) {
      console.error('Native gallery error:', error);
      throw error;
    }
  };

  const takePhoto = async () => {
    try {
      isLoading.value = true;

      let image;

      if (isRunningInBrowser()) {
        console.log('Using browser camera');
        image = await takePhotoBrowser();
      } else {
        console.log('Using native camera');
        image = await takePhotoNative();
      }

      if (image) {
        selectedImage.value = image;
        rotationAngle.value = 0;

        Notify.create({
          type: 'positive',
          message: 'Фото сделано успешно!',
          position: 'top',
          timeout: 1000
        });
      }

      return image;
    } catch (error) {
      console.error('Ошибка при съемке фото:', error);

      if (error.message !== 'User cancelled photos app' &&
          error.message !== 'The user canceled the action') {
        Notify.create({
          type: 'negative',
          message: 'Ошибка при съемке фото: ' + error.message,
          position: 'top'
        });
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const pickFromGallery = async () => {
    try {
      isLoading.value = true;

      let image;

      if (isRunningInBrowser()) {
        console.log('Using browser gallery');
        image = await pickFromGalleryBrowser();
      } else {
        console.log('Using native gallery');
        image = await pickFromGalleryNative();
      }

      if (image) {
        selectedImage.value = image;
        rotationAngle.value = 0;

        Notify.create({
          type: 'positive',
          message: 'Фото выбрано из галереи!',
          position: 'top',
          timeout: 1000
        });
      }

      return image;
    } catch (error) {
      console.error('Ошибка выбора изображения:', error);

      if (error.message !== 'User cancelled photos app' &&
          error.message !== 'The user canceled the action') {
        Notify.create({
          type: 'negative',
          message: 'Ошибка выбора изображения: ' + error.message,
          position: 'top'
        });
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const rotateImage = () => {
    rotationAngle.value = (rotationAngle.value + 90) % 360;
    return rotationAngle.value;
  };

  const resetRotation = () => {
    rotationAngle.value = 0;
  };

  // Получение информации о платформе
  const getPlatformInfo = () => {
    const isBrowser = isRunningInBrowser();
    const isSecure = window.isSecureContext ||
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

    return {
      isBrowser,
      isSecure,
      platform: window.Capacitor ? window.Capacitor.getPlatform() : 'browser',
      protocol: window.location.protocol,
      hostname: window.location.hostname
    };
  };

  return {
    selectedImage,
    isLoading,
    rotationAngle,
    hasCameraPermission,
    isCameraActive,
    takePhoto,
    pickFromGallery,
    rotateImage,
    resetRotation,
    getPlatformInfo
  };
}
