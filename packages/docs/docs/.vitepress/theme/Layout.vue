<template>
  <DefaultTheme.Layout>
    <!-- 官网首页（layout: home）专用 slot；非 home 页面这些 slot 不会被渲染 -->
    <template #home-hero-before><HomeHero /></template>
    <template #home-hero-after><HomeUseCases /></template>
    <template #home-features-before><HomeCode /></template>
    <template #home-features-after><HomePerf /><HomeCta /><HomeFooter /></template>
  </DefaultTheme.Layout>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import HomeHero from './components/HomeHero.vue'
import HomeUseCases from './components/HomeUseCases.vue'
import HomeCode from './components/HomeCode.vue'
import HomePerf from './components/HomePerf.vue'
import HomeCta from './components/HomeCta.vue'
import HomeFooter from './components/HomeFooter.vue'

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

// 首页滚动入场：观察 .home-reveal，进入视口时加 .in（尊重 prefers-reduced-motion）
let io: IntersectionObserver | null = null
function observeReveal(): void {
  if (typeof window === 'undefined' || io) return
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          io?.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )
  document.querySelectorAll('.home-reveal').forEach((el) => io?.observe(el))
}
onMounted(observeReveal)
onBeforeUnmount(() => io?.disconnect())
</script>
