import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface ToggleItem {
  /** 按钮文案（icon-only 项可省略，可访问名兜底走图标名/ariaLabel） */
  label?: string
  value: string
  disabled?: boolean
  /** 前置图标（@oas-ui/icons 注册表图标名） */
  icon?: string
  /** 项级可访问名称覆盖（缺省：label 文本；icon-only 时兜底图标名） */
  ariaLabel?: string
}

export type ToggleGroupSize = 'small' | 'medium' | 'large'
export type ToggleGroupStatus = 'success' | 'warning' | 'error'

const VALID_SIZES: readonly ToggleGroupSize[] = ['small', 'medium', 'large']
const VALID_STATUSES: readonly ToggleGroupStatus[] = ['success', 'warning', 'error']
/** 预设色板名（ui-spec §4.1 color 协议，映射 --oas-preset-* token） */
const PRESET_COLORS: readonly string[] = [
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

function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

/**
 * 自定义选中色的实底文字色：按相对亮度取深/浅（字面量 #rgb/#rrggbb/rgb(a)）；
 * 其余写法返回 ''（走 CSS 的 text-on-primary 兜底）。
 */
function pickOnColor(color: string): string {
  let r = 0
  let g = 0
  let b = 0
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.replace(/(.)/g, '$1$1') : hex[1]!
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else if (rgb) {
    r = Number(rgb[1])
    g = Number(rgb[2])
    b = Number(rgb[3])
  } else {
    return ''
  }
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  return lum > 0.35 ? '#18181b' : '#ffffff'
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.item {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.item:hover {
  border-color: var(--oas-toggle-color, var(--oas-color-primary));
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item[aria-checked='true'] {
  background: var(--oas-toggle-color, var(--oas-color-primary));
  border-color: var(--oas-toggle-color, var(--oas-color-primary));
  color: var(--oas-toggle-on-color, var(--oas-color-text-on-primary));
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
}
/* ---- 项图标：iconRegistry 内联 SVG（跟随 currentColor，装饰性对读屏隐藏） ---- */
.item.has-icon {
  gap: var(--oas-space-2);
}
.item .icon {
  display: inline-flex;
}
.item.icon-only {
  aspect-ratio: 1;
  padding: 0;
}
/* ---- size 尺寸档（默认 medium 走基础样式；控高对齐 control-height token） ---- */
:host([data-size='small']) .item {
  min-height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding-inline: var(--oas-space-3);
}
:host([data-size='large']) .item {
  min-height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding-inline: var(--oas-space-5);
}
/* ---- vertical 纵向（aria-orientation 由 JS 同步） ---- */
:host([vertical]) .group {
  flex-direction: column;
}
/* ---- spread 满宽均分（移动端操作栏形态；纵向组同样占满宽度） ---- */
:host([spread]) {
  display: flex;
  width: 100%;
}
:host([spread]) .group {
  display: flex;
  width: 100%;
  flex: 1 1 auto;
  flex-wrap: nowrap;
}
:host([spread]) .item {
  flex: 1 1 0;
}
/* ---- attached 贴合形态（默认分离维持现状；贴合后 gap 归零 + 相邻边框合并，逻辑属性适配 RTL） ---- */
:host([attached]) .group {
  gap: 0;
  flex-wrap: nowrap;
}
:host([attached]) .item {
  position: relative;
}
:host([attached]) .item ~ .item {
  margin-inline-start: -1px;
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
:host([attached]) .item:not(:last-child) {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
/* 贴合态 hover/聚焦/选中项浮于邻项之上（边框不被邻项压线） */
:host([attached]) .item:hover,
:host([attached]) .item:focus-visible,
:host([attached]) .item[aria-checked='true'] {
  z-index: 1;
}
/* 纵向贴合：上下圆角合并 + 负 margin 转纵向（复合条件权重更高，覆盖横向规则；
   border-end-start 恢复圆角——横向规则曾清零，纵向末项底左角需要圆角收尾） */
:host([attached][vertical]) .group {
  flex-direction: column;
}
:host([attached][vertical]) .item ~ .item {
  margin-inline-start: 0;
  margin-block-start: -1px;
  border-start-start-radius: 0;
  border-start-end-radius: 0;
  border-end-start-radius: var(--oas-radius-md);
}
:host([attached][vertical]) .item:not(:last-child) {
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}
/* ---- status 校验态：success / warning / error（宿主自设 aria-invalid 等效 error，置于最后统一胜出） ---- */
:host([data-status='success']) .item {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) .item:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='success']) .item[aria-checked='true'] {
  background: var(--oas-color-success);
  border-color: var(--oas-color-success);
  color: var(--oas-color-text-on-success);
}
:host([data-status='warning']) .item {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) .item:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='warning']) .item[aria-checked='true'] {
  background: var(--oas-color-warning);
  border-color: var(--oas-color-warning);
  color: var(--oas-color-text-on-warning);
}
:host([data-status='error']) .item,
:host([aria-invalid='true']) .item {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) .item:focus-visible,
:host([aria-invalid='true']) .item:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='error']) .item[aria-checked='true'],
:host([aria-invalid='true']) .item[aria-checked='true'] {
  background: var(--oas-color-danger);
  border-color: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
}
`

/**
 * oas-toggle-group —— 切换组（单选/多选互斥按钮组）。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, disabled?, icon?, ariaLabel? }]`
 * - `value`：单选为字符串；`multiple` 时为 JSON 数组字符串
 * - `multiple`：多选模式（checkbox 语义）
 * - `size`：尺寸档 small/medium/large（就近读取 config-provider 注入，镜像 data-size）
 * - `vertical`：纵向排布
 * - `attached`：贴合形态（默认分离 gap；贴合后圆角合并）
 * - `mandatory`：不可全空——布尔（多选最后一项不可取消）；`mandatory="force"` 空态自动选第一个非禁用项
 * - `max-count`：多选上限（达上限未选项置灰，拦截并派发 oas-exceed-limit；已选项仍可取消）
 * - `spread`：满宽均分
 * - `color`：选中色（ui-spec §4.1 三级协议：字面色 > 预设名 > 主色）
 * - `status`：校验态 success/warning/error（error 联动 aria-invalid）
 * - `aria-label`：组可访问名（覆盖 locale 兜底）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：`{ value: string }`（单选）或 `{ value: string[] }`（多选）
 * - `oas-exceed-limit`：`{ value: string, max: number }`（max-count 拦截时）
 *
 * 语义：单选 `role="radiogroup"` + `radio`；多选 `role="group"` + `checkbox`；
 * 键盘方向键移动（单选即选中、多选移动焦点 + Space 切换）、Home/End 首尾跳转，roving tabindex。
 * `mandatory="force"` 的自动兜底只回写 value、不派发 oas-change（非用户交互；value 属性即受控真相源）。
 */
