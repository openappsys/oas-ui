import { OASElement } from '@oas-ui/core'
import { encodeQR, matrixToPath, QR_TOO_LONG_ERROR, type QrErrorCorrection } from './qr.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  line-height: 1;
}
:host([hidden]) {
  display: none;
}
.wrapper {
  position: relative;
  display: inline-block;
  line-height: 0;
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
/* 状态覆盖层：蒙层 + 居中内容（加载/过期/已扫描）。用 elevated 卡面 + 主文字色，
   light/dark 双主题均可读（避免「常量白文字」无 token 可用的窘境） */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  background: var(--oas-color-bg-elevated);
  border-radius: var(--oas-radius-sm);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  text-align: center;
}
.overlay-text {
  padding-inline: var(--oas-space-2);
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-qrcode-spin 0.8s linear infinite;
}
@keyframes oas-qrcode-spin {
  to {
    transform: rotate(360deg);
  }
}
.refresh {
  appearance: none;
  border: none;
  margin: 0;
  padding: var(--oas-space-1) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  line-height: 1.5;
  cursor: pointer;
}
.refresh:hover {
  background: var(--oas-color-primary-hover);
}
.refresh:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

/** 颜色属性统一协议（ui-spec §4.1）的预设名 */
const PRESET_COLORS = new Set([
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

const DEFAULT_BG = '#ffffff'

/**
 * oas-qrcode —— 二维码组件。
 *
 * 属性（kebab-case）：
 * - `value`：内容文本（数字/字母数字/字节三种模式自动选择）
 * - `size`：渲染尺寸（px，默认 128）
 * - `error-correction`：l/m/q/h 四级别全实现（默认 l）；中心 logo 遮挡场景建议 q/h
 * - `color`：前景色（CSS 色值或 11 预设名，缺省 currentColor 走宿主文本色）
 * - `bg-color`：背景色（默认固定白 #fff——可扫性优先于主题一致性，dark 下同样可扫；
 *   可经 `--oas-qrcode-bg` 变量覆盖）
 * - `margin`：静区边距（模块倍数，默认 4，符合 QR 标准静区要求）
 * - `icon` / `icon-size`：中心 logo（图片 URL，建议搭配 q/h 纠错保住可扫性）
 * - `status`：active（默认）/ expired / loading / scanned，非 active 时盖覆盖层；
 *   expired 覆盖层含「刷新」按钮，点击派发 `oas-refresh`；
 *   自定义覆盖层内容走 `template[slot="status"]` 克隆
 *
 * 方法：`download()` 离屏 rasterize 当前码为 PNG 并触发下载（SVG-only 渲染，不引入常驻 canvas）。
 *
 * 渲染：纯 TS 编码器（零依赖）生成模块矩阵，输出内联 SVG（viewBox 缩放无损）。
 * ARIA：容器 role="img" + aria-label（组件属性优先，缺省走 i18n `qrcode.image`）。
 * 空态：value 为空显示占位提示；内容超容量显示「内容过长」提示。
 */
export class OASQRCode extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'size',
      'error-correction',
      'aria-label',
      'color',
      'bg-color',
      'margin',
      'icon',
      'icon-size',
      'status',
    ]
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper" role="img" aria-label="">
        <svg class="qr" part="qr" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false"></svg>
        <div class="empty" part="empty" hidden></div>
        <div class="error" part="error" hidden></div>
        <div class="overlay" part="overlay" hidden>
          <div class="status-default" part="status-default">
            <span class="spinner" part="spinner" hidden></span>
            <span class="overlay-text" part="overlay-text"></span>
            <button type="button" class="refresh" part="refresh" hidden></button>
          </div>
        </div>
      </div>
    `
  }

  private overlayEl: HTMLElement | null = null

  /** 缓存节点引用 + 绑定交互（render 与水合路径共用） */
  private bind(): void {
    this.overlayEl = this.shadow.querySelector<HTMLElement>('.overlay')
    this.shadow
      .querySelector<HTMLButtonElement>('.refresh')
      ?.addEventListener('click', () => this.emit('refresh'))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（svg 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('svg')) return false
    this.bind()
    return true
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
      this.syncOverlay('empty')
      return
    }

    try {
      const ec = this.normalizeEc()
      const qr = encodeQR(value, ec)
      const margin = this.normalizeMargin()
      const total = qr.size + margin * 2
      const bg = this.bgColor()
      const fg = this.fgColor()

      svg.setAttribute('viewBox', `0 0 ${total} ${total}`)
      svg.setAttribute('width', String(size))
      svg.setAttribute('height', String(size))

      // 背景色矩形（静区一并铺底）+ 数据路径
      let inner = `<rect width="${total}" height="${total}" fill="${bg}"/>`
      inner += `<path d="${matrixToPath(qr.modules, qr.size, margin)}" fill="${fg}" shape-rendering="crispEdges"/>`

      // 中心 logo：底色托 + 图片（高纠错级别兜底可扫性）
      const icon = this.getAttr('icon', '')
      if (icon) {
        const iconModules = (this.normalizeIconSize(size) / size) * total
        const pad = Math.max(1, iconModules * 0.08)
        const x = total / 2 - iconModules / 2
        const y = total / 2 - iconModules / 2
        const radius = Math.max(1, iconModules * 0.12)
        inner += `<rect x="${x - pad}" y="${y - pad}" width="${iconModules + pad * 2}" height="${iconModules + pad * 2}" rx="${radius}" fill="${bg}"/>`
        inner += `<image href="${escapeAttr(icon)}" x="${x}" y="${y}" width="${iconModules}" height="${iconModules}" preserveAspectRatio="xMidYMid slice"/>`
      }

      svg.innerHTML = inner
      if (!this.hasAttr('color')) {
        // 缺省前景走宿主文本色（currentColor）
        svg.style.color = 'var(--oas-color-text-primary)'
      } else {
        svg.style.color = ''
      }
      svg.removeAttribute('hidden')
      emptyEl.setAttribute('hidden', '')
      errorEl.setAttribute('hidden', '')
      this.syncOverlay('ok')
    } catch (e) {
      if (e instanceof Error && e.message === QR_TOO_LONG_ERROR) {
        svg.setAttribute('hidden', '')
        emptyEl.setAttribute('hidden', '')
        errorEl.removeAttribute('hidden')
        errorEl.textContent = this.t('qrcode.tooLong')
        this.syncOverlay('error')
      } else {
        throw e
      }
    }
  }

  /** 状态覆盖层同步：active 隐藏；expired/loading/scanned 显示内置形态；slot="status" 模板优先 */
  private syncOverlay(renderState: 'ok' | 'empty' | 'error'): void {
    const overlay = this.overlayEl
    if (!overlay) return
    const status = this.getAttr('status', 'active')
    const show = renderState === 'ok' && status !== 'active'

    // 自定义覆盖层：template[slot="status"] 克隆（字面量选择器：API 扫描以 template[slot="..."] 字面量为插槽发现通道）
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="status"]')
    const defaultBox = overlay.querySelector<HTMLElement>('.status-default')
    if (tpl) {
      if (defaultBox) defaultBox.hidden = true
      let customBox = overlay.querySelector<HTMLElement>('.status-custom')
      if (!customBox) {
        customBox = document.createElement('div')
        customBox.className = 'status-custom'
        customBox.setAttribute('part', 'status-custom')
        overlay.appendChild(customBox)
      }
      if (customBox.dataset.sig !== String(tpl.innerHTML.length)) {
        customBox.replaceChildren(tpl.content.cloneNode(true))
        customBox.dataset.sig = String(tpl.innerHTML.length)
      }
    } else {
      overlay.querySelector('.status-custom')?.remove()
      if (defaultBox) defaultBox.hidden = false
    }

    if (!show) {
      overlay.setAttribute('hidden', '')
      return
    }
    overlay.removeAttribute('hidden')

    const spinner = overlay.querySelector<HTMLElement>('.spinner')
    const text = overlay.querySelector<HTMLElement>('.overlay-text')
    const refresh = overlay.querySelector<HTMLButtonElement>('.refresh')
    const wrapper = this.shadow.querySelector<HTMLElement>('[part="wrapper"]')
    if (wrapper) {
      if (status === 'loading') wrapper.setAttribute('aria-busy', 'true')
      else wrapper.removeAttribute('aria-busy')
    }
    // 仅内置形态需要同步文案；自定义形态节点已隐藏
    if (!defaultBox || defaultBox.hidden) return
    if (spinner) spinner.hidden = status !== 'loading'
    if (text) {
      if (status === 'loading') text.textContent = this.t('qrcode.loading')
      else if (status === 'expired') text.textContent = this.t('qrcode.expired')
      else if (status === 'scanned') text.textContent = this.t('qrcode.scanned')
      else text.textContent = ''
    }
    if (refresh) {
      refresh.hidden = status !== 'expired'
      refresh.textContent = this.t('qrcode.refresh')
      refresh.setAttribute('aria-label', this.t('qrcode.refresh'))
    }
  }

  /** size 归一：非法值回退默认 128，最小 32 保证可扫码 */
  private normalizeSize(): number {
    const n = Number(this.getAttr('size', '128'))
    if (!Number.isFinite(n) || n <= 0) return 128
    return Math.max(32, Math.round(n))
  }

  /** 纠错级别归一：非法值回落 l */
  private normalizeEc(): QrErrorCorrection {
    const v = this.getAttr('error-correction', 'l').toLowerCase()
    return v === 'm' || v === 'q' || v === 'h' ? v : 'l'
  }

  /** 静区边距（模块倍数）：默认 4（QR 标准静区），非法值回退 */
  private normalizeMargin(): number {
    const n = Number(this.getAttr('margin', '4'))
    if (!Number.isFinite(n) || n < 0) return 4
    return Math.min(10, Math.floor(n))
  }

  /** icon-size 归一：默认 size/5（保证 logo 遮挡不超过纠错余量的经验取值），显式值收敛到 [16, size/2] */
  private normalizeIconSize(size: number): number {
    const fallback = Math.max(16, Math.round(size / 5))
    const raw = Number(this.getAttr('icon-size', String(fallback)))
    if (!Number.isFinite(raw) || raw <= 0) return fallback
    return Math.min(Math.max(16, Math.round(raw)), Math.floor(size / 2))
  }

  /** 前景色：属性（CSS 色值 / 预设名）优先，缺省 currentColor */
  private fgColor(): string {
    const v = this.getAttr('color', '').trim()
    // 默认固定深色（与固定白静区配套：dark 主题下 currentColor 是浅色，
    // 白底浅码不可扫——bg-color 默认可扫性修复必须前景同步默认）；属性 / --oas-qrcode-color 变量覆盖
    if (!v) return 'var(--oas-qrcode-color, #18181b)'
    if (PRESET_COLORS.has(v)) return `var(--oas-preset-${v})`
    return v
  }

  /**
   * 背景色：默认固定白（可扫性优先于主题一致性——扫码器要求浅色静区，
   * dark 主题下一块白底码是通行做法）；属性 / `--oas-qrcode-bg` 变量双通道覆盖。
   */
  private bgColor(): string {
    const v = this.getAttr('bg-color', '').trim()
    if (v) return v
    return 'var(--oas-qrcode-bg, #ffffff)'
  }

  /**
   * 下载当前二维码为 PNG（离屏 rasterize：SVG-only 渲染架构不引入常驻 canvas）。
   * 静区/颜色/icon 与屏幕渲染一致；icon 以图片二次绘制（SVG <img> 内嵌外部图会被浏览器拦截）。
   */
  async download(filename = 'qrcode.png'): Promise<void> {
    const value = this.getAttr('value', '')
    if (!value) return
    const size = this.normalizeSize()
    const scale = 4
    const px = size * scale

    let qr
    try {
      qr = encodeQR(value, this.normalizeEc())
    } catch (e) {
      if (e instanceof Error && e.message === QR_TOO_LONG_ERROR) return
      throw e
    }
    const svgUrl = this.buildSvgDataUrl(qr.size, qr.modules, scale)

    const img = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('QR SVG rasterize failed'))
    })
    img.src = svgUrl
    await loaded

    const canvas = document.createElement('canvas')
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, px, px)

    const icon = this.getAttr('icon', '')
    if (icon) {
      const iconImg = new Image()
      iconImg.crossOrigin = 'anonymous'
      const iconLoaded = new Promise<void>((resolve) => {
        iconImg.onload = () => resolve()
        iconImg.onerror = () => resolve()
      })
      iconImg.src = icon
      await iconLoaded
      if (iconImg.naturalWidth > 0) {
        const iconPx = this.normalizeIconSize(size) * scale
        const pad = Math.max(scale, iconPx * 0.08)
        ctx.fillStyle = this.resolveBgForCanvas()
        const bx = px / 2 - iconPx / 2 - pad
        const by = px / 2 - iconPx / 2 - pad
        const bw = iconPx + pad * 2
        const r = Math.max(scale, iconPx * 0.12)
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bw, r)
        else ctx.rect(bx, by, bw, bw)
        ctx.fill()
        ctx.drawImage(iconImg, px / 2 - iconPx / 2, px / 2 - iconPx / 2, iconPx, iconPx)
      }
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  /** 生成独立 SVG 数据 URL（显式色值，避免 currentColor/外部样式序列化丢失） */
  private buildSvgDataUrl(size: number, modules: Uint8Array, scale: number): string {
    const margin = this.normalizeMargin()
    const total = size + margin * 2
    const px = total * scale
    const fg = this.resolveFgForCanvas()
    const bg = this.resolveBgForCanvas()
    const icon = this.getAttr('icon', '')
    let inner = `<rect width="${px}" height="${px}" fill="${bg}"/>`
    const d = matrixToPath(modules, size, margin)
      .replace(/(\d+(?:\.\d+)?)/g, (m) => String(Number(m) * scale))
    inner += `<path d="${d}" fill="${fg}" shape-rendering="crispEdges"/>`
    if (icon) {
      const iconModules = (this.normalizeIconSize(this.normalizeSize()) / this.normalizeSize()) * total
      const pad = Math.max(1, iconModules * 0.08)
      const x = total / 2 - iconModules / 2
      const y = total / 2 - iconModules / 2
      const radius = Math.max(1, iconModules * 0.12)
      inner += `<rect x="${(x - pad) * scale}" y="${(y - pad) * scale}" width="${(iconModules + pad * 2) * scale}" height="${(iconModules + pad * 2) * scale}" rx="${radius * scale}" fill="${bg}"/>`
      inner += `<image href="${escapeAttr(icon)}" x="${x * scale}" y="${y * scale}" width="${iconModules * scale}" height="${iconModules * scale}" preserveAspectRatio="xMidYMid slice"/>`
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${inner}</svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  /** canvas 用解析后的背景色：属性优先，缺省固定白（与屏幕渲染的 var fallback 一致） */
  private resolveBgForCanvas(): string {
    const v = this.getAttr('bg-color', '').trim()
    if (v) return v
    return '#ffffff'
  }

  /** canvas/独立 SVG 用解析后的前景色：currentColor/预设名解析为具体色值（不可解析时回退） */
  private resolveFgForCanvas(): string {
    const v = this.getAttr('color', '').trim()
    try {
      if (v) {
        if (PRESET_COLORS.has(v)) {
          const token = getComputedStyle(this).getPropertyValue(`--oas-preset-${v}`).trim()
          return token || `var(--oas-preset-${v})`
        }
        return v
      }
      const computed = getComputedStyle(this).getPropertyValue('--oas-qrcode-color').trim()
      if (computed) return computed
    } catch {
      // happy-dom 等无布局环境：走回退
    }
    return v ? (PRESET_COLORS.has(v) ? `var(--oas-preset-${v})` : v) : '#18181b'
  }
}

/** HTML 属性值转义（注入模板字符串前防断链） */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
