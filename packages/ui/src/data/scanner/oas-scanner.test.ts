import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale, registerLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { SSR_SNAPSHOT_VERSION } from '@oas-ui/core/oas-element'
import { OASScanner, DETECT_INTERVAL_MS, HIT_RESUME_DELAY_MS } from './index.js'

/* ---------------- 测试用 fake ---------------- */

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
}

/** 构造可注入 srcObject 的伪 MediaStream（happy-dom 无 MediaStream 构造器） */
function fakeStream(tracks: FakeTrack[]): MediaStream {
  return { getTracks: () => tracks } as unknown as MediaStream
}

/**
 * 伪 BarcodeDetector：detect 逐帧消费 queue（Error 表示该帧 reject，
 * 空 queue 返回 []——画面无码）。
 */
class FakeDetector {
  static queue: Array<Array<{ rawValue: string; format: string }> | Error> = []
  async detect(): Promise<Array<{ rawValue: string; format: string }>> {
    const next = FakeDetector.queue.shift()
    if (next instanceof Error) throw next
    return next ?? []
  }
}

/** 注入 navigator.mediaDevices（happy-dom 默认 undefined） */
function installMediaDevices(getUserMedia: (constraint: unknown) => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  })
}

/** 注入 window.BarcodeDetector */
function installDetector(): void {
  ;(window as unknown as Record<string, unknown>).BarcodeDetector = FakeDetector
}

function removeDetector(): void {
  const w = window as unknown as Record<string, unknown>
  try {
    delete w.BarcodeDetector
  } catch {
    w.BarcodeDetector = undefined
  }
}

/** flush 微任务链：getUserMedia.then → play().then → 调度 */
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

/* ---------------- 挂载 helpers ---------------- */

function mount(attrs: Record<string, string> = {}): OASScanner {
  const el = new OASScanner()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

/** 事件采集（必须在触发会话的属性变更之前挂） */
function track(el: OASScanner, name: string): CustomEvent[] {
  const list: CustomEvent[] = []
  el.addEventListener(name, (e) => list.push(e as CustomEvent))
  return list
}

function videoOf(el: OASScanner): HTMLVideoElement {
  return el.shadowRoot!.querySelector<HTMLVideoElement>('video[part="video"]')!
}
function statusOf(el: OASScanner): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="status"]')!
}
function formOf(el: OASScanner): HTMLFormElement {
  return el.shadowRoot!.querySelector<HTMLFormElement>('form[part="manual"]')!
}
function inputOf(el: OASScanner): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('.manual-input')!
}

