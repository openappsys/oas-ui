import { OASElement } from '@oas-ui/core'
import { lookupIcon } from '../../basic/icon/oas-icon.js'

/** 步骤状态：wait 等待 / process 进行中 / finish 完成 / error 错误 */
export type StepStatus = 'wait' | 'process' | 'finish' | 'error'

export interface StepItem {
  title: string
  description?: string
  /** 显式状态，缺省时按 current 推导（前序 finish / 当前 process / 其余 wait）；比容器 status 属性更高优先 */
  status?: StepStatus
  /** 图标名（iconRegistry 键）：显式 icon 优先于状态默认图标（序号/✓/✕）渲染在指示器位置；无匹配时不渲染（回落状态默认图标） */
  icon?: string
  /** 禁用步骤：clickable/navigation 下不可点击（无按钮语义）、视觉弱化（弱化色 token）；显式 status 仍正常显示 */
  disabled?: boolean
  /** 操作提示行：描述下方弱化小字（textContent 渲染，禁 innerHTML） */
  extra?: string
  /** 步骤唯一标识：点击/导航跳转派发的 oas-change detail 回传为 { index, id? }（向后兼容 index 字段不变） */
  id?: string
  /** 加载中：指示器位置显示 CSS 旋转圈（走 token），显式 icon/序号让位 loading */
  loading?: boolean
  /** 可选步骤：标题旁「可选」弱化文案（走 core i18n：zh「可选」/ en「Optional」） */
  optional?: boolean
  /** 进度百分比 0-100：仅 process 步生效，指示器显示进度圆环（SVG stroke-dasharray，走 token），有 percent 时序号让位 */
  percent?: number
}

const VALID_STATUS = new Set<StepStatus>(['wait', 'process', 'finish', 'error'])

/** responsive 窄屏断点：容器宽度小于该值自动转纵向布局 */
const RESPONSIVE_BREAKPOINT = 640

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

/* —— extra 操作提示行（描述下方弱化小字，textContent 渲染）—— */
.extra {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* —— optional 可选标记（标题旁弱化小字，i18n 文案）—— */
.optional {
  margin-inline-start: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
  font-weight: 400;
}

/* —— loading 加载圈：指示器位置 CSS 旋转圈（icon/序号/percent 让位 loading）—— */
.icon .spinner {
  display: block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--oas-color-bg-hover);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-steps-spin 0.8s linear infinite;
}
@keyframes oas-steps-spin {
  to { transform: rotate(360deg); }
}

/* —— percent 进度圆环（仅 process 生效，序号让位；SVG stroke-dasharray 走 token）—— */
.icon .progress {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.icon .progress-track {
  fill: none;
  stroke: var(--oas-color-bg-hover);
  stroke-width: 3;
}
.icon .progress-bar {
  fill: none;
  stroke: var(--oas-color-primary);
  stroke-width: 3;
  stroke-linecap: round;
}
.icon .percent-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  color: var(--oas-color-primary);
}

/* —— lineless：隐藏全部连接线（含 arrow 三角）—— */
.steps[data-lineless='true'] .item:not(:last-child)::after,
.steps[data-lineless='true'] .item:not(:last-child)::before {
  display: none;
}

/* —— separator：连接线形态（dashed=border dashed / arrow=末端三角，CSS border 实现）—— */
.steps[data-separator='dashed'] .item:not(:last-child)::after {
  background: none;
  height: 0;
  border-top: 2px dashed var(--oas-color-border);
}
.steps[data-separator='dashed'] .item[data-status='process']:not(:last-child)::after {
  border-top-color: var(--oas-color-primary);
}
.steps[data-separator='dashed'] .item[data-status='finish']:not(:last-child)::after {
  border-top-color: var(--oas-color-success);
}
.steps[data-separator='dashed'] .item[data-status='error']:not(:last-child)::after {
  border-top-color: var(--oas-color-danger);
}
/* arrow：线缩短留出三角位，末端右向三角（颜色跟随前一步状态） */
.steps[data-separator='arrow'] .item:not(:last-child)::after {
  width: calc(100% - 14px);
}
.steps[data-separator='arrow'] .item:not(:last-child)::before {
  content: '';
  position: absolute;
  right: calc(14px - 50%);
  top: calc(var(--oas-control-height-sm) / 2 - 3px);
  width: 0;
  height: 0;
  border-right: 8px solid var(--oas-color-border);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  z-index: 1;
}
.steps[data-separator='arrow'] .item[data-status='process']:not(:last-child)::before {
  border-right-color: var(--oas-color-primary);
}
.steps[data-separator='arrow'] .item[data-status='finish']:not(:last-child)::before {
  border-right-color: var(--oas-color-success);
}
.steps[data-separator='arrow'] .item[data-status='error']:not(:last-child)::before {
  border-right-color: var(--oas-color-danger);
}
/* 纵向：线缩短、三角朝下 */
.steps[data-separator='arrow'][data-direction='vertical'] .item:not(:last-child)::after {
  width: 2px;
  height: calc(100% - 14px);
}
.steps[data-separator='arrow'][data-direction='vertical'] .item:not(:last-child)::before {
  right: auto;
  top: auto;
  bottom: calc(14px - 50%);
  left: calc(var(--oas-control-height-sm) / 2 + 1px - 4px);
  border-right: 4px solid transparent;
  border-bottom: 8px solid var(--oas-color-border);
  border-top: none;
  border-left: 4px solid transparent;
}
.steps[data-separator='arrow'][data-direction='vertical'] .item[data-status='process']:not(:last-child)::before {
  border-bottom-color: var(--oas-color-primary);
}
.steps[data-separator='arrow'][data-direction='vertical'] .item[data-status='finish']:not(:last-child)::before {
  border-bottom-color: var(--oas-color-success);
}
.steps[data-separator='arrow'][data-direction='vertical'] .item[data-status='error']:not(:last-child)::before {
  border-bottom-color: var(--oas-color-danger);
}
/* dot 模式线更靠上：三角同步上移 2px */
.steps[data-separator='arrow'][data-progress-dot='true'] .item:not(:last-child)::before {
  top: calc(var(--oas-control-height-sm) / 2 - 5px);
}

