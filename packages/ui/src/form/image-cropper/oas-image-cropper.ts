import { OASElement } from '@oas-ui/core/oas-element'
import { safeUrl } from '../../shared/safe-url.js'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-image-cropper —— 图片裁剪（form 族）。
 *
 * 舞台内显示待裁剪图片，用户拖动/缩放/旋转图片并调整裁剪框，通过 `toBlob()` / `toDataURL()`
 * 或确认按钮拿到结果。可独立使用，也可作为上传链路的前处理（选图 → 裁剪 → 上传）。
 *
 * 属性（kebab-case）：
 * - `src`：图片地址（`http(s)` / `blob:` / 相对路径；`javascript:` 等可执行协议回落空）
 * - `aspect-ratio`：裁剪框比例——`1` / `16/9` / `0.75` 等；缺省或 `0` 为自由比例（可任意拖动四角）
 * - `max-zoom`：最大缩放倍数，默认 3；非法值回落
 * - `max-output-size`：输出最长边像素上限，默认 1024；非法值回落
 * - `output-type`：输出图片类型，默认 `image/png`（`image/jpeg` / `image/webp` 可选）
 * - `disabled`：禁用全部交互（工具栏禁用、裁剪框不可聚焦）
 *
 * Property（仅 JS）：
 * - `zoom`：当前缩放（1 起，写入即生效，越界夹到 `[1, max-zoom]`）
 * - `rotation`：当前旋转角度（只读，0/90/180/270）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：缩放 / 旋转 / 裁剪框调整后派发，`detail: { zoom, rotation, frame }`
 * - `oas-crop`：确认裁剪，`detail: { blob, zoom, rotation, frame }`（canvas 不可用时 `blob` 为 null）
 * - `oas-load`：图片加载成功，`detail: { width, height }`
 * - `oas-error`：图片加载失败，`detail: { src }`
 *
 * 方法：`toBlob(type?, quality?)` / `toDataURL(type?, quality?)` / `rotate(delta?)` /
 * `setZoom(zoom)` / `reset()`
 *
 * a11y：裁剪框 `tabindex="0"`，方向键移动（Shift 加速 10px），工具栏为原生按钮并带可读名称；
 * 缩放滑块为原生 `input[type=range]`（方向键可操作）；禁用态全部同步 `disabled`。
 *
 * 尺寸与测量：舞台高度默认 320px（`::part(stage)` 可覆盖），渲染测量宽度；无法测量
 * （SSR / 测试环境）时按 480×320 的基准布局驱动裁剪框，真实浏览器首帧测量后按比例重映射。
 */

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface DragState {
  mode: 'move' | 'resize'
  handle: string
  startX: number
  startY: number
  base: CropRect
}

