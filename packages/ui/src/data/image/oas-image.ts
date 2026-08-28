import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.previewable {
  cursor: zoom-in;
  display: inline-block;
}
img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--oas-radius-md);
}
.placeholder,
.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 160px;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.previewable img {
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
.previewable img:hover {
  transform: scale(1.02);
}
/* ---- 预览浮层 ---- */
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--oas-color-overlay);
}
.preview-dialog {
  display: flex;
  flex-direction: column;
  max-width: 92vw;
  max-height: 92vh;
}
.preview-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.preview-img {
  max-width: 88vw;
  max-height: 78vh;
  object-fit: contain;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
.preview-toolbar {
  display: flex;
  justify-content: center;
  gap: var(--oas-space-2);
  margin-top: var(--oas-space-3);
  padding: var(--oas-space-2);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-lg);
}
.tool {
  min-width: 40px;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-sizing: border-box;
}
.tool:hover {
  background: var(--oas-color-bg-hover);
}
.tool:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

/**
 * oas-image —— 图片（v1.4 增强：内置预览浮层；懒加载）。
 *
 * 属性：`src`/`alt`/`fit`/`placeholder`/`fallback` 保持既有行为；
 * `lazy` 开启懒加载：用 IntersectionObserver 等图片进入视口才开始请求，
 * 与 `placeholder`（等待期占位）/`fallback`（失败兜底）协作；
 * `preview` 存在时点击放大：全屏遮罩 + 居中大图，工具栏提供
 * 放大/缩小/旋转/下载，Esc 或点击遮罩关闭，打开聚焦关闭按钮、关闭还原焦点。
 * 焦点陷阱：Tab 在工具栏内循环，防止焦点逃逸到浮层外。
 *
 * 事件：`oas-preview`（打开时，detail `{ src }`）。
 *
 * 懒加载边界：已在视口内（含缓存命中）同步判定立即加载，不等观察器异步回调；
 * 环境不支持 IntersectionObserver（老浏览器/无观察器宿主）时退化为立即加载（渐进增强）；
 * SSR/水合阶段不应用 src（快照为占位态），观察器在断开连接时统一清理；
 * 加载中/待加载时宿主带 aria-busy，图片成功/失败后复位。
 *
 * 其他边界：浮层在 Shadow DOM 内随组件销毁；document keydown 监听在关闭时
 * 移除，并在断开连接时兜底清理（无孤儿浮层/监听）。
 */
export class OASImage extends OASElement {
  static override get observedAttributes(): string[] {
    return ['src', 'alt', 'preview', 'fit', 'placeholder', 'fallback', 'lazy']
  }

  private loaded = false
  private failed = false
  private fallbackTried = false
  private lastSrc = ''
  /** 懒加载：是否已对当前 src 发起加载（未触发前不设置 img src） */
  private loadTriggered = false
  private observer: IntersectionObserver | null = null

