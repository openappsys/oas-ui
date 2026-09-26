import { OASElement } from '@oas-ui/core'
import { normalizeSizeStrict, ALL_SIZES, type OasSize } from '../../shared/size.js'

const STYLE = `
:host {
  display: inline-block;
  vertical-align: middle;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.swatch {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
  position: relative;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.swatch:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--oas-shadow-sm);
}
.swatch:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.swatch:disabled {
  cursor: not-allowed;
  /* 禁用透明度：全库统一 0.6（tag/button 同值），无独立 token */
  opacity: 0.6;
}
/* 尺寸档位（边长走 ui-spec §2.1 控件高度） */
:host([data-size='xs']) .swatch { width: var(--oas-control-height-xs); height: var(--oas-control-height-xs); }
:host([data-size='small']) .swatch { width: var(--oas-control-height-sm); height: var(--oas-control-height-sm); }
:host([data-size='medium']) .swatch { width: var(--oas-control-height-md); height: var(--oas-control-height-md); }
:host([data-size='large']) .swatch { width: var(--oas-control-height-lg); height: var(--oas-control-height-lg); }
:host([data-size='xl']) .swatch { width: var(--oas-control-height-xl); height: var(--oas-control-height-xl); }
/* 形状三态 */
:host([data-shape='square']) .swatch { border-radius: 0; }
:host([data-shape='circle']) .swatch { border-radius: var(--oas-radius-full); }
/* 无色/透明：棋盘格底 */
.swatch.nothing {
  background-image: linear-gradient(45deg, var(--oas-color-bg-disabled) 25%, transparent 25%, transparent 75%, var(--oas-color-bg-disabled) 75%),
    linear-gradient(45deg, var(--oas-color-bg-disabled) 25%, transparent 25%, transparent 75%, var(--oas-color-bg-disabled) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 4px 4px;
  background-color: var(--oas-color-bg);
}
/* 混色：四色拼贴指示（预设色 token 派生，dark 自动跟随） */
.swatch.mixed {
  background-image: conic-gradient(var(--oas-preset-magenta) 0 25%, var(--oas-preset-cyan) 0 50%, var(--oas-preset-gold) 0 75%, var(--oas-preset-blue) 0);
}
/* 选中态：主色外环描边（双层阴影实现内白环+外色环，暗色可读） */
:host([data-selected]) .swatch {
  box-shadow: 0 0 0 2px var(--oas-color-bg), 0 0 0 4px var(--oas-color-primary);
}
:host([data-selected]) .swatch:hover:not(:disabled) {
  box-shadow: 0 0 0 2px var(--oas-color-bg), 0 0 0 4px var(--oas-color-primary-hover);
}
`

/** 颜色属性统一协议（ui-spec §4.1）的预设名 */
const PRESET_COLORS = new Set([
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
])

