import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
  min-width: 0;
}
/* 全空态：宿主整体不显示（无布局足迹——.well 有固定高胶囊底，仅藏内段时空井仍占位） */
:host([data-empty]) {
  display: none;
}
:host([hidden]) {
  display: none;
}
.well {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  min-width: 0;
  height: var(--oas-action-bar-well-height, 32px);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-action-bar-well-bg, color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent));
  font-variant-numeric: tabular-nums;
}
.well-label {
  flex-shrink: 0;
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
}
.well-label[hidden] {
  display: none;
}
/* 时间码 scrub 滑轨（role=slider）：键盘 ←/→ ±1 帧、↑/↓ ±1 秒、Home/End 首/尾帧；
   指针拖拽 scrub 延后（先键盘可达，视觉不给拖拽 cursor 假示能） */
.well-value {
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: var(--oas-radius-sm);
}
.well-value:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.well-total {
  flex-shrink: 0;
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
}
.well-total[hidden] {
  display: none;
}
.well-detail {
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.well-detail[hidden] {
  display: none;
}
`

/** 帧数解析：非有限数回落 0，负值 clamp 0，向下取整（时间码按整帧算） */
function parseFrames(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

/** 帧率解析：有限且 ≥ 1 的数按整数帧率取整；否则 null（时间码退化为原始帧数） */
function parseFps(raw: string): number | null {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

/** 总帧数解析：空/非有限/负数 → null（无上界语义）——注意 Number('') 是 0，空串须先行排除 */
function parseDuration(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 帧号 → HH:MM:SS:FF 时间码文本（纯展示换算：不做 drop-frame/播放时钟/时间线模型） */
function timecode(totalFrames: number, fps: number): string {
  const ff = totalFrames % fps
  const totalSeconds = Math.floor(totalFrames / fps)
  const ss = totalSeconds % 60
  const mm = Math.floor(totalSeconds / 60) % 60
  const hh = Math.floor(totalSeconds / 3600)
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`
}

/**
 * oas-transport-well —— 媒体运输读数井（NLE/播放器时间码 scrub）。
 *
 * 属性（kebab-case）：
 * - `label`：读数标签（空时隐藏）
 * - `frames`：当前帧（受控显示——键盘 seek 只发事件，宿主回写；非法回落 0）
 * - `frame-rate`：帧率 fps（时间码换算基准；缺省/非法时时间码退化为原始帧数显示）
 * - `duration`：总帧数（可选——决定「/总时长」段、seek 上界与 aria-valuemax）
 * - `detail`：补充信息（分辨率/色彩空间等，与自动帧率文本拼段；空段隐藏）
 *
 * 时间码显示 `HH:MM:SS:FF`（纯展示换算：frames+fps → 文本；不做 drop-frame/播放引擎）。
 *
 * seek 交互：时间码即 scrub 滑轨（`role="slider"` + tabindex=0，可访问名 label > i18n），
 * 键盘 ←/→ ±1 帧（RTL 镜像）、↑/↓ ±1 秒（fps 帧）、Home/End 首/尾帧，
 * 每次派发 `oas-seek`（detail `{ frames }`，提议值 clamp [0, duration]）——
 * 受控显示：组件不自改 `frames`，宿主回写驱动读数推进（同 task-progress-well 的 progress）。
 *
 * 全空态（label/frames/frame-rate/duration/detail 全缺）：宿主打 `data-empty` 反射并整体不显示。
 * a11y：井 `aria-live="polite"`；滑轨 aria-valuemin/max/now + aria-valuetext（时间码可读）。
 */
