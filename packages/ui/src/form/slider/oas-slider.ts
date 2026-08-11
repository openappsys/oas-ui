import { OASElement } from '@oas-ui/core'

/** 单个刻度：数值 + 展示标签 */
interface MarkEntry {
  value: number
  label: string
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  width: 100%;
  min-width: 120px;
}
input {
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: var(--oas-color-border);
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
  background: var(--oas-color-border);
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
`

export class OASSlider extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'min', 'max', 'step', 'disabled', 'marks']
  }

  private input: HTMLInputElement | null = null
  /** 上次渲染的刻度签名（min/max + 条目），用于增量重建判断 */
  private marksKey = ''

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
      <input part="track" type="range" />
      <div class="marks" part="marks" hidden></div>
    `
  }

  /** 缓存节点引用 + 绑定拖动/提交事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.input?.addEventListener('input', () => {
      this.syncMarkPassed()
      this.emit('input', { value: Number(this.input!.value) })
    })
    this.input?.addEventListener('change', () => {
      this.emit('change', { value: Number(this.input!.value) })
    })
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
    const input = this.input
    if (!input) return
    const value = this.getAttr('value', '')
    const min = this.getAttr('min', '0')
    const max = this.getAttr('max', '100')
    const step = this.getAttr('step', '1')
    const disabled = this.hasAttr('disabled')

    if (input.value !== value) input.value = value
    input.min = min
    input.max = max
    input.step = step
    input.disabled = disabled

    this.syncMarks()
  }

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
    const key = `${min}:${max}|` + marks.map((m) => `${m.value}:${m.label}`).join('|')
    if (key !== this.marksKey) {
      this.marksKey = key
      this.renderMarks(marksEl, marks, min, max)
    }
    this.updateMarkPassed(marksEl, Number(input.value))
  }

  private renderMarks(container: HTMLElement, marks: MarkEntry[], min: number, max: number): void {
    const span = max - min || 1
    container.innerHTML = ''
    for (const mark of marks) {
      const item = document.createElement('div')
      item.className = 'mark'
      item.setAttribute('part', 'mark')
      item.setAttribute('data-value', String(mark.value))
      item.setAttribute('data-passed', 'false')
      const pct = ((mark.value - min) / span) * 100
      item.style.left = `${pct}%`
      const dot = document.createElement('div')
      dot.className = 'mark-dot'
      const label = document.createElement('div')
      label.className = 'mark-label'
      label.textContent = mark.label
      item.append(dot, label)
      container.appendChild(item)
    }
  }

  /** 更新各刻度「当前值是否经过」状态（data-passed），只改属性不重建节点 */
  private updateMarkPassed(container: HTMLElement, current: number): void {
    for (const item of container.querySelectorAll<HTMLElement>('.mark')) {
      const passed = Number(item.getAttribute('data-value')) <= current
      const flag = passed ? 'true' : 'false'
      if (item.getAttribute('data-passed') !== flag) {
        item.setAttribute('data-passed', flag)
      }
    }
  }

  /** input 拖动/键盘实时变化时，仅刷新经过状态（不动 value 属性，保持受控语义） */
  private syncMarkPassed(): void {
    const marksEl = this.shadow.querySelector<HTMLElement>('.marks')
    if (!marksEl || !this.input || marksEl.hidden) return
    this.updateMarkPassed(marksEl, Number(this.input.value))
  }
}
