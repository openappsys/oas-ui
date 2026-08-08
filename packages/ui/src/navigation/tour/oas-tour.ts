import { OASElement } from '@oas-ui/core'

export interface TourStep {
  selector: string
  title: string
  description?: string
}

const STYLE = `
:host {
  display: none;
}
:host([open]) {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: var(--oas-z-modal, 1050);
}
.highlight {
  position: fixed;
  z-index: calc(var(--oas-z-modal, 1050) + 1);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  transition: all var(--oas-transition-base) var(--oas-ease-out);
}
.popup {
  position: fixed;
  z-index: calc(var(--oas-z-modal, 1050) + 2);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: var(--oas-space-4);
  min-width: 240px;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.desc {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--oas-space-4);
}
.step-count {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.actions {
  display: flex;
  gap: var(--oas-space-2);
}
.btn {
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  font-family: inherit;
}
.btn[part='next'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: #fff;
}
`

export class OAStour extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'steps', 'current']
  }

  private steps: TourStep[] = []
  private highlight: HTMLElement | null = null
  private popup: HTMLElement | null = null
  private current = 0

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="highlight" part="highlight" aria-hidden="true"></div>
      <div class="popup" part="popup" role="dialog" aria-modal="true">
        <div class="title" part="title"></div>
        <div class="desc" part="desc"></div>
        <div class="footer">
          <span class="step-count" part="step-count"></span>
          <div class="actions">
            <button class="btn" part="skip" type="button"></button>
            <button class="btn" part="prev" type="button"></button>
            <button class="btn" part="next" type="button"></button>
          </div>
        </div>
      </div>
    `
    this.highlight = this.shadow.querySelector('.highlight')
    this.popup = this.shadow.querySelector('.popup')
    this.shadow.querySelector('[part="next"]')?.addEventListener('click', () => this.next())
    this.shadow.querySelector('[part="prev"]')?.addEventListener('click', () => this.prev())
    this.shadow.querySelector('[part="skip"]')?.addEventListener('click', () => this.cancel())
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && this.hasAttr('open')) this.cancel()
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.update()
  }

  private next(): void {
    if (this.current >= this.steps.length - 1) {
      this.emit('finish')
      this.removeAttribute('open')
      return
    }
    this.current += 1
    this.setAttribute('current', String(this.current))
    this.emit('step', { index: this.current })
    this.update()
  }

  private prev(): void {
    if (this.current <= 0) return
    this.current -= 1
    this.setAttribute('current', String(this.current))
    this.emit('step', { index: this.current })
    this.update()
  }

  private cancel(): void {
    this.emit('cancel')
    this.removeAttribute('open')
  }

  protected override update(): void {
    if (!this.highlight || !this.popup) return
    this.parseSteps()
    this.current = Math.min(
      Math.max(Number(this.getAttr('current', '0')) || 0, 0),
      this.steps.length - 1,
    )
    const open = this.hasAttr('open')
    // 操作按钮文案一律 locale 驱动（关闭状态下也保持最新，setLocale 切换自动重刷）
    this.shadow.querySelector<HTMLElement>('[part="skip"]')!.textContent = this.t('tour.skip')
    this.shadow.querySelector<HTMLElement>('[part="prev"]')!.textContent = this.t('tour.prev')
    const nextBtn = this.shadow.querySelector<HTMLButtonElement>('[part="next"]')!
    nextBtn.textContent =
      this.current >= this.steps.length - 1 ? this.t('tour.finish') : this.t('tour.next')
    if (!open) return
    const step = this.steps[this.current]
    if (!step) return
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = step.title
    this.shadow.querySelector<HTMLElement>('[part="desc"]')!.textContent = step.description ?? ''
    this.shadow.querySelector<HTMLElement>('[part="step-count"]')!.textContent =
      `${this.current + 1} / ${this.steps.length}`
    const target = document.querySelector(step.selector)
    if (target) {
      const rect = target.getBoundingClientRect()
      this.highlight.style.display = 'block'
      this.highlight.style.top = `${rect.top - 4}px`
      this.highlight.style.left = `${rect.left - 4}px`
      this.highlight.style.width = `${rect.width + 8}px`
      this.highlight.style.height = `${rect.height + 8}px`
      this.popup.style.top = `${rect.bottom + 12}px`
      this.popup.style.left = `${rect.left}px`
    } else {
      this.highlight.style.display = 'none'
      this.popup.style.top = '50%'
      this.popup.style.left = '50%'
      this.popup.style.transform = 'translate(-50%, -50%)'
    }
    const prevBtn = this.shadow.querySelector<HTMLButtonElement>('[part="prev"]')!
    prevBtn.disabled = this.current === 0
  }

  private parseSteps(): void {
    try {
      const parsed = JSON.parse(this.getAttr('steps', '[]'))
      this.steps = Array.isArray(parsed)
        ? parsed.filter(
            (s): s is TourStep =>
              s && typeof s.selector === 'string' && typeof s.title === 'string',
          )
        : []
    } catch {
      this.steps = []
    }
  }
}
