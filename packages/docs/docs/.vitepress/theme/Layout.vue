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
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import HomeHero from './components/HomeHero.vue'
import HomeUseCases from './components/HomeUseCases.vue'
import HomeCode from './components/HomeCode.vue'
import HomePerf from './components/HomePerf.vue'
import HomeCta from './components/HomeCta.vue'
import HomeFooter from './components/HomeFooter.vue'

const { lang } = useData()
const route = useRoute()

// 内置语言下拉只切路由；这里跟随页面 locale 同步组件内部文案（@oas-ui/i18n）。
// immediate：直接落在 /en/ 深链的首屏也要对齐。
// 持久化（oas-lang）只在用户「显式切换」时写——判据是点击语言下拉（.VPNavBarTranslations）里的
// 链接；落地首屏与 SPA 内的 lang 重算一律不写。仅靠 oldValue === undefined 判定不够：路由/水合
// 重算会以「oldValue 有值」的形式再次触发，满负载下曾把落地页 locale 写回偏好槽（污染后 en 浏览器
// 访问 zh 深链不再跳转，homepage.spec 全量并发实抓），故改为显式点击判据 + 首调守卫双保险。
let userSwitchedLang = false
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target as Element | null
      if (el?.closest?.('.VPNavBarTranslations')) userSwitchedLang = true
    },
    true,
  )
}
watch(
  lang,
  (value, oldValue) => {
    void applyI18n(value === 'en' ? 'en' : 'zh-CN')
    if (oldValue === undefined || !userSwitchedLang) return
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('oas-lang', value === 'en' ? 'en' : 'zh')
      }
    } catch {
      // localStorage 不可用（隐私模式等）静默——首访适配退回浏览器语言探测
    }
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
  if (typeof window === 'undefined') return
  if (!io) {
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
  }
  // SPA 导航回来时同一 observer 复用于新出现的 .home-reveal；已触发 .in 的跳过
  document.querySelectorAll('.home-reveal:not(.in)').forEach((el) => io?.observe(el))
}
onMounted(observeReveal)
// SPA 导航到首页（layout: home）时才出现 .home-reveal：首载若是组件页，onMounted 时
// 查不到这些元素，导航回首页后必须重新 observe，否则中间几屏永远 opacity:0。
watch(
  () => route.path,
  () => {
    void nextTick(observeReveal)
  },
)
onBeforeUnmount(() => io?.disconnect())
</script>