/** 手动提交（原生 form submit 语义：dispatchEvent 同步走 handler） */
function submitManual(el: OASScanner, value: string): void {
  const input = inputOf(el)
  input.value = value
  formOf(el).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('OASScanner', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLocale('zh-CN')
    registerLocale(en)
    removeDetector()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    setLocale('zh-CN')
    removeDetector()
    const nav = navigator as unknown as Record<string, unknown>
    try {
      delete nav.mediaDevices
    } catch {
      /* 恢复默认 undefined */
    }
  })

  describe('渲染骨架与确定性', () => {
    it('结构完整：video(part=video) / status(part=status) / 手动行 form(part=manual)（label+input+submit）', () => {
      const el = mount()
      const root = el.shadowRoot!
      expect(root.querySelector('video[part="video"]')).not.toBeNull()
      expect(root.querySelector('[part="status"]')).not.toBeNull()
      expect(root.querySelector('form[part="manual"]')).not.toBeNull()
      expect(root.querySelector('.manual-label')).not.toBeNull()
      expect(root.querySelector('.manual-input')).not.toBeNull()
      expect(root.querySelector('.manual-submit')).not.toBeNull()
    })

    it('template 纯字符串确定性：两实例渲染结果逐字节一致（SSR 快照前提）', () => {
      const a = mount({})
      const b = mount({})
      expect(a.shadowRoot!.innerHTML).toBe(b.shadowRoot!.innerHTML)
    })

    it('初始空闲：video 隐藏、手动行隐藏（无 manual 属性）、状态为未启动', () => {
      const el = mount({})
      expect(videoOf(el).hasAttribute('hidden')).toBe(true)
      expect(formOf(el).hasAttribute('hidden')).toBe(true)
      expect(statusOf(el).textContent).toContain('未启动')
    })
  })

  describe('a11y', () => {
    it('video role="img" + i18n aria-label；status role="status"；label[for] 关联 input；submit 按钮键盘可达', () => {
      const el = mount({ manual: '' })
      const root = el.shadowRoot!
      const video = videoOf(el)
      expect(video.getAttribute('role')).toBe('img')
      expect(video.getAttribute('aria-label')).toBe('相机扫描画面')
      expect(video.hasAttribute('playsinline')).toBe(true)
      expect(video.hasAttribute('muted')).toBe(true)
      expect(statusOf(el).getAttribute('role')).toBe('status')
      const label = root.querySelector<HTMLLabelElement>('.manual-label')!
      const input = inputOf(el)
      expect(label.getAttribute('for')).toBe(input.id)
      expect(input.id).not.toBe('')
      const submit = root.querySelector<HTMLButtonElement>('.manual-submit')!
      expect(submit.getAttribute('type')).toBe('submit')
    })

    it('locale 切换重刷 i18n 文案（zh → en）', async () => {
      const el = mount({ manual: '' })
      setLocale('en')
      await Promise.resolve()
      expect(videoOf(el).getAttribute('aria-label')).toBe('Camera scan preview')
      expect(statusOf(el).textContent).toContain('not started')
      expect(el.shadowRoot!.querySelector('.manual-submit')!.textContent).toBe('Confirm')
    })
  })

  describe('降级链（happy-dom 无 BarcodeDetector → not-supported）', () => {
    it('active 置位 → oas-error {code:"not-supported"} 派发一次 + 自动落手动模式 + video 不显示', () => {
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      el.setAttribute('active', '')

      expect(errors.length).toBe(1)
      expect(errors[0]!.detail).toEqual({ code: 'not-supported' })
      expect(errors[0]!.bubbles).toBe(true)
      expect(errors[0]!.composed).toBe(true)
      expect(formOf(el).hasAttribute('hidden')).toBe(false)
      expect(statusOf(el).textContent).toContain('不支持')
      expect(statusOf(el).className).toContain('error')
      expect(videoOf(el).hasAttribute('hidden')).toBe(true)
    })

    it('会话内属性抖动（aria-label 变化）不重复派发；active 移除再置位 = 新会话，再派发', () => {
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      el.setAttribute('active', '')
      expect(errors.length).toBe(1)

      el.setAttribute('aria-label', '自定义名')
      expect(errors.length).toBe(1)

      el.removeAttribute('active')
      el.setAttribute('active', '')
      expect(errors.length).toBe(2)
      expect(errors[1]!.detail).toEqual({ code: 'not-supported' })
    })
  })

  describe('manual 手动输入行', () => {
    it('manual 属性显式开启：无 active 时也显示手动行，状态保持未启动', () => {
      const el = mount({ manual: '' })
      expect(formOf(el).hasAttribute('hidden')).toBe(false)
      expect(statusOf(el).textContent).toContain('未启动')
    })

    it('手动提交派发 oas-scan（value trim，format 省略）并清空输入', () => {
      const el = mount({ manual: '' })
      const scans = track(el, 'oas-scan')
      submitManual(el, '  OAS-123  ')
      expect(scans.length).toBe(1)
      expect(scans[0]!.detail).toEqual({ value: 'OAS-123' })
      expect('format' in (scans[0]!.detail as Record<string, unknown>)).toBe(false)
      expect(scans[0]!.bubbles).toBe(true)
      expect(scans[0]!.composed).toBe(true)
      expect(inputOf(el).value).toBe('')
    })

    it('空值（含纯空白）提交不派发', () => {
      const el = mount({ manual: '' })
      const scans = track(el, 'oas-scan')
      submitManual(el, '   ')
      expect(scans.length).toBe(0)
    })

    it('事件幂等：同一 value 重复提交不重发；start() 开新会话后重置指纹可再发', () => {
      const el = mount({ manual: '' })
      const scans = track(el, 'oas-scan')
      submitManual(el, 'DUP-1')
      expect(scans.length).toBe(1)
      submitManual(el, 'DUP-1')
      expect(scans.length).toBe(1)
      el.start()
      submitManual(el, 'DUP-1')
      expect(scans.length).toBe(2)
    })
  })

  describe('start()/stop() 与属性同步', () => {
    it('start() 置 active 属性；stop() 移除 active 属性（状态以属性为准）', () => {
      const el = mount({})
      el.start()
      expect(el.hasAttribute('active')).toBe(true)
      el.stop()
      expect(el.hasAttribute('active')).toBe(false)
    })
  })

  describe('相机链路（mock BarcodeDetector + getUserMedia）', () => {
    /** happy-dom 无 2d canvas 实现（getContext('2d') 返回 null）：注入最小 context stub 让抽帧链路可走 */
    let realGetContext: typeof HTMLCanvasElement.prototype.getContext
    beforeEach(() => {
      realGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (): CanvasRenderingContext2D | null {
        return { drawImage() {} } as unknown as CanvasRenderingContext2D
      } as unknown as typeof HTMLCanvasElement.prototype.getContext
    })
    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = realGetContext
    })

    it('active → 请求相机 → 流建立 video 显示 + 状态扫描中；命中派发 oas-scan（value+format）', async () => {
      vi.useFakeTimers()
      try {
        installDetector()
        const trackStop = vi.fn()
        installMediaDevices(async () => fakeStream([{ stop: trackStop }]))
        const el = new OASScanner()
        const scans = track(el, 'oas-scan')
        const errors = track(el, 'oas-error')
        document.body.appendChild(el)

        // 拦截 srcObject 赋值（happy-dom 对非 MediaStream 实例抛类型错误，测试改走 holder）
        const holder: { srcObject: unknown } = { srcObject: null }
        const video = videoOf(el)
        Object.defineProperty(video, 'srcObject', {
          get: () => holder.srcObject,
          set: (v: unknown) => {
            holder.srcObject = v
          },
          configurable: true,
        })
        ;(video as unknown as Record<string, unknown>).videoWidth = 640
        ;(video as unknown as Record<string, unknown>).videoHeight = 480

        el.setAttribute('active', '')
        await flush()

        expect(video.hasAttribute('hidden')).toBe(false)
        expect(holder.srcObject).not.toBeNull()
        expect(statusOf(el).textContent).toContain('扫描')
        expect(statusOf(el).className).not.toContain('error')
        expect(errors.length).toBe(0)

        FakeDetector.queue = [[{ rawValue: 'HELLO', format: 'qr_code' }]]
        await vi.advanceTimersByTimeAsync(DETECT_INTERVAL_MS)
        expect(scans.length).toBe(1)
        expect(scans[0]!.detail).toEqual({ value: 'HELLO', format: 'qr_code' })
      } finally {
        vi.useRealTimers()
      }
    })

    it('事件幂等：同一 value+format 指纹不重复派发；变化值再派发', async () => {
      vi.useFakeTimers()
      try {
        installDetector()
        installMediaDevices(async () => fakeStream([{ stop: vi.fn() }]))
        const el = new OASScanner()
        const scans = track(el, 'oas-scan')
        document.body.appendChild(el)
        const video = videoOf(el)
        ;(video as unknown as Record<string, unknown>).videoWidth = 640
        ;(video as unknown as Record<string, unknown>).videoHeight = 480
        el.setAttribute('active', '')
        await flush()

        // 三帧：同值、同值（不重发）、变值（重发）
        FakeDetector.queue = [
          [{ rawValue: 'A-1', format: 'qr_code' }],
          [{ rawValue: 'A-1', format: 'qr_code' }],
          [{ rawValue: 'B-2', format: 'code_128' }],
        ]
        await vi.advanceTimersByTimeAsync(DETECT_INTERVAL_MS + 2 * HIT_RESUME_DELAY_MS + DETECT_INTERVAL_MS)
        expect(scans.length).toBe(2)
        expect(scans[0]!.detail).toEqual({ value: 'A-1', format: 'qr_code' })
        expect(scans[1]!.detail).toEqual({ value: 'B-2', format: 'code_128' })
      } finally {
        vi.useRealTimers()
      }
    })

    it('单帧 detect reject 不终止循环（后续帧恢复检测）', async () => {
      vi.useFakeTimers()
      try {
        installDetector()
        installMediaDevices(async () => fakeStream([{ stop: vi.fn() }]))
        const el = new OASScanner()
        const scans = track(el, 'oas-scan')
        document.body.appendChild(el)
        const video = videoOf(el)
        ;(video as unknown as Record<string, unknown>).videoWidth = 640
        ;(video as unknown as Record<string, unknown>).videoHeight = 480
        el.setAttribute('active', '')
        await flush()

        FakeDetector.queue = [new Error('decode boom'), [{ rawValue: 'RECOVER', format: 'qr_code' }]]
        await vi.advanceTimersByTimeAsync(DETECT_INTERVAL_MS * 3)
        expect(scans.length).toBe(1)
        expect(scans[0]!.detail).toEqual({ value: 'RECOVER', format: 'qr_code' })
      } finally {
        vi.useRealTimers()
      }
    })

    it('getUserMedia 权限被拒 → oas-error {code:"permission"} + 自动落手动模式', async () => {
      installDetector()
      installMediaDevices(async () => {
        throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
      })
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      el.setAttribute('active', '')
      await flush()

      expect(errors.length).toBe(1)
      expect(errors[0]!.detail).toEqual({ code: 'permission' })
      expect(formOf(el).hasAttribute('hidden')).toBe(false)
      expect(statusOf(el).textContent).toContain('权限')
      expect(videoOf(el).hasAttribute('hidden')).toBe(true)
    })

    it('设备/其他异常 → oas-error {code:"camera"} + 自动落手动模式', async () => {
      installDetector()
      installMediaDevices(async () => {
        throw Object.assign(new Error('no device'), { name: 'NotFoundError' })
      })
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      el.setAttribute('active', '')
      await flush()

      expect(errors.length).toBe(1)
      expect(errors[0]!.detail).toEqual({ code: 'camera' })
      expect(formOf(el).hasAttribute('hidden')).toBe(false)
      expect(statusOf(el).textContent).toContain('相机')
    })

    it('有 BarcodeDetector 但无 navigator.mediaDevices → not-supported（不安全上下文）', () => {
      installDetector()
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      el.setAttribute('active', '')
      expect(errors.length).toBe(1)
      expect(errors[0]!.detail).toEqual({ code: 'not-supported' })
    })

    it('孤儿流防护：getUserMedia resolve 前会话已结束 → track.stop() 立即关流、video 不显示', async () => {
      installDetector()
      const trackStop = vi.fn()
      let resolveMedia!: (s: MediaStream) => void
      installMediaDevices(
        () =>
          new Promise<MediaStream>((res) => {
            resolveMedia = res
          }),
      )
      const el = new OASScanner()
      document.body.appendChild(el)
      el.setAttribute('active', '')
      el.removeAttribute('active')
      resolveMedia(fakeStream([{ stop: trackStop }]))
      await flush()

      expect(trackStop).toHaveBeenCalledTimes(1)
      expect(videoOf(el).hasAttribute('hidden')).toBe(true)
    })

    it('play() 被拒 → oas-error {code:"camera"} 且 UI 立即刷新（状态文案 + 手动行出现）——降级后不依赖外部属性变更重刷', async () => {
      installDetector()
      installMediaDevices(async () => fakeStream([{ stop: vi.fn() }]))
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      // 覆写实例 play：模拟自动播放被浏览器策略拒绝
      ;(videoOf(el) as unknown as Record<string, unknown>).play = () => Promise.reject(new Error('play blocked'))
      el.setAttribute('active', '')
      await flush()

      expect(errors.length, 'play 拒绝派发一次 camera 错误').toBe(1)
      expect(errors[0]!.detail).toEqual({ code: 'camera' })
      // 修复回归：fallManual 内部统一 update——错误态立即可见，手动行立即出现
      expect(statusOf(el).textContent, '状态区显示相机错误文案').toContain('相机')
      expect(statusOf(el).className, '状态区错误配色 class 生效').toContain('error')
      expect(formOf(el).hasAttribute('hidden'), '手动行立即出现（无需属性抖动触发重刷）').toBe(false)
      expect(videoOf(el).hasAttribute('hidden'), 'video 不显示').toBe(true)
    })

    it('抽帧 canvas 无法取得 2d 上下文 → not-supported 降级且 UI 刷新（修复回归：fallManual 后无属性变更也可见）', async () => {
      installDetector()
      installMediaDevices(async () => fakeStream([{ stop: vi.fn() }]))
      const el = new OASScanner()
      const errors = track(el, 'oas-error')
      document.body.appendChild(el)
      const video = videoOf(el)
      ;(video as unknown as Record<string, unknown>).videoWidth = 640
      ;(video as unknown as Record<string, unknown>).videoHeight = 480
      // 恢复 happy-dom 原生 getContext（返回 null）——describe 级 stub 之后单独还原本测
      HTMLCanvasElement.prototype.getContext = realGetContext
      try {
        el.setAttribute('active', '')
        await flush()
        await new Promise((res) => setTimeout(res, DETECT_INTERVAL_MS + 30))

        expect(errors.length, 'ctx 缺失派发一次 not-supported').toBe(1)
        expect(errors[0]!.detail).toEqual({ code: 'not-supported' })
        expect(statusOf(el).textContent, '状态区显示不支持文案').toContain('不支持')
        expect(statusOf(el).className).toContain('error')
        expect(formOf(el).hasAttribute('hidden'), '手动行立即出现').toBe(false)
      } finally {
        HTMLCanvasElement.prototype.getContext = function (): CanvasRenderingContext2D | null {
          return { drawImage() {} } as unknown as CanvasRenderingContext2D
        } as unknown as typeof HTMLCanvasElement.prototype.getContext
      }
    })

    it('stop→start 竞态：pending 旧会话流 resolve 后作废并 stop，新会话流正常工作（会话 epoch 防孤儿流）', async () => {
      vi.useFakeTimers()
      try {
        installDetector()
        const resolvers: Array<(s: MediaStream) => void> = []
        installMediaDevices(
          () =>
            new Promise<MediaStream>((res) => {
              resolvers.push(res)
            }),
        )
        const el = new OASScanner()
        const errors = track(el, 'oas-error')
        document.body.appendChild(el)
        const video = videoOf(el)
        ;(video as unknown as Record<string, unknown>).videoWidth = 640
        ;(video as unknown as Record<string, unknown>).videoHeight = 480

        // S1 pending 期间 stop→start：S1 的 epoch 过期
        el.setAttribute('active', '') // S1
        el.removeAttribute('active')
        el.setAttribute('active', '') // S2
        expect(resolvers.length, '两次激活各发起一次 getUserMedia').toBe(2)

        const staleStop = vi.fn()
        resolvers[0]!(fakeStream([{ stop: staleStop }]))
        await flush()
        expect(staleStop, '过期会话流立即 stop（不留孤儿流占用相机）').toHaveBeenCalledTimes(1)
        expect(video.hasAttribute('hidden'), '过期流不接管 video').toBe(true)
        expect(errors.length, '过期会话不派发 error').toBe(0)

        const freshStop = vi.fn()
        resolvers[1]!(fakeStream([{ stop: freshStop }]))
        await flush()
        expect(video.hasAttribute('hidden'), '新会话流正常接管 video 显示').toBe(false)
        expect(freshStop, '新会话流未被误停').not.toHaveBeenCalled()

        el.remove()
        expect(freshStop, '断连清理停掉新会话流').toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('断开连接清理：流关闭（track.stop）+ 检测循环停止 + 定时器清零，无孤儿产物', async () => {
      vi.useFakeTimers()
      try {
        installDetector()
        const trackStop = vi.fn()
        installMediaDevices(async () => fakeStream([{ stop: trackStop }]))
        const el = new OASScanner()
        const scans = track(el, 'oas-scan')
        document.body.appendChild(el)
        const video = videoOf(el)
        ;(video as unknown as Record<string, unknown>).videoWidth = 640
        ;(video as unknown as Record<string, unknown>).videoHeight = 480
        el.setAttribute('active', '')
        await flush()
        expect(video.hasAttribute('hidden')).toBe(false)

        el.remove()
        expect(trackStop).toHaveBeenCalledTimes(1)

        // 检测循环已停：投喂命中帧 + 推进时间，不再派发
        FakeDetector.queue = [[{ rawValue: 'AFTER-REMOVE', format: 'qr_code' }]]
        await vi.advanceTimersByTimeAsync(HIT_RESUME_DELAY_MS * 3)
        expect(scans.length).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('hydrate（SSR 骨架接管）', () => {
    /** 构造带 DSD 指纹的 shadow（模拟服务端快照） */
    function withSnapshot(el: OASScanner, opts?: { omit?: string }): void {
      const tpl = (el as unknown as { template(): string }).template()
      let inner = `<meta data-oas-ssr="oas-scanner" data-oas-ssr-v="${SSR_SNAPSHOT_VERSION}">`
      if (opts?.omit !== 'video') inner += tpl
      else inner += tpl.replace(/<video[^>]*>/, '')
      el.shadowRoot!.innerHTML = inner
      // 探针：hydrate 接管（不重建）则保留；回退 render 重建则消失
      const st = el.shadowRoot!.querySelector('[part="status"]') as HTMLElement | null
      st?.setAttribute('data-probe', '1')
    }

    it('指纹 + 结构完整 → hydrate() 接管：节点未重建（探针保留）+ 手动提交交互可用', () => {
      const el = new OASScanner()
      withSnapshot(el)
      const scans = track(el, 'oas-scan')
      document.body.appendChild(el)

      const st = el.shadowRoot!.querySelector('[part="status"]') as HTMLElement
      expect(st.getAttribute('data-probe')).toBe('1')
      expect(el.shadowRoot!.querySelector('meta')).toBeNull()

      submitManual(el, 'HYD-1')
      expect(scans.length).toBe(1)
      expect(scans[0]!.detail).toEqual({ value: 'HYD-1' })
    })

    it('结构缺失（video 不在）→ 回退 render() 全量重建（探针消失、meta 移除、骨架完整）', () => {
      const el = new OASScanner()
      withSnapshot(el, { omit: 'video' })
      document.body.appendChild(el)

      const st = el.shadowRoot!.querySelector('[part="status"]') as HTMLElement
      expect(st.hasAttribute('data-probe')).toBe(false)
      expect(el.shadowRoot!.querySelector('meta')).toBeNull()
      expect(el.shadowRoot!.querySelector('video[part="video"]')).not.toBeNull()
    })
  })

  describe('en 语言包（i18n 完整性抽验）', () => {
    it('en 状态与 aria 文案就位（非 raw key）', () => {
      setLocale('en')
      const el = mount({ manual: '' })
      expect(statusOf(el).textContent).toContain('not started')
      expect(el.shadowRoot!.querySelector('.manual-label')!.textContent).toContain('manual')
    })
  })
})
