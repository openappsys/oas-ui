import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  position: relative;
  display: inline-block;
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger:hover {
  border-color: var(--oas-color-primary);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
.trigger[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.swatch {
  width: 18px;
  height: 18px;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  flex-shrink: 0;
}
.hex-text {
  font-variant-numeric: tabular-nums;
  min-width: 52px;
  text-align: left;
}
.panel {
  position: absolute;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  top: calc(100% + 4px);
  left: 0;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-3);
  display: none;
  width: 220px;
}
.panel.open {
  display: block;
}
.preset-title {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  margin-bottom: var(--oas-space-2);
}
.presets {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-3);
}
.preset {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
  cursor: pointer;
  padding: 0;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.preset:hover {
  transform: scale(1.12);
}
.preset:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  margin-bottom: var(--oas-space-2);
}
.row label {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  width: 32px;
  flex-shrink: 0;
}
.row input[type='range'] {
  flex: 1;
  accent-color: var(--oas-color-primary);
}
.row input[type='number'] {
  box-sizing: border-box;
  width: 56px;
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  padding: 0 var(--oas-space-1);
}
.row input[type='number']:focus {
  outline: none;
  border-color: var(--oas-color-primary);
}
`

interface RGB {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(rgb: RGB): string {
  const to = (v: number): string =>
    Math.min(255, Math.max(0, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`
}

const DEFAULT_PRESETS = [
  '#0b6cff',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#9333ea',
  '#0ea5e9',
  '#18181b',
  '#71717a',
  '#a1a1aa',
  '#e4e4e7',
  '#ffffff',
  '#f4f4f5',
]

