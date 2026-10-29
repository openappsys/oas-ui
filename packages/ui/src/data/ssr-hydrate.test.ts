import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core'
import { OASCard } from './card/index.js'
import { OASAvatar } from './avatar/index.js'
import { OASAvatarGroup } from './avatar-group/index.js'
import { OASImage } from './image/index.js'
import { OASQRCode } from './qrcode/index.js'
import { OASWatermark } from './watermark/index.js'
import { OASCollapse, OASCollapseItem } from './collapse/index.js'
import { OASCollapsible } from './collapsible/index.js'
import { OASDescriptions, OASDescriptionsItem } from './descriptions/index.js'
import { OASTimeline, OASTimelineItem } from './timeline/index.js'
import { OASList, OASListItem } from './list/index.js'
import { OASCarousel } from './carousel/index.js'
import { OASStatistic } from './statistic/index.js'
import { OASCountdown } from './countdown/index.js'
import { OASRelativeTime } from './relative-time/index.js'
import { OASChart } from './chart/index.js'
import { OASCode } from './code/index.js'
import { OASEquation } from './equation/index.js'
import { OASLog } from './log/index.js'
import { OASMasonry } from '../layout/masonry/index.js'
import { OASComment } from './comment/index.js'
import { OASMarquee } from './marquee/index.js'
import { OASNumberAnimation } from './number-animation/index.js'
import { OASGradientText } from './gradient-text/index.js'
import { OASAspectRatio } from '../layout/aspect-ratio/index.js'
import { OASVirtualList } from './virtual-list/index.js'
import { OASBarcode } from './barcode/index.js'
import { OASImageGroup } from './image-group/index.js'
import { OASSwipeCell } from './swipe-cell/index.js'

/**
 * data 展示组件 DSD 真水合批次 3 单测（对应 SSR 白名单化改造）。
 *
 * 验证三件事（与 form 批次 1 / feedback 批次 2 同构）：
 * 1. 真水合接管：注入「真实 template 渲染出的快照 + 指纹 meta」后 upgrade，
 *    hydrate() 直接接管——style DOM 引用保持同一对象（shadow 未重建）、指纹移除、关键结构仍在。
 * 2. 回退：快照缺关键结构时 hydrate 返回 false → render 全量重建，功能仍正常。
 * 3. 动态组件不重复追加：log 行数不翻倍（reconcileRows 采纳快照已有行）、marquee 克隆组不翻倍。
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
  /** 快照是否含 <style>（timeline-item 等纯 slot 骨架无内联样式） */
  hasStyle?: boolean
}

const CHART_DATA = JSON.stringify([
  { label: '一月', value: 120 },
  { label: '二月', value: 200 },
  { label: '三月', value: 150 },
])
const SLIDES = '<div class="slide">一</div><div class="slide">二</div><div class="slide">三</div>'
const ITEMS_HTML =
  '<oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>' +
  '<oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>'

