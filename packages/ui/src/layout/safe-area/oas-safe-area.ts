import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-safe-area —— 安全区占位（纯展示，无事件）。
 *
 * 移动端嵌入宿主（WebView / 全屏 H5）时，刘海屏与底部手势区会遮挡内容；
 * 本组件按 `env(safe-area-inset-*)` 在顶部或底部占出对应高度，作为布局占位件
 * 插在页面首/尾即可（宽度铺满、不参与视觉样式）。
 *
 * 属性（kebab-case）：
 * - `position`：`bottom`（默认，底部手势区）/ `top`（顶部刘海区）
 * - `size`：显式覆盖高度（纯数字按 px，亦接受 CSS 长度如 `1rem` / `24px`）；
 *   缺省时读取 `env(safe-area-inset-*)`（不支持该环境变量时为 0）
 *
 * CSS 变量：
 * - `--oas-safe-area-size`：高度覆盖（`size` 属性写入同一变量，属性优先于变量）
 *
 * 纯 CSS 占位：宿主 `hidden` 生效、无键盘焦点、无 ARIA 语义（内容区默认插槽可放
 * 状态点等装饰，由宿主自行决定可访问性）。
 */

const STYLE = `
:host {
  display: block;
  flex-shrink: 0;
  width: 100%;
  --oas-safe-area-inset: env(safe-area-inset-bottom, 0px);
  height: var(--oas-safe-area-size, var(--oas-safe-area-inset));
}
:host([hidden]) {
  display: none;
}
:host([position='top']) {
  --oas-safe-area-inset: env(safe-area-inset-top, 0px);
}
.area {
  display: block;
  width: 100%;
  height: 100%;
}
`

/** 合法的显式长度：纯数字（按 px）或常见 CSS 长度单位/函数 */
const LENGTH_RE = /^(?:\d*\.?\d+(?:px|rem|em|vh|vw|vmin|vmax|%)?|(?:calc|min|max|clamp|var)\(.+\))$/

/** 非法 size 告警（同值去重，避免每次 update 刷屏） */
const warnedSizes = new Set<string>()
function warnInvalidSize(value: string): void {
  if (warnedSizes.has(value)) return
  warnedSizes.add(value)
  devWarn(`[oas-safe-area] 非法 size "${value}"，已忽略；合法值：纯数字（px）或 CSS 长度（如 1rem / 24px）`)
}

function normalizeLength(raw: string): string | null {
  const value = raw.trim()
  if (value === '') return null
  if (/^\d*\.?\d+$/.test(value)) return `${value}px`
  return LENGTH_RE.test(value) ? value : null
}

export class OASSafeArea extends OASElement {
  static override get observedAttributes(): string[] {
    return ['position', 'size']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="area" part="area"><slot></slot></div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.update()
  }

  protected override update(): void {
    const raw = this.getAttr('size', '').trim()
    if (raw === '') {
      this.style.removeProperty('--oas-safe-area-size')
      return
    }
    const resolved = normalizeLength(raw)
    if (resolved === null) {
      warnInvalidSize(raw)
      this.style.removeProperty('--oas-safe-area-size')
      return
    }
    this.style.setProperty('--oas-safe-area-size', resolved)
  }
}
