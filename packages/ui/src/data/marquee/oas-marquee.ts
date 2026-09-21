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
/* 内层视口：尺寸跟随宿主内容区。fade-edges 的 mask 挂它而非 :host——
   mask 挂宿主会连带把宿主自身 border/圆角一起淡出（带框容器两端约一个
   渐隐宽度内呈「开口」）；也不直接挂 .track（track 是 max-content 宽，
   内容超宽时 100% 参考系超出可视区，右端渐隐会跑出边缘） */
.viewport {
  width: 100%;
  height: 100%;
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
/* fade-edges：边缘渐隐（mask-image 方案，渐隐尺寸走变量；默认关）。
   挂内层 .viewport（见上方说明）：渐隐贴可视边缘，宿主 border/圆角完整 */
:host([fade-edges]) .viewport {
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 var(--oas-marquee-fade-size, 24px),
    #000 calc(100% - var(--oas-marquee-fade-size, 24px)),
    transparent
  );
}
:host([fade-edges][orientation='vertical']) .viewport {
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

/** 欧几里得 mod（结果非负）：相位/延迟换算统一入口 */
function mod(a: number, n: number): number {
  return ((a % n) + n) % n
}

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
 * 重算位移/时长（时长 = 距离/速度）；slotchange 重建克隆组、resize/speed 变更
 * 重写时长时，以「位移距离连续」为不变量记录/恢复相位（按新旧时长等位移反解
 * 负 animation-delay；不支持 getAnimations 的浏览器归零重启）；
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
  /** 当前生效动画的时长（s）/ 位移（px）/ delay（ms）：相位↔位移换算基准（writeTiming/restoreShift 维护） */
  private curDurS = 0
  private curShiftPx = 0
  private curDelayMs = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="viewport">
        <div class="track measuring" part="track">
          <div class="group" part="group"><slot></slot></div>
          <div class="group clone" part="group" aria-hidden="true"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件与尺寸监听（render 与水合路径共用） */
  private bind(): void {
    this.trackEl = this.shadow.querySelector<HTMLElement>('[part="track"]')
    this.sourceGroupEl = this.shadow.querySelector<HTMLElement>('.group:not(.clone)')
    this.cloneEl = this.shadow.querySelector<HTMLElement>('.clone')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => {
      // 重建克隆组不改时序；相位保持由 preserveShift 统一负责（位移连续）
      this.preserveShift(() => this.syncClone(this.lastRepeat))
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
    this.syncClone(this.lastRepeat)
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（track 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.track')) return false
    this.bind()
    // 克隆组按当前 light DOM 重同步（幂等：先清空再按 childNodes 克隆，保证与快照一致）
    this.syncClone(this.lastRepeat)
    return true
  }

  protected override update(): void {
    if (!this.trackEl) return
    this.trackEl.style.setProperty('--oas-marquee-speed', String(resolveSpeedPx(this.getAttr('speed', ''))))
    // 速度变化即时反映到已测量的时长；时长变化按位移连续补偿（否则进度重映射视觉跳变）
    if (this.measuredShift > 0) this.preserveShift(() => this.writeTiming())
  }

  private isVertical(): boolean {
    return this.getAttr('orientation') === 'vertical'
  }

  /** ResizeObserver 回调：测量容器/内容尺寸 → auto-fill 重建 + 时长写入（相位保持位移连续） */
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
    // 克隆重建与时长重写在同一次相位保持内完成：时长突变若不补偿会整段重映射进度（视觉跳变）
    this.preserveShift(() => {
      this.syncClone(this.lastRepeat)
      this.writeTiming()
    })
    this.trackEl.classList.remove('measuring')
  }

  /** 把测量结果写入轨道：平移距离（px）与动画时长（距离/速度），并登记换算基准 */
  private writeTiming(): void {
    if (!this.trackEl || !(this.measuredShift > 0)) return
    const speed = resolveSpeedPx(this.getAttr('speed', ''))
    const durS = computeDuration(this.measuredShift, speed)
    this.trackEl.style.setProperty('--oas-marquee-shift', `${this.measuredShift}px`)
    this.trackEl.style.setProperty('--oas-marquee-duration', `${durS}s`)
    this.curDurS = durS
    this.curShiftPx = this.measuredShift
  }

  /**
   * 捕获当前动画的换算基准（绝对 currentTime + 生效时长/位移/delay）。
   * getAnimations 不可用/无动画/timing 未生效时返回 null（退化归零重启）。
   */
  private captureShift(): { t: number; durS: number; delayMs: number; shiftPx: number } | null {
    try {
      const track = this.trackEl as
        | (HTMLElement & { getAnimations?: () => Array<{ currentTime: number | null }> })
        | null
      if (!track || typeof track.getAnimations !== 'function') return null
      const t = track.getAnimations()[0]?.currentTime
      if (typeof t !== 'number' || !Number.isFinite(t)) return null
      if (!(this.curDurS > 0) || !(this.curShiftPx > 0)) return null
      return { t, durS: this.curDurS, delayMs: this.curDelayMs, shiftPx: this.curShiftPx }
    } catch {
      return null
    }
  }

  /**
   * 相位恢复（数学无缝的核心）：不变量是「变更前后同一时刻的位移 D 相等」。
   * D = 进度 × 位移（linear 动画，reverse 时取镜像 1-进度）；变更后按新时长等位移
   * 反解负 animation-delay（∈ [-duration, 0)）。旧实现直接 delay = -currentTime，
   * 只在 delay=0 且时长整除时碰巧无缝——duration 变化或多次重建后必然跳变。
   */
  private restoreShift(cap: { t: number; durS: number; delayMs: number; shiftPx: number } | null): void {
    if (!this.trackEl) return
    const durMs = this.curDurS * 1000
    if (!cap || !(durMs > 0) || !(this.curShiftPx > 0)) {
      this.trackEl.style.animationDelay = ''
      this.curDelayMs = 0
      return
    }
    const oldDurMs = cap.durS * 1000
    const reversed = this.hasAttr('reverse')
    const oldProgress = mod(cap.t - cap.delayMs, oldDurMs) / oldDurMs
    const distPx = (reversed ? 1 - oldProgress : oldProgress) * cap.shiftPx
    const newProgress = reversed ? 1 - distPx / this.curShiftPx : distPx / this.curShiftPx
    const delayMs = mod(cap.t - newProgress * durMs, durMs) - durMs
    this.trackEl.style.animationDelay = `${delayMs}ms`
    this.curDelayMs = delayMs
  }

  /** 时序/DOM 变更包裹：捕获旧基准 → 执行变更（内部重写 timing）→ 按位移连续恢复 */
  private preserveShift<T>(mutate: () => T): T {
    const cap = this.captureShift()
    const out = mutate()
    this.restoreShift(cap)
    return out
  }

  /**
   * 克隆 light DOM 内容到 aria-hidden 克隆组：repeat 份（auto-fill）。
   * 组件只有默认 slot，直接读 this.childNodes（不依赖 slot 分配的异步时机，
   * happy-dom/浏览器下行为一致）；相位保持由调用方的 preserveShift 统一负责。
   */
  private syncClone(repeat = 1): void {
    if (!this.cloneEl) return
    this.cloneEl.textContent = ''
    for (let i = 0; i < repeat; i++) {
      for (const node of this.childNodes) {
        this.cloneEl.appendChild(node.cloneNode(true))
      }
    }
  }
}
