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
