import { OASElement } from '@oas-ui/core'
import { lookupIcon } from '../../basic/icon/oas-icon.js'
import type { OASStepperPanel } from './oas-stepper-panel.js'

/** 步骤状态：wait 等待 / process 进行中 / finish 完成 / error 错误（语义对齐 oas-steps） */
export type StepperStatus = 'wait' | 'process' | 'finish' | 'error'

/** 步骤数据：语义对齐 oas-steps 的 StepItem 减去面板无关项（extra/loading/optional/percent/id） */
export interface StepperStep {
  title: string
  description?: string
  /** 显式状态，缺省时按 current 推导（前序 finish / 当前 process / 其余 wait） */
  status?: StepperStatus
  /** 图标名（iconRegistry / registerIcon 键）：显式 icon 优先于状态默认图标（序号/✓/✕） */
  icon?: string
  /** 禁用步骤：不可点击（aria-disabled）、键盘跳过、视觉弱化；显式 status 仍正常显示 */
  disabled?: boolean
}

export type StepperSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

const VALID_STEPPER_SIZES: readonly StepperSize[] = ['xs', 'small', 'medium', 'large', 'xl']

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeStepperSize(raw: string): StepperSize {
  if ((VALID_STEPPER_SIZES as readonly string[]).includes(raw)) return raw as StepperSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(
      `[oas-stepper] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`,
    )
  }
  return 'medium'
}

const warnedSizes = new Set<string>()

