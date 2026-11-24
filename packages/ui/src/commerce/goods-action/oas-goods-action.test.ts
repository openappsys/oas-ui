import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASGoodsAction } from './index.js'
import type { GoodsActionButton, GoodsActionItem } from './oas-goods-action.js'

function mount(attrs: Record<string, string> = {}): OASGoodsAction {
  const el = new OASGoodsAction()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function iconButtons(el: OASGoodsAction): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="icon-button"]')]
}

function actionButtons(el: OASGoodsAction): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="button"]')]
}

const ITEMS = JSON.stringify([{ key: 'favorite', badge: 0 }, { key: 'shop' }, { key: 'cart', badge: 120 }])

const ACTIONS = JSON.stringify([
  { key: 'cart', text: '加入购物车' },
  { key: 'buy', text: '立即购买', primary: true },
])

describe('oas-goods-action', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('icon 组：按 key 取 i18n 默认文案，未知名回退 key', () => {
    const el = mount({ items: ITEMS })
    const btns = iconButtons(el)
    expect(btns).toHaveLength(3)
    expect(btns[0]!.getAttribute('aria-label')).toBe('收藏')
    expect(btns[1]!.getAttribute('aria-label')).toBe('店铺')
    // 角标数值并入可访问名称（读屏可听到数量）
    expect(btns[2]!.getAttribute('aria-label')).toBe('购物车 120')
  })

  it('icon 组：内置图标按 key 映射渲染（收藏/店铺/购物车）', () => {
    const el = mount({ items: ITEMS })
    const icons = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="icon"] svg')]
    expect(icons).toHaveLength(3)
    // 三个默认图标各自独立（不同 path），不是同一图标复用
    const paths = icons.map((svg) => svg.innerHTML)
    expect(new Set(paths).size).toBe(3)
  })

  it('角标：>0 显示，>99 收敛为 99+，0/缺省不渲染', () => {
    const el = mount({ items: ITEMS })
    const badges = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="badge"]')].filter((n) => !n.hidden)
    expect(badges).toHaveLength(1)
    expect(badges[0]!.textContent).toBe('99+')
    expect(iconButtons(el)[0]!.querySelector<HTMLElement>('[part="badge"]')!.hidden).toBe(true)
  })

  it('icon：属性可覆盖默认图标（自定义注册名优先）', () => {
    const el = mount({ items: JSON.stringify([{ key: 'favorite', icon: 'star' }]) })
    const overridden = el.shadowRoot!.querySelector('[part="icon"] svg')!
    expect(overridden.innerHTML).toContain('<path')
    expect(iconButtons(el)[0]!.getAttribute('aria-label')).toBe('收藏')
  })

  it('icon 覆盖：渲染的是覆盖图标本体（与内置图标 path 不同，非「存在即通过」）', () => {
    const withOverride = mount({ items: JSON.stringify([{ key: 'favorite', icon: 'star' }]) })
    const withDefault = mount({ items: JSON.stringify([{ key: 'favorite' }]) })
    const d = (host: OASGoodsAction): string =>
      host.shadowRoot!.querySelector('[part="icon"] svg')!.innerHTML.match(/d="([^"]+)"/)?.[1] ?? ''
    expect(d(withOverride)).not.toBe('')
    expect(d(withDefault)).not.toBe('')
    expect(d(withOverride)).not.toBe(d(withDefault))
    // favorite 的内置图标是心形，star 覆盖后不再是心形
    expect(d(withOverride)).not.toContain(d(withDefault))
  })

  it('icon 未注册：告警一次并回退内置图标（同一名字不重复告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        items: JSON.stringify([
          { key: 'favorite', icon: 'not-a-registered-icon' },
          { key: 'shop', icon: 'not-a-registered-icon' },
        ]),
      })
      const iconWarns = warn.mock.calls.filter((c) => String(c[0]).includes('not-a-registered-icon'))
      expect(iconWarns).toHaveLength(1)
      const icons = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="icon"] svg')]
      expect(icons).toHaveLength(2)
      // 回退到内置图标：favorite 心形 + shop 组织图标（不同 path）
      const paths = icons.map((svg) => svg.innerHTML)
      expect(new Set(paths).size).toBe(2)
    } finally {
      warn.mockRestore()
    }
  })

  it('icon 未注册且该 key 无内置图标：不渲染图标但文字仍可读', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ items: JSON.stringify([{ key: 'custom', label: '自定义', icon: 'nope' }]) })
      expect(el.shadowRoot!.querySelector('[part="icon"]')).toBeNull()
      expect(iconButtons(el)[0]!.querySelector('[part="label"]')!.textContent).toBe('自定义')
    } finally {
      warn.mockRestore()
    }
  })

  // ---------------------------------------------------------------------------
  // property 通道（框架按「key in el」走 property 赋值时的数据入口）
  // ---------------------------------------------------------------------------
  it('property 通道：items/actions 为 get+set 访问器，接受数组与 JSON 字符串', () => {
    const el = mount()
    const proto = Object.getOwnPropertyDescriptors(OASGoodsAction.prototype)
    for (const key of ['items', 'actions']) {
      expect(typeof proto[key]!.get, `${key}.get`).toBe('function')
      expect(typeof proto[key]!.set, `${key}.set`).toBe('function')
    }
    el.items = JSON.parse(ITEMS) as GoodsActionItem[]
    el.actions = JSON.parse(ACTIONS) as GoodsActionButton[]
    expect(el.getAttribute('items')).toBe(ITEMS)
    expect(el.getAttribute('actions')).toBe(ACTIONS)
    expect(el.items.map((i) => i.key)).toEqual(['favorite', 'shop', 'cart'])
    expect(iconButtons(el)).toHaveLength(3)
    expect(actionButtons(el)).toHaveLength(2)

    el.items = '[{"key":"cart","badge":2}]'
    expect(el.items).toHaveLength(1)
    expect(iconButtons(el)).toHaveLength(1)
    el.actions = '[]'
    expect(actionButtons(el)).toHaveLength(0)
  })

  it('active 项：aria-pressed=true 且带 data-active', () => {
    const el = mount({ items: JSON.stringify([{ key: 'favorite', active: true }]) })
    const btn = iconButtons(el)[0]!
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-active')).toBe('true')
  })

  it('点击 icon 派发 oas-action-click（source=icon）', () => {
    const el = mount({ items: ITEMS })
    let detail: { key?: string; source?: string } | null = null
    el.addEventListener('oas-action-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    iconButtons(el)[2]!.click()
    expect(detail).toEqual({ key: 'cart', source: 'icon' })
  })

  it('主按钮组：渲染文本，primary 标记主次，点击派发 source=button', () => {
    const el = mount({ items: ITEMS, actions: ACTIONS })
    const btns = actionButtons(el)
    expect(btns).toHaveLength(2)
    expect(btns[0]!.textContent).toBe('加入购物车')
    expect(btns[0]!.getAttribute('data-primary')).toBe('false')
    expect(btns[1]!.getAttribute('data-primary')).toBe('true')
    let detail: { key?: string; source?: string } | null = null
    el.addEventListener('oas-action-click', (e) => {
      detail = (e as CustomEvent).detail
    })
    btns[1]!.click()
    expect(detail).toEqual({ key: 'buy', source: 'button' })
  })

  it('单项 disabled 与宿主 disabled：按钮禁用且不派发事件', () => {
    const el = mount({
      items: ITEMS,
      actions: JSON.stringify([{ key: 'buy', text: '立即购买', primary: true, disabled: true }]),
    })
    let fired = 0
    el.addEventListener('oas-action-click', () => {
      fired++
    })
    const btn = actionButtons(el)[0]!
    expect(btn.disabled).toBe(true)
    btn.click()
    expect(fired).toBe(0)
    el.setAttribute('disabled', '')
    expect(iconButtons(el)[0]!.disabled).toBe(true)
    iconButtons(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('nav 可访问名称：缺省走 i18n，label 属性可覆盖', () => {
    const el = mount({ items: ITEMS })
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('商品操作')
    el.setAttribute('label', '底部操作')
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('底部操作')
  })

  it('非法 JSON / 非数组：不抛错且渲染空骨架', () => {
    const el = mount({ items: '{bad json', actions: '{"a":1}' })
    expect(iconButtons(el)).toHaveLength(0)
    expect(actionButtons(el)).toHaveLength(0)
  })

  it('样式只走 token 且布局为逻辑方向（RTL 安全）', () => {
    const el = mount({ items: ITEMS })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-color-')
    expect(css).not.toMatch(/margin-(left|right)/)
    expect(css).not.toMatch(/padding-(left|right)/)
  })

  it('actions[].loading：禁用点击 + aria-busy + spinner，且与 disabled 正交', () => {
    const el = mount({
      items: ITEMS,
      actions: JSON.stringify([{ key: 'buy', text: '立即购买', loading: true }]),
    })
    let fired = 0
    el.addEventListener('oas-action-click', () => {
      fired++
    })
    const btn = actionButtons(el)[0]!
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.querySelector<HTMLElement>('[part="button-spinner"]')!.hidden).toBe(false)
    btn.click()
    expect(fired).toBe(0)
    // loading 移除后恢复可用且无 spinner
    el.actions = [{ key: 'buy', text: '立即购买' }] as GoodsActionButton[]
    const restored = actionButtons(el)[0]!
    expect(restored.disabled).toBe(false)
    expect(restored.hasAttribute('aria-busy')).toBe(false)
    expect(restored.querySelector<HTMLElement>('[part="button-spinner"]')!.hidden).toBe(true)
  })

  it('loading 与 disabled 同时在场：仍是一个按钮，两态标记齐备', () => {
    const el = mount({
      actions: JSON.stringify([{ key: 'buy', text: '已售罄', disabled: true, loading: true }]),
    })
    const btn = actionButtons(el)[0]!
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.getAttribute('data-loading')).toBe('true')
  })

  it('actions[].type：合法值落 data-type；type=primary 不依赖 primary 标志', () => {
    const el = mount({
      actions: JSON.stringify([
        { key: 'ok', text: '成功', type: 'success' },
        { key: 'bad', text: '非法', type: 'nope' },
        { key: 'pri', text: '主色', type: 'primary' },
        { key: 'dgr', text: '危险', type: 'danger' },
      ]),
    })
    const btns = actionButtons(el)
    expect(btns[0]!.getAttribute('data-type')).toBe('success')
    // 非法 type 回落 default（无 type 标记以外的视觉通道）
    expect(btns[1]!.getAttribute('data-type')).toBe('default')
    expect(btns[1]!.getAttribute('data-primary')).toBe('false')
    // 显式 type=primary 等价主色（data-primary 保持原语义不受 type 影响）
    expect(btns[2]!.getAttribute('data-type')).toBe('primary')
    expect(btns[2]!.getAttribute('data-primary')).toBe('false')
    expect(btns[3]!.getAttribute('data-type')).toBe('danger')
    // 未写 type 时维持现状：default / primary 标志照旧
    const plain = mount({ actions: ACTIONS })
    const p = actionButtons(plain)
    expect(p[0]!.getAttribute('data-type')).toBe('default')
    expect(p[1]!.getAttribute('data-type')).toBe('primary')
    expect(p[1]!.getAttribute('data-primary')).toBe('true')
  })

  it('items[].color：预设名走 preset token，任意色值按宿主声明透传', () => {
    const el = mount({
      items: JSON.stringify([
        { key: 'favorite', color: 'red' },
        { key: 'custom', label: '自定义', color: '#0b6cff' },
      ]),
    })
    const btns = iconButtons(el)
    expect(btns[0]!.style.getPropertyValue('--oas-goods-action-item-color')).toBe('var(--oas-preset-red-text)')
    expect(btns[1]!.style.getPropertyValue('--oas-goods-action-item-color')).toBe('#0b6cff')
    // 未写 color 不注入变量（缺省通道与现状等价）
    expect(btns[0]!.getAttribute('data-color')).toBe('true')
    expect(iconButtons(mount({ items: ITEMS }))[0]!.getAttribute('data-color')).toBe('false')
  })
})
