import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
  min-width: 0;
  max-width: var(--oas-action-bar-well-max-width, 320px);
}
:host([hidden]) {
  display: none;
}
/* 全空态（label/detail 全缺且未设 progress）：宿主打 data-empty 反射并整体不显示（无布局足迹，不留固定高胶囊） */
:host([data-empty]) {
  display: none;
}
.well {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-md);
  background: var(--oas-action-bar-well-bg, color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent));
}
.head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  min-width: 0;
}
.well-label {
  flex-shrink: 1;
  min-width: 0;
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
}
.well-label[hidden] {
  display: none;
}
.well-progress-text {
  flex-shrink: 0;
  margin-inline-start: auto;
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
/* 进度轨道：迷你横条（井内紧凑形态，颜色走语义 token） */
.track {
  position: relative;
  height: 3px;
  border-radius: var(--oas-radius-full, 999px);
  background: color-mix(in srgb, var(--oas-color-on-ink) 18%, transparent);
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: inherit;
  background: var(--oas-action-bar-progress-color, var(--oas-color-primary));
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
.cancel-btn {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--oas-control-height-xs, 20px);
  height: var(--oas-control-height-xs, 20px);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.cancel-btn:hover {
  background: color-mix(in srgb, var(--oas-color-on-ink) 16%, transparent);
}
.cancel-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
`

const CLOSE_ICON =
  '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'

/** progress 数值解析：非有限数回落 0，越界 clamp 0-100 */
function parseProgress(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/**
 * oas-task-progress-well —— 任务进度读数井（导出/渲染/上传等后台任务）。
 *
 * 属性（kebab-case）：
 * - `label`：任务名
 * - `progress`：0-100（受控显示——宿主驱动，组件不自涨；越界 clamp、非法回落 0）
 * - `detail`：补充信息（速度/剩余时间等）
 *
 * 边界：进度到 100 保留完成态（组件不自行移除，宿主决定隐藏——避免与宿主状态冲突）。
 *
 * 事件：`oas-cancel`（detail `{ label }`，bubbles + composed；组件只发事件不移除自身）。
 *
 * a11y：井 `aria-live="polite"`；进度条 `role="progressbar"` + aria-valuenow/min/max 三件套；
 * 取消钮 aria-label 走 i18n。
 */
export class OASTaskProgressWell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'progress', 'detail', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="well" part="well" aria-live="polite">
        <div class="head">
          <span class="well-label" part="well-label" hidden></span>
          <span class="well-progress-text" part="well-progress-text">0%</span>
          <button class="cancel-btn" part="well-cancel" type="button">${CLOSE_ICON}</button>
        </div>
        <div class="track" part="well-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="fill" part="well-fill" style="width: 0%"></div></div>
        <div class="well-detail" part="well-detail" hidden></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('[part="well-cancel"]')?.addEventListener('click', () => {
      this.emit('cancel', { label: this.getAttr('label', '') })
    })
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
    const progressText = this.shadow.querySelector<HTMLElement>('[part="well-progress-text"]')
    const detailEl = this.shadow.querySelector<HTMLElement>('[part="well-detail"]')
    const track = this.shadow.querySelector<HTMLElement>('[role="progressbar"]')
    const fill = this.shadow.querySelector<HTMLElement>('[part="well-fill"]')
    const cancelBtn = this.shadow.querySelector<HTMLElement>('[part="well-cancel"]')
    if (!labelEl || !progressText || !detailEl || !track || !fill || !cancelBtn) return

    // 取消钮可访问名称（i18n，locale 反应式）
    cancelBtn.setAttribute('aria-label', this.t('actionBar.cancel'))

    // label 空时隐藏（无空占位）；detail 同理
    const label = this.getAttr('label', '')
    labelEl.textContent = label
    labelEl.hidden = label === ''
    const detail = this.getAttr('detail', '')
    detailEl.textContent = detail
    detailEl.hidden = detail === ''
    // 全空态（label/detail 全缺且未设 progress）：整体退场（同 statistic-well，空井零布局足迹）
    this.toggleAttribute('data-empty', label === '' && detail === '' && !this.hasAttribute('progress'))

    // 进度：受控显示（宿主驱动），clamp 0-100；progressbar 可访问名：label 属性 > i18n 兜底
    // （axe 严重违规「ARIA progressbar nodes must have an accessible name」的硬闸修复）
    const progress = parseProgress(this.getAttr('progress', '0'))
    progressText.textContent = `${progress}%`
    track.setAttribute('aria-valuenow', String(progress))
    track.setAttribute('aria-label', label || this.t('actionBar.progress'))
    fill.style.width = `${progress}%`
  }
}
