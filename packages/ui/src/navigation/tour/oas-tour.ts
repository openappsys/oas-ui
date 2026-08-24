import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

/** 弹层方位：12 向 + center（无目标/对话框模式居中） */
export type TourPlacement = Placement | 'center'

export interface TourMaskConfig {
  /** 遮罩颜色（token 或 CSS 色值） */
  color?: string
  /** 附加样式（如 opacity） */
  style?: string
}

/** 按钮透传属性表（kebab 属性名 → 值） */
export type TourButtonProps = Record<string, string>

export interface TourHint {
  /** 记忆键（dismissable 时写入 localStorage） */
  id?: string
  selector?: string
  /** 目标（属性 JSON 通道仅字符串；元素/函数走 steps property 的 target 字段形态） */
  title?: string
  description?: string
  placement?: Placement
  /** 关闭后持久化记忆（localStorage `oas-tour-hint-${id}`） */
  dismissable?: boolean
}

export interface TourStep {
  /** 目标选择器（attribute JSON 通道） */
  selector?: string
  /** 目标多形态：selector 字符串 / HTMLElement / 函数（property 通道，JSON 无法表达函数） */
  target?: string | HTMLElement | (() => HTMLElement | null)
  title?: string
  description?: string
  /** cover 封面图片 URL（富内容插槽 slot="cover" 优先于 cover 字段） */
  cover?: string
  placement?: TourPlacement
  /** step 级遮罩覆盖：false 关闭（非模态）/ { color, style } 定制 */
  mask?: boolean | TourMaskConfig
  type?: 'default' | 'primary'
  /** 高亮内边距（数字=padding，px）或 { padding, radius, offset }；
   *  offset 为高亮外扩间距（number = 四周同值 / [水平, 垂直] 双轴），与 padding 正交 */
  gap?: number | { padding?: number; radius?: number; offset?: number | [number, number] }
  /** popup / dialog（无目标居中对话框） */
  mode?: 'popup' | 'dialog'
  /** 等待目标出现（毫秒），超时按 skipMissingElement 决定跳过或 fallback */
  waitForElement?: number
  /** 目标缺失/等待超时：跳过该步骤（默认停在当前步骤） */
  skipMissingElement?: boolean
  /** 点击高亮区推进（交互式引导「点这里试试」） */
  advanceOnClick?: boolean
  /** 禁止高亮区交互（拦截层覆盖目标） */
  disabledInteraction?: boolean
  /** 高亮区可点击（拦截层隐藏，点击穿透目标） */
  targetAreaClickable?: boolean
  hidePrev?: boolean
  hideSkip?: boolean
  hideNext?: boolean
  nextButtonProps?: TourButtonProps
  prevButtonProps?: TourButtonProps
  skipButtonProps?: TourButtonProps
  finishButtonProps?: TourButtonProps
}

