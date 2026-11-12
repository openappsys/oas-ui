import { OASElement } from '@oas-ui/core/oas-element'

/** 无命中时的抽帧间隔（ms）：定时抽帧节奏，原生 detect 本身已较耗时 */
export const DETECT_INTERVAL_MS = 150
/** 命中后的节流恢复间隔（ms）：暂停抽帧再自动继续，避免对准同一码连续触发 */
export const HIT_RESUME_DELAY_MS = 1200

/** oas-error 事件 detail.code */
export type ScanErrorCode = 'not-supported' | 'permission' | 'camera'

/** 浏览器原生 BarcodeDetector 的最小结构类型（lib.dom 无内置声明；零第三方依赖） */
interface DetectedBarcodeLike {
  rawValue: string
  format?: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcodeLike[]>
}
type BarcodeDetectorCtor = new () => BarcodeDetectorLike

/** 错误码 → 状态文案 key（显式字符串字面量：i18n 切片生成器按字面量提取消费键） */
const ERROR_STATUS_KEYS: Record<ScanErrorCode, string> = {
  'not-supported': 'scanner.unsupported',
  permission: 'scanner.permission',
  camera: 'scanner.camera',
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
[hidden] {
  display: none !important;
}
.viewport {
  position: relative;
  overflow: hidden;
  height: var(--oas-scanner-height, 220px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
}
.video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  text-align: center;
}
/* 流就绪后状态文案退为底部提示条，不遮画面中心 */
.viewport[data-streaming] .status {
  inset: auto 0 0 0;
  padding: var(--oas-space-1) var(--oas-space-3);
  background: color-mix(in srgb, var(--oas-color-bg-hover) 88%, transparent);
}
.status.error {
  color: var(--oas-color-danger-text);
}
.manual {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  margin-top: var(--oas-space-2);
}
.manual-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.manual-row {
  display: flex;
  gap: var(--oas-space-2);
}
.manual-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  line-height: 1.5;
}
.manual-input::placeholder {
  color: var(--oas-color-text-secondary);
}
.manual-submit {
  appearance: none;
  border: none;
  margin: 0;
  padding: var(--oas-space-1) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  line-height: 1.5;
  cursor: pointer;
}
.manual-submit:hover {
  background: var(--oas-color-primary-hover);
}
.manual-input:focus-visible,
.manual-submit:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .manual-input:focus-visible,
  .manual-submit:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

/**
 * oas-scanner —— 相机扫码组件。
 *
 * 属性（kebab-case，均在场布尔语义）：
 * - `active`：在场=请求相机并开始预览识别；移除=停止并关流。`start()`/`stop()` 是其命令式便捷，
 *   状态仍以属性为准（方法内部只是 set/removeAttribute）
 * - `manual`：在场=显示手动输入行（独立于 active）；无相机/无权限/出错时自动降级为该模式
 * - `aria-label`：视频区域（role="img"）可访问名，缺省走 i18n `scanner.videoLabel`
 *
 * 事件（bubbles + composed，幂等去重——同一 detail 指纹不重复派发）：
 * - `oas-scan`：detail `{ value, format? }`；识别命中或手动提交时派发。同一 `format+value`
 *   指纹在会话内只派发一次；`start()`（新会话）重置指纹。命中后暂停抽帧 1200ms 自动继续
 * - `oas-error`：detail `{ code }`：`not-supported`（无原生 BarcodeDetector / 不安全上下文 /
 *   无抽帧能力）/ `permission`（getUserMedia 权限拒绝）/ `camera`（设备或其他相机异常）；
 *   同一 code 每次激活会话只派发一次
 *
 * 行为：
 * - 解码用浏览器原生 `BarcodeDetector`（特性检测，零第三方解码库）；检测循环为定时抽帧
 *   （video 帧 → 离屏 canvas → detect），无命中继续、命中节流恢复
 * - 任何失败路径自动落手动输入模式（显式 `manual` 属性亦可独立开启）；停止/断连一律
 *   `track.stop()` 关流，零泄漏
 * - 手动行：`<form>` + label 关联 input，Enter/按钮均可提交；提交派发 `oas-scan`（无 format）
 *
 * ARIA：视频区 `role="img"` + i18n aria-label；状态区 `role="status"`（变化播报）。
 * 主题：全 token（暗色零专用代码）；forced-colors 焦点环兜底。
 * SSR：不进白名单——template() 输出确定性占位骨架，hydrate() 校验结构后接管交互。
 */
