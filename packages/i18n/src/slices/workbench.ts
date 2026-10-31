/**
 * workbench 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(workbenchMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const workbenchMessages: Partial<LocaleMessages> = {
  'titlebar.label': '标题栏',
  'titlebar.windowControls': '窗口控制',
  'titlebar.docTitle': '文档标题',
  'titlebar.minimize': '最小化',
  'titlebar.maximize': '最大化',
  'titlebar.close': '关闭',
  'statusbar.label': '状态栏',
  'inspector.label': '属性面板',
  'inspector.mixed': '混合值',
  'inspector.reset': '复位',
  'inspector.empty': '未选中对象',
  'actionBar.label': '操作栏',
  'actionBar.progress': '任务进度',
  'actionBar.cancel': '取消任务',
  'actionBar.seek': '跳转到指定帧',
  'floatingPanel.label': '悬浮面板',
  'floatingPanel.close': '关闭面板',
}
