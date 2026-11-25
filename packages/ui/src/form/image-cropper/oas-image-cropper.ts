import { OASElement } from '@oas-ui/core/oas-element'
import { safeUrl } from '../../shared/safe-url.js'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-image-cropper —— 图片裁剪（form 族）。
 *
 * 舞台内显示待裁剪图片；用户拖动裁剪框移动位置、拖四角改大小，拖图片平移取景，
 * 工具栏缩放 / 旋转图片，通过 `toBlob()` / `toDataURL()` 或确认按钮拿到结果。可独立使用，
 * 也可作为上传链路的前处理（选图 → 裁剪 → 上传）。
 *
 * 交互边界：裁剪框可在舞台内移动 / 缩放；图片可缩放（1 ~ max-zoom）、90° 旋转与平移
 * （拖舞台空白区 / 图面拖动、舞台内滚轮以光标为锚点缩放——触控板像素级细粒度、经典滚轮整步进、
 * Alt+方向键微调）。平移恒受
 * 「图片覆盖裁剪框」约束——拖出 / 缩出可达范围时自动钳回，舞台不会露出底色。
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
 * - `zoom`：当前缩放（1 起；写入即生效、**不派发事件**——程序化写入与用户交互事件分离，
 *   宿主在 `oas-change` 里回写 `el.zoom` 不会递归；越界夹到 `[1, max-zoom]`）
 * - `rotation`：当前旋转角度（只读，0/90/180/270）
 * - `offset`：当前图片位移（只读 `{ x, y }`，相对舞台居中的像素偏移；受覆盖约束钳制）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：缩放 / 旋转 / 裁剪框调整 / 图片平移后派发，`detail: { zoom, rotation, frame, offset }`
 * - `oas-crop`：确认裁剪，`detail: { blob, zoom, rotation, frame, offset }`（canvas 不可用时 `blob` 为 null）
 * - `oas-load`：图片加载成功，`detail: { width, height }`
 * - `oas-error`：图片加载失败，`detail: { src }`
 *
 * 方法：`toBlob(type?, quality?)` / `toDataURL(type?, quality?)` / `rotate(delta?)` /
 * `setZoom(zoom)` / `reset()`
 *
 * a11y：裁剪框 `tabindex="0"`，方向键移动（Shift 加速 10px），Alt+方向键平移图片
 * （Shift 加速 10px）；工具栏为原生按钮并带可读名称；缩放滑块为原生 `input[type=range]`
 * （方向键可操作）；禁用态全部同步 `disabled`。
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

/** 图片平移状态（pointerdown 落点 + 起始位移 + 是否真的产生过位移） */
interface PanState {
  startX: number
  startY: number
  baseX: number
  baseY: number
  /** 本次平移是否真的改过位移（单击 / 抖动不派发 oas-change） */
  moved: boolean
}

/** 舞台内坐标点（缩放锚点） */
interface StagePoint {
  x: number
  y: number
}

/** 图片位移（相对舞台居中的像素偏移） */
export interface CropOffset {
  x: number
  y: number
}

