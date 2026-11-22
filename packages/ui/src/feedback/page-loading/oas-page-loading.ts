import { OASElement } from '@oas-ui/core/oas-element'
import { loadingPath } from '@oas-ui/icons/icons/loading'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-page-loading —— 整页加载态（全屏遮罩 + 三种形态）。
 *
 * 形态：
 * - `spinner`（默认）：居中转圈 + 文案
 * - `skeleton`：骨架行占位（`rows` 控制行数）
 * - `progress`：进度条（`value` 0–100）+ 百分比
 *
 * 属性（kebab-case）：
 * - `open`：受控显隐（在场=显示遮罩、移除=隐藏；宿主直接写属性静默，不派发事件）
 * - `mode`：`spinner` / `skeleton` / `progress`；非法值回落 spinner 并告警一次
 * - `text`：加载文案覆盖；缺省走 i18n `loading.loading`
 * - `value`：进度百分比（仅 progress 形态），0–100，越界钳制、非法回落 0
 * - `rows`：骨架行数（仅 skeleton 形态），正整数，缺省 4（1–12 钳制）
 *
 * 方法：
 * - `show()`：显示加载态（等价于写入 `open` 属性）
 * - `close()`：关闭加载态（移除 `open` 并派发 `oas-close`）
 *
 * 事件（bubbles + composed）：
 * - `oas-close`：调用 `close()` 关闭时派发，detail `{ mode }`
 *
 * 无障碍：面板 `role="status"` + `aria-live="polite"` + `aria-busy="true"`；
 * 进度形态的轨道为 `role="progressbar"` 并同步 `aria-valuenow`。
 */

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
:host(:not([open])) {
  display: none;
}
.mask {
  position: fixed;
  inset: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  background: var(--oas-page-loading-mask, var(--oas-color-overlay));
  -webkit-backdrop-filter: var(--oas-page-loading-blur, none);
  backdrop-filter: var(--oas-page-loading-blur, none);
}
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  width: 100%;
  max-width: var(--oas-page-loading-max-width, 360px);
  padding: var(--oas-space-5);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-page-loading-bg, var(--oas-color-bg));
  color: var(--oas-page-loading-color, var(--oas-color-text-primary));
  box-shadow: var(--oas-page-loading-shadow, 0 8px 32px color-mix(in srgb, var(--oas-color-overlay) 28%, transparent));
}
.spinner,
.skeleton,
.progress {
  display: none;
  width: 100%;
}
:host([data-mode='spinner']) .spinner {
  display: flex;
  justify-content: center;
}
:host([data-mode='skeleton']) .skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
:host([data-mode='progress']) .progress {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.spinner svg {
  display: block;
  width: var(--oas-page-loading-spinner-size, 32px);
  height: var(--oas-page-loading-spinner-size, 32px);
  color: var(--oas-page-loading-spinner-color, var(--oas-color-primary));
  animation: oas-page-loading-spin var(--oas-page-loading-spin-duration, 0.9s) linear infinite;
}
@keyframes oas-page-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
.row {
  display: block;
  height: 12px;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-page-loading-skeleton, color-mix(in srgb, var(--oas-color-text-primary) 10%, transparent));
  animation: oas-page-loading-pulse var(--oas-page-loading-pulse-duration, 1.4s) ease-in-out infinite;
}
.row.short {
  width: 62%;
}
@keyframes oas-page-loading-pulse {
  50% {
    opacity: 0.45;
  }
}
.track {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--oas-page-loading-track, color-mix(in srgb, var(--oas-color-text-primary) 12%, transparent));
}
.bar {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--oas-page-loading-bar, var(--oas-color-primary));
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
.percent {
  align-self: flex-end;
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
  color: var(--oas-color-text-secondary);
}
.label {
  font-size: var(--oas-font-size-md);
  color: var(--oas-page-loading-color, var(--oas-color-text-primary));
}
:host([data-mode='skeleton']) .label {
  display: none;
}
:host([data-mode='skeleton']) .percent {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .spinner svg,
  .row {
    animation: none;
  }
  .bar {
    transition: none;
  }
}
`

export type PageLoadingMode = 'spinner' | 'skeleton' | 'progress'

const MODES: readonly PageLoadingMode[] = ['spinner', 'skeleton', 'progress']
const warnedModes = new Set<string>()
const warnedValues = new Set<string>()
const warnedRows = new Set<string>()

export class OASPageLoading extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'mode', 'text', 'value', 'rows']
  }

  private panelEl: HTMLElement | null = null
  private labelEl: HTMLElement | null = null
  private skeletonEl: HTMLElement | null = null
  private trackEl: HTMLElement | null = null
  private barEl: HTMLElement | null = null
  private percentEl: HTMLElement | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="mask" part="mask">
        <div class="panel" part="panel" role="status" aria-live="polite" aria-busy="true">
          <div class="spinner" part="spinner"><svg viewBox="0 0 16 16" aria-hidden="true">${loadingPath}</svg></div>
          <div class="skeleton" part="skeleton"></div>
          <div class="progress" part="progress">
            <div class="track" part="track" role="progressbar" aria-valuemin="0" aria-valuemax="100">
              <div class="bar" part="bar"></div>
            </div>
            <span class="percent" part="percent"></span>
          </div>
          <span class="label" part="label"></span>
        </div>
      </div>
    `
  }

  private bind(): void {
    this.panelEl = this.shadow.querySelector<HTMLElement>('.panel')
    this.labelEl = this.shadow.querySelector<HTMLElement>('.label')
    this.skeletonEl = this.shadow.querySelector<HTMLElement>('.skeleton')
    this.trackEl = this.shadow.querySelector<HTMLElement>('.track')
    this.barEl = this.shadow.querySelector<HTMLElement>('.bar')
    this.percentEl = this.shadow.querySelector<HTMLElement>('.percent')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 命令式显示（与写入 open 属性等价） */
  show(): void {
    this.setAttribute('open', '')
  }

  /** 命令式关闭：移除 open 并派发 oas-close（宿主仅写属性时静默） */
  close(): void {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.emit('close', { mode: this.resolveMode() })
  }

  private resolveMode(): PageLoadingMode {
    const raw = this.getAttr('mode', '').trim()
    if (raw === '') return 'spinner'
    if (MODES.includes(raw as PageLoadingMode)) return raw as PageLoadingMode
    if (!warnedModes.has(raw)) {
      warnedModes.add(raw)
      devWarn(`[oas-page-loading] 未知 mode "${raw}"，已回落 spinner；可选 spinner / skeleton / progress`)
    }
    return 'spinner'
  }

  private resolveValue(): number {
    const raw = this.getAttr('value', '').trim()
    if (raw === '') return 0
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      if (!warnedValues.has(raw)) {
        warnedValues.add(raw)
        devWarn(`[oas-page-loading] 非法 value "${raw}"，已回落 0；应为 0–100 的数值`)
      }
      return 0
    }
    return Math.min(100, Math.max(0, n))
  }

  private resolveRows(): number {
    const raw = this.getAttr('rows', '').trim()
    if (raw === '') return 4
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) {
      if (!warnedRows.has(raw)) {
        warnedRows.add(raw)
        devWarn(`[oas-page-loading] 非法 rows "${raw}"，已回落 4；应为 1–12 的整数行数`)
      }
      return 4
    }
    return Math.min(12, Math.max(1, n))
  }

  private renderSkeleton(rows: number): void {
    const el = this.skeletonEl
    if (!el) return
    if (el.childElementCount === rows) return
    el.replaceChildren()
    for (let i = 0; i < rows; i++) {
      const row = document.createElement('span')
      row.classList.add('row')
      if (i === rows - 1) row.classList.add('short')
      el.appendChild(row)
    }
  }

  protected override update(): void {
    const mode = this.resolveMode()
    this.setAttribute('data-mode', mode)

    if (this.labelEl) this.labelEl.textContent = this.getAttr('text', '').trim() || this.t('loading.loading')
    if (this.panelEl) {
      this.panelEl.setAttribute('aria-label', this.labelEl?.textContent ?? '')
      this.panelEl.setAttribute('aria-busy', this.hasAttribute('open') ? 'true' : 'false')
    }

    if (mode === 'skeleton') this.renderSkeleton(this.resolveRows())

    if (mode === 'progress') {
      const value = this.resolveValue()
      const pct = `${value}%`
      if (this.barEl) this.barEl.style.width = pct
      if (this.percentEl) this.percentEl.textContent = pct
      if (this.trackEl) this.trackEl.setAttribute('aria-valuenow', String(value))
    }
  }
}
