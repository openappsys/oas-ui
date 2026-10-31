/**
 * conversation 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(conversationMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const conversationMessages: Partial<LocaleMessages> = {
  'toolCall.running': '运行中',
  'toolCall.success': '已完成',
  'toolCall.error': '失败',
  'toolCall.arguments': '参数',
  'toolCall.result': '结果',
  'promptInput.placeholder': '输入消息…',
  'promptInput.send': '发送',
  'promptInput.stop': '停止',
  'promptInput.suggestions': '建议',
  'bubble.loading': '正在输入…',
  'bubble.reactions': '表情回应',
  'attachment.remove': '移除 {name}',
  'attachment.download': '下载 {name}',
  'attachment.error': '上传失败',
  'attachment.group': '附件组',
  'messageScroller.label': '消息列表',
  'messageScroller.scrollToBottom': '滚动到底部',
  'messageRow.status.sending': '发送中',
  'messageRow.status.sent': '已发送',
  'messageRow.status.delivered': '已送达',
  'messageRow.status.read': '已读',
  'messageRow.status.error': '发送失败',
}
