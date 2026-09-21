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
/* 每一「份」内容各自成块（源组 1 份 + 克隆组 repeat 份）：份与份的结构必须完全一致，
    否则份宽 ≠ 位移距离 → wrap 时内容横跳 = 肉眼接缝顿挫。历史缺陷：克隆组内相邻两份的
    文本连成同一行，份间空白折叠成 1 个空格被保留；而源组末尾空白是行尾空白被移除 →
    克隆份宽 = 源组宽 + 1 空格宽（实测 4.7px），每轮 wrap 内容回跳一个空格宽。 */
.copy {
  flex: none;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
/* 克隆份的盒模型：份本体在 light DOM（页面样式表只能作用于 light DOM，见 syncClone 注释），
    这里用 ::slotted 给它与源份 .copy 完全等价的三条盒模型声明——份宽 === 位移距离的不变量
    与克隆份落点无关。标记属性只由组件写在克隆份上，源内容里的同名元素不会被误选。 */
::slotted([data-oas-marquee-copy]) {
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
:host([orientation='vertical']) .copy {
  flex-direction: column;
  white-space: normal;
}
:host([orientation='vertical']) ::slotted([data-oas-marquee-copy]) {
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

/** 克隆份包裹节点的标记属性（light DOM 直系子节点；源内容枚举排除 + ::slotted 盒模型选择器） */
const CLONE_ATTR = 'data-oas-marquee-copy'

/** 克隆份投递到的具名 slot（组件内部 plumbing；取带前缀的名字避免与宿主内容 slot 撞名） */
const CLONE_SLOT = 'oas-marquee-copy'

/**
 * 相位换算基准：捕获时刻的绝对动画时钟 + 生效位移距离 + **含方向**的位移比例。
 * 位移比例而非裸进度：方向也是相位的一部分（reverse 切换需按旧方向解读，见 captureShift）。
 */
interface ShiftBaseline {
  t: number
  shiftPx: number
  distRatio: number
}

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
 * 实现：shadow 内 track 横排「源组（1 份）+ aria-hidden 克隆组（repeat 份）」。源组那份是
 * 默认 slot 投递的宿主内容；**克隆份的包裹节点放宿主 light DOM**（具名 slot 投递）——页面样式表
 * 只作用于 light DOM，份若落在 shadow 内，依赖页面 class 的内容在克隆份上尺寸归零（右侧整片空白）；
 * 包裹节点的盒模型由 `::slotted([data-oas-marquee-copy])` 给（与源份 `.copy` 逐条等价）。
 * 份宽必须严格等于动画位移距离，否则 wrap 时内容横跳；keyframes 平移「一份内容宽」形成无缝循环；
 * 内容不足一屏时按 computeRepeat 份自动填充（auto-fill，容器口径 = 宿主 padding box：border 不
 * 参与判定）；ResizeObserver 监听容器与内容尺寸，重算位移/时长（时长 = 距离/速度）；
 * slotchange 重建克隆份、resize/speed/reverse/orientation 变更时，以「位移距离连续」为不变量
 * 记录/恢复相位（按新旧时长与新旧方向等位移反解负 animation-delay；orientation 变更换关键字帧
 * 必然重启动画，此时按「循环相位比例」补偿，见 restoreShift 的 restart 分支；
 * 不支持 getAnimations 的浏览器归零重启）；
 * `prefers-reduced-motion` 时关闭动画静态展示。
 */
export class OASMarquee extends OASElement {
  static override get observedAttributes(): string[] {
    return ['speed', 'pause-on-hover', 'fade-edges', 'orientation', 'reverse']
  }

  private observer: ResizeObserver | null = null
  private trackEl: HTMLElement | null = null
  private sourceGroupEl: HTMLElement | null = null
  /** 已测量的一组内容尺寸（px，沿当前滚动轴）；0 = 未测量 */
  private measuredShift = 0
  /** 当前 auto-fill 克隆份数（slotchange 重建时保持） */
  private lastRepeat = 1
  /** 当前生效动画的时长（s）/ 位移（px）/ delay（ms）：相位↔位移换算基准（writeTiming/restoreShift 维护） */
  private curDurS = 0
  private curShiftPx = 0
  private curDelayMs = 0
  /** 当前生效动画的方向（reverse 属性值）；capture 时据此换算「含方向」的位移比例 */
  private curReversed = false
  /** 当前生效的滚动轴（vertical?）；null = 首帧尚未定档（首帧不当作「切轴」处理） */
  private curVertical: boolean | null = null
  /**
   * 上一轮读到的动画对象（只读 currentTime，最小结构便于单测替身）。
   * currentTime 存宽松类型：真机 `Animation.currentTime` 是 CSSNumberish（多为 number，
   * 进度型时间线为 CSSNumericValue），用前一律做 number 判定。
   * 存在的理由见 captureShift：读它的 currentTime **不触发样式落定**，因此宿主属性刚变更
   * （orientation 切轴会换 animation-name）时仍能拿到「切换前」的真实时钟。
   */
  private cachedAnim: { currentTime: unknown } | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="viewport">
        <div class="track measuring" part="track">
          <div class="group" part="group"><div class="copy"><slot></slot></div></div>
          <div class="group clone" part="group" aria-hidden="true"><slot name="${CLONE_SLOT}"></slot></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件与尺寸监听（render 与水合路径共用） */
  private bind(): void {
    this.trackEl = this.shadow.querySelector<HTMLElement>('[part="track"]')
    this.sourceGroupEl = this.shadow.querySelector<HTMLElement>('.group:not(.clone)')
    // 只监听默认 slot：克隆份走具名 slot 投递，重建克隆份不改变默认 slot 的分配集合
    // → 不会自激触发下一轮重建（组件自建的 light DOM 子节点不构成「内容变化」）
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => {
      // 重建克隆份不改时序；相位保持由 preserveShift 统一负责（位移连续）
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
    const vertical = this.isVertical()
    if (this.curVertical !== null && this.curVertical !== vertical) {
      this.curVertical = vertical
      // 滚动轴运行时切换：横向/纵向用不同关键字帧（oas-marquee-x / oas-marquee-y），换轴即换
      // animation-name → 浏览器按「新动画」处理（时钟归零、animationstart 再触发一次），所以本路径
      // **无法**做到「动画不重启」；且新旧位移量纲不同（内容宽 vs 内容高）、轴向不同，
      // **绝对像素位移也不可守恒**。可守恒的最强不变量是**循环相位比例**（位移比例）：先按新轴
      // 同步重测（位移距离/份数/时长——不重测的话纵向动画会拿横向位移距离跑，且要等 RO 回调才修），
      // 再以「新动画 localTime = 0」为基准反解负 delay（restoreShift 的 restart 分支），
      // 使内容不跳回循环起点（最接近无损的方案）。
      this.preserveShift(() => this.applyMeasure(), true)
      return
    }
    this.curVertical = vertical
    // 速度变化即时反映到已测量的时长；时长变化按位移连续补偿（否则进度重映射视觉跳变）
    if (this.measuredShift > 0) this.preserveShift(() => this.writeTiming())
  }

  private isVertical(): boolean {
    return this.getAttr('orientation') === 'vertical'
  }

  /**
   * ResizeObserver 回调：测量容器/内容尺寸 → auto-fill 重建 + 时长写入（相位保持位移连续）。
   */
  private remeasure(): void {
    this.preserveShift(() => this.applyMeasure())
  }

  /**
   * 测量容器/内容尺寸并落盘（份数重建 + 位移/时长写入 + 解除 measuring 态），返回是否测到有效内容。
   * 相位保持由调用方负责：RO 路径走 remeasure（非重启补偿），轴切换路径走 update（重启补偿）。
   *
   * 容器口径取宿主 **padding box**（`clientWidth`/`clientHeight`）而非 border box：border 属于
   * 宿主边框、不参与「内容要铺满多大范围」的判定——用 border box 时 1px 边框就足以让
   * 「内容恰等于可见宽」被判成不足一屏，白多克隆一份（历史缺陷）。
   * 也不取内容盒：`overflow: hidden` 的裁切边是 padding 边，横向 padding 区域同样可见，
   * 只按内容盒判定会在循环过程中露出 padding 宽度的空档（正是 auto-fill 要消除的 seam）；
   * `clientWidth` 已含 padding、不含 border，与实际裁切区一致（无滚动条：宿主 overflow: hidden）。
   *
   * 轴切换路径要求「同步」测到新轴尺寸：属性已改 → 读 `getBoundingClientRect()`/`clientWidth`
   * 会强制样式与布局落定，故拿到的是新轴（纵向 = 内容高）的真实值，无需等下一帧 RO。
   */
  private applyMeasure(): boolean {
    if (!this.trackEl || !this.sourceGroupEl) return false
    const vertical = this.isVertical()
    const groupBox = this.sourceGroupEl.getBoundingClientRect()
    const container = vertical ? this.clientHeight : this.clientWidth
    const content = vertical ? groupBox.height : groupBox.width
    if (!(content > 0)) return false
    this.measuredShift = content
    this.lastRepeat = computeRepeat(container, content)
    // 克隆重建与时长重写在同一次相位保持内完成：时长突变若不补偿会整段重映射进度（视觉跳变）
    this.syncClone(this.lastRepeat)
    this.writeTiming()
    this.trackEl.classList.remove('measuring')
    return true
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
   * 捕获当前动画的换算基准（绝对时钟 + 生效位移 + **含方向**的位移比例）。
   *
   * `distRatio` 取「含方向」的位移比例（正向 = 进度，反向 = 1-进度）而不是裸进度：方向本身
   * 也是相位的一部分——reverse 运行时切换时，旧动画的位移比例必须按**旧方向**解读，否则恢复
   * 会按新方向重算位移，切换瞬间内容整体跳 (1-2×进度) 个位移距离（历史缺陷）。
   *
   * 读时钟的顺序是本方法的关键：**先读上一轮缓存下来的动画对象，再兜底 getAnimations()**。
   * orientation 切轴会换 animation-name（横向 oas-marquee-x ↔ 纵向 oas-marquee-y），而宿主属性
   * 在 attributeChangedCallback 触发时**已经**是新的了：此刻调用 getAnimations() 会强制样式落定，
   * 旧动画随之被取消、返回的新动画 currentTime = 0（真机实测捕获到 t=0）→ 相位丢失、切轴后内容
   * 跳回循环起点。读缓存对象（其 currentTime 是活值，且读取不触发样式落定）才能拿到切换前的时钟。
   *
   * getAnimations 不可用/无动画/timing 未生效时返回 null（退化归零重启）。
   */
  private captureShift(): ShiftBaseline | null {
    try {
      const track = this.trackEl as
        | (HTMLElement & { getAnimations?: () => Array<{ currentTime: number | null }> })
        | null
      if (!track || typeof track.getAnimations !== 'function') return null
      let t: unknown = this.cachedAnim?.currentTime
      if (typeof t !== 'number' || !Number.isFinite(t)) {
        // 缓存缺失/失效（首次、旧动画已被上一次重启取消、reduced-motion 关动画）→ 刷新缓存；
        // 上一次重启动画后缓存被清空，此处拿到的就是新动画对象
        this.cachedAnim = track.getAnimations()[0] ?? null
        t = this.cachedAnim?.currentTime
      }
      if (typeof t !== 'number' || !Number.isFinite(t)) return null
      if (!(this.curDurS > 0) || !(this.curShiftPx > 0)) return null
      const durMs = this.curDurS * 1000
      const progress = mod(t - this.curDelayMs, durMs) / durMs
      const distRatio = this.curReversed ? 1 - progress : progress
      return { t, shiftPx: this.curShiftPx, distRatio }
    } catch {
      return null
    }
  }

  /**
   * 相位恢复（数学无缝的核心）：不变量是「变更前后同一时刻的位移 D 相等」。
   * D = 含方向的位移比例 × 位移；变更后按新时长 + **新方向**反解负 animation-delay
   * （∈ [-duration, 0)）。旧实现直接 delay = -currentTime，只在 delay=0 且时长整除时碰巧
   * 无缝——duration 变化、reverse 切换或多次重建后必然跳变。
   *
   * `restart`（orientation 切换换 animation-name）：新动画是**另一个**动画对象，时钟从 0 起跑，
   * 基准不能再用捕获到的旧时钟 cap.t，只能取 0——即「恢复后的生效相位 = mod(-delay, 新时长)/新时长
   * 必须等于旧相位」。此时也不能按 shift 等比换算位移比例：新旧位移量纲不同（内容宽 vs 内容高），
   * 相除没有物理意义，直接沿用捕获到的比例（轴切换最接近无损的方案，绝对位移不可守恒）。
   */
  private restoreShift(cap: ShiftBaseline | null, restart = false): void {
    const reversed = this.hasAttr('reverse')
    // 登记本次变更后的生效方向（capture 用它解读「当前动画」的位移比例）
    this.curReversed = reversed
    if (!this.trackEl) return
    const durMs = this.curDurS * 1000
    if (!cap || !(durMs > 0) || !(this.curShiftPx > 0)) {
      this.trackEl.style.animationDelay = ''
      this.curDelayMs = 0
      return
    }
    const distRatio = restart ? cap.distRatio : (cap.distRatio * cap.shiftPx) / this.curShiftPx
    const newProgress = reversed ? 1 - distRatio : distRatio
    const refT = restart ? 0 : cap.t
    const delayMs = mod(refT - newProgress * durMs, durMs) - durMs
    this.trackEl.style.animationDelay = `${delayMs}ms`
    this.curDelayMs = delayMs
  }

  /**
   * 时序/DOM 变更包裹：捕获旧基准 → 执行变更（内部重写 timing）→ 按位移连续恢复。
   * `restart` = 变更会重启动画（换 animation-name，如 orientation 切换），恢复基准取新动画时钟 0。
   */
  private preserveShift<T>(mutate: () => T, restart = false): T {
    const cap = this.captureShift()
    const out = mutate()
    this.restoreShift(cap, restart)
    // 重启已发生：旧动画对象此刻已被取消（currentTime 变 null），缓存作废——下次捕获重新取
    // 新动画对象，否则会一直读到失效对象而退化成「无可用相位」
    if (restart) this.cachedAnim = null
    return out
  }

  /**
   * 克隆 light DOM 内容到克隆组：repeat 份，每份各自成一个**light DOM** 包裹节点。
   *
   * 为什么份本体必须在 light DOM：页面样式表（class 选择器）只能作用于 light DOM。份若落在
   * shadow 内，依赖页面 class 定尺寸的内容（如 `.logo { width: 60px }`、工具类）在克隆份上
   * 尺寸归零 → 循环里只有源份有内容、右侧整片空白（所见即缺陷）。份放 light DOM 后与源份共享
   * 同一套页面样式与同一套选择器上下文（祖先/主题/相邻选择器都成立），克隆份与源份严格同貌。
   * 包裹节点的盒模型由 shadow 内 `::slotted([data-oas-marquee-copy])` 给（与源份 `.copy` 逐条等价）。
   *
   * 代价（有意为之）：克隆份是宿主的 light DOM 子节点，故宿主 `childNodes`/`textContent` 会包含
   * 克隆份（视觉副本）；克隆份带内部标记属性 `data-oas-marquee-copy` 与 `aria-hidden`，宿主若需
   * 枚举「自己的内容」应排除带该标记的子节点（组件自身幂等重建即按此排除）。
   *
   * 每份必须独立成块（与源组那一份结构一致）：只有如此「份内行尾空白」的处理才与源组相同，
   * 份宽才严格等于源组宽（= 动画位移距离）。若把 repeat 份内容平铺在一起，相邻两份的文本会
   * 连成同一行，份间空白折叠成 1 个空格保留下来 → 克隆份比源组宽一个空格（实测 4.7px）→
   * 每轮 wrap 内容横跳一次，肉眼「接缝顿一下」。
   *
   * 组件只有默认 slot，直接读 this.childNodes（不依赖 slot 分配的异步时机，happy-dom/浏览器下
   * 行为一致），枚举时排除上一轮的克隆份（幂等）；相位保持由调用方的 preserveShift 统一负责。
   * 克隆份走具名 slot 投递：默认 slot 的分配集合不含它们 → 重建克隆份不会触发默认 slotchange
   * （无自激循环），页面/水合侧看到的投影结构与源份一一对应。
   */
  private syncClone(repeat = 1): void {
    // 上一轮克隆份先清掉（幂等：宿主内容变化与份数重算都走这里）
    for (const node of Array.from(this.children)) {
      if (node.hasAttribute(CLONE_ATTR)) node.remove()
    }
    for (let i = 0; i < repeat; i++) {
      // ownerDocument（非全局 document）建节点：SSR shim 下同样可用
      const copy = this.ownerDocument.createElement('div')
      copy.setAttribute(CLONE_ATTR, '')
      copy.setAttribute('slot', CLONE_SLOT)
      // 视觉副本：读屏不得重复播报。克隆组已有 aria-hidden，但份本体在 light DOM、
      // 不落在 shadow 的 aria-hidden 子树内，需自身标注（读屏与 aria-hidden 语义一致）
      copy.setAttribute('aria-hidden', 'true')
      // 视觉副本也不得进入键盘/辅助技术导航：aria-hidden 只挡读屏，克隆份里的按钮/链接
      // 仍是可聚焦的（Tab 会把用户带进副本——副本与源份状态可能不一致，聚焦/操作即是误操作）。
      // inert 只影响交互与焦点（不改变布局盒模型、不影响动画），故「份宽 === 位移距离」不变量
      // 与整条滚动链路不受影响（几何断言见 qa-regression/marquee.spec.ts）。
      copy.setAttribute('inert', '')
      for (const node of this.sourceNodes()) {
        copy.appendChild(node.cloneNode(true))
      }
      this.appendChild(copy)
    }
  }

  /** 宿主内容节点（light DOM 直系子节点，排除组件自建的克隆份包裹节点） */
  private sourceNodes(): Node[] {
    // nodeType 1 = ELEMENT_NODE：写字面量而非全局 Node，SSR shim 未必注入该全局
    return Array.from(this.childNodes).filter(
      (node) => !(node.nodeType === 1 && (node as Element).hasAttribute(CLONE_ATTR)),
    )
  }
}
