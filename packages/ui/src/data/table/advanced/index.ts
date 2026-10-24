/**
 * table 高级能力入口（`@oas-ui/ui/data/table/advanced`）
 *
 * 纯函数 / 列工厂，不注册自定义元素、不引入表单控件：
 * - `pivot` / `pivotTable`：透视矩阵与可直接喂给 oas-table 的 columns/data
 * - `compileFormula` / `formulaColumn`：无 eval 的安全计算公式列
 * - `compileQuery` / `filterRows`：查询构建器 AST → 行谓词
 * - `toTsv` / `parseTsv`：表格区域 TSV 导出/解析
 *
 * 需要编辑能力时同时引入 `@oas-ui/ui/data/table/edit`；本入口默认不引入 edit，
 * 避免「只要透视/公式」的宿主被迫加载编辑依赖。
 */
export {
  pivot,
  pivotTable,
  type PivotAggregate,
  type PivotOptions,
  type PivotResult,
  type PivotTable,
} from './pivot.js'
export {
  compileFormula,
  evaluateFormula,
  formulaColumn,
  type FormulaColumnOptions,
  type FormulaValue,
} from './formula.js'
export {
  compileQuery,
  filterRows,
  isQueryGroup,
  matchCondition,
  type QueryCondition,
  type QueryGroup,
  type QueryNode,
  type QueryOperator,
} from './query.js'
export {
  compileConditionalFormat,
  evaluateConditionalFormat,
  type ConditionalMatch,
  type ConditionalOperator,
  type ConditionalRule,
  type ConditionalStyle,
} from './conditional.js'
export { parseTsv, toTsv, type TsvColumn } from './clipboard.js'
