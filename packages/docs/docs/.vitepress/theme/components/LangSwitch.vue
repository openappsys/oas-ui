<template>
  <button
    class="lang-switch"
    type="button"
    :title="current === 'zh-CN' ? 'Switch to English' : '切换为中文'"
    :aria-label="current === 'zh-CN' ? 'Switch to English' : '切换为中文'"
    @click="toggle"
  >
    {{ current === 'zh-CN' ? 'EN' : '中文' }}
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const current = ref<'zh-CN' | 'en'>('zh-CN')

onMounted(async () => {
  const { getLocaleName } = await import('@oas-ui/i18n')
  current.value = (getLocaleName() as 'zh-CN' | 'en') ?? 'zh-CN'
})

async function toggle(): Promise<void> {
  const next = current.value === 'zh-CN' ? 'en' : 'zh-CN'
  const { setLocale, registerLocale } = await import('@oas-ui/i18n')
  const pack =
    next === 'en'
      ? (await import('@oas-ui/i18n/en')).default
      : (await import('@oas-ui/i18n/zh-CN')).default
  registerLocale(pack)
  setLocale(next)
  current.value = next
}
</script>

<style scoped>
.lang-switch {
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-md);
  padding: 2px 10px;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  font-family: inherit;
  margin-left: var(--oas-space-2);
  line-height: 1.6;
}
.lang-switch:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
</style>
