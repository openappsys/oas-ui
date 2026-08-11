import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core'
import { OASAlert } from './alert/index.js'
import { OASProgress } from './progress/index.js'
import { OASSpin } from './spin/index.js'
import { OASSkeleton } from './skeleton/index.js'
import { OASResult } from './result/index.js'
import { OASBackdrop } from './backdrop/index.js'
import { OASModal } from './modal/index.js'
import { OASDrawer } from './drawer/index.js'
import { OASPopconfirm } from './popconfirm/index.js'

/**
 * feedback 组件 DSD 真水合批次 2 单测（对应 SSR 白名单化改造）。
 *
 * 验证三件事（与 form 批次 1 同构）：
 * 1. 真水合接管：注入「真实 template 渲染出的快照 + 指纹 meta」后 upgrade，
 *    hydrate() 直接接管——style DOM 引用保持同一对象（shadow 未重建）、指纹移除、关键结构仍在。
 * 2. 回退：快照缺关键结构时 hydrate 返回 false → render 全量重建，功能仍正常。
 * 3. 动态子节点不重复：skeleton 水合后行数不翻倍（update 全量重建为同构行序列）。
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
}

const FIXTURES: Fixture[] = [
  {
    name: 'alert',
    cls: OASAlert,
    setup: (e) => {
      e.setAttribute('type', 'warning')
      e.setAttribute('title', '提示标题')
      e.setAttribute('closeable', '')
    },
    probe: '[part="box"]',
  },
  { name: 'progress', cls: OASProgress, setup: (e) => e.setAttribute('percent', '60'), probe: '[part="bar"]' },
  { name: 'spin', cls: OASSpin, setup: (e) => e.setAttribute('size', 'large'), probe: '[part="indicator"]' },
  {
    name: 'skeleton',
    cls: OASSkeleton,
    setup: (e) => {
      e.setAttribute('rows', '4')
      e.setAttribute('title', '')
      e.setAttribute('avatar', '')
    },
    probe: '[part="block"]',
  },
  {
    name: 'result',
    cls: OASResult,
    setup: (e) => {
      e.setAttribute('status', 'success')
      e.setAttribute('title', '操作成功')
      e.setAttribute('description', '已完成')
    },
    probe: '[part="title"]',
  },
  // backdrop 默认关闭态会 self-remove，快照/水合场景统一用 open（服务端直出可见遮罩）
  { name: 'backdrop', cls: OASBackdrop, setup: (e) => e.setAttribute('open', ''), probe: '.mask' },
  { name: 'modal', cls: OASModal, setup: (e) => e.setAttribute('visible', ''), probe: '[part="dialog"]' },
  { name: 'drawer', cls: OASDrawer, setup: (e) => e.setAttribute('visible', ''), probe: '[part="panel"]' },
  { name: 'popconfirm', cls: OASPopconfirm, setup: (e) => e.setAttribute('title', '确认删除？'), probe: '[part="popover"]' },
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

describe('feedback 组件 DSD 真水合批次 2', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  for (const f of FIXTURES) {
    it(`真水合接管：${f.name} hydrate 成功、shadow 不重建（style 引用保持）、指纹移除、关键结构保持`, () => {
      const snap = captureSnapshot(f.cls, f.setup)
      const { el, styleRef } = upgradeFromSnapshot(f.cls, snap, f.setup)

      // hydrate 接管：style 为同一 DOM 对象（shadow 未重建）
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
      // 指纹 meta 已移除
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 关键结构仍在
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
      // 快照确实含 style 与关键结构（保证用例在测真水合而非空快照）
      expect(snap).toContain('<style>')
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

  it('回归：skeleton 水合后行数不翻倍（快照行序列被同构重建，非追加叠加）', () => {
    const snap = captureSnapshot(OASSkeleton, (e) => {
      e.setAttribute('rows', '4')
      e.setAttribute('title', '')
    })
    expect(snap.match(/part="line"/g)?.length).toBe(4)
    const sk = upgradeFromSnapshot(OASSkeleton, snap, (e) => {
      e.setAttribute('rows', '4')
      e.setAttribute('title', '')
    }).el
    // 水合后 update 全量重建：行数与 title 保持（不翻倍）
    expect(sk.shadowRoot!.querySelectorAll('[part="line"]').length).toBe(4)
    expect(sk.shadowRoot!.querySelectorAll('[part="title"]').length).toBe(1)
  })

  it('交互可触发：水合后 alert 关闭按钮派发 oas-close、backdrop 遮罩点击派发 oas-click', () => {
    // oas-alert
    const alertSnap = captureSnapshot(OASAlert, (e) => {
      e.setAttribute('closeable', '')
      e.setAttribute('title', '提示')
    })
    const alert = upgradeFromSnapshot(OASAlert, alertSnap, (e) => {
      e.setAttribute('closeable', '')
      e.setAttribute('title', '提示')
    }).el
    let alertClose = 0
    alert.addEventListener('oas-close', () => alertClose++)
    alert.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(alertClose).toBe(1)
    expect(alert.hidden).toBe(true)

    // oas-backdrop
    const bdSnap = captureSnapshot(OASBackdrop, (e) => e.setAttribute('open', ''))
    const bd = upgradeFromSnapshot(OASBackdrop, bdSnap, (e) => e.setAttribute('open', '')).el
    let clickDetail: { originalEvent?: Event } | undefined
    bd.addEventListener('oas-click', (e) => {
      clickDetail = (e as CustomEvent).detail
    })
    const ev = new MouseEvent('click', { bubbles: true })
    bd.shadowRoot!.querySelector('.mask')!.dispatchEvent(ev)
    expect(clickDetail?.originalEvent).toBe(ev)
  })

  it('交互可触发：水合后 modal 确定按钮派发 oas-ok 并移除 visible、popconfirm 触发按钮切换 open', () => {
    // oas-modal
    const modalSnap = captureSnapshot(OASModal, (e) => e.setAttribute('visible', ''))
    const modal = upgradeFromSnapshot(OASModal, modalSnap, (e) => e.setAttribute('visible', '')).el
    let ok = 0
    modal.addEventListener('oas-ok', () => ok++)
    modal.shadowRoot!.querySelector<HTMLElement>('[part="ok"]')!.click()
    expect(ok).toBe(1)
    expect(modal.hasAttribute('visible')).toBe(false)

    // oas-popconfirm：点击 light DOM 触发按钮 → open 切换
    const pcSnap = captureSnapshot(OASPopconfirm, (e) => e.setAttribute('title', '确认'))
    const pc = upgradeFromSnapshot(OASPopconfirm, pcSnap, (e) => {
      e.setAttribute('title', '确认')
      e.innerHTML = '<button>删除</button>'
    }).el
    ;(pc.querySelector('button') as HTMLElement).click()
    expect(pc.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe('false')
  })
})
