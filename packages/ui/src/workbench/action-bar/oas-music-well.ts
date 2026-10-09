import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
  min-width: 0;
}
/* 全空态：宿主整体不显示（无布局足迹——.well 有固定高胶囊底，仅藏内段时空井仍占位） */
:host([data-empty]) {
  display: none;
}
:host([hidden]) {
  display: none;
}
.well {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  min-width: 0;
  height: var(--oas-action-bar-well-height, 32px);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-action-bar-well-bg, color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent));
  font-variant-numeric: tabular-nums;
}
.well-label {
  flex-shrink: 0;
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
}
.well-label[hidden] {
  display: none;
}
.well-value {
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.well-value[hidden] {
  display: none;
}
.well-detail {
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.well-detail[hidden] {
  display: none;
}
`

/** 小节/节拍解析：非整数向下取整，非法或 < 1 回落 1（DAW 位置 1 起，不出 0/负数假位置） */
function parseBarBeat(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.floor(n))
}

/** BPM 解析：空/非有限/负数 → null（忽略该段）——注意 Number('') 是 0，空串须先行排除 */
function parseTempo(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/**
 * oas-music-well —— 音乐节奏读数井（DAW 小节/节拍/BPM/拍号）。
 *
 * 属性（kebab-case）：
 * - `label`：读数标签（空时隐藏）
 * - `bars` / `beats`：当前小节 / 节拍（1 起；共同决定「小节.节拍」位置段，双缺整段隐藏）
 * - `tempo`：速度 BPM（非法值忽略该段）
 * - `meter`：拍号（如 `4/4`，原样显示）
 * - `detail`：补充信息（与自动 BPM/拍号文本拼段；空段隐藏）
 *
 * 纯读数（无交互、无事件——节奏位置由宿主驱动显示，井不做节拍时钟）。
 * detail 段自动拼接：`{tempo} BPM · {meter} · {detail}`。
 *
 * 全空态（六属性全缺）：宿主打 `data-empty` 反射并整体不显示（零布局足迹，同 statistic-well）。
 * a11y：井 `aria-live="polite"`（位置/速度变化可被读屏感知）；数值表格数字体对齐。
 */
export class OASMusicWell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'bars', 'beats', 'tempo', 'meter', 'detail', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="well" part="well" aria-live="polite"><span class="well-label" part="well-label" hidden></span><span class="well-value" part="well-value" hidden></span><span class="well-detail" part="well-detail" hidden></span></div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（well 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="well"]')) return false
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    const labelEl = this.shadow.querySelector<HTMLElement>('[part="well-label"]')
    const valueEl = this.shadow.querySelector<HTMLElement>('[part="well-value"]')
    const detailEl = this.shadow.querySelector<HTMLElement>('[part="well-detail"]')
    if (!labelEl || !valueEl || !detailEl) return

    // label 段：空时隐藏（无空占位）
    const label = this.getAttr('label', '')
    labelEl.textContent = label
    labelEl.hidden = label === ''

    // 位置段：bars/beats 任一在场即显示「小节.节拍」（缺省按 1 起）；双缺整段隐藏
    const hasPosition = this.hasAttribute('bars') || this.hasAttribute('beats')
    valueEl.hidden = !hasPosition
    if (hasPosition) {
      const bars = parseBarBeat(this.getAttr('bars', '1'))
      const beats = parseBarBeat(this.getAttr('beats', '1'))
      valueEl.textContent = `${bars}.${beats}`
    }

    // detail 段：自动 BPM/拍号文本 ∪ detail 属性，全缺则整段隐藏
    const parts: string[] = []
    const tempo = parseTempo(this.getAttr('tempo', ''))
    if (tempo != null) parts.push(`${tempo} BPM`)
    const meter = this.getAttr('meter', '').trim()
    if (meter !== '') parts.push(meter)
    const detail = this.getAttr('detail', '')
    if (detail !== '') parts.push(detail)
    detailEl.textContent = parts.join(' · ')
    detailEl.hidden = parts.length === 0

    // 全空态：宿主打 data-empty（:host([data-empty]) display:none 整体退场，零布局足迹）
    this.toggleAttribute(
      'data-empty',
      label === '' &&
        !this.hasAttribute('bars') &&
        !this.hasAttribute('beats') &&
        tempo == null &&
        meter === '' &&
        detail === '',
    )
  }
}
