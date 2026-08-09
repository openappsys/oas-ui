import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  position: relative;
  width: 100%;
  font-family: inherit;
}
/* 内容铺满容器（absolute inset 0），超宽/超高裁切保持比例 */
.content {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
`

/** 非法/缺省 ratio 的回退值 */
const FALLBACK_RATIO = '1 / 1'

/**
 * oas-aspect-ratio —— 等比容器（纯展示，无事件）。
 *
 * 属性（kebab-case）：
 * - `ratio`：宽高比，支持 `16/9`、`4:3`、`16 / 9`、小数 `1.5`；
 *   缺失/非法（含 0 分子或分母）回退 `1 / 1`
 *
 * 实现：宿主 inline `aspect-ratio`（width 100% 由 :host 样式保证），
 * 高度由比例推导；内容 slot 经 absolute inset 0 铺满。无子内容时
 * 宿主仍按比例占位（aspect-ratio 独立于内容存在）。
 */
export class OASAspectRatio extends OASElement {
  static override get observedAttributes(): string[] {
    return ['ratio']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="content" part="content"><slot></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    this.style.aspectRatio = this.resolveRatio()
  }

  private resolveRatio(): string {
    const raw = this.getAttr('ratio', '').trim()
    if (!raw) return FALLBACK_RATIO

    // 分式形式：16/9、4:3、16 / 9（分子分母均为正数）
    const frac = raw.match(/^(\d*\.?\d+)\s*[/:]\s*(\d*\.?\d+)$/)
    if (frac) {
      const w = Number(frac[1])
      const h = Number(frac[2])
      if (w > 0 && h > 0) return `${w} / ${h}`
      return FALLBACK_RATIO
    }

    // 小数形式：1.5 → 1.5 / 1（与分式归一化一致）
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return `${n} / 1`
    return FALLBACK_RATIO
  }
}
