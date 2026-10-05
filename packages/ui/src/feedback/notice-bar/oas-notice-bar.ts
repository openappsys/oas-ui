import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

/**
 * oas-notice-bar —— 通告栏（feedback 族，移动原生形态批）。
 *
 * 页面顶部/区块内的通告条：图标 + 文本（超长可横向滚动）+ 多条纵向轮播 + 可关闭 + action。
 *
 * 属性（kebab-case）：
 * - `type`：`info`（默认，主色系）/ `success` / `warning` / `error`；底色/图标色走语义
 *   token（`--oas-color-*` / `*-text` 档），暗色主题随 token 自动适配；非法值回落 info
 * - `icon`：图标名（iconRegistry 键）；缺省按 type 取默认图标（info/success/warning/error）；
 *   `icon="none"` 不显示图标；非法名回落 type 默认；slot="icon" 富内容优先
 * - `closable`：布尔，显示关闭按钮（aria-label 走 i18n `noticeBar.closeAriaLabel`）
 * - `scrollable`：布尔，单条内容超长时横向走马灯——内嵌 `<oas-marquee>` 组合复用其滚动
 *   引擎（无缝循环 / auto-fill / RTL / reduced-motion 降级均由 marquee 承担），不复制其代码。
 *   实现说明：marquee 的克隆引擎读取自身 light DOM 子节点克隆，嵌套 slot 投影无法被克隆
 *   （克隆 `<slot>` 在 light DOM 不分配、渲染为空），因此本组件把宿主内容**深克隆物化**为
 *   marquee 的 light DOM 源份（隐藏 probe `<slot>` 充当 slotchange 探针）。局限：克隆份处于
 *   本组件 shadow 内，页面样式表的 class 选择器不作用于滚动副本（行内 style 保留）——
 *   滚动内容建议用纯文本或行内样式
 * - `items`：JSON 字符串数组——多条通告纵向轮播（淡出 → 换文本 → 淡入，间隔 `interval`
 *   毫秒，默认 4000，非法回退默认）；`prefers-reduced-motion` 下不自动轮播（静态显示第一条）；
 *   非法 JSON / 非数组 / 空数组回退默认插槽单条内容；items 优先于默认插槽；仅插槽单条模式下
 *   `scrollable` 生效（items 纵向轮播优先）
 * - `interval`：轮播间隔毫秒数，默认 4000，非法/非正数回退默认
 * - `action-text`：action 文字；缺省无 action 区
 * - `href`：在场时 action 渲染为 `<a>`（原生导航），缺省渲染为 `<button>`（点击派发
 *   `oas-action-click`）；运行时增删 href 切换形态
 * - `open`：恢复开关（可恢复关闭语义，与 alert 一致）：组件关闭后宿主设置 open 即恢复显示；
 *   组件自身关闭流程末尾会自移除 open，因此 open 在场 = 强制可见
 *
 * 插槽：
 * - 默认插槽：单条通告内容（items 缺省时）
 * - `icon`：图标插槽，覆盖默认/自定义图标
 *
 * 事件（bubbles + composed）：
 * - `oas-close`：点击关闭按钮后派发，随后组件自隐藏（hidden + 退场过渡；reduced-motion
 *   跳过过渡）；宿主设 `open` 可恢复
 * - `oas-action-click`：action 为 button 形态（无 href）点击时派发
 *
 * a11y：容器 `role="region"` + aria-label（i18n `noticeBar.regionLabel`）；关闭按钮
 * aria-label（i18n）；图标 aria-hidden；自动轮播时内容区 `aria-live="off"`（不打扰读屏），
 * 静态态（单条/reduced-motion）为 `polite`。
 */

export type NoticeBarType = 'info' | 'success' | 'warning' | 'error'

/** 语义 type → 内置图标名（iconRegistry 键，与 alert 的语义图标映射一致） */
const SEMANTIC_ICONS: Record<NoticeBarType, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
}

const VALID_TYPES: readonly NoticeBarType[] = ['info', 'success', 'warning', 'error']

/** 默认轮播间隔（毫秒）；interval 非法/非正数时回退 */
const DEFAULT_INTERVAL_MS = 4000

/** 关闭退场过渡时长（毫秒），与 alert 一致 */
const CLOSE_ANIM_MS = 200

/** 轮播淡出时长（毫秒）：淡出 → 换文本 → 淡入 */
const FADE_MS = 200

