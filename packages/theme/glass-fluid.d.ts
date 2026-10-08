/**
 * @oas-ui/theme/glass-fluid.js 类型声明（液态玻璃动态层运行时）。
 * 供 TS 宿主具名导入生命周期钩子/en：「引包即生效」的 side-effect import 无需类型。
 */

/** 指针命中时运行时挂在 surface 上的激活标记（仅运行时写入，组件源码无此标记） */
export declare const GLASS_FLUID_ACTIVE_ATTR = 'data-glass-fluid'
/** 注册表条目：参与了动态层的组件 → surface 选择器（`host: true` 表示 surface 即宿主本身） */
export interface GlassRegistryEntry {
  tag: string
  surface: string
  host?: boolean
}
/** 动态层注册表（哪些 shadow 根注入样式 + 指针命中谁） */
export declare const GLASS_REGISTRY: GlassRegistryEntry[]

/** 注入样式表内容（共享一份；按运行时标记渲染高光） */
export declare function buildGlassFluidSheetCss(): string

/** 守卫判定：任一不满足即不启用（无 data-glass / reduced-motion / 粗指针 / high-contrast） */
export declare function shouldEnableGlassFluid(env: {
  hasGlass: boolean
  reducedMotion: boolean
  coarsePointer: boolean
  highContrast: boolean
}): boolean

/** 命中判定：事件 composedPath（缺失时退 target）里首个注册表 surface */
export declare function resolveGlassSurface(ev: {
  composedPath?: () => ArrayLike<unknown>
  target?: unknown
}): HTMLElement | null

/** 写/清元素高光坐标（clientX/clientY 为 null 时清内联变量与激活标记） */
export declare function applyGlassPointer(el: HTMLElement | null, clientX: number | null, clientY: number | null): void

/** 启动运行时（幂等；守卫不满足时不注入不改 DOM） */
export declare function startGlassFluid(opts?: { doc?: Document; win?: Window }): void

/** 停止运行时（幂等）：退订指针监听 + 清标记/变量 + 移除注入表 */
export declare function stopGlassFluid(): void
