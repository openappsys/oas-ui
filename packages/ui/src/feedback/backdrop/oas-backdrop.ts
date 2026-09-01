import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: none;
}
:host([open]) {
  display: block;
}
/* 退场过渡期间保持可见（open 已移除但需播完淡出），退场中不可交互 */
:host([data-closing]) {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040));
  /* P4 淡入淡出：只过渡 opacity（性能纪律：动画只用 transform/opacity），reduced-motion 停用 */
  opacity: 0;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out);
}
:host([data-shown]) .mask {
  opacity: 1;
}
:host([data-closing]) .mask {
  opacity: 0;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .mask {
    transition: none;
  }
}
/* 底色层（scrim）：P2 颜色/浓度 + P3 模糊都落在这里，与内容层隔离——
   浓度 opacity 不压暗内容（内容层在 scrim 之上不受其透明度影响） */
.scrim {
  position: absolute;
  inset: 0;
  background: var(--oas-backdrop-bg, var(--oas-color-overlay));
  opacity: var(--oas-backdrop-opacity, 1);
  backdrop-filter: var(--oas-backdrop-blur, none);
  -webkit-backdrop-filter: var(--oas-backdrop-blur, none);
  /* 点击穿透：命中测试直接落到 .mask，P5 的「点遮罩」判定（target === mask）才成立 */
  pointer-events: none;
}
/* transparent 双规则：mask（点击容器）与 scrim（暗色层）都透明；
   mask 规则同时是 SSR 快照的稳定选择器（遮罩层自身无底色时天然透明） */
:host([transparent]) .mask {
  background: transparent;
}
:host([transparent]) .scrim {
  background: transparent;
}
/* 内容层：P1 默认 slot 承载（全屏 loading / 提示文案 / 引导内容），居中展示 */
.content {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
/* P7 persistent 点击反馈：shake（只走 transform），提示不可关闭 */
.content.oas-shake {
  animation: oas-backdrop-shake 300ms var(--oas-ease-in-out);
}
@keyframes oas-backdrop-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .content.oas-shake {
    animation: none;
  }
}
/* P8 读屏关闭通道：aria-button 语义的真实按钮（原生键盘可达），默认 sr-only 隐藏，
   键盘 Tab 聚焦时显示（skip-link 模式：键鼠/读屏用户都可见可操作） */
