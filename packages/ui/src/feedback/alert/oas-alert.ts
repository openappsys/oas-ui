import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type AlertType = 'info' | 'success' | 'warning' | 'error'
export type AlertVariant = 'tint' | 'filled' | 'outlined'
export type AlertSize = 'small' | 'medium' | 'large'

/** 语义变体 → 内置图标名（iconRegistry 键，与 modal 的语义图标映射一致） */
const SEMANTIC_ICONS: Record<AlertType, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
}

const ROLES = { info: 'status', success: 'status', warning: 'status', error: 'alert' } as const

const VALID_VARIANTS: readonly AlertVariant[] = ['tint', 'filled', 'outlined']
const VALID_SIZES: readonly AlertSize[] = ['small', 'medium', 'large']
const warnedVariants = new Set<string>()
const warnedSizes = new Set<string>()

/** 非法 variant 归一化：回落 tint 并在 dev 下 console.warn 一次（同值去重） */
function normalizeVariant(raw: string): AlertVariant {
  if ((VALID_VARIANTS as readonly string[]).includes(raw)) return raw as AlertVariant
  if (!warnedVariants.has(raw)) {
    warnedVariants.add(raw)
    console.warn(`[oas-alert] 非法 variant "${raw}"，已回落 tint；合法值：tint/filled/outlined`)
  }
  return 'tint'
}

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeSize(raw: string): AlertSize {
  if ((VALID_SIZES as readonly string[]).includes(raw)) return raw as AlertSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-alert] 非法 size "${raw}"，已回落 medium；合法值：small/medium/large`)
  }
  return 'medium'
}

/** prefers-reduced-motion 探测（happy-dom 等环境可能缺失 matchMedia） */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

const CLOSE_ANIM_MS = 200

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
/* 关闭态：host hidden 会被上面的作者级 display 规则覆盖，需显式补回（关闭后真正隐藏）；
   退场过渡期间（[hidden][data-closing]）保持可见播放淡出，过渡结束移除 data-closing 即落隐藏 */
:host([hidden]) {
  display: none;
}
:host([hidden][data-closing]) {
  display: block;
}
.box {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid color-mix(in srgb, var(--alert-type) 40%, transparent);
  border-radius: var(--oas-radius-md);
  background: color-mix(in srgb, var(--alert-type) 10%, transparent);
  color: var(--alert-type);
  font-size: var(--oas-font-size-md);
  /* 关闭/重开过渡：淡出 + 轻微上移收缩（退场/入场共用，prefers-reduced-motion 停用） */
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
  --alert-type: var(--oas-color-primary);
  --alert-on: var(--oas-color-text-on-primary);
  --alert-accent: var(--alert-type);
  --alert-icon-size: var(--oas-font-size-lg);
}
.box[data-type='success'] {
  --alert-type: var(--oas-color-success);
  --alert-on: var(--oas-color-text-on-success);
}
.box[data-type='warning'] {
  --alert-type: var(--oas-color-warning);
  --alert-on: var(--oas-color-text-on-warning);
}
.box[data-type='error'] {
  --alert-type: var(--oas-color-danger);
  --alert-on: var(--oas-color-text-on-danger);
}
/* P4 变体：tint（默认=现状，type 色浅底+描边）/ filled（type 色实心+对底文字）/ outlined（透明底+type 色描边） */
.box[data-variant='filled'] {
  background: var(--alert-type);
  border-color: transparent;
  color: var(--alert-on);
  --alert-accent: var(--alert-on);
}
.box[data-variant='outlined'] {
  background: transparent;
  border-color: var(--alert-type);
  color: var(--alert-type);
}
/* P5 横幅：去边框圆角、通栏；与 P1 联动默认显示图标 */
:host([banner]) .box {
  border-width: 0;
  border-radius: 0;
}
/* P12 色条：对应侧 type 色强调条（逻辑属性 start/end，RTL 安全）；后置规则在 banner 之后，等特异度按源序胜出 */
:host([border~='top']) .box {
  border-top: 3px solid var(--alert-accent);
}
:host([border~='bottom']) .box {
  border-bottom: 3px solid var(--alert-accent);
}
:host([border~='start']) .box {
  border-inline-start: 3px solid var(--alert-accent);
}
:host([border~='end']) .box {
  border-inline-end: 3px solid var(--alert-accent);
}
/* P13 尺寸档：字号/内边距缩放（title/description 继承 box 字号），图标尺寸走变量 */
:host([size='small']) .box {
  padding: var(--oas-space-2) var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  --alert-icon-size: var(--oas-font-size-md);
}
:host([size='large']) .box {
  padding: var(--oas-space-4) var(--oas-space-5);
  font-size: var(--oas-font-size-lg);
  --alert-icon-size: var(--oas-font-size-xl);
}
/* P11 大图标：在尺寸档基础上放大一档（与 P1 icon 联动） */
:host([prominent]) .box {
  --alert-icon-size: calc(var(--alert-icon-size) * 1.5);
}
/* P8 居中：文本区水平居中（banner + center 常见：图标与文本整体垂直居中） */
:host([center]) .content {
  text-align: center;
}
:host([banner][center]) .box {
  align-items: center;
}
/* P6 退场过渡：淡出 + 轻微上移收缩 + 不可交互（prefers-reduced-motion 停用） */
:host([data-closing]) .box {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .box {
    transition: none;
  }
}
.icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  font-size: var(--alert-icon-size);
  line-height: 1;
  color: var(--alert-type);
}
.icon[hidden] {
  display: none;
}
.icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.box[data-variant='filled'] .icon {
  color: var(--alert-on);
}
.content {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 600;
  line-height: 1.5;
}
.title[data-present] {
  margin-bottom: var(--oas-space-1);
}
.description {
  font-size: var(--oas-font-size-sm);
  line-height: 1.6;
  opacity: 0.85;
}
.description[data-present] {
  margin-top: var(--oas-space-1);
}
.description[hidden] {
  display: none;
}
.box[data-variant='filled'] .description {
  opacity: 0.95;
}
.content[data-rich] .body {
  margin-top: var(--oas-space-1);
}
.body {
  line-height: 1.6;
  min-width: 0;
}
/* P10 折叠：-webkit-line-clamp 截断，clamped 由 update() 增量同步 */
.body.clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.toggle {
  display: block;
  margin-top: var(--oas-space-1);
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: inherit;
  color: var(--alert-type);
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
}
.toggle:hover {
  opacity: 0.75;
}
.toggle:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.toggle[hidden] {
  display: none;
}
.box[data-variant='filled'] .toggle {
  color: var(--alert-on);
}
.close-btn {
  flex-shrink: 0;
  align-self: flex-start;
  cursor: pointer;
  border: none;
  background: none;
  padding: var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  line-height: 1;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
}
.close-btn:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.close-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.box[data-variant='filled'] .close-btn {
  color: var(--alert-on);
}
.box[data-variant='filled'] .close-btn:hover {
  background: color-mix(in srgb, var(--alert-on) 15%, transparent);
}
`

