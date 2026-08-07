import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import '@oas-ui/theme'
import './style.css'

if (!import.meta.env.SSR) {
  // Web Components 需在浏览器环境注册；SSR 构建阶段跳过
  import('@oas-ui/ui')
}

export default {
  extends: DefaultTheme,
} satisfies Theme
