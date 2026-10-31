/**
 * feedback 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(feedbackMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const feedbackMessages: Partial<LocaleMessages> = {
  'modal.close': '关闭',
  'modal.ok': '确定',
  'modal.cancel': '取消',
  'modal.maximize': '最大化',
  'modal.restore': '还原',
  'empty.noData': '暂无数据',
  'alert.close': '关闭',
  'drawer.close': '关闭',
  'drawer.ok': '确定',
  'drawer.cancel': '取消',
  'drawer.resize': '调整抽屉尺寸',
  'message.close': '关闭',
  'notification.close': '关闭',
  'notification.region': '通知',
  'noticeBar.closeAriaLabel': '关闭',
  'noticeBar.regionLabel': '通告',
  'toast.close': '关闭',
  'snackbar.close': '关闭',
  'popconfirm.ok': '确定',
  'popconfirm.cancel': '取消',
  'form.validationFailed': '校验未通过',
  'loading.loading': '加载中…',
  'popover.close': '关闭',
  'ellipsis.expand': '展开',
  'ellipsis.collapse': '收起',
  'pullRefresh.pull': '下拉刷新',
  'pullRefresh.release': '松开立即刷新',
  'pullRefresh.refreshing': '刷新中…',
  'pullRefresh.success': '刷新成功',
}
