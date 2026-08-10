<template>
  <DefaultTheme.Layout />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'

const { lang } = useData()

// 内置语言下拉只切路由；这里跟随页面 locale 同步组件内部文案（@oas-ui/i18n）。
// immediate：直接落在 /en/ 深链的首屏也要对齐。
watch(
  lang,
  (value) => {
    void applyI18n(value === 'en' ? 'en' : 'zh-CN')
  },
  { immediate: true },
)

async function applyI18n(next: 'zh-CN' | 'en'): Promise<void> {
  const { setLocale, registerLocale, getLocale } = await import('@oas-ui/i18n')
  if (getLocale() === next) return
  const pack =
    next === 'en'
      ? (await import('@oas-ui/i18n/en')).default
      : (await import('@oas-ui/i18n/zh-CN')).default
  registerLocale(pack)
  setLocale(next)
}
</script>
