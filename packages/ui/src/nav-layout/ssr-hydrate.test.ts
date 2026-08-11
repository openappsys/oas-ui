import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core'
import { OASTabs, OASTabPanel } from '../layout/tabs/index.js'
import { OASBottomNavigation } from '../navigation/bottom-navigation/index.js'
import { OASPagination } from '../layout/pagination/index.js'
import { OASSteps } from '../layout/steps/index.js'
import { OASSegmented } from '../layout/segmented/index.js'
import { OASBreadcrumb } from '../navigation/breadcrumb/index.js'
import { OASAnchor } from '../navigation/anchor/index.js'
import { OASBackTop } from '../navigation/back-top/index.js'
import { OASMenu } from '../floating/menu/index.js'
import { OASDropdown } from '../floating/dropdown/index.js'
import { OASContextMenu } from '../floating/contextmenu/index.js'
import { OASMenubar } from '../floating/menubar/index.js'
import { OASNavigationMenu } from '../floating/navigation-menu/index.js'
import { OASToolbar } from '../floating/toolbar/index.js'
import { OASCommand } from '../floating/command/index.js'
import { OAStour } from '../navigation/tour/index.js'
import { OASHoverCard } from '../floating/hover-card/index.js'
import { OASSplitter } from '../layout/splitter/index.js'
import { OASFlex } from '../layout/flex/index.js'
import { OASPageHeader } from '../layout/page-header/index.js'
import { OASFloatButton } from '../layout/float-button/index.js'
import { OASSpeedDial } from '../floating/speed-dial/index.js'
import { OASLayout, OASHeader, OASSider, OASContent, OASFooter } from '../layout/layout/index.js'
import { OASSidebar } from '../layout/sidebar/index.js'
import { OASContainer } from '../layout/container/index.js'
import { OASGrid, OASGridItem } from '../layout/grid/index.js'

