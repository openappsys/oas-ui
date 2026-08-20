import { OASElement } from '@oas-ui/core'

/** 单个刻度：数值 + 展示标签 */
interface MarkEntry {
  value: number
  label: string
}

/** 数值输入框防抖提交时长（ms） */
const DEBOUNCE_MS = 300

/** 原生 thumb / 自定义滑块直径（px），用于把百分比换算成像素定位 */
const THUMB_SIZE = 14

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
}
.wrap {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
}
.slider-col {
  flex: 1 1 auto;
  min-width: 0;
}
.track-wrap {
  position: relative;
  height: 20px;
}
/* 灰色轨道底层：由 track-wrap 伪元素承担（DOM 序最前 = 最底层）。
   原生 input 的 track 背景必须透明——range 模式 pointerdown 提升 input z-index 抢拖动权时，
   若灰轨道画在原生 track 上会随之上浮盖住 .fill（蓝色区间填充消失） */
.track-wrap::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--oas-color-border);
}
:host([disabled]) .track-wrap::before {
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
/* 范围模式双滑块叠放：绝对定位铺满轨道，拖动优先级由 JS 按指针位置提升 z-index */
.track-wrap input[type="range"] {
  position: absolute;
  inset: 0;
}
input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: transparent;
}
input::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-top: -5px;
  background: var(--oas-color-primary);
  border: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
/* Firefox：moz 伪元素必须与 webkit 分开书写（浏览器遇到不认识的伪元素会使整条规则失效）；
   ::-moz-range-thumb 相对 track 自动居中，无需 webkit 的 margin-top 偏移 */
input::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: transparent;
}
input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--oas-color-primary);
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
/* 已选中区间填充：单值从 min 端填充，范围模式填在两 thumb 之间 */
.fill {
  position: absolute;
  top: 8px;
  height: 4px;
  border-radius: 2px;
  background: var(--oas-color-primary);
  pointer-events: none;
  transition: left var(--oas-transition-fast) var(--oas-ease-out),
    right var(--oas-transition-fast) var(--oas-ease-out),
    width var(--oas-transition-fast) var(--oas-ease-out);
}
:host([disabled]) .fill {
  opacity: 0.6;
}
/* 自定义滑块：内容可定制（custom-thumb 插槽/模板），与值气泡共存 */
.custom-thumb {
  position: absolute;
  top: 10px;
  left: 0;
  width: 14px;
  height: 14px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--oas-color-bg);
  border: 2px solid var(--oas-color-primary);
  pointer-events: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
/* author display:flex 会压过 UA [hidden] 规则，显式恢复隐藏（否则 hidden 滑块恒可见：
   默认堆在轨道起点呈白圈、拖动后残留在值位置呈双滑块假象） */
