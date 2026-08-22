import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type MenuItemType = 'item' | 'group' | 'divider'

/** 叶子项语义类型：radio（默认，选中态打勾，参与 value）/ action（动作，无勾选态，不写回 value）/ checkbox（多选勾选，value 为数组勾选集） */
export type MenuItemKind = 'radio' | 'action' | 'checkbox'

export interface MenuItem {
  label?: string
  value?: string
  disabled?: boolean
  /** 加载中：渲染 spinner、禁点（点击/键盘/hover 均拦截），由数据驱动恢复 */
  loading?: boolean
  icon?: string
  /** 菜单项类型：普通项（默认）/ 分组 / 分隔线 */
  type?: MenuItemType
  /** 叶子项语义：radio（默认，可勾选）/ action（动作项，无勾选态、不写回 value）/ checkbox（多选勾选，value 数组勾选集） */
  kind?: MenuItemKind
  /** 破坏性项：红色语义（删除/退出等危险操作） */
  danger?: boolean
  /** 链接项：渲染 <a>（锚点语义，选中即跳转），搭配 target/rel */
  href?: string
  target?: string
  rel?: string
  /** 子菜单项，支持多级嵌套（任意层级）；group 的 children 平铺展示在同一层 */
  children?: MenuItem[]
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-1);
  min-width: 160px;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.menu {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  position: relative;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  display: flex;
  align-items: center;
  white-space: nowrap; /* 禁止中文菜单项逐字换行竖排 */
}
/* 标签占据中间剩余空间并左对齐，贴住左侧图标；右侧 arrow/check 靠右 */
.item .label {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.item:hover,
.item.active {
  background: var(--oas-color-bg-hover);
}
.item[aria-checked='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
/* loading 项：spinner + 弱化文字，光标 wait；点击/键盘由 JS 拦截（aria-disabled 语义同步） */
.item.loading {
  cursor: wait;
  opacity: 0.7;
}
.item.loading .label {
  color: var(--oas-color-text-secondary);
}
/* spinner：CSS 圆环旋转，占用图标位，跟随 secondary 色（light/dark token 自动适配） */
.spin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.9em;
  height: 0.9em;
  margin-right: var(--oas-space-2);
  flex-shrink: 0;
  border: 2px solid var(--oas-color-text-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  margin-right: var(--oas-space-2);
  flex-shrink: 0;
  color: inherit;
}
.icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.check {
  opacity: 0;
}
.item[aria-checked='true'] .check {
  opacity: 1;
}
/* checkbox 勾选框：与 radio 的 ✓ 区分——方块边框（未勾空框、勾选主色填充+✓） */
.check--box {
  width: 14px;
  height: 14px;
  border: 1px solid var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 1; /* checkbox 的框始终显示（区别于 radio 的 ✓ 仅勾选显示） */
}
.item[role='menuitemcheckbox'][aria-checked='true'] .check--box {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.item[role='menuitemcheckbox'][aria-checked='true'] .check--box::after {
  content: '✓';
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xs);
  line-height: 1;
}
/* danger 破坏性项：红色语义（文字+图标同色系，hover/active 加深） */
.item.danger {
  color: var(--oas-color-danger);
}
.item.danger:hover,
.item.danger.active {
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  color: var(--oas-color-danger);
}
/* max-height：长菜单内部滚动 */
:host([max-height]) .menu {
  overflow-y: auto;
  max-height: var(--oas-menu-max-height, none);
}
/* ===== inline 导航形态：子菜单就地展开（非浮出） ===== */
/* inline 展开容器：默认收起（grid-template-rows 0fr 过渡），open 展开（1fr） */
.inline-sub {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows var(--oas-transition-base) var(--oas-ease-out);
  /* 父项 li 是 flex 行（icon/label/arrow），inline-sub 作为其子元素须占满整行并换行到下方，
     否则会成为 flex 子项与 arrow 并排（子项跑到父项右侧） */
  flex: 1 1 100%;
  width: 100%;
}
.inline-sub > ul {
  min-height: 0;
  overflow: hidden;
  list-style: none;
  margin: 0;
  padding: 0;
}
.inline-sub.open {
  grid-template-rows: 1fr;
}
/* inline 父项允许换行：inline-sub（flex: 1 1 100%）换到父项内容下方 */
:host(.oas-menu--inline) .item {
  flex-wrap: wrap;
}
/* inline 子项缩进层级视觉 */
.inline-sub .item {
  padding-left: calc(var(--oas-space-4) + var(--oas-space-2));
}
/* inline 模式展开箭头：chevron-down 指示（就地展开方向） */
:host(.oas-menu--inline) .item[aria-haspopup] .arrow {
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
:host(.oas-menu--inline) .item.open .arrow {
  transform: rotate(90deg);
}
/* ===== 水平溢出收纳：超宽项收进「···」收纳子菜单 ===== */
/* 被收项在主流隐藏（data-collapsed），收纳子菜单里镜像显示 */
:host([mode='horizontal']) .item[data-collapsed] {
  display: none;
}
.menu-more {
  flex-shrink: 0;
}
.menu-more[hidden] {
  display: none;
}
/* 选中项被收纳时「···」高亮：与条上选中项（aria-checked=true）同风格 */
.menu-more.child-selected {
  color: var(--oas-color-primary);
  font-weight: 500;
}
/* 「···」弹层：右对齐其右缘（它在条末尾，向左开会超出容器右缘被 overflow-x:clip 裁掉）；
   且重置 color/font-weight——child-selected 的高亮色只作用于「···」本身，不继承进弹层镜像项。
   特异性须压过 :host([mode='horizontal']) .submenu-1（同为 (0,3,0)，源码序它更靠后会赢），
   用 .menu-more > .menu-more-sub 加子代组合升权。
   注意 color 必须用 --oas-color-text-primary（组件已有 token），
   勿用 --oas-color-text（无此 token，var 未定义会回退成继承色） */
:host([mode='horizontal']) .menu-more > .menu-more-sub {
  left: auto;
  right: 0;
  color: var(--oas-color-text-primary);
  font-weight: normal;
}
.arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  flex-shrink: 0;
}
.arrow svg {
  display: block;
  width: 1em;
  height: 1em;
}
/* 分组标题：小字次要色，不可点 */
.group {
  list-style: none;
  margin-top: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-3);
  cursor: default;
}
.group:first-child {
  margin-top: 0;
}
.group-label {
  display: block;
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
/* 分隔线：细分隔线，不可点 */
.divider {
  list-style: none;
  height: 1px;
  margin: var(--oas-space-1) 0;
  background: var(--oas-color-border);
  cursor: default;
}
/* 级联浮出子菜单：默认隐藏，父项 .open 时显示；独立浮层定位在父项右侧 */
.submenu {
  display: none;
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1);
  position: absolute;
  left: 100%;
  top: calc(-1 * var(--oas-space-1));
  min-width: 140px;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 10;
}
.item.open > .submenu {
  display: block;
}
/* 视口边界翻转（JS 检测后切类）：右侧空间不足向左展开、底部不足向上展开 */
.submenu.flip-left {
  left: auto;
  right: 100%;
}
.submenu.flip-up {
  top: auto;
  bottom: calc(-1 * var(--oas-space-1));
}
:host([mode='horizontal']) .submenu-1.flip-up {
  top: auto;
  bottom: calc(100% + var(--oas-space-1));
  margin-top: 0;
}
/* 水平模式：顶部导航条样式，菜单项横排 */
:host([mode='horizontal']) {
  display: inline-block;
  min-width: 0;
  padding: 0;
  border-radius: var(--oas-radius-lg);
}
:host([mode='horizontal']) .menu {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: var(--oas-space-1);
  /* 水平收纳前提：容器宽度受 host 约束（host 设宽度时 .menu 不超宽），超出项收进「···」。
     用 overflow-x: clip 而非 overflow:hidden——hidden 会双轴裁剪，把向下浮出的一级子菜单
     （及「···」收纳弹层）一并裁掉（display/rect 正常但视觉不可见）；clip 只裁横轴、纵轴放行 */
  max-width: 100%;
  overflow-x: clip;
  overflow-y: visible;
}
/* 水平模式一级子菜单向下浮出；二级及以上仍向右 */
:host([mode='horizontal']) .submenu-1 {
  top: 100%;
  left: 0;
  margin-top: var(--oas-space-1);
}
/* 收起态（仅 vertical）：菜单收窄只显示图标 */
:host(:not([mode='horizontal'])[collapsed]) {
  min-width: 0;
}
:host(:not([mode='horizontal'])[collapsed]) .item {
  justify-content: center;
  padding: var(--oas-space-2);
}
:host(:not([mode='horizontal'])[collapsed]) > .menu > .item > .label,
:host(:not([mode='horizontal'])[collapsed]) > .menu > .item > .arrow,
:host(:not([mode='horizontal'])[collapsed]) > .menu > .item > .check,
:host(:not([mode='horizontal'])[collapsed]) .group-label {
  display: none;
}
:host(:not([mode='horizontal'])[collapsed]) .item > .icon {
  margin-right: 0;
}
`

export class OASMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'mode', 'collapsed', 'theme', 'max-height', 'expanded', 'accordion']
  }

  private itemsList: MenuItem[] = []
  /** 当前键盘导航所在层级的祖先 value 链（空数组 = 顶层） */
  private activeStack: string[] = []
  private activeIndex = -1
  /** 已展开的子菜单 value 集合（单条展开路径） */
  private expanded = new Set<string>()
  private menuEl: HTMLElement | null = null
  /** typeahead 字符缓冲（连续输入定位匹配项） + 超时定时器 */
  private typeaheadBuffer = ''
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null
  /** 水平溢出收纳的 ResizeObserver（horizontal 模式容器宽度变化时重算收纳） */
  private overflowObserver: ResizeObserver | null = null
  /** 水平溢出收纳项「···」元素引用（渲染时捕获，syncOverflowCollapse 更新显隐与子菜单内容） */
  private moreItemEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <ul class="menu" part="menu" role="menu" tabindex="0"></ul>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    const menuEl = this.shadow.querySelector<HTMLElement>('.menu')!
    this.menuEl = menuEl
    menuEl.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 鼠标移出整个菜单时收起所有浮层
    menuEl.addEventListener('mouseleave', () => {
      if (this.expanded.size > 0) {
        this.expanded.clear()
        this.syncOpen()
      }
    })
    // 视口尺寸/滚动变化时重算子菜单翻转（仅展开态下有意义，浮层是瞬时的）
    const reposition = (): void => {
      if (this.expanded.size > 0) this.syncSubmenuPositions()
    }
    window.addEventListener('resize', reposition)
    this.onCleanup(() => window.removeEventListener('resize', reposition))
    window.addEventListener('scroll', reposition, true)
    this.onCleanup(() => window.removeEventListener('scroll', reposition, true))
    // 水平溢出收纳：horizontal 模式监听容器宽度变化，重算收纳
    if (typeof ResizeObserver !== 'undefined') {
      this.overflowObserver = new ResizeObserver(() => this.syncOverflowCollapse())
      this.overflowObserver.observe(this)
      this.onCleanup(() => this.overflowObserver?.disconnect())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（menu 列表存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.menu')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseItems()
    this.syncTheme()
    this.syncMaxHeight()
    this.syncInlineMode()
    this.syncExpandedAttr()
    this.renderItems()
    // 渲染后检测水平溢出收纳（horizontal 模式）；requestAnimationFrame 等布局完成
    // （update 在 render 后但 flex 布局可能未完成，clientWidth 此时不可靠）
    if (this.getAttr('mode') === 'horizontal') {
      requestAnimationFrame(() => this.syncOverflowCollapse())
    }
  }

  /** inline 模式类标记 + accordion 标记 */
  private syncInlineMode(): void {
    this.classList.toggle('oas-menu--inline', this.getAttr('mode') === 'inline')
    this.classList.toggle('oas-menu--accordion', this.hasAttr('accordion'))
  }

  /** expanded 受控：expanded 属性（JSON 数组）存在时驱动内部 expanded Set */
  private syncExpandedAttr(): void {
    const raw = this.getAttr('expanded', '')
    if (!raw) return // 非受控：内部管理
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.expanded = new Set(parsed.filter((v): v is string => typeof v === 'string'))
      }
    } catch {
      // 非法 JSON 忽略
    }
  }

  /** max-height 属性 → CSS 变量（数字补 px，其余原样） */
  private syncMaxHeight(): void {
    const raw = this.getAttr('max-height', '')
    if (raw) {
      const v = /^\d+$/.test(raw) ? `${raw}px` : raw
      this.style.setProperty('--oas-menu-max-height', v)
    } else {
      this.style.removeProperty('--oas-menu-max-height')
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i: MenuItem): i is MenuItem => {
            if (!i || typeof i !== 'object') return false
            if (i.type === 'divider') return true
            if (i.type === 'group') return Array.isArray(i.children)
            return typeof i.value === 'string'
          })
        : []
    } catch {
      this.itemsList = []
    }
    this.pruneState()
  }

  /** theme="dark" 时局部注入暗色 token（data-theme 到自身，子树继承），独立于全局主题 */
  private syncTheme(): void {
    if (this.getAttr('theme') === 'dark') {
      this.dataset.theme = 'dark'
    } else {
      delete this.dataset.theme
    }
  }

  /** 数据变化后清理失效的展开/导航状态 */
  private pruneState(): void {
    const valid = new Set<string>()
    const collect = (items: MenuItem[]): void => {
      for (const i of items) {
        if (i.value != null) valid.add(i.value)
        if (i.children) collect(i.children)
      }
    }
    collect(this.itemsList)
    for (const v of [...this.expanded]) {
      if (!valid.has(v)) this.expanded.delete(v)
    }
    this.activeStack = this.activeStack.filter((v) => valid.has(v))
    const items = this.currentItems()
    if (this.activeIndex >= items.length) this.activeIndex = items.length > 0 ? 0 : -1
  }

  /** 当前键盘导航层级的可导航项：group 内联展开、divider/组标题跳过 */
  private currentItems(): MenuItem[] {
    let items = this.itemsList
    for (const v of this.activeStack) {
      const parent = items.find((i) => i.value === v)
      if (!parent || !parent.children) return []
      items = parent.children
    }
    return this.flattenLevel(items)
  }

  /** 把一层菜单拍平成可导航项序列（group 子项就地展开，divider/组标题剔除） */
  private flattenLevel(items: MenuItem[]): MenuItem[] {
    const flat: MenuItem[] = []
    const walk = (list: MenuItem[]): void => {
      for (const i of list) {
        if (i.type === 'divider') continue
        if (i.type === 'group') {
          if (i.children) walk(i.children)
          continue
        }
        flat.push(i)
      }
    }
    walk(items)
    return flat
  }

  /** 从根到 value 的祖先链（含 value 自身）；无 value 的 group/divider 不进入链 */
  private chainOf(value: string): string[] {
    const chain: string[] = []
    const walk = (items: MenuItem[], trail: string[]): boolean => {
      for (const item of items) {
        if (item.value === value) {
          chain.push(...trail, value)
          return true
        }
        if (item.children) {
          const nextTrail = item.value != null ? [...trail, item.value] : trail
          if (walk(item.children, nextTrail)) return true
        }
      }
      return false
    }
    walk(this.itemsList, [])
    return chain
  }

  /** 全量渲染一次（含所有子菜单），显隐/激活由 class 控制，不随 hover 重建 */
  private renderItems(): void {
    const menuEl = this.menuEl
    if (!menuEl) return
    menuEl.innerHTML = ''
    this.renderLevel(menuEl, this.itemsList, '', 0)
    this.syncOpen()
    this.syncActive()
  }

  /**
   * 递归渲染一层菜单。scope = 叶子归属的 radio 组 id（最近 `type:"group"` 祖先的 value，
   * 无组为 ''）；group 递归时把组 id 传下去。
   */
  private renderLevel(
    container: HTMLElement,
    items: MenuItem[],
    scope: string,
    depth: number,
  ): void {
    const horizontal = this.getAttr('mode') === 'horizontal'
    const inline = this.getAttr('mode') === 'inline'
    for (const item of items) {
      if (item.type === 'divider') {
        const li = document.createElement('li')
        li.className = 'divider'
        li.setAttribute('part', 'divider')
        li.setAttribute('role', 'separator')
        li.setAttribute('aria-hidden', 'true')
        container.appendChild(li)
        continue
      }
      if (item.type === 'group') {
        const li = document.createElement('li')
        li.className = 'group'
        li.setAttribute('part', 'group')
        li.setAttribute('role', 'none')
        const label = document.createElement('span')
        label.className = 'group-label'
        label.textContent = item.label ?? ''
        li.appendChild(label)
        container.appendChild(li)
        // 组 id = 该 group 的 value；未声明 value 的 group 沿用外层作用域
        const nextScope = item.value != null ? item.value : scope
        // 组内子项平铺在同一个列表层级
        if (item.children) this.renderLevel(container, item.children, nextScope, depth)
        continue
      }
      // href 链接项：渲染 <a>（锚点语义：右键新窗口/中键/SEO）；否则 <li>
      const li = document.createElement(item.href ? 'a' : 'li') as HTMLElement
      li.className = 'item'
      li.setAttribute('part', 'item')
      if (item.href) {
        li.setAttribute('href', item.href)
        if (item.target) li.setAttribute('target', item.target)
        if (item.rel) li.setAttribute('rel', item.rel)
      }
      if (item.value != null) li.dataset.value = item.value
      const loading = item.loading ?? false
      const inert = item.disabled || loading
      li.setAttribute('aria-disabled', String(inert))
      // loading 态：aria-busy 同步 + .loading 类（spinner 视觉 + 禁点光标）
      if (loading) {
        li.classList.add('loading')
        li.setAttribute('aria-busy', 'true')
      }
      // 收起态（collapsed）下 label 隐藏，需以 aria-label 兜底可访问名称
      if (item.label) li.setAttribute('aria-label', item.label)
      const hasChildren = !!item.children && item.children.length > 0
      const action = !hasChildren && item.kind === 'action'
      // 组作用域标记：radio 叶子带所在组 id（无组为 ''）
      if (!hasChildren && !action) li.dataset.scope = scope
      if (loading) {
        // loading 项：spinner 替换图标位（若后续恢复，items 重建即还原 icon）
        const spin = document.createElement('span')
        spin.className = 'spin'
        spin.setAttribute('aria-hidden', 'true')
        li.appendChild(spin)
      } else if (item.icon) {
        const ic = this.createIcon(item.icon)
        if (ic) li.appendChild(ic)
      }
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.label ?? ''
      if (hasChildren) {
        li.setAttribute('role', 'menuitem')
        li.setAttribute('aria-haspopup', 'menu')
        li.setAttribute('aria-expanded', 'false')
        // 箭头用 SVG chevron（光学居中，避免文本字形偏下）
        const arrowName = horizontal && depth === 0 ? 'chevron-down' : 'chevron-right'
        const arrow = this.createIcon(arrowName, 'arrow')
        li.appendChild(label)
        if (arrow) li.appendChild(arrow)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled || item.loading) return
          this.toggleExpand(item.value ?? '')
        })
        li.addEventListener('mouseenter', () => {
          if (item.disabled || item.loading) return
          this.hoverExpand(item.value ?? '')
        })
        // 子菜单：inline 模式就地展开（inline-sub 容器，在父项 li 之后缩进展开）；
        // 非 inline 浮出（ul.submenu，显隐由 .open class 控制，hover 不重建 DOM）
        if (inline) {
          const subWrap = document.createElement('div')
          subWrap.className = 'inline-sub'
          subWrap.setAttribute('data-parent', item.value ?? '')
          // inline-sub 是结构包裹层（无 role）；role=menu 在内部 ul 上（aria-required-children：
          // role=menu 需 menuitem 子元素，包裹层 div 不应冒充 menu）
          const subUl = document.createElement('ul')
          subUl.setAttribute('role', 'menu')
          this.renderLevel(subUl, item.children!, '', depth + 1)
          subWrap.appendChild(subUl)
          li.appendChild(subWrap)
        } else {
          const sub = document.createElement('ul')
          sub.className = depth === 0 ? 'submenu submenu-1' : 'submenu'
          sub.setAttribute('part', 'submenu')
          sub.setAttribute('role', 'menu')
          this.renderLevel(sub, item.children!, '', depth + 1)
          li.appendChild(sub)
        }
      } else {
        const action = item.kind === 'action'
        const checkbox = item.kind === 'checkbox'
        // role：action=menuitem（无勾选态）/ checkbox=menuitemcheckbox / radio（默认）=menuitemradio
        li.setAttribute('role', action ? 'menuitem' : checkbox ? 'menuitemcheckbox' : 'menuitemradio')
        // danger 破坏性项：红色语义
        if (item.danger) li.classList.add('danger')
        if (!action) {
          li.setAttribute('aria-checked', String(checkbox ? this.isChecked(item.value) : item.value === this.selectedValueOf(scope)))
          const check = document.createElement('span')
          check.className = checkbox ? 'check check--box' : 'check'
          check.textContent = checkbox ? '' : '✓'
          li.appendChild(check)
        }
        li.append(label)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled || item.loading) return
          this.select(item, scope)
        })
        li.addEventListener('mouseenter', () => {
          if (item.disabled || item.loading) return
          this.hoverExpand(item.value ?? '')
        })
      }
      container.appendChild(li)
    }
    // 水平溢出收纳：horizontal 顶层末尾渲染「···」收纳项（menu-more），子菜单是被收项镜像
    if (horizontal && depth === 0) {
      const moreLi = document.createElement('li')
      moreLi.className = 'item menu-more'
      moreLi.setAttribute('part', 'item')
      moreLi.setAttribute('role', 'menuitem')
      moreLi.setAttribute('aria-haspopup', 'menu')
      moreLi.setAttribute('aria-expanded', 'false')
      moreLi.dataset.value = '__more__' // 收纳项固定 value（syncOpen 按此同步展开态）
      moreLi.setAttribute('aria-label', this.t('menu.more'))
      moreLi.hidden = true // 默认隐藏，溢出时 syncOverflowCollapse 显示
      const moreLabel = document.createElement('span')
      moreLabel.className = 'label'
      moreLabel.textContent = '···'
      moreLi.appendChild(moreLabel)
      const moreArrow = this.createIcon('chevron-down', 'arrow')
      if (moreArrow) moreLi.appendChild(moreArrow)
      const moreSub = document.createElement('ul')
      moreSub.className = 'submenu submenu-1 menu-more-sub'
      moreSub.setAttribute('role', 'menu')
      moreLi.appendChild(moreSub)
      moreLi.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        this.toggleExpand('__more__')
      })
      moreLi.addEventListener('mouseenter', () => this.hoverExpand('__more__'))
      container.appendChild(moreLi)
      this.moreItemEl = moreLi
    }
  }

  /** 用 iconRegistry 渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string, className = 'icon'): HTMLElement | null {
    const content = iconRegistry[icon as IconName]
    if (!content) return null
    const span = document.createElement('span')
    span.className = className
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML = content
    span.appendChild(svg)
    return span
  }

  /** 展开状态 → .open class（不重建 DOM） */
  private syncOpen(): void {
    if (!this.menuEl) return
    for (const li of this.menuEl.querySelectorAll<HTMLElement>('[part="item"][data-value]')) {
      const open = this.expanded.has(li.dataset.value ?? '')
      li.classList.toggle('open', open)
      if (open) li.setAttribute('aria-expanded', 'true')
      else if (li.hasAttribute('aria-haspopup')) li.setAttribute('aria-expanded', 'false')
    }
    // inline 模式：inline-sub 就地展开容器显隐（expanded 含父 value 时展开）
    for (const sub of this.menuEl.querySelectorAll<HTMLElement>('.inline-sub')) {
      const open = this.expanded.has(sub.dataset.parent ?? '')
      sub.classList.toggle('open', open)
    }
    this.syncSubmenuPositions()
  }

  /**
   * 子菜单视口边界翻转：父项右侧剩余空间不足时向左展开（flip-left）、
   * 底部空间不足时向上展开（flip-up）。翻转由样式表类表达，本方法只做测量与切类。
   * 多级嵌套逐级检测：querySelectorAll 按 DOM 序遍历（外层先于内层），外层翻转先生效，
   * 内层 rect 反映翻转后的真实布局，因此第三级及以上同样逐级判定。
   */
  private syncSubmenuPositions(): void {
    if (!this.menuEl) return
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    for (const item of this.menuEl.querySelectorAll<HTMLElement>('.item.open')) {
      const sub = item.querySelector<HTMLElement>(':scope > .submenu')
      if (!sub) continue
      const itemRect = item.getBoundingClientRect()
      const subRect = sub.getBoundingClientRect()
      sub.classList.toggle('flip-left', itemRect.right + subRect.width > vw - margin)
      // 重新测量（水平翻转已生效），垂直向同样按实际布局判定
      const subRectV = sub.getBoundingClientRect()
      sub.classList.toggle('flip-up', subRectV.bottom > vh - margin)
    }
  }

  /** 键盘激活态 → .active class（不重建 DOM） */
  private syncActive(): void {
    if (!this.menuEl) return
    for (const li of this.menuEl.querySelectorAll<HTMLElement>('.item.active')) {
      li.classList.remove('active')
    }
    const current = this.currentItems()[this.activeIndex]
    if (!current || current.value == null) return
    const el = this.menuEl.querySelector<HTMLElement>(
      `[part="item"][data-value="${current.value}"]`,
    )
    el?.classList.add('active')
  }

  private select(item: MenuItem, scope = ''): void {
    // action 项：动作语义，不参与 value 选中态（不写回、不打勾），只通知宿主
    if (item.kind === 'action') {
      this.emit('select', { value: item.value, kind: 'action' })
    } else if (item.kind === 'checkbox') {
      // checkbox 项：多选勾选集，value 为 JSON 数组；点击切换存留
      const checked = this.checkedSet()
      const v = item.value ?? ''
      if (checked.has(v)) checked.delete(v)
      else checked.add(v)
      this.setAttribute('value', JSON.stringify([...checked]))
      this.emit('select', { value: item.value, checked: checked.has(v) })
    } else {
      const next = this.writeValue(scope, item.value ?? '')
      this.setAttribute('value', next)
      this.emit('select', { value: item.value })
    }
    // 级联浮出菜单惯例：选中叶子项后收回所有展开的子菜单（展开态是临时的）
    if (this.expanded.size > 0) {
      this.expanded.clear()
      this.syncOpen()
    }
  }

  /** checkbox 勾选集（value 为 JSON 数组时解析，否则空集） */
  private checkedSet(): Set<string> {
    const raw = this.getAttr('value', '')
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === 'string'))
    } catch {
      // 非数组：空勾选集
    }
    return new Set()
  }

  /** checkbox 项是否勾选（在勾选集内） */
  private isChecked(value: string | undefined): boolean {
    return value != null && this.checkedSet().has(value)
  }

  /** value 属性 → 组作用域映射。value 为 JSON 对象时按组 id 拆开，否则视为根作用域（''）单值。 */
  private valueMap(): Record<string, string> {
    const raw = this.getAttr('value', '')
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const map: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') map[k] = v
        }
        return map
      }
    } catch {
      // 非 JSON：视为纯字符串值，走根作用域
    }
    return { '': raw }
  }

  /** 指定作用域的当前选中值（未选中返回 ''） */
  private selectedValueOf(scope: string): string {
    return this.valueMap()[scope] ?? ''
  }

  /** 写回某个作用域的选中值；若组件 value 当前已是 JSON 对象则原位更新该组，否则整体转成 JSON 对象 */
  private writeValue(scope: string, value: string): string {
    const map = this.valueMap()
    if (scope === '' && Object.keys(map).length === 1 && '' in map) {
      return value // 根作用域单值：保持纯字符串形态
    }
    if (scope !== '' && Object.keys(map).length === 1 && '' in map) {
      // 由纯字符串形态首次写入组作用域：转 JSON 对象（保留原根值或忽略）
      return JSON.stringify({ ...map, [scope]: value })
    }
    const next = { ...map }
    if (scope === '') delete next[''] // 根作用域不参与 JSON 形态
    next[scope] = value
    return JSON.stringify(next)
  }

  /** hover：级联展开到该项所在的单条路径（同级互斥），只切 class 不重建 */
  private hoverExpand(value: string): void {
    if (!value) return
    // inline 模式是 click-to-expand（就地展开），hover 不展开——否则悬停先展开、点击又收起，
    // 鼠标用户永远展不开（hoverExpand 与 toggleExpand 相互抵消）
    if (this.getAttr('mode') === 'inline') return
    const chain = this.chainOf(value)
    if (chain.length === 0) return
    const item = this.findItem(value)
    const open = item?.children?.length ? chain : chain.slice(0, -1)
    const next = new Set(open)
    if (next.size === this.expanded.size && [...next].every((v) => this.expanded.has(v))) return
    this.expanded = next
    this.syncOpen()
  }

  /** 点击：展开/收起子菜单 */
  private toggleExpand(value: string): void {
    // 水平收纳项「···」：非数据项，直接切换其展开态（不走 chainOf——不在 items 树里）
    if (value === '__more__') {
      const next = new Set(this.expanded)
      const willExpandMore = !next.has('__more__')
      if (willExpandMore) next.add('__more__')
      else next.delete('__more__')
      this.expanded = next
      this.emit('expand-change', { expanded: [...this.expanded], value, isExpanded: willExpandMore })
      this.syncOpen()
      return
    }
    const inline = this.getAttr('mode') === 'inline'
    const accordion = this.hasAttr('accordion')
    let willExpand: boolean
    if (inline) {
      // inline 多点展开集合：切换该项展开态；accordion 同级互斥（展开一个收起其他同级）
      const next = new Set(this.expanded)
      if (next.has(value)) {
        next.delete(value)
        willExpand = false
      } else {
        if (accordion) {
          // 同级互斥：收起与该 value 同级的其他展开项
          const siblings = this.siblingValuesOf(value)
          for (const s of siblings) next.delete(s)
        }
        next.add(value)
        willExpand = true
      }
      this.expanded = next
    } else {
      // 浮出模式：单条展开路径（现状）
      if (this.expanded.has(value)) {
        this.expanded = new Set(this.chainOf(value).slice(0, -1))
        willExpand = false
      } else {
        this.expanded = new Set(this.chainOf(value))
        willExpand = true
      }
    }
    // oas-expand-change：展开状态变化时派发（受控/非受控都派发；受控时宿主据此更新 expanded 属性）
    this.emit('expand-change', { expanded: [...this.expanded], value, isExpanded: willExpand })
    this.syncOpen()
  }

  /** 该 value 同级（同一父级 children 里）的其他有子菜单项的 value 集合（手风琴互斥用） */
  private siblingValuesOf(value: string): string[] {
    const chain = this.chainOf(value)
    const parentChain = chain.slice(0, -1)
    // 找父级的 children
    let levelItems = this.itemsList
    for (const ancestorValue of parentChain) {
      const found = levelItems.find((i) => i.value === ancestorValue)
      levelItems = found?.children ?? []
    }
    return levelItems.filter((i) => i.children?.length && i.value !== value).map((i) => i.value ?? '')
  }

  /** 水平溢出收纳：horizontal 模式容器宽度不足时，超宽项收进末尾「···」收纳子菜单 */
  private syncOverflowCollapse(): void {
    if (this.getAttr('mode') !== 'horizontal') return
    const menuEl = this.menuEl
    if (!menuEl) return
    // 顶层项（排除收纳项本身——它是镜像容器不是数据项；曾误纳入计算致自己被 data-collapsed 隐藏）
    const topItems = [...menuEl.querySelectorAll<HTMLElement>(':scope > [part="item"][data-value]:not(.menu-more)')]
    if (topItems.length === 0) return
    const moreItem = this.moreItemEl ?? menuEl.querySelector<HTMLElement>('.menu-more')
    // 先复位再测量：collapsed 项 display:none 宽为 0，收纳项隐藏时也不占宽，
    // 直接量会把「已收纳状态」误判成「无溢出」（RO 再次触发时全部弹回）
    topItems.forEach((t) => t.removeAttribute('data-collapsed'))
    if (moreItem) moreItem.hidden = true
    // 显示收纳项量出其宽度（有溢出时它要占位，可用宽度须扣除；无溢出最后会再隐藏）
    let moreWidth = 0
    if (moreItem) {
      moreItem.hidden = false
      moreWidth = moreItem.offsetWidth
      moreItem.hidden = true
    }
    const avail = menuEl.clientWidth
    // 累积宽度，超出可用宽度的标记 data-collapsed
    let acc = 0
    let firstOverflow = -1
    topItems.forEach((t, i) => {
      acc += t.offsetWidth
      if (firstOverflow === -1 && acc > avail) firstOverflow = i
    })
    let hasOverflow = firstOverflow !== -1
    if (hasOverflow && moreWidth > 0) {
      // 有溢出：收纳项自身占 moreWidth，重算首个溢出项（可用宽度 - 收纳项宽）
      const avail2 = avail - moreWidth
      acc = 0
      firstOverflow = -1
      topItems.forEach((t, i) => {
        acc += t.offsetWidth
        if (firstOverflow === -1 && acc > avail2) firstOverflow = i
      })
      if (firstOverflow === -1) firstOverflow = topItems.length - 1 // 兜底：至少收一项腾位
    }
    topItems.forEach((t, i) => {
      t.toggleAttribute('data-collapsed', hasOverflow && i >= firstOverflow)
    })
    // 收纳项「···」显隐 + 子菜单内容（被收项镜像，点击激活对应 value）
    if (!moreItem) return
    moreItem.hidden = !hasOverflow
    const moreSub = moreItem.querySelector<HTMLElement>('.menu-more-sub')
    if (moreSub && hasOverflow) {
      moreSub.innerHTML = ''
      const collapsed = topItems.filter((t) => t.hasAttribute('data-collapsed'))
      for (const t of collapsed) {
        const value = t.getAttribute('data-value') ?? ''
        const item = this.findItem(value)
        if (!item) continue
        const li = document.createElement('li')
        li.className = 'item'
        li.setAttribute('part', 'item')
        // 镜像项与主流一致的 radio 语义：role=menuitemradio + aria-checked + 前导 ✓
        // （选中收纳项后弹层内可见选中态，否则用户在弹层里得不到任何反馈）
        li.setAttribute('role', 'menuitemradio')
        li.setAttribute('aria-checked', String(value === this.selectedValueOf('')))
        li.setAttribute('data-value', value)
        const check = document.createElement('span')
        check.className = 'check'
        check.textContent = '✓'
        li.appendChild(check)
        const label = document.createElement('span')
        label.className = 'label'
        label.textContent = item.label ?? value
        li.appendChild(label)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled || item.loading) return
          this.select(item, '')
        })
        moreSub.appendChild(li)
      }
    }
    // 「···」高亮：当前选中项被收纳时，收纳项显示选中态（选中项在溢出弹层里，
    // 条上看不到 ✓，由收纳指示器本身高亮表达"选中项在其中"）+ aria-current 供读屏
    const selectedInside =
      hasOverflow && !!this.selectedValueOf('') &&
      topItems.some((t) => t.hasAttribute('data-collapsed') && t.dataset.value === this.selectedValueOf(''))
    moreItem.classList.toggle('child-selected', selectedInside)
    if (selectedInside) moreItem.setAttribute('aria-current', 'true')
    else moreItem.removeAttribute('aria-current')
  }

  private findItem(value: string): MenuItem | undefined {
    let found: MenuItem | undefined
    const walk = (items: MenuItem[]): void => {
      for (const item of items) {
        if (item.value === value) found = item
        else if (item.children) walk(item.children)
      }
    }
    walk(this.itemsList)
    return found
  }

  /** 键盘进入子菜单：展开并高亮第一个可用子项 */
  private enterSubmenu(item: MenuItem): void {
    this.activeStack.push(item.value ?? '')
    this.expanded = new Set(this.activeStack)
    const children = this.currentItems()
    const firstEnabled = children.findIndex((c) => !c.disabled && !c.loading)
    this.activeIndex = firstEnabled >= 0 ? firstEnabled : 0
  }

  /** 键盘返回父级：收起子菜单并高亮父级项 */
  private leaveSubmenu(): void {
    const value = this.activeStack.pop()
    this.expanded = new Set(this.activeStack)
    const parentLevel = this.currentItems()
    this.activeIndex = parentLevel.findIndex((i) => i.value === value)
  }

  private moveActive(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (this.activeIndex < 0) {
      this.activeIndex = dir === 1 ? enabled[0]! : enabled[len - 1]!
      return
    }
    const cur = enabled.indexOf(this.activeIndex)
    this.activeIndex = enabled[(cur + dir + len) % len]!
  }

  private handleKey(e: KeyboardEvent): void {
    const items = this.currentItems()
    const enabled = items
      .map((i, idx) => (i.disabled || i.loading ? -1 : idx))
      .filter((i) => i >= 0)
    if (enabled.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(enabled, 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(enabled, -1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (active && !active.disabled && !active.loading && active.children?.length) {
        this.enterSubmenu(active)
      } else {
        this.moveActive(enabled, 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (this.activeStack.length > 0) {
        this.leaveSubmenu()
      } else {
        this.moveActive(enabled, -1)
      }
    } else if (e.key === 'Enter') {
      const active = items[this.activeIndex]
      if (!active) return
      e.preventDefault()
      if (active.disabled || active.loading) return
      if (active.children?.length) {
        this.enterSubmenu(active)
      } else {
        const activeEl = this.menuEl!.querySelector<HTMLElement>(
          `[part="item"][data-value="${active.value}"]`,
        )
        this.select(active, activeEl?.dataset.scope ?? '')
      }
    } else if (e.key === 'Home') {
      this.activeIndex = enabled[0]!
    } else if (e.key === 'End') {
      this.activeIndex = enabled[enabled.length - 1]!
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // typeahead：可打印字符跳转匹配 label 的项（连续字符缓冲 + 超时重置）
      e.preventDefault()
      this.typeahead(e.key)
    } else {
      return
    }
    this.syncOpen()
    this.syncActive()
  }

  /** typeahead：缓冲字符序列，跳转当前层 label 匹配的项（startsWith 优先，includes 兜底），超时 500ms 重置 */
  private typeahead(char: string): void {
    this.typeaheadBuffer += char.toLowerCase()
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer)
    this.typeaheadTimer = setTimeout(() => {
      this.typeaheadBuffer = ''
    }, 500)
    const items = this.currentItems()
    const buf = this.typeaheadBuffer
    // 匹配：label startsWith 优先，无则 includes
    const match = (pred: (s: string) => boolean) =>
      items.findIndex((i) => !i.disabled && !i.loading && i.label && pred(i.label.toLowerCase()))
    let idx = match((s) => s.startsWith(buf))
    if (idx === -1) idx = match((s) => s.includes(buf))
    if (idx === -1) return
    this.activeIndex = idx
    const item = items[idx]
    if (item) {
      const el = this.menuEl!.querySelector<HTMLElement>(`[part="item"][data-value="${item.value}"]`)
      el?.focus({ preventScroll: true })
    }
  }
}
