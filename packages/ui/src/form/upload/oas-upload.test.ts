import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASUpload } from './index.js'

function mount(attrs: Record<string, string> = {}): OASUpload {
  const el = new OASUpload()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function makeFile(name: string, type = 'text/plain', size = 1024): File {
  return new File([new ArrayBuffer(size)], name, { type })
}

function inputOf(el: OASUpload): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('.file-input')!
}

function pick(el: OASUpload, files: File[]): void {
  Object.defineProperty(inputOf(el), 'files', { value: files, configurable: true })
  inputOf(el).dispatchEvent(new Event('change'))
}

describe('OASUpload', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染拖拽区（role=button）与空态', async () => {
    const el = mount()
    await Promise.resolve()
    const zone = el.shadowRoot!.querySelector('.zone')!
    expect(zone.getAttribute('role')).toBe('button')
    expect(zone.getAttribute('aria-disabled')).toBe('false')
    expect(el.shadowRoot!.textContent).toContain('暂无文件')
  })

  it('files property 直接设置后渲染列表（名称/大小/进度）', () => {
    const el = mount()
    el.files = [makeFile('a.txt'), makeFile('b.png', 'image/png', 2048)]
    const items = el.shadowRoot!.querySelectorAll('.item')
    expect(items.length).toBe(2)
    expect(items[0]!.textContent).toContain('a.txt')
    expect(items[1]!.textContent).toContain('b.png')
    expect(items[1]!.textContent).toContain('2.0 KB')
    expect(el.shadowRoot!.querySelectorAll('[part="progress"]').length).toBe(2)
  })

  it('选择文件（input change）追加并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    expect(el.files.length).toBe(1)
    expect(detail).toEqual({ files: [expect.any(File)] })
  })

  it('max 限制文件数量', () => {
    const el = mount({ max: '2', multiple: '' })
    pick(el, [makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')])
    expect(el.files.length).toBe(2)
  })

  it('accept 过滤不匹配的文件', () => {
    const el = mount({ accept: '.png' })
    pick(el, [makeFile('a.txt'), makeFile('b.png', 'image/png')])
    expect(el.files.length).toBe(1)
    expect(el.files[0]!.name).toBe('b.png')
  })

  it('非 multiple 时只保留一个文件', () => {
    const el = mount()
    pick(el, [makeFile('a.txt'), makeFile('b.txt')])
    expect(el.files.length).toBe(1)
  })

  it('删除按钮移除文件并派发 oas-remove / oas-change', () => {
    const el = mount()
    pick(el, [makeFile('a.txt')])
    let remove: unknown
    let change: unknown
    el.addEventListener('oas-remove', (e: Event) => (remove = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (change = (e as CustomEvent).detail))
    const rm = el.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!
    expect(rm.getAttribute('aria-label')).toContain('移除')
    rm.click()
    expect(el.files.length).toBe(0)
    expect(remove).toEqual({ file: expect.any(File), index: 0 })
    expect(change).toEqual({ files: [] })
  })

  it('auto-upload：添加文件后自动模拟上传并派发 oas-upload（done）', () => {
    vi.useFakeTimers()
    try {
      const el = mount({ 'auto-upload': '' })
      pick(el, [makeFile('a.txt')])
      const uploads: unknown[] = []
      el.addEventListener('oas-upload', (e: Event) => uploads.push((e as CustomEvent).detail))
      vi.advanceTimersByTime(120 * 5 + 50)
      expect(uploads.length).toBeGreaterThan(0)
      const last = uploads[uploads.length - 1] as { percent: number; status: string }
      expect(last.percent).toBe(100)
      expect(last.status).toBe('done')
    } finally {
      vi.useRealTimers()
    }
  })

  it('手动 startUpload 也能推进进度', () => {
    vi.useFakeTimers()
    try {
      const el = mount()
      pick(el, [makeFile('a.txt')])
      const uploads: unknown[] = []
      el.addEventListener('oas-upload', (e: Event) => uploads.push((e as CustomEvent).detail))
      el.startUpload()
      vi.advanceTimersByTime(120 * 3 + 10)
      expect(uploads.length).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('disabled 时拖拽区 aria-disabled 且不可接收文件', () => {
    const el = mount({ disabled: '' })
    expect(el.shadowRoot!.querySelector('.zone')!.getAttribute('aria-disabled')).toBe('true')
    const before = el.files.length
    pick(el, [makeFile('a.txt')])
    expect(el.files.length).toBe(before)
  })
})

// ---- 拖拽缺口补全 ----
describe('OASUpload 拖拽', () => {
  function zoneOf(el: OASUpload): HTMLElement {
    return el.shadowRoot!.querySelector('.zone')!
  }

  function fireDrag(el: OASUpload, type: string, files: File[] | null = null): Event {
    const e = new Event(type, { bubbles: true, cancelable: true })
    if (files) Object.defineProperty(e, 'dataTransfer', { value: { files } })
    zoneOf(el).dispatchEvent(e)
    return e
  }

  it('dragover preventDefault 允许 drop', () => {
    const el = mount()
    expect(fireDrag(el, 'dragover').defaultPrevented).toBe(true)
  })

  it('disabled 时 dragover 不 preventDefault（浏览器默认禁止 drop，防止松开后打开文件）', () => {
    const el = mount({ disabled: '' })
    expect(fireDrag(el, 'dragover').defaultPrevented).toBe(false)
  })

  it('dragenter 加 dragging 高亮、dragleave 移除', () => {
    const el = mount()
    fireDrag(el, 'dragenter')
    expect(zoneOf(el).classList.contains('dragging')).toBe(true)
    fireDrag(el, 'dragleave')
    expect(zoneOf(el).classList.contains('dragging')).toBe(false)
  })

  it('drop 添加文件、移除高亮、preventDefault', () => {
    const el = mount()
    fireDrag(el, 'dragenter')
    const e = fireDrag(el, 'drop', [makeFile('a.txt')])
    expect(e.defaultPrevented).toBe(true)
    expect(zoneOf(el).classList.contains('dragging')).toBe(false)
    expect(el.files.length).toBe(1)
  })

  it('disabled 时 drop 不收文件且不产生 dragging 高亮', () => {
    const el = mount({ disabled: '' })
    fireDrag(el, 'dragenter')
    expect(zoneOf(el).classList.contains('dragging')).toBe(false)
    fireDrag(el, 'drop', [makeFile('a.txt')])
    expect(el.files.length).toBe(0)
  })
})

// ---- list-type（list / picture / picture-card）----
describe('OASUpload list-type', () => {
  beforeEach(() => {
    // happy-dom 不保证实现 createObjectURL/revokeObjectURL，统一 mock
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('默认 list：文本列表无缩略图', () => {
    const el = mount()
    el.files = [makeFile('a.png', 'image/png')]
    expect(el.shadowRoot!.querySelectorAll('.card').length).toBe(0)
    expect(el.shadowRoot!.querySelector('.item img')).toBeNull()
  })

  it('picture-card：图片渲染缩略图（blob objectURL）', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.png', 'image/png')]
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('.card .thumb img')!
    expect(img).not.toBeNull()
    expect(img.src).toContain('blob:')
    expect(img.alt).toBe('a.png')
  })

  it('picture-card：非图片渲染图标占位 + 文件名', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.txt')]
    const thumb = el.shadowRoot!.querySelector('.card .thumb')!
    expect(thumb.querySelector('oas-icon')).not.toBeNull()
    expect(thumb.querySelector('img')).toBeNull()
    expect(thumb.textContent).toContain('a.txt')
  })

  it('picture-card：点击缩略图派发 oas-preview（file + url）并打开浮层', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.png', 'image/png')]
    let detail: unknown
    el.addEventListener('oas-preview', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('.card .thumb') as HTMLElement).click()
    expect(detail).toEqual({ file: expect.any(File), url: 'blob:mock-url' })
    const mask = el.shadowRoot!.querySelector<HTMLElement>('.preview-mask')!
    expect(mask.hasAttribute('hidden')).toBe(false)
  })

  it('picture-card：透明 hover 操作区不拦截指针事件，缩略图始终可点', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.png', 'image/png')]
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 防回归：.actions 覆盖层（hover 态也）不得拦截指针——否则鼠标移动触发 hover 后，
    // 整卡被透明操作区吞掉点击，缩略图 oas-preview 失效；仅 .act 按钮在 hover 时可命中
    const actionsBlock = css.match(/\.card \.actions \{([^}]*)\}/)?.[1] ?? ''
    const removeBlock = css.match(/\.card \.remove \{([^}]*)\}/)?.[1] ?? ''
    const hoverBlock = css.match(/\.card:hover \.actions\s*,[^}]*\}/)?.[0] ?? ''
    const actBaseBlock = css.match(/\.card \.actions \.act \{([^}]*)\}/)?.[1] ?? ''
    const actHoverBlock = css.match(/\.card:hover \.actions \.act\s*,[^}]*\}/)?.[0] ?? ''
    expect(actionsBlock).toMatch(/pointer-events:\s*none/)
    expect(hoverBlock).not.toMatch(/pointer-events:\s*auto/)
    expect(removeBlock).toMatch(/pointer-events:\s*none/)
    expect(actBaseBlock).toMatch(/pointer-events:\s*none/)
    expect(actHoverBlock).toMatch(/pointer-events:\s*auto/)
  })

  it('preview 浮层：Esc 关闭并还原焦点', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.png', 'image/png')]
    ;(el.shadowRoot!.querySelector('.card .thumb') as HTMLElement).click()
    const mask = el.shadowRoot!.querySelector<HTMLElement>('.preview-mask')!
    expect(mask.hasAttribute('hidden')).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(mask.hasAttribute('hidden')).toBe(true)
  })

  it('picture-card：右上角删除按钮移除文件并派发 oas-remove', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.png', 'image/png')]
    const rm = el.shadowRoot!.querySelector<HTMLButtonElement>('.card .remove')!
    expect(rm.getAttribute('aria-label')).toContain('移除')
    rm.click()
    expect(el.files.length).toBe(0)
    expect(el.shadowRoot!.querySelectorAll('.card').length).toBe(0)
  })

  it('picture-card：disabled 时删除按钮禁用', () => {
    const el = mount({ 'list-type': 'picture-card', disabled: '' })
    el.files = [makeFile('a.png', 'image/png')]
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.card .remove')!.disabled).toBe(true)
  })

  it('picture：列表带小缩略图，图片用 img、非图片用图标', () => {
    const el = mount({ 'list-type': 'picture' })
    el.files = [makeFile('a.png', 'image/png'), makeFile('b.txt')]
    const items = el.shadowRoot!.querySelectorAll('.item-picture')
    expect(items.length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('.item-picture .item-thumb img').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('.item-picture .item-thumb oas-icon').length).toBe(1)
    expect(items[0]!.querySelector('.meta .name')!.textContent).toBe('a.png')
  })

  it('objectURL 生命周期：删除文件时 revoke、断开连接时 revoke 全部', () => {
    const el = mount({ 'list-type': 'picture-card' })
    el.files = [makeFile('a.png', 'image/png'), makeFile('b.png', 'image/png')]
    const revoke = vi.mocked(URL.revokeObjectURL)
    ;(el.shadowRoot!.querySelector('.card .remove') as HTMLElement).click()
    expect(revoke).toHaveBeenCalledTimes(1)
    document.body.removeChild(el)
    expect(revoke).toHaveBeenCalledTimes(2)
  })

  it('list-type 运行时切换立即重渲染为对应模式', () => {
    const el = mount()
    el.files = [makeFile('a.png', 'image/png')]
    el.setAttribute('list-type', 'picture-card')
    expect(el.shadowRoot!.querySelectorAll('.card').length).toBe(1)
    el.setAttribute('list-type', 'picture')
    expect(el.shadowRoot!.querySelectorAll('.item-picture').length).toBe(1)
  })
})

