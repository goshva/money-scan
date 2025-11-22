<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          Photo Text Scanner
        </q-toolbar-title>
        
        <q-btn 
          flat 
          icon="history" 
          label="History" 
          @click="$router.push('/history')"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
// Основной layout приложения
</script>
