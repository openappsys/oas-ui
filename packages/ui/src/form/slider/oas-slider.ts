import { OASElement } from '@oas-ui/core'

/** 单个刻度：数值 + 展示标签（show-stops 生成的刻度点无标签） */
interface MarkEntry {
  value: number
  label: string
}

/** 数值输入框防抖提交时长（ms） */
const DEBOUNCE_MS = 300

/** 默认 thumb 直径（px），用于把百分比换算成像素定位（尺寸档位见 THUMB_SIZES） */
const THUMB_SIZE = 14

/** show-stops 刻度点数量上限（超过不渲染，防 DOM 爆炸） */
const MAX_STOPS = 100

/** step="mark" 模式键盘大步跳过的刻度档数 */
const MARK_BIG_STEP = 3

/** 尺寸档 thumb 直径表（与 CSS --oas-slider-thumb-size 各档取值成对维护） */
const THUMB_SIZES: Record<string, number> = { sm: 10, md: 14, lg: 18 }

/** 预设语义色名 → token 变量（非预设值原样透传；不硬编码色值，暗色变体随 token 切换） */
const COLOR_TOKENS: Record<string, string> = {
  primary: 'var(--oas-color-primary)',
  success: 'var(--oas-color-success)',
  warning: 'var(--oas-color-warning)',
  danger: 'var(--oas-color-danger)',
}

/** tooltip-position 合法值 */
const TOOLTIP_POSITIONS = new Set(['top', 'bottom', 'left', 'right'])

function clampNum(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** 解析 range 模式 value：JSON 数组 `[lo, hi]` 或逗号分隔 `"lo,hi"`，非法返回 null */
function parseRangeValue(raw: string): [number, number] | null {
  try {
    const j = JSON.parse(raw)
    if (Array.isArray(j) && j.length === 2 && j.every((n) => Number.isFinite(n))) {
      return [Number(j[0]), Number(j[1])]
    }
  } catch {
    /* 不是 JSON，走逗号分隔 */
  }
  const parts = raw.split(',').map((s) => Number(s.trim()))
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return [parts[0]!, parts[1]!]
  }
  return null
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  width: 100%;
  min-width: 120px;
  /* 尺寸档变量（与 THUMB_SIZES 常量表成对维护） */
  --oas-slider-track-size: 4px;
  --oas-slider-thumb-size: 14px;
  /* 颜色通道：color / track-color 属性映射到宿主 CSS 变量，任意值可覆盖 */
  --oas-slider-color: var(--oas-color-primary);
  --oas-slider-track: var(--oas-color-border);
}
:host([data-size='sm']) {
  --oas-slider-track-size: 3px;
  --oas-slider-thumb-size: 10px;
}
:host([data-size='lg']) {
  --oas-slider-track-size: 6px;
  --oas-slider-thumb-size: 18px;
}
/* 垂直模式：宿主宽度收缩为轨道宽度，高度走变量（默认 200px） */
:host([data-vertical]) {
  width: auto;
  min-width: 0;
}
.wrap {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
}
:host([data-vertical]) .wrap {
  flex-direction: column;
  align-items: center;
}
.slider-col {
  flex: 1 1 auto;
  min-width: 0;
}
:host([data-vertical]) .slider-col {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
}
.track-wrap {
  position: relative;
  height: 20px;
}
:host([data-vertical]) .track-wrap {
  width: 20px;
  height: var(--oas-slider-height, 200px);
}
/* 灰色轨道底层：由 track-wrap 伪元素承担（DOM 序最前 = 最底层）。
   原生 input 的 track 背景必须透明——range 模式 pointerdown 提升 input z-index 抢拖动权时，
   若灰轨道画在原生 track 上会随之上浮盖住 .fill（蓝色区间填充消失） */