/* —— simple 紧凑模式：单行小尺寸（指示器缩小、描述隐藏、连接线贴紧）——
   与 progress-dot / navigation 互斥（simple 优先，update 中不设对应标记） */
.steps[data-simple='true'] .item {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  text-align: left;
}
.steps[data-simple='true'] .icon {
  width: calc(var(--oas-control-height-sm) - 6px);
  height: calc(var(--oas-control-height-sm) - 6px);
  font-size: var(--oas-font-size-xs);
}
.steps[data-simple='true'] .text {
  margin-top: 0;
  font-size: var(--oas-font-size-sm);
}
.steps[data-simple='true'] .item:not(:last-child)::after {
  /* 单行：线垂直居中于指示器圆心，起点对准缩小后指示器中心 */
  top: calc(50% - 1px);
  left: calc(var(--oas-control-height-sm) / 2 - 3px);
}
.steps[data-simple='true'][data-direction='vertical'] .item:not(:last-child)::after {
  top: calc(50% + var(--oas-control-height-sm) / 2 - 3px);
  left: calc(var(--oas-control-height-sm) / 2 - 4px);
  width: 2px;
  height: 100%;
}
/* simple + arrow：三角对准缩小后指示器的行中心与线末端 */
.steps[data-separator='arrow'][data-simple='true'] .item:not(:last-child)::before {
  top: calc(50% - 4px);
  right: calc(var(--oas-control-height-sm) / 2 - 7px);
}
.steps[data-separator='arrow'][data-simple='true'][data-direction='vertical'] .item:not(:last-child)::before {
  left: calc(var(--oas-control-height-sm) / 2 - 4px);
  right: auto;
  top: auto;
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
    return [
      'steps',
      'current',
      'direction',
      'clickable',
      'progress-dot',
      'navigation',
      'linear',
      'label-placement',
      'status',
      'lineless',
      'simple',
      'separator',
      'responsive',
    ]
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
  /** responsive：容器宽度监听（清理走 onCleanup） */
  private observer: ResizeObserver | null = null
  /** responsive：容器是否窄于断点（clientWidth>0 且 <640；0=未布局/SSR 不误判） */
  private narrow = false

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
    // responsive：容器宽度变化重算窄态（<640 自动转纵向）；清理走 onCleanup
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.syncResponsive())
      this.observer.observe(this)
      this.onCleanup(() => this.observer?.disconnect())
    }
  }

  /** responsive 窄态重算：宽度度量收敛到 update() 统一执行，回调只负责触发重刷 */
  private syncResponsive(): void {
    if (this.hasRendered) this.runUpdateAndNotify()
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

  /** 统一跳转：before-change 拦截点 + 写 current + 派发 oas-change{index,id?} + 重刷 */
  private goto(idx: number): void {
    // oas-before-change：跳步前拦截点（cancelable），宿主 preventDefault 可 veto 本次跳转
    //（契约对齐 tabs/pagination：navigation 的 prev/next 按钮与步骤点击/键盘同走此拦截）
    if (!this.emit('before-change', { index: idx }, { cancelable: true })) return
    const step = this._steps[idx]
    this.setAttribute('current', String(idx))
    this.emit('change', { index: idx, ...(step?.id ? { id: step.id } : {}) })
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
    const simple = this.hasAttr('simple')
    const responsive = this.hasAttr('responsive')
    // simple 与 progress-dot / navigation 互斥（simple 优先）：让位后不设对应标记
    const nav = navigation && !simple
    const dot = progressDot && !simple
    // responsive：窄屏转纵向（navigation 强制横向的现状保持，忽略转竖向）
    if (responsive) {
      const w = this.clientWidth
      this.narrow = w > 0 && w < RESPONSIVE_BREAKPOINT
    }
    const direction = nav
      ? 'horizontal'
      : responsive && this.narrow
        ? 'vertical'
        : this.getAttr('direction', 'horizontal')
    stepsEl.setAttribute('data-direction', direction)
    if (clickable) stepsEl.setAttribute('data-clickable', 'true')
    else stepsEl.removeAttribute('data-clickable')
    if (nav) stepsEl.setAttribute('data-navigation', 'true')
    else stepsEl.removeAttribute('data-navigation')
    if (dot) stepsEl.setAttribute('data-progress-dot', 'true')
    else stepsEl.removeAttribute('data-progress-dot')
    if (simple) stepsEl.setAttribute('data-simple', 'true')
    else stepsEl.removeAttribute('data-simple')
    // separator：仅普通形态生效（navigation 让位）；非法值回落 line
    const separator = nav ? '' : this.getAttr('separator', '')
    const separatorValid = separator === 'dashed' || separator === 'arrow'
    if (separatorValid) stepsEl.setAttribute('data-separator', separator)
    else stepsEl.removeAttribute('data-separator')
    if (this.hasAttr('lineless')) stepsEl.setAttribute('data-lineless', 'true')
    else stepsEl.removeAttribute('data-lineless')
    // label-placement：仅横向模式生效；progress-dot / navigation / simple 让位、纵向保持图标左/标题右
    const horizontalPlacement =
      this.getAttr('label-placement', '') === 'horizontal' &&
      !dot &&
      !nav &&
      !simple &&
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
      // aria-current 跟随实际位置（idx === current），而非状态色——容器 status 覆盖为 error/finish 时当前步仍应向读屏器声明
      if (idx === current) item.setAttribute('aria-current', 'step')
      // 导航模式步骤隐式可点；普通模式需 clickable 开启（simple 让位 navigation 后回到 clickable 判定）
      const interactive = clickable || nav
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
      // optional：标题旁弱化「可选」文案（i18n，locale 切换自动重刷）
      if (step.optional) {
        const opt = document.createElement('span')
        opt.className = 'optional'
        opt.textContent = this.t('steps.optional')
        title.appendChild(opt)
      }
      if (step.description && !nav && !simple) {
        const desc = document.createElement('div')
        desc.className = 'desc'
        desc.textContent = step.description
        textWrap.appendChild(desc)
      }
      // extra：描述下方弱化操作提示行（textContent，禁 innerHTML）；simple/navigation 下与描述一同隐藏
      if (step.extra && !nav && !simple) {
        const extra = document.createElement('div')
        extra.className = 'extra'
        extra.textContent = step.extra
        textWrap.appendChild(extra)
      }
      if (!nav) {
        const icon = document.createElement('span')
        icon.className = 'icon'
        if (dot) {
          // 点状：指示器为装饰性圆点（CSS ::before 渲染），名称由标题承担
          icon.setAttribute('aria-hidden', 'true')
        } else if (step.loading === true && !simple) {
          // loading 让位 icon/序号/percent：CSS 旋转圈（走 token）；simple 紧凑形态让位
          const spinner = document.createElement('span')
          spinner.className = 'spinner'
          spinner.setAttribute('role', 'status')
          spinner.setAttribute('aria-label', this.t('loading.loading'))
          icon.appendChild(spinner)
        } else if (status === 'process' && step.percent !== undefined && !simple) {
          const pct = Number(step.percent)
          if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
            // 进度圆环：SVG circle stroke-dasharray（走 token），序号让位
            icon.innerHTML = `<svg class="progress" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
              <circle class="progress-track" cx="18" cy="18" r="15.915"></circle>
              <circle class="progress-bar" cx="18" cy="18" r="15.915" stroke-dasharray="${pct} ${100 - pct}"></circle>
            </svg>`
            const pctText = document.createElement('span')
            pctText.className = 'percent-text'
            pctText.textContent = `${pct}%`
            icon.appendChild(pctText)
          } else {
            // percent 越界/非法：回落序号（此分支必为 process 步）
            icon.textContent = String(idx + 1)
          }
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
        // 整项承担按钮角色，键盘 Enter/Space 可达；点击派发 oas-before-change（可拦截）→ oas-change{index,id?}
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
    // 导航模式底部上一步/下一步（内置文案 locale 驱动，setLocale 切换自动重刷；无步骤或 simple 让位时隐藏）
    if (this.nav) {
      if (nav && this._steps.length > 0) this.nav.removeAttribute('hidden')
      else this.nav.setAttribute('hidden', '')
    }
    if (this.prevBtn) {
      this.prevBtn.textContent = this.t('steps.prev')
      this.prevBtn.disabled = nav && current <= 0
    }
    if (this.nextBtn) {
      this.nextBtn.textContent = this.t('steps.next')
      this.nextBtn.disabled = nav && current >= this._steps.length - 1
    }
  }

  /**
   * 状态解析：StepItem 显式 status 最高优先 → 容器 status 属性覆盖当前步推导（如全流程标 error）
   * → 按 current 推导（前序 finish / 当前 process / 其余 wait）
   */
  private resolveStatus(step: StepItem, idx: number, current: number): StepStatus {
    if (step.status && VALID_STATUS.has(step.status)) return step.status
    if (idx === current) {
      const container = this.getAttr('status', '') as StepStatus
      if (VALID_STATUS.has(container)) return container
      return 'process'
    }
    if (idx < current) return 'finish'
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
