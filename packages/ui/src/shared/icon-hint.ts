import { lookupIcon } from '@oas-ui/icons/runtime'

/**
 * 图标名未解析的 **dev-only** 提示（图标库 opt-in 迁移辅助）。
 *
 * 背景：按需引入组件时内置图名需 `import '@oas-ui/icons/register'`，否则静默空态；此提示帮助定位。
 *
 * 设计要点：
 * - **生产剔除**：`process.env.NODE_ENV === 'production'` 分支在消费方打包时被静态消除（含文档站/CI 的生产构建），
 *   故不会污染线上 console，也不影响 console-sweep 门禁；
 * - **延迟判定**：挂到下一帧再判定——避开「组件已渲染、图名在其后（如 onMounted）才 registerIcon/远程库注册」的
 *   合法晚注册场景（首帧未命中 ≠ 真缺失）；
 * - **每名一次**：去重，避免刷屏；
 * - 仅供**渲染位点**调用（`<oas-icon>` 及各组件图标渲染处）；**不要**放进 `lookupIcon` 本体——那里的
 *   「探测是否存在」是合法用法（如 `icon !== '' && lookupIcon(icon) !== undefined`），会产生误报。
 */
const hinted = new Set<string>()

// 生产构建剔除：打包器把 `process.env.NODE_ENV` 静态替换为 "production" → 常量折叠为 true → 提示分支成死代码被删。
// IIFE + const：既可被折叠剔除，又对「无 process 的裸 ESM 环境」安全（catch 兜底，不抛）。
const IS_PROD: boolean = (() => {
  try {
    return process.env.NODE_ENV === 'production'
  } catch {
    return false
  }
})()

type Raf = (cb: () => void) => void
const nextFrame: Raf =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(() => cb())
    : (cb) => {
        setTimeout(cb, 0)
      }

export function hintUnresolvedIcon(name: string): void {
  if (!name || IS_PROD || hinted.has(name)) return
  nextFrame(() => {
    // 延迟后重查：晚注册（registerIcon / registerIconLibrary）命中则不再提示
    if (hinted.has(name) || lookupIcon(name) !== undefined) return
    hinted.add(name)
    console.warn(
      `[oas] 图标名 "${name}" 未解析：按需引入使用内置图名需 import '@oas-ui/icons/register'；或先 registerIcon()/registerIconLibrary() 注册。`,
    )
  })
}
