import { compileFormula } from './formula.js'
import { matchCondition, type QueryOperator } from './query.js'

export type ConditionalOperator = QueryOperator | 'notEmpty'

export interface ConditionalStyle {
  color?: string
  backgroundColor?: string
  fontWeight?: string | number
  fontStyle?: 'normal' | 'italic'
  textDecoration?: string
  /** 追加 class（空格分隔多个） */
  className?: string
}

export interface ConditionalRule {
  /** 规则字段，缺省用当前列 key；`when` 在场时优先 */
  field?: string
  op?: ConditionalOperator
  value?: unknown
  /** 公式表达式（编译后按行求值，truthy 命中）；与 field/op 二选一 */
  when?: string
  style: ConditionalStyle
  /** 默认装饰单元格；row 应用到整行 */
  applyTo?: 'cell' | 'row'
  caseSensitive?: boolean
}

export interface ConditionalMatch {
  style: ConditionalStyle
  applyTo: 'cell' | 'row'
}

function matchCellValue(value: unknown, op: ConditionalOperator, expected: unknown, caseSensitive: boolean): boolean {
  if (op === 'notEmpty') return !matchCondition({ __value__: value }, { field: '__value__', op: 'empty' })
  return matchCondition({ __value__: value }, { field: '__value__', op, value: expected, caseSensitive })
}

/**
 * 编译条件格式规则：按数组顺序返回第一个命中规则；`when` 语法错误时跳过该规则（不抛整表）。
 * 纯函数，可单独用于自定义渲染。
 */
export function compileConditionalFormat(
  rules: readonly ConditionalRule[],
): (row: Record<string, unknown>, columnKey: string, cellValue: unknown) => ConditionalMatch | null {
  const compiled = rules.map((rule) => {
    if (rule.when) {
      try {
        const evaluate = compileFormula(rule.when)
        return { rule, when: evaluate }
      } catch {
        return { rule, when: null }
      }
    }
    return { rule, when: undefined }
  })
  return (row, columnKey, cellValue) => {
    for (const { rule, when } of compiled) {
      const op = rule.op ?? 'eq'
      let hit: boolean
      if (when) hit = Boolean(when(row))
      else if (rule.field) {
        const condition = { field: rule.field, value: rule.value, caseSensitive: rule.caseSensitive }
        hit =
          op === 'notEmpty'
            ? !matchCondition(row, { ...condition, op: 'empty' })
            : matchCondition(row, { ...condition, op })
      } else {
        hit = matchCellValue(cellValue, op, rule.value, rule.caseSensitive ?? false)
      }
      if (hit) return { style: rule.style, applyTo: rule.applyTo ?? 'cell' }
    }
    return null
  }
}

/** 单次求值便捷函数（少量规则时可直接用） */
export function evaluateConditionalFormat(
  rules: readonly ConditionalRule[],
  row: Record<string, unknown>,
  columnKey: string,
  cellValue: unknown,
): ConditionalMatch | null {
  return compileConditionalFormat(rules)(row, columnKey, cellValue)
}
