import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'

// console.warn 静默观察（tree 的 dev 告警/parse 回落路径在模块级去重）
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
beforeAll(() => warnSpy.mockClear())
afterAll(() => warnSpy.mockRestore())

import '@oas-ui/i18n'
import { OASTree } from './index.js'

/**
 * height="fill" 容器自适应高度（T10）。
 *
 * 真实痛点：宿主手工读容器高度写回 px height 属性 → ① 漏减 padding 导致错位；
 * ② 写回属性触发重渲染再测量，形成 +8px/s 的生长反馈循环。
 * 组件内建 ResizeObserver 量**父容器内容盒**（clientHeight − padding），只写内部视口高，
 * 不写回 height 属性；RO 同值跳过（防重入）。
 */

/** FakeRO：happy-dom 的 ResizeObserver 是永不回调的 stub，这里记录实例/观察目标供手动触发 */
type FakeRO = {
  cb: ResizeObserverCallback
  observed: Element[]
  disconnected: number
}

function installFakeRO(): FakeRO[] {
  const created: FakeRO[] = []
  class RO {
    cb: ResizeObserverCallback
    observed: Element[] = []
    disconnected = 0
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb
      created.push(this as unknown as FakeRO)
    }
    observe(el: Element): void {
      this.observed.push(el)
    }
    unobserve(el: Element): void {
      this.observed = this.observed.filter((x) => x !== el)
    }
    disconnect(): void {
      this.disconnected++
      this.observed = []
    }
    takeRecords(): [] {
      return []
    }
  }
  vi.stubGlobal('ResizeObserver', RO as unknown as typeof ResizeObserver)
  return created
}

/** 容器内容盒尺寸（happy-dom 无布局：clientHeight 需显式定义） */
function setClientHeight(el: HTMLElement, h: number): void {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: h })
}

/** 取观察指定容器的那个 RO 实例（vlist 等内部件也会建 RO，按目标筛选） */
function roFor(ros: FakeRO[], target: Element): FakeRO {
  const hit = ros.find((ro) => ro.observed.includes(target))
  if (!hit) throw new Error('没有观察目标容器的 ResizeObserver')
  return hit
}

/** 触发一次 RO 回调（happy-dom 的 RO 不回调，测试手动驱动） */
function fire(ro: FakeRO): void {
  ro.cb([], ro as unknown as ResizeObserver)
}

function mountIn(
  container: HTMLElement,
  attrs: Record<string, string> = {},
  data = '[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"}]},{"key":"b","label":"节点 B"}]',
): OASTree {
  const el = new OASTree()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('data' in attrs)) el.setAttribute('data', data)
  container.appendChild(el)
  return el
}

function vlist(el: OASTree): HTMLElement {
  return el.shadowRoot!.querySelector('oas-virtual-list')!
}

