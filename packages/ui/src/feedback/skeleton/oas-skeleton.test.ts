import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSkeleton } from './index.js'

describe('OASSkeleton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认渲染 3 段段落行', () => {
    const el = new OASSkeleton()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(3)
  })

  it('rows 属性控制行数', () => {
    const el = new OASSkeleton()
    el.setAttribute('rows', '5')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(5)
  })

  it('title/avatar 开关', () => {
    const el = new OASSkeleton()
    el.setAttribute('title', '')
    el.setAttribute('avatar', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="avatar"]')).not.toBeNull()
  })

  it('active 时带动画类', () => {
    const el = new OASSkeleton()
    el.setAttribute('active', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="block"]')!.classList.contains('active')).toBe(true)
  })

  describe('title 吸收（消除宿主原生 tooltip；title 为存在性开关）', () => {
    it('挂载后宿主不再残留 title 属性，标题形骨架块照常渲染', () => {
      const el = new OASSkeleton()
      el.setAttribute('title', '')
      document.body.appendChild(el)
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
    })

    it('吸收后二次 update 幂等（rows 变化重建不丢标题块、宿主 title 不复活）', () => {
      const el = new OASSkeleton()
      el.setAttribute('title', '')
      document.body.appendChild(el)
      el.setAttribute('rows', '5') // 触发二次 update
      expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(5)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title 空串属性仍表示开关在场（存在性语义保留，与值无关）', () => {
      const el = new OASSkeleton()
      el.setAttribute('title', '')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      // 吸收后 removeAttribute 属宿主常态：块保持（清空语义不适用于存在性开关）
      el.removeAttribute('title')
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照含标题形骨架块时恢复开关缓存，水合后标题块不丢失', () => {
      const ref = new OASSkeleton()
      ref.setAttribute('title', '')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASSkeleton()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-skeleton" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })
})
