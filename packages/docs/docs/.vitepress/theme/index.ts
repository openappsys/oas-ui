import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import '@oas-ui/theme'
import './style.css'
import DemoBlock from './components/DemoBlock.vue'
import TokenShowcase from './components/TokenShowcase.vue'
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
  enhanceApp({ app, router }) {
    app.component('DemoBlock', DemoBlock)
    app.component('TokenShowcase', TokenShowcase)
    // gtag 的 config 只在页面整加载时触发一次 page_view，SPA 内路由切换需手动补发。
    // vitepress Router 的钩子是实例属性（onAfterRouteChanged），必须赋值注册；
    // 此前误写成「onAfterRouteChange?.(cb) 方法调用」——属性不存在，可选链静默短路，补发从未生效
    if (!import.meta.env.SSR) {
      router.onAfterRouteChanged = (to) => {
        const w = window as unknown as {
          gtag?: (cmd: string, id: string, opts?: { page_path?: string }) => void
        }
        w.gtag?.('config', 'G-RXS142HBXF', { page_path: to })
      }
    }
  },
  setup() {
    if (typeof window !== 'undefined') {
      // 延迟到首帧，确保 demo 元素已渲染
      requestAnimationFrame(() => bindOnOas(document))
    }
  },
} satisfies Theme
