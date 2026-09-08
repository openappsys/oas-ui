import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  overflow: hidden;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.track {
  display: flex;
  width: max-content;
  min-width: 100%;
  /* speed（px/s）经 --oas-marquee-speed 注入；--oas-marquee-duration/shift 由测量写入 */
  --oas-marquee-speed: 48;
  --oas-marquee-duration: 20s;
  --oas-marquee-shift: 50%;
  animation: oas-marquee-x var(--oas-marquee-duration) linear infinite;
  will-change: transform;
}
/* 测量完成前暂停在初始帧：时长未定，避免错误速度滚动/闪动（SSR 快照同为初始帧） */
.track.measuring {
  animation-play-state: paused;
}
.group {
  flex: none;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
/* 垂直滚动：轨道纵排、按高度平移（容器需固定高，见文档） */
:host([orientation='vertical']) .track {
  flex-direction: column;
  width: 100%;
  min-width: 0;
  height: max-content;
  min-height: 100%;
  animation-name: oas-marquee-y;
}
:host([orientation='vertical']) .group {
  flex-direction: column;
  white-space: normal;
}
/* reverse：反向滚动 */
:host([reverse]) .track {
  animation-direction: reverse;
}
/* pause-on-hover：悬停/聚焦时暂停动画 */
:host([pause-on-hover]:hover) .track,
:host([pause-on-hover]:focus-within) .track {
  animation-play-state: paused;
}
/* fade-edges：边缘渐隐（mask-image 方案，渐隐尺寸走变量；默认关） */
:host([fade-edges]) {
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 var(--oas-marquee-fade-size, 24px),
    #000 calc(100% - var(--oas-marquee-fade-size, 24px)),
    transparent
  );
}
:host([fade-edges][orientation='vertical']) {
  mask-image: linear-gradient(
    to bottom,
    transparent,
    #000 var(--oas-marquee-fade-size, 24px),
    #000 calc(100% - var(--oas-marquee-fade-size, 24px)),
    transparent
  );
}
/* 无缝循环：平移恰好一组内容宽（测量写入 --oas-marquee-shift） */
@keyframes oas-marquee-x {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-1 * var(--oas-marquee-shift)));
  }
}
@keyframes oas-marquee-y {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(-1 * var(--oas-marquee-shift)));
  }
}
/* prefers-reduced-motion：静态展示 */
@media (prefers-reduced-motion: reduce) {
  .track {
    animation: none;
  }
}
`

/** 默认滚动速度（像素/秒）；speed 非法/非正数时回退 */
export const DEFAULT_SPEED_PX = 48

/**
 * auto-fill 克隆份数上限：窄容器 + 极短内容时 ceil(容器/内容) 可达数十，
 * 克隆组 DOM 随份数线性膨胀（图片墙场景尤甚），封顶防失控；超出后宁可留 seam。
 */
export const MAX_AUTO_FILL_REPEAT = 50

/** speed 归一：非正数/非法回退默认 48px/s */
export function resolveSpeedPx(raw: string | null): number {
  const n = Number(raw ?? '')
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SPEED_PX
  return n
}

/**
 * auto-fill 份数推导：内容不足一屏（container > content）时克隆 repeat 份填满，
 * 使平移一个内容宽的过程中视口始终有内容（无缝不断 seam）。
 * 内容/容器尺寸未就绪（<= 0）时回退 1 份（原双组形态）。
 */
export function computeRepeat(container: number, content: number): number {
  if (!(content > 0) || !(container > 0) || content >= container) return 1
  return Math.min(Math.ceil(container / content), MAX_AUTO_FILL_REPEAT)
}

/** 时长推导：时长(秒) = 滚动距离(px) / 速度(px/s)；速度非法回退默认速度 */
export function computeDuration(contentPx: number, speedPxS: number): number {
  if (!(contentPx > 0)) return 0
  const speed = Number.isFinite(speedPxS) && speedPxS > 0 ? speedPxS : DEFAULT_SPEED_PX
  return contentPx / speed
}

/**
 * oas-marquee —— 循环无缝滚动跑马灯（纯展示，无事件）。
 *
 * 属性（kebab-case）：
 * - `speed`：滚动速度（**像素/秒**，真实速度恒定；由 ResizeObserver 测量内容宽推导时长），
 *   非法/非正数回退 48
 * - `pause-on-hover`：布尔，存在时悬停/聚焦暂停
 * - `fade-edges`：布尔（默认关），边缘 mask-image 渐隐；尺寸走 `--oas-marquee-fade-size`
 * - `orientation`：`horizontal`（默认）| `vertical`（垂直滚动，容器需固定高）
 * - `reverse`：布尔，反向滚动
 *
 * 实现：shadow 内 track 横排两组相同内容（slot 原组 + aria-hidden 克隆组），
 * keyframes 平移「一组内容宽」形成无缝循环；内容不足一屏时克隆组按
 * computeRepeat 份自动填充（auto-fill）；ResizeObserver 监听容器与内容尺寸，
 * 重算位移/时长（时长 = 距离/速度）；slotchange 重建克隆组时用 getAnimations
 * 记录相位、以负 animation-delay 恢复（不支持的浏览器归零重启）；
 * `prefers-reduced-motion` 时关闭动画静态展示。
 */
export class OASMarquee extends OASElement {
  static override get observedAttributes(): string[] {
    return ['speed', 'pause-on-hover', 'fade-edges', 'orientation', 'reverse']
  }

  private observer: ResizeObserver | null = null
  private trackEl: HTMLElement | null = null
  private sourceGroupEl: HTMLElement | null = null
  private cloneEl: HTMLElement | null = null
  /** 已测量的一组内容尺寸（px，沿当前滚动轴）；0 = 未测量 */
  private measuredShift = 0
  /** 当前 auto-fill 克隆份数（slotchange 重建时保持） */
  private lastRepeat = 1

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="track measuring" part="track">
        <div class="group" part="group"><slot></slot></div>
        <div class="group clone" part="group" aria-hidden="true"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件与尺寸监听（render 与水合路径共用） */
  private bind(): void {
    this.trackEl = this.shadow.querySelector<HTMLElement>('[part="track"]')
    this.sourceGroupEl = this.shadow.querySelector<HTMLElement>('.group:not(.clone)')
    this.cloneEl = this.shadow.querySelector<HTMLElement>('.clone')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => {
      this.syncClone(true, this.lastRepeat)
    })

    if (typeof ResizeObserver !== 'undefined') {
      // 监听宿主（容器）与原组（内容，含字体/图片加载后宽度变化）
      this.observer = new ResizeObserver(() => this.remeasure())
      this.observer.observe(this)
      if (this.sourceGroupEl) this.observer.observe(this.sourceGroupEl)
      this.onCleanup(() => this.observer?.disconnect())
    } else {
      // 无 ResizeObserver（极旧环境）：退化为 CSS 默认时长 + 50% 位移的旧形态
      this.trackEl?.classList.remove('measuring')
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.syncClone(false, this.lastRepeat)
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（track 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.track')) return false
    this.bind()
    // 克隆组按当前 light DOM 重同步（幂等：先清空再按 childNodes 克隆，保证与快照一致）
    this.syncClone(false, this.lastRepeat)
    return true
  }

  protected override update(): void {
    if (!this.trackEl) return
    this.trackEl.style.setProperty('--oas-marquee-speed', String(resolveSpeedPx(this.getAttr('speed', ''))))
    // 速度变化即时反映到已测量的时长
    if (this.measuredShift > 0) this.writeTiming()
  }

  private isVertical(): boolean {
    return this.getAttr('orientation') === 'vertical'
  }

  /** ResizeObserver 回调：测量容器/内容尺寸 → auto-fill 重建 + 时长写入 */
  private remeasure(): void {
    if (!this.trackEl || !this.sourceGroupEl) return
    const vertical = this.isVertical()
    const box = this.getBoundingClientRect()
    const groupBox = this.sourceGroupEl.getBoundingClientRect()
    const container = vertical ? box.height : box.width
    const content = vertical ? groupBox.height : groupBox.width
    if (!(content > 0)) return
    this.measuredShift = content
    this.lastRepeat = computeRepeat(container, content)
    this.syncClone(true, this.lastRepeat)
    this.writeTiming()
    this.trackEl.classList.remove('measuring')
  }

  /** 把测量结果写入轨道：平移距离（px）与动画时长（距离/速度） */
  private writeTiming(): void {
    if (!this.trackEl || !(this.measuredShift > 0)) return
    const speed = resolveSpeedPx(this.getAttr('speed', ''))
    this.trackEl.style.setProperty('--oas-marquee-shift', `${this.measuredShift}px`)
    this.trackEl.style.setProperty('--oas-marquee-duration', `${computeDuration(this.measuredShift, speed)}s`)
  }

  /**
   * 记录当前动画相位（ms）；getAnimations 不可用/无动画/异常时返回 null（退化归零）。
   */
  private capturePhase(): number | null {
    try {
      const track = this.trackEl as
        | (HTMLElement & { getAnimations?: () => Array<{ currentTime: number | null }> })
        | null
      if (!track || typeof track.getAnimations !== 'function') return null
      const anim = track.getAnimations()[0]
      const t = anim?.currentTime
      return typeof t === 'number' && Number.isFinite(t) ? t : null
    } catch {
      return null
    }
  }

  /** 相位恢复：负 animation-delay 续跑到同一相位；null 则清除延迟归零重启 */
  private restorePhase(phase: number | null): void {
    if (!this.trackEl) return
    this.trackEl.style.animationDelay = phase == null ? '' : `${-phase}ms`
  }

  /**
   * 克隆 light DOM 内容到 aria-hidden 克隆组：repeat 份（auto-fill）。
   * 组件只有默认 slot，直接读 this.childNodes（不依赖 slot 分配的异步时机，
   * happy-dom/浏览器下行为一致）；preservePhase 时先记相位、重建后恢复。
   */
  private syncClone(preservePhase: boolean, repeat = 1): void {
    if (!this.cloneEl) return
    const phase = preservePhase ? this.capturePhase() : null
    this.cloneEl.textContent = ''
    for (let i = 0; i < repeat; i++) {
      for (const node of this.childNodes) {
        this.cloneEl.appendChild(node.cloneNode(true))
      }
    }
    this.restorePhase(phase)
  }
}