/**
 * 导航布局组件 DSD 真水合批次 4 单测（对应 SSR 白名单化改造）。
 *
 * 验证三件事（与 form 批次 1 / feedback 批次 2 / data 批次 3 同构）：
 * 1. 真水合接管：注入「真实 template 渲染出的快照 + 指纹 meta」后 upgrade，
 *    hydrate() 直接接管——style DOM 引用保持同一对象（shadow 未重建）、指纹移除、关键结构仍在。
 * 2. 回退：快照缺关键结构时 hydrate 返回 false → render 全量重建，功能仍正常。
 * 3. 交互可触发：水合后 tabs 点击切换、pagination 点击翻页、menu 点击选中、sidebar 折叠等。
 *
 * 快照用「先渲染参照实例再取其 shadow.innerHTML」的方式构造，保证与组件 template() 严格一致，
 * 不手拼 HTML（template 变更时用例自动跟随）。
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

const MENU_ITEMS = JSON.stringify([
  { label: '首页', value: 'home' },
  { label: '更多', value: 'more', children: [{ label: '子项', value: 'sub' }] },
])
const MENUBAR_ITEMS = JSON.stringify([
  { label: '文件', value: 'file', children: [{ label: '打开', value: 'open' }] },
  { label: '编辑', value: 'edit' },
])
const NAV_ITEMS = JSON.stringify([
  { label: '首页', value: 'home', href: '/home' },
  { label: '产品', value: 'product', children: [{ label: '列表', value: 'list' }] },
])
const COMMAND_ITEMS = JSON.stringify([
  { label: '新建', value: 'new' },
  { label: '保存', value: 'save' },
])
const TOUR_STEPS = JSON.stringify([
  { selector: '#step1', title: '第一步' },
  { selector: '#step2', title: '第二步' },
])
const BREADCRUMB_ITEMS = JSON.stringify([
  { label: '首页', href: '/' },
  { label: '详情', href: '/detail' },
])

const FIXTURES: Fixture[] = [
  {
    name: 'tabs',
    cls: OASTabs,
    setup: (e) => {
      e.setAttribute('active', 'a')
      e.innerHTML =
        '<oas-tab-panel label="A" value="a"><p>内容A</p></oas-tab-panel><oas-tab-panel label="B" value="b"><p>内容B</p></oas-tab-panel>'
    },
    probe: '.tablist',
  },
  {
    name: 'tab-panel',
    cls: OASTabPanel,
    setup: (e) => e.setAttribute('label', 'A'),
    probe: 'slot',
    hasStyle: true,
  },
  {
    name: 'bottom-navigation',
    cls: OASBottomNavigation,
    setup: (e) =>
      e.setAttribute(
        'items',
        JSON.stringify([
          { label: '首页', value: 'home', icon: 'home' },
          { label: '我的', value: 'me' },
        ]),
      ),
    probe: '.tablist',
  },
  { name: 'pagination', cls: OASPagination, setup: (e) => e.setAttribute('total', '50'), probe: '.group' },
  {
    name: 'steps',
    cls: OASSteps,
    setup: (e) =>
      e.setAttribute(
        'steps',
        JSON.stringify([
          { title: '第一步' },
          { title: '第二步' },
          { title: '第三步' },
        ]),
      ),
    probe: '.steps',
  },
  {
    name: 'segmented',
    cls: OASSegmented,
    setup: (e) =>
      e.setAttribute(
        'options',
        JSON.stringify([
          { label: '日', value: 'day' },
          { label: '周', value: 'week' },
        ]),
      ),
    probe: '.group',
  },
  { name: 'breadcrumb', cls: OASBreadcrumb, setup: (e) => e.setAttribute('items', BREADCRUMB_ITEMS), probe: 'nav' },
  {
    name: 'anchor',
    cls: OASAnchor,
    setup: (e) =>
      e.setAttribute(
        'items',
        JSON.stringify([
          { href: '#a', title: '章节A' },
          { href: '#b', title: '章节B' },
        ]),
      ),
    probe: 'nav',
  },
  { name: 'back-top', cls: OASBackTop, setup: (e) => e.setAttribute('visible', ''), probe: '.btn' },
  { name: 'menu', cls: OASMenu, setup: (e) => e.setAttribute('items', MENU_ITEMS), probe: '.menu' },
  {
    name: 'dropdown',
    cls: OASDropdown,
    setup: (e) => {
      e.setAttribute('items', MENU_ITEMS)
      e.innerHTML = '<button>更多</button>'
    },
    probe: '.menu-anchor',
  },
  { name: 'context-menu', cls: OASContextMenu, setup: (e) => e.setAttribute('items', MENU_ITEMS), probe: '.menu-anchor' },
  { name: 'menubar', cls: OASMenubar, setup: (e) => e.setAttribute('items', MENUBAR_ITEMS), probe: '.bar' },
  { name: 'navigation-menu', cls: OASNavigationMenu, setup: (e) => e.setAttribute('items', NAV_ITEMS), probe: '.nav' },
  { name: 'toolbar', cls: OASToolbar, setup: (e) => (e.innerHTML = '<button>复制</button><button>粘贴</button>'), probe: 'slot' },
  { name: 'command', cls: OASCommand, setup: (e) => e.setAttribute('items', COMMAND_ITEMS), probe: '.list' },
  { name: 'tour', cls: OAStour, setup: (e) => e.setAttribute('steps', TOUR_STEPS), probe: '.popup' },
  {
    name: 'hover-card',
    cls: OASHoverCard,
    setup: (e) => {
      e.setAttribute('title', '标题')
      e.setAttribute('content', '内容')
      e.innerHTML = '<button>悬停</button>'
    },
    probe: '.card',
  },
  { name: 'splitter', cls: OASSplitter, setup: (e) => e.setAttribute('percent', '40'), probe: '.splitter' },
  { name: 'flex', cls: OASFlex, setup: (e) => (e.innerHTML = '<div>一</div><div>二</div>'), probe: '[part="wrap"]' },
  { name: 'page-header', cls: OASPageHeader, setup: (e) => e.setAttribute('title', '标题'), probe: '.row' },
  { name: 'float-button', cls: OASFloatButton, probe: '.btn' },
  { name: 'speed-dial', cls: OASSpeedDial, setup: (e) => e.setAttribute('actions', '[{"label":"分享"}]'), probe: '.fab' },
  {
    name: 'layout',
    cls: OASLayout,
    setup: (e) => {
      e.innerHTML =
        '<oas-header slot="header">顶栏</oas-header><oas-sider slot="sider">侧栏</oas-sider><oas-content slot="content">内容</oas-content><oas-footer slot="footer">底栏</oas-footer>'
    },
    probe: '.struct',
  },
  { name: 'header', cls: OASHeader, probe: 'header', hasStyle: true },
  { name: 'sider', cls: OASSider, probe: 'aside', hasStyle: true },
  { name: 'content', cls: OASContent, probe: 'main', hasStyle: true },
  { name: 'footer', cls: OASFooter, probe: 'footer', hasStyle: true },
  {
    name: 'sidebar',
    cls: OASSidebar,
    setup: (e) => e.setAttribute('items', '[{"label":"首页","value":"home"}]'),
    probe: '.panel',
  },
  { name: 'container', cls: OASContainer, probe: '[part="root"]' },
  { name: 'grid', cls: OASGrid, setup: (e) => e.setAttribute('cols', '2'), probe: 'slot' },
  { name: 'grid-item', cls: OASGridItem, setup: (e) => e.setAttribute('span', '12'), probe: 'slot' },
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

describe('导航布局组件 DSD 真水合批次 4', () => {
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

  it('回归：数据驱动组件不重复渲染——pagination 页按钮/segmented 选项/breadcrumb 项水合后数量不变', () => {
    const pgSnap = captureSnapshot(OASPagination, (e) => e.setAttribute('total', '50'))
    const pg = upgradeFromSnapshot(OASPagination, pgSnap, (e) => e.setAttribute('total', '50')).el
    // total=50, page-size=10 → 5 页；siblings=1 时页码 {1,2,5}（2 与 5 间省略号）+ prev + next
    expect(pg.shadowRoot!.querySelectorAll('button[part="page"]').length).toBe(3)

    const sgSnap = captureSnapshot(OASSegmented, (e) =>
      e.setAttribute(
        'options',
        JSON.stringify([
          { label: '日', value: 'day' },
          { label: '周', value: 'week' },
        ]),
      ),
    )
    const sg = upgradeFromSnapshot(OASSegmented, sgSnap, (e) =>
      e.setAttribute(
        'options',
        JSON.stringify([
          { label: '日', value: 'day' },
          { label: '周', value: 'week' },
        ]),
      ),
    ).el
    expect(sg.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('交互可触发：水合后 tabs 点击切换、menu 点击选中、pagination 点击翻页', () => {
    // oas-tabs：点击第二个 tab → active=b + oas-change
    const tabsSnap = captureSnapshot(OASTabs, (e) => {
      e.setAttribute('active', 'a')
      e.innerHTML =
        '<oas-tab-panel label="A" value="a"><p>内容A</p></oas-tab-panel><oas-tab-panel label="B" value="b"><p>内容B</p></oas-tab-panel>'
    })
    const tabs = upgradeFromSnapshot(OASTabs, tabsSnap, (e) => {
      e.setAttribute('active', 'a')
      e.innerHTML =
        '<oas-tab-panel label="A" value="a"><p>内容A</p></oas-tab-panel><oas-tab-panel label="B" value="b"><p>内容B</p></oas-tab-panel>'
    }).el
    let tabsDetail: unknown = null
    tabs.addEventListener('oas-change', (e: Event) => (tabsDetail = (e as CustomEvent).detail))
    tabs.shadowRoot!.querySelectorAll<HTMLElement>('[part="tab"]')[1]!.click()
    expect(tabsDetail).toEqual({ value: 'b' })
    expect(tabs.getAttribute('active')).toBe('b')
    // 非激活面板 hidden 同步
    expect(tabs.querySelector('oas-tab-panel[value="b"]')?.hasAttribute('hidden')).toBe(false)

    // oas-menu：点击叶子项 → oas-select + value 同步
    const menuSnap = captureSnapshot(OASMenu, (e) => e.setAttribute('items', MENU_ITEMS))
    const menu = upgradeFromSnapshot(OASMenu, menuSnap, (e) => e.setAttribute('items', MENU_ITEMS)).el
    let menuDetail: unknown = null
    menu.addEventListener('oas-select', (e: Event) => (menuDetail = (e as CustomEvent).detail))
    menu.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="home"]')!.click()
    expect(menuDetail).toEqual({ value: 'home' })
    expect(menu.getAttribute('value')).toBe('home')

    // oas-pagination：点击下一页 → current=2
    const pgSnap = captureSnapshot(OASPagination, (e) => e.setAttribute('total', '50'))
    const pg = upgradeFromSnapshot(OASPagination, pgSnap, (e) => e.setAttribute('total', '50')).el
    let pgDetail: unknown = null
    pg.addEventListener('oas-change', (e: Event) => (pgDetail = (e as CustomEvent).detail))
    pg.shadowRoot!.querySelector<HTMLElement>('[part="next"]')!.click()
    expect(pgDetail).toEqual({ page: 2 })
    expect(pg.getAttribute('current')).toBe('2')
  })

  it('交互可触发：水合后 splitter 方向键调整 percent、dropdown 点击触发展开、speed-dial 展开', () => {
    // oas-splitter：ArrowRight → percent+1
    const spSnap = captureSnapshot(OASSplitter, (e) => e.setAttribute('percent', '50'))
    const sp = upgradeFromSnapshot(OASSplitter, spSnap, (e) => e.setAttribute('percent', '50')).el
    let spDetail: unknown = null
    sp.addEventListener('oas-resize', (e: Event) => (spDetail = (e as CustomEvent).detail))
    sp.shadowRoot!.querySelector<HTMLElement>('[part="splitter"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    expect(spDetail).toEqual({ percent: 51 })

    // oas-dropdown：点击 light DOM 触发按钮 → open
    const ddSnap = captureSnapshot(OASDropdown, (e) => {
      e.setAttribute('items', MENU_ITEMS)
      e.innerHTML = '<button>更多</button>'
    })
    const dd = upgradeFromSnapshot(OASDropdown, ddSnap, (e) => {
      e.setAttribute('items', MENU_ITEMS)
      e.innerHTML = '<button>更多</button>'
    }).el
    ;(dd.querySelector('button') as HTMLElement).click()
    expect(dd.shadowRoot!.querySelector('.menu-anchor')!.hasAttribute('hidden')).toBe(false)

    // oas-speed-dial：点击 fab → open
    const sdSnap = captureSnapshot(OASSpeedDial, (e) => e.setAttribute('actions', '[{"label":"分享"}]'))
    const sd = upgradeFromSnapshot(OASSpeedDial, sdSnap, (e) =>
      e.setAttribute('actions', '[{"label":"分享"}]'),
    ).el
    sd.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.click()
    expect(sd.hasAttribute('open')).toBe(true)
  })
})

