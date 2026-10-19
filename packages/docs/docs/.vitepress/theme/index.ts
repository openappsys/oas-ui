import type { Theme } from 'vitepress'
import { onMounted } from 'vue'
import DefaultTheme from 'vitepress/theme'
import '@oas-ui/theme'
import '@oas-ui/theme/skins.css'
import '@oas-ui/theme/glass.css'
import '@oas-ui/theme/glass-fluid.js'
// 静态注册内置图标集：早于 onMounted 的动态 import('@oas-ui/ui')，避免组件首渲染时内置图名未注册
import '@oas-ui/icons/register'
import './style.css'
import DemoBlock from './components/DemoBlock.vue'
import TokenShowcase from './components/TokenShowcase.vue'
import Layout from './Layout.vue'
import { bindOnOas } from './onoas'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    app.component('DemoBlock', DemoBlock)
    app.component('TokenShowcase', TokenShowcase)
    // gtag 的 config 只在页面整加载时触发一次 page_view，SPA 内路由切换需手动补发。
    // VitePress 2 把 Router 钩子改名为 onAfterRouteChange（1.x 为 onAfterRouteChanged），
    // 两个都写：当前版本走新名，兼容未来回退/升级；钩子是实例属性，必须赋值注册，
    // 不能写成 onAfterRouteChange?.(cb) 方法调用（可选链会静默短路）。
    // 仅生产环境补发：dev 下 config.ts 不注入 gtag 脚本（w.gtag 不存在），此处一并跳过
    if (!import.meta.env.SSR && import.meta.env.PROD) {
      // 首屏已由 gtag inline config 自动发 page_view；VitePress 2 首载也会调用一次钩子，
      // 因此以当前 pathname 初始化，首次回调跳过；同页 hash 跳转也不重复发。
      // `.html` 入口与 clean URL 需要归一到同一 path，否则旧外链会首屏多计一次。
      const normalizePath = (path: string): string =>
        path.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '').replace(/\/$/, '') || '/'
      let lastPagePath = normalizePath(window.location.pathname)
      const sendPageView = (to: string): void => {
        const w = window as unknown as {
          gtag?: (cmd: string, id: string, opts?: { page_path?: string }) => void
        }
        const path = normalizePath(new URL(to, window.location.origin).pathname)
        if (path === lastPagePath) return
        lastPagePath = path
        w.gtag?.('config', 'G-RXS142HBXF', { page_path: to })
      }
      router.onAfterRouteChange = sendPageView
      ;(
        router as typeof router & { onAfterRouteChanged?: (to: string) => void }
      ).onAfterRouteChanged = sendPageView
    }
  },
  setup() {
    if (typeof window !== 'undefined') {
      // 组件注册（customElements.define）与命令式 API 挂载必须推迟到 onMounted——
      // 即整个应用树水合完成之后。若在模块求值期注册，组件 chunk 与水合 chunk 的
      // 到达顺序是竞态：元素升级早于水合时，在 connectedCallback 里迁移宿主的组件
      // （如 back-top 的 append-to teleport）会改动水合前的 DOM 结构，触发
      // 「Hydration completed but contains mismatches.」error。
      // onMounted 后注册则升级必然晚于水合，对全部组件页确定性成立。
      onMounted(() => {
        import('@oas-ui/ui').then((mod) => {
          // demo 内联事件（onclick / onoas-*）在全局作用域 eval，需要命令式 API 挂到 window
          const w = window as unknown as Record<string, unknown>
          w.message = mod.message
          w.toast = mod.toast
          w.notification = mod.notification
          w.loadingBar = mod.loadingBar
          w.confirm = mod.confirm
          w.levelResources = mod.levelResources
        })
        // 延迟到首帧，确保 demo 元素已渲染
        requestAnimationFrame(() => bindOnOas(document))
      })
    }
  },
} satisfies Theme
