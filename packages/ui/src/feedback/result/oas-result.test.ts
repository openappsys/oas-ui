import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASResult } from './index.js'

describe('OASResult', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与描述，status 默认 success', () => {
    const el = new OASResult()
    el.setAttribute('title', '操作成功')
    el.setAttribute('description', '已完成')
    document.body.appendChild(el)
    const sr = el.shadowRoot!
    expect(sr.textContent).toContain('操作成功')
    expect(sr.textContent).toContain('已完成')
    expect(sr.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('success')
  })

  it('error 状态渲染错误图标区域', () => {
    const el = new OASResult()
    el.setAttribute('status', 'error')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('error')
  })

  it('extra 插槽存在', () => {
    const el = new OASResult()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot[name="extra"]')).not.toBeNull()
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    function mount(attrs: Record<string, string> = {}): OASResult {
      const el = new OASResult()
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.appendChild(el)
      return el
    }

    it('挂载后宿主不再残留 title 属性，标题照常渲染进标题区', () => {
      const el = mount({ title: '操作成功' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('操作成功')
    })

    it('吸收触发的二次 update 幂等（标题不丢失）', () => {
      const el = mount({ title: '操作成功' })
      el.setAttribute('status', 'error') // 触发二次 update
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('操作成功')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新结果')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新结果')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ title: '操作成功' })
      el.setAttribute('title', '')
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照标题区有文本时恢复缓存，水合后标题不丢失', () => {
      const ref = new OASResult()
      ref.setAttribute('title', '水合结果')
      document.body.appendChild(ref)
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASResult()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-result" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('水合结果')
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })
  })
})