const PAD = 8
const MIN_FRAME = 40
const FALLBACK_STAGE_W = 480
const FALLBACK_STAGE_H = 320
const DEFAULT_MAX_ZOOM = 3
const DEFAULT_MAX_OUTPUT = 1024
const ZOOM_STEP = 0.25
const VALID_OUTPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const warned = new Set<string>()
function warnOnce(msg: string): void {
  if (!warned.has(msg)) {
    warned.add(msg)
    devWarn(msg)
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

const STYLE = `
:host {
  display: block;
  width: 100%;
  max-width: 560px;
  font-family: inherit;
}
:host([hidden]) {
  display: none !important;
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
}
.stage {
  position: relative;
  height: 320px;
  overflow: hidden;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  touch-action: none;
  user-select: none;
}
.stage[data-empty] .frame {
  display: none;
}
.image {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  translate: -50% -50%;
  transform-origin: center;
  max-width: none;
  pointer-events: none;
}
.image[hidden] {
  display: none;
}
.frame {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid var(--oas-color-bg);
  box-shadow: 0 0 0 9999px color-mix(in srgb, var(--oas-color-ink-deep) 55%, transparent);
  cursor: move;
}
.frame:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow:
    0 0 0 9999px color-mix(in srgb, var(--oas-color-ink-deep) 55%, transparent),
    var(--oas-focus-ring);
}
.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-xs);
}
.handle[data-handle='nw'] {
  inset-block-start: -6px;
  inset-inline-start: -6px;
  cursor: nwse-resize;
}
.handle[data-handle='ne'] {
  inset-block-start: -6px;
  inset-inline-end: -6px;
  cursor: nesw-resize;
}
.handle[data-handle='sw'] {
  inset-block-end: -6px;
  inset-inline-start: -6px;
  cursor: nesw-resize;
}
.handle[data-handle='se'] {
  inset-block-end: -6px;
  inset-inline-end: -6px;
  cursor: nwse-resize;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
.empty[hidden] {
  display: none;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  flex-wrap: wrap;
}
.ctrl {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--oas-control-height-md);
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.ctrl:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.ctrl:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.ctrl:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
  border-color: transparent;
}
.ctrl-primary {
  margin-inline-start: auto;
  color: var(--oas-color-text-on-primary);
  background: var(--oas-color-primary);
  border-color: transparent;
}
.ctrl-primary:hover:not(:disabled) {
  background: var(--oas-color-primary-hover);
}
.ctrl-primary:disabled {
  background: var(--oas-color-bg-disabled);
}
.zoom-range {
  flex: 1;
  min-width: 96px;
  accent-color: var(--oas-color-primary);
}
.zoom-range:disabled {
  cursor: not-allowed;
}
.zoom-value {
  min-width: 48px;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
  text-align: end;
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .frame:focus-visible,
  .ctrl:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
  }
}
`

export class OASImageCropper extends OASElement {
  static override get observedAttributes(): string[] {
    return ['src', 'aspect-ratio', 'max-zoom', 'max-output-size', 'output-type', 'disabled']
  }

  private stageEl: HTMLElement | null = null
  private imgEl: HTMLImageElement | null = null
  private frameEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private toolbarEl: HTMLElement | null = null
  private zoomRangeEl: HTMLInputElement | null = null
  private zoomValueEl: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null

  private stageW = FALLBACK_STAGE_W
  private stageH = FALLBACK_STAGE_H
  private frameRect: CropRect = { x: 0, y: 0, width: 0, height: 0 }
  private zoomValue = 1
  private rotationValue = 0
  private offset = { x: 0, y: 0 }
  private lastAspectKey: string | null = null
  private lastSrc = ''
  private loaded = false
  private drag: DragState | null = null

  /** @apiProperty 当前缩放（写入即生效；越界夹到 [1, max-zoom] 并派发 oas-change） */
  get zoom(): number {
    return this.zoomValue
  }

  set zoom(value: number) {
    this.setZoom(value)
  }

  /** @apiProperty 当前旋转角度（0 / 90 / 180 / 270） */
  get rotation(): number {
    return this.rotationValue
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrap" part="root">
        <div class="stage" part="stage" role="group" aria-label="">
          <img class="image" part="image" alt="" draggable="false" hidden>
          <p class="empty" part="empty"></p>
          <div class="frame" part="frame" tabindex="0" role="group" aria-label="">
            <span class="handle" part="handle" data-handle="nw"></span>
            <span class="handle" part="handle" data-handle="ne"></span>
            <span class="handle" part="handle" data-handle="sw"></span>
            <span class="handle" part="handle" data-handle="se"></span>
          </div>
        </div>
        <div class="toolbar" part="toolbar" role="group" aria-label="">
          <button class="ctrl" part="control" type="button" data-act="zoom-out">−</button>
          <input class="zoom-range" part="zoom" type="range" min="1" max="3" step="0.01">
          <button class="ctrl" part="control" type="button" data-act="zoom-in">+</button>
          <span class="zoom-value" part="zoom-value"></span>
          <button class="ctrl" part="control" type="button" data-act="rotate"></button>
          <button class="ctrl" part="control" type="button" data-act="reset"></button>
          <button class="ctrl ctrl-primary" part="control" type="button" data-act="confirm"></button>
        </div>
      </div>
    `
  }

  private bind(): void {
    this.stageEl = this.shadow.querySelector<HTMLElement>('[part="stage"]')
    this.imgEl = this.shadow.querySelector<HTMLImageElement>('[part="image"]')
    this.frameEl = this.shadow.querySelector<HTMLElement>('[part="frame"]')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.toolbarEl = this.shadow.querySelector<HTMLElement>('[part="toolbar"]')
    this.zoomRangeEl = this.shadow.querySelector<HTMLInputElement>('[part="zoom"]')
    this.zoomValueEl = this.shadow.querySelector<HTMLElement>('[part="zoom-value"]')

    this.imgEl?.addEventListener('load', this.onImageLoad)
    this.imgEl?.addEventListener('error', this.onImageError)
    this.stageEl?.addEventListener('pointerdown', this.onPointerDown)
    this.stageEl?.addEventListener('pointermove', this.onPointerMove)
    this.stageEl?.addEventListener('pointerup', this.onPointerUp)
    this.stageEl?.addEventListener('pointercancel', this.onPointerUp)
    this.frameEl?.addEventListener('keydown', this.onFrameKeydown)
    this.toolbarEl?.addEventListener('click', this.onToolbarClick)
    this.zoomRangeEl?.addEventListener('input', this.onZoomInput)
    this.zoomRangeEl?.addEventListener('change', this.onZoomCommit)

    this.observeResize()
    this.ensureCleanup()
  }

  /** ResizeObserver 观察舞台尺寸（不可用时降级为仅在属性/加载时测量） */
  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined' || !this.stageEl) return
    this.resizeObserver?.disconnect()
    this.resizeObserver = new ResizeObserver(() => {
      this.measureStage()
      this.syncFrame()
      this.syncImage()
    })
    this.resizeObserver.observe(this.stageEl)
  }

  private ensureCleanup(): void {
    this.onCleanup(() => {
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      this.drag = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  protected override update(): void {
    const stage = this.stageEl
    if (!stage) return

    const disabled = this.injectDisabled()
    const src = this.imageSrc()
    const hasImage = src !== ''
    if (src !== this.lastSrc) {
      this.lastSrc = src
      this.loaded = false
      this.zoomValue = 1
      this.rotationValue = 0
      this.offset = { x: 0, y: 0 }
      if (this.imgEl) {
        if (hasImage) this.imgEl.setAttribute('src', src)
        else this.imgEl.removeAttribute('src')
      }
    }
    if (this.imgEl) this.imgEl.hidden = !hasImage
    if (this.emptyEl) {
      this.emptyEl.hidden = hasImage
      this.emptyEl.textContent = this.t('imageCropper.empty')
    }
    if (hasImage) stage.removeAttribute('data-empty')
    else stage.setAttribute('data-empty', '')

    // 比例变化重置裁剪框；首次渲染也走这里
    const aspectKey = this.getAttr('aspect-ratio', '')
    if (this.lastAspectKey !== aspectKey || this.frameRect.width === 0) {
      this.lastAspectKey = aspectKey
      this.measureStage()
      this.resetFrame()
    } else {
      this.measureStage()
      this.clampFrame()
    }

    stage.setAttribute('aria-label', this.t('imageCropper.label'))
    this.toolbarEl?.setAttribute('aria-label', this.t('imageCropper.label'))
    this.frameEl?.setAttribute('aria-label', this.t('imageCropper.label'))
    if (this.frameEl) this.frameEl.tabIndex = disabled ? -1 : 0

    const maxZoom = this.maxZoom()
    if (this.zoomRangeEl) {
      this.zoomRangeEl.max = String(maxZoom)
      this.zoomRangeEl.value = String(this.zoomValue)
      this.zoomRangeEl.disabled = disabled
      this.zoomRangeEl.setAttribute('aria-label', this.t('imageCropper.zoom'))
    }

    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('.ctrl')) {
      btn.disabled = disabled
    }
    const zoomOut = this.actionEl('zoom-out')
    if (zoomOut) zoomOut.setAttribute('aria-label', this.t('image.preview.zoomOut'))
    const zoomIn = this.actionEl('zoom-in')
    if (zoomIn) zoomIn.setAttribute('aria-label', this.t('image.preview.zoomIn'))
    const rotate = this.actionEl('rotate')
    if (rotate) rotate.textContent = this.t('imageCropper.rotate')
    const reset = this.actionEl('reset')
    if (reset) reset.textContent = this.t('imageCropper.reset')
    const confirm = this.actionEl('confirm')
    if (confirm) confirm.textContent = this.t('imageCropper.confirm')

    this.syncFrame()
    this.syncImage()
  }

  private actionEl(act: string): HTMLButtonElement | null {
    return this.shadow.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)
  }

  /**
   * 图片来源归一：`data:image/*` 内联图片是裁剪链路的合法输入（选图/裁剪结果回填），
   * 单独放行；其余仍走 safeUrl（`javascript:` / `data:text/html` 等回落空串）。
   */
  private imageSrc(): string {
    const raw = this.getAttr('src', '').trim()
    if (raw === '') return ''
    if (/^data:image\//i.test(raw)) return raw
    return safeUrl(raw)
  }

  /** 读取舞台尺寸（测量失败时用基准尺寸，保证 SSR/测试环境也有确定的裁剪框） */
  private measureStage(): void {
    const width = this.stageEl?.clientWidth ?? 0
    const height = this.stageEl?.clientHeight ?? 0
    const nextW = width > 0 ? width : FALLBACK_STAGE_W
    const nextH = height > 0 ? height : FALLBACK_STAGE_H
    if (nextW === this.stageW && nextH === this.stageH) return
    if (this.frameRect.width > 0) {
      const sx = nextW / this.stageW
      const sy = nextH / this.stageH
      this.frameRect = {
        x: this.frameRect.x * sx,
        y: this.frameRect.y * sy,
        width: this.frameRect.width * sx,
        height: this.frameRect.height * sy,
      }
    }
    this.stageW = nextW
    this.stageH = nextH
  }

  /** 裁剪框初始布局：最长可用矩形（固定比例按比例内缩并居中） */
  private resetFrame(): void {
    const availW = Math.max(MIN_FRAME, this.stageW - PAD * 2)
    const availH = Math.max(MIN_FRAME, this.stageH - PAD * 2)
    const ar = this.aspect()
    let width = availW
    let height = availH
    if (ar !== null) {
      if (availW / availH > ar) {
        height = availH
        width = height * ar
      } else {
        width = availW
        height = width / ar
      }
    }
    this.frameRect = {
      x: (this.stageW - width) / 2,
      y: (this.stageH - height) / 2,
      width,
      height,
    }
    this.syncFrame()
  }

  /** 裁剪框限制在舞台内 */
  private clampFrame(): void {
    const f = this.frameRect
    const width = clamp(f.width, MIN_FRAME, this.stageW)
    const height = clamp(f.height, MIN_FRAME, this.stageH)
    this.frameRect = {
      width,
      height,
      x: clamp(f.x, 0, this.stageW - width),
      y: clamp(f.y, 0, this.stageH - height),
    }
  }

  private syncFrame(): void {
    const frame = this.frameEl
    if (!frame) return
    const f = this.frameRect
    frame.style.left = `${f.x}px`
    frame.style.top = `${f.y}px`
    frame.style.width = `${f.width}px`
    frame.style.height = `${f.height}px`
  }

  /** 图片变换：尺寸取源尺寸 × 适配比 × 缩放，位移/旋转叠加 */
  private syncImage(): void {
    const img = this.imgEl
    if (!img) return
    const scale = this.fitScale() * this.zoomValue
    if (this.loaded && img.naturalWidth > 0) {
      img.style.width = `${img.naturalWidth * scale}px`
      img.style.height = `${img.naturalHeight * scale}px`
    }
    img.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) rotate(${this.rotationValue}deg)`
    if (this.zoomValueEl) this.zoomValueEl.textContent = `${Math.round(this.zoomValue * 100)}%`
  }

  /** 图片「cover」适配比（按旋转后的占位尺寸计算，保证舞台无留白） */
  private fitScale(): number {
    const img = this.imgEl
    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return 1
    const quarter = this.rotationValue % 180 !== 0
    const w = quarter ? img.naturalHeight : img.naturalWidth
    const h = quarter ? img.naturalWidth : img.naturalHeight
    return Math.max(this.stageW / w, this.stageH / h)
  }

  private onImageLoad = (): void => {
    const img = this.imgEl
    if (!img) return
    this.loaded = true
    this.syncImage()
    this.emit('load', { width: img.naturalWidth, height: img.naturalHeight })
  }

  private onImageError = (): void => {
    this.loaded = false
    this.emit('error', { src: this.lastSrc })
  }

  private onPointerDown = (e: Event): void => {
    if (this.injectDisabled() || !this.lastSrc) return
    const target = e.target as HTMLElement | null
    if (!target || !this.frameEl?.contains(target)) return
    const pe = e as PointerEvent
    const handle = target.dataset?.handle ?? ''
    this.drag = {
      mode: handle === '' ? 'move' : 'resize',
      handle,
      startX: pe.clientX ?? 0,
      startY: pe.clientY ?? 0,
      base: { ...this.frameRect },
    }
    try {
      this.frameEl.setPointerCapture(pe.pointerId)
    } catch {
      // 不支持指针捕获的环境降级为舞台内跟踪
    }
    e.preventDefault()
  }

  private onPointerMove = (e: Event): void => {
    const drag = this.drag
    if (!drag) return
    const pe = e as PointerEvent
    const dx = (pe.clientX ?? 0) - drag.startX
    const dy = (pe.clientY ?? 0) - drag.startY
    if (drag.mode === 'move') {
      const base = drag.base
      this.frameRect = {
        ...base,
        x: clamp(base.x + dx, 0, this.stageW - base.width),
        y: clamp(base.y + dy, 0, this.stageH - base.height),
      }
    } else {
      this.resizeFrame(drag.handle, dx, dy, drag.base)
    }
    this.syncFrame()
  }

  private onPointerUp = (): void => {
    if (!this.drag) return
    this.drag = null
    this.clampFrame()
    this.syncFrame()
    this.emitChange()
  }

  /** 角点拖拽调整裁剪框：固定比例按宽联动高度并以对角为锚点，自由比例四边独立 */
  private resizeFrame(handle: string, dx: number, dy: number, base: CropRect): void {
    const ar = this.aspect()
    const west = handle.includes('w')
    const north = handle.includes('n')
    if (ar !== null) {
      const anchorX = west ? base.x + base.width : base.x
      const anchorY = north ? base.y + base.height : base.y
      const maxByX = west ? anchorX : this.stageW - anchorX
      const maxByY = (north ? anchorY : this.stageH - anchorY) * ar
      const limit = Math.max(MIN_FRAME, Math.min(maxByX, maxByY))
      const width = clamp(west ? base.width - dx : base.width + dx, MIN_FRAME, limit)
      const height = width / ar
      this.frameRect = {
        width,
        height,
        x: west ? anchorX - width : anchorX,
        y: north ? anchorY - height : anchorY,
      }
      return
    }
    let width = base.width
    let height = base.height
    let x = base.x
    let y = base.y
    if (west) {
      x = clamp(base.x + dx, 0, base.x + base.width - MIN_FRAME)
      width = base.x + base.width - x
    } else {
      width = clamp(base.width + dx, MIN_FRAME, this.stageW - base.x)
    }
    if (north) {
      y = clamp(base.y + dy, 0, base.y + base.height - MIN_FRAME)
      height = base.y + base.height - y
    } else {
      height = clamp(base.height + dy, MIN_FRAME, this.stageH - base.y)
    }
    this.frameRect = { x, y, width, height }
  }

  private onFrameKeydown = (e: KeyboardEvent): void => {
    if (this.injectDisabled()) return
    const step = e.shiftKey ? 10 : 1
    let dx = 0
    let dy = 0
    if (e.key === 'ArrowLeft') dx = -step
    else if (e.key === 'ArrowRight') dx = step
    else if (e.key === 'ArrowUp') dy = -step
    else if (e.key === 'ArrowDown') dy = step
    else return
    e.preventDefault()
    const f = this.frameRect
    this.frameRect = {
      ...f,
      x: clamp(f.x + dx, 0, this.stageW - f.width),
      y: clamp(f.y + dy, 0, this.stageH - f.height),
    }
    this.syncFrame()
    this.emitChange()
  }

  private onToolbarClick = (e: Event): void => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-act]')
    if (!btn || !this.toolbarEl?.contains(btn)) return
    if (this.injectDisabled()) return
    const act = btn.dataset.act
    if (act === 'zoom-in') this.setZoom(this.zoomValue + ZOOM_STEP)
    else if (act === 'zoom-out') this.setZoom(this.zoomValue - ZOOM_STEP)
    else if (act === 'rotate') this.rotate()
    else if (act === 'reset') this.reset()
    else if (act === 'confirm') void this.confirmCrop()
  }

  private onZoomInput = (): void => {
    if (!this.zoomRangeEl) return
    this.applyZoom(Number(this.zoomRangeEl.value))
  }

  private onZoomCommit = (): void => {
    this.emitChange()
  }

  /** 缩放设置（公共通道：夹值 + 派发 oas-change） */
  setZoom(value: number): void {
    const next = clamp(Number(value), 1, this.maxZoom())
    this.applyZoom(next)
    this.emitChange()
  }

  private applyZoom(value: number): void {
    this.zoomValue = clamp(Number(value), 1, this.maxZoom())
    if (this.zoomRangeEl) this.zoomRangeEl.value = String(this.zoomValue)
    this.syncImage()
  }

  /** 旋转（默认 +90°；派发 oas-change） */
  rotate(delta: number = 90): void {
    const step = Number.isFinite(delta) ? delta : 90
    this.rotationValue = (((this.rotationValue + step) % 360) + 360) % 360
    this.syncImage()
    this.emitChange()
  }

  /** 恢复初始态（缩放 1 / 不旋转 / 裁剪框重置 / 图片居中；派发 oas-change） */
  reset(): void {
    this.zoomValue = 1
    this.rotationValue = 0
    this.offset = { x: 0, y: 0 }
    this.resetFrame()
    this.syncImage()
    this.emitChange()
  }

  private emitChange(): void {
    this.emit('change', {
      zoom: this.zoomValue,
      rotation: this.rotationValue,
      frame: { ...this.frameRect },
    })
  }

  /** 确认裁剪：产出 blob 并派发 oas-crop（canvas 不可用时 blob 为 null） */
  private async confirmCrop(): Promise<void> {
    const blob = await this.toBlob()
    this.emit('crop', {
      blob,
      zoom: this.zoomValue,
      rotation: this.rotationValue,
      frame: { ...this.frameRect },
    })
  }

  /** 输出画布：按裁剪框在舞台中的位置反算图片变换，等比放大到源分辨率（受 max-output-size 约束） */
  private renderCanvas(): HTMLCanvasElement | null {
    const img = this.imgEl
    if (!img || !this.loaded || img.naturalWidth === 0) return null
    const canvas = document.createElement('canvas')
    const ratio = this.outputRatio()
    canvas.width = Math.max(1, Math.round(this.frameRect.width * ratio))
    canvas.height = Math.max(1, Math.round(this.frameRect.height * ratio))
    const ctx = canvas.getContext?.('2d') ?? null
    if (!ctx) return null

    const scale = this.fitScale() * this.zoomValue
    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale
    ctx.scale(ratio, ratio)
    ctx.translate(-this.frameRect.x, -this.frameRect.y)
    ctx.translate(this.stageW / 2 + this.offset.x, this.stageH / 2 + this.offset.y)
    ctx.rotate((this.rotationValue * Math.PI) / 180)
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    return canvas
  }

  /** 输出像素比：舞台像素 → 源像素，并按最长边上限收敛 */
  private outputRatio(): number {
    const scale = this.fitScale() * this.zoomValue
    const ratio = scale > 0 ? 1 / scale : 1
    const longest = Math.max(this.frameRect.width, this.frameRect.height) * ratio
    const cap = this.maxOutputSize()
    return longest > cap ? (ratio * cap) / longest : ratio
  }

  /** 导出 Blob（canvas 不可用时返回 null） */
  async toBlob(type?: string, quality?: number): Promise<Blob | null> {
    const canvas = this.renderCanvas()
    if (!canvas || typeof canvas.toBlob !== 'function') return null
    const outputType = this.outputType(type)
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), outputType, quality)
    })
  }

  /** 导出 dataURL（canvas 不可用时返回空串） */
  toDataURL(type?: string, quality?: number): string {
    const canvas = this.renderCanvas()
    if (!canvas || typeof canvas.toDataURL !== 'function') return ''
    return canvas.toDataURL(this.outputType(type), quality)
  }

  private outputType(explicit?: string): string {
    const raw = (explicit ?? this.getAttr('output-type', 'image/png') ?? '').toLowerCase()
    if (VALID_OUTPUT_TYPES.has(raw)) return raw
    if (explicit === undefined) {
      warnOnce(`[oas-image-cropper] 非法 output-type "${raw}"，已回落 image/png`)
    }
    return 'image/png'
  }

  /** 裁剪比例：`1` / `16/9` / `0.75`；缺省/0/非法为自由比例 */
  private aspect(): number | null {
    const raw = this.getAttr('aspect-ratio', '').trim()
    if (raw === '') return null
    const parts = raw.split('/')
    const value =
      parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : parts.length === 1 ? Number(parts[0]) : Number.NaN
    if (!Number.isFinite(value) || value <= 0) {
      warnOnce(`[oas-image-cropper] 非法 aspect-ratio "${raw}"，已按自由比例处理；示例：1 / 16/9 / 0.75`)
      return null
    }
    return value
  }

  private maxZoom(): number {
    const raw = this.getAttr('max-zoom', '')
    if (raw === '') return DEFAULT_MAX_ZOOM
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 1) {
      warnOnce(`[oas-image-cropper] 非法 max-zoom "${raw}"，已回落 ${DEFAULT_MAX_ZOOM}；应为大于 1 的数`)
      return DEFAULT_MAX_ZOOM
    }
    return n
  }

  private maxOutputSize(): number {
    const raw = this.getAttr('max-output-size', '')
    if (raw === '') return DEFAULT_MAX_OUTPUT
    const n = Number(raw)
    if (!Number.isInteger(n) || n <= 0) {
      warnOnce(`[oas-image-cropper] 非法 max-output-size "${raw}"，已回落 ${DEFAULT_MAX_OUTPUT}`)
      return DEFAULT_MAX_OUTPUT
    }
    return n
  }
}
