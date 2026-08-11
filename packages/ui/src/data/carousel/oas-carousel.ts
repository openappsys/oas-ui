import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-lg);
}
:host([hidden]) {
  display: none;
}
.viewport {
  overflow: hidden;
}
.track {
  display: flex;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
::slotted(*) {
  flex: 0 0 100%;
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.dots {
  position: absolute;
  bottom: var(--oas-space-3);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: var(--oas-space-2);
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
}
.dot[aria-current='true'] {
  background: #fff;
}
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  /* 默认（悬停形态）：箭头隐藏，悬停/聚焦容器时淡入 */
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    color var(--oas-transition-base) var(--oas-ease-out),
    border-color var(--oas-transition-base) var(--oas-ease-out),
    background var(--oas-transition-base) var(--oas-ease-out);
}
:host(:hover) .arrow,
:host(:focus-within) .arrow {
  opacity: 1;
  pointer-events: auto;
}
:host([arrows='always']) .arrow {
  opacity: 1;
  pointer-events: auto;
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display 优先级压过 UA 的 [hidden] 规则） */
.arrow[hidden] {
  display: none;
}
.arrow:hover {
  opacity: 1;
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.arrow:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.arrow-prev { left: var(--oas-space-3); }
.arrow-next { right: var(--oas-space-3); }
`

export class OASCarousel extends OASElement {
  static override get observedAttributes(): string[] {
    return ['index', 'autoplay', 'interval', 'arrows']
  }

  private count = 0
  private timer: ReturnType<typeof setInterval> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="viewport" part="viewport">
        <div class="track" part="track"><slot></slot></div>
      </div>
      <button type="button" class="arrow arrow-prev" part="arrow-prev" aria-label="">‹</button>
      <button type="button" class="arrow arrow-next" part="arrow-next" aria-label="">›</button>
      <div class="dots" part="dots" role="tablist"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.dots')?.addEventListener('click', (e) => {
      const dot = (e.target as HTMLElement).closest('[part="dot"]')
      if (dot) this.goto(Number((dot as HTMLElement).getAttribute('data-index')) || 0)
    })
    this.shadow.querySelector('[part="arrow-prev"]')?.addEventListener('click', () => {
      const index = Number(this.getAttr('index', '0')) || 0
      this.goto(index - 1)
    })
    this.shadow.querySelector('[part="arrow-next"]')?.addEventListener('click', () => {
      const index = Number(this.getAttr('index', '0')) || 0
      this.goto(index + 1)
    })
    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（视口/轨道存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.viewport') || !this.shadow.querySelector('.track'))
      return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.count = this.children.length
    const track = this.shadow.querySelector('[part="track"]') as HTMLElement | null
    if (!track) return
    const index = Number(this.getAttr('index', '0')) || 0
    track.style.transform = `translateX(-${index * 100}%)`
    // 箭头显示形态：always（始终显示）/ hover（悬停显示，默认）/ never（不显示）
    const arrows = this.getAttr('arrows', 'hover')
    this.shadow.querySelector('[part="arrow-prev"]')?.toggleAttribute('hidden', arrows === 'never')
    this.shadow.querySelector('[part="arrow-next"]')?.toggleAttribute('hidden', arrows === 'never')
    // 箭头/指示器内置文案走 locale registry（setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLElement>('[part="arrow-prev"]')
      ?.setAttribute('aria-label', this.t('carousel.prev'))
    this.shadow
      .querySelector<HTMLElement>('[part="arrow-next"]')
      ?.setAttribute('aria-label', this.t('carousel.next'))
    const dots = this.shadow.querySelector('[part="dots"]')
    if (!dots) return
    dots.innerHTML = ''
    for (let i = 0; i < this.count; i++) {
      const dot = document.createElement('button')
      dot.className = 'dot'
      dot.setAttribute('part', 'dot')
      dot.setAttribute('role', 'tab')
      dot.setAttribute('aria-current', String(i === index))
      dot.setAttribute('aria-label', this.t('carousel.dot', { index: i + 1 }))
      dot.setAttribute('data-index', String(i))
      dots.appendChild(dot)
    }
    this.schedule()
  }

  private goto(index: number): void {
    if (this.count === 0) return
    const next = (index + this.count) % this.count
    const current = Number(this.getAttr('index', '0')) || 0
    if (next === current) return
    this.setAttribute('index', String(next))
    this.emit('change', { index: next })
    this.update()
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer)
    if (!this.hasAttr('autoplay')) return
    this.timer = setInterval(
      () => this.goto((Number(this.getAttr('index', '0')) || 0) + 1),
      Number(this.getAttr('interval', '3000')) || 3000,
    )
  }
}