export class OASToggleGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'multiple',
      'items',
      'disabled',
      'disabled-skip',
      'size',
      'color',
      'status',
      'vertical',
      'attached',
      'mandatory',
      'max-count',
      'spread',
      'aria-label',
    ]
  }

  private itemsList: ToggleItem[] = []
  private buttons: HTMLButtonElement[] = []
  private group: HTMLElement | null = null
  private lastItemsRaw: string | null = ''
  private lastMultiple = false
  /** 子元素通道结构签名（上次比对基准）；与 lastItemsRaw 互斥标记当前数据源 */
  private lastChildSig = ''
  /** 子元素通道观察器：light DOM 里 oas-toggle-item 增删或属性/文本变化 → 重解析渲染 */
  private childObserver: MutationObserver | null = null
  /** 多选模式 roving tabindex 的焦点项下标 */
  private focusIndex = 0
  /** aria-invalid 由 status=error 联动写入的所有权标志：清理时只移除组件设置的，不动宿主自设 */
  private invalidByStatus = false

  /**
   * items 数据通道：Vue/React 模板渲染时 `items` 命中实例属性走 property 赋值，
   * setter 单向反射到 attribute（attribute 为唯一权威数据源），经 attributeChangedCallback
   * 走既有 parse/update 链路——与 table/select 的数据组件 JSON attribute 通道约定一致。
   */
  get items(): ToggleItem[] {
    return this.itemsList
  }
  set items(value: ToggleItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group"></div>
    `
  }

  /** 缓存节点引用 + 绑定键盘导航（render 与水合路径共用） */
  private bind(): void {
    this.group = this.shadow.querySelector('.group')
    this.group?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.group')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 子元素通道观察器（重连后重建；items 属性显式时子元素被忽略，观察器空转无副作用）
    this.ensureChildObserver()
    this.syncMeta()
    const multiple = this.hasAttr('multiple')
    const multipleChanged = multiple !== this.lastMultiple
    this.lastMultiple = multiple
    let itemsChanged: boolean
    // 双通道：items 属性显式设置时数据驱动优先；否则解析子元素收敛到同一 items 模型渲染。
    // items 通道沿用增量比对（原文未变化跳过全量重建）；子元素通道按结构签名比对，
    // 数据源切换（items ⇄ 子元素）由 lastItemsRaw/lastChildSig 互斥标记强制触发重建
    if (this.hasAttribute('items')) {
      const itemsRaw = this.getAttribute('items') ?? ''
      itemsChanged = itemsRaw !== this.lastItemsRaw
      this.lastItemsRaw = itemsRaw
      this.lastChildSig = ''
      this.parseItems()
    } else {
      const sig = this.childSig()
      itemsChanged = sig !== this.lastChildSig || this.lastItemsRaw !== null
      this.lastChildSig = sig
      this.lastItemsRaw = null
      this.parseChildItems()
    }
    if (itemsChanged || multipleChanged) {
      this.renderItems()
    } else {
      this.syncState()
    }
    this.enforceForce()
  }

  /** size/status/color/aria 等组级元数据镜像（每次 update 同步，供 CSS 与可访问性消费） */
  private syncMeta(): void {
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }
    // color 选中色（ui-spec §4.1 三级协议）：预设名 → preset token；字面色直接注入并计算实底文字色
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (PRESET_COLORS as readonly string[]).includes(color)
      const base = isPreset ? `var(--oas-preset-${color})` : color
      this.style.setProperty('--oas-toggle-color', base)
      const onColor = isPreset ? '' : pickOnColor(color)
      if (onColor) this.style.setProperty('--oas-toggle-on-color', onColor)
      else this.style.removeProperty('--oas-toggle-on-color')
    } else {
      this.style.removeProperty('--oas-toggle-color')
      this.style.removeProperty('--oas-toggle-on-color')
    }
    // 纵向语义同步给辅助技术（缺省不写，APG 默认即 horizontal）
    if (this.hasAttr('vertical')) this.group?.setAttribute('aria-orientation', 'vertical')
    else this.group?.removeAttribute('aria-orientation')
  }

  // ===== 子元素声明式通道 =====

  /** 子元素通道签名：轻量序列化 light DOM 数据载体（tag + 属性 + 文本），供增量比对跳过无变化重建 */
  private childSig(): string {
    const walk = (el: Element): string => {
      let s = `${el.tagName}:`
      for (const a of Array.from(el.attributes)) s += `${a.name}=${a.value};`
      s += `#${el.textContent ?? ''}`
      return s
    }
    return Array.from(this.children).map(walk).join('|')
  }

  /** 解析 light DOM 的 `<oas-toggle-item>` 数据载体为 ToggleItem[]（其余 light DOM 内容忽略） */
  private parseChildItems(): void {
    const items: ToggleItem[] = []
    for (const child of Array.from(this.children)) {
      if (child.tagName !== 'OAS-TOGGLE-ITEM') continue
      const item: ToggleItem = {
        label: this.childLabel(child),
        value: child.getAttribute('value') ?? '',
      }
      if (child.hasAttribute('disabled')) item.disabled = true
      const icon = child.getAttribute('icon')
      if (icon) item.icon = icon
      const ariaLabel = child.getAttribute('aria-label')
      if (ariaLabel) item.ariaLabel = ariaLabel
      items.push(item)
    }
    this.itemsList = items
  }

  /** 默认插槽 label 文本（trim） */
  private childLabel(el: Element): string {
    let text = ''
    for (const node of el.childNodes) {
      text += node.textContent ?? ''
    }
    return text.trim()
  }

  /**
   * 子元素通道观察器：只监听 light DOM 子元素（数据载体增删/属性/文本变化 → 重解析）。
   * 组件自身动作不写 light DOM，无需自引用守卫。
   */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver(() => {
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['value', 'disabled', 'slot', 'icon', 'aria-label'],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed
            .filter(
              (o): o is ToggleItem =>
                !!o &&
                typeof o === 'object' &&
                typeof (o as ToggleItem).value === 'string' &&
                (typeof (o as ToggleItem).label === 'string' || typeof (o as ToggleItem).icon === 'string'),
            )
            // label 归一化为常在字符串（icon-only 项缺省 ''），下游判定统一走真值
            .map((o) => ({ ...o, label: o.label ?? '' }))
        : []
    } catch {
      this.itemsList = []
    }
  }

  private selectedValues(): string[] {
    if (!this.hasAttr('multiple')) {
      const v = this.getAttr('value', '')
      return v ? [v] : []
    }
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private renderItems(): void {
    const group = this.group
    if (!group) return
    group.innerHTML = ''
    this.buttons = []
    const selected = this.selectedValues()
    this.focusIndex = this.resolveInitialFocus(selected)
    for (const item of this.itemsList) {
      const btn = document.createElement('button')
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.type = 'button'
      this.fillItemContent(btn, item)
      btn.addEventListener('click', () => this.selectItem(item))
      this.buttons.push(btn)
      group.appendChild(btn)
    }
    this.syncState()
  }

  /** 项内容填充：图标（iconRegistry 内联 SVG）+ 文本；icon-only 判定与可访问名称兜底 */
  private fillItemContent(btn: HTMLButtonElement, item: ToggleItem): void {
    const iconName = item.icon ?? ''
    const content = iconName ? iconRegistry[iconName as IconName] : undefined
    const hasIcon = content !== undefined
    const iconOnly = hasIcon && !item.label
    if (hasIcon) btn.classList.add('has-icon')
    if (iconOnly) btn.classList.add('icon-only')
    if (content) {
      const iconEl = document.createElement('span')
      iconEl.className = 'icon'
      iconEl.setAttribute('aria-hidden', 'true')
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', '0 0 16 16')
      svg.setAttribute('width', '1em')
      svg.setAttribute('height', '1em')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('focusable', 'false')
      svg.innerHTML = content
      iconEl.appendChild(svg)
      btn.appendChild(iconEl)
      if (item.label) {
        const labelEl = document.createElement('span')
        labelEl.textContent = item.label
        btn.appendChild(labelEl)
      }
    } else {
      btn.textContent = item.label ?? ''
    }
    // 可访问名称：项级 ariaLabel 覆盖 > label 可见文本（不设） > icon-only 兜底图标名
    const accessibleName = item.ariaLabel || (iconOnly ? iconName : '')
    if (accessibleName) btn.setAttribute('aria-label', accessibleName)
  }

  private resolveInitialFocus(selected: string[]): number {
    const idx = this.itemsList.findIndex((it) => it.value === selected[0])
    return idx >= 0 ? idx : 0
  }

  private syncState(): void {
    const group = this.group
    if (!group) return
    const multiple = this.hasAttr('multiple')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const hostDisabled = this.injectDisabled()
    group.setAttribute('role', multiple ? 'group' : 'radiogroup')
    group.setAttribute('aria-label', this.getAttr('aria-label', this.t('toggleGroup.group')))
    const selected = this.selectedValues()
    const limitReached = this.limitReached()
    this.buttons.forEach((btn, i) => {
      const item = this.itemsList[i]
      if (!item) return
      // max-count 达上限：未选项禁用置灰（已选项仍可取消），与选项自身 disabled 同视觉
      const disabledByLimit = !selected.includes(item.value) && limitReached
      const disabled = item.disabled || hostDisabled || disabledByLimit
      btn.setAttribute('role', multiple ? 'checkbox' : 'radio')
      btn.setAttribute('aria-checked', String(selected.includes(item.value)))
      btn.setAttribute('aria-disabled', String(disabled))
      if (disabled && !disabledByLimit) btn.tabIndex = -1
      else if (multiple) btn.tabIndex = i === this.focusIndex ? 0 : -1
      else btn.tabIndex = item.value === selected[0] ? 0 : -1
    })
  }

  /** mandatory 形态：缺席=关；空串/其他值=布尔（最后一项不可取消）；'force'=空态自动选第一项（蕴含布尔） */
  private isForce(): boolean {
    return this.hasAttribute('mandatory') && this.getAttr('mandatory') === 'force'
  }

  /** 多选上限（仅 multiple 生效；未设置/非法/<=0 视为无上限） */
  private maxLimit(): number | null {
    const n = Number(this.getAttr('max-count', ''))
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null
  }

  /** 多选已达上限（已选项仍可取消，未选项禁止新增） */
  private limitReached(): boolean {
    const max = this.maxLimit()
    return max !== null && this.hasAttr('multiple') && this.selectedValues().length >= max
  }

  /**
   * mandatory="force" 空态兜底：无有效选中（含 value 指向不存在项）时自动选第一个非禁用项。
   * 只回写 value 不派发 oas-change（非用户交互；attribute 为受控真相源）。
   * setAttribute 触发的二次 update 中已有选中，天然终止，无递归风险。
   */
  private enforceForce(): void {
    if (!this.isForce()) return
    const selected = this.selectedValues()
    const alive = selected.some((v) => this.itemsList.some((it) => it.value === v))
    if (alive) return
    const first = this.itemsList.find((it) => !it.disabled)
    if (!first) return
    if (this.hasAttr('multiple')) this.setAttribute('value', JSON.stringify([first.value]))
    else this.setAttribute('value', first.value)
  }

  private indexOfItem(item: ToggleItem): number {
    return this.buttons.findIndex((_b, i) => this.itemsList[i] === item)
  }

  private selectItem(item: ToggleItem): void {
    if (item.disabled || this.injectDisabled()) return
    if (this.hasAttr('multiple')) {
      const set = new Set(this.selectedValues())
      if (set.has(item.value)) {
        // mandatory（布尔/force）：多选最后一项不可取消
        if (set.size === 1 && this.hasAttribute('mandatory')) {
          this.focusIndex = this.indexOfItem(item)
          this.syncState()
          return
        }
        set.delete(item.value)
      } else {
        // max-count 达上限：未选项拒绝新增并派发 oas-exceed-limit
        if (this.limitReached()) {
          this.emit('exceed-limit', { value: item.value, max: this.maxLimit() })
          return
        }
        set.add(item.value)
      }
      const next = [...set]
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next })
    } else {
      if (this.getAttr('value') === item.value) return
      this.setAttribute('value', item.value)
      this.emit('change', { value: item.value })
    }
    this.focusIndex = this.indexOfItem(item)
    this.update()
  }

  private currentRadioIndex(): number {
    const selected = this.selectedValues()
    const idx = this.itemsList.findIndex((it) => it.value === selected[0])
    return idx >= 0 ? idx : 0
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    const multiple = this.hasAttr('multiple')

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.move(1, enabled)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.move(-1, enabled)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.activate(enabled[0]!)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.activate(enabled[enabled.length - 1]!)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      const idx = multiple ? this.focusIndex : this.currentRadioIndex()
      const item = items[idx]
      if (item) this.selectItem(item)
    }
  }

  /** 定点激活（Home/End）：单选即选中、多选移焦点（与方向键语义一致） */
  private activate(idx: number): void {
    const item = this.itemsList[idx]
    if (!item) return
    if (this.hasAttr('multiple')) {
      this.focusIndex = idx
      this.syncState()
    } else {
      this.selectItem(item)
    }
    this.buttons[idx]?.focus()
  }

  private move(dir: 1 | -1, enabled: number[]): void {
    const multiple = this.hasAttr('multiple')
    const curIdx = multiple ? this.focusIndex : this.currentRadioIndex()
    const cur = enabled.indexOf(curIdx)
    const next = enabled[(cur + dir + enabled.length) % enabled.length]
    if (next === undefined) return
    this.activate(next)
  }
}