const warnedSizes = new Set<string>()
function warnInvalidSize(raw: string): void {
  if (warnedSizes.has(raw)) return
  warnedSizes.add(raw)
  console.warn(`[oas-swatch] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
}

/**
 * oas-swatch —— 色板色块件（内联预设色快选/展示的载体；选择组语义见 oas-swatch-group）。
 *
 * 属性（kebab-case）：
 * - `color`：填充色（CSS 色值或 11 预设名，统一协议 §4.1）
 * - `size`：边长档位 xs/small/medium（默认）/large/xl（非法回落 medium 告警一次）
 * - `shape`：square / rounded（默认）/ circle
 * - `nothing`：无色/透明指示（棋盘格底，不依赖 color）
 * - `mixed`：混色指示（多色拼贴，混色数据源场景）
 * - `disabled`：禁用（不可点、不可聚焦）
 * - `selected`：受控选中态（选中外环描边；组内由 oas-swatch-group 统一驱动）
 * - `label`：可访问名（缺省 i18n `swatch.color` + 色值）
 *
 * 事件：`oas-click`（detail { color }，bubbles+composed）
 *
 * ARIA：role=button + aria-pressed 同步选中态；组内（group 选择语义在场时）改挂
 * role=radio/checkbox + aria-checked（由 oas-swatch-group 驱动）。
 */
export class OASSwatch extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'color',
      'size',
      'shape',
      'nothing',
      'mixed',
      'disabled',
      'selected',
      'label',
      'aria-label',
      'dir',
      // 组下发通道（data-group-disabled 由 oas-swatch-group 写入，对齐 radio-group 惯例）
      'data-group-disabled',
    ]
  }

  private btnEl: HTMLButtonElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button class="swatch" part="swatch" type="button" role="button" aria-pressed="false"></button>
    `
  }

  private bind(): void {
    this.btnEl = this.shadow.querySelector<HTMLButtonElement>('[part="swatch"]')
    this.btnEl?.addEventListener('click', () => {
      if (this.hasAttr('disabled')) return
      this.emit('click', { color: this.getAttr('color', '') })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（swatch 按钮存在）后直接接管 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="swatch"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const btn = this.btnEl
    if (!btn) return

    // 填充色：预设名 → var(--oas-preset-*)；CSS 色值直注；缺省走透明
    const color = this.getAttr('color', '').trim()
    if (color && PRESET_COLORS.has(color)) btn.style.backgroundColor = `var(--oas-preset-${color})`
    else if (color) btn.style.backgroundColor = color
    else btn.style.backgroundColor = ''

    // 形态标记
    btn.classList.toggle('nothing', this.hasAttr('nothing'))
    btn.classList.toggle('mixed', this.hasAttr('mixed'))

    // 尺寸档位（五档，非法回落告警一次）
    const { value: size, isValid } = normalizeSizeStrict(this.getAttr('size', 'medium'), ALL_SIZES, 'medium')
    if (!isValid) warnInvalidSize(this.getAttr('size', ''))
    this.setAttribute('data-size', size as OasSize)

    // 形状三态（非法回落 rounded）
    const shape = this.getAttr('shape', 'rounded')
    this.setAttribute('data-shape', shape === 'square' || shape === 'circle' ? shape : 'rounded')

    // 禁用：内钮 disabled + 宿主 aria-disabled（roving 焦点链排除由组处理）
    // 禁用：自身 disabled 或组下发 data-group-disabled（组禁用不抹子件自有属性，见 group 约定）
    const disabled = this.hasAttr('disabled') || this.hasAttr('data-group-disabled') || this.injectDisabled()
    btn.disabled = disabled
    this.toggleAttribute('aria-disabled', disabled)

    // 选中态：data-selected 标记 + aria-pressed（组语义下组会改挂 aria-checked）
    const selected = this.hasAttr('selected')
    this.toggleAttribute('data-selected', selected)
    if (btn.getAttribute('role') === 'button') btn.setAttribute('aria-pressed', String(selected))

    // 可访问名：label 属性 > aria-label 属性 > i18n（swatch.color + 色值）
    const label = this.getAttr('label', this.getAttribute('aria-label') ?? '')
    btn.setAttribute('aria-label', label || `${this.t('swatch.color')}${color ? ` ${color}` : ''}`)
  }

  /** 组语义切换挂点（oas-swatch-group 驱动：button→radio/checkbox + aria-checked） */
  setGroupRole(role: 'radio' | 'checkbox' | null): void {
    const btn = this.btnEl
    if (!btn) return
    if (!role) {
      btn.setAttribute('role', 'button')
      btn.setAttribute('aria-pressed', String(this.hasAttr('selected')))
      btn.removeAttribute('aria-checked')
      return
    }
    btn.setAttribute('role', role)
    btn.removeAttribute('aria-pressed')
    btn.setAttribute('aria-checked', String(this.hasAttr('selected')))
  }

  /** 组同步选中态（含 ARIA 同步） */
  syncSelected(selected: boolean): void {
    this.toggleAttribute('selected', selected)
    const btn = this.btnEl
    if (!btn) return
    const role = btn.getAttribute('role')
    if (role === 'radio' || role === 'checkbox') btn.setAttribute('aria-checked', String(selected))
    else btn.setAttribute('aria-pressed', String(selected))
  }
}
