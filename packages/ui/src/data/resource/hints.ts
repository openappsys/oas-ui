import { MAX_PERIODS } from './model.js'

/**
 * period 数超限截断提示（level 引擎与组件实例共用同一措辞）。
 *
 * 两处去重状态各自独立：level 引擎是模块级、组件实例是实例级；共享的只有文案，
 * 避免同一提示在两处漂移。放在叶子模块，组件与引擎各自按需引用，不额外拉入算法实现。
 */
export const PERIODS_TRUNCATED_WARNING = `[oas-resource] period 数超过 ${MAX_PERIODS}，已截断（任务日期跨度可能异常）`
