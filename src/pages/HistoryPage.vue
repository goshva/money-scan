<template>
  <q-page padding>
    <div class="history-page">
      <div class="text-h4 q-mb-md">Scan History</div>
      
      <q-list bordered separator v-if="history.length > 0">
        <q-item 
          v-for="item in history" 
          :key="item.id"
          class="q-mb-sm"
        >
          <q-item-section avatar>
            <q-img
              :src="item.imageUrl"
              width="50px"
              height="50px"
              style="border-radius: 4px;"
            />
          </q-item-section>
          
          <q-item-section>
            <q-item-label>{{ item.recognizedText.substring(0, 100) }}...</q-item-label>
            <q-item-label caption>
              {{ new Date(item.timestamp).toLocaleString() }}
            </q-item-label>
          </q-item-section>
          
          <q-item-section side>
            <q-btn 
              icon="delete" 
              color="negative" 
              flat 
              @click="deleteItem(item.id)"
            />
          </q-item-section>
        </q-item>
      </q-list>
      
      <div v-else class="text-center q-pa-xl">
        <q-icon name="history" size="xl" color="grey" />
        <div class="text-grey q-mt-md">No scan history yet</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDatabase } from 'src/composables/useDatabase';
import { Notify } from 'quasar';

const { getScanHistory, deleteScanResult } = useDatabase();
const history = ref([]);

const loadHistory = async () => {
  history.value = await getScanHistory();
};

const deleteItem = async (id) => {
  await deleteScanResult(id);
  await loadHistory();
  Notify.create({
    type: 'positive',
    message: 'Item deleted successfully'
  });
};

onMounted(() => {
  loadHistory();
});
</script>
