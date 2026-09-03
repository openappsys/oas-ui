import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core'
import { OASBadge } from './badge/index.js'
import { OASButtonGroup } from './button-group/index.js'
import { OASIcon } from './icon/index.js'
import { OASKbd } from './kbd/index.js'
import { OASLabel } from './label/index.js'
import { OASLink } from './link/index.js'
import { OASSpace } from './space/index.js'
import { OASVisuallyHidden } from './visually-hidden/index.js'
import { OAStooltip } from '../feedback/tooltip/index.js'
import { OASPopover } from '../feedback/popover/index.js'
import { OASConfigProvider } from '../framework/config-provider/index.js'
import { OASApp } from '../framework/app/index.js'

/**
 * 基础纯展示 + 浮层触发 + 框架级容器 DSD 真水合批次 5 单测（对应 SSR 白名单收尾）。
 *
 * 验证三件事（与 form/feedback/data/nav-layout 批次同构）：
 * 1. 真水合接管：注入「真实 template 渲染出的快照 + 指纹 meta」后 upgrade，
 *    hydrate() 直接接管——style DOM 引用保持同一对象（shadow 未重建）、指纹移除、关键结构仍在。
 * 2. 回退：快照缺关键结构时 hydrate 返回 false → render 全量重建，功能仍正常。
 * 3. 交互可触发：水合后 tooltip hover 显示、popover 点击切换、button-group 选中、
 *    link 点击派发、icon 属性变化更新等。
 */

type Fixture = {
  name: string
  cls: new () => OASElement
  /** 在参照渲染与水合实例上施加相同初始属性/light DOM */
  setup?: (el: OASElement) => void
  /** 水合接管后应存在的关键结构选择器 */
  probe: string
  /** 快照是否含 <style>（纯 slot 骨架组件可能无内联样式） */
  hasStyle?: boolean
}

const FIXTURES: Fixture[] = [
  {
    name: 'badge',
    cls: OASBadge,
    setup: (e) => {
      e.setAttribute('value', '5')
      e.textContent = '消息'
    },
    probe: '.badge',
  },
  {
    name: 'button-group',
    cls: OASButtonGroup,
    setup: (e) => e.setAttribute('value', 'a'),
    probe: '[part="group"]',
  },
  {
    name: 'icon',
    cls: OASIcon,
    setup: (e) => e.setAttribute('name', 'check'),
    probe: 'svg',
    hasStyle: false,
  },
  {
    name: 'kbd',
    cls: OASKbd,
    setup: (e) => e.setAttribute('keys', 'Ctrl C'),
    probe: '[part="kbd"]',
  },
  {
    name: 'label',
    cls: OASLabel,
    setup: (e) => e.setAttribute('required', ''),
    probe: '[part="label"]',
  },
  {
    name: 'link',
    cls: OASLink,
    setup: (e) => {
      e.setAttribute('href', '/detail')
      e.setAttribute('type', 'primary')
    },
    probe: 'a',
  },
  {
    name: 'space',
    cls: OASSpace,
    setup: (e) => e.setAttribute('size', 'small'),
    probe: 'slot',
    hasStyle: false,
  },
  { name: 'visually-hidden', cls: OASVisuallyHidden, probe: 'slot' },
  {
    name: 'tooltip',
    cls: OAStooltip,
    setup: (e) => {
      e.setAttribute('content', '提示')
      e.innerHTML = '<button>悬停</button>'
    },
    probe: '.tip',
  },
  {
    name: 'popover',
    cls: OASPopover,
    setup: (e) => {
      e.setAttribute('title', '标题')
      e.innerHTML = '<button>点击</button>'
    },
    probe: '.panel',
  },
  {
    name: 'config-provider',
    cls: OASConfigProvider,
    setup: (e) => e.setAttribute('theme', 'dark'),
    probe: 'slot',
  },
  { name: 'app', cls: OASApp, probe: 'slot' },
]

/** 渲染一个参照实例并返回其 shadow 快照（SSR 场景等价物） */
function captureSnapshot(cls: new () => OASElement, setup?: (el: OASElement) => void): string {
  const el = new cls()
  setup?.(el)
  document.body.appendChild(el)
  const html = el.shadowRoot!.innerHTML
  el.remove()
  return html
}