const FIXTURES: Fixture[] = [
  {
    name: 'card',
    cls: OASCard,
    setup: (e) => e.setAttribute('title', '卡片标题'),
    probe: '[part="card"]',
  },
  { name: 'avatar', cls: OASAvatar, setup: (e) => e.setAttribute('src', '/a.png'), probe: 'img' },
  {
    name: 'avatar-group',
    cls: OASAvatarGroup,
    setup: (e) => e.setAttribute('max', '2'),
    probe: '[part="group"]',
  },
  { name: 'image', cls: OASImage, setup: (e) => e.setAttribute('src', '/a.png'), probe: 'img' },
  { name: 'qrcode', cls: OASQRCode, setup: (e) => e.setAttribute('value', 'HELLO'), probe: 'svg' },
  {
    name: 'watermark',
    cls: OASWatermark,
    setup: (e) => e.setAttribute('text', '内部资料'),
    probe: '[part="watermark"]',
  },
  {
    name: 'collapse',
    cls: OASCollapse,
    setup: (e) => {
      e.setAttribute('active', 'a')
      e.innerHTML = ITEMS_HTML
    },
    probe: '.group',
  },
  {
    name: 'collapse-item',
    cls: OASCollapseItem,
    setup: (e) => e.setAttribute('header', '面板'),
    probe: '[part="item"]',
  },
  {
    name: 'collapsible',
    cls: OASCollapsible,
    setup: (e) => {
      e.setAttribute('open', '')
      e.setAttribute('header', '触发器')
      e.innerHTML = '<p>内容</p>'
    },
    probe: '[part="trigger"]',
  },
  {
    name: 'descriptions',
    cls: OASDescriptions,
    setup: (e) => e.setAttribute('title', '基本信息'),
    probe: '[part="items"]',
  },
  {
    name: 'descriptions-item',
    cls: OASDescriptionsItem,
    setup: (e) => e.setAttribute('label', '姓名'),
    probe: '[part="label"]',
  },
  {
    name: 'timeline',
    cls: OASTimeline,
    setup: (e) => {
      e.innerHTML = '<oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>'
    },
    probe: '.timeline',
  },
  {
    name: 'timeline-item',
    cls: OASTimelineItem,
    setup: (e) => e.setAttribute('time', '2024-01-01'),
    probe: 'slot',
    hasStyle: false,
  },
  {
    name: 'list',
    cls: OASList,
    setup: (e) => e.setAttribute('bordered', ''),
    probe: '[part="list"]',
  },
  {
    name: 'list-item',
    cls: OASListItem,
    setup: (e) => e.setAttribute('title', '标题'),
    probe: '[part="main"]',
  },
  {
    name: 'carousel',
    cls: OASCarousel,
    setup: (e) => (e.innerHTML = SLIDES),
    probe: '[part="track"]',
  },
  {
    name: 'statistic',
    cls: OASStatistic,
    setup: (e) => e.setAttribute('value', '12345'),
    probe: '[part="value"]',
  },
  {
    name: 'countdown',
    cls: OASCountdown,
    setup: (e) => e.setAttribute('value', '3600'),
    probe: '[part="display"]',
  },
  {
    name: 'relative-time',
    cls: OASRelativeTime,
    setup: (e) => {
      e.setAttribute('value', String(Date.UTC(2026, 9, 29, 12, 0, 0) - 3 * 60_000))
      e.setAttribute('locale', 'zh-CN')
    },
    probe: '[part="time"]',
  },
  { name: 'chart', cls: OASChart, setup: (e) => e.setAttribute('data', CHART_DATA), probe: 'svg' },
  {
    name: 'code',
    cls: OASCode,
    setup: (e) => {
      e.setAttribute('code', 'const a = 1')
      e.setAttribute('language', 'js')
    },
    probe: '[part="block"]',
  },
  {
    name: 'equation',
    cls: OASEquation,
    setup: (e) => e.setAttribute('code', '\\frac{1}{2}'),
    probe: '[part="equation"]',
  },
  {
    name: 'log',
    cls: OASLog,
    setup: (e) => e.setAttribute('lines', '["第一行","第二行"]'),
    probe: '.log',
  },
  {
    name: 'masonry',
    cls: OASMasonry,
    setup: (e) => e.setAttribute('columns', '3'),
    probe: '.masonry',
  },
  {
    name: 'comment',
    cls: OASComment,
    setup: (e) => {
      e.innerHTML =
        '<span slot="author">张三</span><span slot="time">2024-01-01</span><div slot="content">评论内容</div>'
    },
    probe: '[part="comment"]',
  },
  {
    name: 'marquee',
    cls: OASMarquee,
    setup: (e) => (e.innerHTML = '<span>滚动内容</span>'),
    probe: '.track',
  },
  {
    name: 'number-animation',
    cls: OASNumberAnimation,
    setup: (e) => {
      e.setAttribute('value', '9527')
      e.setAttribute('duration', '0')
    },
    probe: '[part="value"]',
  },
  {
    name: 'gradient-text',
    cls: OASGradientText,
    setup: (e) => e.setAttribute('gradient', '["#ff0000","#0000ff"]'),
    probe: '[part="text"]',
  },
  {
    name: 'aspect-ratio',
    cls: OASAspectRatio,
    setup: (e) => e.setAttribute('ratio', '16/9'),
    probe: '[part="content"]',
  },
  {
    name: 'virtual-list',
    cls: OASVirtualList,
    setup: (e) => {
      e.setAttribute('height', '100')
      e.setAttribute('item-height', '20')
      e.setAttribute('items', JSON.stringify(['一', '二', '三']))
    },
    probe: '[part="items"]',
  },
  {
    // SSR 白名单补位回归：barcode 一度缺 hydrate() 覆写，DSD 快照在 upgrade 时被
    // render() 全量重建（style 引用变更、指纹回退路径）——补覆写后此处固化防复发
    name: 'barcode',
    cls: OASBarcode,
    setup: (e) => {
      e.setAttribute('value', 'OAS-UI-2026')
      e.setAttribute('format', 'code128')
    },
    probe: 'svg[part="barcode"]',
  },
  // —— SSR 白名单收口：image-group / swipe-cell ——
  {
    name: 'image-group',
    cls: OASImageGroup,
    setup: (e) => {
      e.innerHTML = '<oas-image src="/a.png"></oas-image><oas-image src="/b.png"></oas-image>'
    },
    probe: '[part="group"]',
  },
  {
    name: 'swipe-cell',
    cls: OASSwipeCell,
    setup: (e) => {
      e.setAttribute('open', '')
      e.setAttribute('open-side', 'end')
      e.innerHTML = '<div>列表项内容</div><button slot="actions">删除</button>'
    },
    probe: '[part="content"]',
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

describe('data 展示组件 DSD 真水合批次 3', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  for (const f of FIXTURES) {
    it(`真水合接管：${f.name} hydrate 成功、shadow 不重建（style 引用保持）、指纹移除、关键结构保持`, () => {
      const snap = captureSnapshot(f.cls, f.setup)
      const { el, styleRef } = upgradeFromSnapshot(f.cls, snap, f.setup)

      // hydrate 接管：style 为同一 DOM 对象（shadow 未重建；timeline-item 无 style 时 null===null 亦成立）
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
      // 指纹 meta 已移除
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 关键结构仍在
      expect(el.shadowRoot!.querySelectorAll(f.probe).length).toBeGreaterThanOrEqual(1)
      // 快照确实含关键结构（保证用例在测真水合而非空快照；纯 slot 骨架组件无内联样式）
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

  it('回归：log 水合后行数不翻倍（reconcileRows 采纳快照已有行）、marquee 克隆组不翻倍', () => {
    // oas-log：快照含 2 行，水合后 reconcileRows 不得重复追加
    const logSnap = captureSnapshot(OASLog, (e) => e.setAttribute('lines', '["第一行","第二行"]'))
    const log = upgradeFromSnapshot(OASLog, logSnap, (e) => e.setAttribute('lines', '["第一行","第二行"]')).el
    expect(log.shadowRoot!.querySelectorAll('.row').length).toBe(2)

    // oas-marquee：克隆份本体在 light DOM（页面样式可达），快照已直出 1 份；
    // 水合后 syncClone 先清后建仍为 1 份（幂等，不翻倍）
    const mqSnap = captureSnapshot(OASMarquee, (e) => (e.innerHTML = '<span>滚动内容</span>'))
    expect(mqSnap, 'SSR 快照直出 light DOM 克隆份').toContain('data-oas-marquee-copy')
    const mq = upgradeFromSnapshot(OASMarquee, mqSnap, (e) => (e.innerHTML = '<span>滚动内容</span>')).el
    const copies = mq.querySelectorAll<HTMLElement>(':scope > [data-oas-marquee-copy]')
    expect(copies.length, '水合后克隆份不翻倍（幂等重建）').toBe(1)
    expect(copies[0]!.textContent).toContain('滚动内容')
    expect(
      mq.shadowRoot!.querySelectorAll('.group.clone slot[name="oas-marquee-copy"]').length,
      '克隆组内是具名 slot',
    ).toBe(1)
  })

  it('交互可触发：水合后 collapse 点击面板切换、carousel 点击箭头切换、image 点击打开预览', () => {
    // oas-collapse：点击面板头部 → oas-collapse-item-click → collapse 收起（active 清空）
    const colSnap = captureSnapshot(OASCollapse, (e) => {
      e.setAttribute('active', 'a')
      e.innerHTML = ITEMS_HTML
    })
    const col = upgradeFromSnapshot(OASCollapse, colSnap, (e) => {
      e.setAttribute('active', 'a')
      e.innerHTML = ITEMS_HTML
    }).el
    let changeDetail: unknown = null
    col.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    const item0 = col.querySelector<OASCollapseItem>('oas-collapse-item')!
    item0
      .shadowRoot!.querySelector('[part="head"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(changeDetail).toEqual({ active: [] })
    expect(item0.hasAttribute('open')).toBe(false)

    // oas-carousel：点击 next 箭头 → index=1 + oas-change
    const crSnap = captureSnapshot(OASCarousel, (e) => (e.innerHTML = SLIDES))
    const cr = upgradeFromSnapshot(OASCarousel, crSnap, (e) => (e.innerHTML = SLIDES)).el
    let crDetail: unknown = null
    cr.addEventListener('oas-change', (e: Event) => (crDetail = (e as CustomEvent).detail))
    cr.shadowRoot!.querySelector<HTMLElement>('[part="arrow-next"]')!.click()
    expect(crDetail).toEqual({ index: 1, prevIndex: 0 })
    expect(cr.getAttribute('index')).toBe('1')

    // oas-image：点击主图（preview 属性）→ oas-preview 派发 + 遮罩展开
    const imgSnap = captureSnapshot(OASImage, (e) => {
      e.setAttribute('src', '/a.png')
      e.setAttribute('preview', '')
    })
    const img = upgradeFromSnapshot(OASImage, imgSnap, (e) => {
      e.setAttribute('src', '/a.png')
      e.setAttribute('preview', '')
    }).el
    let imgDetail: unknown = null
    img.addEventListener('oas-preview', (e: Event) => (imgDetail = (e as CustomEvent).detail))
    img.shadowRoot!.querySelector<HTMLElement>('.previewable')!.click()
    expect(imgDetail).toEqual({ src: '/a.png' })
    // 预览打开后遮罩 teleport 到 body 下 portal host（规避 transform 祖先致 fixed 失效）
    const pvPortal = document.querySelector('[data-oas-image-preview-portal]')
    const pvMask = (pvPortal?.shadowRoot?.querySelector('.preview-mask') ??
      img.shadowRoot!.querySelector('.preview-mask'))!
    expect(pvMask.hasAttribute('hidden')).toBe(false)
  })

  it('数据通道：chart.data / virtual-list.items property 单向反射 attribute，非法 JSON 容错空态', () => {
    // oas-chart：property setter 不反射 attribute（数据本体在实例），attribute 通道在 SSR 用
    const chart = new OASChart()
    chart.data = [
      { label: '一月', value: 120 },
      { label: '二月', value: 200 },
    ]
    document.body.appendChild(chart)
    expect(chart.shadowRoot!.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(1)

    // oas-virtual-list：property items 优先于 items 属性
    const vl = new OASVirtualList()
    vl.items = ['x', 'y']
    document.body.appendChild(vl)
    expect(vl.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(2)

    // 非法 JSON 容错为空态
    const badChart = new OASChart()
    badChart.setAttribute('data', '[{bad json')
    document.body.appendChild(badChart)
    expect(badChart.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)

    const badLog = new OASLog()
    badLog.setAttribute('lines', 'not-json')
    document.body.appendChild(badLog)
    expect(badLog.shadowRoot!.querySelectorAll('.row').length).toBe(0)
  })
})

describe('SSR 白名单收口：image-group / swipe-cell 真水合契约', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  function pointer(type: string, x: number, y = 10, pointerId = 1): PointerEvent {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      pointerId,
      clientX: x,
      clientY: y,
    })
  }

  it('image-group：水合即同步收集子图（不依赖 MutationObserver 微任务），嵌套子图节点不被重建', () => {
    const setup = FIXTURES.find((f) => f.name === 'image-group')!.setup!
    const snap = captureSnapshot(OASImageGroup, setup)
    // 同步序列化阶段（非微任务）快照就必须含共享预览宿主的图集列表
    expect(snap).toContain('preview-src-list')

    const el = new OASImageGroup()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-image-group" data-oas-ssr-v="1">${snap}`
    setup(el)
    document.body.appendChild(el)

    const inner = el.shadowRoot!.querySelector('oas-image')!
    expect(JSON.parse(inner.getAttribute('preview-src-list') ?? '[]')).toEqual(['/a.png', '/b.png'])

    // update() 自身必须能重建图集列表（不依赖 slotchange/MutationObserver 的异步时序）
    inner.removeAttribute('preview-src-list')
    el.requestUpdate()
    expect(JSON.parse(inner.getAttribute('preview-src-list') ?? '[]')).toEqual(['/a.png', '/b.png'])

    const child = el.querySelectorAll('oas-image')[0]!
    expect(child.shadowRoot!.querySelectorAll('style').length).toBe(1)
    const childStyle = child.shadowRoot!.querySelector('style')
    el.setAttribute('infinite', '')
    expect(el.querySelectorAll('oas-image')[0]).toBe(child)
    expect(child.shadowRoot!.querySelector('style')).toBe(childStyle)
  })

  it('swipe-cell：SSR 宽度为 0 时不得删除 open 属性（测量只用于升级后校正）', () => {
    const setup = FIXTURES.find((f) => f.name === 'swipe-cell')!.setup!
    const snap = captureSnapshot(OASSwipeCell, setup)
    const { el } = upgradeFromSnapshot(OASSwipeCell, snap, setup)

    // happy-dom 无布局，actions 宽度恒 0：open / open-side 必须原样保留
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.getAttribute('open-side')).toBe('end')
    el.setAttribute('threshold', '50')
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.getAttribute('open-side')).toBe('end')
  })

  it('swipe-cell：水合后一次横滑只派发一次 oas-open（监听不重复绑定）', () => {
    const closed = (e: OASElement): void => {
      e.innerHTML = '<div>列表项内容</div><button slot="actions">删除</button>'
    }
    const snap = captureSnapshot(OASSwipeCell, closed)
    const { el } = upgradeFromSnapshot(OASSwipeCell, snap, closed)
    const actions = el.shadowRoot!.querySelector<HTMLElement>('[part="actions"]')!
    actions.getBoundingClientRect = () =>
      ({ x: 0, y: 0, top: 0, left: 0, right: 80, bottom: 40, width: 80, height: 40 }) as DOMRect

    const events: Array<{ side: string }> = []
    el.addEventListener('oas-open', (e: Event) => events.push((e as CustomEvent).detail))
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!
    content.dispatchEvent(pointer('pointerdown', 200))
    content.dispatchEvent(pointer('pointermove', 100))
    content.dispatchEvent(pointer('pointerup', 100))
    expect(events).toEqual([{ side: 'end' }])
    expect(el.getAttribute('open-side')).toBe('end')
  })

  // —— fix round 2：关键子结构校验（只验顶层容器会静默接管残破快照） ——

  it('swipe-cell：快照只有 root/content（缺 actions 双容器）时回退 render，横滑仍可开', () => {
    const setup = (e: OASElement): void => {
      e.innerHTML = '<div>列表项内容</div><button slot="actions">删除</button>'
    }
    const el = new OASSwipeCell()
    el.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-swipe-cell" data-oas-ssr-v="1"><style></style><div part="root"><div part="content"></div></div>'
    setup(el)
    document.body.appendChild(el)

    expect(el.shadowRoot!.querySelectorAll('[part="actions"]').length, '回退后应有 actions 容器').toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="actions-start"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="root"]').length).toBe(1)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()

    const actions = el.shadowRoot!.querySelector<HTMLElement>('[part="actions"]')!
    actions.getBoundingClientRect = () =>
      ({ x: 0, y: 0, top: 0, left: 0, right: 80, bottom: 40, width: 80, height: 40 }) as DOMRect
    const events: Array<{ side: string }> = []
    el.addEventListener('oas-open', (e: Event) => events.push((e as CustomEvent).detail))
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!
    content.dispatchEvent(pointer('pointerdown', 200))
    content.dispatchEvent(pointer('pointermove', 100))
    content.dispatchEvent(pointer('pointerup', 100))
    expect(events).toEqual([{ side: 'end' }])
  })
})
