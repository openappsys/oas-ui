import { OASElement } from '@oas-ui/core'
import { lookupIcon } from '../../basic/icon/oas-icon.js'

/** 步骤状态：wait 等待 / process 进行中 / finish 完成 / error 错误 */
export type StepStatus = 'wait' | 'process' | 'finish' | 'error'

export interface StepItem {
  title: string
  description?: string
  /** 显式状态，缺省时按 current 推导（前序 finish / 当前 process / 其余 wait） */
  status?: StepStatus
  /** 图标名（iconRegistry 键）：显式 icon 优先于状态默认图标（序号/✓/✕）渲染在指示器位置；无匹配时不渲染（回落状态默认图标） */
  icon?: string
  /** 禁用步骤：clickable/navigation 下不可点击（无按钮语义）、视觉弱化（弱化色 token）；显式 status 仍正常显示 */
  disabled?: boolean
}

const VALID_STATUS = new Set<StepStatus>(['wait', 'process', 'finish', 'error'])

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.steps {
  display: flex;
}
.steps[data-direction='vertical'] {
  flex-direction: column;
}
.item {
  flex: 1;
  position: relative;
  text-align: center;
}
.steps[data-direction='vertical'] .item {
  display: flex;
  text-align: left;
  gap: var(--oas-space-3);
  padding-bottom: var(--oas-space-5);
}
.item:not(:last-child)::after {
  content: '';
  position: absolute;
  /* 连接线垂直居中于指示器：普通模式图标 24 + 上下 border 2 = 28 盒，圆心在 sm/2 + 2；
     线高 2px，顶部 = 圆心 - 1px。dot 模式（无边框，圆心 sm/2）在下方覆盖 */
  top: calc(var(--oas-control-height-sm) / 2 + 1px);
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--oas-color-border);
  z-index: 0;
}
/* 连接线颜色跟随前一步状态：process 主色 / finish 成功色 / error 危险色 */
.item[data-status='process']:not(:last-child)::after {
  background: var(--oas-color-primary);
}
.item[data-status='finish']:not(:last-child)::after {
  background: var(--oas-color-success);
}
.item[data-status='error']:not(:last-child)::after {
  background: var(--oas-color-danger);
}
.steps[data-direction='vertical'] .item:not(:last-child)::after {
  /* 纵向：线从图标盒底（sm + 上下 border 2）起，水平居中于 28 盒（圆心 sm/2 + 2，线宽 2 左缘 - 1px） */
  top: calc(var(--oas-control-height-sm) + 2px);
  left: calc(var(--oas-control-height-sm) / 2 + 1px);
  width: 2px;
  height: 100%;
}
.icon {
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  display: inline-flex;
  /* 行内盒基线间隙会把图标压低 1~2px，top 对齐行盒顶使圆心恒定于 item 顶部 sm/2 处 */
  vertical-align: top;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  position: relative;
  z-index: 1;
}
/* wait：次要色（默认），process：主色，finish：成功色，error：危险色 */
.item[data-status='process'] .icon {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
  font-weight: 600;
}
.item[data-status='finish'] .icon {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
.item[data-status='error'] .icon {
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
/* 图标指示器：内联 SVG 随状态色（currentColor）着色，block 消除基线间隙 */
.icon svg {
  display: block;
}
.text {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
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
/* clickable：整项可点，hover 图标轻微强调、focus-visible 焦点环 */
.steps[data-clickable='true'] .item {
  cursor: pointer;
}
.steps[data-clickable='true'] .item:hover .icon {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
}
.steps[data-clickable='true'] .item:focus-visible {
  outline: none;
  border-radius: var(--oas-radius-sm);
  box-shadow: var(--oas-focus-ring);
}

/* —— progress-dot 点状：圆点指示器 + 细连线，连线垂直居中于圆点 —— */
.steps[data-progress-dot='true'] .icon {
  border: none;
  background: transparent;
  font-size: 0;
}
.steps[data-progress-dot='true'] .icon::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--oas-color-text-disabled);
}
/* 当前步圆点放大并带柔光晕 */
.steps[data-progress-dot='true'] .item[data-status='process'] .icon::before {
  width: 10px;
  height: 10px;
  background: var(--oas-color-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
}
.steps[data-progress-dot='true'] .item[data-status='finish'] .icon::before {
  background: var(--oas-color-primary);
}
.steps[data-progress-dot='true'] .item[data-status='error'] .icon::before {
  background: var(--oas-color-danger);
}
.steps[data-progress-dot='true'] .item:not(:last-child)::after {
  /* 点状指示器无边框，中心在高度一半处：连线再上移 1px 对准圆心 */
  top: calc(var(--oas-control-height-sm) / 2 - 1px);
}
.steps[data-progress-dot='true'][data-direction='vertical'] .item:not(:last-child)::after {
  left: calc(var(--oas-control-height-sm) / 2 - 1px);
}

/* —— navigation 导航模式：箭头分格条 + 底部上一步/下一步 —— */
.steps[data-navigation='true'] .item {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--oas-space-3) var(--oas-space-4);
  padding-inline-start: var(--oas-space-5);
  text-align: start;
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
}
.steps[data-navigation='true'] .item[data-status='process'] {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.steps[data-navigation='true'] .item[data-status='finish'] {
  background: color-mix(in srgb, var(--oas-color-primary) 15%, transparent);
  color: var(--oas-color-primary);
}
.steps[data-navigation='true'] .item[data-status='error'] {
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
}
/* 非末项右缘伸出右向箭头，压在下一项左缘上形成 chevron 链 */
.steps[data-navigation='true'] .item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-end: -16px;
  width: 16px;
  background: inherit;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  z-index: 1;
}
.steps[data-navigation='true'] .item:hover {
  filter: brightness(0.94);
}
.steps[data-navigation='true'] .item:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--oas-color-text-primary);
  z-index: 2;
}
.steps[data-navigation='true'] .icon {
  display: none;
}
.steps[data-navigation='true'] .text {
  margin-top: 0;
  color: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
}
.steps[data-navigation='true'] .desc {
  display: none;
}