/** 注入快照 + 指纹后升级（模拟浏览器 DSD upgrade） */
function upgradeFromSnapshot(
  cls: new () => OASElement,
  shadowHtml: string,
  setup?: (el: OASElement) => void,
): { el: OASElement; styleRef: Element | null } {
  const el = new cls()
  const tag = el.tagName.toLowerCase()
  el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1">${shadowHtml}`
  setup?.(el)
  const styleRef = el.shadowRoot!.querySelector('style')
  document.body.appendChild(el)
  return { el, styleRef }
}

describe('基础纯展示 + 浮层触发 + 框架容器 DSD 真水合批次 5', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  for (const f of FIXTURES) {
    it(`真水合接管：${f.name} hydrate 成功、shadow 不重建（style 引用保持）、指纹移除、关键结构保持`, () => {
      const snap = captureSnapshot(f.cls, f.setup)
      const { el, styleRef } = upgradeFromSnapshot(f.cls, snap, f.setup)

      // hydrate 接管：style 为同一 DOM 对象（shadow 未重建；无 style 组件 null===null 亦成立）
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
      // 指纹 meta 已移除
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 关键结构仍在
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
      // 快照确实含关键结构（保证用例在测真水合而非空快照）
      if (f.hasStyle !== false) expect(snap).toContain('<style>')
      expect(snap).not.toContain('data-oas-ssr')
    })

    it(`回退：${f.name} 快照缺关键结构时 hydrate 返回 false → render 全量重建`, () => {
      const el = new f.cls()
      const tag = el.tagName.toLowerCase()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1"><span>broken</span>`
      f.setup?.(el)
      document.body.appendChild(el)
      // render 重建出完整结构，指纹被重建清掉
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    })
  }

  it('交互可触发：水合后 tooltip hover 显示、popover 点击切换、badge 值更新', () => {
    // oas-tooltip：light DOM 按钮 mouseenter → open（定位在触发时计算，aria-hidden 翻转）
    const ttSnap = captureSnapshot(OAStooltip, (e) => {
      e.setAttribute('content', '提示')
      e.innerHTML = '<button>悬停</button>'
    })
    const tt = upgradeFromSnapshot(OAStooltip, ttSnap, (e) => {
      e.setAttribute('content', '提示')
      e.innerHTML = '<button>悬停</button>'
    }).el
    ;(tt.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    expect(tt.shadowRoot!.querySelector('.tip')!.getAttribute('aria-hidden')).toBe('false')
    ;(tt.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true }),
    )
    expect(tt.shadowRoot!.querySelector('.tip')!.getAttribute('aria-hidden')).toBe('true')

    // oas-popover：点击触发按钮 → 面板展开
    const pvSnap = captureSnapshot(OASPopover, (e) => {
      e.setAttribute('title', '标题')
      e.innerHTML = '<button>点击</button>'
    })
    const pv = upgradeFromSnapshot(OASPopover, pvSnap, (e) => {
      e.setAttribute('title', '标题')
      e.innerHTML = '<button>点击</button>'
    }).el
    ;(pv.querySelector('button') as HTMLElement).click()
    expect(pv.shadowRoot!.querySelector('.panel')!.getAttribute('aria-hidden')).toBe('false')

    // oas-badge：水合后改 value 增量同步
    const bdSnap = captureSnapshot(OASBadge, (e) => {
      e.setAttribute('value', '5')
      e.textContent = '消息'
    })
    const bd = upgradeFromSnapshot(OASBadge, bdSnap, (e) => {
      e.setAttribute('value', '5')
      e.textContent = '消息'
    }).el
    expect(bd.shadowRoot!.querySelector('.badge')!.textContent).toBe('5')
    bd.setAttribute('value', '10')
    expect(bd.shadowRoot!.querySelector('.badge')!.textContent).toBe('10')
  })

  it('交互可触发：水合后 button-group 点击选中、link 点击派发、icon 换名更新', () => {
    // oas-button-group：水合后点击代理仍生效（happy-dom 下 innerHTML 解析的自定义元素
    // 不一定升级，但组的同步/代理只依赖属性，派发 composed oas-click 等价于子按钮升级后的冒泡）
    const bgSnap = captureSnapshot(OASButtonGroup, (e) => e.setAttribute('value', 'a'))
    const bg = new OASButtonGroup()
    bg.setAttribute('value', 'a')
    bg.innerHTML = '<oas-button value="a">A</oas-button><oas-button value="b">B</oas-button>'
    bg.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-button-group" data-oas-ssr-v="1">${bgSnap}`
    document.body.appendChild(bg)
    const btnA = bg.querySelector<OASElement>('oas-button[value="a"]')!
    const btnB = bg.querySelector<OASElement>('oas-button[value="b"]')!
    // 组对 light DOM 的同步：value=a 时 a 选中、b 未选中
    expect(btnA.getAttribute('aria-pressed')).toBe('true')
    expect(btnB.getAttribute('aria-pressed')).toBe('false')
    let bgDetail: unknown = null
    bg.addEventListener('oas-change', (e: Event) => (bgDetail = (e as CustomEvent).detail))
    btnB.dispatchEvent(new CustomEvent('oas-click', { bubbles: true, composed: true }))
    expect(bgDetail).toEqual({ value: 'b' })
    expect(bg.getAttribute('value')).toBe('b')
    expect(btnA.getAttribute('aria-pressed')).toBe('false')
    expect(btnB.getAttribute('aria-pressed')).toBe('true')

    // oas-link：点击 → oas-click 派发
    const lkSnap = captureSnapshot(OASLink, (e) => {
      e.setAttribute('href', '/detail')
      e.textContent = '详情'
    })
    const lk = upgradeFromSnapshot(OASLink, lkSnap, (e) => {
      e.setAttribute('href', '/detail')
      e.textContent = '详情'
    }).el
    let lkDetail: unknown = null
    lk.addEventListener('oas-click', (e: Event) => (lkDetail = (e as CustomEvent).detail))
    lk.shadowRoot!.querySelector<HTMLElement>('a')!.click()
    expect(lkDetail).toEqual({ originalEvent: expect.any(MouseEvent) })

    // oas-icon：水合后换 name → svg path 更新（不重建宿主引用）
    const icSnap = captureSnapshot(OASIcon, (e) => e.setAttribute('name', 'check'))
    const ic = upgradeFromSnapshot(OASIcon, icSnap, (e) => e.setAttribute('name', 'check')).el
    const svg = ic.shadowRoot!.querySelector('svg')!
    ic.setAttribute('name', 'close')
    expect(ic.shadowRoot!.querySelector('svg')).toBe(svg)
    expect(ic.shadowRoot!.querySelector('path')!.getAttribute('d')).toContain('M4 4 L12 12')
  })

  it('交互可触发：水合后 label 点击聚焦 for 目标、kbd keys 更新、config-provider theme 同步', () => {
    // oas-label：点击 → for 目标聚焦
    const field = document.createElement('input')
    field.id = 'name-field'
    document.body.appendChild(field)
    const lbSnap = captureSnapshot(OASLabel, (e) => {
      e.setAttribute('for', 'name-field')
      e.textContent = '姓名'
    })
    const lb = upgradeFromSnapshot(OASLabel, lbSnap, (e) => {
      e.setAttribute('for', 'name-field')
      e.textContent = '姓名'
    }).el
    lb.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.click()
    expect(document.activeElement).toBe(field)

    // oas-kbd：水合后改 keys 重渲键帽
    const kbSnap = captureSnapshot(OASKbd, (e) => e.setAttribute('keys', 'Ctrl C'))
    const kb = upgradeFromSnapshot(OASKbd, kbSnap, (e) => e.setAttribute('keys', 'Ctrl C')).el
    expect(kb.shadowRoot!.querySelectorAll('[part="key"]').length).toBe(2)
    kb.setAttribute('keys', 'Shift X')
    // 语义键名 Shift → 映射为符号 ⇧（abbr title 全称）
    expect(kb.shadowRoot!.querySelector('[part="key"]')!.textContent).toBe('⇧')
    expect(kb.shadowRoot!.querySelector('[part="key"] abbr')!.getAttribute('title')).toBe('Shift')

    // oas-config-provider：水合后 theme 属性 → data-theme 同步
    const cpSnap = captureSnapshot(OASConfigProvider, (e) => e.setAttribute('theme', 'dark'))
    const cp = upgradeFromSnapshot(OASConfigProvider, cpSnap, (e) =>
      e.setAttribute('theme', 'dark'),
    ).el
    expect(cp.dataset.theme).toBe('dark')
    cp.setAttribute('theme', 'light')
    expect(cp.dataset.theme).toBe('light')
  })
})
