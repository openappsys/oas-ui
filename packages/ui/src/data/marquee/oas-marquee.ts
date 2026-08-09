import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  overflow: hidden;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.track {
  display: flex;
  width: max-content;
  min-width: 100%;
  /* 速度由 speed 属性经 --oas-marquee-speed 变量注入（animation-duration，秒） */
  --oas-marquee-speed: 20s;
  animation: oas-marquee var(--oas-marquee-speed) linear infinite;
  will-change: transform;
}
.group {
  flex: none;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
/* pause-on-hover：悬停/聚焦时暂停动画 */
:host([pause-on-hover]:hover) .track,
:host([pause-on-hover]:focus-within) .track {
  animation-play-state: paused;
}
/* 无缝循环：平移一半（两组内容等宽） */
@keyframes oas-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
/* prefers-reduced-motion：静态展示 */
@media (prefers-reduced-motion: reduce) {
  .track {
    animation: none;
  }
}
`

/** 默认动画时长（秒）；speed 非法/非正数时回退 */
const DEFAULT_SPEED = 20

/**
 * oas-marquee —— 循环水平滚动跑马灯（纯展示，无事件）。
 *
 * 属性（kebab-case）：
 * - `speed`：单次动画时长（秒），写入 CSS animation-duration；非法/非正数回退 20
 * - `pause-on-hover`：布尔，存在时悬停/聚焦暂停（animation-play-state: paused）
 *
 * 实现：shadow 内 track 以 flex 横排两组相同内容（slot + 克隆组），
 * keyframes 平移 -50% 形成无缝循环；克隆组 aria-hidden 不重复朗读；
 * `prefers-reduced-motion` 时关闭动画静态展示。
 */
export class OASMarquee extends OASElement {
  static override get observedAttributes(): string[] {
    return ['speed', 'pause-on-hover']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="track" part="track">
        <div class="group" part="group"><slot></slot></div>
        <div class="group clone" part="group" aria-hidden="true"></div>
      </div>
    `
    this.shadow
      .querySelector('slot')
      ?.addEventListener('slotchange', () => this.syncClone())
    this.syncClone()
    this.update()
  }

  protected override update(): void {
    const track = this.shadow.querySelector<HTMLElement>('[part="track"]')
    if (!track) return
    track.style.setProperty('--oas-marquee-speed', `${this.resolveSpeed()}s`)
  }

  /** speed 归一：非正数/非法回退默认 20 */
  private resolveSpeed(): number {
    const n = Number(this.getAttr('speed', ''))
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_SPEED
    return n
  }

  /**
   * 将 light DOM 内容克隆一份到 aria-hidden 克隆组，形成等宽双组无缝循环。
   * 组件只有默认 slot，直接读 this.childNodes（不依赖 slot 分配的异步时机，
   * happy-dom/浏览器下行为一致）；slotchange 时再同步一次保持最新。
   */
  private syncClone(): void {
    const clone = this.shadow.querySelector<HTMLElement>('.clone')
    if (!clone) return
    clone.textContent = ''
    for (const node of this.childNodes) {
      clone.appendChild(node.cloneNode(true))
    }
  }
}