const PAD = 8
const MIN_FRAME = 40
const FALLBACK_STAGE_W = 480
const FALLBACK_STAGE_H = 320
const DEFAULT_MAX_ZOOM = 3
const DEFAULT_MAX_OUTPUT = 1024
const ZOOM_STEP = 0.25
/** 像素模式滚轮：每 100px 一个 ZOOM_STEP（deltaY=100/notch 的经典鼠标滚轮恰为一整步） */
const PIXELS_PER_ZOOM_STEP = 100
/** 像素模式单事件缩放钳制（±0.5 = 2 步进）：触控板动量大批量不瞬跳 */
const MAX_PIXEL_ZOOM_DELTA = 0.5
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
/* 图片可平移时舞台给抓取光标（裁剪框自身 cursor: move 优先） */
.stage[data-pannable] {
  cursor: grab;
}
.stage[data-panning] {
  cursor: grabbing;
}
.stage[data-empty] .frame,
.stage[data-error] .frame {
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
/* 加载失败态：破图不留在舞台上，改为错误文案（弱化色仍可读，走 danger 文字 token） */
.empty[data-state='error'] {
  color: var(--oas-color-danger-text);
  font-size: var(--oas-font-size-sm);
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
  /** 图片位移（相对舞台居中；恒受「覆盖裁剪框」约束，写入必须走 applyOffset） */
  private offsetValue: CropOffset = { x: 0, y: 0 }
  private lastAspectKey: string | null = null
  private lastSrc = ''
  private loaded = false
  /** 当前 src 加载失败（破图）——舞台显示错误文案而不是残留空图 */
  private failed = false
  private drag: DragState | null = null
  /** 图片平移会话（null = 未平移） */
  private pan: PanState | null = null

  /** @apiProperty 当前缩放（写入即静默生效，越界夹到 [1, max-zoom]；不派发事件） */
  get zoom(): number {
    return this.zoomValue
  }

  /**
   * 程序化写入缩放：静默生效（与 slider 的 value 通道一致——`oas-change` 只表达用户交互）。
   * 宿主在 `oas-change` 里回写 `el.zoom = e.detail.zoom` 时不会再派发，避免同步递归爆栈。
   */
  set zoom(value: number) {
    this.applyZoom(value)
  }

  /** @apiProperty 当前旋转角度（度，归一到 0–360；任意角度经 rotate() 设置） */
  get rotation(): number {
    return this.rotationValue
  }

  /** @apiProperty 当前图片位移（只读 `{ x, y }`，相对舞台居中的像素偏移，已按覆盖约束钳制） */
  get offset(): CropOffset {
    return { x: this.offsetValue.x, y: this.offsetValue.y }
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
          <button class="ctrl" part="control" type="button" data-act="zoom-out">-</button>
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
    this.stageEl?.addEventListener('pointercancel', this.onPointerCancel)
    // 滚轮缩放以光标为锚点：必须非 passive 才能阻止页面滚动
    this.stageEl?.addEventListener('wheel', this.onWheel, { passive: false })
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
    this.resizeObserver = new ResizeObserver(() => this.handleStageResize())
    this.resizeObserver.observe(this.stageEl)
  }

  /**
   * 舞台尺寸变化后的统一收口（ResizeObserver 回调与单测共同入口）：
   * 重测尺寸 → 重排裁剪框 → **按覆盖约束重新钳回位移**。
   *
   * 最后一步必须走 `applyOffset`：`measureStage` 会按比例缩放裁剪框、`fitScale` 也会随舞台变化，
   * 位移的可行区间因此改变；漏掉它就会出现「尺寸变小后裁剪框内露出舞台底色」。
   */
  private handleStageResize(): void {
    this.measureStage()
    this.syncFrame()
    this.applyOffset(this.offsetValue.x, this.offsetValue.y)
  }

  private ensureCleanup(): void {
    this.onCleanup(() => {
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      this.drag = null
      this.pan = null
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
      this.failed = false
      this.zoomValue = 1
      this.rotationValue = 0
      this.offsetValue = { x: 0, y: 0 }
      if (this.imgEl) {
        if (hasImage) this.imgEl.setAttribute('src', src)
        else this.imgEl.removeAttribute('src')
      }
    }
    if (this.imgEl) this.imgEl.hidden = !hasImage || this.failed
    this.syncEmptyState()
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
    // 可平移光标提示：只有「有图 + 未禁用」时舞台才可抓取
    this.syncPannable()

    const maxZoom = this.resolveMaxZoom()
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
    this.applyOffset(this.offsetValue.x, this.offsetValue.y)
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
    // 裁剪框挪动后允许的图片位移区间随之变化：超出者钳回，保证图片恒覆盖裁剪框
    this.applyOffset(this.offsetValue.x, this.offsetValue.y)
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
    img.style.transform = `translate(${this.offsetValue.x}px, ${this.offsetValue.y}px) rotate(${this.rotationValue}deg)`
    if (this.zoomValueEl) this.zoomValueEl.textContent = `${Math.round(this.zoomValue * 100)}%`
  }

  /**
   * 图片覆盖裁剪框的可行位移区间（图片局部坐标）。
   *
   * 推导：图片中心 `C + offset` 旋转 θ 后覆盖的点集，等价于「把裁剪框四角反旋到图片局部坐标
   * 后落在 ±(绘制宽高)/2 内」。位移在局部坐标为 `u = R(-θ)·offset`，故每个角给出一个
   * 关于 u 的区间，取交集即得可行上下界。
   */
  private offsetBounds(): { ux: [number, number]; uy: [number, number] } | null {
    const img = this.imgEl
    if (!img || !this.loaded || img.naturalWidth === 0 || img.naturalHeight === 0) return null
    const scale = this.fitScale() * this.zoomValue
    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale
    const rad = (this.rotationValue * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const cx = this.stageW / 2
    const cy = this.stageH / 2
    const f = this.frameRect
    const corners: Array<[number, number]> = [
      [f.x, f.y],
      [f.x + f.width, f.y],
      [f.x, f.y + f.height],
      [f.x + f.width, f.y + f.height],
    ]
    let maxU = -Infinity
    let minU = Infinity
    let maxV = -Infinity
    let minV = Infinity
    for (const [px, py] of corners) {
      const dx = px - cx
      const dy = py - cy
      // R(-θ) 把舞台坐标转到图片局部坐标
      const u = dx * cos + dy * sin
      const v = -dx * sin + dy * cos
      if (u > maxU) maxU = u
      if (u < minU) minU = u
      if (v > maxV) maxV = v
      if (v < minV) minV = v
    }
    return {
      ux: [maxU - drawW / 2, minU + drawW / 2],
      uy: [maxV - drawH / 2, minV + drawH / 2],
    }
  }

  /** 区间夹取：区间退化（图片小于所需覆盖范围）时取中位，避免抖动 */
  private fitInRange(value: number, range: [number, number]): number {
    const [lo, hi] = range
    if (hi < lo) return (lo + hi) / 2
    return clamp(value, lo, hi)
  }

  /** 写入位移：按覆盖约束钳制 → 同步图片（不派发事件） */
  private applyOffset(x: number, y: number): void {
    const bounds = this.offsetBounds()
    if (!bounds) {
      this.offsetValue = { x: 0, y: 0 }
      this.syncImage()
      return
    }
    const rad = (this.rotationValue * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    // 舞台坐标 → 图片局部坐标夹取 → 回转到舞台坐标
    const ux = this.fitInRange(x * cos + y * sin, bounds.ux)
    const uy = this.fitInRange(-x * sin + y * cos, bounds.uy)
    this.offsetValue = { x: ux * cos - uy * sin, y: ux * sin + uy * cos }
    this.syncImage()
  }

  /**
   * 图片「cover」适配比：按**倾斜矩形覆盖舞台**的真实判据计算，任意旋转角下舞台无留白。
   *
   * 推导：图片旋转 θ 后要覆盖轴对齐舞台，等价于「舞台四角反旋回图片局部坐标（R(-θ)）后
   * 落在绘制矩形 ±(drawW/2, drawH/2) 内」。舞台四角在图片局部 u / v 轴上的最大投影为
   *   max|u| = (stageW·|cosθ| + stageH·|sinθ|) / 2，max|v| = (stageW·|sinθ| + stageH·|cosθ|) / 2
   * 代入 drawW = nw·s、drawH = nh·s，解得
   *   s = max((stageW·|cosθ| + stageH·|sinθ|) / nw, (stageW·|sinθ| + stageH·|cosθ|) / nh)
   *
   * 注意判据方向：**不能用「图片的轴对齐包围盒 ⊇ 舞台」**（那只是必要条件）——倾斜矩形的
   * 包围盒比矩形本身大，45° 下包围盒恰好等于舞台时，舞台四角其实远在图片外（图片反而缩小，
   * 裁剪框整圈露舞台底色）。θ 为 90° 倍数时 |cos| / |sin| 一方为 0，退化为「宽高互换」，
   * 与既有行为逐值一致。
   */
  private fitScale(): number {
    const img = this.imgEl
    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return 1
    const rad = (this.rotationValue * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    const needW = this.stageW * cos + this.stageH * sin
    const needH = this.stageW * sin + this.stageH * cos
    return Math.max(needW / img.naturalWidth, needH / img.naturalHeight)
  }

  private onImageLoad = (): void => {
    const img = this.imgEl
    if (!img) return
    this.loaded = true
    this.failed = false
    img.hidden = false
    this.syncEmptyState()
    // load 是异步事件，不会触发 update()：抓取光标必须在这里补
    this.syncPannable()
    this.syncImage()
    this.emit('load', { width: img.naturalWidth, height: img.naturalHeight })
  }

  private onImageError = (): void => {
    this.loaded = false
    this.failed = true
    if (this.imgEl) this.imgEl.hidden = true
    this.syncEmptyState()
    // 破图不得残留「可抓取」提示（同理：错误事件不经过 update()）
    this.syncPannable()
    this.emit('error', { src: this.lastSrc })
  }

  /**
   * 空态 / 错误态显隐与文案：
   * - 无 `src` → 空态（「暂无图片」）
   * - 有 `src` 但加载失败 → 错误态（「图片加载失败」，破图不留在舞台上）
   * - 加载成功 → 两态都隐藏
   */
  private syncEmptyState(): void {
    const empty = this.emptyEl
    if (!empty) return
    const hasImage = this.lastSrc !== ''
    empty.hidden = hasImage && !this.failed
    empty.textContent = this.failed ? this.t('imageCropper.loadFailed') : this.t('imageCropper.empty')
    if (this.failed) empty.dataset.state = 'error'
    else delete empty.dataset.state
    // 错误态隐藏裁剪框：没有可用图片时框架无意义，也避免遮罩盖住错误文案
    if (this.stageEl) {
      if (this.failed) this.stageEl.setAttribute('data-error', '')
      else this.stageEl.removeAttribute('data-error')
    }
  }

  /**
   * 可平移光标提示（舞台 `data-pannable` → `cursor: grab`）。
   *
   * 状态来源是 `loaded && !disabled`，但**加载完成不经过 `update()`**（load 事件是异步到达的），
   * 所以 `onImageLoad` / `onImageError` 也必须调用它——只靠 `update()` 会让真机里始终没有抓取光标。
   */
  private syncPannable(): void {
    const stage = this.stageEl
    if (!stage) return
    if (this.loaded && !this.injectDisabled()) stage.setAttribute('data-pannable', '')
    else {
      stage.removeAttribute('data-pannable')
      stage.removeAttribute('data-panning')
    }
  }

  private onPointerDown = (e: Event): void => {
    if (this.injectDisabled() || !this.lastSrc || this.failed) return
    const target = e.target as HTMLElement | null
    if (!target) return
    const pe = e as PointerEvent
    // 只认主键：右键 / 中键拖拽不得平移图片或移动裁剪框（与 oas-drag 口径一致）
    if (pe.button !== undefined && pe.button !== 0) return
    // 已有会话在跑（第二根手指 / 漏收 pointerup）时不抢占：否则旧起点会被覆盖，坐标跳变
    if (this.drag || this.pan) return
    const inFrame = this.frameEl?.contains(target) === true
    if (inFrame) {
      const handle = target.dataset?.handle ?? ''
      this.drag = {
        mode: handle === '' ? 'move' : 'resize',
        handle,
        startX: pe.clientX ?? 0,
        startY: pe.clientY ?? 0,
        base: { ...this.frameRect },
      }
      try {
        this.frameEl?.setPointerCapture(pe.pointerId)
      } catch {
        // 不支持指针捕获的环境降级为舞台内跟踪
      }
      e.preventDefault()
      return
    }
    // 舞台空白区 / 图面：平移图片（与裁剪框拖拽按目标区分，互不串扰）
    if (!this.loaded) return
    this.pan = {
      startX: pe.clientX ?? 0,
      startY: pe.clientY ?? 0,
      baseX: this.offsetValue.x,
      baseY: this.offsetValue.y,
      moved: false,
    }
    try {
      this.stageEl?.setPointerCapture(pe.pointerId)
    } catch {
      // 同上：不支持指针捕获时依赖舞台内 pointermove
    }
    this.stageEl?.setAttribute('data-panning', '')
    e.preventDefault()
  }

  private onPointerMove = (e: Event): void => {
    const pe = e as PointerEvent
    const pan = this.pan
    if (pan) {
      const dx = (pe.clientX ?? 0) - pan.startX
      const dy = (pe.clientY ?? 0) - pan.startY
      this.applyOffset(pan.baseX + dx, pan.baseY + dy)
      // 位移真的变了才算「动过」（钳制后仍等于起点说明没动，例如已在边界上）
      if (this.offsetValue.x !== pan.baseX || this.offsetValue.y !== pan.baseY) pan.moved = true
      return
    }
    const drag = this.drag
    if (!drag) return
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
    if (this.pan) {
      const moved = this.pan.moved
      this.pan = null
      this.stageEl?.removeAttribute('data-panning')
      this.syncImage()
      // 框外单击（按下即抬起、位移没变）不是一次「图片平移」，不派事件
      if (moved) this.emitChange()
      return
    }
    if (!this.drag) return
    this.drag = null
    this.clampFrame()
    this.syncFrame()
    this.emitChange()
  }

  /**
   * 手势被浏览器接管（滚动 / 触屏系统手势）：本次平移回退到起点，不留下半程位移
   * （取消路径必须无副作用）；裁剪框拖拽同样只收尾。
   */
  private onPointerCancel = (): void => {
    const pan = this.pan
    if (pan) {
      this.pan = null
      this.stageEl?.removeAttribute('data-panning')
      this.applyOffset(pan.baseX, pan.baseY)
      // 没动过就没有「回退」，不派事件（与 pointerup 同一口径）
      if (pan.moved) this.emitChange()
      return
    }
    if (!this.drag) return
    this.drag = null
    this.clampFrame()
    this.syncFrame()
    this.emitChange()
  }

  /**
   * 舞台内滚轮缩放：以光标为锚点（光标下的图片点缩放前后落在同一舞台位置）。
   * 禁用 / 无图时不接管，页面滚动照常。
   *
   * deltaMode 分档（v2.6.9 触控板细粒度）：
   * - `0`（像素，触控板 / Chrome 鼠标滚轮）：`deltaY / 100 × ZOOM_STEP` 连续缩放——
   *   经典鼠标滚轮一格（deltaY=100）恰为一个 ZOOM_STEP，与旧行为逐值一致；触控板小位移细粒度、
   *   单事件钳制 ±0.5（动量大批量不瞬跳）；
   * - `1` / `2`（行 / 页，Firefox 经典滚轮）：保留整步进。
   */
  private onWheel = (e: Event): void => {
    const we = e as WheelEvent
    if (this.injectDisabled() || !this.loaded) return
    // Ctrl/⌘ + 滚轮是浏览器页面缩放手势，组件不得接管
    if (we.ctrlKey) return
    const delta = we.deltaY ?? 0
    if (delta === 0) return
    let step: number
    if ((we.deltaMode ?? 0) === 0) {
      const fine = (-delta / PIXELS_PER_ZOOM_STEP) * ZOOM_STEP
      step = Math.sign(fine) * Math.min(Math.abs(fine), MAX_PIXEL_ZOOM_DELTA)
    } else {
      step = delta < 0 ? ZOOM_STEP : -ZOOM_STEP
    }
    // 缩放已到上下限且本次不会变化：不吞滚轮，放行页面滚动（否则边界上滚轮「失灵」还
    // 锁死页面滚动）；变化判定用 clamp 后的值（越界请求 clamp 回界内等于当前值 = 不变）
    const next = this.zoomValue + step
    if (clamp(Number(next), 1, this.resolveMaxZoom()) === this.zoomValue) return
    we.preventDefault()
    const rect = this.stageEl?.getBoundingClientRect?.()
    const anchor: StagePoint = {
      x: (we.clientX ?? 0) - (rect?.left ?? 0),
      y: (we.clientY ?? 0) - (rect?.top ?? 0),
    }
    if (this.applyZoom(next, anchor)) this.emitChange()
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
    // Alt+方向键平移图片（裁剪框不动）；无 Alt 时移动裁剪框
    if (e.altKey) {
      if (!this.loaded) return
      this.applyOffset(this.offsetValue.x + dx, this.offsetValue.y + dy)
      this.emitChange()
      return
    }
    const f = this.frameRect
    this.frameRect = {
      ...f,
      x: clamp(f.x + dx, 0, this.stageW - f.width),
      y: clamp(f.y + dy, 0, this.stageH - f.height),
    }
    // 裁剪框位置变化会改变图片的可行位移区间：先钳框与位移，再落样式
    this.clampFrame()
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

  /** 缩放设置（公共方法：夹值；**值有变化才派发** oas-change，已在上/下限时重复调用不产生噪音事件） */
  setZoom(value: number): void {
    if (this.applyZoom(value)) this.emitChange()
  }

  /**
   * 写入缩放（夹值 + 同步滑块与图片），返回是否真的发生变化。
   * 本方法**不派发事件**：`oas-change` 只表达用户交互，property 通道（`el.zoom = n`）静默生效——
   * 否则宿主「监听 oas-change → 回写 el.zoom」是同帧同步递归，直接爆栈。
   *
   * `anchor` 为舞台内坐标：给定时以该点为缩放锚点（光标下的图片点保持不动），
   * 缺省按舞台中心缩放（滑块 / 按钮的平移不跟手，避免光标在工具栏上仍按舞台锚点偏移）。
   */
  private applyZoom(value: number, anchor?: StagePoint): boolean {
    const next = clamp(Number(value), 1, this.resolveMaxZoom())
    const changed = next !== this.zoomValue
    if (!changed) {
      if (this.zoomRangeEl) this.zoomRangeEl.value = String(next)
      return false
    }
    const prev = this.zoomValue
    this.zoomValue = next
    if (anchor && this.loaded) {
      const k = next / prev
      const ax = anchor.x - this.stageW / 2
      const ay = anchor.y - this.stageH / 2
      // 锚点对应的图片局部点在新缩放下落到同一舞台坐标：offset' = a - (a - offset)·k
      this.applyOffset(ax - (ax - this.offsetValue.x) * k, ay - (ay - this.offsetValue.y) * k)
    } else {
      // 无锚点：原地缩放后重新按覆盖约束钳制（缩小到 1 时位移会被收回）
      this.applyOffset(this.offsetValue.x, this.offsetValue.y)
    }
    if (this.zoomRangeEl) this.zoomRangeEl.value = String(next)
    return true
  }

  /** 旋转（默认 +90°；派发 oas-change） */
  rotate(delta: number = 90): void {
    const step = Number.isFinite(delta) ? delta : 90
    this.rotationValue = (((this.rotationValue + step) % 360) + 360) % 360
    // 旋转改变图片占位朝向：按覆盖约束重新钳制位移（否则旋转后可能露出舞台底色）
    this.applyOffset(this.offsetValue.x, this.offsetValue.y)
    this.emitChange()
  }

  /** 恢复初始态（缩放 1 / 不旋转 / 位移归零 / 裁剪框重置；派发 oas-change） */
  reset(): void {
    this.zoomValue = 1
    this.rotationValue = 0
    this.offsetValue = { x: 0, y: 0 }
    this.resetFrame()
    this.syncImage()
    this.emitChange()
  }

  private emitChange(): void {
    this.emit('change', {
      zoom: this.zoomValue,
      rotation: this.rotationValue,
      frame: { ...this.frameRect },
      offset: { ...this.offsetValue },
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
      offset: { ...this.offsetValue },
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
    ctx.translate(this.stageW / 2 + this.offsetValue.x, this.stageH / 2 + this.offsetValue.y)
    ctx.rotate((this.rotationValue * Math.PI) / 180)
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    return canvas
  }

  /** 输出像素比：舞台像素 → 源像素，并按最长边上限收敛 */
  private outputRatio(): number {
    const scale = this.fitScale() * this.zoomValue
    const ratio = scale > 0 ? 1 / scale : 1
    const longest = Math.max(this.frameRect.width, this.frameRect.height) * ratio
    const cap = this.resolveMaxOutputSize()
    return longest > cap ? (ratio * cap) / longest : ratio
  }

  /** 导出 Blob（canvas 不可用时返回 null） */
  async toBlob(type?: string, quality?: number): Promise<Blob | null> {
    const canvas = this.renderCanvas()
    if (!canvas || typeof canvas.toBlob !== 'function') return null
    const mime = this.resolveOutputType(type)
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality)
    })
  }

  /** 导出 dataURL（canvas 不可用时返回空串） */
  toDataURL(type?: string, quality?: number): string {
    const canvas = this.renderCanvas()
    if (!canvas || typeof canvas.toDataURL !== 'function') return ''
    return canvas.toDataURL(this.resolveOutputType(type), quality)
  }

  /** 输出 MIME：显式参数 > `output-type` 属性 > 默认 png；非法值回落并单次告警 */
  private resolveOutputType(explicit?: string): string {
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

  /** `max-zoom`：默认 3，非法/≤1 回落默认并单次告警（方法名带 resolve 前缀，避开 attribute camelCase 撞名） */
  private resolveMaxZoom(): number {
    const raw = this.getAttr('max-zoom', '')
    if (raw === '') return DEFAULT_MAX_ZOOM
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 1) {
      warnOnce(`[oas-image-cropper] 非法 max-zoom "${raw}"，已回落 ${DEFAULT_MAX_ZOOM}；应为大于 1 的数`)
      return DEFAULT_MAX_ZOOM
    }
    return n
  }

  /** `max-output-size`：默认 1024，非法回落默认并单次告警（resolve 前缀避开 attribute camelCase 撞名） */
  private resolveMaxOutputSize(): number {
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
