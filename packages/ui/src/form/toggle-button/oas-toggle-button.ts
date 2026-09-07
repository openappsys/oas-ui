import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ToggleButtonSize = 'small' | 'medium' | 'large'
export type ToggleButtonStatus = 'success' | 'warning' | 'error'

const VALID_SIZES: readonly ToggleButtonSize[] = ['small', 'medium', 'large']
const VALID_STATUSES: readonly ToggleButtonStatus[] = ['success', 'warning', 'error']
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
 * 自定义选中色的实底文字色：按相对亮度取深/浅，保证对比可读。
 * 支持 #rgb/#rrggbb/rgb(a) 字面量；其余写法（var()/预设名等）返回 ''（走 CSS 兜底 token）。
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
button {
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
button:hover {
  border-color: var(--oas-toggle-color, var(--oas-color-primary));
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[aria-pressed='true'] {
  background: var(--oas-toggle-color, var(--oas-color-primary));
  border-color: var(--oas-toggle-color, var(--oas-color-primary));
  color: var(--oas-toggle-on-color, var(--oas-color-text-on-primary));
}
button[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
}
/* ---- 图标：iconRegistry 内联 SVG（跟随 currentColor，装饰性对读屏隐藏） ---- */
button.has-icon {
  gap: var(--oas-space-2);
}
button .icon {
  display: inline-flex;
}
button.icon-only {
  aspect-ratio: 1;
  padding: 0;
}
/* ---- size 尺寸档（默认 medium 走基础样式；控高对齐 control-height token） ---- */
:host([data-size='small']) button {
  min-height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding-inline: var(--oas-space-3);
}
:host([data-size='large']) button {
  min-height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding-inline: var(--oas-space-5);
}
/* ---- status 校验态：success / warning / error（宿主自设 aria-invalid 等效 error，置于最后统一胜出） ---- */
:host([data-status='success']) button {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='success']) button[aria-pressed='true'] {
  background: var(--oas-color-success);
  border-color: var(--oas-color-success);
  color: var(--oas-color-text-on-success);
}
:host([data-status='warning']) button {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='warning']) button[aria-pressed='true'] {
  background: var(--oas-color-warning);
  border-color: var(--oas-color-warning);
  color: var(--oas-color-text-on-warning);
}
:host([data-status='error']) button,
:host([aria-invalid='true']) button {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) button:focus-visible,
:host([aria-invalid='true']) button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='error']) button[aria-pressed='true'],
:host([aria-invalid='true']) button[aria-pressed='true'] {
  background: var(--oas-color-danger);
  border-color: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
}
`

export class OASToggleButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'pressed', 'disabled', 'size', 'icon', 'color', 'status', 'aria-label']
  }

  private btn: HTMLButtonElement | null = null
  /** aria-invalid 由 status=error 联动写入的所有权标志：清理时只移除组件设置的，不动宿主自设 */
  private invalidByStatus = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button part="button" type="button" role="button" aria-pressed="false">
        <span class="icon" part="icon" aria-hidden="true" hidden></span>
        <slot></slot>
      </button>
    `
  }

  /** 缓存节点引用 + 绑定切换事件（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('button')
    this.btn?.addEventListener('click', () => this.toggle())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（button 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('button[part="button"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const btn = this.btn
    if (!btn) return
    const pressed = this.hasAttr('pressed')
    btn.setAttribute('aria-pressed', String(pressed))
    btn.disabled = this.hasAttr('disabled')
    this.syncSizeStatus()
    this.syncIcon()
    this.syncColor()
  }

  /** size/status 镜像到宿主 data-*（供 :host([data-*]) 样式消费）；error 联动 aria-invalid */
  private syncSizeStatus(): void {
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
  }

  /** 图标渲染与可访问名称：宿主 aria-label 优先；纯图标（无文字）时以图标名兜底 */
  private syncIcon(): void {
    const btn = this.btn
    if (!btn) return
    const icon = this.getAttr('icon', '')
    const content = icon ? iconRegistry[icon as IconName] : undefined
    const hasIcon = content !== undefined
    const hasText = (this.textContent ?? '').trim().length > 0
    const iconOnly = hasIcon && !hasText
    btn.className = [hasIcon ? 'has-icon' : '', iconOnly ? 'icon-only' : '']
      .filter(Boolean)
      .join(' ')
    const iconEl = this.shadow.querySelector<HTMLElement>('.icon')
    if (iconEl) {
      iconEl.hidden = !hasIcon
      iconEl.textContent = ''
      if (content) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '0 0 16 16')
        svg.setAttribute('width', '1em')
        svg.setAttribute('height', '1em')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.innerHTML = content
        iconEl.appendChild(svg)
      }
    }
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) btn.setAttribute('aria-label', hostLabel)
    else if (iconOnly) btn.setAttribute('aria-label', icon)
    else btn.removeAttribute('aria-label')
  }

  /** color 选中色（ui-spec §4.1 三级协议）：预设名 → preset token；字面色直接注入并计算实底文字色 */
  private syncColor(): void {
    const color = this.getAttr('color', '')
    if (color) {
      const isPreset = (PRESET_COLORS as readonly string[]).includes(color)
      const base = isPreset ? `var(--oas-preset-${color})` : color
      this.style.setProperty('--oas-toggle-color', base)
      // 预设名/变量写法无法在 JS 侧算亮度，交由 CSS 的 text-on-primary 兜底；字面量才算
      const onColor = isPreset ? '' : pickOnColor(color)
      if (onColor) this.style.setProperty('--oas-toggle-on-color', onColor)
      else this.style.removeProperty('--oas-toggle-on-color')
    } else {
      this.style.removeProperty('--oas-toggle-color')
      this.style.removeProperty('--oas-toggle-on-color')
    }
  }

  private toggle(): void {
    if (this.hasAttr('disabled')) return
    const pressed = !this.hasAttr('pressed')
    this.toggleAttribute('pressed', pressed)
    this.emit('change', { value: this.getAttr('value', ''), pressed })
  }
}