.custom-thumb[hidden] {
  display: none;
}
:host(:hover) .custom-thumb {
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
/* 刻度区：紧贴轨道下方（轨道底边距 input 底边 8px，向上偏移使刻度点贴合轨道下缘） */
.marks {
  position: relative;
  width: 100%;
  margin-top: -6px;
}
.mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}
.mark-dot {
  width: 4px;
  height: 4px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--oas-color-border);
}
.mark[data-passed='true'] .mark-dot {
  background: var(--oas-color-primary);
}
.mark-label {
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
.mark[data-passed='true'] .mark-label {
  color: var(--oas-color-text-primary);
}
:host([disabled]) .marks {
  opacity: 0.6;
}
/* 数值输入区（show-input） */
.inputs {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: 0 0 auto;
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
    ]
  }

  private input: HTMLInputElement | null = null
  private minInput: HTMLInputElement | null = null
  private maxInput: HTMLInputElement | null = null
  private numInput: HTMLInputElement | null = null
  private numMinInput: HTMLInputElement | null = null
  private numMaxInput: HTMLInputElement | null = null
  /** 上次渲染的刻度签名（min/max + reverse + 条目），用于增量重建判断 */
  private marksKey = ''
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private thumbObserver: MutationObserver | null = null
  /** 拖动中（用于拖动时显示值气泡，不依赖 show-tooltip） */
  private dragging = false

  /** 宿主框架（Vue/React）以对象/数组赋值时走 property setter，反射到 attribute 统一解析链路 */
  get marks(): string {
    return this.getAttribute('marks') ?? ''
  }
  set marks(value: string | Record<string, string | number> | number[]) {
    this.setAttribute('marks', typeof value === 'string' ? value : JSON.stringify(value))
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
        this.clampRangeInputs()
        this.syncValueAttr()
        this.syncOverlay()
        this.syncNumInputs()
        this.syncMarkPassed()
        this.emit('input', { value: this.currentRange() })
      })
      r.addEventListener('change', () => {
        this.dragging = false
        this.clampRangeInputs()
        this.syncValueAttr()
        this.syncOverlay()
        this.syncNumInputs()
        this.syncMarkPassed()
        this.emit('change', { value: this.currentRange() })
      })
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

    // 范围模式：指针按下时按「离哪个 thumb 近」提升哪个输入的 z-index（原生拖动接管）
    wrap?.addEventListener('pointerdown', (e) => {
      if (!this.hasAttr('range') || !this.minInput || !this.maxInput) return
      const [lo, hi] = this.currentRange()
      const min = Number(this.getAttr('min', '0'))
      const max = Number(this.getAttr('max', '100'))
      const rect = wrap.getBoundingClientRect()
      const pct = rect.width ? ((e.clientX - rect.left) / rect.width) * 100 : 50
      const reverse = this.hasAttr('reverse')
      const span = max - min || 1
      const valueAt = min + (reverse ? 100 - pct : pct) * (span / 100)
      const mid = (lo + hi) / 2
      const target = valueAt <= mid ? this.minInput : this.maxInput
      this.minInput.style.zIndex = target === this.minInput ? '2' : '1'
      this.maxInput.style.zIndex = target === this.maxInput ? '2' : '1'
    })
    // 键盘/焦点：聚焦哪个滑块置顶 + 焦点环映射到自定义滑块
    wrap?.addEventListener('focusin', (e) => {
      const role = (e.target as HTMLElement).dataset.role ?? ''
      const map: Record<string, string> = { range: 'value', 'range-min': 'min', 'range-max': 'max' }
      if (map[role]) this.setAttribute('data-focused', map[role])
      else this.removeAttribute('data-focused')
      if (role === 'range-min' && this.minInput) {
        this.minInput.style.zIndex = '2'
        if (this.maxInput) this.maxInput.style.zIndex = '1'
      } else if (role === 'range-max' && this.maxInput) {
        this.maxInput.style.zIndex = '2'
        if (this.minInput) this.minInput.style.zIndex = '1'
      }
    })
    wrap?.addEventListener('focusout', () => this.removeAttribute('data-focused'))

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
    const disabled = this.hasAttr('disabled')
    const min = this.getAttr('min', '0')
    const max = this.getAttr('max', '100')
    const step = this.getAttr('step', '1')
    const dir = reverse ? 'rtl' : 'ltr'

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

    // 原生属性透传 + 反向 + ARIA
    for (const r of [this.input, this.minInput, this.maxInput]) {
      r.min = min
      r.max = max
      r.step = step
      r.disabled = disabled
      r.setAttribute('dir', dir)
      r.setAttribute('role', 'slider')
      r.setAttribute('aria-valuenow', r.value)
    }
    this.input.setAttribute('aria-label', this.t('slider.valueLabel'))
    this.minInput.setAttribute('aria-label', this.t('slider.minLabel'))
    this.maxInput.setAttribute('aria-label', this.t('slider.maxLabel'))
    if (this.numInput) this.numInput.setAttribute('aria-label', this.t('slider.valueLabel'))
    if (this.numMinInput) this.numMinInput.setAttribute('aria-label', this.t('slider.minLabel'))
    if (this.numMaxInput) this.numMaxInput.setAttribute('aria-label', this.t('slider.maxLabel'))
    for (const n of [this.numInput, this.numMinInput, this.numMaxInput]) {
      if (n) n.disabled = disabled
    }

    // 受控值同步（attribute 为唯一权威源，内部交互不改 attribute 保持受控语义）
    if (isRange) {
      const [lo, hi] = this.rangeValue()
      this.minInput.value = String(lo)
      this.maxInput.value = String(hi)
      if (this.numMinInput) this.numMinInput.value = String(lo)
      if (this.numMaxInput) this.numMaxInput.value = String(hi)
    } else {
      const value = this.getAttr('value', '')
      if (this.input.value !== value) this.input.value = value
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
   * 单值写数字字符串，range 写 "lo,hi" 逗号分隔。宿主 getAttribute / 表单序列化 /
   * 外部读状态可直接取最新值，不必缓存 oas-change detail。
   * 写回触发的 attributeChangedCallback → update() 为幂等同步（值相同无循环、不再 emit）。
   */
  private syncValueAttr(): void {
    if (this.hasAttr('range')) {
      const [lo, hi] = this.currentRange()
      this.setAttribute('value', `${lo},${hi}`)
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
    const isRange = this.hasAttr('range')
    const tipsVisible = this.hasAttr('show-tooltip') || this.dragging

    // 拖动中也启用自定义滑块：拖动时临时显示值气泡（无需 show-tooltip）
    const useOverlay = this.hasCustomThumb() || this.hasAttr('show-tooltip') || this.dragging

    const [lo, hi] = isRange ? this.currentRange() : [min, Number(this.input?.value ?? 0)]
    const pctOf = (v: number): number => ((v - min) / span) * 100
    const pctLo = pctOf(lo)
    const pctHi = pctOf(hi)

    // 填充区：单值从 min 端（reverse 为右端），范围填在两 thumb 之间
    fill.style.width = `${pctHi - pctLo}%`
    if (isRange) {
      fill.style.left = `${reverse ? 100 - pctHi : pctLo}%`
      fill.style.right = 'auto'
    } else if (reverse) {
      fill.style.right = '0%'
      fill.style.left = 'auto'
    } else {
      fill.style.left = '0%'
      fill.style.right = 'auto'
    }
    fill.dataset.pct = String(reverse ? 100 - pctHi : pctHi)

    for (const th of this.shadow.querySelectorAll<HTMLElement>('.custom-thumb')) {
      const which = th.dataset.thumb
      const visible =
        which === 'value'
          ? useOverlay && !isRange
          : (which === 'min' || which === 'max') && useOverlay && isRange
      const tip = th.querySelector<HTMLElement>('.thumb-tip')
      if (tip) {
        tip.textContent = String(which === 'min' ? lo : hi)
        tip.hidden = !tipsVisible
      }
      th.hidden = !visible
      if (!visible) continue
      const v = which === 'min' ? lo : hi
      const norm = reverse ? 100 - pctOf(v) : pctOf(v)
      th.dataset.pct = String(norm)
      th.style.left = this.thumbLeft(norm)
    }

    if (useOverlay) this.setAttribute('data-custom-thumb', '')
    else this.removeAttribute('data-custom-thumb')
  }

  /** 自定义滑块像素定位：与原生 thumb「中心」对齐——原生 thumb 左缘 = pct×(总宽-直径)，
      中心再 + 半径；custom-thumb 以 translate(-50%,-50%) 按中心定位，少了半径会偏左 7px */
  private thumbLeft(normPct: number): string {
    const input = this.hasAttr('range') ? (this.maxInput ?? this.input) : this.input
    const trackW = input?.clientWidth ?? 0
    if (!trackW) return `${normPct}%`
    const pos = (normPct / 100) * (trackW - THUMB_SIZE) + THUMB_SIZE / 2
    return `${pos}px`
  }

  // ---------- marks 刻度 ----------

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

  /** 增量同步刻度区：签名变化才重建节点，否则只更新经过状态 */
  private syncMarks(): void {
    const marksEl = this.shadow.querySelector<HTMLElement>('.marks')
    const input = this.input
    if (!marksEl || !input) return
    const marks = this.parseMarks()
    if (marks.length === 0) {
      marksEl.hidden = true
      this.marksKey = ''
      return
    }
    marksEl.hidden = false
    const min = Number(this.getAttr('min', '0'))
    const max = Number(this.getAttr('max', '100'))
    const reverse = this.hasAttr('reverse')
    const key =
      `${reverse ? 'r' : ''}:${min}:${max}|` + marks.map((m) => `${m.value}:${m.label}`).join('|')
    if (key !== this.marksKey) {
      this.marksKey = key
      this.renderMarks(marksEl, marks, min, max)
    }
    if (this.hasAttr('range')) {
      const [lo, hi] = this.currentRange()
      this.updateMarkPassed(marksEl, lo, hi)
    } else {
      this.updateMarkPassed(marksEl, -Infinity, Number(input.value))
    }
  }

  private renderMarks(container: HTMLElement, marks: MarkEntry[], min: number, max: number): void {
    const span = max - min || 1
    const reverse = this.hasAttr('reverse')
    container.innerHTML = ''
    for (const mark of marks) {
      const item = document.createElement('div')
      item.className = 'mark'
      item.setAttribute('part', 'mark')
      item.setAttribute('data-value', String(mark.value))
      item.setAttribute('data-passed', 'false')
      const pct = ((mark.value - min) / span) * 100
      item.style.left = `${reverse ? 100 - pct : pct}%`
      const dot = document.createElement('div')
      dot.className = 'mark-dot'
      const label = document.createElement('div')
      label.className = 'mark-label'
      label.textContent = mark.label
      item.append(dot, label)
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
    if (this.hasAttr('range')) {
      const [lo, hi] = this.currentRange()
      this.updateMarkPassed(marksEl, lo, hi)
    } else {
      this.updateMarkPassed(marksEl, -Infinity, Number(this.input?.value ?? 0))
    }
  }
}
