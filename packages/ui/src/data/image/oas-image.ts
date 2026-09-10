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
@media (prefers-reduced-motion: reduce) {
  .previewable img,
  .preview-img {
    transition: none;
  }
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
  /* portal host 为 pointer-events:none，浮层自身恢复命中 */
  pointer-events: auto;
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
  touch-action: none;
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
.preview-stage.zoomed .preview-img {
  cursor: grab;
}
.preview-stage.dragging .preview-img {
  cursor: grabbing;
}
.preview-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 240px;
  min-height: 160px;
  padding: var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.preview-counter {
  align-self: center;
  margin-top: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-3);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
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
/* 图集翻页箭头：悬浮在遮罩两侧 */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  inset-inline-start: var(--oas-space-4);
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  opacity: 0.85;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}
.nav-arrow::before {
  content: '‹';
  font-size: var(--oas-font-size-xl);
  line-height: 1;
}
.nav-next {
  inset-inline-start: auto;
  inset-inline-end: var(--oas-space-4);
}
.nav-next::before {
  content: '›';
}
:dir(rtl) .nav-prev::before {
  content: '›';
}
:dir(rtl) .nav-next::before {
  content: '‹';
}
.nav-arrow:hover {
  background: var(--oas-color-bg-hover);
  opacity: 1;
}
.nav-arrow:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.nav-arrow[disabled] {
  opacity: 0.4;
  cursor: default;
}
`

/** 缩放参数默认值（CSS 变量 --oas-image-zoom-* 缺席时的回退） */
const ZOOM_DEFAULTS = { step: 0.5, min: 0.5, max: 3 }

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

const round2 = (v: number): number => Math.round(v * 100) / 100

/**
 * oas-image —— 图片（v1.4 增强：内置预览浮层；懒加载；v2.4 能力扩展：图集预览、
 * 受控开合、自定义占位/失败插槽、翻转、拖拽平移、滚轮缩放、缩放参数 CSS 变量化）。
 *
 * 属性：`src`/`alt`/`fit`/`placeholder`/`fallback`/`lazy` 保持既有行为；
 * `preview` 存在时点击放大；`preview-src` 指定预览专用地址（缩略图/原图分离）；
 * `preview-src-list`（JSON URL 数组）开启图集模式：两侧箭头 + 键盘 ←→ 翻页 +
 * 页码指示（n/total），`infinite` 首尾循环；图集中某张加载失败显示失败占位
 * （复用 error 插槽内容）而非空白。
 * `preview-open` 受控属性：在场时驱动当前开合态，内部开合（点击/Esc/按钮/方法）
 * 反射回该属性并派发 `oas-preview-change`（detail `{ open }`），双向同步；
 * 仅有 `preview` 时为非受控内部开合。
 *
 * 事件：`oas-preview`（打开时，detail `{ src }`，src 为当前预览地址）；
 * `oas-preview-change`（受控开合变化，detail `{ open }`，属性驱动不派发）；
 * `oas-preview-nav`（图集翻页/跳转，detail `{ index, src }`，供 oas-image-group
 * 容器接管索引）；`openPreview(index?)` 可指定图集起始索引，`previewGoTo(index)`
 * 在预览打开时跳转到指定张（受控 current 驱动用，未打开不做事）；
 * `oas-load`/`oas-error`（主图加载成功/最终失败，detail `{ src }`；
 * fallback 重试期间不派发 oas-error，最终失败时 src 为兜底图地址）。
 *
 * 插槽：`template[slot="placeholder"]` / 任意 `[slot="placeholder"]` 元素克隆进加载占位；
 * `template[slot="error"]` / 任意 `[slot="error"]` 元素克隆进失败占位（主图与图集预览复用）。
 *
 * 缩放参数：步进/上下限由 CSS 变量 `--oas-image-zoom-step`（默认 0.5）/
 * `--oas-image-zoom-min`（默认 0.5）/`--oas-image-zoom-max`（默认 3）控制，
 * 宿主/主题层覆盖即生效。
 *
 * 预览浮层交互：工具栏放大/缩小/旋转/水平翻转/垂直翻转/下载/关闭；放大后可在
 * 舞台拖拽平移（pointer events，按可视边界 clamp）滚轮缩放（preventDefault 阻断
 * 页面滚动，passive:false）；Esc 关闭、←→ 图集翻页、Tab 焦点陷阱；打开聚焦关闭
 * 按钮、关闭还原焦点。
 *
 * 挂载点：fixed 定位在含 transform/filter 祖先的组件 Shadow DOM 内会失效（定位参照
 * 被改写），打开时浮层整体 teleport 到 document.body 下的 portal host（独立 open
 * shadow 注入同一份样式，样式作用域保真），关闭/断开连接时还原回组件 shadow。
 * portal 开启期间 `::part(preview-*)` 无法从宿主穿透（跨 shadow），定制走 CSS 变量。
 *
 * 懒加载边界：已在视口内（含缓存命中）同步判定立即加载，不等观察器异步回调；
 * 环境不支持 IntersectionObserver（老浏览器/无观察器宿主）时退化为立即加载（渐进增强）；
 * SSR/水合阶段不应用 src（快照为占位态），观察器在断开连接时统一清理；
 * 加载中/待加载时宿主带 aria-busy，图片成功/失败后复位。
 *
 * 其他边界：浮层在 Shadow DOM 内随组件销毁；document keydown 监听在关闭时
 * 移除，并在断开连接时兜底清理（无孤儿浮层/监听）；图集翻页重置缩放/旋转/
 * 翻转/平移状态；断开连接时portal 拆除、遮罩还原。
 */
export class OASImage extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'src',
      'alt',
      'preview',
      'fit',
      'placeholder',
      'fallback',
      'lazy',
      'preview-src',
      'preview-src-list',
      'preview-open',
      'infinite',
    ]
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
  private flipX = false
  private flipY = false
  private panX = 0
  private panY = 0
  private previousFocus: HTMLElement | null = null
  /** 预览挂载点：body 下的 portal host（打开期间存在，关闭/断开即拆除） */
  private portalHost: HTMLElement | null = null
  /** 拖拽平移状态 */
  private dragging = false
  private dragStartX = 0
  private dragStartY = 0
  /** 图集：解析后的 URL 列表（update 时缓存） */
  private gallery: string[] = []
  private galleryIndex = 0
  /** 图集当前张加载失败 */
  private previewFailed = false

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
        <button type="button" class="nav-arrow nav-prev" part="preview-prev" hidden></button>
        <button type="button" class="nav-arrow nav-next" part="preview-next" hidden></button>
        <div class="preview-dialog" part="preview-dialog" role="dialog" aria-modal="true" aria-label="">
          <div class="preview-stage" part="preview-stage">
            <img class="preview-img" part="preview-image" alt="" draggable="false">
            <div class="preview-error" part="preview-error" hidden></div>
          </div>
          <div class="preview-counter" part="preview-counter" hidden></div>
          <div class="preview-toolbar" part="preview-toolbar">
            <button type="button" class="tool" part="preview-zoom-in"></button>
            <button type="button" class="tool" part="preview-zoom-out"></button>
            <button type="button" class="tool" part="preview-rotate"></button>
            <button type="button" class="tool" part="preview-flip-x"></button>
            <button type="button" class="tool" part="preview-flip-y"></button>
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
      .querySelector<HTMLElement>('[part="preview-flip-x"]')
      ?.addEventListener('click', () => this.flip('x'))
    this.shadow
      .querySelector<HTMLElement>('[part="preview-flip-y"]')
      ?.addEventListener('click', () => this.flip('y'))
    this.shadow
      .querySelector<HTMLElement>('[part="preview-prev"]')
      ?.addEventListener('click', () => this.stepImage(-1))
    this.shadow
      .querySelector<HTMLElement>('[part="preview-next"]')
      ?.addEventListener('click', () => this.stepImage(1))
    this.shadow
      .querySelector<HTMLElement>('[part="preview-close"]')
      ?.addEventListener('click', () => this.closePreview())
    const pvImg = this.shadow.querySelector<HTMLImageElement>('[part="preview-image"]')
    if (pvImg) {
      pvImg.addEventListener('load', () => this.handlePreviewLoad())
      pvImg.addEventListener('error', () => this.handlePreviewError())
    }
    const stage = this.shadow.querySelector<HTMLElement>('.preview-stage')
    if (stage) {
      // 滚轮缩放：阻断页面滚动（passive:false 才能 preventDefault）
      stage.addEventListener('wheel', this.onWheel, { passive: false })
      // 拖拽平移（放大后查看超出视口部分）
      stage.addEventListener('pointerdown', this.onPointerDown)
      stage.addEventListener('pointermove', this.onPointerMove)
      stage.addEventListener('pointerup', this.onPointerUp)
      stage.addEventListener('pointercancel', this.onPointerUp)
    }
    this.shadow
      .querySelector('.preview-dialog')
      ?.addEventListener('click', (e) => e.stopPropagation())
    this.shadow.querySelector('.preview-mask')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closePreview()
    })

    // 断开连接兜底：移除 document 监听 + 断开懒加载观察器 + 拆除预览 portal
    // （预览浮层还原回组件 shadow，无孤儿浮层/监听）；预览态整体复位并移除
    // 反射的 preview-open 属性——重连后按宿主属性重新驱动开合，无残留可见遮罩
    this.onCleanup(() => {
      document.removeEventListener('keydown', this.onKey)
      this.observer?.disconnect()
      this.observer = null
      this.dragging = false
      this.previousFocus = null
      this.destroyPortal()
      this.previewOpen = false
      this.shadow.querySelector('.preview-mask')?.setAttribute('hidden', '')
      this.removeAttribute('preview-open')
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
    this.emit('load', { src: this.currentSrc() })
    this.sync()
  }

  private handleError(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    const attempted = img?.getAttribute('src') ?? this.lastSrc
    if (this.hasAttr('fallback') && !this.fallbackTried) {
      // 首次失败：切换到兜底图继续加载（重试期间不派发 oas-error）
      this.fallbackTried = true
      this.loaded = false
      this.failed = false
      img?.setAttribute('src', this.getAttr('fallback', ''))
    } else {
      // 无兜底图或兜底图也失败：显示失败占位并派发 oas-error
      this.failed = true
      this.loaded = false
      this.emit('error', { src: attempted })
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

  /* ---------------- 插槽（template 克隆先例） ---------------- */

  /**
   * 占位/失败内容同步：template[slot] 克隆优先，其次任意 [slot] 元素克隆，
   * 皆无则回落 locale 文案。克隆而非移动：原节点保留在 light DOM。
   */
  private syncSlotContent(container: HTMLElement | null, slot: 'placeholder' | 'error'): void {
    if (!container) return
    // 字面量选择器：API 扫描以 `template[slot="..."]` 字面量为插槽发现通道（动态插值不可静态解析）
    const tpl =
      slot === 'placeholder'
        ? this.querySelector('template[slot="placeholder"]')
        : this.querySelector('template[slot="error"]')
    const el = this.querySelector(`:scope > [slot="${slot}"]:not(template)`)
    if (tpl instanceof HTMLTemplateElement) {
      container.replaceChildren(tpl.content.cloneNode(true))
    } else if (el) {
      container.replaceChildren(el.cloneNode(true))
    } else {
      container.textContent = this.t(slot === 'placeholder' ? 'image.loading' : 'image.loadFailed')
    }
  }

  /* ---------------- 预览浮层：挂载点（portal） ---------------- */

  /** 预览浮层所在文档：portal 开启期间为 portal shadow，否则为组件 shadow */
  private previewRoot(): Document | ShadowRoot {
    return this.portalHost?.shadowRoot ?? this.shadow
  }

  private pquery<T extends Element = Element>(sel: string): T | null {
    return this.previewRoot().querySelector<T>(sel)
  }

  private maskEl(): HTMLElement | null {
    return this.pquery<HTMLElement>('.preview-mask')
  }

  /**
   * 预览浮层挂载点：fixed 定位在含 transform/filter 祖先的元素内会失效
   * （定位参照被改写为最近的有变换祖先）。打开时把遮罩移入 document.body 下的
   * portal host（div + 独立 open shadow，注入同一份 STYLE 保证样式作用域保真），
   * 关闭/断开连接时移回组件 shadow。事件监听绑在遮罩子元素上，随节点移动保留。
   */
  private ensurePortal(): void {
    const mask = this.maskEl()
    if (!mask || !this.isConnected) return
    if (this.portalHost?.shadowRoot?.contains(mask)) return
    const host = document.createElement('div')
    host.setAttribute('data-oas-image-preview-portal', '')
    host.style.cssText =
      'position: fixed; inset: 0; pointer-events: none; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));'
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(mask)
    document.body.appendChild(host)
    this.portalHost = host
  }

  /** 拆除 portal：遮罩还原回组件 shadow（遮罩为模板末节点，append 即原位） */
  private destroyPortal(): void {
    if (!this.portalHost) return
    const mask = this.maskEl()
    if (mask) this.shadow.appendChild(mask)
    this.portalHost.remove()
    this.portalHost = null
  }

  /* ---------------- 预览浮层：图集 ---------------- */

  /** 解析 preview-src-list（JSON URL 数组）；非法 JSON/非数组/空数组一律视为无图集 */
  private parseGallery(): string[] {
    const raw = this.getAttr('preview-src-list', '').trim()
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((s): s is string => typeof s === 'string' && s !== '')
      }
    } catch {
      // 非法 JSON：按无图集处理（回落单图预览）
    }
    return []
  }

  /** 当前预览地址：图集取当前张；单图 preview-src 优先，缺省回落主图 src */
  private currentPreviewSrc(): string {
    if (this.gallery.length > 0) return this.gallery[this.galleryIndex] ?? ''
    return this.getAttr('preview-src', '') || this.currentSrc()
  }

  /** 图集翻页（dir=±1）：infinite 首尾循环，否则到边界停住；翻页重置变换状态 */
  private stepImage(dir: 1 | -1): void {
    const total = this.gallery.length
    if (total < 2) return
    let i = this.galleryIndex + dir
    if (this.hasAttr('infinite')) i = (i + total) % total
    else i = clamp(i, 0, total - 1)
    if (i === this.galleryIndex) return
    this.showImage(i)
  }

  /** 展示图集第 i 张：重置变换/失败态，刷新页码/下载地址/失败占位 */
  private showImage(i: number): void {
    this.galleryIndex = i
    this.resetTransform()
    this.previewFailed = false
    const img = this.pquery<HTMLImageElement>('[part="preview-image"]')
    if (img) {
      img.setAttribute('src', this.currentPreviewSrc())
      img.setAttribute('alt', this.getAttr('alt', this.t('image.defaultAlt')))
    }
    this.syncPreviewChrome()
    this.syncPreviewError()
    // 翻页通知（含跳转）：供 oas-image-group 等容器接管索引/派发 oas-change
    this.emit('preview-nav', { index: i, src: this.currentPreviewSrc() })
  }

  /**
   * 图集跳转到第 index 张（预览打开时生效；未打开/无图集不做事，越界收敛）。
   * 供容器组件（oas-image-group）受控 `current` 属性驱动跳图。
   */
  previewGoTo(index: number): void {
    if (!this.previewOpen || this.gallery.length === 0) return
    const i = clamp(Math.trunc(index), 0, this.gallery.length - 1)
    if (i === this.galleryIndex) return
    this.showImage(i)
  }

  private handlePreviewLoad(): void {
    if (!this.previewFailed) return
    this.previewFailed = false
    this.syncPreviewError()
  }

  private handlePreviewError(): void {
    if (this.previewFailed) return
    this.previewFailed = true
    this.syncPreviewError()
  }

  /** 失败占位显隐 + 内容（复用 error 插槽，缺省 locale 文案） */
  private syncPreviewError(): void {
    const img = this.pquery<HTMLElement>('[part="preview-image"]')
    if (img) img.hidden = this.previewFailed
    const box = this.pquery<HTMLElement>('.preview-error')
    if (!box) return
    box.hidden = !this.previewFailed
    if (this.previewFailed) this.syncSlotContent(box, 'error')
  }

  /* ---------------- 预览浮层：开合 ---------------- */

  private currentSrc(): string {
    return this.shadow.querySelector<HTMLImageElement>('img')?.getAttribute('src') ?? ''
  }

  /** 打开预览：图集模式可指定起始索引（缺省取主图 src 在列表中的位置，未命中从 0 开始） */
  openPreview(index?: number): void {
    if (!this.maskEl() || this.previewOpen) return
    if (this.gallery.length > 0) {
      let i = typeof index === 'number' ? index : this.gallery.indexOf(this.currentSrc())
      if (i < 0) i = 0
      this.galleryIndex = clamp(i, 0, this.gallery.length - 1)
    } else if (!this.currentPreviewSrc()) {
      // 懒加载等待期（img 无 src）/异常空 src 时不打开空预览
      return
    }
    this.setOpen(true)
  }

  closePreview(): void {
    this.setOpen(false)
  }

  /**
   * 开合状态机：内部态为准，`preview-open` 属性双向反射——内部开合写回属性，
   * 属性变化（update 内发现不一致）驱动开合。opts.fromAttr 区分属性驱动
   * （不派发 oas-preview-change，外部已知情）。
   */
  private setOpen(open: boolean, opts: { fromAttr?: boolean } = {}): void {
    if (open === this.previewOpen) return
    this.previewOpen = open
    if (this.hasAttr('preview-open') !== open) {
      if (open) this.setAttribute('preview-open', '')
      else this.removeAttribute('preview-open')
    }
    if (open) {
      this.resetTransform()
      this.previewFailed = false
      const src = this.currentPreviewSrc()
      const img = this.pquery<HTMLImageElement>('[part="preview-image"]')
      if (img) {
        img.setAttribute('src', src)
        img.setAttribute('alt', this.getAttr('alt', this.t('image.defaultAlt')))
      }
      this.syncPreviewChrome()
      this.syncPreviewError()
      this.maskEl()?.removeAttribute('hidden')
      // teleport 到 body：规避 transform/filter 祖先导致 fixed 失效
      this.ensurePortal()
      this.previousFocus = document.activeElement as HTMLElement | null
      this.pquery<HTMLElement>('[part="preview-close"]')?.focus()
      document.addEventListener('keydown', this.onKey)
      this.emit('preview', { src })
    } else {
      this.dragging = false
      this.maskEl()?.setAttribute('hidden', '')
      this.destroyPortal()
      document.removeEventListener('keydown', this.onKey)
      this.previousFocus?.focus()
      this.previousFocus = null
    }
    if (!opts.fromAttr) this.emit('preview-change', { open })
  }

  /** Esc 关闭 + ←→ 图集翻页 + Tab 焦点陷阱（不逃逸出浮层） */
  private onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.closePreview()
    } else if (e.key === 'ArrowRight') {
      if (this.gallery.length > 1) {
        e.preventDefault()
        this.stepImage(1)
      }
    } else if (e.key === 'ArrowLeft') {
      if (this.gallery.length > 1) {
        e.preventDefault()
        this.stepImage(-1)
      }
    } else if (e.key === 'Tab') {
      this.trapFocus(e)
    }
  }

  private trapFocus(e: KeyboardEvent): void {
    const mask = this.maskEl()
    if (!mask) return
    const focusables = [...mask.querySelectorAll<HTMLElement>('.tool, .nav-arrow')].filter(
      (el) => !el.hasAttribute('hidden') && !(el instanceof HTMLButtonElement && el.disabled),
    )
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = document.activeElement
    // happy-dom/浏览器对 shadow 内聚焦会重定向到 host（组件宿主或 portal host）
    const inside =
      active != null && (active === this || active === this.portalHost || mask.contains(active))
    if (e.shiftKey) {
      if (active === first || !inside) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !inside) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  /* ---------------- 预览浮层：变换状态机（缩放/旋转/翻转/平移） ---------------- */

  private resetTransform(): void {
    this.scale = 1
    this.rotation = 0
    this.flipX = false
    this.flipY = false
    this.panX = 0
    this.panY = 0
    this.applyTransform()
  }

  /** 缩放参数：步进/上下限走 CSS 变量（--oas-image-zoom-*），缺省用默认值 */
  private zoomConfig(): { step: number; min: number; max: number } {
    const read = (name: string, fb: number): number => {
      let raw = ''
      try {
        raw = getComputedStyle(this).getPropertyValue(name)
      } catch {
        raw = ''
      }
      const v = parseFloat(raw)
      return Number.isFinite(v) && v > 0 ? v : fb
    }
    return {
      step: read('--oas-image-zoom-step', ZOOM_DEFAULTS.step),
      min: read('--oas-image-zoom-min', ZOOM_DEFAULTS.min),
      max: read('--oas-image-zoom-max', ZOOM_DEFAULTS.max),
    }
  }

  private zoom(dir: number): void {
    const { step, min, max } = this.zoomConfig()
    const next = round2(clamp(this.scale + dir * step, min, max))
    if (next === this.scale) return
    // 缩放中心锚定：平移量按比例跟随，视野保持稳定
    const ratio = next / this.scale
    this.panX = round2(this.panX * ratio)
    this.panY = round2(this.panY * ratio)
    this.scale = next
    this.applyTransform()
  }

  private rotate(): void {
    this.rotation = (this.rotation + 90) % 360
    this.applyTransform()
  }

  private flip(axis: 'x' | 'y'): void {
    if (axis === 'x') this.flipX = !this.flipX
    else this.flipY = !this.flipY
    this.applyTransform()
  }

  /** transform 状态机串接：translate → rotate → scale（翻转并入 scale 的轴向符号） */
  private applyTransform(): void {
    const img = this.pquery<HTMLElement>('[part="preview-image"]')
    if (!img) return
    const r = round2(this.scale)
    const sx = round2(this.scale * (this.flipX ? -1 : 1))
    const sy = round2(this.scale * (this.flipY ? -1 : 1))
    const scalePart = this.flipX || this.flipY ? `scale(${sx}, ${sy})` : `scale(${r})`
    img.style.transform = `translate(${this.panX}px, ${this.panY}px) rotate(${this.rotation}deg) ${scalePart}`
    const stage = this.pquery<HTMLElement>('.preview-stage')
    stage?.classList.toggle('zoomed', this.scale > 1)
    stage?.classList.toggle('dragging', this.dragging)
  }

  /** 拖拽平移边界 clamp：图片未超出舞台的方向不回拉（零尺寸布局未定时不 clamp） */
  private clampPan(x: number, y: number): [number, number] {
    const stage = this.pquery<HTMLElement>('.preview-stage')
    const img = this.pquery<HTMLElement>('[part="preview-image"]')
    if (!stage || !img) return [x, y]
    const sRect = stage.getBoundingClientRect()
    const iRect = img.getBoundingClientRect()
    if (!sRect.width || !sRect.height || !iRect.width || !iRect.height) return [x, y]
    const limitX = Math.max(0, (iRect.width - sRect.width) / 2)
    const limitY = Math.max(0, (iRect.height - sRect.height) / 2)
    return [clamp(x, -limitX, limitX), clamp(y, -limitY, limitY)]
  }

  /** 滚轮缩放：阻断页面滚动（passive:false），向上放大、向下缩小 */
  private onWheel = (e: WheelEvent): void => {
    if (!this.previewOpen) return
    e.preventDefault()
    this.zoom(e.deltaY < 0 ? 1 : -1)
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.previewOpen || e.button !== 0) return
    this.dragging = true
    this.dragStartX = e.clientX - this.panX
    this.dragStartY = e.clientY - this.panY
    const stage = this.pquery<HTMLElement>('.preview-stage')
    try {
      stage?.setPointerCapture?.(e.pointerId)
    } catch {
      // 环境不支持指针捕获：拖拽仍跟随 move 事件，仅可能移出舞台中断
    }
    this.applyTransform()
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    const [x, y] = this.clampPan(e.clientX - this.dragStartX, e.clientY - this.dragStartY)
    this.panX = round2(x)
    this.panY = round2(y)
    this.applyTransform()
  }

  private onPointerUp = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.applyTransform()
  }

  /* ---------------- 预览浮层：chrome 同步 ---------------- */

  /** 浮层文案/页码/翻页按钮/下载地址同步（locale 感知，update 与翻页共用） */
  private syncPreviewChrome(): void {
    const root = this.previewRoot()
    const dialog = root.querySelector<HTMLElement>('[part="preview-dialog"]')
    if (dialog) dialog.setAttribute('aria-label', this.t('image.preview.alt'))
    const labels: Record<string, string> = {
      'preview-zoom-in': this.t('image.preview.zoomIn'),
      'preview-zoom-out': this.t('image.preview.zoomOut'),
      'preview-rotate': this.t('image.preview.rotate'),
      'preview-flip-x': this.t('image.preview.flipX'),
      'preview-flip-y': this.t('image.preview.flipY'),
      'preview-download': this.t('image.preview.download'),
      'preview-close': this.t('image.preview.close'),
    }
    for (const [part, label] of Object.entries(labels)) {
      const el = root.querySelector<HTMLElement>(`[part="${part}"]`)
      if (el) {
        el.setAttribute('aria-label', label)
        el.textContent = label
      }
    }
    const navLabels: Record<string, string> = {
      'preview-prev': this.t('image.preview.prev'),
      'preview-next': this.t('image.preview.next'),
    }
    for (const [part, label] of Object.entries(navLabels)) {
      root.querySelector<HTMLElement>(`[part="${part}"]`)?.setAttribute('aria-label', label)
    }
    const total = this.gallery.length
    const counter = root.querySelector<HTMLElement>('[part="preview-counter"]')
    if (counter) {
      counter.hidden = total === 0
      if (total > 0) {
        const index = this.galleryIndex + 1
        counter.textContent = `${index}/${total}`
        counter.setAttribute(
          'aria-label',
          this.t('image.preview.progress', { index, total }),
        )
      }
    }
    const infinite = this.hasAttr('infinite')
    const prev = root.querySelector<HTMLButtonElement>('[part="preview-prev"]')
    const next = root.querySelector<HTMLButtonElement>('[part="preview-next"]')
    if (prev) {
      prev.hidden = total < 2
      prev.disabled = !infinite && this.galleryIndex <= 0
    }
    if (next) {
      next.hidden = total < 2
      next.disabled = !infinite && this.galleryIndex >= total - 1
    }
    const link = root.querySelector<HTMLAnchorElement>('[part="preview-download"]')
    if (link) link.setAttribute('href', this.currentPreviewSrc())
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
    // 占位/失败内容：template[slot]/[slot] 元素克隆优先，缺省回落 locale 文案
    this.syncSlotContent(this.shadow.querySelector('[part="placeholder"]'), 'placeholder')
    this.syncSlotContent(this.shadow.querySelector('[part="fallback"]'), 'error')
    const fit = this.getAttr('fit', '')
    if (fit) img.style.objectFit = fit
    this.sync()

    // 图集列表缓存（翻页/键盘/事件处理共用）；列表变短时收敛当前索引
    this.gallery = this.parseGallery()
    if (this.gallery.length > 0 && this.galleryIndex >= this.gallery.length) {
      this.galleryIndex = this.gallery.length - 1
    }

    // 受控：preview-open 属性在场时驱动开合（内部态变化已反射回属性，双向一致）
    const attrOpen = this.hasAttr('preview-open')
    if (attrOpen !== this.previewOpen) this.setOpen(attrOpen, { fromAttr: true })
    // 自愈：打开态但 portal 缺失（如断开期间被属性打开，ensurePortal 当时放弃）→ 补挂
    if (this.previewOpen && !this.portalHost && this.isConnected) this.ensurePortal()

    // 预览浮层 chrome（locale 感知）
    this.syncPreviewChrome()
    this.syncPreviewError()
  }
}