/** 建一个带 padding 的父容器（默认 400px 内容外高 + 上下各 8px padding） */
function makeContainer(clientHeight = 400, padding = '8px'): HTMLElement {
  const container = document.createElement('div')
  container.style.padding = padding
  setClientHeight(container, clientHeight)
  document.body.appendChild(container)
  return container
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('oas-tree height="fill"（容器自适应高度）', () => {
  it('量父容器内容盒并扣掉 padding（400 − 16 = 384），且不写回 height 属性', () => {
    installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: 'fill', 'item-height': '32' })
    // 384 = 400（clientHeight，含 padding）− 8 × 2
    expect(vlist(el).getAttribute('height'), 'fill 视口高 = 容器内容盒高度').toBe('384')
    // 防反馈循环：组件不把量到的 px 写回 height 属性（写回 = 下次测量再放大）
    expect(el.getAttribute('height'), 'height 属性保持 fill，不被改写成 px').toBe('fill')
  })

  it('ResizeObserver 观察父容器（不是树自身/不是 body）', () => {
    const ros = installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: 'fill' })
    const ro = roFor(ros, container)
    expect(ro.observed).toEqual([container])
    expect(ro.observed.includes(el), '不观察树自身（避免自身尺寸回声）').toBe(false)
  })

  it('容器尺寸变化 → RO 回调按新内容盒重算视口高', () => {
    const ros = installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: 'fill' })
    expect(vlist(el).getAttribute('height')).toBe('384')
    setClientHeight(container, 300)
    fire(roFor(ros, container))
    expect(vlist(el).getAttribute('height'), '300 − 16 = 284').toBe('284')
  })

  it('RO 二次同值回调不重算（防重入）', () => {
    const ros = installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: 'fill' })
    const target = vlist(el)
    const spy = vi.spyOn(target, 'setAttribute')
    const ro = roFor(ros, container)
    // 同尺寸（含亚像素抖动 < 0.5px）连续回调：不应进入重算/重渲染
    fire(ro)
    fire(ro)
    const heightWrites = spy.mock.calls.filter((c) => c[0] === 'height')
    expect(heightWrites.length, '同值回调不重写视口高').toBe(0)
    // 值真的变了才会写
    setClientHeight(container, 320)
    fire(ro)
    expect(spy.mock.calls.filter((c) => c[0] === 'height').length, '变值回调写一次').toBe(1)
  })

  it('数字 px 与 fill 并存：px 时按数值、切到 fill 后按容器（互不干扰）', () => {
    const ros = installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: '200' })
    expect(vlist(el).getAttribute('height'), '数字 height 原样生效').toBe('200')
    el.setAttribute('height', 'fill')
    expect(vlist(el).getAttribute('height'), '切 fill 后按容器内容盒').toBe('384')
    el.setAttribute('height', '240')
    expect(vlist(el).getAttribute('height'), '切回数字后不再吃容器尺寸').toBe('240')
    // 数字模式下 RO 空转也不能改视口高
    setClientHeight(container, 100)
    const before = vlist(el).getAttribute('height')
    for (const ro of ros) fire(ro)
    expect(vlist(el).getAttribute('height'), '数字模式 RO 不介入').toBe(before)
  })

  it('check-all 行占用的高度从 fill 视口里扣掉（不把树撑出容器）', () => {
    installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: 'fill', checkable: '', 'check-all': '' })
    const checkAll = el.shadowRoot!.querySelector<HTMLElement>('.check-all')!
    expect(checkAll.hidden, 'check-all 行已显示').toBe(false)
    // happy-dom 无布局：显式给该行一个高度
    Object.defineProperty(checkAll, 'offsetHeight', { configurable: true, value: 40 })
    el.setAttribute('height', 'fill') // 触发重算（属性同值也会走 update）
    expect(vlist(el).getAttribute('height'), '384 − 40 = 344').toBe('344')
  })

  it('windowed 路径吃到 fill 视口高（init 请求按真实视口估算根容量）', () => {
    installFakeRO()
    const container = makeContainer(160) // 160 − 16 = 144 → ceil(144/32)=5 + buffer4 = 9 根 + margin 8
    const el = new OASTree()
    const requests: Array<{ start: number; end: number; reason: string }> = []
    el.addEventListener('oas-window-request', (e) => {
      requests.push((e as CustomEvent).detail)
    })
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '100')
    el.setAttribute('height', 'fill')
    el.setAttribute('item-height', '32')
    el.setAttribute('data', '[]')
    container.appendChild(el)
    // 空切片不渲染 vlist 行，但窗口估算用的就是 fill 视口高
    // 估算容量 ceil(144/32)=5 + 4 = 9 → [100,109) 扩 margin 8 → [92,117)
    expect(requests[0]).toEqual({ start: 92, end: 117, reason: 'init' })
  })

  it('容器量不到（隐藏 / clientHeight 0）时回落 360，不崩；容器可见后 RO 补上真值', () => {
    const ros = installFakeRO()
    const container = makeContainer(0)
    const el = mountIn(container, { height: 'fill' })
    expect(vlist(el).getAttribute('height'), '无可用测量回落缺省 360').toBe('360')
    // 之后容器可见（隐藏→显示）→ RO 回调补上真值
    setClientHeight(container, 400)
    fire(roFor(ros, container))
    expect(vlist(el).getAttribute('height'), '可见后按内容盒 384 收敛').toBe('384')
  })

  it('断开连接清理 ResizeObserver', () => {
    const ros = installFakeRO()
    const container = makeContainer(400)
    mountIn(container, { height: 'fill' })
    const ro = roFor(ros, container)
    expect(ro.disconnected).toBe(0)
    container.querySelector('oas-tree')!.remove()
    expect(ro.disconnected, '断开时 disconnect 一次').toBe(1)
  })

  it('重连后重新观察父容器（观察器不随断连永久失效）', () => {
    const ros = installFakeRO()
    const container = makeContainer(400)
    const el = mountIn(container, { height: 'fill' })
    el.remove()
    container.appendChild(el)
    const live = ros.filter((ro) => ro.observed.length > 0)
    expect(live.length, '重连后有一个在观察的实例').toBe(1)
    expect(live[0]!.observed).toEqual([container])
    expect(vlist(el).getAttribute('height')).toBe('384')
  })
})
