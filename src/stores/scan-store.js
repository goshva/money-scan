import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useScanStore = defineStore('scan', () => {
  const currentScan = ref(null);
  const history = ref([]);
  const isProcessing = ref(false);

  const setCurrentScan = (scan) => {
    currentScan.value = scan;
  };

  const addToHistory = (scan) => {
    history.value.unshift(scan);
  };

  const clearCurrentScan = () => {
    currentScan.value = null;
  };

  return {
    currentScan,
    history,
    isProcessing,
    setCurrentScan,
    addToHistory,
    clearCurrentScan
  };
});