const STYLE = `
:host {
  display: none;
}
/* portal（append-to）模式：portal host 是普通 div、镜像的是 data-open 而非 open 属性，
   只认 [open] 会让 portal host 永隐（display:none → 内部全 0×0）——须同时认 data-open */
:host([open]),
:host([data-open]) {
  display: block;
}
:host([hidden]) {
  display: none;
}
:host([hints]) {
  display: block;
}

/* ===== 遮罩层（4 段围孔方案：上下左右条围出目标孔，孔内点击穿透到目标） ===== */
.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--oas-z-modal, 1050);
  display: none;
  pointer-events: none;
}
:host([open]) .overlay {
  display: block;
}
/* portal（append-to）模式：overlay 移入 portal host shadow 后，:host 变成 portal host，
   其无 open 属性导致 :host([open]) 不命中、整层永隐——由 ensurePortal 在 portal host 上
   镜像 open 态（data-open 属性）驱动显示，与 :host([open]) 规则互为两处作用域的分支 */
:host([data-open]) .overlay {
  display: block;
}
.mask-seg {
  position: fixed;
  background: var(--oas-tour-mask-color, var(--oas-color-overlay));
  pointer-events: auto;
  /* 与 .highlight 同参的位置过渡：步骤切换时遮罩孔与高亮框同步就位，避免短暂错位 */
  transition: top var(--oas-transition-base) var(--oas-ease-out),
    left var(--oas-transition-base) var(--oas-ease-out),
    width var(--oas-transition-base) var(--oas-ease-out),
    height var(--oas-transition-base) var(--oas-ease-out);
}
.highlight {
  position: fixed;
  box-sizing: border-box;
  border: 2px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-md);
  pointer-events: none;
  transition: top var(--oas-transition-base) var(--oas-ease-out),
    left var(--oas-transition-base) var(--oas-ease-out),
    width var(--oas-transition-base) var(--oas-ease-out),
    height var(--oas-transition-base) var(--oas-ease-out);
}
.hl-interceptor {
  position: fixed;
  pointer-events: auto;
  background: transparent;
}

/* ===== 弹层 ===== */
.popup {
  position: fixed;
  z-index: 3;
  /* 弹层必须可交互（含按钮）：.overlay 是 pointer-events:none（点穿遮罩区走 mask-click 行为），
     弹层不补 auto 会继承 none → 整个弹窗点击透明、点击穿透到下层遮罩被误判外部点击而关闭 */
  pointer-events: auto;
  background: var(--oas-tour-popup-bg, var(--oas-color-bg));
  border-radius: var(--oas-radius-md);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--oas-color-overlay) 32%, transparent);
  padding: var(--oas-space-4);
  min-width: 240px;
  max-width: min(360px, calc(100vw - 24px));
  font-family: inherit;
  color: var(--oas-color-text-primary);
  outline: none;
}
.popup[data-type='primary'] {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.popup[data-type='primary'] .desc {
  color: var(--oas-color-text-on-primary);
  opacity: 0.85;
}
.popup[data-type='primary'] .step-count {
  color: var(--oas-color-text-on-primary);
  opacity: 0.85;
}
.popup[data-type='primary'] .btn {
  background: transparent;
  border-color: var(--oas-color-text-on-primary);
  color: var(--oas-color-text-on-primary);
}
.popup[data-type='primary'] .btn[part='next'] {
  background: var(--oas-color-text-on-primary);
  border-color: var(--oas-color-text-on-primary);
  color: var(--oas-color-primary);
}
.popup[data-type='primary'] .close {
  color: var(--oas-color-text-on-primary);
}
.popup[data-type='primary'] .bullet[aria-current='true'] {
  background: var(--oas-color-text-on-primary);
}
.popup[data-type='primary'] .progress {
  background: var(--oas-color-text-on-primary);
}

/* 进度条 */
.progress {
  height: 3px;
  width: 0;
  background: var(--oas-color-primary);
  border-radius: 2px;
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}

/* 关闭按钮 */
.close {
  position: absolute;
  top: var(--oas-space-2);
  right: var(--oas-space-2);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-tertiary);
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
}
.close:hover {
  background: var(--oas-color-fill);
  color: var(--oas-color-text-primary);
}
.close svg {
  width: 14px;
  height: 14px;
  display: block;
}

/* cover 封面 */
.cover,
.cover-img {
  margin: calc(-1 * var(--oas-space-4)) calc(-1 * var(--oas-space-4)) var(--oas-space-3);
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
}
.cover-img {
  display: block;
  width: calc(100% + 2 * var(--oas-space-4));
  max-width: none;
  object-fit: cover;
}
.cover img {
  display: block;
  width: 100%;
}

.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.desc {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
  min-height: 1.2em;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--oas-space-4);
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.step-count {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.bullets {
  display: flex;
  gap: var(--oas-space-1);
  align-items: center;
}
.bullet {
  width: 6px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--oas-color-border);
  cursor: pointer;
  transition: background var(--oas-transition-base) var(--oas-ease-out);
}
.bullet:hover {
  background: var(--oas-color-text-secondary);
}
.bullet[aria-current='true'] {
  background: var(--oas-color-primary);
}
.actions {
  display: flex;
  gap: var(--oas-space-2);
}
.btn {
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.btn:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn[part='next'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.btn[part='next']:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  opacity: 0.9;
}

/* 不再显示 */
.dont-show {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-top: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.dont-show input {
  accent-color: var(--oas-color-primary);
}

/* 箭头：8px 方块旋转 45°，底色随弹层（default 用弹层底、primary 用主色） */
.arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--oas-tour-popup-bg, var(--oas-color-bg));
  transform: rotate(45deg);
  pointer-events: none;
}
.popup[data-type='primary'] .arrow {
  background: var(--oas-color-primary);
}
.popup[data-placement^='bottom'] .arrow {
  top: -6px;
}
.popup[data-placement^='top'] .arrow {
  bottom: -6px;
}
.popup[data-placement^='left'] .arrow {
  right: -6px;
}
.popup[data-placement^='right'] .arrow {
  left: -6px;
}
.popup[data-placement='top'] .arrow,
.popup[data-placement='bottom'] .arrow {
  left: calc(50% - 4px);
}
.popup[data-placement='top-start'] .arrow,
.popup[data-placement='bottom-start'] .arrow {
  left: 16px;
}
.popup[data-placement='top-end'] .arrow,
.popup[data-placement='bottom-end'] .arrow {
  right: 16px;
}
.popup[data-placement='left'] .arrow,
.popup[data-placement='right'] .arrow {
  top: calc(50% - 4px);
}
.popup[data-placement='left-start'] .arrow,
.popup[data-placement='right-start'] .arrow {
  top: 16px;
}
.popup[data-placement='left-end'] .arrow,
.popup[data-placement='right-end'] .arrow {
  bottom: 16px;
}
.popup[data-placement='center'] .arrow {
  display: none;
}

/* ===== hints 信标模式（常驻脉冲点） ===== */
.hints {
  display: none;
}
:host([hints]) .hints {
  display: block;
}
.beacon {
  position: fixed;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--oas-color-primary);
  cursor: pointer;
  transform: translate(-50%, -50%);
  z-index: var(--oas-z-modal, 1050);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
  animation: oas-tour-pulse 2s infinite;
}
.beacon::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--oas-color-primary);
  opacity: 0.6;
}
@keyframes oas-tour-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--oas-color-primary) 45%, transparent);
  }
  70% {
    box-shadow: 0 0 0 12px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .beacon {
    animation: none;
  }
  .highlight {
    transition: none;
  }
  .mask-seg {
    transition: none;
  }
}
.hint-popup {
  position: fixed;
  z-index: var(--oas-z-modal, 1050);
  background: var(--oas-tour-popup-bg, var(--oas-color-bg));
  border-radius: var(--oas-radius-md);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--oas-color-overlay) 32%, transparent);
  padding: var(--oas-space-3) var(--oas-space-4);
  min-width: 200px;
  max-width: 300px;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.hint-title {
  font-weight: 600;
  font-size: var(--oas-font-size-base);
}
.hint-desc {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.5;
}
.hint-actions {
  margin-top: var(--oas-space-3);
  text-align: right;
}
`

/** localStorage 读写防御（SSR 无 localStorage / 隐私模式抛异常） */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 隐私模式/禁用存储：静默降级为不记忆 */
  }
}

