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
