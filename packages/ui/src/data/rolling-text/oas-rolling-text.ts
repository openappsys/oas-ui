import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-rolling-text —— 翻滚文本（数字 / 字符逐位滚动）。
 *
 * 每个字符占一列：数字列是 0–9 的纵向滚轮，值变化时按目标位翻滚到新数字；
 * 非数字列（小数点、负号、字母等）做纵向翻转替换。前缀 / 后缀与数值分离渲染，
 * `precision` 控制小数位数（补零 / 四舍五入）。
 *
 * 属性（kebab-case）：
 * - `value`：显示值（string；numeric property 赋值会反射到属性）
 * - `precision`：小数位数（0–10）；缺省或非法时保留原文本
 * - `prefix-text` / `suffix-text`：前缀 / 后缀文本
 * - `duration`：单列翻滚时长（ms，默认 600；非法/非正回落默认）
 * - `live`：布尔，存在时读屏活区为 `polite`（默认 off，避免频繁播报）
 *
 * CSS 变量：
 * - `--oas-rolling-text-duration`：翻滚时长
 * - `--oas-rolling-text-height`：单列高度（默认 1em）
 * - `--oas-rolling-text-separator-color`：小数点 / 符号等非数字列颜色
 *
 * 无障碍：可见列整体 `aria-hidden`，完整文本放在视觉隐藏区（`part="sr"`）；
 * `prefers-reduced-motion` 下关闭过渡与翻转动画，直接呈现目标值。
 */

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  font-size: var(--oas-rolling-text-font, var(--oas-font-size-xl));
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
:host([hidden]) {
  display: none;
}
.root {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}
.affix {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
.affix[hidden] {
  display: none;
}
.columns {
  display: inline-flex;
  height: var(--oas-rolling-text-height, 1em);
  overflow: hidden;
  line-height: 1;
  /* 数字列恒按 LTR 排列：RTL 宿主下 inline-flex 主轴反转会把 "123" 显示成 "321"，
     而数值属「强 LTR」语义（同 theme-editor 数值输入的处置）。 */
  direction: ltr;
}
.digit-col,
.char-col {
  display: inline-block;
  height: var(--oas-rolling-text-height, 1em);
  overflow: hidden;
  line-height: 1;
}
.digit-col {
  width: 1ch;
  text-align: center;
}
.strip {
  display: block;
  transform: translateY(calc(var(--n, 0) * -1em));
  transition: transform var(--oas-rolling-text-duration, var(--oas-transition-base)) var(--oas-ease-out);
}
.digit {
  display: block;
  height: 1em;
  line-height: 1;
}
.char-col {
  color: var(--oas-rolling-text-separator-color, var(--oas-color-text-primary));
}
.char {
  display: block;
  height: 1em;
  line-height: 1;
}
.char-col.flipping {
  animation: oas-rolling-text-char var(--oas-rolling-text-duration, var(--oas-transition-base)) var(--oas-ease-out);
}
@keyframes oas-rolling-text-char {
  from {
    transform: translateY(0.6em);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .strip {
    transition: none;
  }
  .char-col.flipping {
    animation: none;
  }
}
`

export type RollingTextColumn = 'digit' | 'char'

/**
 * 数字滚轮档位轴：strip 内 20 个数字 = 逻辑档位 -5…14 的连续两个周期。
 * 常规稳态档位为 0…9（`--n` 即当前数字）；值变化时按**最短方向**取目标档位，
 * 跨越 9↔0 时落到越界瞬态（9→0 落 10、0→9 落 -1），翻滚结束再无过渡归位到常规档位
 * （位移差恰为 10em 的整周期，视觉等价无回弹）。没有这条轴，9→0 会从 9 一路倒卷到 0
 * （9 格），0→9 同理——「最短路径」在视觉上是必需的。
 */
const STRIP_OFFSET = 5
const STRIP_DIGITS = 20

interface ColumnState {
  kind: RollingTextColumn
  el: HTMLElement
  strip?: HTMLElement
  char?: HTMLElement
  value: string
}

/** 纯函数：按 precision 格式化（0–10 位小数）；非法 precision 或非有限数值保留原文本 */
export function formatRollingValue(value: string, precision: string): string {
  if (value.trim() === '') return value
  const digits = Number.parseInt(precision, 10)
  if (!Number.isFinite(digits) || digits < 0) return value
  if (digits > 10) {
    if (!warnedPrecision.has(precision)) {
      warnedPrecision.add(precision)
      devWarn(`[oas-rolling-text] precision="${precision}" 超出上限，已按 10 位小数处理`)
    }
  }
  const n = Number(value.trim())
  if (!Number.isFinite(n)) return value
  return n.toFixed(Math.min(10, digits))
}

const warnedPrecision = new Set<string>()

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

export class OASRollingText extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'precision', 'prefix-text', 'suffix-text', 'duration', 'live']
  }

  private columnsEl: HTMLElement | null = null
  private prefixEl: HTMLElement | null = null
  private suffixEl: HTMLElement | null = null
  private srEl: HTMLElement | null = null
  private columns: ColumnState[] = []
  private flipTimer: ReturnType<typeof setTimeout> | null = null

  /** Vue / React 以 number 绑定 value 时反射到属性，统一格式化链路 */
  get value(): string {
    return this.getAttr('value', '')
  }
  set value(value: string | number) {
    this.setAttribute('value', String(value))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="root" part="root">
        <span class="affix prefix" part="prefix" hidden></span>
        <span class="columns" part="value" aria-hidden="true"></span>
        <span class="affix suffix" part="suffix" hidden></span>
        <span class="sr-only" part="sr"></span>
      </span>
    `
  }

  private bind(): void {
    this.columnsEl = this.shadow.querySelector<HTMLElement>('.columns')
    this.prefixEl = this.shadow.querySelector<HTMLElement>('.prefix')
    this.suffixEl = this.shadow.querySelector<HTMLElement>('.suffix')
    this.srEl = this.shadow.querySelector<HTMLElement>('.sr-only')
    this.onCleanup(() => {
      if (this.flipTimer) clearTimeout(this.flipTimer)
      this.flipTimer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  private resolveDuration(): string {
    const raw = this.getAttr('duration', '').trim()
    const n = Number(raw)
    if (raw === '' || !Number.isFinite(n) || n <= 0) return ''
    return `${n}ms`
  }

  private syncAffixes(): void {
    for (const [el, name] of [
      [this.prefixEl, 'prefix-text'],
      [this.suffixEl, 'suffix-text'],
    ] as const) {
      if (!el) continue
      const text = this.getAttr(name, '')
      el.textContent = text
      el.hidden = text === ''
    }
  }

  private createDigitColumn(digit: string): ColumnState {
    const col = document.createElement('span')
    col.className = 'digit-col'
    col.setAttribute('part', 'digit')
    const strip = document.createElement('span')
    strip.className = 'strip'
    for (let i = 0; i < STRIP_DIGITS; i++) {
      const item = document.createElement('span')
      item.className = 'digit'
      // 逻辑档位 = i - STRIP_OFFSET；数字 = 逻辑档位对 10 取模（支持负档位）
      item.textContent = String((((i - STRIP_OFFSET) % 10) + 10) % 10)
      strip.appendChild(item)
    }
    strip.style.setProperty('--n', digit)
    col.appendChild(strip)
    return { kind: 'digit', el: col, strip, value: digit }
  }

  private createCharColumn(ch: string): ColumnState {
    const col = document.createElement('span')
    col.className = 'char-col'
    col.setAttribute('part', 'char')
    const text = document.createElement('span')
    text.className = 'char'
    text.textContent = ch
    col.appendChild(text)
    return { kind: 'char', el: col, char: text, value: ch }
  }

  /** 逐列同步：数字列只改 --n（触发 transition），字符列更新文本并做翻转；类型变化整列替换 */
  private syncColumns(text: string): void {
    const container = this.columnsEl
    if (!container) return

    if (this.flipTimer) {
      clearTimeout(this.flipTimer)
      this.flipTimer = null
    }
    for (const col of this.columns) col.el.classList.remove('flipping')

    const chars = [...text]
    const flipping: HTMLElement[] = []
    /** 动画结束后需归位到常规档位的数字列（最短路径产生的越界瞬态） */
    const normalizing: ColumnState[] = []
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!
      let col = this.columns[i]
      const kind: RollingTextColumn = isDigit(ch) ? 'digit' : 'char'

      if (col && col.kind !== kind) {
        const replacement = kind === 'digit' ? this.createDigitColumn(ch) : this.createCharColumn(ch)
        col.el.replaceWith(replacement.el)
        this.columns[i] = replacement
        continue
      }

      if (!col) {
        const next = kind === 'digit' ? this.createDigitColumn(ch) : this.createCharColumn(ch)
        container.appendChild(next.el)
        this.columns[i] = next
        continue
      }

      if (col.kind === 'digit') {
        if (col.value === ch) continue
        const from = Number(col.value)
        const to = Number(ch)
        // 最短路径：正向步数 vs 反向步数取小（9→0 走正向 1 格，0→9 走反向 1 格）
        const forward = (to - from + 10) % 10
        const backward = forward === 0 ? 0 : 10 - forward
        const target = forward <= backward ? from + forward : from - backward
        col.strip?.style.setProperty('--n', String(target))
        col.value = ch
        if (target !== to) normalizing.push(col)
      } else if (col.value !== ch) {
        if (col.char) col.char.textContent = ch
        col.value = ch
        col.el.classList.remove('flipping')
        void col.el.offsetWidth
        col.el.classList.add('flipping')
        flipping.push(col.el)
      }
    }

    for (let i = this.columns.length - 1; i >= chars.length; i--) {
      const col = this.columns[i]
      if (!col) continue
      col.el.remove()
      this.columns.splice(i, 1)
    }

    if (flipping.length > 0 || normalizing.length > 0) {
      const ms = Number(this.resolveDuration().replace('ms', '')) || 600
      this.flipTimer = setTimeout(() => {
        for (const el of flipping) el.classList.remove('flipping')
        for (const col of normalizing) this.normalizeDigit(col)
        this.flipTimer = null
      }, ms)
    }
  }

  /**
   * 数字列回位：把越界瞬态档位（-5…-1 / 10…14）换成等价的常规档位（0…9）。
   * 两者位移差恰为 10em 的整周期 → 画面完全一致；抑制过渡后瞬时改写，避免动画播完再滚一格。
   */
  private normalizeDigit(col: ColumnState): void {
    const strip = col.strip
    if (!strip) return
    strip.style.transitionProperty = 'none'
    strip.style.setProperty('--n', col.value)
    void strip.offsetWidth
    strip.style.removeProperty('transition-property')
  }

  protected override update(): void {
    this.syncAffixes()
    const text = formatRollingValue(this.getAttr('value', ''), this.getAttr('precision', ''))
    if (this.srEl) {
      this.srEl.textContent = `${this.getAttr('prefix-text', '')}${text}${this.getAttr('suffix-text', '')}`
      this.srEl.setAttribute('aria-live', this.hasAttribute('live') ? 'polite' : 'off')
    }
    this.syncColumns(text)

    const duration = this.resolveDuration()
    if (duration) this.style.setProperty('--oas-rolling-text-duration', duration)
    else this.style.removeProperty('--oas-rolling-text-duration')
  }
}
