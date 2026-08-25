import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASContextMenu } from './index.js'

const ITEMS = JSON.stringify([
  { label: '复制', value: 'copy' },
  { label: '粘贴', value: 'paste' },
])

function mount(): OASContextMenu {
  const el = new OASContextMenu()
  el.setAttribute('items', ITEMS)
  el.innerHTML = `<div style="width:200px;height:100px">右键区域</div>`
  document.body.appendChild(el)
  return el
}

/** 内层 oas-menu 的影子根 */
function innerMenuRoot(el: OASContextMenu): ShadowRoot {
  const menu = el.shadowRoot!.querySelector('oas-menu')!
  return menu.shadowRoot!
}

function anchor(el: OASContextMenu): HTMLElement {
  return el.shadowRoot!.querySelector('.menu-anchor')!
}

/** 构造带 touches 的 touch 事件（happy-dom 不完整支持 Touch，挂数组兜底） */
function touchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
): TouchEvent {
  const e = new Event(type, { bubbles: true }) as unknown as TouchEvent
  Object.defineProperty(e, 'touches', { value: touches })
  return e
}

describe('OASContextMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('contextmenu 事件打开菜单并定位到鼠标位置', async () => {
    const el = mount()
    const target = el.querySelector('div')!
    target.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 80 }),
    )
    await Promise.resolve()
    expect(anchor(el).hasAttribute('hidden')).toBe(false)
    expect(anchor(el).getAttribute('style')).toContain('120px')
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount()
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'copy' })
    expect(anchor(el).hasAttribute('hidden')).toBe(true)
  })

  it('Esc 关闭菜单', async () => {
    const el = mount()
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(anchor(el).hasAttribute('hidden')).toBe(true)
  })

  describe('长按触发（移动端）', () => {
    it('长按默认 500ms 打开菜单并定位到触点', async () => {
      vi.useFakeTimers()
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
      vi.advanceTimersByTime(499)
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
      vi.advanceTimersByTime(1)
      await Promise.resolve()
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      expect(anchor(el).getAttribute('style')).toContain('100px')
      expect(anchor(el).getAttribute('style')).toContain('90px')
    })

    it('long-press-delay 属性自定义长按时长', async () => {
      vi.useFakeTimers()
      const el = mount()
      el.setAttribute('long-press-delay', '200')
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 50, clientY: 40 }]))
      vi.advanceTimersByTime(200)
      await Promise.resolve()
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })

    it('长按前大幅滑动视为滚动手势，不触发', async () => {
      vi.useFakeTimers()
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
      target.dispatchEvent(touchEvent('touchmove', [{ clientX: 150, clientY: 95 }]))
      vi.advanceTimersByTime(600)
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })

    it('计时结束前抬手不触发', async () => {
      vi.useFakeTimers()
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 90 }]))
      target.dispatchEvent(touchEvent('touchend', []))
      vi.advanceTimersByTime(600)
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })
  })

  describe('编程式定位', () => {
    it('show(x, y) 任意坐标打开菜单', () => {
      const el = mount()
      el.show(200, 150)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      expect(anchor(el).getAttribute('style')).toContain('200px')
      expect(anchor(el).getAttribute('style')).toContain('150px')
    })

    it('已打开时 show(x, y) 重定位不闪关', () => {
      const el = mount()
      el.show(100, 100)
      let opened = 0
      let closed = 0
      el.addEventListener('oas-open-change', (e: Event) => {
        if ((e as CustomEvent).detail.open) opened++
        else closed++
      })
      el.show(300, 250)
      expect(anchor(el).getAttribute('style')).toContain('300px')
      expect(anchor(el).getAttribute('style')).toContain('250px')
      expect(opened).toBe(0)
      expect(closed).toBe(0)
    })

    it('close() 编程式关闭', () => {
      const el = mount()
      el.show(100, 100)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      el.close()
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })
  })

  describe('受控 open + oas-open-change', () => {
    it('open 属性受控开关菜单', () => {
      const el = mount()
      el.setAttribute('open', '')
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      el.removeAttribute('open')
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
      el.setAttribute('open', '')
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })

    it('open 变化派发 oas-open-change（detail.open 布尔）', () => {
      const el = mount()
      const changes: boolean[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.setAttribute('open', '')
      expect(changes).toEqual([true])
      el.removeAttribute('open')
      expect(changes).toEqual([true, false])
    })

    it('初始 open 不派发 oas-open-change（仅变化时）', () => {
      const el = new OASContextMenu()
      el.setAttribute('open', '')
      el.setAttribute('items', ITEMS)
      document.body.appendChild(el)
      let called = 0
      el.addEventListener('oas-open-change', () => called++)
      el.removeAttribute('open')
      expect(called).toBe(1)
      el.setAttribute('open', '')
      expect(called).toBe(2)
    })

    it('右键触发也派发 oas-open-change', async () => {
      const el = mount()
      const changes: boolean[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.querySelector('div')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 50, clientY: 60 }),
      )
      await Promise.resolve()
      expect(changes).toEqual([true])
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(changes).toEqual([true, false])
    })

    it('show(x, y) 触发也派发 oas-open-change', () => {
      const el = mount()
      const changes: boolean[] = []
      el.addEventListener('oas-open-change', (e: Event) =>
        changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
      )
      el.show(100, 100)
      expect(changes).toEqual([true])
      el.close()
      expect(changes).toEqual([true, false])
    })
  })

  describe('右键别处关闭/重定位', () => {
    it('页面别处右键关闭已打开的菜单（避免多菜单并存）', () => {
      const el = mount()
      el.show(100, 100)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      document.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 500, clientY: 400 }),
      )
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })

    it('组件自身区域内右键不关闭且重定位', () => {
      const el = mount()
      el.show(100, 100)
      el.querySelector('div')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 180 }),
      )
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      expect(anchor(el).getAttribute('style')).toContain('200px')
    })

    it('外部点击关闭后再次右键可重新打开', async () => {
      const el = mount()
      const target = el.querySelector('div')!
      target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
      await Promise.resolve()
      document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 999, clientY: 999 }))
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
      target.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 80, clientY: 70 }),
      )
      await Promise.resolve()
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })
  })

  describe('滚动关闭', () => {
    it('默认滚动页面关闭菜单（fixed 定位与滚动脱节修复）', () => {
      const el = mount()
      el.show(100, 100)
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
      window.dispatchEvent(new Event('scroll'))
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })

    it('close-on-scroll="false" 时滚动不关闭', () => {
      const el = mount()
      el.setAttribute('close-on-scroll', 'false')
      el.show(100, 100)
      window.dispatchEvent(new Event('scroll'))
      expect(anchor(el).hasAttribute('hidden')).toBe(false)
    })

    it('滚动关闭后菜单不再持有滚动监听（再次打开滚动仍关闭）', () => {
      const el = mount()
      el.show(100, 100)
      window.dispatchEvent(new Event('scroll'))
      el.show(100, 100)
      window.dispatchEvent(new Event('scroll'))
      expect(anchor(el).hasAttribute('hidden')).toBe(true)
    })
  })
})

