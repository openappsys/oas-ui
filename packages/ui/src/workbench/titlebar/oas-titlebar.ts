import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** size 合法值：compact（默认，34px）/ large（68px，控件保持紧凑） */
export type TitlebarSize = 'compact' | 'large'

/** 窗口操作动作（内建钮集合；detail.action 透传任意字符串供宿主扩展） */
export type TitlebarWindowAction = 'minimize' | 'maximize' | 'close'

const VALID_SIZES: readonly TitlebarSize[] = ['compact', 'large']
const WINDOW_ACTION_SET: readonly TitlebarWindowAction[] = ['minimize', 'maximize', 'close']
const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 compact 并在 dev 下 console.warn 一次（同值去重，对齐库内惯例） */
function normalizeSize(raw: string): TitlebarSize {
  if ((VALID_SIZES as readonly string[]).includes(raw)) return raw as TitlebarSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-titlebar] 非法 size "${raw}"，已回落 compact；合法值：compact/large`)
  }
  return 'compact'
}

/** 解析 window-actions 属性值（逗号分隔子集，未知名忽略） */
function parseWindowActions(raw: string): TitlebarWindowAction[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is TitlebarWindowAction => (WINDOW_ACTION_SET as readonly string[]).includes(s))
}

/** 窗口操作钮图标（原创 SVG：横线 / 方框 / ×） */
const WIN_ICONS: Record<TitlebarWindowAction, string> = {
  minimize:
    '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false"><path d="M1 5h8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  maximize:
    '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false"><rect x="1.6" y="1.6" width="6.8" height="6.8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  close:
    '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-titlebar-bg, color-mix(in srgb, var(--oas-color-text-primary) 5%, var(--oas-color-bg)));
  box-sizing: border-box;
  border-block-end: 1px solid var(--oas-color-border);
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-titlebar-height, var(--oas-titlebar-compact-height, 34px));
  /* 安全区：原生窗口控件（交通灯/系统钮）可能占据栏体两端的 env(titlebar-area-*) 区段，
     组件开口变量由宿主按平台设置（纯 Web 下缺省 0px 无影响） */
  padding-inline-start: var(--oas-titlebar-leading-inset, 0px);
  padding-inline-end: var(--oas-titlebar-trailing-inset, 0px);
  padding-block: var(--oas-space-1);
}
/* large 档：高度翻倍，控件保持紧凑（只动栏高，不动控件尺寸） */
:host([data-size='large']) .bar {
  min-height: var(--oas-titlebar-height, var(--oas-titlebar-large-height, 68px));
}
.leading {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex-shrink: 0;
}
.leading[hidden] {
  display: none;
}
.center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}
.title {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.title[hidden] {
  display: none;
}
.subtitle {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.subtitle[hidden] {
  display: none;
}
/* 文档井输入（editable）：居中、无框、hover/focus 轻提示可编辑 */
.doc-title {
  align-self: center;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}
.doc-title:hover {
  border-color: var(--oas-color-border);
}
.doc-title:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.doc-title[hidden] {
  display: none;
}
.trailing {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex-shrink: 0;
}
.trailing[hidden] {
  display: none;
}
/* 窗口操作钮：紧凑幽灵钮 */
.win-btn {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-control-height-sm, 24px);
  height: var(--oas-control-height-sm, 24px);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
}
.win-btn:hover {
  background: var(--oas-color-bg-hover);
}
.win-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.win-btn[hidden] {
  display: none;
}
/* ===== 拖动契约 =====
   drag 属性时宿主打 data-drag-region 标记，规则在此写 -webkit-app-region（Electron/Tauri 宿主生效；
   纯 Web 下为无害空操作）。交互子件必须显式退出拖动（no-drag），否则点击被拖动区吞掉——
   覆盖：原生交互元素、下方**显式枚举**的 oas-* 交互组件、显式 [data-no-drag] 逃生口；
   [data-drag] 可强制回拖动区（罕见需求）。**未枚举的 oas-* 交互件请由宿主加 [data-no-drag]**。
   shadow 内交互部件（窗口钮/文档井）直接声明。 */
:host([data-drag-region]) {
  -webkit-app-region: drag;
}
.win-btn,
.doc-title {
  -webkit-app-region: no-drag;
}
::slotted(button),
::slotted(a[href]),
::slotted(input),
::slotted(select),
::slotted(textarea),
::slotted(label),
::slotted(summary),
::slotted(oas-button),
::slotted(oas-icon),
::slotted(oas-input),
::slotted(oas-select),
::slotted(oas-switch),
::slotted(oas-checkbox),
::slotted(oas-radio),
::slotted(oas-slider),
::slotted(oas-tabs),
::slotted(oas-menu),
::slotted(oas-dropdown),
::slotted(oas-tooltip),
::slotted(oas-traffic-lights),
::slotted(oas-button-group),
::slotted(oas-toggle-button),
::slotted(oas-toggle-group),
::slotted(oas-toggle-item),
::slotted(oas-segmented),
::slotted(oas-radio-group),
::slotted(oas-checkbox-group),
::slotted(oas-input-number),
::slotted(oas-link),
::slotted(oas-tag),
::slotted(oas-color-picker),
::slotted(oas-date-picker),
::slotted(oas-time-picker),
::slotted(oas-cascader),
::slotted(oas-tree-select),
::slotted(oas-combobox),
::slotted(oas-auto-complete),
::slotted(oas-editable),
::slotted(oas-pin-input),
::slotted(oas-rate),
::slotted(oas-upload),
::slotted(oas-mentions),
::slotted(oas-dynamic-tags),
::slotted(oas-dynamic-input),
::slotted(oas-pagination),
::slotted(oas-toolbar),
::slotted(oas-toolbar-toggle),
::slotted(oas-toolbar-input),
::slotted(oas-scope-bar),
::slotted(oas-knob),
::slotted(oas-transport-well),
::slotted(oas-music-well),
::slotted(oas-swatch-group),
::slotted(oas-steps),
::slotted(oas-stepper),
::slotted([data-no-drag]) {
  -webkit-app-region: no-drag;
}
`

