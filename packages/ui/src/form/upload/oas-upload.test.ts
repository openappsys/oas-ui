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
