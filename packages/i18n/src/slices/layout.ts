/**
 * layout 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(layoutMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const layoutMessages: Partial<LocaleMessages> = {
  'splitter.adjust': '调整面板宽度',
  'splitter.collapse': '收起面板',
  'splitter.expand': '展开面板',
  'layout.sider': '侧边栏',
  'sidebar.nav': '侧栏导航',
  'sidebar.toggle': '折叠侧栏',
  'sidebar.expand': '展开侧栏',
  'sidebar.openMenu': '打开侧栏',
  'sidebar.closeMenu': '关闭侧栏',
  'sidebar.resize': '调整侧栏宽度',
  'ellipsis.expand': '展开',
  'ellipsis.collapse': '收起',
}