// —— 子元素声明式通道（oas-context-menu-item / oas-context-menu-group / oas-context-menu-divider）——
// 与 menu 子元素通道同范式：items 属性显式设置时数据驱动优先，否则解析子元素收敛到同一渲染路径。
// 载体元素直接继承 menu 系数据载体（display:none + observedAttributes + render），宿主零重复实现。

/** 子元素通道挂载：light DOM 填右键区域 + 数据载体（不设 items 属性） */
function mountContextChild(html: string, attrs: Record<string, string> = {}): OASContextMenu {
  const el = document.createElement('oas-context-menu') as OASContextMenu
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('OASContextMenu 子元素声明式通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('基础：普通项/分组/divider/嵌套子菜单混排解析渲染，右键打开后菜单项齐全、点击选中事件 detail 与 items 通道一致', async () => {
    const el = mountContextChild(`
      <div>右键区域</div>
      <oas-context-menu-group label="剪贴板">
        <oas-context-menu-item value="copy">复制</oas-context-menu-item>
        <oas-context-menu-item value="paste">粘贴</oas-context-menu-item>
      </oas-context-menu-group>
      <oas-context-menu-divider></oas-context-menu-divider>
      <oas-context-menu-item value="edit">编辑
        <oas-context-menu-item value="select-all">全选</oas-context-menu-item>
      </oas-context-menu-item>
    `)
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    const root = innerMenuRoot(el)
    // 分组标题 + 组内子项 + divider + 嵌套项（顶层 item = 复制/粘贴/编辑）
    expect(root.querySelector<HTMLElement>('[part="group"]')!.textContent).toBe('剪贴板')
    const menuChildren = [...root.querySelector('.menu')!.children]
    expect(menuChildren.filter((c) => c.classList.contains('item')).length).toBe(3)
    expect(menuChildren.filter((c) => c.classList.contains('divider')).length).toBe(1)
    // 嵌套子菜单 hover 展开出子项（与 items 通道一致）
    const edit = root.querySelector<HTMLElement>('[part="item"][data-value="edit"]')!
    expect(edit.getAttribute('role')).toBe('menuitem')
    edit.dispatchEvent(new MouseEvent('mouseenter'))
    expect(edit.getAttribute('aria-expanded')).toBe('true')
    expect(root.querySelector('[part="item"][data-value="select-all"]')).not.toBeNull()
    // 点击选中事件 detail 与 items 通道一致（{ value } + 关闭）
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(root.querySelector('[part="item"][data-value="copy"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'copy' })
    expect(anchor(el).hasAttribute('hidden')).toBe(true)
  })

  it('items 属性显式设置时优先（子元素被忽略）', async () => {
    const el = mountContextChild(
      `<div>右键区域</div><oas-context-menu-item value="home">首页</oas-context-menu-item>`,
      { items: JSON.stringify([{ label: '数据项', value: 'data' }]) },
    )
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    const labels = [...innerMenuRoot(el).querySelectorAll('[part="item"] .label')].map(
      (l) => l.textContent,
    )
    expect(labels).toEqual(['数据项'])
    expect(innerMenuRoot(el).querySelector('[data-value="home"]')).toBeNull()
  })

  it('属性映射：checkbox 勾选 / danger 红字 / href 链接项 / loading / disabled', async () => {
    const el = mountContextChild(`
      <div>右键区域</div>
      <oas-context-menu-item value="grid" kind="checkbox">网格线</oas-context-menu-item>
      <oas-context-menu-item value="del" danger>删除</oas-context-menu-item>
      <oas-context-menu-item value="docs" href="/guide" target="_blank" rel="noopener">文档</oas-context-menu-item>
      <oas-context-menu-item value="save" loading>加载中</oas-context-menu-item>
      <oas-context-menu-item value="off" disabled>禁用</oas-context-menu-item>
    `)
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    const root = innerMenuRoot(el)
    // checkbox：menuitemcheckbox + 方块勾选框
    const grid = root.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(grid.getAttribute('role')).toBe('menuitemcheckbox')
    expect(grid.querySelector('.check--box')).not.toBeNull()
    // danger 红字类
    expect(root.querySelector('[data-value="del"]')!.classList.contains('danger')).toBe(true)
    // href 链接项渲染为 <a>
    const docs = root.querySelector<HTMLAnchorElement>('[part="item"][data-value="docs"]')!
    expect(docs.tagName).toBe('A')
    expect(docs.getAttribute('href')).toBe('/guide')
    expect(docs.getAttribute('target')).toBe('_blank')
    expect(docs.getAttribute('rel')).toBe('noopener')
    // loading：spinner + aria-busy + 禁点
    const save = root.querySelector<HTMLElement>('[part="item"][data-value="save"]')!
    expect(save.classList.contains('loading')).toBe(true)
    expect(save.getAttribute('aria-busy')).toBe('true')
    expect(save.getAttribute('aria-disabled')).toBe('true')
    expect(save.querySelector('.spin')).not.toBeNull()
    // disabled 禁点
    const off = root.querySelector<HTMLElement>('[part="item"][data-value="off"]')!
    expect(off.getAttribute('aria-disabled')).toBe('true')
    // loading/disabled 点击不派发 select
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    save.click()
    off.click()
    expect(detail).toBeUndefined()
    // checkbox 点击：勾选写回内层菜单 value（数组），宿主转发 { value }（与 items 通道一致）
    grid.click()
    expect(detail).toMatchObject({ value: 'grid' })
    expect(
      innerMenuRoot(el).querySelector<HTMLElement>('[part="item"][data-value="grid"]')!.getAttribute(
        'aria-checked',
      ),
    ).toBe('true')
    // contextmenu 宿主不写回 value（既有语义，仅转发事件）
    expect(el.getAttribute('value')).toBeNull()
  })

  it('MutationObserver：运行时 append oas-context-menu-item 后菜单刷新出现新项', async () => {
    const el = mountContextChild(`
      <div>右键区域</div>
      <oas-context-menu-item value="copy">复制</oas-context-menu-item>
    `)
    el.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await Promise.resolve()
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(1)
    const item = document.createElement('oas-context-menu-item')
    item.setAttribute('value', 'paste')
    item.textContent = '粘贴'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
    expect(innerMenuRoot(el).querySelector('[part="item"][data-value="paste"]')).not.toBeNull()
  })

  it('右键打开定位 + Escape 关闭不受影响（子元素通道下同样走定位/Esc 关闭路径）', async () => {
    const el = mountContextChild(`
      <div>右键区域</div>
      <oas-context-menu-item value="copy">复制</oas-context-menu-item>
    `)
    el.querySelector('div')!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 80 }),
    )
    await Promise.resolve()
    expect(anchor(el).hasAttribute('hidden')).toBe(false)
    expect(anchor(el).getAttribute('style')).toContain('120px')
    expect(anchor(el).getAttribute('style')).toContain('80px')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(anchor(el).hasAttribute('hidden')).toBe(true)
  })
})