/**
 * oas-titlebar —— 窗口标题栏（应用外壳 chrome）。
 *
 * 与 oas-app-bar（页面级应用栏 role=banner）的分工：titlebar 语义在「窗口」——拖动区 +
 * 窗口操作 + 文档井，服务 Electron/Tauri 宿主；纯 Web 下拖动属性为无害空操作，
 * 组件退化为应用外壳语义（文档井 + 左品牌/右操作）。
 *
 * 结构：leading 区（品牌/交通灯）+ center 区（标题/文档井/交互内容）+ trailing 区
 * （内建窗口操作钮 + 自定义内容）。
 *
 * 属性（kebab-case）：
 * - `size`：`compact`（默认，34px）/ `large`（68px，控件保持紧凑）；非法值回落并告警（同值去重）
 * - `drag`：布尔，容器设为拖动区（写 `-webkit-app-region: drag` + `data-tauri-drag-region`）；
 *   交互子件（原生交互元素 / oas-* 自定义元素 / [data-no-drag]）自动 no-drag
 * - `title`：居中标题（`title` 插槽覆盖）。原生全局属性同名——渲染进标题区后即从宿主
 *   吸收移除（防原生 tooltip 重复干扰，库内既定约定）；editable 提交更新内部缓存并派发事件，
 *   属性不常驻宿主（清空/重设请显式写 title 属性）
 * - `subtitle`：副标题/文档状态（已编辑时间等；editable 文档井下照常显示，与文档井上下排布）
 * - `editable`：布尔，文档井标题可编辑（Enter/blur 提交、Esc 取消；编辑中外部重写 title 即终止）
 * - `window-actions`：逗号分隔内建窗口操作钮子集（minimize/maximize/close）；点击派发事件
 * - `leading-inset` / `trailing-inset`：安全区 CSS 长度（原生控件防压；亦可走 CSS 变量）
 *
 * 插槽：`leading`（品牌/交通灯）、`center`（交互内容，覆盖标题/文档井）、`title`（富标题）、
 * `trailing`（窗口操作之外的末端内容）。
 *
 * 事件：`oas-title-change`（detail `{ title }`，editable 提交；title 吸收缓存同步更新）；
 * `oas-window-action`（detail `{ action }`，组件只发事件不执行窗口操作）。
 *
 * 变量开口：`--oas-titlebar-height` / `--oas-titlebar-compact-height`（默认 34px）/
 * `--oas-titlebar-large-height`（默认 68px）/ `--oas-titlebar-leading-inset` / `-trailing-inset`
 *
 * a11y：容器 `role="group"` + aria-label（i18n）——aria-label 需挂在有 role 的元素上才会被
 * AT 播报（裸 div 上会被忽略）；窗口操作钮与文档井输入均有 aria-label（i18n）；
 * RTL：`data-rtl` 钩子 + 全逻辑属性布局
 */