export class OASColorPicker extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'preset', 'disabled']
  }

  private trigger: HTMLButtonElement | null = null
  private panel: HTMLElement | null = null
  private presets: string[] = DEFAULT_PRESETS
  private openState = false
  private rgb: RGB = { r: 0, g: 102, b: 255 }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button"
          aria-label="${this.t('colorPicker.label')}" aria-haspopup="dialog" aria-expanded="false">
          <span class="swatch" part="swatch"></span>
          <span class="hex-text" part="hex-text"></span>
        </button>
        <div class="panel" part="panel" role="dialog" aria-label="${this.t('colorPicker.label')}">
          <div class="preset-title">${this.t('colorPicker.preset')}</div>
          <div class="presets" part="presets"></div>
          <div class="row">
            <label for="c-hue">${this.t('colorPicker.hue')}</label>
            <input id="c-hue" class="hue" type="range" min="0" max="360" step="1" aria-label="${this.t('colorPicker.hue')}" />
          </div>
          <div class="row">
            <label for="c-sat">${this.t('colorPicker.saturation')}</label>
            <input id="c-sat" class="sat" type="range" min="0" max="100" step="1" aria-label="${this.t('colorPicker.saturation')}" />
          </div>
          <div class="row">
            <label for="c-val">${this.t('colorPicker.brightness')}</label>
            <input id="c-val" class="val" type="range" min="0" max="100" step="1" aria-label="${this.t('colorPicker.brightness')}" />
          </div>
          <div class="row">
            <label for="c-r">${this.t('colorPicker.red')}</label>
            <input id="c-r" class="r" type="number" min="0" max="255" />
          </div>
          <div class="row">
            <label for="c-g">${this.t('colorPicker.green')}</label>
            <input id="c-g" class="g" type="number" min="0" max="255" />
          </div>
          <div class="row">
            <label for="c-b">${this.t('colorPicker.blue')}</label>
            <input id="c-b" class="b" type="number" min="0" max="255" />
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/通道滑杆/数字输入/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.trigger = this.shadow.querySelector('.trigger')
    this.panel = this.shadow.querySelector('.panel')

    this.trigger?.addEventListener('click', () => this.toggle())
    this.trigger?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))

    this.shadow
      .querySelector<HTMLInputElement>('.hue')
      ?.addEventListener('input', (e) => this.fromHsl((e.target as HTMLInputElement).value, 'h'))
    this.shadow
      .querySelector<HTMLInputElement>('.sat')
      ?.addEventListener('input', (e) => this.fromHsl((e.target as HTMLInputElement).value, 's'))
    this.shadow
      .querySelector<HTMLInputElement>('.val')
      ?.addEventListener('input', (e) => this.fromHsl((e.target as HTMLInputElement).value, 'v'))
    this.shadow
      .querySelector<HTMLInputElement>('.r')
      ?.addEventListener('input', (e) => this.fromRgb((e.target as HTMLInputElement).value, 'r'))
    this.shadow
      .querySelector<HTMLInputElement>('.g')
      ?.addEventListener('input', (e) => this.fromRgb((e.target as HTMLInputElement).value, 'g'))
    this.shadow
      .querySelector<HTMLInputElement>('.b')
      ?.addEventListener('input', (e) => this.fromRgb((e.target as HTMLInputElement).value, 'b'))

    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger 与面板存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.trigger')) return false
    if (!this.shadow.querySelector('.panel')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.trigger || !this.panel) return
    this.parsePresets()
    const hex = this.normalizeHex(this.getAttr('value', '#0066ff'))
    this.rgb = hexToRgb(hex) ?? this.rgb
    this.syncTrigger()
    this.syncControls()
    this.renderPresets()
  }

  private normalizeHex(hex: string): string {
    const m = /^#?([0-9a-f]{3})$/i.exec(hex.trim())
    if (m) {
      const s = m[1]!
      return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
    }
    return /^#?[0-9a-f]{6}$/i.test(hex.trim())
      ? `#${hex.trim().replace(/^#/, '').toLowerCase()}`
      : '#0066ff'
  }

  private parsePresets(): void {
    try {
      const parsed = JSON.parse(this.getAttr('preset', ''))
      if (Array.isArray(parsed)) {
        const colors = parsed.filter(
          (c): c is string => typeof c === 'string' && /^#?[0-9a-f]{3,6}$/i.test(c),
        )
        if (colors.length > 0) this.presets = colors
      }
    } catch {
      // 保持默认
    }
  }

  private renderPresets(): void {
    const box = this.shadow.querySelector<HTMLElement>('.presets')
    if (!box) return
    box.innerHTML = ''
    for (const color of this.presets) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'preset'
      btn.setAttribute('part', 'preset')
      btn.style.background = color
      btn.setAttribute('aria-label', color)
      btn.addEventListener('click', () => this.commit(color))
      box.appendChild(btn)
    }
  }

  private toggle(): void {
    if (this.hasAttr('disabled')) return
    this.openState = !this.openState
    this.syncPanel()
  }

  private syncPanel(): void {
    if (!this.panel || !this.trigger) return
    this.panel.classList.toggle('open', this.openState)
    this.trigger.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) document.addEventListener('click', this.handleOutsideClick, true)
    else document.removeEventListener('click', this.handleOutsideClick, true)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.openState = false
    }
    this.syncPanel()
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.hasAttr('disabled')) return
    if (e.key === 'Escape' && this.openState) {
      this.openState = false
      this.syncPanel()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const dir = e.key === 'ArrowUp' ? 1 : -1
      this.adjustBrightness(dir * 5)
    }
  }

  /** ↑↓ 调亮度：按百分比缩放 RGB（如无盘则等效调节亮度） */
  private adjustBrightness(step: number): void {
    const rgb = this.rgb
    const factor = (100 + step) / 100
    const next: RGB = {
      r: Math.min(255, Math.max(0, rgb.r * factor)),
      g: Math.min(255, Math.max(0, rgb.g * factor)),
      b: Math.min(255, Math.max(0, rgb.b * factor)),
    }
    this.commit(rgbToHex(next))
  }

  private syncTrigger(): void {
    if (!this.trigger) return
    const hex = rgbToHex(this.rgb)
    const swatch = this.trigger.querySelector<HTMLElement>('.swatch')
    if (swatch) swatch.style.background = hex
    const text = this.trigger.querySelector<HTMLElement>('.hex-text')
    if (text) text.textContent = hex
    this.trigger.disabled = this.hasAttr('disabled')
    this.trigger.setAttribute('aria-label', this.t('colorPicker.label'))
  }

  private syncControls(): void {
    const { r, g, b } = this.rgb
    this.shadow.querySelector<HTMLInputElement>('.r')!.value = String(r)
    this.shadow.querySelector<HTMLInputElement>('.g')!.value = String(g)
    this.shadow.querySelector<HTMLInputElement>('.b')!.value = String(b)
    const [h, s, v] = rgbToHsv(r, g, b)
    this.shadow.querySelector<HTMLInputElement>('.hue')!.value = String(Math.round(h))
    this.shadow.querySelector<HTMLInputElement>('.sat')!.value = String(Math.round(s * 100))
    this.shadow.querySelector<HTMLInputElement>('.val')!.value = String(Math.round(v * 100))
  }

  private fromHsl(value: string, which: 'h' | 's' | 'v'): void {
    const [h, s, v] = rgbToHsv(this.rgb.r, this.rgb.g, this.rgb.b)
    const num = Number(value) || 0
    const nextH = which === 'h' ? num : h
    const nextS = which === 's' ? num / 100 : s
    const nextV = which === 'v' ? num / 100 : v
    const { r, g, b } = hsvToRgb(nextH, nextS, nextV)
    this.commit(rgbToHex({ r, g, b }))
  }

  private fromRgb(value: string, which: 'r' | 'g' | 'b'): void {
    const next: RGB = { ...this.rgb, [which]: Number(value) || 0 }
    this.commit(rgbToHex(next))
  }

  private commit(hex: string): void {
    const normalized = this.normalizeHex(hex)
    if (this.getAttr('value', '') !== normalized) this.setAttribute('value', normalized)
    this.rgb = hexToRgb(normalized) ?? this.rgb
    this.syncTrigger()
    this.syncControls()
    this.emit('change', { value: normalized })
  }
}

/** RGB(0-255) → HSV(h 0-360, s 0-1, v 0-1) */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6
    else if (max === G) h = (B - R) / d + 2
    else h = (R - G) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return [h, s, max]
}

/** HSV → RGB(0-255) */
function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s
  const hp = ((h % 360) + 360) % 360
  const x = c * (1 - Math.abs(((hp / 60) % 2) - 1))
  let rgb: [number, number, number]
  if (hp < 60) rgb = [c, x, 0]
  else if (hp < 120) rgb = [x, c, 0]
  else if (hp < 180) rgb = [0, c, x]
  else if (hp < 240) rgb = [0, x, c]
  else if (hp < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const m = v - c
  return {
    r: (rgb[0]! + m) * 255,
    g: (rgb[1]! + m) * 255,
    b: (rgb[2]! + m) * 255,
  }
}
