import { Preferences } from '@capacitor/preferences';
import { ref } from 'vue';

export function useDatabase() {
  const scanHistory = ref([]);

  const initDatabase = async () => {
    const { value } = await Preferences.get({ key: 'scanHistory' });
    if (value) {
      scanHistory.value = JSON.parse(value);
    }
  };

  const saveScanResult = async (imageUrl, text, coordinates = null) => {
    const scanResult = {
      id: Date.now() + Math.random(),
      imageUrl,
      recognizedText: text,
      coordinates,
      rotation: coordinates?.rotation || 0,
      timestamp: new Date().toISOString()
    };

    scanHistory.value.unshift(scanResult);

    await Preferences.set({
      key: 'scanHistory',
      value: JSON.stringify(scanHistory.value)
    });

    return scanResult;
  };

  const getScanHistory = async () => {
    await initDatabase();
    return scanHistory.value;
  };

  const deleteScanResult = async (id) => {
    scanHistory.value = scanHistory.value.filter(item => item.id !== id);
    await Preferences.set({
      key: 'scanHistory',
      value: JSON.stringify(scanHistory.value)
    });
  };

  return {
    scanHistory,
    initDatabase,
    saveScanResult,
    getScanHistory,
    deleteScanResult
  };
}
