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
  'address.contact': '联系人信息',
  'address.name': '收件人',
  'address.namePlaceholder': '请输入收件人姓名',
  'address.phone': '手机号码',
  'address.phonePlaceholder': '请输入手机号码',
  'address.region': '所在地区',
  'address.detail': '详细地址',
  'address.detailPlaceholder': '街道、门牌号等',
  'address.default': '设为默认地址',
  'address.defaultBadge': '默认',
  'address.save': '保存地址',
  'address.add': '新增地址',
  'address.empty': '暂无收货地址',
  'address.required': '该项为必填项',
  'address.invalidPhone': '手机号码格式不正确',
  'address.listLabel': '地址列表',
  'address.select': '请选择',
  'invoice.typeLabel': '抬头类型',
  'invoice.personal': '个人',
  'invoice.company': '企业',
  'invoice.title': '发票抬头',
  'invoice.titlePlaceholder': '请输入发票抬头',
  'invoice.taxId': '纳税人识别号',
  'invoice.taxIdPlaceholder': '请输入纳税人识别号',
  'invoice.content': '发票内容',
  'invoice.saved': '已保存抬头',
  'invoice.noSaved': '暂无已保存抬头',
  'invoice.submit': '提交',
  'invoice.requiredTitle': '请输入发票抬头',
  'invoice.invalidTaxId': '纳税人识别号需为 15–20 位字母或数字',
  'invoice.selectSaved': '选择已保存抬头',
  'ecard.cards': '选择卡种',
  'ecard.custom': '自定义面额',
  'ecard.amount': '充值金额',
  'ecard.faceValue': '面值 {amount}',
  'ecard.price': '售价 {amount}',
  'ecard.agreement': '我已阅读并同意《电子卡使用协议》',
  'ecard.confirm': '确认购买',
  'ecard.empty': '暂无可用卡种',
  'ecard.invalidAmount': '请输入 {min}–{max} 之间的整数面额',
  'ecard.requiredAgreement': '请先阅读并同意协议',
  'ecard.selectCard': '选择 {name}',
  'category.label': '商品分类',
  'category.back': '返回上级',
  'category.empty': '暂无分类',
  'category.subcategories': '子分类',
  'category.products': '商品',
}
