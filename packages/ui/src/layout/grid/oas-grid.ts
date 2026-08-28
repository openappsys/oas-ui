import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  font-family: inherit;
  gap: 0;
}
:host([hidden]) {
  display: none;
}
`

// justify（justify-items）合法值：start / center / end / stretch
const JUSTIFY_ITEMS = new Set(['start', 'center', 'end', 'stretch'])
// align（align-items）合法值：start / center / end / stretch / baseline
const ALIGN_ITEMS = new Set(['start', 'center', 'end', 'stretch', 'baseline'])

const warnedJustify = new Set<string>()

/** 非法 justify：dev 下 console.warn 一次（同值去重），回落默认 stretch */
function warnJustifyValue(value: string): void {
  if (warnedJustify.has(value)) return
  warnedJustify.add(value)
  console.warn(
    `[oas-grid] 非法 justify "${value}"，已回落 stretch；合法值：start/center/end/stretch`,
  )
}

const warnedAlign = new Set<string>()

/** 非法 align：dev 下 console.warn 一次（同值去重），回落默认 stretch */
function warnAlignValue(value: string): void {
  if (warnedAlign.has(value)) return
  warnedAlign.add(value)
  console.warn(
    `[oas-grid] 非法 align "${value}"，已回落 stretch；合法值：start/center/end/stretch/baseline`,
  )
}

export class OASGrid extends OASElement {
  static override get observedAttributes(): string[] {
    return ['gap', 'cols', 'columns', 'justify', 'align']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；grid 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  /**
   * gap 归一化：
   * - 单值：保持 `gap` 简写直写（两轴同值，零回归），清理 rowGap/columnGap 残留；
   * - 两值（空格分隔「行 列」，如 `8 16`）：row-gap/column-gap 分开设置，清理 gap 简写；
   * - 0 个或 ≥3 个值：非法，静默忽略回落默认 0。
   * 纯数字值补 px（浏览器丢弃无单位 CSS 长度——happy-dom 不校验故单测漏检，
   * 与 menu max-height 的 `/^\d+$/ → px` 惯例同款）
   */
  private applyGap(): void {
    const raw = this.getAttr('gap', '0')
    const parts = raw
      .trim()
      .split(/\s+/)
      .filter((s) => s !== '')
    const toLen = (v: string): string => (/^\d+$/.test(v) ? `${v}px` : v)
    if (parts.length === 2) {
      this.style.gap = ''
      this.style.rowGap = toLen(parts[0]!)
      this.style.columnGap = toLen(parts[1]!)
    } else if (parts.length === 1) {
      this.style.gap = toLen(parts[0]!)
      this.style.rowGap = ''
      this.style.columnGap = ''
    } else {
      this.style.gap = '0'
      this.style.rowGap = ''
      this.style.columnGap = ''
    }
  }

  /**
   * justify/align 容器对齐（grid 上下文）：
   * 缺省不设（保持 CSS 默认 stretch 行为）；合法值直写；非法回落 stretch + dev 告警（同值去重）。
   */
  private applyAlignment(): void {
    const justify = this.getAttr('justify', '')
    if (justify !== '') {
      if (JUSTIFY_ITEMS.has(justify)) {
        this.style.justifyItems = justify
      } else {
        warnJustifyValue(justify)
        this.style.justifyItems = 'stretch'
      }
    } else {
      this.style.justifyItems = ''
    }

    const align = this.getAttr('align', '')
    if (align !== '') {
      if (ALIGN_ITEMS.has(align)) {
        this.style.alignItems = align
      } else {
        warnAlignValue(align)
        this.style.alignItems = 'stretch'
      }
    } else {
      this.style.alignItems = ''
    }
  }

  protected override update(): void {
    const columns = this.getAttr('columns', '')
    const cols = Number(this.getAttr('cols', '24')) || 24
    this.style.display = 'grid'
    this.applyGap()
    this.applyAlignment()
    if (columns !== '') {
      // simple-grid：按 columns 自动等分，子项忽略 span（由 GridItem 侧配合）
      const n = Math.max(1, Number(columns) || 1)
      this.style.gridTemplateColumns = `repeat(${n}, 1fr)`
    } else {
      this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    }
  }
}
