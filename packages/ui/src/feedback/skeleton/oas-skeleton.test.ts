import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSkeleton } from './index.js'

function mount(attrs: Record<string, string> = {}, html = ''): OASSkeleton {
  const el = new OASSkeleton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (html) el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function block(el: OASSkeleton): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="block"]')!
}

function slot(el: OASSkeleton): HTMLSlotElement {
  return el.shadowRoot!.querySelector<HTMLSlotElement>('slot')!
}

describe('OASSkeleton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('默认渲染 3 段段落行', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(3)
  })

  it('rows 属性控制行数', () => {
    const el = mount({ rows: '5' })
    expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(5)
  })

  it('title/avatar 开关', () => {
    const el = mount({ title: '', avatar: '' })
    expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="avatar"]')).not.toBeNull()
  })

  it('active 兼容映射 sheen 动效', () => {
    const el = mount({ active: '' })
    expect(block(el).getAttribute('data-effect')).toBe('sheen')
  })

  describe('loading 受控切换（骨架 ↔ 默认 slot 真实内容）', () => {
    it('默认 loading=true：骨架可见、内容出口隐藏（兼容既有恒渲染骨架行为）', () => {
      const el = mount({}, '<p>真实内容</p>')
      expect(block(el).hasAttribute('hidden')).toBe(false)
      expect(slot(el).hasAttribute('hidden')).toBe(true)
    })

    it('loading="false"：内容出口可见、骨架隐藏', () => {
      const el = mount({ loading: 'false' }, '<p>真实内容</p>')
      expect(block(el).hasAttribute('hidden')).toBe(true)
      expect(slot(el).hasAttribute('hidden')).toBe(false)
      expect(slot(el).assignedElements().length).toBe(1)
    })

    it('loading 属性切换即时生效（受控）', () => {
      const el = mount()
      el.setAttribute('loading', 'false')
      expect(block(el).hasAttribute('hidden')).toBe(true)
      el.removeAttribute('loading')
      expect(block(el).hasAttribute('hidden')).toBe(false)
    })

    it('骨架容器 aria-hidden="true"（纯装饰，读屏静默）', () => {
      const el = mount()
      expect(block(el).getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('effect 三档动效（sheen/pulse/none）', () => {
    it('缺省无动效：data-effect=none', () => {
      const el = mount()
      expect(block(el).getAttribute('data-effect')).toBe('none')
    })

    it('effect="pulse" 呼吸动效', () => {
      const el = mount({ effect: 'pulse' })
      expect(block(el).getAttribute('data-effect')).toBe('pulse')
    })

    it('effect="sheen" 流光动效', () => {
      const el = mount({ effect: 'sheen' })
      expect(block(el).getAttribute('data-effect')).toBe('sheen')
    })

    it('effect 优先于 active：active + effect="pulse" → pulse', () => {
      const el = mount({ active: '', effect: 'pulse' })
      expect(block(el).getAttribute('data-effect')).toBe('pulse')
    })

    it('显式 effect="none" 胜过 active', () => {
      const el = mount({ active: '', effect: 'none' })
      expect(block(el).getAttribute('data-effect')).toBe('none')
    })

    it('非法 effect 值回落 active 判定', () => {
      const a = mount({ active: '', effect: 'wafe' })
      expect(block(a).getAttribute('data-effect')).toBe('sheen')
      const b = mount({ effect: 'wafe' })
      expect(block(b).getAttribute('data-effect')).toBe('none')
    })
  })

  describe('count 列表份数（整组骨架重复）', () => {
    it('count="3" 渲染 3 组', () => {
      const el = mount({ count: '3' })
      expect(el.shadowRoot!.querySelectorAll('[part="group"]').length).toBe(3)
    })

    it('缺省 1 组', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelectorAll('[part="group"]').length).toBe(1)
    })

    it('每组独立含 title/rows（count=2、rows=2、title）', () => {
      const el = mount({ count: '2', rows: '2', title: '' })
      const groups = el.shadowRoot!.querySelectorAll('[part="group"]')
      expect(groups.length).toBe(2)
      for (const g of groups) {
        expect(g.querySelectorAll('[part="title"]').length).toBe(1)
        expect(g.querySelectorAll('[part="line"]').length).toBe(2)
      }
    })

    it('非法 count 回落 1', () => {
      const el = mount({ count: 'abc' })
      expect(el.shadowRoot!.querySelectorAll('[part="group"]').length).toBe(1)
    })
  })

  describe('widths 逐行宽度', () => {
    it('widths="100%,60%" 覆盖前两行，其余行走样式默认', () => {
      const el = mount({ rows: '3', widths: '100%,60%' })
      const lines = el.shadowRoot!.querySelectorAll<HTMLElement>('[part="line"]')
      expect(lines[0]!.style.width).toBe('100%')
      expect(lines[1]!.style.width).toBe('60%')
      expect(lines[2]!.style.width).toBe('')
    })

    it('条目多于行数时多余项忽略，空段过滤', () => {
      const el = mount({ rows: '2', widths: '50%, ,30%,90%' })
      const lines = el.shadowRoot!.querySelectorAll<HTMLElement>('[part="line"]')
      expect(lines[0]!.style.width).toBe('50%')
      expect(lines[1]!.style.width).toBe('30%')
    })
  })

  describe('delay 防闪烁延迟（延迟期内骨架与内容都不渲染）', () => {
    it('loading=true + delay：延迟期内全空，到期骨架出现', () => {
      vi.useFakeTimers()
      const el = mount({ delay: '500' })
      expect(block(el).hasAttribute('hidden')).toBe(true)
      expect(slot(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(499)
      expect(block(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(1)
      expect(block(el).hasAttribute('hidden')).toBe(false)
      expect(slot(el).hasAttribute('hidden')).toBe(true)
    })

    it('延迟期内加载完成：骨架永不出现，内容直出', () => {
      vi.useFakeTimers()
      const el = mount({ delay: '500' })
      el.setAttribute('loading', 'false')
      vi.advanceTimersByTime(2000)
      expect(block(el).hasAttribute('hidden')).toBe(true)
      expect(slot(el).hasAttribute('hidden')).toBe(false)
    })

    it('断开连接清理计时器（remove 后回调不再执行）', () => {
      vi.useFakeTimers()
      const el = mount({ delay: '500' })
      el.remove()
      vi.advanceTimersByTime(1000)
      expect(block(el).hasAttribute('hidden')).toBe(true)
    })

    it('延迟期中断开重连：重新起窗、到期恢复骨架（防卡死在空窗）', () => {
      vi.useFakeTimers()
      const el = mount({ delay: '500' })
      el.remove()
      document.body.appendChild(el)
      expect(block(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(499)
      expect(block(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(1)
      expect(block(el).hasAttribute('hidden')).toBe(false)
    })

    it('延迟期内其他属性更新不重置计时窗口', () => {
      vi.useFakeTimers()
      const el = mount({ delay: '1000' })
      vi.advanceTimersByTime(600)
      el.setAttribute('rows', '5')
      vi.advanceTimersByTime(399)
      expect(block(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(1)
      expect(block(el).hasAttribute('hidden')).toBe(false)
      // rows 更新本身仍生效（窗口结束后骨架行数是新值）
      expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(5)
    })

    it('loading=false→true 翻转重新进入延迟窗口', () => {
      vi.useFakeTimers()
      const el = mount({ delay: '300', loading: 'false' })
      expect(slot(el).hasAttribute('hidden')).toBe(false)
      el.removeAttribute('loading')
      expect(block(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(300)
      expect(block(el).hasAttribute('hidden')).toBe(false)
    })

    it('delay=0 或非法值不延迟（骨架立即可见）', () => {
      const a = mount({ delay: '0' })
      expect(block(a).hasAttribute('hidden')).toBe(false)
      const b = mount({ delay: 'abc' })
      expect(block(b).hasAttribute('hidden')).toBe(false)
    })
  })

  describe('title 吸收（消除宿主原生 tooltip；title 为存在性开关）', () => {
    it('挂载后宿主不再残留 title 属性，标题形骨架块照常渲染', () => {
      const el = mount({ title: '' })
      expect(el.hasAttribute('title'), '宿主原生 title 应被吸收移除').toBe(false)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
    })

    it('吸收后二次 update 幂等（rows 变化重建不丢标题块、宿主 title 不复活）', () => {
      const el = mount({ title: '' })
      el.setAttribute('rows', '5') // 触发二次 update
      expect(el.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(5)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('title 空串属性仍表示开关在场（存在性语义保留，与值无关）', () => {
      const el = mount({ title: '' })
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      // 吸收后 removeAttribute 属宿主常态：块保持（清空语义不适用于存在性开关）
      el.removeAttribute('title')
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
    })

    it('水合恢复：快照含标题形骨架块时恢复开关缓存，水合后标题块不丢失', () => {
      const ref = mount({ title: '' })
      const snap = ref.shadowRoot!.innerHTML
      ref.remove()

      const el = new OASSkeleton()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-skeleton" data-oas-ssr-v="1">${snap}`
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="title"]')).not.toBeNull()
      expect(el.hasAttribute('title')).toBe(false)
      el.remove()
    })

    it('水合校验放宽补偿：快照缺内容出口时回退 render 全量重建（loading=false 仍可用）', () => {
      // 旧版快照（无 slot）不应被新代码部分接管：hydrate 拒绝 → render 重建完整结构
      const el = new OASSkeleton()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-skeleton" data-oas-ssr-v="1"><style>x</style><div class="block" part="block"></div>`
      el.setAttribute('loading', 'false')
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
      expect(el.shadowRoot!.querySelector('slot')!.hasAttribute('hidden')).toBe(false)
      el.remove()
    })
  })
})
