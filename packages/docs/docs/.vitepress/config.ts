import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OAS-UI',
  description: '框架无关的 Web Components UI 组件库',
  lang: 'zh-CN',
  themeConfig: {
    nav: [{ text: '指南', link: '/guide/getting-started' }],
    sidebar: [
      {
        text: '指南',
        items: [{ text: '快速开始', link: '/guide/getting-started' }],
      },
      {
        text: '基础组件',
        items: [
          { text: 'Button 按钮', link: '/components/button' },
          { text: 'Icon 图标', link: '/components/icon' },
          { text: 'Tag 标签', link: '/components/tag' },
          { text: 'Badge 徽标', link: '/components/badge' },
          { text: 'Space 间距', link: '/components/space' },
          { text: 'Divider 分割线', link: '/components/divider' },
          { text: 'Link 链接', link: '/components/link' },
          { text: 'Typography 排版', link: '/components/typography' },
        ],
      },
    ],
  },
})
