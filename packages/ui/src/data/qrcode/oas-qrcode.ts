import { OASElement } from '@oas-ui/core'
import { encodeQR, matrixToPath, QR_TOO_LONG_ERROR } from './qr.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  line-height: 1;
}
.wrapper {
  display: inline-block;
}
svg {
  display: block;
}
[hidden] {
  display: none !important;
}
.empty,
.error {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 128px;
  min-height: 128px;
  padding: var(--oas-space-3);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  text-align: center;
  line-height: 1.5;
  word-break: break-all;
}
`

/**
 * oas-qrcode —— 二维码组件。
 *
 * 属性（kebab-case）：
 * - `value`：内容文本（数字/字母数字/字节三种模式自动选择）
 * - `size`：渲染尺寸（px，默认 128）
 * - `error-correction`：l/m/q/h。当前编码器仅实现 **L 级**纠错，
 *   m/q/h 归一为 l 处理（见 qr.ts 架构决策说明与 demo 注明）
 *
 * 渲染：纯 TS 编码器（零依赖）生成模块矩阵，输出内联 SVG（viewBox 缩放无损）。
 * ARIA：容器 role="img" + aria-label（组件属性优先，缺省走 i18n `qrcode.image`）。
 * 空态：value 为空显示占位提示；内容超容量显示「内容过长」提示。
 */
export class OASQRCode extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'size', 'error-correction', 'aria-label']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper" role="img" aria-label="">
        <svg class="qr" part="qr" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false"></svg>
        <div class="empty" part="empty" hidden></div>
        <div class="error" part="error" hidden></div>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const svg = this.shadow.querySelector<SVGSVGElement>('svg')
    const emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    const errorEl = this.shadow.querySelector<HTMLElement>('[part="error"]')
    const wrapper = this.shadow.querySelector<HTMLElement>('[part="wrapper"]')
    if (!svg || !emptyEl || !errorEl || !wrapper) return

    const value = this.getAttr('value', '')
    const size = this.normalizeSize()

    // aria-label：组件属性优先，缺省走 i18n
    const custom = this.getAttribute('aria-label')
    wrapper.setAttribute('aria-label', custom ?? this.t('qrcode.image'))

    if (!value) {
      svg.setAttribute('hidden', '')
      errorEl.setAttribute('hidden', '')
      emptyEl.removeAttribute('hidden')
      emptyEl.textContent = this.t('qrcode.empty')
      return
    }

    try {
      // 当前仅 L 级：m/q/h 归一为 l（见 qr.ts 架构决策）
      const qr = encodeQR(value, 'l')
      svg.setAttribute('viewBox', `0 0 ${qr.size} ${qr.size}`)
      svg.setAttribute('width', String(size))
      svg.setAttribute('height', String(size))
      svg.innerHTML = `<path d="${matrixToPath(qr.modules, qr.size)}" fill="currentColor" shape-rendering="crispEdges"/>`
      svg.style.color = 'var(--oas-color-text-primary)'
      svg.removeAttribute('hidden')
      emptyEl.setAttribute('hidden', '')
      errorEl.setAttribute('hidden', '')
    } catch (e) {
      if (e instanceof Error && e.message === QR_TOO_LONG_ERROR) {
        svg.setAttribute('hidden', '')
        emptyEl.setAttribute('hidden', '')
        errorEl.removeAttribute('hidden')
        errorEl.textContent = this.t('qrcode.tooLong')
      } else {
        throw e
      }
    }
  }

  /** size 归一：非法值回退默认 128，最小 32 保证可扫码 */
  private normalizeSize(): number {
    const n = Number(this.getAttr('size', '128'))
    if (!Number.isFinite(n) || n <= 0) return 128
    return Math.max(32, Math.round(n))
  }
}
