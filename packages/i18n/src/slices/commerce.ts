/**
 * commerce 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(commerceMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const commerceMessages: Partial<LocaleMessages> = {
  'sku.quantityLabel': '数量',
  'sku.increase': '增加数量',
  'sku.decrease': '减少数量',
  'sku.soldOut': '缺货',
  'coupon.select': '选择优惠券',
  'coupon.empty': '暂无可用优惠券',
  'coupon.close': '关闭',
  'coupon.threshold': '满 {amount} 可用',
  'coupon.noThreshold': '无门槛',
  'coupon.expired': '已过期',
  'coupon.used': '已使用',
  'goodsAction.label': '商品操作',
  'goodsAction.favorite': '收藏',
  'goodsAction.shop': '店铺',
  'goodsAction.cart': '购物车',
  'submitBar.total': '合计',
  'price.original': '原价',
  'price.trendUp': '上涨',
  'price.trendDown': '下跌',
}
