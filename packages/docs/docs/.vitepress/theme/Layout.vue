<template>
  <DefaultTheme.Layout>
    <!-- 官网首页（layout: home）专用 slot；非 home 页面这些 slot 不会被渲染 -->
    <template #home-hero-image><HeroTableDemo /></template>
    <template #home-features-before>
      <StatsBar />
      <SceneShowcase />
      <CodeShowcase />
    </template>
    <template #home-features-after>
      <PerfSection />
      <FeatureGrid />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import HeroTableDemo from './components/HeroTableDemo.vue'
import StatsBar from './components/StatsBar.vue'
import SceneShowcase from './components/SceneShowcase.vue'
import CodeShowcase from './components/CodeShowcase.vue'
import PerfSection from './components/PerfSection.vue'
import FeatureGrid from './components/FeatureGrid.vue'

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