export class OASTour extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'current',
      'steps',
      'placement',
      'arrow',
      'arrow-point-at-center',
      'mask',
      'type',
      'gap',
      'keyboard',
      'show-close',
      'close-icon',
      'mask-click-behavior',
      'target-area-clickable',
      'disabled-interaction',
      'scroll-into-view-options',
      'scroll-padding',
      'auto-reposition',
      'progress-text',
      'show-progress',
      'show-bullets',
      'indicators',
      'hide-prev',
      'hide-skip',
      'hide-next',
      'hide-counter',
      'next-button-props',
      'prev-button-props',
      'skip-button-props',
      'finish-button-props',
      'advance-on-click',
      'mode',
      'lock-scroll',
      'close-on-press-escape',
      'wait-for-element',
      'skip-missing-element',
      'z-index',
      'append-to',
      'dont-show-again',
      'storage-key',
      'persist',
      'typewriter',
      'typewriter-speed',
      'hints',
    ]
  }

  private _steps: TourStep[] = []
  /** property 通道：raw 步骤对象（可含函数/元素 target）；优先于 attribute JSON */
  private _stepsRaw: TourStep[] | null = null
  private current = 0
  private highlight: HTMLElement | null = null
  private popup: HTMLElement | null = null
  private overlay: HTMLElement | null = null
  private interceptor: HTMLElement | null = null
  private maskSegs: HTMLElement[] = []
  private hintsEl: HTMLElement | null = null
  private hintPopupEl: HTMLElement | null = null
  private typewriterTimer: ReturnType<typeof setInterval> | null = null
  private waitTimer: ReturnType<typeof setTimeout> | null = null
  private followRaf = 0
  private followOpen = false
  private prevOpen: boolean | null = null
  /** 当前高亮的步骤 index（生命周期事件去重：仅 index 变化时派发 highlight-start/end） */
  private hlIndex = -1
  /** dont-show-again 勾选态 */
  private dontShowChecked = false
  /** persist 是否已恢复过（防重复恢复） */
  private persistRestored = false
  /** append-to portal host */
  private portalHost: HTMLElement | null = null
  /** hints 激活的 hint 下标（null = 无气泡） */
  private activeHint: number | null = null
  /** 打开时焦点元素（关闭后归还） */
  private prevFocused: HTMLElement | null = null
  /** advance-on-click 挂在目标上的 click 监听是否已绑定 */
  private advanceBound = false
  /** advance-on-click 实际挂载监听的元素引用（unbind 用记录值而非重新解析，防 goTo 改 current 后解绑错目标） */
  private advanceTarget: HTMLElement | null = null
  /** document keydown 监听是否已绑定（断开重连由 update 幂等重挂，参照 back-top 的 updateScrollTarget 守卫模式） */
  private keydownBound = false

  /** Vue/React 会把 steps 识别为实例属性走 property 赋值；字符串反射到 attribute 统一解析链路 */
  get steps(): TourStep[] | string {
    if (this._stepsRaw) return this._stepsRaw
    return this._steps
  }
  set steps(value: TourStep[] | string) {
    if (typeof value === 'string') {
      this._stepsRaw = null
      this.setAttribute('steps', value)
      return
    }
    // property 对象通道：保留函数/元素 target（JSON.stringify 会丢，故不反射）
    this._stepsRaw = Array.isArray(value) ? value : null
    this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="overlay" part="overlay">
        <div class="mask-seg mask-top" part="mask-top" data-mask-seg="top"></div>
        <div class="mask-seg mask-bottom" part="mask-bottom" data-mask-seg="bottom"></div>
        <div class="mask-seg mask-left" part="mask-left" data-mask-seg="left"></div>
        <div class="mask-seg mask-right" part="mask-right" data-mask-seg="right"></div>
        <div class="highlight" part="highlight" aria-hidden="true"></div>
        <div class="hl-interceptor" part="highlight-interceptor" aria-hidden="true"></div>
        <div class="popup" part="popup" role="dialog" aria-modal="true" tabindex="-1">
          <div class="progress" part="progress" aria-hidden="true"></div>
          <button class="close" part="close" type="button"></button>
          <div class="cover" part="cover"><slot name="cover"></slot></div>
          <img class="cover-img" part="cover-img" alt="" hidden />
          <div class="title" part="title"></div>
          <div class="desc" part="desc"></div>
          <div class="footer">
            <div class="step-count" part="step-count"></div>
            <div class="bullets" part="bullets"></div>
            <slot name="indicators" part="indicators"></slot>
            <div class="actions" part="actions">
              <button class="btn" part="skip" type="button"></button>
              <button class="btn" part="prev" type="button"></button>
              <button class="btn" part="next" type="button"></button>
              <slot name="actions"></slot>
            </div>
          </div>
          <label class="dont-show" part="dont-show">
            <input type="checkbox" />
            <span class="dont-show-text"></span>
          </label>
          <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
        </div>
      </div>
      <div class="hints" part="hints"></div>
      <div class="hint-popup" part="hint-popup" hidden>
        <div class="hint-title"></div>
        <div class="hint-desc"></div>
        <div class="hint-actions">
          <button class="btn" part="hint-dismiss" type="button"></button>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.overlay = this.shadow.querySelector('.overlay')
    this.highlight = this.shadow.querySelector('.highlight')
    this.popup = this.shadow.querySelector('.popup')
    this.interceptor = this.shadow.querySelector('.hl-interceptor')
    this.maskSegs = [...this.shadow.querySelectorAll<HTMLElement>('.mask-seg')]
    this.hintsEl = this.shadow.querySelector('.hints')
    this.hintPopupEl = this.shadow.querySelector('.hint-popup')
    this.shadow.querySelector('[part="next"]')?.addEventListener('click', () => this.next())
    this.shadow.querySelector('[part="prev"]')?.addEventListener('click', () => this.prev())
    this.shadow.querySelector('[part="skip"]')?.addEventListener('click', () => this.skip())
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => this.close())
    this.shadow.querySelector('[part="bullets"]')?.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[part="bullet"]') as HTMLButtonElement | null
      if (b) this.goTo(Number(b.dataset.index))
    })
    this.shadow.querySelector('[part="dont-show"] input')?.addEventListener('change', (e) => {
      this.dontShowChecked = (e.target as HTMLInputElement).checked
    })
    this.shadow
      .querySelector('[part="hint-dismiss"]')
      ?.addEventListener('click', () => this.dismissHint())
    // 遮罩点击行为：四段遮罩共用 handler
    for (const seg of this.maskSegs) {
      seg.addEventListener('click', () => this.onMaskClick())
    }
    // 高亮拦截层：advance-on-click 时点击推进（interceptor 是默认显示层）
    this.interceptor?.addEventListener('click', () => {
      if (this.hasAttr('advance-on-click')) this.next()
    })
    // 命名插槽内容变化（宿主动态塞入/移除 slot 内容）→ 增量同步显隐
    for (const s of this.shadow.querySelectorAll<HTMLSlotElement>('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
    this.onCleanup(() => {
      this.clearTypewriter()
      if (this.waitTimer) clearTimeout(this.waitTimer)
      this.unbindFollow()
      this.destroyPortal()
      this.restoreScrollLock()
      this.unbindAdvance()
      this.unbindKeydown()
    })
  }

  /** 键盘：Esc 取消 + ←/→ 推进（可开关）。幂等重挂：首次 render 后断开重连
   *  由 update() 每次调用本方法恢复（参照 back-top updateScrollTarget 的守卫模式） */
  private bindKeydown(): void {
    if (this.keydownBound) return
    this.keydownBound = true
    document.addEventListener('keydown', this.onKey)
    this.onCleanup(() => this.unbindKeydown())
  }

  private unbindKeydown(): void {
    if (!this.keydownBound) return
    this.keydownBound = false
    document.removeEventListener('keydown', this.onKey)
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.hasAttr('open')) return
    if (e.key === 'Escape') {
      if (this.getAttr('close-on-press-escape', 'true') !== 'false') this.cancel('esc')
    } else if (e.key === 'ArrowRight' && this.getAttr('keyboard', 'true') !== 'false') {
      e.preventDefault()
      this.next()
    } else if (e.key === 'ArrowLeft' && this.getAttr('keyboard', 'true') !== 'false') {
      e.preventDefault()
      this.prev()
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（overlay 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.overlay')) return false
    this.bind()
    return true
  }

  private parseSteps(): void {
    if (this._stepsRaw) {
      this._steps = this._stepsRaw.filter(
        (s) => s && (typeof s.title === 'string' || s.target || s.selector),
      )
      return
    }
    try {
      const parsed = JSON.parse(this.getAttr('steps', '[]'))
      this._steps = Array.isArray(parsed)
        ? parsed.filter(
            (s): s is TourStep =>
              s && (typeof s.selector === 'string' || typeof s.title === 'string'),
          )
        : []
    } catch {
      this._steps = []
    }
  }

  /** 目标解析多形态：函数 > 元素 > selector 字符串 */
  private resolveTarget(step: TourStep): HTMLElement | null {
    const t = step.target
    if (typeof t === 'function') {
      const el = t()
      return el instanceof HTMLElement ? el : null
    }
    if (t instanceof HTMLElement) return t
    const sel = step.selector ?? (typeof t === 'string' ? t : '')
    if (!sel) return null
    return document.querySelector<HTMLElement>(sel)
  }

  private next(): void {
    if (this.current >= this._steps.length - 1) {
      this.finish()
      return
    }
    this.goTo(this.current + 1)
  }

  private prev(): void {
    if (this.current <= 0) return
    this.goTo(this.current - 1)
  }

  /** 跳步统一入口：更新 current 属性 + 派发 oas-step + 增量同步 */
  private goTo(index: number): void {
    if (index < 0 || index > this._steps.length - 1) return
    this.current = index
    this.setAttribute('current', String(index))
    this.emit('step', {
      index,
      current: index,
      total: this._steps.length,
      next: index < this._steps.length - 1 ? index + 1 : null,
      prev: index > 0 ? index - 1 : null,
    })
    this.update()
  }

  private skip(): void {
    this.emit('skip', { index: this.current, total: this._steps.length })
    this.cancel('skip')
  }

  private close(): void {
    this.emit('close', { index: this.current, total: this._steps.length })
    this.cancel('close')
  }

  private finish(): void {
    this.emit('finish', { index: this.current, total: this._steps.length })
    this.maybeSaveDontShow()
    this.removeAttribute('open')
  }

  /** 取消统一入口：派发 oas-cancel + 可选「不再显示」记忆 + 关闭 */
  private cancel(source: 'skip' | 'esc' | 'close' | 'mask' | 'dont-show-again'): void {
    this.emit('cancel', { index: this.current, total: this._steps.length, source })
    this.maybeSaveDontShow()
    this.removeAttribute('open')
  }

  /** 遮罩点击行为：close / next / none */
  private onMaskClick(): void {
    const behavior = this.getAttr('mask-click-behavior', 'close')
    if (behavior === 'close') this.cancel('mask')
    else if (behavior === 'next') this.next()
    // none：忽略
  }

  private maybeSaveDontShow(): void {
    if (!this.hasAttr('dont-show-again') || !this.dontShowChecked) return
    safeSet(this.storageKey(), '1')
  }

  private storageKey(): string {
    return this.getAttr('storage-key', 'oas-tour-dismiss')
  }

  /** 引导打开前置校验：「不再显示」命中则拦截（派发 oas-dismiss 保持受控宿主知情） */
  private dismissedBefore(): boolean {
    if (!this.hasAttr('dont-show-again')) return false
    if (safeGet(this.storageKey()) !== '1') return false
    this.emit('dismiss', {})
    return true
  }

  /** 锁滚动：打开时锁 body 滚动，关闭恢复原值 */
  private applyScrollLock(open: boolean): void {
    if (!this.hasAttr('lock-scroll')) return
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
  }
  private restoreScrollLock(): void {
    if (this.hasAttr('lock-scroll') && this.hasAttr('open')) return
    document.body.style.overflow = ''
  }

  /** append-to 挂载点：overlay + hints 移入目标容器 portal host（样式注入，作用域保真） */
  private ensurePortal(): void {
    const sel = this.getAttr('append-to', '')
    if (!sel) {
      this.destroyPortal()
      return
    }
    const target =
      sel === 'body' ? document.body : (document.querySelector(sel) as HTMLElement | null)
    if (!target) {
      this.destroyPortal()
      return
    }
    if (this.portalHost && this.portalHost.parentElement === target) return
    this.destroyPortal()
    const host = document.createElement('div')
    host.setAttribute('data-oas-tour-portal', '')
    host.style.cssText =
      'position: fixed; inset: 0; pointer-events: none; z-index: var(--oas-z-modal, 1050);'
    // portal shadow 内 :host 是 portal host，:host([open]) 不命中——镜像 open 态驱动 overlay 显示
    if (this.hasAttr('open')) host.setAttribute('data-open', '')
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    if (this.overlay) root.appendChild(this.overlay)
    if (this.hintsEl) root.appendChild(this.hintsEl)
    if (this.hintPopupEl) root.appendChild(this.hintPopupEl)
    // 先登记 portalHost 再桥接：bridgeSlots 移动插槽节点会触发同步 slotchange → 重入 update()
    // → ensurePortal，若此时 portalHost 仍为 null 会新建第二个 host 并把 overlay 再次移走
    // （孤儿 host + 递归隐患）
    this.portalHost = host
    this.bridgeSlots(host)
  }

  /** 命名插槽桥接：宿主 light DOM 的 [slot=cover/indicators/actions] 节点移入 portal host
   *  light DOM（popup 随 overlay 进入 portal shadow 后，插槽只分配 portal host 的 light
   *  子节点——不移桥则宿主塞的插槽内容跨 host 断供消失） */
  private bridgeSlots(host: HTMLElement): void {
    for (const n of this.querySelectorAll<HTMLElement>(
      '[slot="cover"], [slot="indicators"], [slot="actions"]',
    )) {
      host.appendChild(n)
    }
  }

  private destroyPortal(): void {
    const host = this.portalHost
    if (!host) return
    // 先摘除引用：移回插槽节点会触发 slotchange → 重入 update → destroyPortal，重入直接短路
    this.portalHost = null
    if (this.overlay && host.shadowRoot?.contains(this.overlay)) {
      this.shadow.appendChild(this.overlay)
    }
    if (this.hintsEl && host.shadowRoot?.contains(this.hintsEl)) {
      this.shadow.appendChild(this.hintsEl)
    }
    if (this.hintPopupEl && host.shadowRoot?.contains(this.hintPopupEl)) {
      this.shadow.appendChild(this.hintPopupEl)
    }
    for (const n of host.querySelectorAll<HTMLElement>('[slot]')) {
      this.appendChild(n)
    }
    host.remove()
  }

  /** 滚动/resize 重定位：capture 捕获容器滚动 + resize，rAF 节流 */
  private syncFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const track = open || this.hasAttr('hints')
    if (track && !this.followOpen) {
      this.followOpen = true
      window.addEventListener('scroll', this.onFollowScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onFollowScroll)
      this.onCleanup(() => {
        window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
        window.removeEventListener('resize', this.onFollowScroll)
      })
    } else if (!track && this.followOpen) {
      this.unbindFollow()
    }
  }

  private unbindFollow(): void {
    if (!this.followOpen) return
    this.followOpen = false
    window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
    window.removeEventListener('resize', this.onFollowScroll)
  }

  private onFollowScroll = (): void => {
    cancelAnimationFrame(this.followRaf)
    this.followRaf = requestAnimationFrame(() => {
      if (this.hasAttr('hints')) this.renderHints()
      if (this.hasAttr('open')) this.position()
    })
  }

  /** advance-on-click：目标可交互时在目标上临时挂 click 推进监听 */
  private bindAdvance(target: HTMLElement | null): void {
    this.unbindAdvance()
    if (!target || !this.hasAttr('advance-on-click')) return
    const step = this._steps[this.current]
    if (step?.advanceOnClick === false) return
    if (
      step &&
      this.getAttr('target-area-clickable', 'false') === 'false' &&
      !step.targetAreaClickable
    ) {
      // interceptor 显示时点击走 interceptor，无需挂目标
      return
    }
    target.addEventListener('click', this.onAdvance)
    // 记录实际绑定元素：unbind 用记录值解绑（goTo 已先改 current，重新解析会解绑错目标导致旧监听残留）
    this.advanceTarget = target
    this.advanceBound = true
  }
  private unbindAdvance(): void {
    if (!this.advanceBound) return
    this.advanceTarget?.removeEventListener('click', this.onAdvance)
    this.advanceTarget = null
    this.advanceBound = false
  }
  private onAdvance = (): void => {
    this.next()
  }

  private clearTypewriter(): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer)
      this.typewriterTimer = null
    }
  }

  /** 打字机动画：逐字渲染描述（typewriter 开关，typewriter-speed 控制速率） */
  private startTypewriter(text: string): void {
    this.clearTypewriter()
    const desc = this.popup?.querySelector<HTMLElement>('[part="desc"]')
    if (!desc) return
    // typewriter 是 opt-in 布尔属性：getAttribute 对无值布尔返回 '' 而非 'true'，
    // 用 getAttr(...)!=='true' 判定会把布尔写法误判为关（'' !== 'true' → 跳过打字机）
    const typewriterOn = this.hasAttr('typewriter') && this.getAttr('typewriter', 'true') !== 'false'
    if (!typewriterOn) {
      desc.textContent = text
      return
    }
    const speed = Math.max(1, Number(this.getAttr('typewriter-speed', '20')) || 20)
    let i = 0
    desc.textContent = ''
    this.typewriterTimer = setInterval(() => {
      i++
      desc.textContent = text.slice(0, i)
      if (i >= text.length) this.clearTypewriter()
    }, speed)
  }

  /** gap 解析：数字 → { padding }；JSON 对象 → { padding, radius, offsetH, offsetV } */
  private resolveGap(step: TourStep): {
    padding: number
    radius: string
    offsetH: number
    offsetV: number
  } {
    const raw = step.gap ?? this.getAttr('gap', '')
    let padding = 4
    let radius = 'var(--oas-radius-md)'
    let offsetH = 0
    let offsetV = 0
    // offset 双轴：number 四周同值 / [水平, 垂直] 数组
    const applyOffset = (o: unknown): void => {
      if (typeof o === 'number' && Number.isFinite(o)) {
        offsetH = o
        offsetV = o
      } else if (Array.isArray(o) && o.length >= 2) {
        offsetH = typeof o[0] === 'number' && Number.isFinite(o[0]) ? o[0] : 0
        offsetV = typeof o[1] === 'number' && Number.isFinite(o[1]) ? o[1] : 0
      }
    }
    if (typeof raw === 'number') padding = raw
    else if (typeof raw === 'string' && raw !== '') {
      const n = Number(raw)
      if (Number.isFinite(n)) padding = n
      else {
        try {
          const o = JSON.parse(raw)
          if (o && typeof o === 'object') {
            if (typeof o.padding === 'number') padding = o.padding
            if (typeof o.radius === 'number') radius = `${o.radius}px`
            else if (typeof o.radius === 'string') radius = o.radius
            if ('offset' in o) applyOffset((o as { offset?: unknown }).offset)
          }
        } catch {
          /* 非法 gap 回落默认 */
        }
      }
    } else if (raw && typeof raw === 'object') {
      const o = raw as {
        padding?: number
        radius?: number | string
        offset?: number | [number, number]
      }
      if (typeof o.padding === 'number') padding = o.padding
      if (typeof o.radius === 'number') radius = `${o.radius}px`
      else if (typeof o.radius === 'string') radius = o.radius
      if (o.offset !== undefined) applyOffset(o.offset)
    }
    return { padding, radius, offsetH, offsetV }
  }

  /** mask 解析：boolean 开关 + { color, style } 定制 */
  private resolveMask(step: TourStep): { show: boolean; color: string; style: string } {
    const raw = step.mask ?? this.getAttr('mask', 'true')
    let show = true
    let color = ''
    let style = ''
    if (typeof raw === 'boolean') show = raw
    else if (typeof raw === 'object' && raw) {
      show = true
      color = raw.color ?? ''
      style = raw.style ?? ''
    } else if (typeof raw === 'string') {
      if (raw === 'false') show = false
      else if (raw === 'true') show = true
      else {
        try {
          const o = JSON.parse(raw)
          if (o && typeof o === 'object') {
            show = true
            color = o.color ?? ''
            style = o.style ?? ''
          }
        } catch {
          show = raw !== 'false'
        }
      }
    }
    return { show, color, style }
  }

  /** placement 解析：step 优先 + center（dialog 模式或目标缺失） */
  private resolvePlacement(step: TourStep, hasTarget: boolean): TourPlacement {
    const mode = step.mode ?? this.getAttr('mode', 'popup')
    if (mode === 'dialog' || !hasTarget) return 'center'
    const p = step.placement ?? (this.getAttr('placement', 'bottom') as TourPlacement)
    return p
  }

  /** 按钮显隐 + props 透传。
   *  弹层内部件一律从 this.popup 查询：append-to portal 期间 popup 已移入 portal host shadow，
   *  this.shadow 查询会落空（曾缺陷：portal 后步骤推进时 syncButtons 等取 null 崩溃） */
  private syncButtons(step: TourStep): void {
    const popup = this.popup!
    const last = this.current >= this._steps.length - 1
    const hide = (part: 'prev' | 'skip' | 'next', stepFlag?: boolean): boolean =>
      stepFlag ?? this.hasAttr(`hide-${part}`)
    const setHidden = (part: 'prev' | 'skip' | 'next' | 'step-count', hidden: boolean): void => {
      const el = popup.querySelector<HTMLElement>(`[part="${part}"]`)
      if (el) el.style.display = hidden ? 'none' : ''
    }
    setHidden('prev', hide('prev', step.hidePrev))
    setHidden('skip', hide('skip', step.hideSkip))
    setHidden('next', hide('next', step.hideNext))
    setHidden('step-count', this.hasAttr('hide-counter'))
    const nextBtn = popup.querySelector<HTMLButtonElement>('[part="next"]')!
    nextBtn.textContent = last ? this.t('tour.finish') : this.t('tour.next')
    const prevBtn = popup.querySelector<HTMLButtonElement>('[part="prev"]')!
    prevBtn.textContent = this.t('tour.prev')
    prevBtn.disabled = this.current === 0
    const skipBtn = popup.querySelector<HTMLButtonElement>('[part="skip"]')!
    skipBtn.textContent = this.t('tour.skip')
    // 按钮 props 透传：全局 + step 级合并（step 优先）
    const applyProps = (part: string, props: TourButtonProps | undefined): void => {
      const btn = popup.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!btn) return
      const merged: TourButtonProps = {
        ...this.parseProps(this.getAttr(`${part}-button-props`, '')),
        ...props,
      }
      for (const [k, v] of Object.entries(merged)) {
        if (v === '') btn.setAttribute(k, '')
        else btn.setAttribute(k, v)
      }
    }
    applyProps('next', step.nextButtonProps)
    applyProps('prev', step.prevButtonProps)
    applyProps('skip', step.skipButtonProps)
    // 自定义动作区插槽：宿主塞入 slot="actions" 内容时隐藏整个内置按钮区
    const actionsSlot = popup.querySelector<HTMLSlotElement>('slot[name="actions"]')
    if (actionsSlot && actionsSlot.assignedNodes({ flatten: true }).length > 0) {
      setHidden('prev', true)
      setHidden('skip', true)
      setHidden('next', true)
    }
  }

  private parseProps(raw: string): TourButtonProps {
    if (!raw) return {}
    try {
      const o = JSON.parse(raw)
      return o && typeof o === 'object' ? o : {}
    } catch {
      return {}
    }
  }

  /** 步骤计数 / 进度文本模板 / 进度条 / 指示器（弹层内部件从 this.popup 查，portal 兼容） */
  private syncCounter(step: TourStep): void {
    const popup = this.popup!
    const total = this._steps.length
    const index = this.current
    const counter = popup.querySelector<HTMLElement>('[part="step-count"]')!
    const template = this.getAttr('progress-text', '')
    const indicators =
      step.mode === 'dialog' || this.getAttr('indicators', 'dots') === 'number' || template
        ? 'number'
        : this.getAttr('indicators', 'dots')
    if (template) {
      counter.textContent = template
        .replace(/\{\{current\}\}/g, String(index + 1))
        .replace(/\{\{total\}\}/g, String(total))
    } else if (indicators === 'number') {
      counter.textContent = `${index + 1} / ${total}`
    } else {
      counter.textContent = ''
    }
    // 进度条：show-progress 时宽度 = (current+1)/total
    const bar = popup.querySelector<HTMLElement>('[part="progress"]')!
    if (this.hasAttr('show-progress')) {
      bar.style.display = ''
      bar.style.width = `${((index + 1) / total) * 100}%`
    } else {
      bar.style.display = 'none'
    }
    // 圆点指示器（show-bullets）
    const bullets = popup.querySelector<HTMLElement>('[part="bullets"]')!
    if (this.hasAttr('show-bullets')) {
      bullets.style.display = ''
      bullets.setAttribute('aria-label', this.t('tour.progress'))
      bullets.innerHTML = this._steps
        .map(
          (_, i) =>
            `<button class="bullet" part="bullet" type="button" data-index="${i}" aria-current="${i === index}" aria-label="${i + 1}"></button>`,
        )
        .join('')
    } else {
      bullets.style.display = 'none'
    }
    // 自定义指示器插槽：宿主塞入 slot="indicators" 内容时，隐藏内置圆点/数字指示器
    const indicatorsSlot = popup.querySelector<HTMLSlotElement>('slot[name="indicators"]')
    if (indicatorsSlot && indicatorsSlot.assignedNodes({ flatten: true }).length > 0) {
      counter.style.display = 'none'
      bullets.style.display = 'none'
    }
  }

  /** cover 富内容：slot="cover" 插槽优先，否则 step.cover 图片（弹层内部件从 this.popup 查，portal 兼容） */
  private syncCover(step: TourStep): void {
    const popup = this.popup!
    const cover = popup.querySelector<HTMLElement>('[part="cover"]')!
    const img = popup.querySelector<HTMLImageElement>('.cover-img')!
    const hasSlot = cover.querySelector('slot')!.assignedNodes({ flatten: true }).length > 0
    if (hasSlot) {
      img.hidden = true
      cover.hidden = false
      return
    }
    cover.hidden = true
    if (step.cover) {
      img.hidden = false
      img.src = step.cover
    } else {
      img.hidden = true
      img.removeAttribute('src')
    }
  }

  /** 关闭按钮：show-close 开关 + close-icon 自定义内容 */
  private syncClose(): void {
    const btn = this.popup!.querySelector<HTMLElement>('[part="close"]')!
    btn.style.display =
      this.hasAttr('show-close') && this.getAttr('show-close', 'true') === 'false' ? 'none' : ''
    btn.setAttribute('aria-label', this.t('tour.close'))
    const icon = this.getAttr('close-icon', '')
    if (icon) {
      btn.innerHTML = icon
    } else if (!btn.querySelector('svg')) {
      btn.innerHTML =
        '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11"/></svg>'
    }
  }

  /** 不再显示 checkbox 文案（locale） */
  private syncDontShow(): void {
    const popup = this.popup!
    const label = popup.querySelector<HTMLElement>('[part="dont-show"]')!
    const checked = popup.querySelector<HTMLInputElement>('[part="dont-show"] input')!
    if (this.hasAttr('dont-show-again')) {
      label.style.display = ''
      popup.querySelector<HTMLElement>('.dont-show-text')!.textContent =
        this.t('tour.dontShowAgain')
      // 勾选态不被重复 update 清掉（用户已勾选）
      if (!this.dontShowChecked) checked.checked = false
    } else {
      label.style.display = 'none'
    }
  }

  /** 定位：高亮（4 段遮罩 + 边框）与弹层（computePosition 12 向 + 翻转 + 避让） */
  private position(): void {
    if (!this.overlay || !this.highlight || !this.popup || !this.interceptor) return
    const step = this._steps[this.current]
    if (!step) return
    const target = this.resolveTarget(step)
    const gap = this.resolveGap(step)
    const mask = this.resolveMask(step)
    const placement = this.resolvePlacement(step, !!target)
    const viewport = { width: window.innerWidth || 800, height: window.innerHeight || 600 }
    const p = gap.padding
    const oh = gap.offsetH
    const ov = gap.offsetV

    // 遮罩 4 段 + 高亮框 + 拦截层（有目标时）
    this.highlight.style.display = 'block'
    if (target) {
      const r = target.getBoundingClientRect()
      const top = r.top - p - ov
      const left = r.left - p - oh
      const w = r.width + (p + oh) * 2
      const h = r.height + (p + ov) * 2
      const holeRight = r.right + p + oh
      const holeBottom = r.bottom + p + ov
      this.highlight.style.top = `${top}px`
      this.highlight.style.left = `${left}px`
      this.highlight.style.width = `${w}px`
      this.highlight.style.height = `${h}px`
      this.highlight.style.borderRadius = gap.radius
      this.interceptor.style.display = this.allowTargetInteraction(step) ? 'none' : 'block'
      this.interceptor.style.top = `${top}px`
      this.interceptor.style.left = `${left}px`
      this.interceptor.style.width = `${w}px`
      this.interceptor.style.height = `${h}px`
      // 4 段遮罩：上下左右围孔（孔 = 目标 + padding + offset 外扩）
      const segs: Record<string, { top: number; left: number; width: number; height: number }> = {
        top: { top: 0, left: 0, width: viewport.width, height: Math.max(0, top) },
        bottom: {
          top: holeBottom,
          left: 0,
          width: viewport.width,
          height: Math.max(0, viewport.height - holeBottom),
        },
        left: { top, left: 0, width: Math.max(0, left), height: h },
        right: { top, left: holeRight, width: Math.max(0, viewport.width - holeRight), height: h },
      }
      for (const seg of this.maskSegs) {
        const s = segs[seg.dataset.maskSeg ?? ''] ?? segs.top!
        seg.style.top = `${s.top}px`
        seg.style.left = `${s.left}px`
        seg.style.width = `${s.width}px`
        seg.style.height = `${s.height}px`
      }
      this.bindAdvance(target)
    } else {
      this.highlight.style.display = 'none'
      this.interceptor.style.display = 'none'
      for (const seg of this.maskSegs) seg.style.display = 'none'
      this.bindAdvance(null)
    }

    // 遮罩显隐 + 颜色/样式
    for (const seg of this.maskSegs) {
      seg.style.display = mask.show ? '' : 'none'
      if (mask.color) seg.style.background = mask.color
      else seg.style.removeProperty('background')
    }
    // aria-modal 随模态性同步：mask 关闭 = 非模态，降级读屏语义（WCAG 惯例）
    this.popup.setAttribute('aria-modal', mask.show ? 'true' : 'false')
    if (mask.style) this.overlay.style.cssText = `position: fixed; inset: 0; ${mask.style}`
    else if (this.getAttr('append-to', '') === '') this.overlay.style.cssText = ''
    // z-index 可配（mask.style 会清掉内联，需重新应用）
    if (this.hasAttr('z-index')) this.overlay.style.zIndex = this.getAttr('z-index')

    // 弹层定位
    if (placement === 'center') {
      this.popup.style.top = '50%'
      this.popup.style.left = '50%'
      this.popup.style.transform = 'translate(-50%, -50%)'
      this.popup.setAttribute('data-placement', 'center')
      return
    }
    if (!target) return
    const anchor = target.getBoundingClientRect()
    const popupRect = this.popup.getBoundingClientRect()
    // auto-reposition：true（默认）开启溢出翻转 + 视口避让；false 保持声明 placement 不做避让
    const autoAdjust = this.getAttr('auto-reposition', 'true') !== 'false'
    const {
      top,
      left,
      placement: actual,
    } = computePosition(anchor, popupRect, placement as Placement, viewport, 8, autoAdjust)
    this.popup.style.top = `${top}px`
    this.popup.style.left = `${left}px`
    this.popup.style.transform = ''
    this.popup.setAttribute('data-placement', actual)
    this.positionArrow(anchor, actual)
  }

  /** 箭头交叉轴指向（与 hover-card positionArrow 同源）：
   *  - -start/-end 对齐 placement：CSS 固定 16px 在弹层被视口夹取/目标比弹层窄时会错指——
   *    按锚点中心投影写内联偏移并夹取在弹层边内；
   *  - arrow-point-at-center 显式开启：center 对齐在弹层被夹取偏移后仍指向锚点中心；
   *  - 其余（center 对齐且无 point-at-center）保持 CSS calc(50% - 4px) 居中兜底。
   *  tour 无 merge 形态（箭头永远居中于锚点投影），无需 hover-card 的 arrow-merge 守卫。 */
  private positionArrow(anchorRect: DOMRect, placement: string): void {
    if (!this.popup) return
    if (placement === 'center') return
    if (this.getAttr('arrow', 'true') === 'false') return
    const arrow = this.popup.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.left = ''
    arrow.style.top = ''
    const aligned = placement.endsWith('-start') || placement.endsWith('-end')
    if (!aligned && !this.hasAttr('arrow-point-at-center')) return
    const vertical = placement.startsWith('top') || placement.startsWith('bottom')
    const rect = this.popup.getBoundingClientRect()
    const popupEdge = vertical
      ? parseFloat(this.popup.style.left)
      : parseFloat(this.popup.style.top)
    const anchorCrossCenter = vertical
      ? anchorRect.left + anchorRect.width / 2
      : anchorRect.top + anchorRect.height / 2
    const size = vertical ? rect.width : rect.height
    if (!Number.isFinite(size) || size <= 0) return
    // 锚点中心映射到弹层局部坐标，夹取到弹层边内（4px 边距），避免箭头探出弹层
    const local = anchorCrossCenter - popupEdge
    const clamped = Math.max(4, Math.min(local, size - 4))
    if (Math.abs(clamped - size / 2) <= 0.5) return // 与弹层中心重合 → 走 CSS 居中
    if (vertical) arrow.style.left = `${clamped - 4}px`
    else arrow.style.top = `${clamped - 4}px`
  }

  /** 高亮区交互开关：拦截层显示 = 禁止交互（target-area-clickable 放行） */
  private allowTargetInteraction(step: TourStep): boolean {
    if (step.disabledInteraction) return false
    if (typeof step.targetAreaClickable === 'boolean') return step.targetAreaClickable
    return this.getAttr('target-area-clickable', 'false') === 'true'
  }

  /** 目标滚动到视口 + scroll-padding 生效（scroll-margin 标准方案） */
  private scrollToTarget(target: HTMLElement): void {
    const optsRaw = this.getAttr('scroll-into-view-options', '')
    let opts: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
    if (optsRaw) {
      try {
        opts = { ...opts, ...JSON.parse(optsRaw) }
      } catch {
        /* 非法 JSON 回落默认 */
      }
    }
    const pad = this.getNum('scroll-padding', 0)
    if (pad > 0) target.style.scrollMargin = `${pad}px`
    target.scrollIntoView?.(opts)
  }

  private getNum(name: string, fallback: number): number {
    const raw = this.getAttr(name, '')
    if (raw === '') return fallback
    const v = Number(raw)
    return Number.isFinite(v) && v >= 0 ? v : fallback
  }

  /** persist：多页引导状态持久化（localStorage），连接时恢复 */
  private restorePersist(): void {
    if (this.persistRestored || !this.hasAttr('persist')) return
    this.persistRestored = true
    try {
      const s = JSON.parse(safeGet(this.storageKey()) ?? 'null')
      if (s && s.open === true) {
        this.setAttribute('open', '')
        if (typeof s.current === 'number') this.setAttribute('current', String(s.current))
      }
    } catch {
      /* 损坏数据忽略 */
    }
  }

  private savePersist(): void {
    if (!this.hasAttr('persist') || !this.persistRestored) return
    safeSet(
      this.storageKey(),
      JSON.stringify({ open: this.hasAttr('open'), current: this.current }),
    )
  }

  /** hints 信标：常驻脉冲点 + 点击气泡 + dismiss 记忆（与 open 无关，常驻渲染） */
  private renderHints(): void {
    if (typeof window === 'undefined') return
    const container = this.hintsEl
    const bubble = this.hintPopupEl
    if (!container || !bubble) return
    const raw = this.getAttr('hints', '[]')
    let hints: TourHint[] = []
    try {
      const parsed = JSON.parse(raw)
      hints = Array.isArray(parsed) ? parsed : []
    } catch {
      hints = []
    }
    container.innerHTML = ''
    const visible: Array<{ hint: TourHint; el: HTMLElement; rect: DOMRect }> = []
    hints.forEach((hint, i) => {
      if (!hint.selector) return
      if (hint.dismissable && hint.id && safeGet(`oas-tour-hint-${hint.id}`) === '1') return
      const target = document.querySelector<HTMLElement>(hint.selector)
      if (!target) return
      const r = target.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return
      const btn = document.createElement('button')
      btn.className = 'beacon'
      btn.setAttribute('part', 'beacon')
      btn.type = 'button'
      btn.style.left = `${r.left + r.width / 2}px`
      btn.style.top = `${r.top + r.height / 2}px`
      btn.setAttribute('aria-label', hint.title ?? this.t('tour.hint'))
      btn.addEventListener('click', () => this.openHint(i, hint, target))
      container.appendChild(btn)
      visible.push({ hint, el: btn, rect: r })
    })
    if (this.activeHint !== null) {
      const entry = visible[this.activeHint]
      if (!entry) {
        this.activeHint = null
        bubble.hidden = true
        return
      }
      bubble.hidden = false
      bubble.querySelector<HTMLElement>('.hint-title')!.textContent = entry.hint.title ?? ''
      bubble.querySelector<HTMLElement>('.hint-desc')!.textContent = entry.hint.description ?? ''
      bubble.querySelector<HTMLElement>('[part="hint-dismiss"]')!.textContent =
        this.t('tour.hintGotIt')
      const bubbleRect = bubble.getBoundingClientRect()
      const { top, left } = computePosition(
        entry.rect,
        bubbleRect,
        entry.hint.placement ?? 'top',
        { width: window.innerWidth || 800, height: window.innerHeight || 600 },
        8,
        true,
      )
      bubble.style.top = `${top}px`
      bubble.style.left = `${left}px`
    }
  }

  private openHint(index: number, hint: TourHint, target: HTMLElement): void {
    this.activeHint = index
    this.renderHints()
  }

  private dismissHint(): void {
    if (this.activeHint !== null) {
      const raw = this.getAttr('hints', '[]')
      try {
        const hints = JSON.parse(raw) as TourHint[]
        const hint = hints[this.activeHint]
        if (hint?.dismissable && hint.id) safeSet(`oas-tour-hint-${hint.id}`, '1')
      } catch {
        /* 忽略 */
      }
    }
    this.activeHint = null
    if (this.hintPopupEl) this.hintPopupEl.hidden = true
    this.renderHints()
  }

  protected override update(): void {
    if (!this.highlight || !this.popup) return
    // 键盘监听幂等重挂：首次 render 绑定的监听在断开时被 cleanup 移除，重连必须恢复
    this.bindKeydown()
    this.parseSteps()
    this.restorePersist()
    this.current = Math.min(
      Math.max(Number(this.getAttr('current', '0')) || 0, 0),
      this._steps.length - 1,
    )
    const open = this.hasAttr('open')
    if (open && this.dismissedBefore()) {
      this.removeAttribute('open')
      return
    }
    // hints 信标常驻渲染（与 open 无关）
    this.renderHints()
    this.applyScrollLock(open)
    this.syncClose()
    this.syncDontShow()
    // 箭头显隐：arrow 布尔属性默认 true（显示），arrow="false" 隐藏（元素与 ::part(arrow) 保留）
    const arrow = this.popup!.querySelector<HTMLElement>('[data-popper-arrow]')
    if (arrow) arrow.hidden = this.getAttr('arrow', 'true') === 'false'
    this.syncButtons(this._steps[this.current] ?? {})
    // open 状态迁移：true → false 派发 oas-destroy（外部移除 open 也覆盖）
    if (this.prevOpen === true && !open) {
      this.emit('destroy', { index: this.current, total: this._steps.length })
      this.hlIndex = -1
    }
    this.prevOpen = open
    // 焦点管理：打开聚焦弹层（键盘可达），关闭归还
    if (open && this.prevFocused === null) {
      this.prevFocused = document.activeElement as HTMLElement | null
      ;(this.popup as HTMLElement | null)?.focus({ preventScroll: true })
    } else if (!open && this.prevFocused) {
      this.prevFocused.focus?.()
      this.prevFocused = null
    }
    if (!open) {
      this.clearTypewriter()
      this.unbindAdvance()
      this.destroyPortal()
      this.savePersist()
      this.syncFollow(false)
      return
    }
    this.savePersist()
    const step = this._steps[this.current]
    if (!step) return
    this.popup!.querySelector<HTMLElement>('[part="title"]')!.textContent = step.title ?? ''
    this.startTypewriter(step.description ?? '')
    this.syncCounter(step)
    this.syncCover(step)
    // 弹层 type（default/primary）data 同步（CSS 类选择器钩子）
    this.popup.setAttribute('data-type', step.type ?? this.getAttr('type', 'default'))
    // 生命周期：步骤高亮（index 变化才派发，防重复 update）
    if (this.hlIndex !== this.current) {
      this.hlIndex = this.current
      this.emit('highlight-start', { index: this.current, total: this._steps.length })
    }
    // 异步步骤：目标缺失 → waitForElement 轮询等待 / skipMissingElement 跳过
    const target = this.resolveTarget(step)
    const wait = step.waitForElement ?? this.getNum('wait-for-element', 0)
    if (!target && wait > 0) {
      this.highlight.style.display = 'none'
      if (this.waitTimer) clearTimeout(this.waitTimer)
      this.waitTimer = setTimeout(() => {
        const t2 = this.resolveTarget(step)
        if (t2) {
          this.update()
          return
        }
        const skip = step.skipMissingElement ?? this.hasAttr('skip-missing-element')
        if (skip && this.current < this._steps.length - 1) {
          this.goTo(this.current + 1)
        } else {
          this.position() // fallback：仍定位（居中弹层）
        }
      }, wait)
      return
    }
    if (target) this.scrollToTarget(target)
    this.position()
    this.syncFollow(open)
    this.ensurePortal()
    this.emit('highlight-end', { index: this.current, total: this._steps.length })
  }
}
