import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core'
import { OASCard } from './card/index.js'
import { OASAvatar } from './avatar/index.js'
import { OASAvatarGroup } from './avatar-group/index.js'
import { OASImage } from './image/index.js'
import { OASQRCode } from './qrcode/index.js'
import { OASWatermark } from './watermark/index.js'
import { OASCollapse, OASCollapseItem } from './collapse/index.js'
import { OASDescriptions, OASDescriptionsItem } from './descriptions/index.js'
import { OASTimeline, OASTimelineItem } from './timeline/index.js'
import { OASList, OASListItem } from './list/index.js'
import { OASCarousel } from './carousel/index.js'
import { OASStatistic } from './statistic/index.js'
import { OASCountdown } from './countdown/index.js'
import { OASChart } from './chart/index.js'
import { OASCode } from './code/index.js'
import { OASEquation } from './equation/index.js'
import { OASLog } from './log/index.js'
import { OASMasonry } from './masonry/index.js'
import { OASComment } from './comment/index.js'
import { OASMarquee } from './marquee/index.js'
import { OASNumberAnimation } from './number-animation/index.js'
import { OASGradientText } from './gradient-text/index.js'
import { OASAspectRatio } from './aspect-ratio/index.js'
import { OASVirtualList } from './virtual-list/index.js'

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
      e.setAttribute('items', JSON.stringify(['甲', '乙', '丙']))
    },
    probe: '[part="items"]',
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
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
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
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    })
  }

  it('回归：log 水合后行数不翻倍（reconcileRows 采纳快照已有行）、marquee 克隆组不翻倍', () => {
    // oas-log：快照含 2 行，水合后 reconcileRows 不得重复追加
    const logSnap = captureSnapshot(OASLog, (e) => e.setAttribute('lines', '["第一行","第二行"]'))
    const log = upgradeFromSnapshot(OASLog, logSnap, (e) =>
      e.setAttribute('lines', '["第一行","第二行"]'),
    ).el
    expect(log.shadowRoot!.querySelectorAll('.row').length).toBe(2)

    // oas-marquee：快照含 1 组克隆，水合后 syncClone 清空重克隆仍为 1 组
    const mqSnap = captureSnapshot(OASMarquee, (e) => (e.innerHTML = '<span>滚动内容</span>'))
    const mq = upgradeFromSnapshot(
      OASMarquee,
      mqSnap,
      (e) => (e.innerHTML = '<span>滚动内容</span>'),
    ).el
    const clones = mq.shadowRoot!.querySelectorAll('.clone .group > *, .group.clone > *')
    expect(clones.length).toBe(1)
    expect(mq.shadowRoot!.querySelector('.clone')!.textContent).toContain('滚动内容')
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
    expect(crDetail).toEqual({ index: 1 })
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
    expect(img.shadowRoot!.querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(false)
  })

  it('数据通道：chart.data / virtual-list.items property 单向反射 attribute，非法 JSON 容错空态', () => {
    // oas-chart：property setter 不反射 attribute（数据本体在实例），attribute 通道在 SSR 用
    const chart = new OASChart()
    chart.data = [
      { label: '一月', value: 120 },
      { label: '二月', value: 200 },
    ]
    document.body.appendChild(chart)
    expect(chart.shadowRoot!.querySelectorAll('svg path').length).toBeGreaterThan(0)

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
