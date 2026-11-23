/**
 * 值变换钩子与异步选项源的**纯数据注册表**（无 DOM / 无组件依赖，node 环境可直接单测）。
 *
 * 三张表刻意**分立**（不与表达式函数库同表）：
 * - `convert`：入向（宿主值 → 组件值），只作用于 initialValues 回填与受控写通道；
 * - `transform`：出向（组件值 → 宿主值），作用于 kernel 事件载荷与公开 getValues()；
 * - `optionSource`：异步选项加载（`options.source`）。
 * 分立理由：表达式函数库是「在条件表达式里可调用的纯函数」，值变换是「表单值搬运的一步」——
 * 同表会让表达式误调值变换，也会制造命名撞车。
 *
 * 注册表全局单例（与 `registerSchemaWidget` / `registerExprFunction` 同口径）：
 * schema 里只写注册名，运行时按名查表；未注册名 devWarn 并回落恒等（不静默改写值）。
 */
import { devWarn } from '../../../shared/dev-warn.js'

/** 值变换钩子：`(value, fieldPath, wholeValues) => value`（同步；V2 不做异步钩子） */
export type ValueHook = (value: unknown, fieldPath: string, wholeValues: Record<string, unknown>) => unknown

/** 异步选项源：`(values, path) => Promise<Option[]>` */
export type OptionSource = (values: Record<string, unknown>, path: string) => Promise<unknown[]>

/** 选项模型（与 select / radio-group / checkbox-group 的 `options` JSON 通道同型） */
export interface SchemaOption {
  label: string
  value: string
  disabled?: boolean
  description?: string
}

const CONVERTERS = new Map<string, ValueHook>()
const TRANSFORMERS = new Map<string, ValueHook>()
const OPTION_SOURCES = new Map<string, OptionSource>()
const WARNED = new Set<string>()

/** 注册名形态（与 registerExprFunction 同口径） */
const NAME_PATTERN = /^[A-Za-z_$][\w$]*$/

function warnOnce(key: string, message: string): void {
  if (WARNED.has(key)) return
  WARNED.add(key)
  devWarn(message)
}

function register(table: Map<string, ValueHook>, label: string, name: string, fn: ValueHook | undefined): () => void {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    devWarn(`[oas-schema-form] ${label} 注册名非法："${String(name)}"（字母开头，可含数字 / 下划线 / $）`)
    return () => {}
  }
  if (typeof fn !== 'function') {
    devWarn(`[oas-schema-form] ${label}("${name}") 需要一个函数，已忽略本次注册`)
    return () => {}
  }
  table.set(name, fn)
  return () => {
    if (table.get(name) === fn) table.delete(name)
  }
}

/** 登记入向变换（由 `registerSchemaConverter` 调用；编译层/运行期只读） */
export function setConverter(name: string, fn: ValueHook): () => void {
  return register(CONVERTERS, 'registerSchemaConverter', name, fn)
}

/** 登记出向变换 */
export function setTransformer(name: string, fn: ValueHook): () => void {
  return register(TRANSFORMERS, 'registerSchemaTransformer', name, fn)
}

/** 登记异步选项源 */
export function setOptionSource(name: string, fn: OptionSource): () => void {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    devWarn(`[oas-schema-form] registerSchemaOptionSource 注册名非法："${String(name)}"`)
    return () => {}
  }
  if (typeof fn !== 'function') {
    devWarn(`[oas-schema-form] registerSchemaOptionSource("${name}") 需要一个函数，已忽略本次注册`)
    return () => {}
  }
  OPTION_SOURCES.set(name, fn)
  return () => {
    if (OPTION_SOURCES.get(name) === fn) OPTION_SOURCES.delete(name)
  }
}

/** 查入向变换（未注册返回 null，并 devWarn 一次） */
export function getConverter(name: string): ValueHook | null {
  const fn = CONVERTERS.get(name)
  if (!fn) warnOnce(`convert:${name}`, `[oas-schema-form] convert "${name}" 未注册，按恒等处理`)
  return fn ?? null
}

/** 查出向变换（未注册返回 null，并 devWarn 一次） */
export function getTransformer(name: string): ValueHook | null {
  const fn = TRANSFORMERS.get(name)
  if (!fn) warnOnce(`transform:${name}`, `[oas-schema-form] transform "${name}" 未注册，按恒等处理`)
  return fn ?? null
}

/** 查异步选项源（未注册返回 null，并 devWarn 一次） */
export function getOptionSource(name: string): OptionSource | null {
  const fn = OPTION_SOURCES.get(name)
  if (!fn) warnOnce(`source:${name}`, `[oas-schema-form] options.source "${name}" 未注册，按加载失败处理`)
  return fn ?? null
}

/** 已登记名（文档 / 调试用） */
export function registeredHookNames(): { convert: string[]; transform: string[]; source: string[] } {
  return {
    convert: [...CONVERTERS.keys()],
    transform: [...TRANSFORMERS.keys()],
    source: [...OPTION_SOURCES.keys()],
  }
}