export class OASTransportWell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'frames', 'frame-rate', 'duration', 'detail', 'dir']
  }

  /** 稳定 handler 引用（addEventListener 同引用去重，render/水合/reconnect 幂等重入） */
  private readonly onSeekKey = (e: Event): void => {
    const ke = e as KeyboardEvent
    const fps = parseFps(this.getAttr('frame-rate', ''))
    const dur = parseDuration(this.getAttr('duration', ''))
    const current = this.displayFrames()
    const rtl = isRtl(this)
    let next: number | null = null
    switch (ke.key) {
      case 'ArrowRight':
        next = current + (rtl ? -1 : 1)
        break
      case 'ArrowLeft':
        next = current + (rtl ? 1 : -1)
        break
      case 'ArrowUp':
        next = current + (fps ?? 1)
        break
      case 'ArrowDown':
        next = current - (fps ?? 1)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        // 无 duration（未知总长）时尾帧语义不存在——不派发
        next = dur != null ? dur : null
        break
    }
    if (next === null) return
    next = Math.max(0, dur != null ? Math.min(next, dur) : next)
    ke.preventDefault()
    this.emit('seek', { frames: next })
  }

  /** 当前显示帧（clamp [0, duration]；无 duration 只保下界 0） */
  private displayFrames(): number {
    const frames = parseFrames(this.getAttr('frames', ''))
    const dur = parseDuration(this.getAttr('duration', ''))
    return dur != null ? Math.min(frames, dur) : frames
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="well" part="well" aria-live="polite"><span class="well-label" part="well-label" hidden></span><span class="well-value" part="well-value" role="slider" tabindex="0" hidden></span><span class="well-total" part="well-total" hidden></span><span class="well-detail" part="well-detail" hidden></span></div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="well-value"]')?.addEventListener('keydown', this.onSeekKey)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（well 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="well"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    const labelEl = this.shadow.querySelector<HTMLElement>('[part="well-label"]')
    const valueEl = this.shadow.querySelector<HTMLElement>('[part="well-value"]')
    const totalEl = this.shadow.querySelector<HTMLElement>('[part="well-total"]')
    const detailEl = this.shadow.querySelector<HTMLElement>('[part="well-detail"]')
    if (!labelEl || !valueEl || !totalEl || !detailEl) return

    // label 段：空时隐藏（无空占位）
    const label = this.getAttr('label', '')
    labelEl.textContent = label
    labelEl.hidden = label === ''

    // 时间码段：frames/frame-rate/duration 任一在场即有意义（缺 frames 显示起点 0）；
    // 全缺（无任何时间数据）时隐藏——不留 00:00:00:00 假读数
    const fps = parseFps(this.getAttr('frame-rate', ''))
    const dur = parseDuration(this.getAttr('duration', ''))
    const hasTimeData = this.hasAttribute('frames') || fps != null || dur != null
    const frames = this.displayFrames()
    valueEl.hidden = !hasTimeData
    valueEl.textContent = hasTimeData ? (fps != null ? timecode(frames, fps) : String(frames)) : ''

    // 滑轨 aria：可访问名 label > i18n 兜底；valuetext 给时间码（读屏播报时间而非裸帧号）
    valueEl.setAttribute('aria-label', label || this.t('actionBar.seek'))
    valueEl.setAttribute('aria-valuemin', '0')
    valueEl.setAttribute('aria-valuenow', String(frames))
    valueEl.setAttribute('aria-valuetext', fps != null ? timecode(frames, fps) : String(frames))
    if (dur != null) valueEl.setAttribute('aria-valuemax', String(dur))
    else valueEl.removeAttribute('aria-valuemax')

    // /总时长 段：duration 在场才有；无 fps 时退化为原始帧数（f = 帧单位，locale 中立）
    if (dur != null) {
      totalEl.textContent = fps != null ? `/ ${timecode(dur, fps)}` : `/ ${dur} f`
      totalEl.hidden = false
    } else {
      totalEl.hidden = true
    }

    // detail 段：自动帧率文本 ∪ detail 属性，全缺则整段隐藏
    const parts: string[] = []
    if (fps != null) parts.push(`${fps} fps`)
    const detail = this.getAttr('detail', '')
    if (detail !== '') parts.push(detail)
    detailEl.textContent = parts.join(' · ')
    detailEl.hidden = parts.length === 0

    // 全空态：宿主打 data-empty（:host([data-empty]) display:none 整体退场，零布局足迹）
    this.toggleAttribute(
      'data-empty',
      label === '' && !this.hasAttribute('frames') && fps == null && dur == null && detail === '',
    )
  }
}