export class OASScanner extends OASElement {
  static override get observedAttributes(): string[] {
    return ['active', 'manual', 'aria-label']
  }

  /* ---------------- 缓存节点（render / hydrate 双路径填充） ---------------- */

  private viewportEl: HTMLElement | null = null
  private videoEl: HTMLVideoElement | null = null
  private statusEl: HTMLElement | null = null
  private formEl: HTMLFormElement | null = null
  private labelEl: HTMLLabelElement | null = null
  private inputEl: HTMLInputElement | null = null
  private submitEl: HTMLButtonElement | null = null

  /* ---------------- 会话状态 ---------------- */

  /** active 属性对应的会话是否进行中（begin/shutdown 复位） */
  private sessionStarted = false
  /** 相机流已建立（video 显示驱动） */
  private streaming = false
  /** 当前会话内最近一次错误（驱动状态区文案/配色） */
  private lastError: ScanErrorCode | null = null
  /** 本次会话是否因失败降级到手动模式（会话结束复位；manual 属性独立生效） */
  private fallbackManual = false
  /** oas-scan 幂等指纹：`format\u0000value`（会话内去重；手动提交共享同空间） */
  private scanKey: string | null = null
  /** oas-error 会话内去重 */
  private errorCodes = new Set<ScanErrorCode>()
  /**
   * 会话代数（epoch）：beginSession 递增。getUserMedia 是异步 promise，stop→start 竞态窗口里
   * 新会话已开启而旧会话 promise 才 resolve——仅判 sessionStarted 无法识别（已重置 true），
   * 旧流会被挂到 this.stream 且永不停止。resolve/catch 回调比对 epoch，不等即作废旧会话流。
   */
  private sessionEpoch = 0

  /* ---------------- 相机与检测循环 ---------------- */

