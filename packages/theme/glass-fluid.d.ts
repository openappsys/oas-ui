/**
 * @oas-ui/theme/glass-fluid.js 类型声明（v2.6.1 动态流动感运行时）。
 * 供 TS 宿主具名导入 start/stop 生命周期钩子；side-effect import（仅引包即生效）无需类型。
 */

/** 元素级 surface 标记属性名（组件影子内 surface 元素上） */
export declare const GLASS_SURFACE_ATTR = 'data-glass-surface'
/** 指针命中时运行时挂到 surface 上的激活标记（CSS 据此淡入高光） */
export declare const GLASS_FLUID_ACTIVE_ATTR = 'data-glass-fluid'

/** 守卫判定：任一不满足即不启用（无 data-glass / reduced-motion / 粗指针 / high-contrast） */
export declare function shouldEnableGlassFluid(env: {
  hasGlass: boolean
  reducedMotion: boolean
  coarsePointer: boolean
  highContrast: boolean
}): boolean

/** 命中判定：事件 composedPath（缺失时退 target）里首个 `[data-glass-surface]` */
export declare function resolveGlassSurface(ev: {
  composedPath?: () => ArrayLike<unknown>
  target?: unknown
}): HTMLElement | null

/** 写/清元素高光坐标（clientX/clientY 为 null 时清内联变量与激活标记） */
export declare function applyGlassPointer(el: HTMLElement | null, clientX: number | null, clientY: number | null): void

/** 启动运行时（幂等；守卫不满足时不挂任何监听） */
export declare function startGlassFluid(opts?: { doc?: Document; win?: Window }): void

/** 停止运行时（幂等）：退订指针监听 + 清 rAF + 清元素内联变量 */
export declare function stopGlassFluid(): void