// ---- 数量超限 ----
describe('OASUpload 数量超限', () => {
  it('超过 max 时拒绝多余文件并派发 oas-exceed（detail 含 files/max/total）', () => {
    const el = mount({ max: '1' })
    let detail: unknown
    el.addEventListener('oas-exceed', (e: Event) => (detail = (e as CustomEvent).detail))
    pick(el, [makeFile('a.txt'), makeFile('b.txt')])
    expect(el.files.length).toBe(1)
    expect(el.files[0]!.name).toBe('a.txt')
    expect(detail).toEqual({ files: [expect.any(File)], max: 1, total: 1 })
  })
})

// ---- 真实上传通道（action + XHR / custom-request） ----
/** fake XHR：单测不发起真网络，捕获请求元数据并手动驱动进度/成功/失败/中止 */
class FakeUploadXHR {
  static instances: FakeUploadXHR[] = []
  static reset(): void {
    FakeUploadXHR.instances = []
  }
  method = ''
  url = ''
  withCredentials = false
  headers: Record<string, string> = {}
  body: FormData | null = null
  status = 0
  responseText = ''
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  }
  onabort: (() => void) | null = null
  onerror: (() => void) | null = null
  onload: (() => void) | null = null
  constructor() {
    FakeUploadXHR.instances.push(this)
  }
  open(method: string, url: string): void {
    this.method = method
    this.url = url
  }
  setRequestHeader(k: string, v: string): void {
    this.headers[k] = v
  }
  send(body?: FormData | null): void {
    this.body = body ?? null
  }
  abort(): void {
    this.onabort?.()
  }
  progress(loaded: number, total: number): void {
    this.upload.onprogress?.({ lengthComputable: total > 0, loaded, total })
  }
  respond(status: number, text = ''): void {
    this.status = status
    this.responseText = text
    this.onload?.()
  }
  fail(): void {
    this.onerror?.()
  }
}

