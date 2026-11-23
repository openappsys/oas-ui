/**
 * overlay 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(overlayMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const overlayMessages: Partial<LocaleMessages> = {
  'shareSheet.title': '分享到',
  'shareSheet.cancel': '取消',
  'shareSheet.close': '关闭',
  'shareSheet.empty': '暂无可分享渠道',
  'curtain.close': '关闭',
  'curtain.label': '提示',
  'drag.label': '可拖动浮块',
  'drag.hint': '方向键微调位置，按住 Shift 加速',
  'drag.position': '位置 {x}, {y}',
}
