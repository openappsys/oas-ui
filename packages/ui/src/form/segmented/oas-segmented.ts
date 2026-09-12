import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface SegmentedOption {
  label: string
  value: string
  disabled?: boolean
  /** 选项图标（oas-icons 图标名），渲染在文本前；label 省略时为仅图标形态 */
  icon?: string
}

/** size 尺寸档（对齐 select/input：small/medium/large，控高走 --oas-control-height-* token） */
const VALID_SIZES = ['small', 'medium', 'large'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return valid.includes(raw) ? raw : fallback
}

/** 图标名是否可渲染（未注册名不渲染，与 tag 的 icon 通道一致） */
function isValidIcon(name: string): boolean {
  return name !== '' && iconRegistry[name as IconName] !== undefined
}

/** 图标名转可读文本（oas-icons 图标名即语义名；连字符转空格），仅图标形态的 aria-label 兜底 */
function iconToReadable(name: string): string {
  return name.replace(/-/g, ' ')
}

/** radio 组名：无宿主 name 时自动生成（确定性计数器，多实例不冲突） */
let segIdCounter = 0

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 尺寸档内部变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_ch: var(--oas-control-height-sm);
  --_fs: var(--oas-font-size-sm);
  --_pad: var(--oas-space-3);
}
:host([data-size='medium']) {
  --_ch: var(--oas-control-height-md);
  --_fs: var(--oas-font-size-md);
}
:host([data-size='large']) {
  --_ch: var(--oas-control-height-lg);
  --_fs: var(--oas-font-size-lg);
  --_pad: var(--oas-space-4);
}
:host([hidden]) {
  display: none;
}
/* block：铺满父宽，选项等分（flex: 1） */
:host([block]) {
  display: block;
  width: 100%;
}
/* 轨道容器：relative 锚定滑动指示器 */
.group {
  position: relative;
  display: inline-flex;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-md);
  gap: var(--oas-space-1);
  box-sizing: border-box;
}
:host([block]) .group {
  display: flex;
  width: 100%;
}
:host([data-direction='vertical']) .group {
  flex-direction: column;
  align-items: stretch;
}
/* 滑动指示器：绝对定位 + transform 位移过渡（JS 只写 translate/width/height；
   首帧定位不动画（.animated 在首次定位后的下一帧才挂上），之后选中切换时滑动 */