/** interval 归一：非法/非正数回退默认 4000 */
function resolveIntervalMs(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS
  return n
}

/** prefers-reduced-motion 探测（happy-dom 等环境可能缺失 matchMedia） */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
/* 关闭态：host hidden 会被作者级 display 规则覆盖，需显式补回（关闭后真正隐藏）；
   退场过渡期间（[hidden][data-closing]）保持可见播放淡出，过渡结束移除 data-closing 即落隐藏 */
:host([hidden]) {
  display: none;
}
:host([hidden][data-closing]) {
  display: block;
}
.bar {
  /* 语义色变量（type 驱动）：底色/描边用 --nb-accent，文字用 --nb-text（亮暗主题各自的可读档） */
  --nb-accent: var(--oas-color-primary);
  --nb-text: var(--oas-color-primary-text);
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-md);
  background: color-mix(in srgb, var(--nb-accent) 10%, transparent);
  /* 浅底文字掺深安全档（-text 档按实底校准，10% 浅底下 WCAG 比值差 0.05~0.5——
     与 tag/code 同款 deep-mix 机制，明暗主题由 token 自适应） */
  color: color-mix(in srgb, var(--nb-text) var(--oas-deep-mix, 72%), var(--oas-deep-sink, black));
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  /* 关闭退场过渡：淡出 + 轻微上移（prefers-reduced-motion 停用） */
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
}
.bar[data-type='success'] {
  --nb-accent: var(--oas-color-success);
  --nb-text: var(--oas-color-success-text);
}
.bar[data-type='warning'] {
  --nb-accent: var(--oas-color-warning);
  --nb-text: var(--oas-color-warning-text);
}
.bar[data-type='error'] {
  --nb-accent: var(--oas-color-danger);
  --nb-text: var(--oas-color-danger-text);
}
/* 退场过渡进行中：淡出 + 上移 + 不可交互（prefers-reduced-motion 下直接落定无过渡） */
:host([data-closing]) .bar {
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .bar {
    transition: none;
  }
  .item-text {
    transition: none;
  }
}
.icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-md);
  line-height: 1;
  color: var(--nb-accent);
}
.icon[hidden] {
  display: none;
}
.icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.content {
  flex: 1;
  min-width: 0;
}
/* probe：非滚动模式下承载默认插槽投影；滚动模式下隐藏（仅作 slotchange 探针，
   内容经物化克隆进内嵌 marquee 展示） */
.probe {
  min-width: 0;
}
.probe[hidden] {
  display: none;
}
/* items 纵向轮播 */
.carousel {
  position: relative;
  min-width: 0;
}
.carousel[hidden] {
  display: none;
}
.item-text {
  display: block;
  opacity: 1;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out);
}
.item-text.fading {
  opacity: 0;
}
/* 内嵌走马灯：颜色/字号继承通告栏语义色（覆盖 marquee 自身 :host 的默认文字色，
   外层树规则优先于内层 :host 规则） */
