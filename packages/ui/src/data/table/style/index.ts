// 样式切分入口：基础段 + 特性段，拼接顺序与原 oas-table 内联 STYLE 一致（逐字节等价）
import { BASE_STYLE } from './base.js'
import { FEATURES_STYLE } from './features.js'

export const STYLE = BASE_STYLE + FEATURES_STYLE
