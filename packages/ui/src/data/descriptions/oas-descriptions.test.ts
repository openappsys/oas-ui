import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDescriptions, OASDescriptionsItem } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDescriptions {
  const el = new OASDescriptions()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
    <oas-descriptions-item label="年龄"><span>30</span></oas-descriptions-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASDescriptions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标签与内容', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="items"]')).not.toBeNull()
    const items = el.querySelectorAll('oas-descriptions-item')
    expect(items.length).toBe(2)
  })

  it('column 属性生效', () => {
    const el = mount({ column: '2' })
    expect(el.shadowRoot!.querySelector('[part="items"]')!.getAttribute('data-column')).toBe('2')
  })

  describe('title 吸收（消除宿主原生 tooltip）', () => {
    function titleEl(el: OASDescriptions): HTMLElement {
      return el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
    }

    it('挂载后宿主不再残留 title 属性，标题渲染进标题区', () => {
      const el = mount({ title: '基本信息' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(titleEl(el).textContent).toBe('基本信息')
    })

    it('吸收触发的二次 update 幂等（标题不丢失、无死循环）', () => {
      const el = mount({ title: '基本信息' })
      el.setAttribute('data-x', '1')
      expect(titleEl(el).textContent).toBe('基本信息')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('运行时改 title 属性：新值吸收渲染，宿主仍无残留', () => {
      const el = mount({ title: '旧标题' })
      el.setAttribute('title', '新标题')
      expect(titleEl(el).textContent).toBe('新标题')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title="" 清空标题（属性在场=宿主意图）', () => {
      const el = mount({ title: '基本信息' })
      el.setAttribute('title', '')
      expect(titleEl(el).textContent).toBe('')
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合从快照标题区恢复 title 缓存（宿主无 title，标题不丢）', () => {
      const el = new OASDescriptions()
      el.shadowRoot!.innerHTML =
        '<meta data-oas-ssr="oas-descriptions" data-oas-ssr-v="1"><style></style>' +
        '<div class="title" part="title">快照标题</div>' +
        '<div class="items" part="items"><slot></slot></div>'
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      expect(titleEl(el).textContent).toBe('快照标题')
    })
  })
})
