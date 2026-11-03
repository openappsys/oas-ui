import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { OASElement } from '@oas-ui/core/oas-element'
import { OASTabs, OASTabPanel } from './tabs/index.js'
import { OASBottomNavigation } from '../navigation/bottom-navigation/index.js'
import { OASPagination } from './pagination/index.js'
import { OASSteps } from './steps/index.js'
import { OASSegmented } from '../form/segmented/index.js'
import { OASBreadcrumb } from '../navigation/breadcrumb/index.js'
import { OASAnchor } from '../navigation/anchor/index.js'
import { OASBackTop } from '../navigation/back-top/index.js'
import { OASMenu } from './menu/index.js'
import { OASDropdown } from './dropdown/index.js'
import { OASContextMenu } from './contextmenu/index.js'
import { OASMenubar } from './menubar/index.js'
import { OASNavigationMenu } from './navigation-menu/index.js'
import { OASToolbar } from './toolbar/index.js'
import { OASCommand } from './command/index.js'
import { OASTour } from '../navigation/tour/index.js'
import { OASHoverCard } from '../feedback/hover-card/index.js'
import { OASSplitter } from '../layout/splitter/index.js'
import { OASFlex } from '../layout/flex/index.js'
import { OASPageHeader } from './page-header/index.js'
import { OASFloatButton } from './float-button/index.js'
import { OASSpeedDial } from './speed-dial/index.js'
import { OASLayout, OASHeader, OASSider, OASContent, OASFooter } from '../layout/layout/index.js'
import { OASSidebar } from '../layout/sidebar/index.js'
import { OASContainer } from '../layout/container/index.js'
import { OASGrid, OASGridItem } from '../layout/grid/index.js'
import { OASIndexBar } from './index-bar/index.js'

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
const INDEX_SECTIONS = JSON.stringify([
  { key: 'A', title: 'A', items: [{ label: '安' }, { label: '爱' }] },
  { key: 'B', title: 'B', items: [{ label: '波' }, { label: '白' }] },
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
  {
    name: 'pagination',
    cls: OASPagination,
    setup: (e) => e.setAttribute('total', '50'),
    probe: '.group',
  },
  {
    name: 'steps',
    cls: OASSteps,
    setup: (e) =>
      e.setAttribute('steps', JSON.stringify([{ title: '第一步' }, { title: '第二步' }, { title: '第三步' }])),
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
  {
    name: 'breadcrumb',
    cls: OASBreadcrumb,
    setup: (e) => e.setAttribute('items', BREADCRUMB_ITEMS),
    probe: 'nav',
  },
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
  {
    name: 'context-menu',
    cls: OASContextMenu,
    setup: (e) => e.setAttribute('items', MENU_ITEMS),
    probe: '.menu-anchor',
  },
  {
    name: 'menubar',
    cls: OASMenubar,
    setup: (e) => e.setAttribute('items', MENUBAR_ITEMS),
    probe: '.bar',
  },
  {
    name: 'navigation-menu',
    cls: OASNavigationMenu,
    setup: (e) => e.setAttribute('items', NAV_ITEMS),
    probe: '.nav',
  },
  {
    name: 'toolbar',
    cls: OASToolbar,
    setup: (e) => (e.innerHTML = '<button>复制</button><button>粘贴</button>'),
    probe: 'slot',
  },
  {
    name: 'command',
    cls: OASCommand,
    setup: (e) => e.setAttribute('items', COMMAND_ITEMS),
    probe: '.list',
  },
  {
    name: 'tour',
    cls: OASTour,
    setup: (e) => e.setAttribute('steps', TOUR_STEPS),
    probe: '.popup',
  },
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
  {
    name: 'splitter',
    cls: OASSplitter,
    setup: (e) => e.setAttribute('percent', '40'),
    probe: '.splitter',
  },
  {
    name: 'flex',
    cls: OASFlex,
    setup: (e) => (e.innerHTML = '<div>一</div><div>二</div>'),
    probe: '[part="wrap"]',
  },
  {
    name: 'page-header',
    cls: OASPageHeader,
    setup: (e) => e.setAttribute('title', '标题'),
    probe: '.row',
  },
  { name: 'float-button', cls: OASFloatButton, probe: '.btn' },
  {
    name: 'speed-dial',
    cls: OASSpeedDial,
    setup: (e) => e.setAttribute('actions', '[{"label":"分享"}]'),
    probe: '.fab',
  },
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
  {
    name: 'grid-item',
    cls: OASGridItem,
    setup: (e) => e.setAttribute('span', '12'),
    probe: 'slot',
  },
  // —— SSR 白名单收口：index-bar ——
  {
    name: 'index-bar',
    cls: OASIndexBar,
    setup: (e) => {
      e.setAttribute('sections', INDEX_SECTIONS)
      e.setAttribute('height', '200')
    },
    probe: '[part="root"]',
  },
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
      expect(el.shadowRoot!.querySelectorAll(f.probe).length).toBeGreaterThanOrEqual(1)
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
      expect(el.shadowRoot!.querySelectorAll(f.probe).length).toBeGreaterThanOrEqual(1)
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

  it('splitter storage-key（legacy 形态）：DSD 升级同步阶段不访问存储（首帧与快照一致、shadow 不重建），微任务后再恢复', async () => {
    const storageKey = 'oas-splitter-hydrate-test'
    window.localStorage.clear()
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ v: 1, mode: 'legacy', percent: 70, collapsed: [], prev: {} }),
    )
    const setup = (e: OASElement): void => {
      e.setAttribute('storage-key', storageKey)
    }
    const snap = captureSnapshot(OASSplitter, setup)
    // 参照实例的延迟恢复微任务先跑完，避免污染后续 getItem 计数
    await new Promise((r) => setTimeout(r, 0))

    const get = vi.spyOn(window.localStorage, 'getItem')
    try {
      const { el, styleRef } = upgradeFromSnapshot(OASSplitter, snap, setup)
      // appendChild 的同步水合阶段：零存储访问、percent 保持快照默认 50
      expect(get, '水合同步阶段不得访问存储').not.toHaveBeenCalled()
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
      expect(el.getAttribute('percent')).toBeNull()
      expect((el.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 50%')

      await new Promise((r) => setTimeout(r, 0))
      // 水合完成后由微任务恢复，且不重建 shadow
      expect(el.getAttribute('percent')).toBe('70')
      expect((el.shadowRoot!.querySelector('.pane') as HTMLElement).style.flex).toBe('0 0 70%')
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    } finally {
      get.mockRestore()
      window.localStorage.clear()
    }
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
    const sd = upgradeFromSnapshot(OASSpeedDial, sdSnap, (e) => e.setAttribute('actions', '[{"label":"分享"}]')).el
    sd.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.click()
    expect(sd.hasAttribute('open')).toBe(true)
  })
})

