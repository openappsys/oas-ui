/**
 * 读取宿主 CSS 自定义属性的像素数值（`--oas-*` token 的运行时消费）。
 *
 * 用途：几何计算（如浮层箭头 point-at-center 的 clamp）需要与 CSS token 保持同一真源——
 * 宿主经 token 改形状时，JS 定位同步跟随，避免「形状变了、定位还按旧尺寸算」的错位。
 *
 * 解析：`getComputedStyle` 计算后的值取 `parseFloat`（`12px` → 12）；缺省/非法/非像素值回退 fallback。
 * 注意按 computed 取值（var() 已解析），宿主在任意层级（:root / config-provider / 组件宿主内联）设置均生效。
 */
export function cssVarPx(el: HTMLElement, name: string, fallback: number): number {
  const raw = getComputedStyle(el).getPropertyValue(name).trim()
  if (raw === '') return fallback
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}