.track-wrap::before {
  content: '';
  position: absolute;
  top: calc((20px - var(--oas-slider-track-size)) / 2);
  left: 0;
  right: 0;
  height: var(--oas-slider-track-size);
  border-radius: var(--oas-slider-track-size);
  background: var(--oas-slider-track);
}
:host([data-vertical]) .track-wrap::before {
  top: 0;
  bottom: 0;
  left: calc((20px - var(--oas-slider-track-size)) / 2);
  right: auto;
  height: auto;
  width: var(--oas-slider-track-size);
}
:host([disabled]) .track-wrap::before,
:host([data-disabled]) .track-wrap::before {
  opacity: 0.6;
}
input[type="range"] {
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
/* 垂直模式：现代 CSS 方案（writing-mode 竖直），配合 JS 设置的 orient 属性兼容 Firefox */
:host([data-vertical]) input[type="range"] {
  writing-mode: vertical-lr;
}
:host([data-readonly]) input[type="range"] {
  cursor: default;
}
input::-webkit-slider-runnable-track {
  height: var(--oas-slider-track-size);
  border-radius: var(--oas-slider-track-size);
  background: transparent;
}
input::-webkit-slider-thumb {
  appearance: none;
  width: var(--oas-slider-thumb-size);
  height: var(--oas-slider-thumb-size);
  border-radius: 50%;
  margin-top: calc((var(--oas-slider-track-size) - var(--oas-slider-thumb-size)) / 2);
  background: var(--oas-slider-color);
  border: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
/* Firefox：moz 伪元素必须与 webkit 分开书写（浏览器遇到不认识的伪元素会使整条规则失效）；
   ::-moz-range-thumb 相对 track 自动居中，无需 webkit 的 margin-top 偏移 */
input::-moz-range-track {
  height: var(--oas-slider-track-size);
  border-radius: var(--oas-slider-track-size);
  background: transparent;
}
input::-moz-range-thumb {
  width: var(--oas-slider-thumb-size);
  height: var(--oas-slider-thumb-size);
  border-radius: 50%;
  background: var(--oas-slider-color);
  border: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
input::-moz-range-thumb:hover {
  transform: scale(1.15);
}
/* 自定义滑块/气泡模式：隐藏原生 thumb（保留命中区，拖动与键盘仍走原生输入） */
:host([data-custom-thumb]) input::-webkit-slider-thumb {
  opacity: 0;
}
:host([data-custom-thumb]) input::-moz-range-thumb {
  opacity: 0;
}
input:focus-visible {
  outline: none;
}
input:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--oas-focus-ring);
}
input:focus-visible::-moz-range-thumb {
  box-shadow: var(--oas-focus-ring);
}
input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
/* 已选中区间填充：单值从 start-point（缺省 min）端填充，范围模式填在两 thumb 之间 */
.fill {
  position: absolute;
  top: calc((20px - var(--oas-slider-track-size)) / 2);
  height: var(--oas-slider-track-size);
  border-radius: var(--oas-slider-track-size);
  background: var(--oas-slider-color);
  pointer-events: none;
  transition: left var(--oas-transition-fast) var(--oas-ease-out),
    right var(--oas-transition-fast) var(--oas-ease-out),
    width var(--oas-transition-fast) var(--oas-ease-out);
}
:host([data-vertical]) .fill {
  top: 0;
  left: calc((20px - var(--oas-slider-track-size)) / 2);
  width: var(--oas-slider-track-size);
}
:host([disabled]) .fill,
:host([data-disabled]) .fill {
  opacity: 0.6;
}
/* 自定义滑块：内容可定制（custom-thumb 插槽/模板），与值气泡共存 */
.custom-thumb {
  position: absolute;
  top: 10px;
  left: 0;
  width: var(--oas-slider-thumb-size);
  height: var(--oas-slider-thumb-size);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--oas-color-bg);
  border: 2px solid var(--oas-slider-color);
  pointer-events: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
/* 垂直模式：定位原点换到轨道中线 x（top 由 JS 按值写入） */
:host([data-vertical]) .custom-thumb {
  top: 0;
  left: 10px;
}
/* author display:flex 会压过 UA [hidden] 规则，显式恢复隐藏（否则 hidden 滑块恒可见：
    默认堆在轨道起点呈白圈、拖动后残留在值位置呈双滑块假象） */
.custom-thumb[hidden] {
  display: none;
}
:host(:hover):not([data-readonly]) .custom-thumb {
  transform: translate(-50%, -50%) scale(1.15);
}
:host([data-focused='value']) .custom-thumb[data-thumb='value'],
:host([data-focused='min']) .custom-thumb[data-thumb='min'],
:host([data-focused='max']) .custom-thumb[data-thumb='max'] {
  box-shadow: var(--oas-focus-ring);
}
.thumb-content {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}
/* 值气泡：默认在滑块上方；tooltip-position 四向切换（vertical 默认 right 由 JS 镜像 data-tooltip-pos） */
.thumb-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 6px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  white-space: nowrap;
}
:host([data-tooltip-pos='bottom']) .thumb-tip {
  bottom: auto;
  top: calc(100% + 6px);
}
:host([data-tooltip-pos='left']) .thumb-tip {
  bottom: auto;
  left: auto;
  right: calc(100% + 6px);
  top: 50%;
  transform: translateY(-50%);
}
:host([data-tooltip-pos='right']) .thumb-tip {
  bottom: auto;
  left: calc(100% + 6px);
  top: 50%;
  transform: translateY(-50%);
}
/* 刻度区：紧贴轨道下方（轨道底边距 input 底边 8px，向上偏移使刻度点贴合轨道下缘） */
.marks {
  position: relative;
  width: 100%;
  margin-top: -6px;
}
/* 垂直模式：刻度区移到轨道右侧，刻度点沿竖直轴向排布 */
:host([data-vertical]) .marks {
  width: auto;
  height: 100%;
  margin-top: 0;
  margin-left: var(--oas-space-2);
}
.mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}
:host([data-vertical]) .mark {
  display: flex;
  align-items: center;
  transform: translateY(-50%);
}
.mark-dot {
  width: 4px;
  height: 4px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--oas-color-border);
}
.mark[data-passed='true'] .mark-dot {
  background: var(--oas-slider-color);
}
.mark-label {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
:host([data-vertical]) .mark-label {
  margin-top: 0;
  margin-left: var(--oas-space-1);
}
.mark[data-passed='true'] .mark-label {
  color: var(--oas-color-text-primary);
}
:host([disabled]) .marks,
:host([data-disabled]) .marks {
  opacity: 0.6;
}
/* 数值输入区（show-input） */
.inputs {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: 0 0 auto;
}
:host([data-vertical]) .inputs {
  margin-top: var(--oas-space-2);
}
/* 同类保护：无 show-input 时 inputs 整区 hidden，display:flex 不得压过 UA [hidden]
   （否则空容器仍占 wrap 的 flex gap，轨道右侧多出一段间距） */
.inputs[hidden] {
  display: none;
}
.inputs input {
  appearance: none;
  box-sizing: border-box;
  width: 72px;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  text-align: center;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.inputs input:hover {
  border-color: var(--oas-color-primary);
}
.inputs input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.inputs input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.inputs input[readonly] {
  cursor: default;
}
/* 隐藏原生步进箭头，与滑块数值展示更干净 */
.inputs input::-webkit-outer-spin-button,
.inputs input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.inputs input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.input-sep {
  color: var(--oas-color-text-secondary);
  user-select: none;
}
`

export class OASSlider extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'min',
      'max',
      'step',
      'disabled',
      'marks',
      'range',
      'show-input',
      'reverse',
      'show-tooltip',
      'disabled-skip',
      'vertical',
      'format',
      'tooltip-always',
      'tooltip-position',
      'show-stops',
      'start-point',
      'size',
      'color',
      'track-color',
      'readonly',
      'large-step',
    ]
  }

  private input: HTMLInputElement | null = null
  private minInput: HTMLInputElement | null = null
  private maxInput: HTMLInputElement | null = null
  private numInput: HTMLInputElement | null = null
  private numMinInput: HTMLInputElement | null = null
  private numMaxInput: HTMLInputElement | null = null
  /** 上次渲染的刻度签名（min/max + step + reverse + vertical + 条目），用于增量重建判断 */
  private marksKey = ''
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private thumbObserver: MutationObserver | null = null
  /** 拖动中（用于拖动时显示值气泡，不依赖 show-tooltip） */
  private dragging = false
  /** tooltip 格式化函数（JS property 通道，优先于 format 模板串） */
  private _formatTooltip: ((value: number) => string | number | null | undefined) | null = null

  /** 宿主框架（Vue/React）以对象/数组赋值时走 property setter，反射到 attribute 统一解析链路 */
  get marks(): string {
    return this.getAttribute('marks') ?? ''
  }
  set marks(value: string | Record<string, string | number> | number[]) {
    this.setAttribute('marks', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /**
   * 值格式化函数（函数通道）：输出同时进值气泡与 aria-valuetext。
   * 优先级：formatTooltip > format 模板串 > 裸数字。置 null 清除。
   */
  get formatTooltip(): ((value: number) => string | number | null | undefined) | null {
    return this._formatTooltip
  }
  set formatTooltip(fn: ((value: number) => string | number | null | undefined) | null) {
    this._formatTooltip = typeof fn === 'function' ? fn : null
    if (this.hasRendered) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap">
        <div class="slider-col" part="slider">
          <div class="track-wrap" part="track-wrap">
            <input part="track" type="range" data-role="range" />
            <input part="track" type="range" data-role="range-min" hidden />
            <input part="track" type="range" data-role="range-max" hidden />
            <div class="fill" part="fill"></div>
            <div class="custom-thumb" part="thumb" data-thumb="value" hidden>
              <div class="thumb-content"></div>
              <div class="thumb-tip" part="tip"></div>
            </div>
            <div class="custom-thumb" part="thumb" data-thumb="min" hidden>
              <div class="thumb-content"></div>
              <div class="thumb-tip" part="tip"></div>
            </div>
            <div class="custom-thumb" part="thumb" data-thumb="max" hidden>
              <div class="thumb-content"></div>
              <div class="thumb-tip" part="tip"></div>
            </div>
          </div>
          <div class="marks" part="marks" hidden></div>
        </div>
        <div class="inputs" part="inputs" hidden>
          <input part="input" type="number" data-role="num" />
          <input part="input" type="number" data-role="num-min" hidden />
          <span class="input-sep" part="input-sep">–</span>
          <input part="input" type="number" data-role="num-max" hidden />
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定拖动/输入事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector<HTMLInputElement>('[data-role="range"]')
    this.minInput = this.shadow.querySelector<HTMLInputElement>('[data-role="range-min"]')
    this.maxInput = this.shadow.querySelector<HTMLInputElement>('[data-role="range-max"]')
    this.numInput = this.shadow.querySelector<HTMLInputElement>('[data-role="num"]')
    this.numMinInput = this.shadow.querySelector<HTMLInputElement>('[data-role="num-min"]')
    this.numMaxInput = this.shadow.querySelector<HTMLInputElement>('[data-role="num-max"]')
    const wrap = this.shadow.querySelector<HTMLElement>('.track-wrap')

    // 单值滑块
    this.input?.addEventListener('input', () => {
      this.dragging = true
      this.maybeSnapInput(this.input)
      this.syncValueAttr()
      this.syncOverlay()
      this.syncNumInputs()
      this.syncMarkPassed()
      this.emit('input', { value: Number(this.input!.value) })
    })
    this.input?.addEventListener('change', () => {
      this.dragging = false
      this.syncValueAttr()
      this.syncOverlay()
      this.syncNumInputs()
      this.syncMarkPassed()
      this.emit('change', { value: Number(this.input!.value) })
    })

    // 范围模式双滑块：拖动互相钳制（lo ≤ hi），事件 detail 为 [lo, hi]
    for (const r of [this.minInput, this.maxInput]) {
      if (!r) continue
      r.addEventListener('input', () => {
        this.dragging = true
        this.maybeSnapInput(r)
        this.clampRangeInputs()
        this.syncValueAttr()
        this.syncOverlay()
        this.syncNumInputs()
        this.syncMarkPassed()
        this.emit('input', { value: this.currentRange() })
      })
      r.addEventListener('change', () => {
        this.dragging = false
        this.maybeSnapInput(r)
        this.clampRangeInputs()
        this.syncValueAttr()
        this.syncOverlay()
        this.syncNumInputs()
        this.syncMarkPassed()
        this.emit('change', { value: this.currentRange() })
      })
    }

    // 键盘：只读拦截值键；大步进（Shift+方向 / PageUp / PageDown）与 step="mark" 刻度跳档统一接管
    const onKeydown = (e: Event) => this.handleKeydown(e as KeyboardEvent)
    for (const r of [this.input, this.minInput, this.maxInput]) {
      r?.addEventListener('keydown', onKeydown)
    }

    // 数值输入框：输入防抖提交（oas-input），Enter/失焦立即提交（oas-change）
    const bindNum = (input: HTMLInputElement | null, role: 'num' | 'num-min' | 'num-max'): void => {
      if (!input) return
      input.addEventListener('input', () => this.scheduleCommit(role))
      input.addEventListener('change', () => {
        this.cancelDebounce()
        this.commitFromNumber(role, true)
      })
    }
    bindNum(this.numInput, 'num')
    bindNum(this.numMinInput, 'num-min')
    bindNum(this.numMaxInput, 'num-max')

    // 范围模式：指针按下时按「离哪个 thumb 近」提升哪个输入的 z-index（原生拖动接管）。
    // 只读态拦截按下（不可拖动，但保持可聚焦）
    wrap?.addEventListener('pointerdown', (e) => {
      if (this.hasAttr('readonly')) {
        e.preventDefault()
        return
      }
      if (!this.hasAttr('range') || !this.minInput || !this.maxInput) return
      const [lo, hi] = this.currentRange()
      const min = Number(this.getAttr('min', '0'))
      const max = Number(this.getAttr('max', '100'))
      const rect = wrap.getBoundingClientRect()
      const vertical = this.hasAttr('vertical')
      const pct = vertical
        ? rect.height
          ? ((rect.bottom - (e as PointerEvent).clientY) / rect.height) * 100
          : 50
        : rect.width
          ? ((e.clientX - rect.left) / rect.width) * 100
          : 50
      const reverse = this.hasAttr('reverse')
      const span = max - min || 1
      const valueAt = min + (reverse ? 100 - pct : pct) * (span / 100)
      const mid = (lo + hi) / 2
      const target = valueAt <= mid ? this.minInput : this.maxInput
      this.minInput.style.zIndex = target === this.minInput ? '2' : '1'
      this.maxInput.style.zIndex = target === this.maxInput ? '2' : '1'
    })
    // 键盘/焦点：聚焦哪个滑块置顶 + 焦点环映射到自定义滑块（聚焦时显示值气泡）
    wrap?.addEventListener('focusin', (e) => {
      const role = (e.target as HTMLElement).dataset.role ?? ''
      const map: Record<string, string> = { range: 'value', 'range-min': 'min', 'range-max': 'max' }
      if (map[role]) this.setAttribute('data-focused', map[role]!)
      else this.removeAttribute('data-focused')
      if (role === 'range-min' && this.minInput) {
        this.minInput.style.zIndex = '2'
        if (this.maxInput) this.maxInput.style.zIndex = '1'
      } else if (role === 'range-max' && this.maxInput) {
        this.maxInput.style.zIndex = '2'
        if (this.minInput) this.minInput.style.zIndex = '1'
      }
      this.syncOverlay()
    })
    wrap?.addEventListener('focusout', () => {
      this.removeAttribute('data-focused')
      this.syncOverlay()
    })

    // 自定义滑块内容（light DOM 插槽/模板）变化 → 重同步
    this.thumbObserver = new MutationObserver(() => {
      this.syncThumbContent()
      this.syncOverlay()
    })
    this.thumbObserver.observe(this, { childList: true })
    // 轨道尺寸变化（响应式/折叠）→ 重算自定义滑块像素位置
    if (wrap && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.syncOverlay())
      ro.observe(wrap)
      this.onCleanup(() => ro.disconnect())
    }
    // 防抖计时器随断开清理（observer 随元素同生命周期，断开不失效）
    this.onCleanup(() => this.cancelDebounce())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（range 输入存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input[type="range"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.input || !this.minInput || !this.maxInput) return
    const isRange = this.hasAttr('range')
    const showInput = this.hasAttr('show-input')
    const reverse = this.hasAttr('reverse')
    const vertical = this.hasAttr('vertical')
    const readonly = this.hasAttr('readonly')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    // 镜像最终禁用态到宿主 data-disabled（供 :host([data-disabled]) 样式消费，覆盖注入场景）
    this.toggleAttribute('data-disabled', disabled)
    const min = this.getAttr('min', '0')
    const max = this.getAttr('max', '100')
    const markMode = this.isMarkStep()
    // 原生 step：mark 模式给 any（吸附由组件接管），无 marks 时回退 1
    const step = this.getAttr('step', '1') === 'mark' ? (markMode ? 'any' : '1') : this.getAttr('step', '1')
    // 方向：horizontal reverse=rtl（min 在右）；vertical 默认 min 在下（rtl），reverse 镜像到上
    const dir = vertical ? (reverse ? 'ltr' : 'rtl') : reverse ? 'rtl' : 'ltr'

    // 宿主状态镜像（data-* 非 observed 属性，写入不触发 attributeChangedCallback 循环）
    this.toggleAttribute('data-vertical', vertical)
    this.toggleAttribute('data-readonly', readonly)
    this.setAttribute('data-size', this.normalizeSize())
    this.setAttribute('data-tooltip-pos', this.tooltipPosition(vertical))
    this.applyHostVar('color', '--oas-slider-color')
    this.applyHostVar('track-color', '--oas-slider-track')

    // 结构显隐矩阵（模板稳定，仅切 hidden）
    this.input.hidden = isRange
    this.minInput.hidden = !isRange
    this.maxInput.hidden = !isRange
    const inputsEl = this.shadow.querySelector<HTMLElement>('[part="inputs"]')
    if (inputsEl) inputsEl.hidden = !showInput
    if (this.numInput) this.numInput.hidden = !showInput || isRange
    if (this.numMinInput) this.numMinInput.hidden = !showInput || !isRange
    if (this.numMaxInput) this.numMaxInput.hidden = !showInput || !isRange
    const sep = this.shadow.querySelector<HTMLElement>('.input-sep')
    if (sep) sep.hidden = !showInput || !isRange

    // 原生属性透传 + 方向 + 只读 + ARIA
    for (const r of [this.input, this.minInput, this.maxInput]) {
      r.min = min
      r.max = max
      r.step = step
      r.disabled = disabled
      r.readOnly = readonly
      r.setAttribute('dir', dir)
      r.setAttribute('role', 'slider')
      r.setAttribute('aria-valuenow', r.value)
      if (vertical) {
        // orient 属性兼容 Firefox 竖直渲染；writing-mode 走 CSS（现代方案）
        r.setAttribute('orient', 'vertical')
        r.setAttribute('aria-orientation', 'vertical')
      } else {
        r.removeAttribute('orient')
        r.removeAttribute('aria-orientation')
      }
      if (readonly) r.setAttribute('aria-readonly', 'true')
      else r.removeAttribute('aria-readonly')
    }
    this.input.setAttribute('aria-label', this.t('slider.valueLabel'))
    this.minInput.setAttribute('aria-label', this.t('slider.minLabel'))
    this.maxInput.setAttribute('aria-label', this.t('slider.maxLabel'))
    if (this.numInput) this.numInput.setAttribute('aria-label', this.t('slider.valueLabel'))
    if (this.numMinInput) this.numMinInput.setAttribute('aria-label', this.t('slider.minLabel'))
    if (this.numMaxInput) this.numMaxInput.setAttribute('aria-label', this.t('slider.maxLabel'))
    for (const n of [this.numInput, this.numMinInput, this.numMaxInput]) {
      if (!n) continue
      n.disabled = disabled
      n.readOnly = readonly
    }

    // 受控值同步（attribute 为唯一权威源，内部交互不改 attribute 保持受控语义）
    if (isRange) {
      let [lo, hi] = this.rangeValue()
      if (markMode) {
        lo = this.snapToMark(lo)
        hi = this.snapToMark(hi)
      }
      this.minInput.value = String(lo)
      this.maxInput.value = String(hi)
      if (this.numMinInput) this.numMinInput.value = String(lo)
      if (this.numMaxInput) this.numMaxInput.value = String(hi)
    } else {
      const value = this.getAttr('value', '')
      const shown =
        value === '' ? '' : markMode ? String(this.snapToMark(Number(value))) : value
      if (this.input.value !== shown) this.input.value = shown
      if (this.numInput) this.numInput.value = String(Number(this.input.value))
    }

    this.syncThumbContent()
    this.syncOverlay()
    this.syncMarks()
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主滑块（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    const target = this.hasAttr('range') ? (this.minInput ?? this.input) : this.input
    target?.focus(options)
  }

  // ---------- 属性归一 / 格式化 ----------

  /** size 三档归一：接受 sm/md/lg 与 small/medium/large 两套词表（config-provider 注入同构），非法回落 md */
  private normalizeSize(): 'sm' | 'md' | 'lg' {
    const raw = this.injectValue('size', 'medium').toLowerCase()
    if (raw === 'sm' || raw === 'small') return 'sm'
    if (raw === 'lg' || raw === 'large') return 'lg'
    return 'md'
  }

  /** 生效的气泡方向：显式属性（四向）优先，vertical 默认 right、水平默认 top */
  private tooltipPosition(vertical: boolean): string {
    const raw = this.getAttr('tooltip-position', '')
    if (TOOLTIP_POSITIONS.has(raw)) return raw
    return vertical ? 'right' : 'top'
  }

  /** color/track-color 属性 → 宿主 CSS 变量（预设语义色映射 token，任意值原样透传） */
  private applyHostVar(attr: string, cssVar: string): void {
    const raw = this.getAttr(attr, '')
    if (raw === '') {
      this.style.removeProperty(cssVar)
      return
    }
    this.style.setProperty(cssVar, COLOR_TOKENS[raw] ?? raw)
  }

  /** step="mark" 模式生效判定：step 属性为字面量 mark 且 marks 非空 */
  private isMarkStep(): boolean {
    return this.getAttr('step', '1') === 'mark' && this.parseMarks().length > 0
  }

  /** 吸附到最近刻度（距离并列时取较小值，保守不越界） */
  private snapToMark(v: number): number {
    const marks = this.parseMarks()
    if (marks.length === 0) return v
    let best = marks[0]!.value
    let bestD = Infinity
    for (const m of marks) {
      const d = Math.abs(m.value - v)
      if (d < bestD) {
        bestD = d
        best = m.value
      }
    }
    return best
  }

  /** 拖动/受控同步时把输入值吸附到刻度（step="mark" 模式） */
  private maybeSnapInput(r: HTMLInputElement | null): void {
    if (!r || !this.isMarkStep()) return
    r.value = String(this.snapToMark(Number(r.value)))
  }

  /** 当前 thumb 直径（像素换算用；与 CSS --oas-slider-thumb-size 各档成对维护） */
  private thumbSize(): number {
    return THUMB_SIZES[this.getAttribute('data-size') ?? 'md'] ?? THUMB_SIZE
  }

  /** 格式化值（值气泡 + aria-valuetext 双通道）：函数 property 优先于 format 模板串 */
  private formatValue(v: number): string {
    const fn = this._formatTooltip
    if (typeof fn === 'function') {
      const r = fn(v)
      return r == null ? String(v) : String(r)
    }
    const tpl = this.getAttr('format', '')
    if (tpl) return tpl.replaceAll('${value}', String(v))
    return String(v)
  }

  private hasFormatter(): boolean {
    return typeof this._formatTooltip === 'function' || this.getAttr('format', '') !== ''
  }

  /** 解析 start-point（夹取到 [min, max]；未设/非法回落 min = 从最小端填充） */
  private startPointValue(min: number, max: number): number {
    const raw = this.getAttr('start-point', '')
    if (raw === '') return min
    const v = Number(raw)
    if (!Number.isFinite(v)) return min
    return clampNum(v, min, max)
  }

  // ---------- 键盘 ----------

  /**
   * 键盘拦截（统一大步进，抹平浏览器原生差异）：
   * - 只读：拦截一切值键（不可改值、不派发事件，保留可聚焦）
   * - step="mark"：方向键/页键/Home/End 全部接管为刻度档位跳转
   * - 普通步长：仅拦截大步键（Shift+方向 / PageUp / PageDown，步进量 = large-step 或 10×step）；
   *   普通方向键/Home/End 保留原生行为
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    const key = e.key
    const isArrow =
      key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
    const isPage = key === 'PageUp' || key === 'PageDown'
    const isBound = key === 'Home' || key === 'End'
    if (!isArrow && !isPage && !isBound) return
    if (this.hasAttr('readonly')) {
      e.preventDefault()
      return
    }
    const input = e.target as HTMLInputElement
    const isLarge = isPage || (isArrow && e.shiftKey)
    if (this.isMarkStep()) {
      e.preventDefault()
      this.moveMarkStep(input, key, isLarge)
      return
    }
    if (!isLarge) return
    e.preventDefault()
    const step = Number(this.getAttr('step', '1')) || 1
    const largeRaw = this.getAttr('large-step', '')
    const large =
      largeRaw !== '' && Number.isFinite(Number(largeRaw)) ? Number(largeRaw) : step * 10
    const sign = this.keySign(key)
    this.applyKeyboardValue(input, (Number(input.value) || 0) + sign * large)
  }

  /** 键 → 值方向：箭头键受 reverse 视觉镜像反转（值增长方向与箭头视觉方向一致），页键保持值语义 */
  private keySign(key: string): number {
    let sign = 0
    if (key === 'ArrowRight' || key === 'ArrowUp' || key === 'PageUp') sign = 1
    else if (key === 'ArrowLeft' || key === 'ArrowDown' || key === 'PageDown') sign = -1
  if (sign !== 0 && key.startsWith('Arrow') && this.hasAttr('reverse')) sign = -sign
    return sign
  }

  /** step="mark" 键盘：在刻度档位间跳转（大步跳 MARK_BIG_STEP 档，Home/End 到首末刻度） */
  private moveMarkStep(input: HTMLInputElement, key: string, big: boolean): void {
    const marks = this.parseMarks()
    if (marks.length === 0) return
    if (key === 'Home') {
      this.applyKeyboardValue(input, marks[0]!.value)
      return
    }
    if (key === 'End') {
      this.applyKeyboardValue(input, marks[marks.length - 1]!.value)
      return
    }
    const cur = this.snapToMark(Number(input.value))
    let idx = marks.findIndex((m) => m.value === cur)
    if (idx < 0) idx = 0
    const delta = big ? MARK_BIG_STEP : 1
    const next = clampNum(idx + this.keySign(key) * delta, 0, marks.length - 1)
    this.applyKeyboardValue(input, marks[next]!.value)
  }

  /** 键盘改值：夹取 → 钳制 → 同步全链路 → 派发 input + change（每次按键即一次完整确认） */
  private applyKeyboardValue(input: HTMLInputElement, next: number): void {
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    input.value = String(clampNum(next, min, max))
    if (this.hasAttr('range')) this.clampRangeInputs()
    this.syncValueAttr()
    this.syncOverlay()
    this.syncNumInputs()
    this.syncMarkPassed()
    if (this.hasAttr('range')) {
      this.emit('input', { value: this.currentRange() })
      this.emit('change', { value: this.currentRange() })
    } else {
      this.emit('input', { value: Number(this.input?.value ?? 0) })
      this.emit('change', { value: Number(this.input?.value ?? 0) })
    }
  }

  // ---------- range 模式 ----------

  /** 解析 range value 属性（JSON 数组或逗号分隔），夹取到 [min, max] 并保证 lo ≤ hi */
  private rangeValue(): [number, number] {
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    let lo = min
    let hi = max
    const raw = this.getAttr('value', '')
    if (raw) {
      const parsed = parseRangeValue(raw)
      if (parsed) {
        lo = parsed[0]
        hi = parsed[1]
      }
    }
    lo = clampNum(lo, min, max)
    hi = clampNum(hi, min, max)
    return lo > hi ? [hi, lo] : [lo, hi]
  }

  /** 读取当前两个 range 输入的实时值（拖动态，不读属性） */
  private currentRange(): [number, number] {
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    const lo = this.minInput ? clampNum(Number(this.minInput.value), min, max) : min
    const hi = this.maxInput ? clampNum(Number(this.maxInput.value), min, max) : max
    return lo > hi ? [hi, lo] : [lo, hi]
  }

  /** 拖动中钳制 lo ≤ hi（避免跨过另一个 thumb） */
  private clampRangeInputs(): void {
    if (!this.minInput || !this.maxInput) return
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    let lo = clampNum(Number(this.minInput.value), min, max)
    let hi = clampNum(Number(this.maxInput.value), min, max)
    if (lo > hi) [lo, hi] = [hi, lo]
    this.minInput.value = String(lo)
    this.maxInput.value = String(hi)
  }

  // ---------- show-input 联动 ----------

  private scheduleCommit(role: 'num' | 'num-min' | 'num-max'): void {
    this.cancelDebounce()
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.commitFromNumber(role, false)
    }, DEBOUNCE_MS)
  }

  private cancelDebounce(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  /** 数值输入提交：夹取范围 → 驱动滑块 → 输入框归一化 → 派发事件 */
  private commitFromNumber(role: 'num' | 'num-min' | 'num-max', emitChange: boolean): void {
    const input =
      role === 'num' ? this.numInput : role === 'num-min' ? this.numMinInput : this.numMaxInput
    if (!input) return
    const raw = input.value.trim()
    const v = Number(raw)
    if (raw === '' || !Number.isFinite(v)) {
      // 非法/空值：还原为当前滑块值（非破坏）
      const cur =
        role === 'num-min'
          ? this.currentRange()[0]
          : role === 'num-max'
            ? this.currentRange()[1]
            : Number(this.input?.value ?? 0)
      input.value = String(cur)
      return
    }
    this.applyNumber(role, v)
    this.syncValueAttr()
    this.syncOverlay()
    this.syncMarkPassed()
    this.emitRangeEvents(emitChange)
  }

  /** 把数值写到滑块（范围模式按「推着走」约束：min 越界推 max，反之亦然） */
  private applyNumber(role: 'num' | 'num-min' | 'num-max', v: number): void {
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    if (this.hasAttr('range') && this.minInput && this.maxInput) {
      const [lo, hi] = this.currentRange()
      if (role === 'num-min') {
        const nlo = clampNum(v, min, max)
        const nhi = nlo > hi ? nlo : hi
        this.minInput.value = String(nlo)
        this.maxInput.value = String(nhi)
      } else {
        const nhi = clampNum(v, min, max)
        const nlo = nhi < lo ? nhi : lo
        this.minInput.value = String(nlo)
        this.maxInput.value = String(nhi)
      }
    } else if (this.input) {
      this.input.value = String(clampNum(v, min, max))
    }
    this.syncNumInputs()
  }

  private emitRangeEvents(emitChange: boolean): void {
    // 显式两次 emit：让 api:scan 能回溯事件名（变量名会进 unresolved）
    if (emitChange) {
      if (this.hasAttr('range')) {
        this.emit('change', { value: this.currentRange() })
      } else {
        this.emit('change', { value: Number(this.input?.value ?? 0) })
      }
    } else {
      if (this.hasAttr('range')) {
        this.emit('input', { value: this.currentRange() })
      } else {
        this.emit('input', { value: Number(this.input?.value ?? 0) })
      }
    }
  }

  /**
   * 受控状态写回宿主 value 属性（与 switch/radio-group 一致的双向受控语义）：
   * 单值写数字字符串，range 写 JSON 数组字符串（表单序列化/宿主 JSON.parse 友好）。
   * 宿主 getAttribute / 表单收集 / 外部读状态可直接取最新值，不必缓存 oas-change detail。
   * 写回触发的 attributeChangedCallback → update() 为幂等同步（值相同无循环、不再 emit）。
   */
  private syncValueAttr(): void {
    if (this.hasAttr('range')) {
      const [lo, hi] = this.currentRange()
      this.setAttribute('value', JSON.stringify([lo, hi]))
    } else if (this.input) {
      this.setAttribute('value', String(this.input.value))
    }
  }

  /** 滑块 → 输入框单向同步（拖动/提交后） */
  private syncNumInputs(): void {
    if (!this.hasAttr('show-input')) return
    if (this.hasAttr('range')) {
      const [lo, hi] = this.currentRange()
      if (this.numMinInput) this.numMinInput.value = String(lo)
      if (this.numMaxInput) this.numMaxInput.value = String(hi)
    } else if (this.numInput && this.input) {
      this.numInput.value = String(Number(this.input.value))
    }
  }

  // ---------- 自定义滑块 / 填充 / 气泡 ----------

  private hasCustomThumb(): boolean {
    return (
      !!this.querySelector('template[slot="custom-thumb"]') ||
      !!this.querySelector('[slot="custom-thumb"]')
    )
  }

  /** 把 light DOM 自定义滑块内容（template 或元素）克隆进每个可见滑块 */
  private syncThumbContent(): void {
    const templateEl = this.querySelector<HTMLTemplateElement>('template[slot="custom-thumb"]')
    const liveEl = !templateEl ? this.querySelector<HTMLElement>('[slot="custom-thumb"]') : null
    const contents = [...this.shadow.querySelectorAll<HTMLElement>('.thumb-content')]
    if (!templateEl && !liveEl) {
      for (const c of contents) {
        c.dataset.srcKey = ''
        c.textContent = ''
      }
      return
    }
    const key = templateEl ? `t:${templateEl.innerHTML}` : `l:${liveEl!.outerHTML}`
    for (const content of contents) {
      if (content.dataset.srcKey === key) continue
      content.dataset.srcKey = key
      content.textContent = ''
      if (templateEl) {
        const frag = templateEl.content.cloneNode(true) as DocumentFragment
        content.append(...Array.from(frag.childNodes))
      } else {
        content.append(liveEl!.cloneNode(true))
      }
    }
  }

  /** 统一同步填充区、自定义滑块、值气泡的位置与显隐 */
  private syncOverlay(): void {
    const fill = this.shadow.querySelector<HTMLElement>('.fill')
    if (!fill) return
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    const span = max - min || 1
    const reverse = this.hasAttr('reverse')
    const vertical = this.hasAttr('vertical')
    const isRange = this.hasAttr('range')
    const focused = this.hasAttribute('data-focused')
    // 气泡可见：常显 > 拖动 > 聚焦（focus 语义，不依赖 show-tooltip）
    const tipsVisible =
      this.hasAttr('show-tooltip') || this.hasAttr('tooltip-always') || this.dragging || focused

    // 拖动/聚焦/常显中也启用自定义滑块（拖动时临时显示值气泡，无需 show-tooltip）
    const useOverlay =
      this.hasCustomThumb() ||
      this.hasAttr('show-tooltip') ||
      this.hasAttr('tooltip-always') ||
      this.dragging ||
      focused

    // 填充区间：单值 [start-point, value]（起点缺省 min），范围 [lo, hi]
    const sp = this.startPointValue(min, max)
    const [lo, hi] = isRange ? this.currentRange() : [sp, Number(this.input?.value ?? 0)]
    const pctOf = (v: number): number => ((v - min) / span) * 100
    const vis = (pct: number): number => (reverse ? 100 - pct : pct)
    const a = vis(pctOf(lo))
    const b = vis(pctOf(hi))
    // 定位轴切换（vertical 用 top/height），切轴时清理另一轴的位置与尺寸残留
    const axis = vertical ? 'top' : 'left'
    const sizeProp = vertical ? 'height' : 'width'
    const offAxis = vertical ? 'left' : 'top'
    const offSize = vertical ? 'width' : 'height'
    fill.style.removeProperty(offAxis)
    fill.style.removeProperty(offSize)
    fill.style.setProperty(axis, `${Math.min(a, b)}%`)
    fill.style.setProperty(sizeProp, `${Math.abs(b - a)}%`)
    fill.dataset.pct = String(reverse ? 100 - pctOf(hi) : pctOf(hi))

    for (const th of this.shadow.querySelectorAll<HTMLElement>('.custom-thumb')) {
      const which = th.dataset.thumb
      const visible =
        which === 'value'
          ? useOverlay && !isRange
          : (which === 'min' || which === 'max') && useOverlay && isRange
      const tip = th.querySelector<HTMLElement>('.thumb-tip')
      if (tip) {
        tip.textContent = this.formatValue(which === 'min' ? lo : hi)
        tip.hidden = !tipsVisible
      }
      th.hidden = !visible
      if (!visible) continue
      const v = which === 'min' ? lo : hi
      const norm = vis(pctOf(v))
      th.dataset.pct = String(norm)
      const pos = this.thumbPos(norm)
      if (vertical) {
        th.style.top = pos
        th.style.left = ''
      } else {
        th.style.left = pos
        th.style.top = ''
      }
    }

    this.syncAriaValueText()

    if (useOverlay) this.setAttribute('data-custom-thumb', '')
    else this.removeAttribute('data-custom-thumb')
  }

  /** aria-valuetext 同步：有格式化通道时写格式化文本（读屏与气泡同源），否则移除回落 valuenow */
  private syncAriaValueText(): void {
    if (!this.input || !this.minInput || !this.maxInput) return
    const apply = (r: HTMLInputElement, v: number): void => {
      if (this.hasFormatter()) r.setAttribute('aria-valuetext', this.formatValue(v))
      else r.removeAttribute('aria-valuetext')
    }
    if (this.hasAttr('range')) {
      const [lo, hi] = this.currentRange()
      apply(this.minInput, lo)
      apply(this.maxInput, hi)
    } else {
      apply(this.input, Number(this.input.value))
    }
  }

  /** 自定义滑块像素定位：与原生 thumb「中心」对齐——原生 thumb 左缘 = pct×(总长-直径)，
      中心再 + 半径；custom-thumb 以 translate(-50%,-50%) 按中心定位，少了半径会偏 7px。
      vertical 时沿 Y 轴换算 */
  private thumbPos(normPct: number): string {
    const input = this.hasAttr('range') ? (this.maxInput ?? this.input) : this.input
    const vertical = this.hasAttr('vertical')
    const track = vertical ? (input?.clientHeight ?? 0) : (input?.clientWidth ?? 0)
    if (!track) return `${normPct}%`
    const size = this.thumbSize()
    const pos = (normPct / 100) * (track - size) + size / 2
    return `${pos}px`
  }

  // ---------- marks 刻度 / show-stops 刻度点 ----------

  /** 解析 marks 属性：JSON 对象 { value: label } 或 JSON 数组 [value] / [{ value, label }] */
  private parseMarks(): MarkEntry[] {
    const raw = this.getAttr('marks', '')
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .map((m): MarkEntry | null => {
            if (typeof m === 'number' && Number.isFinite(m)) return { value: m, label: String(m) }
            if (m && typeof m === 'object' && Number.isFinite(m.value)) {
              return { value: m.value, label: m.label != null ? String(m.label) : String(m.value) }
            }
            return null
          })
          .filter((m): m is MarkEntry => m !== null)
          .sort((a, b) => a.value - b.value)
      }
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([k, v]) => ({ value: Number(k), label: String(v) }))
          .filter((m) => Number.isFinite(m.value))
          .sort((a, b) => a.value - b.value)
      }
    } catch {
      /* 非法 JSON 视为无刻度 */
    }
    return []
  }

  /** 刻度条目：marks 优先（自带标签）；无 marks 且 show-stops 时按 step 生成刻度点（无标签） */
  private computeTicks(): MarkEntry[] {
    const marks = this.parseMarks()
    if (marks.length > 0) return marks
    if (!this.hasAttr('show-stops')) return []
    const rawStep = this.getAttr('step', '1')
    const step = Number(rawStep)
    if (rawStep === 'mark' || !Number.isFinite(step) || step <= 0) return []
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    const count = Math.floor((max - min) / step + 1e-6) + 1
    if (count > MAX_STOPS || count < 2) return []
    return Array.from({ length: count }, (_, i) => ({
      value: Number((min + i * step).toFixed(4)),
      label: '',
    }))
  }

  /** 增量同步刻度区：签名变化才重建节点，否则只更新经过状态 */
  private syncMarks(): void {
    const marksEl = this.shadow.querySelector<HTMLElement>('.marks')
    const input = this.input
    if (!marksEl || !input) return
    const ticks = this.computeTicks()
    if (ticks.length === 0) {
      marksEl.hidden = true
      this.marksKey = ''
      return
    }
    marksEl.hidden = false
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    const reverse = this.hasAttr('reverse')
    const vertical = this.hasAttr('vertical')
    const key =
      `${vertical ? 'v' : ''}${reverse ? 'r' : ''}:${min}:${max}:${this.getAttr('step', '1')}:${this.hasAttr('show-stops')}|` +
      ticks.map((m) => `${m.value}:${m.label}`).join('|')
    if (key !== this.marksKey) {
      this.marksKey = key
      this.renderMarks(marksEl, ticks, min, max)
    }
    const [lo, hi] = this.coveredRange()
    this.updateMarkPassed(marksEl, lo, hi)
  }

  /** 当前选区覆盖的值区间（刻度经过判定）：范围 [lo, hi]；单值 [start-point, value] */
  private coveredRange(): [number, number] {
    if (this.hasAttr('range')) return this.currentRange()
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    const v = Number(this.input?.value ?? 0)
    const sp = this.startPointValue(min, max)
    return [Math.min(sp, v), Math.max(sp, v)]
  }

  private renderMarks(container: HTMLElement, ticks: MarkEntry[], min: number, max: number): void {
    const span = max - min || 1
    const reverse = this.hasAttr('reverse')
    const vertical = this.hasAttr('vertical')
    container.innerHTML = ''
    for (const mark of ticks) {
      const item = document.createElement('div')
      item.className = 'mark'
      item.setAttribute('part', 'mark')
      item.setAttribute('data-value', String(mark.value))
      item.setAttribute('data-passed', 'false')
      const pct = ((mark.value - min) / span) * 100
      const norm = reverse ? 100 - pct : pct
      // 定位轴切换（vertical 沿 Y 轴），切轴时清理另一轴残留
      if (vertical) {
        item.style.top = `${norm}%`
        item.style.left = ''
      } else {
        item.style.left = `${norm}%`
        item.style.top = ''
      }
      const dot = document.createElement('div')
      dot.className = 'mark-dot'
      item.append(dot)
      // show-stops 生成的刻度点无标签（不渲染标签节点，避免占位高度）
      if (mark.label !== '') {
        const label = document.createElement('div')
        label.className = 'mark-label'
        label.textContent = mark.label
        item.append(label)
      }
      container.appendChild(item)
    }
  }

  /** 更新各刻度「是否被当前选区覆盖」状态（data-passed），只改属性不重建节点 */
  private updateMarkPassed(container: HTMLElement, low: number, high: number): void {
    for (const item of container.querySelectorAll<HTMLElement>('.mark')) {
      const v = Number(item.getAttribute('data-value'))
      const passed = v >= low && v <= high
      const flag = passed ? 'true' : 'false'
      if (item.getAttribute('data-passed') !== flag) {
        item.setAttribute('data-passed', flag)
      }
    }
  }

  /** 拖动实时变化时，仅刷新经过状态（不动 value 属性，保持受控语义） */
  private syncMarkPassed(): void {
    const marksEl = this.shadow.querySelector<HTMLElement>('.marks')
    if (!marksEl || marksEl.hidden) return
    const [lo, hi] = this.coveredRange()
    this.updateMarkPassed(marksEl, lo, hi)
  }
}
