import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

/** theme 合法值：三表体（charcoal/dark 恒深表面 + light 主题本色） */
export type ActionBarTheme = 'charcoal' | 'dark' | 'light'

const VALID_THEMES: readonly ActionBarTheme[] = ['charcoal', 'dark', 'light']
const warnedThemes = new Set<string>()

/** 非法 theme 归一化：回落 charcoal 并在 dev 下 console.warn 一次（同值去重，对齐库内惯例） */
function normalizeTheme(raw: string): ActionBarTheme {
  if ((VALID_THEMES as readonly string[]).includes(raw)) return raw as ActionBarTheme
  if (!warnedThemes.has(raw)) {
    warnedThemes.add(raw)
    console.warn(`[oas-action-bar] 非法 theme "${raw}"，已回落 charcoal；合法值：charcoal/dark/light`)
  }
  return 'charcoal'
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  box-sizing: border-box;
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-action-bar-height, 44px);
  box-sizing: border-box;
  padding: var(--oas-space-1) var(--oas-space-3);
  /* 默认（charcoal）表体：恒深表面 token（主题无关，transport 条视觉锚点） */
  background: var(--oas-action-bar-bg, var(--oas-color-ink));
  color: var(--oas-action-bar-fg, var(--oas-color-on-ink));
}
/* dark 表体：恒深表面·深档 */
:host([data-surface='dark']) .bar {
  background: var(--oas-action-bar-bg, var(--oas-color-ink-deep));
}
/* light 表体：主题本色（前景随主题翻转） */
:host([data-surface='light']) .bar {
  background: var(--oas-action-bar-bg, var(--oas-color-bg));
  color: var(--oas-action-bar-fg, var(--oas-color-text-primary));
}
/* light 表体下线上的命令按钮/读数井改用主题前景淡底：charcoal/dark 表体用 on-ink（近白）
   半透明提亮，落在本色浅底上不可见（按钮/井「消失」）；本段经 CSS 变量下发 slotted 子件
   （自定义属性跨 shadow/light 边界继承，宿主在子件上显式覆写仍优先）。 */
:host([data-surface='light']) {
  --oas-action-bar-button-bg: color-mix(in srgb, var(--oas-color-text-primary) 8%, transparent);
  --oas-action-bar-button-hover-bg: color-mix(in srgb, var(--oas-color-text-primary) 14%, transparent);
  --oas-action-bar-button-active-bg: color-mix(in srgb, var(--oas-color-text-primary) 22%, transparent);
  --oas-action-bar-well-bg: color-mix(in srgb, var(--oas-color-text-primary) 6%, transparent);
}
.start,
.center,
.end {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
}
/* 读数井区推到书写方向远端（命令区恒在近端；RTL 自动镜像） */
.center {
  margin-inline-start: auto;
}
/* 末端区默认也推远端（center 隐藏时接棒——「末端」语义不因井缺席而失效，RTL 自动镜像）；
   center 在场时改回固定间距（井区贴末端，保持「命令|井|末端」紧凑排布） */
.end {
  margin-inline-start: auto;
}
.center:not([hidden]) + .end {
  margin-inline-start: var(--oas-space-2);
}
.end[hidden],
.center[hidden],
.start[hidden] {
  display: none;
}
::slotted(*) {
  flex-shrink: 0;
}
/* slotted 命令件焦点环（命令区语义，对齐 toolbar 惯例） */
::slotted(:focus-visible) {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

/**
 * oas-action-bar —— 操作/transport 条（底部命令条 + 读数井）。
 *
 * 与 oas-toolbar（工具调色板）的分工：action-bar 是底部命令 + 读数——按钮组之外
 * 承载读数井（统计/任务进度/媒体 transport/音乐节奏），井是本件立身之本。
 *
 * 属性（kebab-case）：
 * - `theme`：`charcoal`（默认，恒深表面）/ `dark`（恒深·深档）/ `light`（主题本色）；
 *   非法值回落并告警（同值去重）
 *
 * 插槽：`start`（前部命令）、默认（命令区）、`center`（读数井区，推远端）、`end`（末端）。
 *
 * 事件：子件 `oas-action` / `oas-cancel` bubbles + composed 自然冒泡，容器与宿主均可监听。
 *
 * a11y：容器 `role="group"` + aria-label（i18n）。语义取舍：不作 `role="toolbar"`——
 * toolbar 角色承诺 roving tabindex 导航契约（单一 Tab 停靠 + 方向键移动），前提是
 * 「一组命令按钮」；本件 center 槽常规承载读数井（statistic/task-progress，progressbar 与
 * aria-live 读数区非命令控件），混入后纯命令集合前提不成立，故降级 group 诚实播报，
 * 命令按钮各自原生 Tab 可达（对齐 WAI-ARIA group 模式）。
 * slotted 焦点环；RTL：`data-rtl` 钩子 + 全逻辑属性布局（井区 auto margin 推远端随书写方向镜像）。
 */
export class OASActionBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['theme', 'dir']
  }

  private barEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="group">
        <div class="start" part="start" hidden><slot name="start"></slot></div>
        <slot></slot>
        <div class="center" part="center" hidden><slot name="center"></slot></div>
        <div class="end" part="end" hidden><slot name="end"></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector('[part="bar"]')
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（bar + slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bar"]')) return false
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // theme 表体钩子（data-surface 避开全局 data-theme 语义，非法值回落 + 告警在 normalizeTheme 内）
    this.dataset.surface = normalizeTheme(this.getAttr('theme', 'charcoal'))
    // 容器可访问名称（locale 反应式）
    this.barEl?.setAttribute('aria-label', this.t('actionBar.label'))
    // 插槽区空态：无内容不渲染容器（无井时退化为纯命令条）
    for (const name of ['start', 'center', 'end'] as const) {
      const wrap = this.shadow.querySelector<HTMLElement>(`[part="${name}"]`)
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      if (wrap && slot) wrap.hidden = !this.hasSlotContent(slot)
    }
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