/** 实例唯一 id 前缀（tab/panel 关联用；模块级计数器，确定性可复现） */
let uidCounter = 0

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.tablist {
  display: flex;
  align-items: stretch;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* 纵向：tab 列排 */
:host(.oas-stepper--vertical) .tablist {
  flex-direction: column;
}

/* ===== 步骤 tab（button + role=tab） ===== */
.tab {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-3) var(--oas-space-2);
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  cursor: pointer;
  text-align: center;
}
.tab:hover:not([aria-disabled='true']) {
  background: var(--oas-color-bg-hover);
}
.tab:focus-visible {
  outline: none;
  border-radius: var(--oas-radius-sm);
  box-shadow: var(--oas-focus-ring);
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.tab[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
.tab[aria-disabled='true']:hover {
  background: none;
  color: var(--oas-color-text-primary);
}

/* ===== 连接线：水平居中于指示器（图标 24 + 上下 border 2 = 28 盒，圆心 sm/2 + 2，线 2px 顶 = 圆心 - 1） ===== */
.tab:not(:last-child)::after {
  content: '';
  position: absolute;
  top: calc(var(--oas-space-1) + var(--oas-control-height-sm) / 2 + 1px);
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--oas-color-border);
  z-index: 0;
}
/* 连接线颜色跟随前一步状态：process 主色 / finish 成功色 / error 危险色 */
.tab[data-status='process']:not(:last-child)::after {
  background: var(--oas-color-primary);
}
.tab[data-status='finish']:not(:last-child)::after {
  background: var(--oas-color-success);
}
.tab[data-status='error']:not(:last-child)::after {
  background: var(--oas-color-danger);
}
/* 纵向：线从图标盒底（sm + 上下 border 2）起，水平居中于 28 盒，线 2px 左缘 - 1px */
:host(.oas-stepper--vertical) .tab:not(:last-child)::after {
  top: calc(var(--oas-space-2) + var(--oas-control-height-sm) + 4px);
  inset-inline-start: calc(var(--oas-space-2) + var(--oas-control-height-sm) / 2 + 1px);
  left: auto;
  width: 2px;
  height: 100%;
}

/* ===== 指示器圆（序号 / ✓ / ✕ / 显式 icon SVG） ===== */
.indicator {
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  position: relative;
  z-index: 1;
}
/* 状态色：wait 次要（默认）/ process 主色 / finish 成功色 / error 危险色 */
.tab[data-status='process'] .indicator {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
  font-weight: 600;
}
.tab[data-status='finish'] .indicator {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
.tab[data-status='error'] .indicator {
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
.indicator svg {
  display: block;
}

/* ===== 文本块（标题 + 描述） ===== */
.text-block {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
}
.title {
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.desc {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* 纵向：tab 为行（指示器左 / 文本右），连接线有纵向空间 */
:host(.oas-stepper--vertical) .tab {
  flex: none;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  gap: var(--oas-space-3);
  text-align: start;
  padding: var(--oas-space-2);
  padding-bottom: var(--oas-space-5);
}
:host(.oas-stepper--vertical) .text-block {
  padding-top: calc(var(--oas-space-2) / 2);
}

/* ===== size 档位：字号密度（连接线/指示器几何恒定，只动字阶） ===== */
:host(.oas-stepper--xs) .title {
  font-size: var(--oas-font-size-xs);
}
:host(.oas-stepper--small) .title {
  font-size: var(--oas-font-size-sm);
}
:host(.oas-stepper--large) .title {
  font-size: var(--oas-font-size-lg);
}
:host(.oas-stepper--xl) .title {
  font-size: var(--oas-font-size-xl);
}
:host(.oas-stepper--xl) .desc {
  font-size: var(--oas-font-size-sm);
}

/* ===== 内容面板插槽区 ===== */
.panels {
  display: block;
  padding-top: var(--oas-space-4);
}
`

const VALID_STATUS = new Set<StepperStatus>(['wait', 'process', 'finish', 'error'])

/**
 * oas-stepper —— 步骤驱动的内容面板一体机（步骤头 + 联动面板）。
 *
 * 与 oas-stepper-panel 配套（同构 oas-tabs / oas-tab-panel 的 value 关联模式）：
 * 头部步骤条 role=tablist + 每步 role=tab（点击/键盘跳步派发 oas-change{index}，
 * current 双向），联动内容面板仅 current 匹配 value 的 oas-stepper-panel 可见。
 *
 * 数据语义对齐 oas-steps（steps 数组 / status 推导 / icon / disabled / linear），
 * 独立实现不 import steps 内部。prev/next 按钮不内置（宿主用按钮设 current）。
 */
export class OASStepper extends OASElement {
  static override get observedAttributes(): string[] {
    return ['steps', 'current', 'linear', 'clickable', 'direction', 'size']
  }

  private _steps: StepperStep[] = []
  private tablist: HTMLElement | null = null
  private observer: MutationObserver | null = null
  private readonly uid = `oas-stepper-${++uidCounter}`

  /** Vue/React 会把 steps 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get steps(): StepperStep[] {
    return this._steps
  }
  set steps(value: StepperStep[] | string) {
    this.setAttribute('steps', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist" role="tablist"></div>
      <slot class="panels" part="panels"></slot>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.tablist = this.shadow.querySelector('.tablist')
    this.tablist?.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent))
    // 宿主增删 oas-stepper-panel 时增量同步面板显隐/ARIA 关联
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => this.observer?.disconnect())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（tablist 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tablist')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseSteps()
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    // 方向：horizontal（默认）/ vertical
    const direction = this.getAttr('direction', 'horizontal') === 'vertical' ? 'vertical' : 'horizontal'
    tablist.setAttribute('aria-orientation', direction)
    this.classList.toggle('oas-stepper--vertical', direction === 'vertical')
    // size 五档（非法值归一化回落 medium）
    const size = normalizeStepperSize(this.getAttr('size', 'medium'))
    for (const s of VALID_STEPPER_SIZES) this.classList.toggle(`oas-stepper--${s}`, s === size)

    const current = this.resolveCurrent()
    // 重建前捕获焦点归属（重建后恢复；方向键/点击跳步后焦点不丢）
    const focusedIdx = this.focusedTabIndex()

    tablist.innerHTML = ''
    const linear = this.hasAttr('linear')
    const rovingBase = this.findRovingBase(current)
    this._steps.forEach((step, idx) => {
      const status = this.resolveStatus(step, idx, current)
      // 禁点：显式 disabled，或线性模式未来步（index > current）
      const blocked = step.disabled === true || (linear && idx > current)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab'
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(idx === current))
      // roving tabindex：仅 roving 基准步进 Tab 顺序，其余 -1；禁步恒 -1 不可聚焦
      btn.setAttribute('tabindex', rovingBase === idx ? '0' : '-1')
      btn.setAttribute('data-status', status)
      btn.setAttribute('data-index', String(idx))
      // tab ↔ panel 关联（aria-labelledby / aria-controls 走 flat tree 同 id）
      btn.id = `${this.uid}-tab-${idx}`
      if (blocked) btn.setAttribute('aria-disabled', 'true')

      // 指示器：显式 icon（lookupIcon 查表）优先于状态默认图标（序号/✓/✕）
      const indicator = document.createElement('span')
      indicator.className = 'indicator'
      const svg = step.icon ? lookupIcon(step.icon) : null
      if (svg) {
        indicator.innerHTML = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`
      } else {
        indicator.textContent =
          status === 'finish' ? '✓' : status === 'error' ? '✕' : String(idx + 1)
      }
      btn.appendChild(indicator)

      const textBlock = document.createElement('span')
      textBlock.className = 'text-block'
      const title = document.createElement('span')
      title.className = 'title'
      title.textContent = step.title
      textBlock.appendChild(title)
      if (step.description) {
        const desc = document.createElement('span')
        desc.className = 'desc'
        desc.textContent = step.description
        textBlock.appendChild(desc)
      }
      btn.appendChild(textBlock)

      btn.addEventListener('click', () => this.goto(idx))
      tablist.appendChild(btn)
    })

    // 面板联动：仅 current 匹配 value 的 oas-stepper-panel 可见（value 关联序号字符串）
    this.syncPanels(current)

    // 重建后恢复焦点（禁步不再聚焦，落回 roving 基准）
    if (focusedIdx >= 0) this.restoreFocus(focusedIdx)
  }

  /** 面板显隐 + tabpanel ARIA 关联（role/aria-labelledby/aria-controls 跨 shadow flat tree 引用） */
  private syncPanels(current: number): void {
    const panels = [...this.querySelectorAll(':scope > oas-stepper-panel')] as OASStepperPanel[]
    for (const panel of panels) {
      const value = panel.getAttribute('value') ?? ''
      panel.hidden = value !== String(current)
      panel.setAttribute('role', 'tabpanel')
      // aria-labelledby → 对应步骤 tab（面板 value 即步骤序号）
      panel.setAttribute('aria-labelledby', `${this.uid}-tab-${value}`)
      if (!panel.id) panel.id = `${this.uid}-panel-${value}`
      const tab = this.tablist?.querySelector<HTMLElement>(`[data-index="${value}"]`)
      tab?.setAttribute('aria-controls', panel.id)
    }
  }

  /**
   * 统一跳步：可点性判定（clickable + 非 disabled + 非 linear 未来步）通过后
   * 写回 current（双向，属性变化驱动 update）+ 派发 oas-change{index}
   */
  private goto(idx: number): void {
    if (!this.canActivate(idx)) return
    this.setAttribute('current', String(idx))
    this.emit('change', { index: idx })
  }

  private canActivate(idx: number): boolean {
    if (this.getAttr('clickable', 'true') === 'false') return false
    const step = this._steps[idx]
    if (!step) return false
    if (step.disabled === true) return false
    if (this.hasAttr('linear') && idx > this.resolveCurrent()) return false
    return true
  }

  /** current 解析：非法（NaN）回落 0，越界夹取到末位 */
  private resolveCurrent(): number {
    const len = this._steps.length
    if (len === 0) return 0
    const raw = Number(this.getAttr('current', '0'))
    if (!Number.isFinite(raw)) return 0
    return Math.min(Math.max(Math.floor(raw), 0), len - 1)
  }

  /** 某步是否被禁点（disabled 或 linear 未来步） */
  private isBlocked(idx: number): boolean {
    const step = this._steps[idx]
    if (!step) return true
    if (step.disabled === true) return true
    if (this.hasAttr('linear') && idx > this.resolveCurrent()) return true
    return false
  }

  /** roving tabindex 基准：当前步（非禁步）→ 首个非禁步（当前步被禁的极端场景） */
  private findRovingBase(current: number): number {
    if (!this.isBlocked(current)) return current
    const first = this._steps.findIndex((_, i) => !this.isBlocked(i))
    return first >= 0 ? first : 0
  }

  /** 状态解析：显式 status 最高优先 → 按 current 推导（前序 finish / 当前 process / 其余 wait） */
  private resolveStatus(step: StepperStep, idx: number, current: number): StepperStatus {
    if (step.status && VALID_STATUS.has(step.status)) return step.status
    if (idx === current) return 'process'
    if (idx < current) return 'finish'
    return 'wait'
  }

  private parseSteps(): void {
    try {
      const parsed = JSON.parse(this.getAttr('steps', '[]'))
      this._steps = Array.isArray(parsed)
        ? parsed.filter((s): s is StepperStep => s && typeof s.title === 'string')
        : []
    } catch {
      this._steps = []
    }
  }

  /* ===== 键盘：roving tabindex（方向键/Home/End 移动焦点，Enter/Space 激活跳步） ===== */
  private handleKeydown(e: KeyboardEvent): void {
    const tablist = this.tablist
    if (!tablist) return
    const tabs = [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')]
    if (tabs.length === 0) return
    const vertical = this.getAttr('direction', 'horizontal') === 'vertical'
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft'
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const focused = this.focusedTabIndex()
    // 无焦点时以 roving 基准步为起点（Tab 进入 tablist 即落在选中步）
    const base = focused >= 0 ? focused : this.findRovingBase(this.resolveCurrent())

    if (e.key === nextKey || e.key === prevKey) {
      e.preventDefault()
      const target = this.wrapIndex(tabs, base, e.key === nextKey ? 1 : -1)
      this.moveFocus(tabs, target)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const target = this.edgeIndex(tabs, e.key === 'Home' ? 1 : -1)
      this.moveFocus(tabs, target)
    } else if ((e.key === 'Enter' || e.key === ' ') && focused >= 0) {
      e.preventDefault()
      this.goto(focused)
    }
  }

  /** 当前聚焦的 tab 索引（shadow 内 [role=tab] 且属于本组件 tablist）；无则 -1 */
  private focusedTabIndex(): number {
    const tablist = this.tablist
    if (!tablist) return -1
    // 用 shadow.activeElement 而非 document.activeElement：焦点在 shadow 内时
    // document.activeElement 返回 shadow host（DOM 规范），拿不到内部真实聚焦元素
    const active = this.shadow.activeElement as HTMLElement | null
    if (!active || !tablist.contains(active)) return -1
    const btn = active.closest<HTMLElement>('[role="tab"][data-index]')
    if (!btn) return -1
    const idx = Number(btn.getAttribute('data-index'))
    return Number.isFinite(idx) ? idx : -1
  }

  /** 方向键循环回绕移动（跳过禁步；全禁时不动） */
  private wrapIndex(tabs: HTMLElement[], from: number, dir: 1 | -1): number {
    const n = tabs.length
    let i = from + dir
    for (let step = 0; step < n; step++) {
      const wrapped = ((i % n) + n) % n
      if (tabs[wrapped]!.getAttribute('aria-disabled') !== 'true') return wrapped
      i += dir
    }
    return from
  }

  /** Home 首位 / End 末位（跳过禁步） */
  private edgeIndex(tabs: HTMLElement[], dir: 1 | -1): number {
    for (let i = dir === 1 ? 0 : tabs.length - 1; i >= 0 && i < tabs.length; i += dir) {
      if (tabs[i]!.getAttribute('aria-disabled') !== 'true') return i
    }
    return 0
  }

  /** roving：目标 tab tabindex=0 并聚焦，其余 -1 */
  private moveFocus(tabs: HTMLElement[], target: number): void {
    const tab = tabs[target]
    if (!tab) return
    tabs.forEach((t, i) => t.setAttribute('tabindex', i === target ? '0' : '-1'))
    tab.focus({ preventScroll: true })
  }

  /** 重建后恢复焦点：目标步已禁点时落回 roving 基准 */
  private restoreFocus(idx: number): void {
    const tabs = this.tablist?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []
    const tab = tabs[idx]
    if (tab && tab.getAttribute('aria-disabled') !== 'true') {
      tab.focus({ preventScroll: true })
    } else {
      this.tablist?.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus({
        preventScroll: true,
      })
    }
  }
}
