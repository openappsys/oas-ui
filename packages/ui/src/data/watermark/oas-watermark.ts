import { OASElement, escapeHtml } from '@oas-ui/core'

const STYLE = `
:host {
  position: relative;
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.watermark {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  background-position: center;
  background-repeat: repeat;
  background-size: 240px 120px;
  color: var(--oas-color-text-primary);
}
.watermark.single {
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
}
.content {
  position: relative;
  z-index: 1;
}
`

/** XML 特殊字符转义（用于内联 SVG 文本；numeric ref 兼容，统一走 core escapeHtml） */

/**
 * 生成文字水印平铺单元：240×120 SVG（-30° 斜纹文字）。
 * fill 用 currentColor，随组件 color 变量（--oas-color-text-primary）走主题。
 * 导出供测试校验 data-uri 内容与特殊字符转义。
 */
export function textTileDataUri(text: string): string {
  const escaped = escapeHtml(text)
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">' +
    '<text x="120" y="60" text-anchor="middle" dominant-baseline="central" ' +
    'transform="rotate(-30 120 60)" font-size="16" font-family="sans-serif" ' +
    `fill="currentColor">${escaped}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * oas-watermark —— 容器水印层。
 *
 * 属性（kebab-case）：
 * - `text`：文字水印内容（与 image 二选一，image 优先）
 * - `image`：图片水印 URL
 * - `opacity`：水印层透明度（0–1，夹取边界）
 * - `repeat`：布尔，存在时平铺；缺省单枚居中
 *
 * 实现：绝对定位的装饰层（pointer-events:none + aria-hidden）铺在 slot 内容之上，
 * 不拦截任何交互；容器无内容也照常显示水印。文字水印用 data-uri SVG（fill 跟随
 * currentColor → --oas-color-text-primary token，无硬编码色值）。
 */
export class OASWatermark extends OASElement {
  static override get observedAttributes(): string[] {
    return ['text', 'image', 'opacity', 'repeat']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="watermark" part="watermark" aria-hidden="true"></div>
      <div class="content" part="content"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；watermark 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（水印层存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="watermark"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const layer = this.shadow.querySelector<HTMLElement>('[part="watermark"]')
    if (!layer) return

    const image = this.getAttr('image', '')
    const text = this.getAttr('text', '')
    const opacity = this.normalizeOpacity()
    const repeat = this.hasAttr('repeat')
    layer.classList.toggle('single', !repeat)

    let bg = 'none'
    if (image) bg = `url("${image}")`
    else if (text) bg = `url("${textTileDataUri(text)}")`

    // 内联样式整体写入（happy-dom 对超长 data-uri 的 style 解析有限，见测试约定）
    layer.setAttribute(
      'style',
      `background-image: ${bg}; opacity: ${opacity}; pointer-events: none;`,
    )
  }

  /** opacity 归一：非数值回退 0.15，夹取 0–1 */
  private normalizeOpacity(): number {
    const n = Number(this.getAttr('opacity', '0.15'))
    if (!Number.isFinite(n)) return 0.15
    return Math.min(1, Math.max(0, n))
  }
}
