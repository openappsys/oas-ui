import { OASElement } from '@oas-ui/core'

/** 预设色板名（映射 --oas-preset-*-text 达标 token，color 属性支持按名引用；统一协议见 ui-spec §4.1） */
export type LabelPresetColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

export const LABEL_PRESET_COLORS: readonly LabelPresetColor[] = [
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

const STYLE = `
:host {
  display: inline-block;
  max-width: 100%;
  font-family: inherit;
}
label {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
  color: var(--oas-label-color, var(--oas-color-text-primary));
  font-size: var(--oas-font-size-md);
  line-height: 1.5;
  /* 长文本换行不溢出 */
  overflow-wrap: anywhere;
  white-space: normal;
}
label.clickable {
  cursor: pointer;
}
/* position="before"：星号显示在文本前 */
label.reverse {
  flex-direction: row-reverse;
}
/* error 状态色（表单校验失败语境） */
label.error {
  color: var(--oas-label-color, var(--oas-color-danger-text));
}
/* disabled 静态灰化（纯视觉，不拦事件——关联控件自己管 disabled） */
label.disabled {
  color: var(--oas-label-color, var(--oas-color-text-disabled));
}
.required {
  color: var(--oas-color-danger);
  line-height: 1;
  font-weight: 500;
}
.required[hidden] {
  display: none;
}
.colon[hidden] {
  display: none;
}
/* tooltip 提示图标按钮 */
.tooltip-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  cursor: help;
  color: var(--oas-color-text-secondary);
  font-size: 0.875em;
  line-height: 1;
  display: inline-flex;
}
.tooltip-btn[hidden] {
  display: none;
}
.tooltip-btn:hover {
  color: var(--oas-color-primary);
}
.tooltip-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

/** tooltip 提示图标（原创简单 ? 圆） */
const TOOLTIP_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M6.5 6.5a1.5 1.5 0 1 1 2.2 1.3c-.5.3-.7.6-.7 1.2"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/></svg>'

export class OASLabel extends OASElement {
  static override get observedAttributes(): string[] {
    return ['for', 'required', 'position', 'error', 'disabled', 'colon', 'tooltip', 'color']
  }

  private labelEl: HTMLElement | null = null
  private requiredEl: HTMLElement | null = null
  private colonEl: HTMLElement | null = null
  private tooltipBtn: HTMLElement | null = null
  private tooltipWrap: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <label part="label">
        <span part="text"><slot></slot></span>
        <span part="required" class="required" aria-hidden="true" hidden>*</span>
        <span part="colon" class="colon" aria-hidden="true" hidden>:</span>
        <oas-tooltip part="tooltip-wrap" hidden><button part="tooltip" class="tooltip-btn" type="button">${TOOLTIP_ICON_SVG}</button></oas-tooltip>
      </label>
    `
  }

  /** 缓存节点引用 + 绑定点击代理聚焦 + 双击防选中 + tooltip 浮层（render 与水合路径共用） */
  private bind(): void {
    this.labelEl = this.shadow.querySelector<HTMLElement>('[part="label"]')
    this.requiredEl = this.shadow.querySelector<HTMLElement>('[part="required"]')
    this.colonEl = this.shadow.querySelector<HTMLElement>('.colon')
    this.tooltipBtn = this.shadow.querySelector<HTMLElement>('.tooltip-btn')
    this.tooltipWrap = this.shadow.querySelector<HTMLElement>('[part="tooltip-wrap"]')

    // 点击代理聚焦 for 指向的目标控件（跨 Shadow DOM 原生 label 关联不可用，手动代理）
    const onClick = (e: MouseEvent) => {
      const forId = this.getAttr('for', '')
      if (!forId) return
      // tooltip 按钮的点击不触发聚焦代理（它是独立的交互点）
      if ((e.target as HTMLElement)?.closest('.tooltip-btn')) return
      e.preventDefault()
      const target = document.getElementById(forId)
      if (target && typeof (target as HTMLElement).focus === 'function') {
        ;(target as HTMLElement).focus()
      }
    }
    this.labelEl?.addEventListener('click', onClick)
    this.onCleanup(() => this.labelEl?.removeEventListener('click', onClick))

    // 双击防选中（主流行为：label 双击不选中文字）
    const onDblClick = (e: MouseEvent) => e.preventDefault()
    this.labelEl?.addEventListener('dblclick', onDblClick)
    this.onCleanup(() => this.labelEl?.removeEventListener('dblclick', onDblClick))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（label 元素存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="label"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.labelEl) return
    const forId = this.getAttr('for', '')
    const required = this.hasAttr('required')
    const position = this.getAttr('position', 'after')

    if (forId) {
      this.labelEl.setAttribute('for', forId)
    } else {
      this.labelEl.removeAttribute('for')
    }
    this.labelEl.classList.toggle('clickable', forId !== '')
    this.labelEl.classList.toggle('reverse', position === 'before')
    this.labelEl.classList.add('wrap')
    this.labelEl.classList.toggle('error', this.hasAttr('error'))
    this.labelEl.classList.toggle('disabled', this.hasAttr('disabled'))
    if (this.requiredEl) this.requiredEl.hidden = !required
    if (this.colonEl) this.colonEl.hidden = !this.hasAttr('colon')

    // tooltip：oas-tooltip 包住图标按钮（复用 tooltip 组件的 hover 浮层，不自造浮层）。
    // 懒加载注册：首次有 tooltip 属性时才 import floating/tooltip，避免 basic→floating 静态依赖链
    const tooltipText = this.getAttr('tooltip', '')
    if (this.tooltipWrap && this.tooltipBtn) {
      const show = tooltipText !== ''
      this.tooltipWrap.toggleAttribute('hidden', !show)
      this.tooltipBtn.hidden = !show
      if (show) {
        this.tooltipWrap.setAttribute('content', tooltipText)
        this.tooltipBtn.setAttribute('aria-label', this.t('label.tooltip') || '提示')
        // 懒注册 oas-tooltip（幂等；已注册则跳过）
        if (!customElements.get('oas-tooltip')) {
          import('../../floating/tooltip/index.js').catch(() => {})
        }
      }
    }

    // color 统一协议：预设名映射 --oas-preset-*-text 达标 token；任意 CSS 色值直注入；移除后回落
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (LABEL_PRESET_COLORS as readonly string[]).includes(color)
      this.labelEl.style.setProperty(
        '--oas-label-color',
        isPreset ? `var(--oas-preset-${color}-text)` : color,
      )
    } else {
      this.labelEl.style.removeProperty('--oas-label-color')
    }
  }
}