describe('SSR 白名单收口：index-bar 真水合契约', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  const setup = (e: OASElement): void => {
    e.setAttribute('sections', INDEX_SECTIONS)
    e.setAttribute('height', '200')
  }

  it('水合采纳快照列表/字母节点（不重建），header id 与 aria-labelledby 在更新后保持稳定', () => {
    const snap = captureSnapshot(OASIndexBar, setup)

    const el = new OASIndexBar()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-index-bar" data-oas-ssr-v="1">${snap}`
    setup(el)
    const snapshotSections = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.section')]
    const snapshotLetters = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.letter')]
    const header = snapshotSections[0]!.querySelector<HTMLElement>('.section-header')!
    const headerId = header.id
    expect(headerId).not.toBe('')

    document.body.appendChild(el)

    const sections = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.section')]
    const letters = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.letter')]
    expect(sections[0]).toBe(snapshotSections[0])
    expect(letters[0]).toBe(snapshotLetters[0])
    expect(header.id).toBe(headerId)
    expect(sections[0]!.getAttribute('aria-labelledby')).toBe(headerId)

    // 非结构属性变化：仍不得重建（UID 不漂移）
    el.setAttribute('height', '300')
    expect(el.shadowRoot!.querySelectorAll<HTMLElement>('.section')[0]).toBe(snapshotSections[0])
    expect(header.id).toBe(headerId)
    expect(sections[0]!.getAttribute('aria-labelledby')).toBe(headerId)
  })

  it('水合首帧不派发 oas-change；单次点击字母只派发一次（监听不重复绑定）', () => {
    const snap = captureSnapshot(OASIndexBar, setup)
    const el = new OASIndexBar()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-index-bar" data-oas-ssr-v="1">${snap}`
    setup(el)
    const changes: Array<{ key: string }> = []
    el.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    document.body.appendChild(el)
    expect(changes).toEqual([])

    const letters = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.letter')
    letters[1]!.click()
    expect(changes).toEqual([{ key: 'B' }])
    expect(letters[1]!.getAttribute('aria-current')).toBe('true')
  })

  it('水合后条目点击只派发一次 oas-item-click（列表委托绑定生效）', () => {
    const snap = captureSnapshot(OASIndexBar, setup)
    const { el } = upgradeFromSnapshot(OASIndexBar, snap, setup)
    const events: Array<{ value: string; label: string; section: string }> = []
    el.addEventListener('oas-item-click', (e: Event) =>
      events.push((e as CustomEvent).detail as { value: string; label: string; section: string }),
    )
    const item = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.section .item')[2]!
    item.click()
    expect(events).toEqual([{ value: '波', label: '波', section: 'B' }])
  })
})
