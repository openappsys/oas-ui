/**
 * 图标运行时（runtime）——**不含内置全量图标集**，故可被任意组件按需引入而不拖入整套图标。
 *
 * 分工：
 * - 本模块：自定义注册（`registerIcon`）/ 别名 / 远程图标库 / 内置集注册口（`registerBuiltinIcons`）与查表（`lookupIcon`）；
 * - `./registry.js`：内置全量图标数据（`iconRegistry`），**只有显式 `import '@oas-ui/icons/register'`
 *   才会注册进本运行时**（全量入口 `@oas-ui/ui` 已自动注册，保持开箱即用）。
 * - `./register.js`：副作用入口，注册内置全量集。
 *
 * 纯函数、无 DOM 依赖，SSR/Node 可调用。
 */

/** 远程图标库注册项 */
export interface IconLibraryOptions {
  /** 图标名 → SVG URL */
  resolver: (name: string, family?: string, variant?: string) => string
  /** 加载内联后调整 SVG（如 fill/stroke=currentColor） */
  mutator?: (svg: SVGElement) => void
  /** sprite 模式：URL 含 #name 片段引用 sprite 表 symbol，渲染 <use> 而非内联 */
  spriteSheet?: boolean
}

/** 用户自定义图标注册表（name → 内联 SVG 片段）；同内置同名时覆盖内置 */
interface IconRuntimeState {
  custom: Map<string, string>
  builtin: Map<string, string>
  aliases: Map<string, string>
  libraries: Map<string, IconLibraryOptions>
}

/**
 * 运行时状态挂在 `globalThis` 单例上——**跨打包 chunk / 多份模块实例共享**。
 * 关键：`register`（副作用）与消费方（组件）可能被打进不同 chunk，若各持一份模块级 Map，
 * 注册就会"写到 A、组件读 B"而失效。以固定 Symbol 与全局 key 保证全应用唯一。
 */
const RUNTIME_KEY = '__oas_icon_runtime_v1__'
const g = globalThis as unknown as Record<string, IconRuntimeState | undefined>
const state: IconRuntimeState =
  g[RUNTIME_KEY] ??
  (g[RUNTIME_KEY] = {
    custom: new Map(),
    builtin: new Map(),
    aliases: new Map(),
    libraries: new Map(),
  })

/** 注册自定义图标（与内置同名时覆盖内置）；SSR/Node 可调用 */
export function registerIcon(name: string, svg: string): void {
  state.custom.set(name, svg)
}

/**
 * 注册图标别名（含前缀别名）：精确 `registerIconAlias('home','house')`；前缀 `registerIconAlias('lf-','')`。
 * 解析按最长别名优先，避免短前缀误吞长别名。
 */
export function registerIconAlias(alias: string, target: string): void {
  state.aliases.set(alias, target)
}

/**
 * 注册远程图标库：`<oas-icon library="xxx" name="yyy">` → resolver 得 URL，按需 fetch / sprite。
 * 纯函数、无 DOM 依赖，SSR/Node 可调用。
 */
export function registerIconLibrary(name: string, options: IconLibraryOptions): void {
  state.libraries.set(name, options)
}

/** 注册内置全量集（由 `./register.js` 副作用调用；或宿主自行注入默认图标） */
export function registerBuiltinIcons(icons: Record<string, string>): void {
  for (const [name, svg] of Object.entries(icons)) state.builtin.set(name, svg)
}

/** 别名解析：按最长别名优先做前缀替换；无命中返回原名（无别名时零开销直通） */
export function resolveIconAlias(name: string): string {
  if (state.aliases.size === 0) return name
  let best: string | null = null
  for (const alias of state.aliases.keys()) {
    if (name.startsWith(alias) && (best === null || alias.length > best.length)) best = alias
  }
  return best === null ? name : (state.aliases.get(best) ?? '') + name.slice(best.length)
}

/**
 * 查表：别名解析 → 自定义注册优先 → 内置集（仅当 `registerBuiltinIcons` 已注册）。
 * 单一注册点原则：`registerIcon()` 一处注册后，`<oas-icon>` 与所有消费方全部可见。
 */
export function lookupIcon(name: string): string | undefined {
  const resolved = resolveIconAlias(name)
  return state.custom.get(resolved) ?? state.builtin.get(resolved)
}

/** 是否可解析（自定义或已注册内置） */
export function hasIcon(name: string): boolean {
  return lookupIcon(name) !== undefined
}

/** 取已注册的远程图标库选项 */
export function getIconLibrary(name: string): IconLibraryOptions | undefined {
  return state.libraries.get(name)
}