.indicator {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  background: var(--oas-color-bg-elevated);
  border-radius: var(--oas-radius-sm);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
:host(.animated) .indicator {
  transition: transform var(--oas-transition-base) var(--oas-ease-out),
    width var(--oas-transition-base) var(--oas-ease-out),
    height var(--oas-transition-base) var(--oas-ease-out);
}
.indicator[hidden] {
  display: none;
}
/* 选项：原生 label 包裹隐藏 radio（点击 label 即切换；键盘/语义由 radio 底座承载） */
.item {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  height: var(--_ch);
  padding-inline: var(--_pad);
  border-radius: var(--oas-radius-sm);
  font-size: var(--_fs);
  font-family: inherit;
  cursor: pointer;
  color: var(--oas-color-text-primary);
  transition: color var(--oas-transition-fast) var(--oas-ease-out);
}
:host([block]) .item {
  flex: 1;
}
.item:hover {
  color: var(--oas-color-primary);
}
.item.checked {
  font-weight: 500;
}
.item.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.item.disabled:hover {
  color: var(--oas-color-text-primary);
}
/* 仅图标形态：收窄内边距、以控高为最小宽度（防宽度塌陷） */
.item.icon-only {
  padding-inline: calc(var(--_pad) - var(--oas-space-2));
  min-width: var(--_ch);
}
/* 焦点环画在选项上（视觉隐藏的 radio 保持可聚焦，:has 精确到 focus-visible） */
.item:has(.input:focus-visible) {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 原生 radio 底座：视觉隐藏但保持可聚焦/可编程点击（opacity/尺寸归零，非 display:none） */
.input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
}
.item-label {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  line-height: 1.2;
  white-space: nowrap;
}
.item-icon {
  display: inline-flex;
  align-items: center;
}
.item-icon oas-icon {
  font-size: 1em;
}
`

export class OASSegmented extends OASElement {
  static override get observedAttributes(): string[] {
    return ['options', 'value', 'disabled', 'disabled-skip', 'size', 'block', 'direction', 'name', 'readonly']
  }

  private optionsList: SegmentedOption[] = []
  /** 选项重建签名：options 原文 + option slot 模板在场状态（变化才重建，value 变化只增量同步） */
  private lastSignature = ''
  /** 自动生成的 radio 组名（宿主未设 name 时使用，实例内稳定） */
  private uid = `oas-seg-${++segIdCounter}`
  /** 指示器是否已过首帧（首帧定位不动画） */
  private animated = false
  /** 指示器几何写入门禁缓存：同值跳过（防「写 style → 触发 RO → 再写」回环） */
  private lastIndicatorBox = ''
  /** light DOM 观察器：template[slot="option"] 增删 → 重建选项 */
  private childObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group" role="radiogroup">
        <div class="indicator" part="indicator" hidden></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定键盘/观察器（render 与水合路径共用；选项事件在重建时绑定） */
  private bind(): void {
    const group = this.shadow.querySelector<HTMLElement>('.group')
    group?.addEventListener('keydown', (e) => this.handleGroupKey(e as KeyboardEvent))

    // option slot 模板增删 → 重建（模板在 light DOM，选项内容渲染时克隆）
    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.update())
      observer.observe(this, { childList: true, subtree: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
    // 容器尺寸变化 → 重定位指示器（block 铺满/字体加载等引起的布局变化）
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.syncSelection())
      if (group) ro.observe(group)
      this.resizeObserver = ro
      this.onCleanup(() => {
        ro.disconnect()
        this.resizeObserver = null
      })
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.group')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    const group = this.shadow.querySelector('.group')
    if (!group) return
    // 宿主态镜像：size（就近读取注入）/ direction / readonly
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const direction = normalizeChoice(this.getAttr('direction', 'horizontal'), 'horizontal', ['horizontal', 'vertical'])
    this.setAttribute('data-direction', direction)
    group.setAttribute('aria-orientation', direction)
    if (this.hasAttr('readonly')) group.setAttribute('aria-readonly', 'true')
    else group.removeAttribute('aria-readonly')

    // 选项重建：options 原文或 option slot 模板在场状态变化才重建；value 变化走增量同步
    const signature = this.renderSignature()
    if (signature !== this.lastSignature) {
      this.rebuildItems()
      this.lastSignature = signature
    }
    this.syncSelection()
  }

  /** 重建签名：options 属性原文 + option slot 模板是否在场 */
  private renderSignature(): string {
    const tpl = this.querySelector('template[slot="option"]') ? '1' : '0'
    return `${this.getAttr('options', '[]')}|${tpl}`
  }

  /** 全量重建选项（仅 options/slot 模板变化时；value 变化不走到这里——增量同步） */
  private rebuildItems(): void {
    const group = this.shadow.querySelector('.group')
    if (!group) return
    for (const item of [...group.querySelectorAll('.item')]) item.remove()
    const name = this.radioName()
    const tpl = this.querySelector('template[slot="option"]')
    for (const option of this.optionsList) {
      group.appendChild(this.buildItem(option, name, tpl))
    }
  }

  private buildItem(option: SegmentedOption, name: string, tpl: Element | null): HTMLLabelElement {
    const item = document.createElement('label')
    const icon = option.icon ?? ''
    const iconOnly = option.label === '' && icon !== ''
    item.className = `item${iconOnly ? ' icon-only' : ''}`
    item.setAttribute('part', 'item')
    item.dataset.value = option.value

    // 原生 radio 底座：隐藏但可聚焦；name 成组（箭头键盘/表单语义的原生承载）
    const input = document.createElement('input')
    input.type = 'radio'
    input.className = 'input'
    input.name = name
    input.value = option.value
    input.tabIndex = -1
    // 仅图标形态：icon 名转可读文本兜底可访问名称（需要更精确名称时宿主给 label 字段）
    if (iconOnly) input.setAttribute('aria-label', iconToReadable(icon))
    item.appendChild(input)

    const lab = document.createElement('span')
    lab.className = 'item-label'
    if (tpl instanceof HTMLTemplateElement) {
      // 自定义选项渲染：克隆模板，[data-option-label] 绑定选项文本（对齐 select 的 option slot 惯例）
      lab.appendChild(tpl.content.cloneNode(true))
      const binder = lab.querySelector('[data-option-label]')
      if (binder) binder.textContent = option.label
    } else {
      if (isValidIcon(icon)) {
        const iconEl = document.createElement('span')
        iconEl.className = 'item-icon'
        iconEl.innerHTML = `<oas-icon name="${icon}"></oas-icon>`
        lab.appendChild(iconEl)
      }
      const text = document.createElement('span')
      text.className = 'label-text'
      text.textContent = option.label
      lab.appendChild(text)
    }
    item.appendChild(lab)

    // 点击：label/input 任一路径收敛（原生 label 激活转发的 click 会再次进入，selectValue 幂等）
    item.addEventListener('click', (e) => {
      if (this.hasAttr('readonly') || this.injectDisabled() || option.disabled) {
        e.preventDefault() // 阻断原生 label 激活/radio 勾选
        return
      }
      this.selectValue(option.value)
    })
    // 原生 change（键盘 Space 激活等路径）：同样收敛到 selectValue
    input.addEventListener('change', () => this.selectValue(option.value))
    return item
  }

  /** radio 组名：宿主 name 属性优先（透传表单关联），否则实例内稳定的自动生成名 */
  private radioName(): string {
    return this.getAttr('name', '') || this.uid
  }

  /** 当前生效值：value 属性缺省回落第一项（radio 派必有选中项） */
  private currentValue(): string {
    const v = this.getAttr('value', '')
    if (v !== '') return v
    return this.optionsList[0]?.value ?? ''
  }

  /** 选中值统一入口：readonly/禁用拦截、同值幂等（跳过）；通过后写 value 属性 + 派发 oas-change */
  private selectValue(value: string): void {
    if (this.hasAttr('readonly') || this.injectDisabled()) {
      this.syncSelection()
      return
    }
    if (value === this.currentValue()) {
      this.syncSelection()
      return
    }
    const option = this.optionsList.find((o) => o.value === value)
    if (!option || option.disabled) {
      this.syncSelection()
      return
    }
    this.setAttribute('value', value)
    this.emit('change', { value })
    this.syncSelection()
  }

  /** 选中态增量同步（不重建 DOM）：checked/disabled/roving tabindex/aria + 指示器定位 */
  private syncSelection(): void {
    const group = this.shadow.querySelector('.group')
    if (!group) return
    const value = this.currentValue()
    const hostDisabled = this.injectDisabled()
    const name = this.radioName()
    let checkedItem: HTMLElement | null = null
    for (const item of [...group.querySelectorAll<HTMLElement>('.item')]) {
      const v = item.dataset.value ?? ''
      const option = this.optionsList.find((o) => o.value === v)
      const disabled = hostDisabled || option?.disabled === true
      const input = item.querySelector<HTMLInputElement>('input.input')
      const checked = v === value
      if (input) {
        input.name = name
        input.disabled = disabled
        input.checked = checked
        input.tabIndex = checked ? 0 : -1
      }
      item.classList.toggle('checked', checked)
      item.classList.toggle('disabled', disabled)
      // 视觉态只走 .checked/.disabled 类；aria-checked 不写 label（label 无 role，axe aria-allowed-attr
      // 违规——AP 语义由内部原生 radio input 的 checked 承载），aria-disabled 全局状态属性保留
      item.setAttribute('aria-disabled', String(disabled))
      if (checked) checkedItem = item
    }
    this.positionIndicator(checkedItem)
  }

  /** 指示器定位：贴齐选中项（offsetLeft/Top/Width/Height 相对 .group）；首帧不动画。
   *  几何同值门禁：RO 回调（容器 resize → syncSelection → 此处）在几何未变时零写入——
   *  结构性封死「写 style → 改变观测尺寸 → 再触发 RO」的回环（指示器本为 absolute 不影响
   *  布局，此门禁为样式异常/降级场景下的兜底保险）。 */
  private positionIndicator(item: HTMLElement | null): void {
    const indicator = this.shadow.querySelector<HTMLElement>('.indicator')
    if (!indicator) return
    if (!item) {
      indicator.hidden = true
      this.lastIndicatorBox = ''
      return
    }
    const box = `${item.offsetWidth}x${item.offsetHeight}@${item.offsetLeft},${item.offsetTop}`
    if (!indicator.hidden && box === this.lastIndicatorBox) return
    this.lastIndicatorBox = box
    indicator.hidden = false
    indicator.style.width = `${item.offsetWidth}px`
    indicator.style.height = `${item.offsetHeight}px`
    indicator.style.transform = `translate(${item.offsetLeft}px, ${item.offsetTop}px)`
    if (!this.animated) {
      this.animated = true
      // 双 rAF：先以初始位置完成一帧绘制，再挂 .animated 启用过渡（避免入场滑动假动作）
      requestAnimationFrame(() => requestAnimationFrame(() => this.classList.add('animated')))
    }
  }

  /**
   * 键盘导航（roving tabindex 由 syncSelection 维护；方向键循环 + 跳过禁用项 + Home/End）。
   * preventDefault 接管原生 radio 箭头默认行为——跨环境（含非浏览器引擎）行为一致。
   */
  private handleGroupKey(e: KeyboardEvent): void {
    if (this.hasAttr('readonly')) return
    const vertical = this.getAttr('direction', 'horizontal') === 'vertical'
    let dir: 1 | -1 | null = null
    let jump: 'first' | 'last' | null = null
    if (vertical) {
      if (e.key === 'ArrowDown') dir = 1
      else if (e.key === 'ArrowUp') dir = -1
    } else {
      if (e.key === 'ArrowRight') dir = 1
      else if (e.key === 'ArrowLeft') dir = -1
    }
    if (e.key === 'Home') jump = 'first'
    else if (e.key === 'End') jump = 'last'
    if (dir === null && jump === null) return
    if (this.injectDisabled()) return
    e.preventDefault()
    const enabled = this.optionsList.filter((o) => o.disabled !== true)
    if (enabled.length === 0) return
    const current = this.currentValue()
    let target: SegmentedOption | undefined
    if (jump === 'first') target = enabled[0]
    else if (jump === 'last') target = enabled[enabled.length - 1]
    else {
      const from = Math.max(
        enabled.findIndex((o) => o.value === current),
        0,
      )
      target = enabled[(from + dir! + enabled.length) % enabled.length]
    }
    if (!target || target.value === current) return
    this.setAttribute('value', target.value)
    this.emit('change', { value: target.value })
    this.syncSelection()
    // 焦点跟随移动后的选中项（roving）
    this.focusItem(target.value)
  }

  private focusItem(value: string): void {
    const group = this.shadow.querySelector('.group')
    for (const item of [...(group?.querySelectorAll<HTMLElement>('.item') ?? [])]) {
      if (item.dataset.value === value) {
        item.querySelector<HTMLInputElement>('input.input')?.focus()
        return
      }
    }
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this.optionsList = Array.isArray(parsed)
        ? parsed.filter((o): o is SegmentedOption => o && typeof o.value === 'string')
        : []
    } catch {
      this.optionsList = []
    }
  }
}