export class OASTitlebar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['size', 'drag', 'title', 'subtitle', 'editable', 'window-actions', 'leading-inset', 'trailing-inset', 'dir']
  }

  private barEl: HTMLElement | null = null
  private leadingWrapEl: HTMLElement | null = null
  private centerWrapEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private subtitleEl: HTMLElement | null = null
  private docInputEl: HTMLInputElement | null = null
  private trailingWrapEl: HTMLElement | null = null
  private winBtns = new Map<TitlebarWindowAction, HTMLButtonElement>()

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题）。
   *  title 是原生全局属性——残留会让悬停弹出浏览器原生提示（与可见标题重复的视觉干扰），
   *  按库内既有约定（statistic/list-item 同构状态机）渲染进标题区后即从宿主移除；
   *  editable 提交反射回写也走缓存（属性写回后同帧被吸收逻辑收进缓存再移除）。 */
  private titleCache: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const winBtn = (action: TitlebarWindowAction) =>
      `<button class="win-btn" part="win-button" data-action="${action}" type="button" hidden>${WIN_ICONS[action]}</button>`
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="group">
        <div class="leading" part="leading" hidden><slot name="leading"></slot></div>
        <div class="center" part="center">
          <slot name="center"></slot>
          <input class="doc-title" part="doc-title" type="text" hidden />
          <div class="title" part="title" hidden></div>
          <slot name="title"></slot>
          <div class="subtitle" part="subtitle" hidden></div>
        </div>
        <div class="trailing" part="trailing" hidden>
          ${winBtn('minimize')}${winBtn('maximize')}${winBtn('close')}
          <slot name="trailing"></slot>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector('[part="bar"]')
    this.leadingWrapEl = this.shadow.querySelector('[part="leading"]')
    this.centerWrapEl = this.shadow.querySelector('[part="center"]')
    this.titleEl = this.shadow.querySelector('[part="title"]')
    this.subtitleEl = this.shadow.querySelector('[part="subtitle"]')
    this.docInputEl = this.shadow.querySelector('[part="doc-title"]')
    this.trailingWrapEl = this.shadow.querySelector('[part="trailing"]')
    for (const action of WINDOW_ACTION_SET) {
      const btn = this.shadow.querySelector<HTMLButtonElement>(`[part="win-button"][data-action="${action}"]`)
      if (btn) {
        this.winBtns.set(action, btn)
        btn.addEventListener('click', () => this.emit('window-action', { action }))
      }
    }
    // 文档井：Enter/blur 提交、Esc 取消（回滚 + 零事件）
    this.docInputEl?.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent
      if (ke.key === 'Enter') {
        ke.preventDefault()
        this.commitDocTitle()
      } else if (ke.key === 'Escape') {
        ke.preventDefault()
        this.cancelDocTitle()
      }
    })
    this.docInputEl?.addEventListener('blur', () => this.commitDocTitle())
    // 任一插槽内容变化都触发全量同步
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（bar + slot 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉。 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bar"]')) return false
    if (!this.shadow.querySelector('slot')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // size 档位钩子（非法值回落 + 告警在 normalizeSize 内）
    this.dataset.size = normalizeSize(this.getAttr('size', 'compact'))
    // 拖动契约：属性驱动（撤除时完全清理，无残留）
    this.syncDrag()
    // 安全区：属性通道写内联变量（亦可由宿主直接覆写 CSS 变量）
    this.syncInset('leading-inset', '--oas-titlebar-leading-inset')
    this.syncInset('trailing-inset', '--oas-titlebar-trailing-inset')
    // 窗口操作钮显隐 + aria-label（locale 反应式）
    const actions = parseWindowActions(this.getAttr('window-actions', ''))
    for (const action of WINDOW_ACTION_SET) {
      const btn = this.winBtns.get(action)
      if (!btn) continue
      btn.hidden = !actions.includes(action)
      btn.setAttribute('aria-label', this.t(`titlebar.${action}`))
    }
    // trailing 区空态：无窗口钮且无插槽内容时不渲染容器
    const trailingSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="trailing"]')
    if (this.trailingWrapEl && trailingSlot) {
      this.trailingWrapEl.hidden = actions.length === 0 && !this.hasSlotContent(trailingSlot)
    }
    // leading 区空态
    const leadingSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="leading"]')
    if (this.leadingWrapEl && leadingSlot) this.leadingWrapEl.hidden = !this.hasSlotContent(leadingSlot)
    this.syncTitle()
    // 容器可访问名称（locale 反应式）
    this.barEl?.setAttribute('aria-label', this.t('titlebar.label'))
  }

  /**
   * 拖动契约同步：drag 属性在场打 data-drag-region 标记（样式表据钩子写 -webkit-app-region: drag，
   * Electron/Tauri 宿主生效）+ data-tauri-drag-region（Tauri 拖动识别）；撤除时全清无残留。
   */
  private syncDrag(): void {
    if (this.hasAttr('drag')) {
      this.setAttribute('data-drag-region', '')
      this.setAttribute('data-tauri-drag-region', '')
    } else {
      this.removeAttribute('data-drag-region')
      this.removeAttribute('data-tauri-drag-region')
    }
  }

  /** 安全区属性通道：值写入内联 CSS 变量（空值撤除，回落样式表默认 0px） */
  private syncInset(attr: string, cssVar: string): void {
    const raw = this.getAttr(attr, '').trim()
    if (raw !== '') this.style.setProperty(cssVar, raw)
    else this.style.removeProperty(cssVar)
  }

  /**
   * 标题三通道同步：slot="center" 有内容 → 全部让位；editable → input（值 = 缓存标题）；
   * 否则 title/subtitle 文本（slot="title" 富标题覆盖属性文本）。
   * title 吸收状态机：属性在场（含空串）= 宿主意图 → 更新缓存并从宿主移除（防原生 tooltip）；
   * 属性缺席 = 吸收后的常态 → 保持已渲染标题（清空请用 title=""）。
   * editable 下外部重写 title → 缓存更新、input 值跟随（终止编辑：外部状态优先，无孤儿输入态）。
   */
  private syncTitle(): void {
    // title 吸收：宿主属性在场即收进缓存并移除（此后渲染由缓存驱动，幂等）
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const title = this.titleCache ?? ''
    const subtitle = this.getAttr('subtitle', '')
    const centerSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="center"]')
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const hasCenter = centerSlot ? this.hasSlotContent(centerSlot) : false
    if (this.centerWrapEl) this.centerWrapEl.classList.toggle('has-center', hasCenter)
    if (!this.titleEl || !this.subtitleEl || !this.docInputEl) return
    if (hasCenter) {
      this.docInputEl.hidden = true
      this.titleEl.hidden = true
      this.subtitleEl.hidden = true
      return
    }
    const editable = this.hasAttr('editable')
    this.docInputEl.hidden = !editable
    if (editable) {
      this.docInputEl.setAttribute('aria-label', this.t('titlebar.docTitle'))
      // 外部重写 title（缓存更新）即终止编辑：input 值直接跟随缓存（含首帧赋值）
      if (this.docInputEl.value !== title) this.docInputEl.value = title
    }
    const richTitle = titleSlot ? this.hasSlotContent(titleSlot) : false
    this.titleEl.textContent = title
    this.titleEl.hidden = editable || richTitle || title === ''
    this.subtitleEl.textContent = subtitle
    // subtitle 在 editable 下照常显示：文档井场景正是「文档状态」（已保存时间等）的主要用武之地
    // （回归：曾按 editable 强制隐藏，demo「可编辑文档标题」的提示行静默不可见）
    this.subtitleEl.hidden = subtitle === ''
  }

  /** 文档井提交：值有变化才更新缓存并派发 oas-title-change（零变化零事件；title 不常驻宿主属性） */
  private commitDocTitle(): void {
    const input = this.docInputEl
    if (!input || input.hidden || !this.hasAttr('editable')) return
    const next = input.value
    if (next === (this.titleCache ?? '')) return
    this.titleCache = next
    this.emit('title-change', { title: next })
  }

  /** 文档井取消：回滚 input 值为当前缓存标题、零事件（无孤儿输入态） */
  private cancelDocTitle(): void {
    const input = this.docInputEl
    if (!input) return
    input.value = this.titleCache ?? ''
  }

  /** 插槽是否有「真实内容」：注释节点与纯空白文本不算（对齐 app-bar 判据） */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((n) => this.isRealNode(n))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName.includes('-')) return true
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }
}
