import { OASElement } from '@oas-ui/core'

const DEFAULT_COLUMNS = 4
const DEFAULT_GAP = 8

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.masonry {
  column-count: 1;
  column-gap: var(--oas-space-2);
}
/* 子项不断列（break-inside: avoid）；inline-block + 100% 是列式布局下让 break-inside 生效的通用兜底 */
.masonry ::slotted(*) {
  display: inline-block;
  width: 100%;
  break-inside: avoid;
  margin-bottom: var(--oas-space-2);
}
`

/**
 * oas-masonry —— 瀑布流容器（CSS columns 实现）。
 *
 * 属性（kebab-case）：
 * - `columns`：列数（默认 4）；非正整数/非数字回退 1
 * - `gap`：列间距（px，默认 8）；非法值回退默认
 *
 * 子项经默认 slot 投影，`break-inside: avoid` 保证单个子项不被列拆分。
 */
export class OASMasonry extends OASElement {
  static override get observedAttributes(): string[] {
    return ['columns', 'gap']
  }

  private rootEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="masonry" part="masonry"><slot></slot></div>
    `
    this.rootEl = this.shadow.querySelector('.masonry')
    this.update()
  }

  protected override update(): void {
    if (!this.rootEl) return
    this.rootEl.style.columnCount = String(this.normalizeColumns())
    this.rootEl.style.columnGap = `${this.normalizeGap()}px`
  }

  /** 列数归一：正整数才生效，非法（非数字/小数/0/负数）回退 1 */
  private normalizeColumns(): number {
    const n = Number(this.getAttr('columns', String(DEFAULT_COLUMNS)))
    return Number.isInteger(n) && n >= 1 ? n : 1
  }

  /** 间距归一：非负数才生效，非法回退默认 8 */
  private normalizeGap(): number {
    const g = Number(this.getAttr('gap', String(DEFAULT_GAP)))
    return Number.isFinite(g) && g >= 0 ? g : DEFAULT_GAP
  }
}