export class OASAlert extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'title',
      'closeable',
      'icon',
      'description',
      'variant',
      'banner',
      'center',
      'open',
      'close-text',
      'max-line',
      'prominent',
      'border',
      'size',
    ]
  }

  /** 受控显隐状态：默认开（open 属性缺席=默认 true；close 后组件自置 false 并派发 oas-open-change） */
  private opened = true
  /** 退场过渡进行中（防重复关闭） */
  private closing = false
  /** 退场计时器（断开连接时清理，防孤儿定时器） */
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  /** 上一帧 open 属性在场信号：区分「宿主显式移除 open（受控关闭）」与「默认缺席」 */
  private prevOpenSignal = false
  /** max-line 折叠展开态（toggle 切换） */
  private expanded = false

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null

  /** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="box" part="box">
        <span class="icon" part="icon" aria-hidden="true"><slot name="icon"><span class="icon-default"></span></slot></span>
        <div class="content" part="content">
          <div class="title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
          <div class="description" part="description" hidden><slot name="description"><span class="description-text"></span></slot></div>
          <div class="body" part="body"><slot></slot></div>
          <button class="toggle" part="toggle" type="button" hidden></button>
        </div>
        <div class="actions" part="actions"><slot name="action"></slot></div>
        ${this.hasAttr('closeable') ? '<button class="close-btn" part="close" type="button" aria-label=""><slot name="close"><span class="close-text">✕</span></slot></button>' : ''}
      </div>
    `
  }

  /** 绑定交互事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => this.close())
    this.shadow
      .querySelector<HTMLButtonElement>('[part="toggle"]')
      ?.addEventListener('click', () => {
        this.expanded = !this.expanded
        this.update()
      })
    // title/description/icon 插槽内容增减（slot 覆盖属性文案）时重刷双通道
    for (const name of ['title', 'description', 'icon']) {
      this.shadow
        .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }
    // 断开连接时清理退场定时器（防孤儿定时器/悬空事件）
    this.onCleanup(() => {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer)
        this.closeTimer = null
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（box 容器存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="box"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  /** 关闭流程：派发 oas-close → 同步落 hidden（既有契约：点击后立即标记关闭态）→
   *  退场过渡（[hidden][data-closing] 保持可见播放淡出）→ 过渡结束落最终态。
   *  prefers-reduced-motion 跳过过渡直接落最终态 */
  private close(): void {
    if (!this.opened || this.closing) return
    this.closing = true
    this.emit('close')
    this.hidden = true
    this.setAttribute('data-closing', '')
    if (prefersReducedMotion()) {
      this.finalizeClose()
      return
    }
    this.closeTimer = setTimeout(() => this.finalizeClose(), CLOSE_ANIM_MS)
  }

  /** 退场最终态：移除过渡类（[hidden] 单独生效落 display:none）→ 置 open=false →
   *  派发 oas-open-change / oas-after-close。退场期间被宿主重开时，update() 已清掉
   *  本计时器并恢复 opened/hidden，不会走到这里（本方法只由未被打断的计时器触发） */
  private finalizeClose(): void {
    this.closing = false
    this.removeAttribute('data-closing')
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.opened = false
    this.hidden = true
    this.removeAttribute('open')
    this.emit('open-change', { open: false })
    this.emit('after-close')
  }

  protected override update(): void {
    const box = this.shadow.querySelector('[part="box"]')
    if (!box) return
    // type/role/变体/尺寸/色条/居中增量同步（SSR 快照与运行时变更共用同一通道）
    const type = this.getAttr('type', 'info') || 'info'
    box.setAttribute('data-type', type)
    box.setAttribute('role', ROLES[type as keyof typeof ROLES] ?? 'status')
    box.setAttribute('data-variant', normalizeVariant(this.getAttr('variant', 'tint')))
    box.setAttribute('data-size', normalizeSize(this.getAttr('size', 'medium')))
    box.setAttribute('data-accent', this.getAttr('border', ''))
    box.toggleAttribute('data-center', this.hasAttr('center'))
    box.toggleAttribute('data-prominent', this.hasAttr('prominent'))
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // title 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染 titleCache 文本
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('.title-text')
    let titleHas = false
    if (titleSlot && titleFallback) {
      titleHas = this.hasSlotContent(titleSlot)
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = titleHas
    }
    this.shadow
      .querySelector<HTMLElement>('[part="title"]')
      ?.toggleAttribute('data-present', titleHas || this.titleCache !== null)

    // description 双通道：slot 有内容优先，否则属性文本；双空隐藏整块（empty 边界）
    const descSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="description"]')
    const descFallback = this.shadow.querySelector<HTMLElement>('.description-text')
    const descAttr = this.getAttr('description', '')
    const descHas = descSlot ? this.hasSlotContent(descSlot) : false
    const descEl = this.shadow.querySelector<HTMLElement>('[part="description"]')
    if (descEl && descFallback) {
      descFallback.textContent = descAttr
      descFallback.hidden = descHas
      descEl.hidden = !(descHas || descAttr !== '')
      descEl.toggleAttribute('data-present', descHas || descAttr !== '')
    }
    // 区段间距：标题/描述在场时下方内容补间距（CSS 数据驱动）
    this.shadow
      .querySelector<HTMLElement>('.content')
      ?.toggleAttribute('data-rich', titleHas || this.titleCache !== null || descHas || descAttr !== '')

    // P1 图标：slot=icon 有内容优先（覆盖默认）；否则 icon/banner 属性显示默认 type 图标
    const iconEl = this.shadow.querySelector<HTMLElement>('[part="icon"]')
    if (iconEl) {
      const iconSlot = iconEl.querySelector<HTMLSlotElement>('slot[name="icon"]')
      const iconFallback = iconEl.querySelector<HTMLElement>('.icon-default')
      const hasCustom = iconSlot ? this.hasSlotContent(iconSlot) : false
      iconEl.hidden = !(hasCustom || this.hasAttr('icon') || this.hasAttr('banner'))
      if (iconFallback) {
        iconFallback.hidden = hasCustom
        const iconName = SEMANTIC_ICONS[type as AlertType] ?? 'info'
        iconFallback.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${iconRegistry[iconName]}</svg>`
      }
    }

    // P7 关闭自定义：close-text 属性替换 ✕ 文案（并作 aria-label）；slot=close 富自定义由插槽机制接管
    const closeBtn = this.shadow.querySelector<HTMLElement>('[part="close"]')
    if (closeBtn) {
      const closeText = this.getAttr('close-text', '')
      closeBtn.querySelector<HTMLElement>('.close-text')!.textContent = closeText || '✕'
      closeBtn.setAttribute('aria-label', closeText || this.t('alert.close'))
    }

    // P10 折叠：max-line 数字属性 → line-clamp 截断；展开/收起按钮切换（按钮文案复用
    // oas-ellipsis 的 expand/collapse locale key，不新增键）
    const toggle = this.shadow.querySelector<HTMLButtonElement>('[part="toggle"]')
    const body = this.shadow.querySelector<HTMLElement>('.body')
    if (toggle && body) {
      const maxLine = Number(this.getAttr('max-line', '0'))
      const valid = Number.isFinite(maxLine) && maxLine >= 1
      const clamped = valid && !this.expanded
      body.classList.toggle('clamped', clamped)
      if (clamped) body.style.setProperty('-webkit-line-clamp', String(Math.round(maxLine)))
      else body.style.removeProperty('-webkit-line-clamp')
      toggle.hidden = !valid
      const label = this.expanded ? this.t('ellipsis.collapse') : this.t('ellipsis.expand')
      toggle.textContent = label
      toggle.setAttribute('aria-label', label)
    }

    // P9 受控显隐：宿主显式设置 open → 重开（取消退场、恢复可见、派发 open-change）；
    // 宿主显式移除 open（上一帧在场）→ 播放退场（受控关闭）。组件自身关闭路径置
    // opened=false 后再移除 open，此分支不重复触发。
    const openSignal = this.hasAttr('open')
    if (openSignal) {
      // 宿主重开：清掉退场计时器（未被打断的计时器才允许落关闭态）、恢复可见。
      // closing 中重开 = 打断退场（opened 尚为 true，需还原 hidden）；已关闭重开 = 正常恢复
      if (this.closeTimer) {
        clearTimeout(this.closeTimer)
        this.closeTimer = null
      }
      const wasClosing = this.closing
      this.closing = false
      this.removeAttribute('data-closing')
      if (!this.opened || wasClosing) {
        this.opened = true
        this.hidden = false
        this.emit('open-change', { open: true })
      }
    } else if (this.opened && this.prevOpenSignal && !this.closing) {
      this.close()
    }
    this.prevOpenSignal = openSignal
  }
}