describe('OASUpload 真实上传通道（action + XHR）', () => {
  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeUploadXHR)
    FakeUploadXHR.reset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('action + auto-upload：发起 XHR，FormData 携带文件（name 字段）与 data 附加字段', () => {
    const el = mount({
      action: '/upload',
      name: 'avatar',
      data: '{"uid":42}',
      'auto-upload': '',
    })
    pick(el, [makeFile('a.txt')])
    const xhr = FakeUploadXHR.instances[0]!
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('/upload')
    expect(xhr.body).toBeInstanceOf(FormData)
    expect(xhr.body!.get('avatar')).toBeInstanceOf(File)
    expect(xhr.body!.get('uid')).toBe('42')
  })

  it('method / headers / with-credentials 透传到 XHR', () => {
    const el = mount({
      action: '/upload',
      method: 'PUT',
      headers: '{"X-Token":"t1"}',
      'with-credentials': '',
      'auto-upload': '',
    })
    pick(el, [makeFile('a.txt')])
    const xhr = FakeUploadXHR.instances[0]!
    expect(xhr.method).toBe('PUT')
    expect(xhr.headers['X-Token']).toBe('t1')
    expect(xhr.withCredentials).toBe(true)
  })

  it('真实进度推进 percent 并派发 oas-upload；2xx 后派发 oas-success 且状态 done', () => {
    const el = mount({ action: '/upload', 'auto-upload': '' })
    const uploads: unknown[] = []
    const successes: unknown[] = []
    el.addEventListener('oas-upload', (e: Event) => uploads.push((e as CustomEvent).detail))
    el.addEventListener('oas-success', (e: Event) => successes.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    const xhr = FakeUploadXHR.instances[0]!
    xhr.progress(50, 100)
    expect((uploads.at(-1) as { percent: number }).percent).toBe(50)
    xhr.respond(200, '{"ok":true}')
    expect(successes).toEqual([{ file: expect.any(File), response: { ok: true } }])
    expect((uploads.at(-1) as { percent: number; status: string }).percent).toBe(100)
    expect((uploads.at(-1) as { status: string }).status).toBe('done')
    expect(el.shadowRoot!.querySelector('.item.is-error')).toBeNull()
  })

  it('非 2xx 进入 error 态并派发 oas-error；retry 按钮重新发起请求（oas-retry）', () => {
    const el = mount({ action: '/upload', 'auto-upload': '' })
    const errors: unknown[] = []
    const retries: unknown[] = []
    el.addEventListener('oas-error', (e: Event) => errors.push((e as CustomEvent).detail))
    el.addEventListener('oas-retry', (e: Event) => retries.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    FakeUploadXHR.instances[0]!.respond(500, 'boom')
    expect(el.shadowRoot!.querySelector('.item')!.classList.contains('is-error')).toBe(true)
    expect(errors[0]).toEqual({ file: expect.any(File), response: 'boom', status: 500 })
    const retry = el.shadowRoot!.querySelector<HTMLButtonElement>('.item .retry')!
    expect(retry).not.toBeNull()
    retry.click()
    expect(retries.length).toBe(1)
    expect(FakeUploadXHR.instances.length).toBe(2)
  })

  it('uploading 态取消按钮 abort 请求：派发 oas-cancel、状态回 pending', () => {
    const el = mount({ action: '/upload', 'auto-upload': '' })
    const cancels: unknown[] = []
    el.addEventListener('oas-cancel', (e: Event) => cancels.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    expect(el.shadowRoot!.querySelector('.item .cancel')).not.toBeNull()
    ;(el.shadowRoot!.querySelector('.item .cancel') as HTMLElement).click()
    expect(cancels).toEqual([{ file: expect.any(File) }])
    expect(el.shadowRoot!.querySelector('.item')!.classList.contains('is-error')).toBe(false)
    expect(el.shadowRoot!.querySelector('.item .cancel')).toBeNull()
  })

  it('submit() 是 startUpload 的等价别名；abort() 无参取消全部进行中的上传', () => {
    const el = mount({ action: '/upload', multiple: '' })
    const cancels: unknown[] = []
    el.addEventListener('oas-cancel', (e: Event) => cancels.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt'), makeFile('b.txt')])
    el.submit()
    expect(FakeUploadXHR.instances.length).toBe(2)
    el.abort()
    expect(cancels.length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('.item .cancel').length).toBe(0)
  })

  it('删除上传中的文件：先静默中止请求（不派发 oas-cancel）再移除', () => {
    const el = mount({ action: '/upload', 'auto-upload': '' })
    const cancels: unknown[] = []
    el.addEventListener('oas-cancel', (e: Event) => cancels.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    ;(el.shadowRoot!.querySelector('.item .remove') as HTMLElement).click()
    expect(el.files.length).toBe(0)
    expect(cancels.length).toBe(0)
  })

  it('无 action 且无 custom-request 时不发起 XHR（回落模拟进度）', () => {
    vi.useFakeTimers()
    try {
      const el = mount({ 'auto-upload': '' })
      const uploads: unknown[] = []
      el.addEventListener('oas-upload', (e: Event) => uploads.push((e as CustomEvent).detail))
      pick(el, [makeFile('a.txt')])
      expect(FakeUploadXHR.instances.length).toBe(0)
      vi.advanceTimersByTime(120 * 5 + 50)
      expect((uploads.at(-1) as { status: string }).status).toBe('done')
    } finally {
      vi.useRealTimers()
    }
  })

  it('custom-request 逃生舱：接管请求通道（进度/成功/abort）', () => {
    const el = mount({ multiple: '', 'auto-upload': '' })
    let prog: ((e: { percent: number }) => void) | null = null
    let succ: ((response: unknown) => void) | null = null
    const abort = vi.fn()
    el.customRequest = (opts) => {
      prog = opts.onProgress
      succ = opts.onSuccess
      return { abort }
    }
    const successes: unknown[] = []
    el.addEventListener('oas-success', (e: Event) => successes.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    expect(FakeUploadXHR.instances.length).toBe(0)
    prog!({ percent: 60 })
    succ!({ url: 'https://x/1' })
    expect(successes).toEqual([{ file: expect.any(File), response: { url: 'https://x/1' } }])
    pick(el, [makeFile('b.txt')])
    // 首个文件已完成（无 cancel），唯一 uploading 行的取消按钮即第二个文件
    const cancelBtn = el.shadowRoot!.querySelector('.item .cancel') as HTMLElement
    cancelBtn.click()
    expect(abort).toHaveBeenCalled()
    expect(el.shadowRoot!.querySelectorAll('.item')[1]!.classList.contains('is-error')).toBe(false)
  })
})

// ---- before-upload 钩子 ----
describe('OASUpload before-upload', () => {
  it('返回 false 拒绝文件（不进列表、不派发 oas-change）', () => {
    const el = mount()
    let changed = false
    el.addEventListener('oas-change', () => (changed = true))
    el.beforeUpload = () => false
    pick(el, [makeFile('a.txt')])
    expect(el.files.length).toBe(0)
    expect(changed).toBe(false)
  })

  it('返回 File 转换文件（transform 语义）', async () => {
    const el = mount()
    el.beforeUpload = () => new File(['x'], 'renamed.txt', { type: 'text/plain' })
    pick(el, [makeFile('a.txt')])
    await new Promise((r) => setTimeout(r, 0))
    expect(el.files.length).toBe(1)
    expect(el.files[0]!.name).toBe('renamed.txt')
  })

  it('异步 Promise 拒绝/放行', async () => {
    const el = mount()
    el.beforeUpload = async (f) => f.name.endsWith('.png')
    pick(el, [makeFile('a.txt'), makeFile('b.png', 'image/png')])
    await new Promise((r) => setTimeout(r, 0))
    expect(el.files.length).toBe(1)
    expect(el.files[0]!.name).toBe('b.png')
  })

  it('before-upload 抛异常视同拒绝', async () => {
    const el = mount()
    el.beforeUpload = () => {
      throw new Error('bad')
    }
    pick(el, [makeFile('a.txt')])
    await new Promise((r) => setTimeout(r, 0))
    expect(el.files.length).toBe(0)
  })
})

// ---- max-size 大小限制 ----
describe('OASUpload max-size', () => {
  it('超过 max-size（字节）拒绝并派发 oas-exceed（type: size）', () => {
    const el = mount({ 'max-size': '1024' })
    let detail: unknown
    el.addEventListener('oas-exceed', (e: Event) => (detail = (e as CustomEvent).detail))
    pick(el, [makeFile('big.txt', 'text/plain', 2048)])
    expect(el.files.length).toBe(0)
    expect(detail).toEqual({
      files: [expect.any(File)],
      type: 'size',
      maxSize: 1024,
      total: 0,
    })
  })

  it('max-size 支持单位解析（2KB = 2048 字节）', () => {
    const el = mount({ 'max-size': '2KB' })
    let detail: any
    el.addEventListener('oas-exceed', (e: Event) => (detail = (e as CustomEvent).detail))
    pick(el, [makeFile('big.txt', 'text/plain', 2049)])
    expect(detail.maxSize).toBe(2048)
  })

  it('未超限文件正常进入列表', () => {
    const el = mount({ 'max-size': '1MB' })
    pick(el, [makeFile('ok.txt', 'text/plain', 1024 * 512)])
    expect(el.files.length).toBe(1)
  })
})

// ---- directory / paste / show-file-list ----
describe('OASUpload directory / paste / show-file-list', () => {
  it('directory：input 落 webkitdirectory，列表显示相对路径', () => {
    const el = mount({ directory: '' })
    expect((inputOf(el) as unknown as { webkitdirectory: boolean }).webkitdirectory).toBe(true)
    const f = makeFile('a.txt')
    Object.defineProperty(f, 'webkitRelativePath', { value: 'docs/a.txt' })
    pick(el, [f])
    expect(el.shadowRoot!.querySelector('.item .name')!.textContent).toContain('docs/a.txt')
  })

  it('paste：组件上粘贴文件进列表（preventDefault）', () => {
    const el = mount({ paste: '' })
    const e = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(e, 'clipboardData', { value: { files: [makeFile('p.png', 'image/png')] } })
    el.dispatchEvent(e)
    expect(el.files.length).toBe(1)
    expect(e.defaultPrevented).toBe(true)
  })

  it('未开 paste 时粘贴不拦截', () => {
    const el = mount()
    const e = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(e, 'clipboardData', { value: { files: [makeFile('p.png', 'image/png')] } })
    el.dispatchEvent(e)
    expect(el.files.length).toBe(0)
    expect(e.defaultPrevented).toBe(false)
  })

  it('show-file-list="false"：隐藏列表只留触发区', () => {
    const el = mount({ 'show-file-list': 'false' })
    pick(el, [makeFile('a.txt')])
    const list = el.shadowRoot!.querySelector<HTMLElement>('.list')!
    expect(list.hidden).toBe(true)
    expect(el.files.length).toBe(1)
  })
})

// ---- tip / trigger / item 插槽 ----
describe('OASUpload 插槽（tip / trigger / item）', () => {
  it('tip 属性渲染提示文案', () => {
    const el = mount({ tip: '只能上传 jpg/png，不超过 500KB' })
    const tip = el.shadowRoot!.querySelector<HTMLElement>('.tip')!
    expect(tip.textContent).toBe('只能上传 jpg/png，不超过 500KB')
    expect(tip.hidden).toBe(false)
  })

  it('template[slot="tip"] 克隆渲染（属性缺席时）', () => {
    const el = mount()
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'tip')
    tpl.innerHTML = '<b>拖拽或粘贴截图</b>'
    el.appendChild(tpl)
    el.setAttribute('accept', '.png') // 触发 update 重渲
    expect(el.shadowRoot!.querySelector('.tip')!.textContent).toBe('拖拽或粘贴截图')
  })

  it('trigger 插槽替换默认拖拽区内容，点击仍打开文件选择', async () => {
    const el = mount()
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('slot', 'trigger')
    btn.textContent = '选择文件'
    el.appendChild(btn)
    await new Promise((r) => setTimeout(r, 0))
    // 具名插槽接管：slot 有分配节点（默认 icon/hint 为 fallback 不再渲染）
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]')!
    expect(slot.assignedNodes().length).toBe(1)
    const zone = el.shadowRoot!.querySelector<HTMLElement>('.zone')!
    expect(zone.getAttribute('role')).toBe('button')
    const input = inputOf(el)
    const clickSpy = vi.spyOn(input, 'click')
    btn.click()
    expect(clickSpy).toHaveBeenCalled()
  })

  it('template[slot="item"] 克隆进每行，[data-item-name]/[data-item-size] 绑定', () => {
    const el = mount()
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'item')
    tpl.innerHTML = '<span class="row-badge">📄</span><b data-item-name></b><i data-item-size></i>'
    el.appendChild(tpl)
    el.files = [makeFile('a.txt', 'text/plain', 2048)]
    const item = el.shadowRoot!.querySelector('.item')!
    expect(item.querySelector('.row-badge')).not.toBeNull()
    expect(item.querySelector('[data-item-name]')!.textContent).toBe('a.txt')
    expect(item.querySelector('[data-item-size]')!.textContent).toBe('2.0 KB')
  })
})

// ---- list/picture 模式预览入口 ----
describe('OASUpload list/picture 预览入口与回显初值', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('list 模式点文件名打开预览浮层并派发 oas-preview', () => {
    const el = mount()
    el.files = [makeFile('a.png', 'image/png')]
    let detail: unknown
    el.addEventListener('oas-preview', (e: Event) => (detail = (e as CustomEvent).detail))
    const nameBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.item .name-btn')!
    expect(nameBtn).not.toBeNull()
    nameBtn.click()
    expect(detail).toEqual({ file: expect.any(File), url: 'blob:mock-url' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.preview-mask')!.hidden).toBe(false)
  })

  it('picture 模式同样有文件名预览入口', () => {
    const el = mount({ 'list-type': 'picture' })
    el.files = [makeFile('a.png', 'image/png')]
    const nameBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.item-picture .name-btn')!
    nameBtn.click()
    expect(el.shadowRoot!.querySelector<HTMLElement>('.preview-mask')!.hidden).toBe(false)
  })

  it('回显初值 {name,url}：渲染 done 态行，预览走远程 url', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-preview', (e: Event) => (detail = (e as CustomEvent).detail))
    el.files = [{ name: 'logo.png', url: 'https://cdn.example.com/logo.png' }]
    const item = el.shadowRoot!.querySelector('.item')!
    expect(item.textContent).toContain('logo.png')
    expect(item.classList.contains('is-error')).toBe(false)
    const progress = item.querySelector('[part="progress"]')!
    expect(progress.getAttribute('percent')).toBe('100')
    ;(item.querySelector('.name-btn') as HTMLElement).click()
    expect(detail).toEqual({
      file: { name: 'logo.png', url: 'https://cdn.example.com/logo.png' },
      url: 'https://cdn.example.com/logo.png',
    })
  })

  it('defaultFiles property 同样支持回显初值', () => {
    const el = mount()
    el.defaultFiles = [{ name: 'a.txt', url: 'https://x/a.txt' }]
    expect(el.files.length).toBe(1)
    expect(el.shadowRoot!.querySelector('.item')!.textContent).toContain('a.txt')
  })
})

// ---- replace 替换语义 ----
describe('OASUpload replace', () => {
  it('max=1 + replace：新文件替换旧文件（派发 oas-remove）', () => {
    const el = mount({ max: '1', replace: '' })
    const removes: unknown[] = []
    el.addEventListener('oas-remove', (e: Event) => removes.push((e as CustomEvent).detail))
    pick(el, [makeFile('a.txt')])
    pick(el, [makeFile('b.txt')])
    expect(el.files.length).toBe(1)
    expect(el.files[0]!.name).toBe('b.txt')
    expect(removes.length).toBe(1)
    expect((removes[0] as { file: File }).file.name).toBe('a.txt')
  })

  it('非 multiple + replace：单选场景同样替换', () => {
    const el = mount({ replace: '' })
    pick(el, [makeFile('a.txt')])
    pick(el, [makeFile('b.txt')])
    expect(el.files.length).toBe(1)
    expect(el.files[0]!.name).toBe('b.txt')
  })

  it('无 replace 时维持拒绝语义（不替换）', () => {
    const el = mount({ max: '1' })
    pick(el, [makeFile('a.txt')])
    pick(el, [makeFile('b.txt')])
    expect(el.files[0]!.name).toBe('a.txt')
  })
})

// ---- picture-card error 态 ----
describe('OASUpload picture-card error 态', () => {
  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeUploadXHR)
    FakeUploadXHR.reset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('失败卡片进入 is-error 并提供重试按钮', () => {
    const el = mount({ action: '/upload', 'list-type': 'picture-card', 'auto-upload': '' })
    pick(el, [makeFile('a.png', 'image/png')])
    FakeUploadXHR.instances[0]!.respond(500, 'boom')
    const card = el.shadowRoot!.querySelector('.card')!
    expect(card.classList.contains('is-error')).toBe(true)
    expect(card.querySelector('.act.retry')).not.toBeNull()
    ;(card.querySelector('.act.retry') as HTMLElement).click()
    expect(FakeUploadXHR.instances.length).toBe(2)
  })
})
