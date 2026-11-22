import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-status-bar —— 移动端状态栏占位（纯展示，无事件）。
 *
 * 预留顶部状态栏高度（`env(safe-area-inset-top)`），可覆盖前景色与高度；
 * 默认插槽可放时间 / 电量等宿主自行绘制的状态内容。视觉外观完全由
 * CSS 变量与 token 控制，不模拟系统状态栏（系统栏由宿主容器负责）。
 *
 * 属性（kebab-case）：
 * - `height`：高度覆盖（纯数字按 px，亦接受 CSS 长度如 `44px` / `1.5rem`）；
 *   缺省读取 `env(safe-area-inset-top)`（不支持时为 0）
 * - `color`：前景色覆盖，按 ui-spec §4.1 解析——11 预设名取 `--oas-preset-<name>-text`
 *   文字安全档，其余按任意 CSS 色值直接注入；空值恢复 token 默认
 *
 * CSS 变量：
 * - `--oas-status-bar-height`：高度覆盖（`height` 属性写入同一变量）
 * - `--oas-status-bar-bg`：背景（默认透明，由宿主决定是否铺色）
 * - `--oas-status-bar-color`：前景色（`color` 属性写入同一变量）
 */

const STYLE = `
:host {
  display: block;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  height: var(--oas-status-bar-height, env(safe-area-inset-top, 0px));
  color: var(--oas-status-bar-color, var(--oas-color-text-primary));
  background: var(--oas-status-bar-bg, transparent);
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.area {
  display: flex;
  align-items: center;
  height: 100%;
  padding-inline: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  line-height: 1;
}
`

/** ui-spec §4.1 的 11 个预设名（文字承载面取 -text 安全档） */
const PRESET_NAMES = new Set([
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
])

const LENGTH_RE = /^(?:\d*\.?\d+(?:px|rem|em|vh|vw|vmin|vmax|%)?|(?:calc|min|max|clamp|var)\(.+\))$/

const warnedHeights = new Set<string>()
function warnInvalidHeight(value: string): void {
  if (warnedHeights.has(value)) return
  warnedHeights.add(value)
  devWarn(`[oas-status-bar] 非法 height "${value}"，已忽略；合法值：纯数字（px）或 CSS 长度（如 44px / 1.5rem）`)
}

/** 纯数字按 px，CSS 长度原样；非法返回 null */
function normalizeLength(raw: string): string | null {
  const value = raw.trim()
  if (value === '') return null
  if (/^\d*\.?\d+$/.test(value)) return `${value}px`
  return LENGTH_RE.test(value) ? value : null
}

/** 预设名 → 文字安全档 token；其余按 CSS 色值直接注入 */
function resolveForeground(raw: string): string {
  return PRESET_NAMES.has(raw) ? `var(--oas-preset-${raw}-text)` : raw
}

export class OASStatusBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['height', 'color']
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
    this.syncHeight()
    this.syncColor()
  }

  private syncHeight(): void {
    const raw = this.getAttr('height', '').trim()
    if (raw === '') {
      this.style.removeProperty('--oas-status-bar-height')
      return
    }
    const resolved = normalizeLength(raw)
    if (resolved === null) {
      warnInvalidHeight(raw)
      this.style.removeProperty('--oas-status-bar-height')
      return
    }
    this.style.setProperty('--oas-status-bar-height', resolved)
  }

  private syncColor(): void {
    const raw = this.getAttr('color', '').trim()
    if (raw === '') {
      this.style.removeProperty('--oas-status-bar-color')
      return
    }
    this.style.setProperty('--oas-status-bar-color', resolveForeground(raw))
  }
}
