import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASImagePicker } from './index.js'

function mount(attrs: Record<string, string> = {}): OASImagePicker {
  const el = new OASImagePicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function png(name: string): File {
  return new File(['x'], name, { type: 'image/png' })
}

function txt(name: string): File {
  return new File(['x'], name, { type: 'text/plain' })
}

function tiles(el: OASImagePicker): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="tile"]')]
}

function addBtn(el: OASImagePicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!
}

function input(el: OASImagePicker): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!
}

function op(el: OASImagePicker, index: number, act: 'prev' | 'next' | 'remove'): HTMLButtonElement {
  return tiles(el)[index]!.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!
}

/** 模拟用户选文件：改写 input.files 后派发 change */
function choose(el: OASImagePicker, files: File[]): void {
  const inp = input(el)
  Object.defineProperty(inp, 'files', { value: files, configurable: true })
  inp.dispatchEvent(new Event('change', { bubbles: true }))
}

function drop(el: OASImagePicker, files: File[]): void {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { files } })
  el.shadowRoot!.querySelector('[part="picker"]')!.dispatchEvent(event)
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

describe('OASImagePicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('默认渲染添加按钮、空列表与 f=image/* 多选输入', () => {
    const el = mount()
    expect(addBtn(el).getAttribute('aria-label')).toBe('添加图片')
    expect(input(el).accept).toBe('image/*')
    expect(input(el).multiple).toBe(true)
    expect(tiles(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="grid"]')!.getAttribute('role')).toBe('list')
  })

  it('accept 属性透传到文件输入，capture 打开拍照通道', () => {
    const el = mount({ accept: '.png,.jpg', capture: '' })
    expect(input(el).accept).toBe('.png,.jpg')
    expect(input(el).getAttribute('capture')).toBe('')
  })

  it('选择图片后渲染缩略图并派发 oas-change', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    choose(el, [png('a.png'), png('b.png')])
    expect(tiles(el).length).toBe(2)
    expect(el.files.length).toBe(2)
    expect(events).toEqual([{ files: el.files, count: 2 }])
  })

  it('超过 max 只保留上限数量并派发 oas-exceed-limit', () => {
    const el = mount({ max: '2' })
    const events: unknown[] = []
    const order: string[] = []
    el.addEventListener('oas-change', () => order.push('change'))
    el.addEventListener('oas-exceed-limit', (e) => {
      order.push('exceed')
      events.push((e as CustomEvent).detail)
    })
    choose(el, [png('a.png'), png('b.png'), png('c.png')])
    expect(el.files.length).toBe(2)
    expect(events).toEqual([{ count: 3, max: 2 }])
    // 先提交新列表再提示丢弃：宿主两路监听时最后看到的是提示
    expect(order).toEqual(['change', 'exceed'])
  })

  it('非图片文件被拒绝并派发 oas-reject', () => {
    const el = mount()
    const rejects: unknown[] = []
    el.addEventListener('oas-reject', (e) => rejects.push((e as CustomEvent).detail))
    choose(el, [txt('note.txt')])
    expect(el.files.length).toBe(0)
    expect(rejects).toHaveLength(1)
  })

  it('删除按钮移除对应图片并派发 oas-change', () => {
    const el = mount()
    el.files = [png('a.png'), png('b.png')]
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    click(op(el, 0, 'remove'))
    expect(el.files.map((f) => f.name)).toEqual(['b.png'])
    expect((detail as { count: number }).count).toBe(1)
  })

  it('排序按钮前后移动图片，边界按钮禁用', () => {
    const el = mount()
    el.files = [png('a.png'), png('b.png'), png('c.png')]
    expect(op(el, 0, 'prev').disabled).toBe(true)
    expect(op(el, 2, 'next').disabled).toBe(true)
    click(op(el, 0, 'next'))
    expect(el.files.map((f) => f.name)).toEqual(['b.png', 'a.png', 'c.png'])
    click(op(el, 2, 'prev'))
    expect(el.files.map((f) => f.name)).toEqual(['b.png', 'c.png', 'a.png'])
  })

  it('达到上限后隐藏添加按钮，计数文案显示已选/上限', () => {
    const el = mount({ max: '2' })
    el.files = [png('a.png'), png('b.png')]
    expect(addBtn(el).hidden).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="count"]')!.textContent).toBe('已选 2 / 2 张')
  })

  it('拖拽图片到网格可加入列表', () => {
    const el = mount()
    drop(el, [png('drag.png')])
    expect(el.files.map((f) => f.name)).toEqual(['drag.png'])
  })

  it('disabled 下添加与操作按钮均禁用', () => {
    const el = mount({ disabled: '', max: '5' })
    el.files = [png('a.png')]
    expect(addBtn(el).disabled).toBe(true)
    expect(op(el, 0, 'remove').disabled).toBe(true)
  })

  it('readonly 隐藏添加入口与操作按钮（只读预览）', () => {
    const el = mount({ readonly: '' })
    el.files = [png('a.png')]
    expect(addBtn(el).hidden).toBe(true)
    expect(op(el, 0, 'remove').disabled).toBe(true)
  })

  it('删除按钮带序号可读名称（1 起始）', () => {
    const el = mount()
    el.files = [png('a.png')]
    expect(op(el, 0, 'remove').getAttribute('aria-label')).toBe('移除第 1 张图片')
    expect(op(el, 0, 'next').getAttribute('aria-label')).toBe('后移第 1 张图片')
  })

  it('clear() 清空列表并派发 oas-change', () => {
    const el = mount()
    el.files = [png('a.png')]
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.clear()
    expect(el.files.length).toBe(0)
    expect(fired).toBe(1)
  })

  it('宿主赋值 files 不派发 oas-change（受控写入静默）', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.files = [png('a.png')]
    expect(fired).toBe(0)
  })

  it('再次选文件时追加到已有列表', () => {
    const el = mount()
    el.files = [png('a.png')]
    choose(el, [png('b.png')])
    expect(el.files.map((f) => f.name)).toEqual(['a.png', 'b.png'])
  })

  // —— objectURL 泄漏回归：断开连接必须全量回收，重连懒重建 ——
  it('断开连接全量回收缩略图 objectURL，重连按 files 懒重建', () => {
    const created: string[] = []
    const revoked: string[] = []
    let seq = 0
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = (() => {
      const url = `blob:mock-${++seq}`
      created.push(url)
      return url
    }) as typeof URL.createObjectURL
    URL.revokeObjectURL = ((url: string) => {
      revoked.push(url)
    }) as typeof URL.revokeObjectURL
    try {
      const el = mount()
      el.files = [png('a.png'), png('b.png')]
      expect(created).toHaveLength(2)
      expect(revoked).toEqual([])

      el.remove()
      expect(revoked, '断开连接必须回收全部缩略图 URL').toEqual(created)

      document.body.appendChild(el)
      // 重连后缩略图懒重建：新 URL 生成并挂到 <img> 上（不残留失效的旧 blob）
      expect(created).toHaveLength(4)
      const srcs = [...el.shadowRoot!.querySelectorAll<HTMLImageElement>('[part="thumbnail"]')].map((i) => i.src)
      expect(srcs).toHaveLength(2)
      for (const src of srcs) expect(created.slice(2)).toContain(src.replace(/^.*?blob:/, 'blob:'))
      expect(tiles(el).length).toBe(2)
    } finally {
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
    }
  })
})

describe('OASImagePicker compress 自动压缩（v2.6.9 批 A）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  /** 等待异步压缩路径完成（microtask + 定时器排空） */
  async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  function pngFile(name: string): File {
    // 1×1 PNG 头（happy-dom 无真实解码器：走优雅降级路径）
    return new File(
      [
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
          0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
        ]),
      ],
      name,
      { type: 'image/png' },
    )
  }

  it('compress 缺省关：oas-change detail 无 compressed 键（现状逐字节等价）', async () => {
    const el = mount()
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (e) => details.push({ ...(e as CustomEvent).detail }))
    const file = pngFile('a.png')
    choose(el, [file])
    await flush()
    expect(details.length).toBe(1)
    expect(details[0]).toEqual({ files: [file], count: 1 })
    expect(Object.keys(details[0]!).sort()).toEqual(['count', 'files'])
  })

  it('compress 开启 + canvas 不可用：优雅降级（原文件保留、meta null、compressed 对齐）', async () => {
    const el = mount({ compress: '' })
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (e) => details.push({ ...(e as CustomEvent).detail }))
    const file = pngFile('a.png')
    choose(el, [file])
    await flush()
    expect(details.length).toBe(1)
    expect((details[0]!.files as File[])[0]).toBe(file)
    expect(details[0]!.compressed).toEqual([null])
    expect(el.files.map((f) => f.name)).toEqual(['a.png'])
  })

  it('compress 开启：不可压缩类型（gif/txt）直接通过且 meta null，事件照常', async () => {
    const el = mount({ compress: '' })
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], 'a.gif', { type: 'image/gif' })
    const txt = new File(['x'], 'b.txt', { type: 'text/plain' })
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-reject', () => {})
    el.addEventListener('oas-change', (e) => details.push({ ...(e as CustomEvent).detail }))
    choose(el, [gif])
    choose(el, [txt])
    await flush()
    // txt 被 accept 过滤（reject），gif 通过且原样保留
    expect(el.files.map((f) => f.name)).toEqual(['a.gif'])
    expect(details[0]!.compressed).toEqual([null])
    expect((details[0]!.files as File[])[0]).toBe(gif)
  })

  it('compress 非法 JSON：devWarn 一次且行为等同关闭（同步路径、detail 无 compressed）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ compress: 'not-json' })
      const details: Array<Record<string, unknown>> = []
      el.addEventListener('oas-change', (e) => details.push({ ...(e as CustomEvent).detail }))
      const file = pngFile('a.png')
      choose(el, [file])
      await flush()
      expect(details.length).toBe(1)
      expect(details[0]).toEqual({ files: [file], count: 1 })
      expect(Object.keys(details[0]!).sort()).toEqual(['count', 'files'])
      expect(warnSpy.mock.calls.some((args) => String(args[0]).includes('compress'))).toBe(true)
      // 同原文只告警一次
      choose(el, [pngFile('b.png')])
      await flush()
      const warnCount = warnSpy.mock.calls.filter((args) => String(args[0]).includes('compress')).length
      expect(warnCount).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('compress 合法 JSON 字段越界同样告警关闭（quality=1.5）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ compress: '{"quality":1.5}' })
      const details: Array<Record<string, unknown>> = []
      el.addEventListener('oas-change', (e) => details.push({ ...(e as CustomEvent).detail }))
      const file = pngFile('a.png')
      choose(el, [file])
      await flush()
      expect(details[0]).toEqual({ files: [file], count: 1 })
      expect(warnSpy.mock.calls.some((args) => String(args[0]).includes('compress'))).toBe(true)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('compress 开启后删除/移动事件的 detail.compressed 与当前列表对齐', async () => {
    const el = mount({ compress: '' })
    const fileA = pngFile('a.png')
    const fileB = pngFile('b.png')
    choose(el, [fileA, fileB])
    await flush()
    let detail: Record<string, unknown> | null = null
    el.addEventListener('oas-change', (e) => (detail = { ...(e as CustomEvent).detail }))
    op(el, 0, 'remove').click()
    expect(detail!.compressed).toEqual([null])
    expect((detail!.files as File[])[0]).toBe(fileB)
    expect(detail!.count).toBe(1)
  })

  it('collision-guard：原型不得有 compress 成员（撞 compress 属性的 property 写入）', () => {
    const proto = OASImagePicker.prototype as unknown as Record<string, unknown>
    expect(proto['compress']).toBeUndefined()
  })

  it('并发两次选入：压缩在途的旧余量不越过 max（落地后按最新列表重算截断）', async () => {
    const el = mount({ compress: '', max: '6' })
    const files6 = ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png'].map(pngFile)
    const files4 = ['7.png', '8.png', '9.png', '10.png'].map(pngFile)
    // 两次选入同步连续派发：第二次在第一次 await 压缩期间启动（两次都用进入时的余量 = 6）
    choose(el, files6)
    choose(el, files4)
    await flush()
    // 终态必须 ≤ max：第二批按最新余量（6-6=0）截断为空
    expect(el.files.length).toBeLessThanOrEqual(6)
    expect(el.files.map((f) => f.name)).toEqual(['1.png', '2.png', '3.png', '4.png', '5.png', '6.png'])
  })

  it('并发两次选入部分可入：终态恰好填满 max 且派发 exceed-limit', async () => {
    const el = mount({ compress: '', max: '9' })
    const exceeds: unknown[] = []
    el.addEventListener('oas-exceed-limit', (e) => exceeds.push((e as CustomEvent).detail))
    const files6 = ['a.png', 'b.png', 'c.png', 'd.png', 'e.png', 'f.png'].map(pngFile)
    const files4 = ['g.png', 'h.png', 'i.png', 'j.png'].map(pngFile)
    choose(el, files6)
    choose(el, files4)
    await flush()
    expect(el.files.length).toBe(9)
    expect(exceeds.length).toBeGreaterThanOrEqual(1)
  })
})