.scroll {
  color: inherit;
  font-size: inherit;
}
.scroll[hidden] {
  display: none;
}
.action {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  font-weight: 500;
  /* action 文字同走掺深安全档（浅底下 raw 主色 3.97 不达 4.5，见 .bar 注释） */
  color: color-mix(in srgb, var(--nb-text) var(--oas-deep-mix, 72%), var(--oas-deep-sink, black));
  cursor: pointer;
  text-decoration: none;
  border-radius: var(--oas-radius-sm);
  white-space: nowrap;
}
.action:hover {
  opacity: 0.8;
  text-decoration: underline;
}
.action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.action[hidden] {
  display: none;
}
.close-btn {
  flex-shrink: 0;
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
.close-btn[hidden] {
  display: none;
}
.close-btn svg {
  width: 1em;
  height: 1em;
  display: block;
  fill: currentColor;
}
`

/** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖默认图标的判空依据 */
function hasSlotContent(slot: HTMLSlotElement): boolean {
  return slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
}

export class OASNoticeBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'icon', 'closable', 'scrollable', 'items', 'interval', 'action-text', 'href', 'open']
  }

  private barEl: HTMLElement | null = null
  private iconEl: HTMLElement | null = null
  private iconFallback: HTMLElement | null = null
  private probeEl: HTMLElement | null = null
  private carouselEl: HTMLElement | null = null
  private itemTextEl: HTMLElement | null = null
  private scrollEl: HTMLElement | null = null
  private actionLinkEl: HTMLAnchorElement | null = null
  private actionBtnEl: HTMLButtonElement | null = null
  private closeBtnEl: HTMLButtonElement | null = null

  /** 关闭状态机：closing = 退场过渡进行中（防重入）；closed = 已关闭（open 恢复通道复位） */
  private closing = false
  private closed = false
  private closeTimer: ReturnType<typeof setTimeout> | null = null

  /** 轮播状态：当前条目索引 + 计时器 + 淡出换文本计时器 */
  private itemIndex = 0
  private carTimer: ReturnType<typeof setInterval> | null = null
  private fadeTimer: ReturnType<typeof setTimeout> | null = null
  /** 轮播运行条件指纹：条件（模式/条数/间隔/reduced-motion/hidden/连接态）变化才重启计时器 */
  private lastCarKey = ''
  /** 上一帧 items 属性原值：变更时复位索引到第一条 */
  private lastItemsRaw: string | null = null
  /** 上一帧写入的条目文本：相同不重写（不与淡入淡出过渡打架） */
  private lastTextSet = ''
  /** 上一帧渲染的图标名：相同不重写 innerHTML */
  private lastIconName = ''
  /** 上一帧物化进 marquee 的宿主内容指纹：相同不重建 */
  private lastScrollSig = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="region">
        <span class="icon" part="icon" aria-hidden="true" hidden><slot name="icon"><span class="icon-default"></span></slot></span>
        <div class="content" part="content">
          <div class="probe" hidden><slot></slot></div>
          <div class="carousel" part="carousel" aria-live="polite" hidden><span class="item-text"></span></div>
          <oas-marquee class="scroll" part="marquee" hidden></oas-marquee>
        </div>
        <a class="action" part="action" hidden></a>
        <button class="action" part="action" type="button" hidden></button>
        <button class="close-btn" part="close" type="button" hidden aria-label=""><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${iconRegistry['close']}</svg></button>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    this.iconEl = this.shadow.querySelector<HTMLElement>('[part="icon"]')
    this.iconFallback = this.shadow.querySelector<HTMLElement>('.icon-default')
    this.probeEl = this.shadow.querySelector<HTMLElement>('.probe')
    this.carouselEl = this.shadow.querySelector<HTMLElement>('[part="carousel"]')
    this.itemTextEl = this.shadow.querySelector<HTMLElement>('.item-text')
    this.scrollEl = this.shadow.querySelector<HTMLElement>('oas-marquee')
    this.actionLinkEl = this.shadow.querySelector<HTMLAnchorElement>('a.action')
    this.actionBtnEl = this.shadow.querySelector<HTMLButtonElement>('button.action')
    this.closeBtnEl = this.shadow.querySelector<HTMLButtonElement>('[part="close"]')

    this.actionBtnEl?.addEventListener('click', () => this.emit('action-click'))
    this.closeBtnEl?.addEventListener('click', () => this.close())
    // 默认插槽：内容增减时重刷（scrollable 模式下据此物化进 marquee；同时影响 probe 显隐）。
    // 注意选择器带 .probe 前缀——shadow 里 icon 具名 slot 在前，裸 querySelector('slot') 会抓错
    this.shadow.querySelector('.probe slot')?.addEventListener('slotchange', () => this.update())
    // icon 插槽：内容增减切换默认图标显隐
    this.shadow.querySelector('slot[name="icon"]')?.addEventListener('slotchange', () => this.update())

    // 断开连接时清理计时器（防孤儿定时器）；重连后由 update 依据连接态指纹重启轮播
    this.onCleanup(() => {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer)
        this.closeTimer = null
      }
      this.stopCarousel()
      if (this.fadeTimer) {
        clearTimeout(this.fadeTimer)
        this.fadeTimer = null
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（bar 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bar"]')) return false
    this.bind()
    return true
  }

  protected override onReconnect(): void {
    // 轮播计时器在断开时已被 onCleanup 清理；复位指纹使重连后的 update 重启计时器
    // （连接前后 isConnected 均为 true，指纹不含差异，必须显式复位）
    this.lastCarKey = ''
  }

  protected override update(): void {
    const bar = this.barEl
    if (!bar) return

    // open 恢复通道：宿主设 open = 强制可见（打断退场 / 复位已关闭态）
    if (this.hasAttr('open')) {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer)
        this.closeTimer = null
      }
      this.closing = false
      this.removeAttribute('data-closing')
      this.closed = false
      this.hidden = false
    }

    // type：非法值回落 info（不告警，通告栏类型即配色语义，回落即可）
    const rawType = this.getAttr('type', 'info')
    const type = ((VALID_TYPES as readonly string[]).includes(rawType) ? rawType : 'info') as NoticeBarType
    bar.setAttribute('data-type', type)

    // items 解析与模式判定：items 优先于默认插槽；scrollable 仅作用于插槽单条模式
    const items = this.parseItems()
    const itemsMode = items.length > 0
    const scrollMode = !itemsMode && this.hasAttr('scrollable')

    // items 属性变更：复位到第一条
    const rawItems = this.getAttr('items')
    if (rawItems !== this.lastItemsRaw) {
      this.lastItemsRaw = rawItems
      this.itemIndex = 0
      this.lastTextSet = ''
    }

    // 三通道显隐：probe（插槽投影）/ carousel（items 轮播）/ marquee（scrollable 走马灯）
    if (this.probeEl) this.probeEl.hidden = itemsMode || scrollMode
    if (this.carouselEl) this.carouselEl.hidden = !itemsMode
    if (this.scrollEl) this.scrollEl.hidden = !scrollMode

    // items 条目文本（索引越界钳制；相同文本不重写，不与淡入淡出过渡打架）
    if (itemsMode && this.itemTextEl) {
      this.itemIndex = Math.min(this.itemIndex, items.length - 1)
      const text = items[this.itemIndex] ?? ''
      if (text !== this.lastTextSet) {
        this.itemTextEl.textContent = text
        this.lastTextSet = text
      }
    }

    // 轮播计时器：条件指纹变化才重启（reduced-motion / 单条 / 关闭态 / 断开连接均不自动轮播）
    this.syncCarousel(itemsMode, items.length)

    // scrollable：宿主内容物化进内嵌 marquee（slotchange 与属性变化共用此通道）
    if (scrollMode) this.syncScrollContent()

    // 图标：slot 富内容优先；icon="none" 隐藏；icon 属性名优先于 type 默认（非法名回落）
    if (this.iconEl) {
      const iconSlot = this.iconEl.querySelector<HTMLSlotElement>('slot[name="icon"]')
      const hasCustom = iconSlot ? hasSlotContent(iconSlot) : false
      const iconAttr = this.getAttr('icon')
      const none = iconAttr === 'none'
      this.iconEl.hidden = none
      if (this.iconFallback) {
        this.iconFallback.hidden = hasCustom
        if (!hasCustom && !none) {
          const iconName = (
            iconAttr !== '' && iconRegistry[iconAttr as IconName] ? iconAttr : SEMANTIC_ICONS[type]
          ) as IconName
          if (iconName !== this.lastIconName) {
            this.lastIconName = iconName
            this.iconFallback.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${iconRegistry[iconName]}</svg>`
          }
        }
      }
    }

    // action：action-text 缺省无 action；href 在场渲染 <a>（原生导航），缺省 <button>（oas-action-click）
    const actionText = this.getAttr('action-text')
    const hasAction = actionText !== ''
    const linkMode = this.hasAttr('href')
    if (this.actionLinkEl) {
      this.actionLinkEl.hidden = !hasAction || !linkMode
      if (linkMode) {
        this.actionLinkEl.textContent = actionText
        this.actionLinkEl.setAttribute('href', this.getAttr('href'))
      }
    }
    if (this.actionBtnEl) {
      this.actionBtnEl.hidden = !hasAction || linkMode
      if (!linkMode) this.actionBtnEl.textContent = actionText
    }

    // 关闭按钮显隐 + aria-label（i18n；locale 切换由基类重刷 update 覆盖）
    if (this.closeBtnEl) {
      this.closeBtnEl.hidden = !this.hasAttr('closable')
      this.closeBtnEl.setAttribute('aria-label', this.t('noticeBar.closeAriaLabel'))
    }
    bar.setAttribute('aria-label', this.t('noticeBar.regionLabel'))
  }

  /** items 解析：JSON 数组（过滤非字符串项）；非法/非数组/空 → 空数组（回退插槽内容） */
  private parseItems(): string[] {
    const raw = this.getAttr('items').trim()
    if (raw === '') return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((v): v is string => typeof v === 'string')
    } catch {
      return []
    }
  }

  /**
   * 轮播计时器同步：运行条件指纹（模式/条数/间隔原值/reduced-motion/hidden/连接态）变化
   * 才停启——断开连接清理计时器后重连，指纹因 isConnected 翻转而变化，轮播自动恢复。
   * aria-live：自动播放 off（不打扰读屏），静态态 polite。
   */
  private syncCarousel(itemsMode: boolean, count: number): void {
    const reduced = prefersReducedMotion()
    const active = itemsMode && count > 1 && !reduced && !this.hidden && this.isConnected
    this.carouselEl?.setAttribute('aria-live', active ? 'off' : 'polite')
    const key = `${active}|${count}|${this.getAttr('interval')}|${reduced}`
    if (key === this.lastCarKey) return
    this.lastCarKey = key
    this.stopCarousel()
    if (active) {
      this.carTimer = setInterval(() => this.advance(), resolveIntervalMs(this.getAttr('interval')))
    }
  }

  private stopCarousel(): void {
    if (this.carTimer) {
      clearInterval(this.carTimer)
      this.carTimer = null
    }
  }

  /** 推进到下一条：淡出 → 换文本 → 淡入（reduced-motion 不会进入本路径——计时器未启动） */
  private advance(): void {
    const items = this.parseItems()
    if (items.length <= 1 || !this.itemTextEl) return
    this.itemIndex = (this.itemIndex + 1) % items.length
    const textEl = this.itemTextEl
    // 上一轮换文本尚未落定（interval < FADE_MS 的极端配置）：先取消旧换文本，避免乱序竞写
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer)
      this.fadeTimer = null
    }
    textEl.classList.add('fading')
    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = null
      // 换文本时重读 items：等待期间属性可能已变更（按当前列表钳制索引）
      const next = this.parseItems()
      if (next.length === 0) return
      this.itemIndex = Math.min(this.itemIndex, next.length - 1)
      const text = next[this.itemIndex] ?? ''
      textEl.textContent = text
      this.lastTextSet = text
      textEl.classList.remove('fading')
    }, FADE_MS)
  }

  /**
   * scrollable 内容物化：把宿主 light-DOM 内容深克隆为内嵌 marquee 的源份。
   * marquee 的克隆引擎读取自身 light DOM 子节点克隆——嵌套 slot 投影无法被克隆
   * （克隆 `<slot>` 在 light DOM 不分配、渲染为空），故走物化通道；marquee 自身的
   * 无缝循环/auto-fill/RTL/reduced-motion 降级机制全部原样复用。清空重填会连带清掉
   * marquee 自建的克隆份，其内部 slotchange/ResizeObserver 会按新内容重建，无需干预。
   * 指纹相同不重建（属性频繁变化不抖动）。
   */
  private syncScrollContent(): void {
    const mq = this.scrollEl
    if (!mq) return
    const nodes = Array.from(this.childNodes).filter((n) => {
      // 元素：带 slot 属性的是具名插槽内容（如 icon），不进滚动内容
      if (n.nodeType === 1) return !(n as Element).hasAttribute('slot')
      // 文本：纯空白节点跳过
      return (n.textContent ?? '').trim() !== ''
    })
    const sig = nodes.map((n) => (n.nodeType === 1 ? (n as Element).outerHTML : n.textContent)).join('\u0002')
    if (sig === this.lastScrollSig) return
    this.lastScrollSig = sig
    mq.textContent = ''
    for (const n of nodes) mq.appendChild(n.cloneNode(true))
  }

  /**
   * 关闭流程：派发 oas-close → 同步落 hidden → 退场过渡（[hidden][data-closing] 保持
   * 可见播放淡出）→ 过渡结束落最终态（closed；自移除 open，宿主重设 open 可恢复）。
   * prefers-reduced-motion 跳过过渡直接落定。
   */
  private close(): void {
    if (this.closed || this.closing) return
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

  /** 退场最终态：移除过渡标记 → 置 closed → 自移除 open → 重刷（停轮播计时器） */
  private finalizeClose(): void {
    this.closing = false
    this.removeAttribute('data-closing')
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.closed = true
    this.hidden = true
    this.removeAttribute('open')
    this.update()
  }
}