  private stream: MediaStream | null = null
  private detector: BarcodeDetectorLike | null = null
  private canvas: HTMLCanvasElement | null = null
  private detectTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    super()
    // 断连统一清理（关流/停循环/复位会话，幂等）；断开重连由 onReconnect 重新注册
    this.onCleanup(() => this.shutdown())
  }

  /** 手动提交：类字段箭头函数保证引用稳定（addEventListener 重复绑定按引用去重） */
  private onSubmit = (e: Event): void => {
    e.preventDefault()
    const input = this.inputEl
    if (!input) return
    const value = input.value.trim()
    input.value = ''
    if (!value) return
    const key = `\u0000${value}`
    if (this.scanKey === key) return
    this.scanKey = key
    this.emit('scan', { value })
  }

  /* ---------------- 模板（纯字符串确定性：SSR 快照与 CSR 同构） ---------------- */

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="viewport" part="viewport">
          <video class="video" part="video" playsinline muted role="img" aria-label="" hidden></video>
          <div class="status" part="status" role="status"></div>
        </div>
        <form class="manual" part="manual" hidden>
          <label class="manual-label" for="oas-scanner-input"></label>
          <div class="manual-row">
            <input class="manual-input" id="oas-scanner-input" part="input" type="text" autocomplete="off" spellcheck="false" />
            <button class="manual-submit" part="submit" type="submit"></button>
          </div>
        </form>
      </div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bindEls()
    this.update()
  }

  /**
   * DSD 真水合：校验快照骨架（video/viewport/status/手动行）齐全后缓存节点并接管交互，
   * 跳过 shadow 重建；缺失回退 render() 全量重建（正确性优先）。
   */
  protected override hydrate(): boolean {
    return this.bindEls()
  }

  /** 断开重连：cleanupFns 已被基类清空，重新注册清理函数（幂等语义） */
  protected override onReconnect(): void {
    this.onCleanup(() => this.shutdown())
  }

  /** 缓存节点引用 + 绑定手动提交（render/hydrate 共用；失败返回 false 供回退重建） */
  private bindEls(): boolean {
    const root = this.shadow
    const viewport = root.querySelector<HTMLElement>('[part="viewport"]')
    const video = root.querySelector<HTMLVideoElement>('video[part="video"]')
    const status = root.querySelector<HTMLElement>('[part="status"]')
    const form = root.querySelector<HTMLFormElement>('form[part="manual"]')
    const label = root.querySelector<HTMLLabelElement>('.manual-label')
    const input = root.querySelector<HTMLInputElement>('.manual-input')
    const submit = root.querySelector<HTMLButtonElement>('.manual-submit')
    if (!viewport || !video || !status || !form || !label || !input || !submit) return false
    this.viewportEl = viewport
    this.videoEl = video
    this.statusEl = status
    this.formEl = form
    this.labelEl = label
    this.inputEl = input
    this.submitEl = submit
    form.addEventListener('submit', this.onSubmit)
    return true
  }

  protected override update(): void {
    const video = this.videoEl
    const viewport = this.viewportEl
    const status = this.statusEl
    const form = this.formEl
    const label = this.labelEl
    const submit = this.submitEl
    const input = this.inputEl
    if (!video || !viewport || !status || !form || !label || !submit || !input) return

    // 会话状态机：active 属性是唯一状态源（start/stop 只是属性便捷）
    const activeOn = this.hasAttr('active')
    if (activeOn && !this.sessionStarted) this.beginSession()
    else if (!activeOn && this.sessionStarted) this.shutdown()

    // video aria-label：组件属性优先，缺省走 i18n
    const custom = this.getAttribute('aria-label')
    video.setAttribute('aria-label', custom ?? this.t('scanner.videoLabel'))
    // muted 内容属性不反映 property（parser 特例），直接置 property 保静音
    video.muted = true

    // 手动行显隐：manual 属性显式开启，或本会话降级
    const showManual = this.hasAttr('manual') || this.fallbackManual
    form.toggleAttribute('hidden', !showManual)
    const labelText = this.t('scanner.manualLabel')
    if (label.textContent !== labelText) label.textContent = labelText
    const submitText = this.t('scanner.manualSubmit')
    if (submit.textContent !== submitText) submit.textContent = submitText

    // 状态区：未启动 / 扫描中 / 三类错误（文案同值不重写，避免 live region 无谓播报）
    const key = !this.sessionStarted
      ? 'scanner.idle'
      : this.lastError
        ? ERROR_STATUS_KEYS[this.lastError]
        : 'scanner.scanning'
    const text = this.t(key)
    if (status.textContent !== text) status.textContent = text
    status.classList.toggle('error', this.lastError != null)

    // video 显隐（流建立才显示；画面中心留给取景）
    const showVideo = this.sessionStarted && this.streaming
    video.toggleAttribute('hidden', !showVideo)
    viewport.toggleAttribute('data-streaming', showVideo)
  }

  /* ---------------- 会话生命周期 ---------------- */

  /** 开启 active 会话：重置去重指纹 → 能力检测 → 请求相机 */
  private beginSession(): void {
    this.sessionStarted = true
    this.sessionEpoch += 1
    const epoch = this.sessionEpoch
    this.scanKey = null
    this.errorCodes = new Set()
    this.lastError = null
    this.fallbackManual = false
    this.streaming = false

    const Ctor = this.detectorCtor()
    const media = (navigator as { mediaDevices?: { getUserMedia?: MediaDevices['getUserMedia'] } }).mediaDevices
    if (!Ctor || !media?.getUserMedia) {
      this.fallManual('not-supported')
      return
    }
    let detector: BarcodeDetectorLike
    try {
      detector = new Ctor()
    } catch {
      this.fallManual('not-supported')
      return
    }
    this.detector = detector

    // 后置相机偏好（ideal 不强制，桌面摄像头同样可满足）
    media
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        // 孤儿流/过期会话防护：resolve 前会话已结束（active 移除/断连），或 stop→start 竞态窗口里
        // 新会话已开启（epoch 不等）→ 旧流整体作废立即关流，不留孤儿流占用相机
        if (!this.sessionStarted || epoch !== this.sessionEpoch) {
          for (const track of stream.getTracks()) track.stop()
          return
        }
        this.stream = stream
        this.streaming = true
        if (this.videoEl) {
          try {
            this.videoEl.srcObject = stream
          } catch {
            // 个别环境对 srcObject 类型检查严格：显示与检测逻辑不依赖赋值成功
          }
          const p = this.videoEl.play()
          if (p && typeof p.then === 'function') {
            p.then(() => this.scheduleDetect(DETECT_INTERVAL_MS)).catch(() => this.fallManual('camera'))
          } else {
            this.scheduleDetect(DETECT_INTERVAL_MS)
          }
        }
        this.update()
      })
      .catch((err: unknown) => {
        if (!this.sessionStarted || epoch !== this.sessionEpoch) return
        const name = (err as { name?: string } | undefined)?.name ?? ''
        this.fallManual(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission' : 'camera')
      })
  }

  /**
   * 失败降级：落手动模式 + 停资源 + 派发 oas-error（同会话同 code 只发一次）。
   * 末尾统一重刷 UI（update）：所有调用路径（同步 beginSession / 异步 play 拒绝 /
   * detectFrame 抽帧失败）都能立即反映状态区文案与手动行，不再依赖各调用方补刷。
   */
  private fallManual(code: ScanErrorCode): void {
    if (!this.sessionStarted) return
    this.fallbackManual = true
    this.lastError = code
    this.streaming = false
    this.stopResources()
    if (!this.errorCodes.has(code)) {
      this.errorCodes.add(code)
      this.emit('error', { code })
    }
    this.update()
  }

  /**
   * 会话终止（active 移除 / 断连 cleanup）：关流、停检测循环、复位全部会话状态。
   * 幂等（重复调用无副作用），同时承担 onCleanup 清理职责。
   */
  private shutdown(): void {
    this.sessionStarted = false
    this.streaming = false
    this.lastError = null
    this.fallbackManual = false
    this.scanKey = null
    this.detector = null
    this.stopResources()
  }

  /** 停止流与检测定时器（不触动会话状态标记） */
  private stopResources(): void {
    if (this.detectTimer != null) {
      clearTimeout(this.detectTimer)
      this.detectTimer = null
    }
    if (this.stream) {
      // 停止即关流：track.stop() 后媒体设备释放，零泄漏
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
    if (this.videoEl) {
      try {
        this.videoEl.srcObject = null
      } catch {
        // 个别环境 srcObject 类型检查严格，忽略
      }
    }
  }

  /** start()/stop()：active 属性的命令式便捷（状态仍以属性为准） */
  start(): void {
    this.setAttribute('active', '')
  }

  stop(): void {
    this.removeAttribute('active')
  }

  /* ---------------- 检测循环 ---------------- */

  /** window.BarcodeDetector 特性检测（零第三方解码库） */
  private detectorCtor(): BarcodeDetectorCtor | null {
    if (typeof window === 'undefined') return null
    return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null
  }

  private scheduleDetect(delay: number): void {
    if (!this.sessionStarted) return
    this.detectTimer = setTimeout(() => {
      this.detectTimer = null
      void this.detectFrame()
    }, delay)
  }

  /** 抽帧检测：video 帧 → 离屏 canvas → 原生 detect；命中派发（幂等）+ 节流恢复，无命中继续 */
  private async detectFrame(): Promise<void> {
    const detector = this.detector
    const video = this.videoEl
    if (!this.sessionStarted || !detector || !video) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      // 帧未就绪（流刚建立/被暂停）：下一周期再取
      this.scheduleDetect(DETECT_INTERVAL_MS)
      return
    }
    if (!this.canvas) this.canvas = document.createElement('canvas')
    const canvas = this.canvas
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      this.fallManual('not-supported')
      return
    }
    try {
      ctx.drawImage(video, 0, 0, w, h)
    } catch {
      this.scheduleDetect(DETECT_INTERVAL_MS)
      return
    }
    let codes: DetectedBarcodeLike[]
    try {
      codes = await detector.detect(canvas)
    } catch {
      // 单帧失败（格式不支持/瞬时异常）不终止循环：下一周期重试
      if (!this.sessionStarted) return
      this.scheduleDetect(DETECT_INTERVAL_MS)
      return
    }
    if (!this.sessionStarted) return
    const best = codes[0]
    if (best) {
      const key = `${best.format ?? ''}\u0000${best.rawValue}`
      if (this.scanKey !== key) {
        this.scanKey = key
        this.emit('scan', best.format ? { value: best.rawValue, format: best.format } : { value: best.rawValue })
      }
      // 命中后节流：暂停抽帧再自动继续；同一码持续对准不重复触发（宿主可 stop/start 强制重扫）
      this.scheduleDetect(HIT_RESUME_DELAY_MS)
      return
    }
    this.scheduleDetect(DETECT_INTERVAL_MS)
  }
}
