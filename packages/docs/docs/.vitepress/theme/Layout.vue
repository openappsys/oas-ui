<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-after>
      <LangSwitch />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import LangSwitch from './components/LangSwitch.vue'
</script>