.sr-close {
  position: absolute;
  top: var(--oas-space-3);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  padding: var(--oas-space-1_5) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
}
.sr-close:focus {
  clip: auto;
  clip-path: none;
  width: auto;
  height: auto;
  overflow: visible;
  white-space: normal;
  box-shadow: var(--oas-focus-ring);
}
`

/** 进入动画起点延迟（一帧：先落 opacity 0，再切 data-shown 触发过渡） */
const ENTER_FRAME_MS = 20
/** 淡入/淡出动画窗口（与 --oas-transition-base=180ms 对齐） */
const BACKDROP_ANIM_MS = 180
/** shake 动画总时长（CSS 300ms + 余量，用于移除 class 保证可重播） */
const SHAKE_MS = 360
/** blur 布尔（空值）时的默认滤镜值（兼容既有用法） */
const DEFAULT_BLUR = 'blur(4px)'
/** opacity 档位（对齐 Material 3 遮罩惯例与浓淡三档） */
const OPACITY_LEVELS: Record<string, string> = {
  thin: '0.35',
  default: '0.55',
  thick: '0.75',
}
/** color 属性预设名（协议 §4.1：映射 --oas-preset-<name>，dark 自动适配） */
const COLOR_PRESETS = [
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
]

/** prefers-reduced-motion 探测（happy-dom 等环境可能缺失 matchMedia） */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * body scroll 锁定：不移除滚动条（overflow:hidden 会移除滚动条→视口变宽→页面/固定元素位移），
 * 改为拦截滚动行为（wheel / touchmove / 滚动方向键），滚动条保持可见 → 视口宽度不变 → 零位移。
 * 计数器保证多个遮罩同时打开时，只有最后一个关闭才解除拦截。
 */
let scrollLockCount = 0

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

function preventScroll(e: Event): void {
  e.preventDefault()
}

function preventScrollKeydown(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null
  // 输入类控件内不拦截（保留正常输入），仅拦截会滚动页面的按键
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  )
    return
  if (SCROLL_KEYS.has(e.key)) e.preventDefault()
}

function lockScroll(): void {
  if (scrollLockCount === 0) {
    window.addEventListener('wheel', preventScroll, { passive: false })
    window.addEventListener('touchmove', preventScroll, { passive: false })
    window.addEventListener('keydown', preventScrollKeydown, { passive: false })
  }
  scrollLockCount++
}

function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    window.removeEventListener('wheel', preventScroll)
    window.removeEventListener('touchmove', preventScroll)
    window.removeEventListener('keydown', preventScrollKeydown)
  }
}

export class OASBackdrop extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'transparent',
      'blur',
      'lock-scroll',
      'color',
      'opacity',
      'persistent',
      'stop-propagation',
      'close-label',
    ]
  }

  private locked = false
  /** 上一帧 open 属性在场信号：区分「首次打开/重开」与「持续打开」，并驱动退场分支 */
  private wasOpen = false
  /** 退场过渡进行中（防重复触发 close） */
  private closing = false
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private afterShowTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private shakeTimer: ReturnType<typeof setTimeout> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask">
        <div class="scrim" part="scrim"></div>
        <div class="content" part="content"><slot></slot></div>
        <button class="sr-close" part="sr-close" type="button"></button>
      </div>
    `
  }

  /** 绑定交互事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector<HTMLElement>('.mask')?.addEventListener('click', (e) => {
      this.onMaskClick(e as MouseEvent)
    })
    this.shadow
      .querySelector<HTMLElement>('.sr-close')
      ?.addEventListener('click', (e) => this.handleBackdropActivate(e as MouseEvent))
    // 断开连接时清理动画计时器（防孤儿定时器/悬空事件）
    this.onCleanup(() => {
      if (this.showTimer) {
        clearTimeout(this.showTimer)
        this.showTimer = null
      }
      if (this.afterShowTimer) {
        clearTimeout(this.afterShowTimer)
        this.afterShowTimer = null
      }
      if (this.hideTimer) {
        clearTimeout(this.hideTimer)
        this.hideTimer = null
      }
      if (this.shakeTimer) {
        clearTimeout(this.shakeTimer)
        this.shakeTimer = null
      }
    })
  }

  /** P5 点击判定：仅点击遮罩本体（target === mask）算「点遮罩」；内容区/关闭按钮点击不触发 */
  private onMaskClick(e: MouseEvent): void {
    if (e.target !== e.currentTarget) return
    this.handleBackdropActivate(e)
  }

  /** 遮罩激活（点遮罩本体 / 读屏关闭按钮）：stopPropagation 控制 + persistent 拦截 + oas-click 派发 */
  private handleBackdropActivate(originalEvent: MouseEvent): void {
    // P5 stop-propagation：默认阻断点击穿透到宿主文档（遮罩本职即拦截背后交互）
    if (this.getAttr('stop-propagation', 'true') !== 'false') originalEvent.stopPropagation()
    // P6 persistent：拦截 oas-click 事件派发（宿主事件驱动关闭失效），改为 P7 shake 反馈
    if (this.hasAttr('persistent')) {
      this.shake()
      return
    }
    this.emit('click', { originalEvent })
  }

  /** P7 persistent 点击反馈：内容 shake（只走 transform）；prefers-reduced-motion 停用 */
  private shake(): void {
    if (prefersReducedMotion()) return
    const content = this.shadow.querySelector<HTMLElement>('.content')
    if (!content) return
    content.classList.remove('oas-shake')
    // 强制重排重启动画（happy-dom 无布局返回 0，无害；浏览器真实生效）
    void content.offsetWidth
    content.classList.add('oas-shake')
    if (this.shakeTimer) clearTimeout(this.shakeTimer)
    this.shakeTimer = setTimeout(() => content.classList.remove('oas-shake'), SHAKE_MS)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（mask 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.mask')) return false
    this.bind()
    return true
  }

  /** P4 进入动画：先落 opacity 0（无 data-shown），下一帧加 data-shown 触发淡入过渡；
   *  prefers-reduced-motion 直接落可见态并立即派发 after-show */
  private playEnter(): void {
    this.closing = false
    this.removeAttribute('data-closing')
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.removeAttribute('data-shown')
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.afterShowTimer) {
      clearTimeout(this.afterShowTimer)
      this.afterShowTimer = null
    }
    if (prefersReducedMotion()) {
      this.setAttribute('data-shown', '')
      this.emit('after-show')
      return
    }
    this.showTimer = setTimeout(() => {
      if (this.closing || !this.hasAttr('open')) return
      this.setAttribute('data-shown', '')
      this.afterShowTimer = setTimeout(() => {
        if (!this.closing && this.hasAttr('open')) this.emit('after-show')
      }, BACKDROP_ANIM_MS)
    }, ENTER_FRAME_MS)
  }

  /** P4 退场动画：移除 data-shown 触发淡出（data-closing 保持 display），动画结束落最终态 */
  private playClose(): void {
    if (this.closing) return
    this.closing = true
    this.removeAttribute('data-shown')
    this.setAttribute('data-closing', '')
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.afterShowTimer) {
      clearTimeout(this.afterShowTimer)
      this.afterShowTimer = null
    }
    if (prefersReducedMotion()) {
      this.finalizeClose()
      return
    }
    this.hideTimer = setTimeout(() => this.finalizeClose(), BACKDROP_ANIM_MS)
  }

  /** 退场最终态：解除滚动锁、卸载节点（无孤儿 DOM）、派发 oas-after-close */
  private finalizeClose(): void {
    this.closing = false
    this.removeAttribute('data-closing')
    this.removeAttribute('data-shown')
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    if (this.locked) {
      unlockScroll()
      this.locked = false
    }
    this.emit('after-close')
    this.remove()
  }

  /** P2 color 解析：任意 CSS 色值直通；11 预设名映射 preset token（协议 §4.1）；空回落 CSS 变量 */
  private resolveColor(): string {
    const raw = this.getAttr('color')
    if (!raw) return ''
    return COLOR_PRESETS.includes(raw) ? `var(--oas-preset-${raw})` : raw
  }

  /** P2 opacity 解析：thin/default/thick 档位或 0-1 数字；非法回落 CSS 变量 */
  private resolveOpacity(): string {
    const raw = this.getAttr('opacity')
    if (!raw) return ''
    const level = OPACITY_LEVELS[raw]
    if (level) return level
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0 && n <= 1) return String(n)
    return ''
  }

  /** P3 blur 全值化：布尔（空值）回落默认 blur(4px)；字符串即任意 CSS backdrop-filter 全值 */
  private resolveBlur(): string {
    if (!this.hasAttr('blur')) return ''
    return this.getAttr('blur') || DEFAULT_BLUR
  }

  protected override update(): void {
    const mask = this.shadow.querySelector<HTMLElement>('.mask')
    const scrim = this.shadow.querySelector<HTMLElement>('.scrim')
    if (!mask || !scrim) return

    // P2/P3：样式增量同步（'' = 回落 CSS 变量通道）
    scrim.style.background = this.resolveColor()
    scrim.style.opacity = this.resolveOpacity()
    const blur = this.resolveBlur()
    scrim.style.backdropFilter = blur
    // Safari 前缀（TS DOM lib 无该 vendor 属性，cast 声明）
    ;(scrim.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter =
      blur

    // P8：读屏关闭通道文案（close-label 属性 > locale 兜底）
    this.shadow
      .querySelector<HTMLElement>('.sr-close')
      ?.setAttribute('aria-label', this.getAttr('close-label') || this.t('modal.close'))

    const open = this.hasAttr('open')
    if (open) {
      // 进入 / 退场期间重开：取消退场、播放淡入
      if (this.closing || !this.wasOpen) this.playEnter()
      if (!this.locked && this.getAttr('lock-scroll', 'true') !== 'false') {
        lockScroll()
        this.locked = true
      }
    } else {
      if (this.closing) {
        // 已在退场中（防重复触发，动画结束统一卸载）
      } else if (this.wasOpen) {
        this.playClose()
      } else {
        // 从未打开（连接即 !open / SSR 默认关闭态）：直接卸载，无孤儿 DOM
        this.remove()
      }
    }
    this.wasOpen = open
  }

  override disconnectedCallback(): void {
    if (this.locked) {
      unlockScroll()
      this.locked = false
    }
    super.disconnectedCallback()
  }
}
