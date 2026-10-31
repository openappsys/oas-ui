/**
 * framework 家族默认文案切片 —— 生成物，勿手改。
 * 重新生成：node scripts/i18n/gen-slices.mjs
 *
 * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。
 * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。
 * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(frameworkMessages)` 注册。
 */
import type { LocaleMessages } from '../types.js'

export const frameworkMessages: Partial<LocaleMessages> = {
  'confirm.ok': '确定',
  'confirm.cancel': '取消',
  'treeSelect.andMore': '等 {count} 项',
  'upload.upload': '开始上传',
  'upload.maxCount': '最多上传 {max} 个文件',
  'themeEditor.label': '主题编辑器',
  'themeEditor.export': '导出主题 JSON',
  'themeEditor.search': '搜索 token',
  'themeEditor.editingTheme': '编辑主题',
  'themeEditor.light': '浅色',
  'themeEditor.dark': '深色',
  'themeEditor.group.color': '颜色',
  'themeEditor.group.fontSize': '字号',
  'themeEditor.group.space': '间距',
  'themeEditor.group.radius': '圆角',
  'themeEditor.group.controlHeight': '控件高度',
  'themeEditor.group.custom': '其他',
  'timePicker.now': '此刻',
  'datePicker.shortcutThisQuarter': '本季度',
}