  // 预览状态
  private previewOpen = false
  private scale = 1
  private rotation = 0
  private previousFocus: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="previewable" part="wrapper">
        <div class="placeholder" part="placeholder" hidden></div>
        <img part="image" alt="">
        <div class="fallback" part="fallback" hidden></div>
      </div>
      <div class="preview-mask" part="preview-mask" hidden>
        <div class="preview-dialog" part="preview-dialog" role="dialog" aria-modal="true" aria-label="">
          <div class="preview-stage" part="preview-stage">
            <img class="preview-img" part="preview-image" alt="">
          </div>
          <div class="preview-toolbar" part="preview-toolbar">
            <button type="button" class="tool" part="preview-zoom-in"></button>
            <button type="button" class="tool" part="preview-zoom-out"></button>
            <button type="button" class="tool" part="preview-rotate"></button>
            <a class="tool" part="preview-download" download></a>
            <button type="button" class="tool" part="preview-close"></button>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    if (img) {
      img.addEventListener('load', () => this.handleLoad())
      img.addEventListener('error', () => this.handleError())
    }
    this.shadow.querySelector('.previewable')?.addEventListener('click', () => {
      if (this.hasAttr('preview')) this.openPreview()
    })
    this.shadow
      .querySelector<HTMLElement>('[part="preview-zoom-in"]')
      ?.addEventListener('click', () => this.zoom(1))
    this.shadow
      .querySelector<HTMLElement>('[part="preview-zoom-out"]')
      ?.addEventListener('click', () => this.zoom(-1))
    this.shadow
      .querySelector<HTMLElement>('[part="preview-rotate"]')
      ?.addEventListener('click', () => this.rotate())
    this.shadow
      .querySelector<HTMLElement>('[part="preview-close"]')
      ?.addEventListener('click', () => this.closePreview())
    this.shadow
      .querySelector('.preview-dialog')
      ?.addEventListener('click', (e) => e.stopPropagation())
    this.shadow.querySelector('.preview-mask')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closePreview()
    })

    // 断开连接兜底：移除 document 监听 + 断开懒加载观察器（预览浮层随 Shadow DOM 销毁）
    this.onCleanup(() => {
      document.removeEventListener('keydown', this.onKey)
      this.observer?.disconnect()
      this.observer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（主图存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('img')) return false
    this.bind()
    return true
  }

  private handleLoad(): void {
    this.loaded = true
    this.failed = false
    this.sync()
  }

  private handleError(): void {
    if (this.hasAttr('fallback') && !this.fallbackTried) {
      // 首次失败：切换到兜底图继续加载
      this.fallbackTried = true
      this.loaded = false
      this.failed = false
      this.shadow
        .querySelector<HTMLImageElement>('img')
        ?.setAttribute('src', this.getAttr('fallback', ''))
    } else {
      // 无兜底图或兜底图也失败：显示失败占位
      this.failed = true
      this.loaded = false
    }
    this.sync()
  }

  private sync(): void {
    // aria-busy：有 src 且未出结果（含懒加载等待期）→ true；成功/失败/无 src → false
    this.setAttribute('aria-busy', String(!!this.lastSrc && !this.loaded && !this.failed))
    const img = this.shadow.querySelector<HTMLElement>('img')
    const ph = this.shadow.querySelector<HTMLElement>('[part="placeholder"]')
    const fb = this.shadow.querySelector<HTMLElement>('[part="fallback"]')
    if (!img || !ph || !fb) return
    img.hidden = this.failed || (this.hasAttr('placeholder') && !this.loaded)
    ph.hidden = !this.hasAttr('placeholder') || this.loaded || this.failed
    fb.hidden = !this.failed
  }

  /* ---------------- 懒加载 ---------------- */

  /** 断开观察器（src 变化重挂 / 开始加载 / 卸载时） */
  private disconnectObserver(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  /**
   * 懒加载观察器装配：视口内立即加载；否则挂 IO 等待进入视口。
   * 环境不支持 IO（老浏览器/无观察器宿主）→ 退化为立即加载（渐进增强）。
   */
  private armLazy(): void {
    if (this.loadTriggered) return
    if (typeof IntersectionObserver === 'undefined') {
      this.startLoad()
      return
    }
    // 已在视口内（含图片缓存命中等场景）→ 立即加载，不等观察器异步回调
    if (this.isInViewport()) {
      this.startLoad()
      return
    }
    this.observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.startLoad()
      }
    })
    this.observer.observe(this)
  }

  /** 懒加载触发点：进入视口 / 视口内直挂 / 环境不支持 IO */
  private startLoad(): void {
    if (this.loadTriggered) return
    this.applySrc(this.getAttr('src', ''))
  }

  /** 对 img 应用 src 并刷新状态（非懒加载路径与懒加载触发路径共用） */
  private applySrc(src: string): void {
    this.disconnectObserver()
    this.loadTriggered = true
    this.shadow.querySelector<HTMLImageElement>('img')?.setAttribute('src', src)
    this.sync()
  }

  /** 同步视口判定：布局未定/隐藏（零尺寸）视为不在视口，交给观察器等待 */
  private isInViewport(): boolean {
    if (!this.isConnected) return false
    const rect = this.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    const vw = window.innerWidth || 0
    const vh = window.innerHeight || 0
    return rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0
  }

  /* ---------------- 预览浮层 ---------------- */

  private currentSrc(): string {
    return this.shadow.querySelector<HTMLImageElement>('img')?.getAttribute('src') ?? ''
  }

  private openPreview(): void {
    const mask = this.shadow.querySelector<HTMLElement>('.preview-mask')
    // 懒加载等待期（img 无 src）/异常空 src 时不打开空预览
    if (!mask || this.previewOpen || !this.currentSrc()) return
    this.previewOpen = true
    this.scale = 1
    this.rotation = 0
    this.applyTransform()

    const src = this.currentSrc()
    const pv = this.shadow.querySelector<HTMLImageElement>('[part="preview-image"]')
    if (pv) {
      pv.setAttribute('src', src)
      pv.setAttribute('alt', this.getAttr('alt', this.t('image.defaultAlt')))
    }
    mask.removeAttribute('hidden')
    this.previousFocus = document.activeElement as HTMLElement | null
    this.shadow.querySelector<HTMLElement>('[part="preview-close"]')?.focus()
    document.addEventListener('keydown', this.onKey)
    this.emit('preview', { src })
  }

  private closePreview(): void {
    if (!this.previewOpen) return
    this.previewOpen = false
    this.shadow.querySelector<HTMLElement>('.preview-mask')?.setAttribute('hidden', '')
    document.removeEventListener('keydown', this.onKey)
    this.previousFocus?.focus()
    this.previousFocus = null
  }

  /** Esc 关闭 + Tab 焦点陷阱（不逃逸出工具栏） */
  private onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.closePreview()
    } else if (e.key === 'Tab') {
      this.trapFocus(e)
    }
  }

  private trapFocus(e: KeyboardEvent): void {
    const focusables = this.shadow.querySelectorAll<HTMLElement>('.preview-toolbar .tool')
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = document.activeElement
    if (e.shiftKey) {
      if (active === first || !this.shadow.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !this.shadow.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  private zoom(dir: number): void {
    this.scale = Math.min(3, Math.max(0.5, this.scale + dir * 0.5))
    this.applyTransform()
  }

  private rotate(): void {
    this.rotation = (this.rotation + 90) % 360
    this.applyTransform()
  }

  private applyTransform(): void {
    const img = this.shadow.querySelector<HTMLElement>('[part="preview-image"]')
    if (img) img.style.transform = `rotate(${this.rotation}deg) scale(${this.scale})`
  }

  protected override update(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    if (!img) return
    const src = this.getAttr('src', '')
    const lazy = this.hasAttr('lazy')

    if (src !== this.lastSrc) {
      this.lastSrc = src
      this.loaded = false
      this.failed = false
      this.fallbackTried = false
      this.loadTriggered = false
      this.disconnectObserver()
    }

    if (src) {
      if (lazy && !this.loadTriggered) {
        // 懒加载等待期：暂不设置 src（避免提前发请求），进入视口才加载
        img.removeAttribute('src')
        this.armLazy()
      } else if (!this.loadTriggered) {
        // 非懒加载（或环境不支持 IO）：立即开始加载
        this.applySrc(src)
      }
    } else {
      // 无 src：清空图片（懒加载不挂观察器，避免无谓开销）
      img.removeAttribute('src')
      this.loadTriggered = false
    }

    img.setAttribute('alt', this.getAttr('alt', this.t('image.defaultAlt')))
    // 占位/失败文案走 locale registry（setLocale 切换自动刷新）
    const ph = this.shadow.querySelector<HTMLElement>('[part="placeholder"]')
    const fb = this.shadow.querySelector<HTMLElement>('[part="fallback"]')
    if (ph) ph.textContent = this.t('image.loading')
    if (fb) fb.textContent = this.t('image.loadFailed')
    const fit = this.getAttr('fit', '')
    if (fit) img.style.objectFit = fit
    this.sync()

    // 预览浮层文案（locale 感知）
    const dialog = this.shadow.querySelector<HTMLElement>('[part="preview-dialog"]')
    if (dialog) dialog.setAttribute('aria-label', this.t('image.preview.alt'))
    const labels: Record<string, string> = {
      'preview-zoom-in': this.t('image.preview.zoomIn'),
      'preview-zoom-out': this.t('image.preview.zoomOut'),
      'preview-rotate': this.t('image.preview.rotate'),
      'preview-download': this.t('image.preview.download'),
      'preview-close': this.t('image.preview.close'),
    }
    for (const [part, label] of Object.entries(labels)) {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (el) {
        el.setAttribute('aria-label', label)
        el.textContent = label
      }
    }
    const link = this.shadow.querySelector<HTMLAnchorElement>('[part="preview-download"]')
    if (link) link.setAttribute('href', this.currentSrc())
  }
}
