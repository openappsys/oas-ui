import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import '@oas-ui/theme'
import './style.css'
import DemoBlock from './components/DemoBlock.vue'
import Layout from './Layout.vue'
import { bindOnOas } from './onoas'

if (!import.meta.env.SSR) {
  // Web Components 需在浏览器环境注册；SSR 构建阶段跳过
  import('@oas-ui/ui').then((mod) => {
    // demo 内联事件（onclick / onoas-*）在全局作用域 eval，需要命令式 API 挂到 window
    const w = window as unknown as Record<string, unknown>
    w.message = mod.message
    w.toast = mod.toast
    w.notification = mod.notification
    w.loadingBar = mod.loadingBar
    w.confirm = mod.confirm
  })
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('DemoBlock', DemoBlock)
  },
  setup() {
    if (typeof window !== 'undefined') {
      // 延迟到首帧，确保 demo 元素已渲染
      requestAnimationFrame(() => bindOnOas(document))
    }
  },
} satisfies Theme