/* —— label-placement horizontal：图标与标题同行（图标左、标题右），连线对准图标中心 —— */
.steps[data-label-placement='horizontal'] .item {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  text-align: left;
}
.steps[data-label-placement='horizontal'] .text {
  margin-top: 0;
}
.steps[data-label-placement='horizontal'] .item:not(:last-child)::after {
  left: calc(var(--oas-control-height-sm) / 2);
  top: calc(50% - 1px);
}

/* —— disabled：文字弱化（弱化色 token）、禁点（update 已移除按钮语义）—— */
.item[data-disabled='true'] .text,
.item[data-disabled='true'] .desc {
  color: var(--oas-color-text-disabled);
}
.item[data-disabled='true'] {
  cursor: not-allowed;
}
.steps[data-clickable='true'] .item[data-disabled='true']:hover .icon {
  box-shadow: none;
}
.steps[data-navigation='true'] .item[data-disabled='true']:hover {
  filter: none;
}

/* —— 导航模式底部操作区 —— */
.nav {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  margin-top: var(--oas-space-4);
}
.nav[hidden] {
  display: none;
}
.nav .btn {
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.nav .btn:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.nav .btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.nav .btn.next {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.nav .btn.next:hover:not(:disabled) {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
.nav .btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
`

export class OASSteps extends OASElement {
  static override get observedAttributes(): string[] {
    return ['steps', 'current', 'direction', 'clickable', 'progress-dot', 'navigation', 'linear', 'label-placement']
  }

  private _steps: StepItem[] = []

  /** Vue/React 会把 steps 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get steps(): StepItem[] {
    return this._steps
  }
  set steps(value: StepItem[] | string) {
    this.setAttribute('steps', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private nav: HTMLElement | null = null
  private prevBtn: HTMLButtonElement | null = null
  private nextBtn: HTMLButtonElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="steps" part="steps"></div>
      <div class="nav" part="nav" hidden>
        <button class="btn" part="prev" type="button"></button>
        <button class="btn next" part="next" type="button"></button>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；步骤事件在 update 重建时绑定） */
  private bind(): void {
    this.nav = this.shadow.querySelector('.nav')
    this.prevBtn = this.shadow.querySelector<HTMLButtonElement>('[part="prev"]')
    this.nextBtn = this.shadow.querySelector<HTMLButtonElement>('[part="next"]')
    this.prevBtn?.addEventListener('click', () => this.navStep(-1))
    this.nextBtn?.addEventListener('click', () => this.navStep(1))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（steps 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.steps')) return false
    this.bind()
    return true
  }

  /** 统一跳转：写 current + 派发 oas-change + 重刷 */
  private goto(idx: number): void {
    this.setAttribute('current', String(idx))
    this.emit('change', { index: idx })
    this.update()
  }

  /** 导航模式底部按钮：向相邻步切换 */
  private navStep(dir: -1 | 1): void {
    const last = this._steps.length - 1
    const current = Math.min(Math.max(Number(this.getAttr('current', '0')) || 0, 0), last)
    const target = current + dir
    if (target < 0 || target > last) return
    this.goto(target)
  }

  protected override update(): void {
    const stepsEl = this.shadow.querySelector('.steps')
    if (!stepsEl) return
    this.parseSteps()
    const clickable = this.hasAttr('clickable')
    const navigation = this.hasAttr('navigation')
    const progressDot = this.hasAttr('progress-dot')
    const linear = this.hasAttr('linear')
    // 导航模式固定横向
    const direction = navigation ? 'horizontal' : this.getAttr('direction', 'horizontal')
    stepsEl.setAttribute('data-direction', direction)
    if (clickable) stepsEl.setAttribute('data-clickable', 'true')
    else stepsEl.removeAttribute('data-clickable')
    if (navigation) stepsEl.setAttribute('data-navigation', 'true')
    else stepsEl.removeAttribute('data-navigation')
    if (progressDot) stepsEl.setAttribute('data-progress-dot', 'true')
    else stepsEl.removeAttribute('data-progress-dot')
    // label-placement：仅横向模式生效；progress-dot 退化点状、navigation 强制现状、纵向保持图标左/标题右
    const horizontalPlacement =
      this.getAttr('label-placement', '') === 'horizontal' &&
      !progressDot &&
      !navigation &&
      direction === 'horizontal'
    if (horizontalPlacement) stepsEl.setAttribute('data-label-placement', 'horizontal')
    else stepsEl.removeAttribute('data-label-placement')
    stepsEl.innerHTML = ''
    const current = Number(this.getAttr('current', '0')) || 0
    this._steps.forEach((step, idx) => {
      const item = document.createElement('div')
      item.className = 'item'
      item.setAttribute('part', 'item')
      const status = this.resolveStatus(step, idx, current)
      item.setAttribute('data-status', status)
      if (status === 'process') item.setAttribute('aria-current', 'step')
      // 导航模式步骤隐式可点；普通模式需 clickable 开启
      const interactive = clickable || navigation
      // 禁点：显式 disabled，或线性模式未来步（index > current，仅交互模式下生效）
      const blocked = step.disabled === true || (linear && interactive && idx > current)
      if (blocked) {
        item.setAttribute('data-disabled', 'true')
        item.setAttribute('aria-disabled', 'true')
      }
      const textWrap = document.createElement('div')
      const title = document.createElement('div')
      title.className = 'text'
      title.textContent = step.title
      textWrap.appendChild(title)
      if (step.description && !navigation) {
        const desc = document.createElement('div')
        desc.className = 'desc'
        desc.textContent = step.description
        textWrap.appendChild(desc)
      }
      if (!navigation) {
        const icon = document.createElement('span')
        icon.className = 'icon'
        if (progressDot) {
          // 点状：指示器为装饰性圆点（CSS ::before 渲染），名称由标题承担
          icon.setAttribute('aria-hidden', 'true')
        } else {
          // 显式 icon 优先（iconRegistry 键，无匹配回落状态默认图标）
          const svg = step.icon ? this.iconSvg(step.icon) : null
          if (svg) icon.innerHTML = svg
          else icon.textContent = status === 'finish' ? '✓' : status === 'error' ? '✕' : String(idx + 1)
        }
        item.appendChild(icon)
      }
      item.appendChild(textWrap)
      if (interactive && !blocked) {
        // 整项承担按钮角色，键盘 Enter/Space 可达；点击派发 oas-change{index} 并切换 current
        item.setAttribute('role', 'button')
        item.setAttribute('tabindex', '0')
        const goto: () => void = () => this.goto(idx)
        item.addEventListener('click', goto)
        item.addEventListener('keydown', (e: Event) => {
          const k = e as KeyboardEvent
          if (k.key !== 'Enter' && k.key !== ' ') return
          k.preventDefault()
          goto()
        })
      }
      stepsEl.appendChild(item)
    })
    // 导航模式底部上一步/下一步（内置文案 locale 驱动，setLocale 切换自动重刷；无步骤时隐藏）
    if (this.nav) {
      if (navigation && this._steps.length > 0) this.nav.removeAttribute('hidden')
      else this.nav.setAttribute('hidden', '')
    }
    if (this.prevBtn) {
      this.prevBtn.textContent = this.t('steps.prev')
      this.prevBtn.disabled = navigation && current <= 0
    }
    if (this.nextBtn) {
      this.nextBtn.textContent = this.t('steps.next')
      this.nextBtn.disabled = navigation && current >= this._steps.length - 1
    }
  }

  /** 状态解析：显式 status 优先，否则按 current 推导（前序 finish / 当前 process / 其余 wait） */
  private resolveStatus(step: StepItem, idx: number, current: number): StepStatus {
    if (step.status && VALID_STATUS.has(step.status)) return step.status
    if (idx < current) return 'finish'
    if (idx === current) return 'process'
    return 'wait'
  }

  /** 图标名（查表：registerIcon 自定义优先，其次内置注册表）→ 内联 SVG（currentColor 随状态色）；无匹配返回 null */
  private iconSvg(name: string): string | null {
    const path = lookupIcon(name)
    if (!path) return null
    return `<svg viewBox="0 0 16 16" width="1.25em" height="1.25em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
  }

  private parseSteps(): void {
    try {
      const parsed = JSON.parse(this.getAttr('steps', '[]'))
      this._steps = Array.isArray(parsed)
        ? parsed.filter((s): s is StepItem => s && typeof s.title === 'string')
        : []
    } catch {
      this._steps = []
    }
  }
}
