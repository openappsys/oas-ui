/**
 * basic 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(basicMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const basicMessages: Partial<LocaleMessages> = {
  'badge.notifications': '{count} 条未读通知',
  'typography.copy': '复制',
  'tag.close': '关闭',
  'tagGroup.group': '标签组',
  'buttonGroup.group': '按钮组',
  'compact.group': '紧凑组合',
}
