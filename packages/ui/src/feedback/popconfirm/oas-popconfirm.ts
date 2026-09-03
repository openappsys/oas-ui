import { OASElement } from '@oas-ui/core'
import { iconRegistry } from '@oas-ui/icons'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

/** 面板与触发元素的默认间距（offset 主轴缺省值，与 computePosition 的 GAP 一致） */
const GAP = 8
/** 箭头尺寸（12px 菱形）与箭头中心到面板圆角边的最短距离 */
const ARROW_SIZE = 12
const ARROW_PAD = 8
/** hover 触发开/合防抖延时缺省值（ms）：无延时 hover 会闪开闪关 */
const HOVER_DELAY = 150
const HOVER_HIDE_DELAY = 100
/** 视口边缘夹取默认边距（px，引擎 collisionPadding） */
const COLLISION_PAD = 4
/** 面板最小宽度（内容短时不塌缩） */
const MIN_WIDTH = 200

/** 主题三态：default 中性 / warning 警示 / danger 危险（图标 + ok 按钮色阶联动） */
type Theme = 'default' | 'warning' | 'danger'

/** open/close 变化的来源（oas-open-change detail.reason） */
export type OpenChangeReason = 'ok' | 'cancel' | 'esc' | 'outside' | 'trigger' | 'api'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
/* hidden 语义防御：UA 的 [hidden] display:none 是 UA 样式，:host 的 display:inline-block 会压过它 */
:host([hidden]) {
  display: none;
}
/* 整体禁用：视觉降饱和 + 交互由 JS 全部拦截（trigger 全路径 gate） */
:host([disabled]) {
  opacity: 0.6;
  cursor: not-allowed;
}
.popover {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  /* 面板与箭头共用 --pop-bg / --pop-border（语义主题只覆写这两个变量，箭头描边自动跟随） */
  --pop-bg: var(--oas-color-bg);
  --pop-border: var(--oas-color-border);
  background: var(--pop-bg);
  border: 1px solid var(--pop-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  padding: var(--oas-space-3);
  min-width: ${MIN_WIDTH}px;
  max-width: 360px;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  outline: none;
  pointer-events: auto;
}
.popover[aria-hidden='true'] {
  display: none;
}
/* 语义主题：语义色 tint 底 + 语义色描边（token 派生 color-mix，dark 自动跟随）；
   箭头底色/描边走同一组 --pop-* 变量 */
.popover[data-theme='warning'] {
  --pop-bg: color-mix(in srgb, var(--oas-color-warning) 10%, var(--oas-color-bg));
  --pop-border: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
}
.popover[data-theme='danger'] {
  --pop-bg: color-mix(in srgb, var(--oas-color-danger) 10%, var(--oas-color-bg));
  --pop-border: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
}
/* 入场动画：fade + scale，动画放内层 .inner、面板自身不参与 transform，
   保证定位计算读到的面板矩形不受缩放影响；transform-origin 由 JS 按 placement 写入 */
.inner {
  transform-origin: var(--oas-origin-x, center) var(--oas-origin-y, center);
  animation: oas-pc-in 150ms var(--oas-ease-out);
}
@keyframes oas-pc-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .inner {
    animation: none;
  }
}
.body {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
}
.icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1.25em;
  margin-top: 0.125em;
  /* 图标语义色：default/warning 走警示色（确认气泡图标惯例），danger 走危险色 */
  color: var(--oas-color-warning);
  font-size: var(--oas-font-size-lg);
  line-height: 1;
}
.popover[data-theme='danger'] .icon {
  color: var(--oas-color-danger);
}
.icon[hidden] {
  display: none;
}
.icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.text {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 500;
  line-height: 1.5;
  color: var(--oas-color-text-primary);
}
.description {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  color: var(--oas-color-text-secondary);
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--oas-space-3);
}
.builtin-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  flex: 1;
}
.builtin-actions[hidden] {
  display: none;
}
.btn {
  min-width: 56px;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
  position: relative;
}
.btn:hover:not([disabled]) {
  border-color: var(--oas-color-border-strong);
  background: var(--oas-color-bg-hover);
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.btn[hidden] {
  display: none;
}
.btn[part='ok'] {
  border-color: var(--oas-color-primary);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.btn[part='ok']:hover:not([disabled]) {
  border-color: var(--oas-color-primary-hover);
  background: var(--oas-color-primary-hover);
}
/* theme 色阶联动：warning/danger 时确定按钮转对应语义色（token 含 dark 变体） */
.btn[part='ok'][data-tone='warning'] {
  border-color: var(--oas-color-warning);
  background: var(--oas-color-warning);
  color: var(--oas-color-text-on-warning);
}
.btn[part='ok'][data-tone='warning']:hover:not([disabled]) {
  border-color: color-mix(in srgb, var(--oas-color-warning) 85%, black);
  background: color-mix(in srgb, var(--oas-color-warning) 85%, black);
}
.btn[part='ok'][data-tone='danger'] {
  border-color: var(--oas-color-danger);
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
}
.btn[part='ok'][data-tone='danger']:hover:not([disabled]) {
  border-color: color-mix(in srgb, var(--oas-color-danger) 85%, black);
  background: color-mix(in srgb, var(--oas-color-danger) 85%, black);
}
/* ok-loading：spinner 居中不撑宽，原文字 visibility 隐藏保留占位（前后宽度不变） */
.btn[part='ok'][data-loading] {
  cursor: default;
}
.ok-label {
  display: inline;
}
.btn[part='ok'][data-loading] .ok-label {
  visibility: hidden;
}
.spinner {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.875em;
  height: 0.875em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: oas-pc-spin 0.8s linear infinite;
}
.btn[part='ok'][data-loading] .spinner {
  display: block;
}
@keyframes oas-pc-spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
/* 箭头：12px 菱形旋转 45°，底色/描边与面板共用 --pop-bg / --pop-border，
   按 data-placement 基向（^= 前缀匹配含 -start/-end）落在面板对应边，尖端指向触发元素。
   十字轴默认居中（--arrow-x/y 兜底），JS 按锚点位置写内联偏移，面板被视口避让
   平移后箭头仍指向触发元素。 */
.arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  background: var(--pop-bg);
  transform: rotate(45deg);
  pointer-events: none;
}
.arrow[hidden] {
  display: none;
}
.popover[data-placement^='bottom'] .arrow {
  top: -6px;
  left: var(--arrow-x, calc(50% - 6px));
  border-top: 1px solid var(--pop-border);
  border-left: 1px solid var(--pop-border);
}
.popover[data-placement^='top'] .arrow {
  bottom: -6px;
  left: var(--arrow-x, calc(50% - 6px));
  border-right: 1px solid var(--pop-border);
  border-bottom: 1px solid var(--pop-border);
}
.popover[data-placement^='left'] .arrow {
  right: -6px;
  top: var(--arrow-y, calc(50% - 6px));
  border-top: 1px solid var(--pop-border);
  border-right: 1px solid var(--pop-border);
}
.popover[data-placement^='right'] .arrow {
  left: -6px;
  top: var(--arrow-y, calc(50% - 6px));
  border-left: 1px solid var(--pop-border);
  border-bottom: 1px solid var(--pop-border);
}
`

/** 实例计数：面板 / 标题区的全局唯一 id（aria-controls / aria-labelledby 关联） */
let uid = 0

// 模块级 Esc 栈：所有打开中的 popconfirm 按打开先后排序（后开者在上），
// 共享一个 document keydown 处理器——一次 Esc 只关闭最顶层（嵌套时即最内层）。
// 栈空时自动移除监听，无孤儿。
const openLayers: OASPopconfirm[] = []

function registerLayer(p: OASPopconfirm): void {
  if (openLayers.includes(p)) return
  openLayers.push(p)
  if (openLayers.length === 1) document.addEventListener('keydown', onDocumentKey)
}

function unregisterLayer(p: OASPopconfirm): void {
  const i = openLayers.indexOf(p)
  if (i === -1) return
  openLayers.splice(i, 1)
  if (openLayers.length === 0) document.removeEventListener('keydown', onDocumentKey)
}

function onDocumentKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  const top = openLayers[openLayers.length - 1]
  if (!top) return
  top.requestClose('esc')
}

/** slot 是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案 / 隐藏内置区的判空依据 */
function hasSlotContent(slot: HTMLSlotElement | null): boolean {
  if (!slot) return false
  return slot
    .assignedNodes()
    .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
}

export class OASPopconfirm extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'title',
      'description',
      'placement',
      'position',
      'ok-text',
      'cancel-text',
      'ok-loading',
      'theme',
      'hide-icon',
      'disabled',
      'show-cancel',
      // —— 引擎能力（随定位底座带出）——
      'trigger',
      'auto-adjust-overflow',
      'arrow',
      'width',
      'virtual',
      'virtual-x',
      'virtual-y',
      'virtual-anchor',
    ]
  }

  private popoverEl: HTMLElement | null = null
  private anchor: Element | null = null
  /** 上一次 update() 的 open 状态，用于区分「打开瞬间」与「已打开后的属性微调」 */
  private wasOpen = false
  /** 上次 open 状态（null = 未初始化，首帧不派发事件） */
  private prevOpen: boolean | null = null
  /** 待消费的 open 变化来源（内部路径先记录，update 派发 open-change 时消费清空） */
  private pendingReason: OpenChangeReason | null = null
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题） */
  private titleCache: string | null = null
  /** description 文本缓存（非原生属性，无吸收需求；水合恢复用） */
  private descriptionCache: string | null = null
  /** hover 触发开/合防抖计时器 */
  private openTimer: ReturnType<typeof setTimeout> | null = null
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  /** 回焦豁免标志：restoreFocus 的程序性回焦触发的 focusin 不触发 focus 开层 */
  private refocusing = false
  /** 滚动/尺寸变化重定位监听是否已挂 */
  private scrollFollow = false
  private scrollRaf = 0
  /** 面板/标题区 id（aria 关联） */
  private readonly panelId = `oas-popconfirm-pop-${++uid}`
  private readonly titleId = `oas-popconfirm-title-${uid}`

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="popover" part="popover" id="${this.panelId}" role="alertdialog" aria-hidden="true">
        <div class="inner" part="inner">
          <div class="body" part="body">
            <span class="icon" part="icon">
              <slot name="icon"><svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false"></svg></slot>
            </span>
            <div class="text">
              <div class="title" part="title" id="${this.titleId}"><slot name="title"><span class="title-text"></span></slot></div>
              <div class="description" part="description"><slot name="description"><span class="description-text"></span></slot></div>
            </div>
          </div>
          <div class="actions" part="actions">
            <slot name="actions"></slot>
            <div class="builtin-actions">
              <button class="btn" part="cancel" type="button"></button>
              <button class="btn" part="ok" type="button"><span class="spinner" aria-hidden="true"></span><span class="ok-label"></span></button>
            </div>
          </div>
        </div>
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定 trigger / ok / cancel / 插槽变更监听（render 与水合路径共用） */
  private bind(): void {
    this.popoverEl = this.shadow.querySelector('.popover')
    this.anchor = this.querySelector(':scope > *') ?? this

    // —— trigger 触发方式（空格分隔多选；运行时改 trigger 走同一监听，处理内按当前属性 gate）——
    this.anchor.addEventListener('click', (e: Event) => {
      if (this.isVirtual() || this.isDisabled()) return
      if (!this.hasTrigger('click')) return
      // 合成 click（element.click()/键盘激活）composed=false，跨 shadow boundary 时
      // e.target 被 retarget 成 host 自身——用 composedPath()[0] 判定是否来自触发元素侧
      const origin = e.composedPath()[0] as Node | undefined
      if (origin && this.shadow.contains(origin)) return
      this.toggle('trigger')
    })
    this.anchor.addEventListener('contextmenu', (e: Event) => {
      if (this.isVirtual() || this.isDisabled()) return
      if (!this.hasTrigger('contextmenu')) return
      e.preventDefault()
      this.requestOpen()
    })
    // hover 触发：悬停区域 = 宿主 + 面板（跨间隙移动不闪关）
    this.addEventListener('mouseenter', this.onHoverEnter)
    this.addEventListener('mouseleave', this.onHoverLeave)
    this.popoverEl?.addEventListener('mouseenter', this.onPanelEnter)
    this.popoverEl?.addEventListener('mouseleave', this.onPanelLeave)
    // focus 触发：聚焦开、失焦（焦点移出宿主/面板）关
    this.addEventListener('focusin', this.onFocusIn)
    this.addEventListener('focusout', this.onFocusOut)

    // —— 确认 / 取消 ——
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', (e: Event) => {
      // 异步确认：loading 态点击被拦截（不派发、不关闭），防重复提交
      if (this.hasAttr('ok-loading')) return
      this.emit('ok', { source: this, event: e })
      // emit 同步派发——宿主在监听器里同步置 ok-loading 即可阻止本次自动关闭
      // （保持「oas-ok 派发即关」默认语义不变，ok-loading 是唯一的受控闸门）
      if (!this.hasAttr('ok-loading')) this.requestClose('ok')
    })
    this.shadow.querySelector('[part="cancel"]')?.addEventListener('click', (e: Event) => {
      this.emit('cancel', { source: this, event: e })
      this.requestClose('cancel')
    })

    // 双通道插槽内容增减（slot 覆盖属性文案 / actions 覆盖内置按钮区）时重刷
    for (const name of ['title', 'description', 'icon', 'actions']) {
      this.popoverEl
        ?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.addEventListener('slotchange', () => this.update())
    }

    // 清理：Esc 栈 / 外点监听 / 计时器 / 滚动跟随（断开连接无孤儿）
    this.onCleanup(() => unregisterLayer(this))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside, true))
    this.onCleanup(() => {
      if (this.openTimer) clearTimeout(this.openTimer)
      if (this.closeTimer) clearTimeout(this.closeTimer)
    })
    this.onCleanup(() => {
      window.removeEventListener('scroll', this.onScroll, { capture: true })
      window.removeEventListener('resize', this.onScroll)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（面板骨架存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉。快照面板 id 来自源实例，重写为本实例 id
   *  （多实例 aria-controls 不撞车）。 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.popover')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    const snapDesc = this.shadow.querySelector('[part="description"]')?.textContent ?? ''
    if (snapDesc !== '') this.descriptionCache = snapDesc
    this.bind()
    this.popoverEl?.setAttribute('id', this.panelId)
    this.shadow.querySelector('[part="title"]')?.setAttribute('id', this.titleId)
    return true
  }

  // —— 公开 API ——

  /** 打开气泡（等价 open 属性；oas-open-change reason='api'） */
  show(): void {
    this.requestOpen('api')
  }

  /** 关闭气泡（等价移除 open；oas-open-change reason='api'） */
  hide(): void {
    this.requestClose('api')
  }

  /** 关闭后焦点还原到触发元素（恒定行为；virtual 模式无锚点跳过）。
   *  回焦豁免：回焦产生的 focusin 不作为 focus 触发开层（否则 focus 触发模式下
   *  关闭 → 回焦 trigger → focusin → 立即重开，气泡永远关不掉）。豁免窗口一次即消费。 */
  restoreFocus(): void {
    if (this.isVirtual()) return
    this.refocusing = true
    ;(this.anchor as HTMLElement | null)?.focus()
    // anchor 不可聚焦（如 div）时 focus() 不产生 focusin，立即收回豁免避免误吞后续真实聚焦
    queueMicrotask(() => (this.refocusing = false))
  }

  // —— 触发方式（trigger）——

  /** trigger 触发方式列表：'click'/'hover'/'focus'/'contextmenu'/'manual' 空格分隔多选，默认 click */
  private triggerList(): string[] {
    return this.getAttr('trigger', 'click').split(/\s+/).filter(Boolean)
  }

  private hasTrigger(t: 'click' | 'hover' | 'focus' | 'contextmenu'): boolean {
    return this.triggerList().includes(t)
  }

  private isVirtual(): boolean {
    return this.hasAttr('virtual')
  }

  /** 禁用判定：自身 disabled > config-provider 全局注入（拦截全部触发路径 + 不弹气泡） */
  private isDisabled(): boolean {
    return this.injectDisabled()
  }

  private toggle(reason: OpenChangeReason = 'trigger'): void {
    if (this.hasAttr('open')) this.requestClose(reason)
    else this.requestOpen(reason)
  }

  /** 打开请求：记录来源 → 写 open 属性（update 统一派发 oas-open-change）；hover 触发走防抖 */
  private requestOpen(reason: OpenChangeReason = 'api'): void {
    if (this.isDisabled()) return
    this.clearCloseTimer()
    if (this.hasTrigger('hover')) {
      this.clearOpenTimer()
      this.openTimer = setTimeout(() => this.applyOpen(reason), HOVER_DELAY)
    } else {
      this.applyOpen(reason)
    }
  }

  private applyOpen(reason: OpenChangeReason): void {
    this.pendingReason = reason
    this.setAttribute('open', '')
  }

  /** 关闭请求：记录来源 → 移除 open 属性（公开供模块级 Esc 栈调用；非文档化 API） */
  requestClose(reason: OpenChangeReason = 'api'): void {
    this.clearOpenTimer()
    if (this.hasTrigger('hover') && reason !== 'trigger') {
      // hover 触发下的非动作关闭走防抖（移出宿主/面板不闪关）；动作类关闭立即
      this.clearCloseTimer()
      this.closeTimer = setTimeout(() => this.applyClose(reason), HOVER_HIDE_DELAY)
    } else {
      this.applyClose(reason)
    }
  }

  private applyClose(reason: OpenChangeReason): void {
    this.pendingReason = reason
    this.removeAttribute('open')
  }

  private clearOpenTimer(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
  }

  private onHoverEnter = (): void => {
    if (!this.hasTrigger('hover')) return
    if (this.isDisabled()) return
    this.clearCloseTimer()
    if (!this.hasAttr('open')) {
      this.clearOpenTimer()
      this.openTimer = setTimeout(() => this.applyOpen('trigger'), HOVER_DELAY)
    }
  }

  private onHoverLeave = (e: MouseEvent): void => {
    if (!this.hasTrigger('hover')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearOpenTimer()
    if (this.hasAttr('open')) {
      this.clearCloseTimer()
      this.closeTimer = setTimeout(() => this.applyClose('trigger'), HOVER_HIDE_DELAY)
    }
  }

  private onPanelEnter = (): void => {
    if (!this.hasTrigger('hover')) return
    this.clearCloseTimer()
  }

  private onPanelLeave = (e: MouseEvent): void => {
    if (!this.hasTrigger('hover')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearOpenTimer()
    this.closeTimer = setTimeout(() => this.applyClose('trigger'), HOVER_HIDE_DELAY)
  }

  /** 指针/焦点移到的目标是否仍在「宿主 + 面板」区域内（跨 shadow 时 relatedTarget 已 retarget） */
  private hoverTargetInside(rel: EventTarget | null): boolean {
    return (
      !!rel &&
      rel instanceof Node &&
      (this.contains(rel) || this.shadow.contains(rel) || rel === this)
    )
  }

  private onFocusIn = (): void => {
    if (!this.hasTrigger('focus')) return
    // 回焦豁免：restoreFocus 程序性回焦触发的 focusin 不开层（防「关闭→回焦→重开」死循环）
    if (this.refocusing) return
    if (this.isDisabled()) return
    this.clearCloseTimer()
    this.applyOpen('trigger')
  }

  private onFocusOut = (e: FocusEvent): void => {
    if (!this.hasTrigger('focus')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearOpenTimer()
    this.applyClose('trigger')
  }

  // —— 外部点击关闭 ——

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (path.includes(this) || path.includes(this.popoverEl as unknown as EventTarget)) return
    if (path.some((n) => n instanceof Node && this.shadow.contains(n))) return
    this.requestClose('outside')
  }

  // —— 定位（12 向 / 引擎接入）——

  /** 虚拟锚点矩形：virtual-x/y 视口坐标 > virtual-anchor 元素选择器 > 无锚点 */
  private virtualRect(): DOMRect | null {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 } as DOMRect
    }
    const sel = this.getAttr('virtual-anchor')
    if (sel) {
      const el = document.querySelector(sel)
      if (el) return el.getBoundingClientRect()
    }
    return null
  }

  /** 当前锚点矩形：虚拟坐标 > 虚拟锚点元素 > 默认触发元素 */
  private anchorRect(): DOMRect | null {
    if (this.isVirtual()) return this.virtualRect()
    return this.anchor?.getBoundingClientRect() ?? null
  }

  /** 定位源：placement（12 向）优先，缺席回落旧 position（值域为 4 基向子集，天然兼容） */
  private placementAttr(): string {
    return this.getAttr('placement', '') || this.getAttr('position', '') || 'top'
  }

  /** 面板定位：委托共享定位引擎 computePosition（12 向 + 主轴翻转 + 视口避让） */
  private position(): void {
    if (!this.popoverEl) return
    const anchorRect = this.anchorRect()
    if (!anchorRect) return
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const panelRect = this.popoverEl.getBoundingClientRect()
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const r = computePosition(
      anchorRect,
      panelRect,
      this.placementAttr() as Placement,
      viewport,
      GAP,
      autoAdjust,
      { collisionPadding: COLLISION_PAD },
    )
    this.popoverEl.style.top = `${r.top}px`
    this.popoverEl.style.left = `${r.left}px`
    this.popoverEl.setAttribute('data-placement', r.placement)
    this.setAnimOrigin(r.placement)
    this.positionArrow(anchorRect, r.placement)
  }

  /** 入场动画原点随 placement 感知方向（从锚点侧向外展开） */
  private setAnimOrigin(placement: string): void {
    const base = placement.startsWith('top')
      ? 'top'
      : placement.startsWith('bottom')
        ? 'bottom'
        : placement.startsWith('left')
          ? 'left'
          : 'right'
    const align = placement.endsWith('-start') ? 'start' : placement.endsWith('-end') ? 'end' : ''
    const cross = (s: string, e: string): string =>
      align === 'start' ? s : align === 'end' ? e : 'center'
    const originX =
      base === 'top' || base === 'bottom' ? cross('left', 'right') : base === 'left' ? 'right' : 'left'
    const originY =
      base === 'left' || base === 'right' ? cross('top', 'bottom') : base === 'top' ? 'bottom' : 'top'
    this.popoverEl?.style.setProperty('--oas-origin-x', originX)
    this.popoverEl?.style.setProperty('--oas-origin-y', originY)
  }

  /** arrow 布尔语义：默认 true（显示），仅 arrow="false" 隐藏（家族惯例） */
  private showArrow(): boolean {
    return this.getAttr('arrow', 'true') !== 'false'
  }

  /** 箭头指向锚点中心投影（夹取在面板边内），面板被视口 clamp 平移后仍指向锚点 */
  private positionArrow(anchorRect: DOMRect, placement: string): void {
    if (!this.popoverEl) return
    const arrow = this.popoverEl.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.removeProperty('--arrow-x')
    arrow.style.removeProperty('--arrow-y')
    if (!this.showArrow()) return
    const panelRect = this.popoverEl.getBoundingClientRect()
    const clampV = (v: number, max: number): number => Math.max(ARROW_PAD, Math.min(v, max))
    if (placement.startsWith('top') || placement.startsWith('bottom')) {
      const center = anchorRect.left + anchorRect.width / 2
      const x = clampV(
        center - panelRect.left - ARROW_SIZE / 2,
        panelRect.width - ARROW_PAD - ARROW_SIZE,
      )
      arrow.style.setProperty('--arrow-x', `${x}px`)
    } else {
      const center = anchorRect.top + anchorRect.height / 2
      const y = clampV(
        center - panelRect.top - ARROW_SIZE / 2,
        panelRect.height - ARROW_PAD - ARROW_SIZE,
      )
      arrow.style.setProperty('--arrow-y', `${y}px`)
    }
  }

  /** 宽度定制：数字 → px；'trigger' → 与触发元素同宽；其余按 CSS 值。虚拟 0 宽点位视为未设置 */
  private syncWidth(): void {
    if (!this.popoverEl) return
    const raw = this.getAttr('width', '').trim()
    if (!raw) {
      this.popoverEl.style.width = ''
      return
    }
    if (raw === 'trigger') {
      const r = this.anchorRect()
      if (r && r.width > 0) this.popoverEl.style.width = `${r.width}px`
      return
    }
    const n = Number(raw)
    this.popoverEl.style.width = Number.isFinite(n) && raw !== '' ? `${n}px` : raw
  }

  // —— 焦点管理（恒定行为：打开聚焦气泡 / 关闭回 trigger）——

  /** 打开瞬间焦点策略：ok 按钮优先 > actions 插槽内首个可聚焦 > 面板自身（tabindex=-1） */
  private applyInitialFocus(): void {
    if (!this.popoverEl) return
    const sel = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const okBtn = this.shadow.querySelector<HTMLElement>('[part="ok"]')
    if (okBtn && !okBtn.hidden && !okBtn.closest('[hidden]')) {
      okBtn.focus()
      return
    }
    // actions 插槽内容（light DOM）首个可聚焦元素
    const actionsSlot = this.popoverEl.querySelector<HTMLSlotElement>('slot[name="actions"]')
    for (const n of actionsSlot ? actionsSlot.assignedNodes({ flatten: true }) : []) {
      if (!(n instanceof HTMLElement)) continue
      const f = n.matches(sel) ? n : n.querySelector<HTMLElement>(sel)
      if (f) {
        f.focus()
        return
      }
    }
    this.popoverEl.setAttribute('tabindex', '-1')
    this.popoverEl.focus()
  }

  // —— 滚动/尺寸变化重定位 ——

  /** 打开期间监听 scroll（capture 捕获嵌套容器）与 resize，rAF 节流重定位 */
  private syncScrollFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const hasPoint = (() => {
      const x = parseFloat(this.getAttr('virtual-x'))
      const y = parseFloat(this.getAttr('virtual-y'))
      return Number.isFinite(x) && Number.isFinite(y)
    })()
    const track = open && !hasPoint
    if (track && !this.scrollFollow) {
      this.scrollFollow = true
      window.addEventListener('scroll', this.onScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onScroll)
    } else if (!track && this.scrollFollow) {
      this.scrollFollow = false
      window.removeEventListener('scroll', this.onScroll, { capture: true })
      window.removeEventListener('resize', this.onScroll)
    }
  }

  private onScroll = (): void => {
    cancelAnimationFrame(this.scrollRaf)
    this.scrollRaf = requestAnimationFrame(() => {
      if (!this.popoverEl || !this.hasAttr('open')) return
      this.position()
    })
  }

  // —— 属性同步 ——

  /** theme 解析：default/warning/danger，未知值回落 default */
  private themeAttr(): Theme {
    const t = this.getAttr('theme', 'default').trim()
    return t === 'warning' || t === 'danger' ? t : 'default'
  }

  /** theme 联动默认图标：default/warning=警示三角、danger=感叹圆（icon 插槽可覆盖） */
  private syncIcon(): void {
    if (!this.popoverEl) return
    const icon = this.popoverEl.querySelector<HTMLElement>('[part="icon"]')
    if (!icon) return
    icon.hidden = this.hasAttr('hide-icon')
    const svg = icon.querySelector<HTMLElement>('slot[name="icon"] > svg')
    if (!svg) return
    const theme = this.themeAttr()
    const d = theme === 'danger' ? iconRegistry['alert-circle'] : iconRegistry['warning']
    svg.innerHTML = d ?? ''
  }

  /** title/description 双通道：slot 有真实内容时隐藏兜底 span（富内容优先），无则渲染缓存文本 */
  private syncDualChannel(): void {
    if (!this.popoverEl) return
    // title 吸收：title 渲染进可见标题区后即从宿主移除——title 是原生全局属性，
    // 残留在宿主上会让整组件悬停弹出浏览器原生提示（与可见标题重复的视觉干扰）。
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // description 非原生属性，无吸收需求，直读
    this.descriptionCache = this.getAttr('description', '') || null
    const titleSlot = this.popoverEl.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.popoverEl.querySelector<HTMLElement>('.title-text')
    if (titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      titleFallback.hidden = hasSlotContent(titleSlot)
    }
    const descSlot = this.popoverEl.querySelector<HTMLSlotElement>('slot[name="description"]')
    const descFallback = this.popoverEl.querySelector<HTMLElement>('.description-text')
    if (descFallback) {
      descFallback.textContent = this.descriptionCache ?? ''
      descFallback.hidden = hasSlotContent(descSlot)
    }
    // 面板可访问名：有标题（属性或插槽）时 aria-labelledby 关联标题区
    const hasTitle = (this.titleCache ?? '') !== '' || hasSlotContent(titleSlot)
    if (hasTitle) this.popoverEl.setAttribute('aria-labelledby', this.titleId)
    else this.popoverEl.removeAttribute('aria-labelledby')
  }

  /** 内置按钮区：文案（ok-text/cancel-text 回落 locale）+ show-cancel + ok-loading + theme 色阶 */
  private syncButtons(): void {
    if (!this.popoverEl) return
    const ok = this.popoverEl.querySelector<HTMLElement>('[part="ok"]')
    const cancel = this.popoverEl.querySelector<HTMLElement>('[part="cancel"]')
    const okLabel = this.popoverEl.querySelector<HTMLElement>('.ok-label')
    if (okLabel) okLabel.textContent = this.getAttr('ok-text', '') || this.t('popconfirm.ok')
    if (cancel) {
      cancel.textContent = this.getAttr('cancel-text', '') || this.t('popconfirm.cancel')
      // show-cancel 布尔语义：默认显示，仅 show-cancel="false" 隐藏（单按钮确认）
      cancel.hidden = this.getAttr('show-cancel', 'true') === 'false'
    }
    if (ok) {
      const loading = this.hasAttr('ok-loading')
      if (loading) {
        ok.setAttribute('data-loading', '')
        ok.setAttribute('aria-busy', 'true')
      } else {
        ok.removeAttribute('data-loading')
        ok.removeAttribute('aria-busy')
      }
      // theme 色阶联动：danger/warning 时确定按钮转语义色（default 不写 data-tone）
      const theme = this.themeAttr()
      if (theme === 'default') ok.removeAttribute('data-tone')
      else ok.setAttribute('data-tone', theme)
    }
    // actions 插槽有真实内容时整组隐藏内置按钮区（自定义操作区由插槽 + show()/hide() 表达）
    const actionsSlot = this.popoverEl.querySelector<HTMLSlotElement>('slot[name="actions"]')
    const builtin = this.popoverEl.querySelector<HTMLElement>('.builtin-actions')
    if (builtin) builtin.hidden = hasSlotContent(actionsSlot)
  }

  /** trigger aria 关联：aria-expanded 开合同步 + aria-controls 指向面板 id */
  private syncAnchorAria(open: boolean): void {
    const a = this.anchor
    if (!(a instanceof HTMLElement) || a === this) return
    a.setAttribute('aria-expanded', String(open))
    a.setAttribute('aria-controls', this.panelId)
  }

  protected override update(): void {
    if (!this.popoverEl) return
    const open = this.hasAttr('open')
    // 整体禁用：aria-disabled 同步（视觉降饱和走 CSS :host([disabled])）
    if (this.hasAttr('disabled')) this.setAttribute('aria-disabled', 'true')
    else this.removeAttribute('aria-disabled')
    // 内容双通道（title 吸收 / description / aria-labelledby）
    this.syncDualChannel()
    this.syncIcon()
    this.syncButtons()
    this.syncAnchorAria(open)
    // 语义主题：面板 data-theme（CSS 走 --pop-* 变量派生，箭头自动跟随）
    const theme = this.themeAttr()
    if (theme === 'default') this.popoverEl.removeAttribute('data-theme')
    else this.popoverEl.setAttribute('data-theme', theme)
    // open 状态迁移 → oas-open-change（任何来源：内部动作 / 宿主直改属性 / show()/hide()）
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open, reason: this.pendingReason ?? 'api' })
    }
    this.pendingReason = null
    this.prevOpen = open
    // 箭头显隐
    const arrowEl = this.popoverEl.querySelector<HTMLElement>('[data-popper-arrow]')
    if (arrowEl) arrowEl.hidden = !this.showArrow()
    if (open) {
      // 先解除隐藏再移焦：aria-hidden=true 时面板 display:none，其中的 ok 按钮
      // 不可聚焦，applyInitialFocus 会静默失败（焦点仍停在 trigger）——顺序必须先显示后聚焦
      this.popoverEl.setAttribute('aria-hidden', 'false')
      if (!this.wasOpen) {
        registerLayer(this)
        // 打开瞬间：焦点移入气泡（ok 按钮 > actions 首个可聚焦 > 面板 tabindex=-1）
        this.applyInitialFocus()
      }
      // virtual 模式下生命周期由宿主控制，不注册外部点击关闭
      if (!this.isVirtual()) document.addEventListener('click', this.handleOutside, true)
      else document.removeEventListener('click', this.handleOutside, true)
      this.syncWidth()
      this.position()
      this.syncScrollFollow(true)
    } else {
      this.clearOpenTimer()
      this.clearCloseTimer()
      if (this.wasOpen) {
        // 关闭瞬间：焦点回 trigger（恒定行为；virtual 无锚点跳过）
        this.restoreFocus()
      }
      this.popoverEl.setAttribute('aria-hidden', 'true')
      unregisterLayer(this)
      document.removeEventListener('click', this.handleOutside, true)
      this.syncScrollFollow(false)
    }
    this.wasOpen = open
  }
}
