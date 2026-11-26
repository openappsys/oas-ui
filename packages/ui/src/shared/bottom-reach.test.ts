import { describe, it, expect, afterEach } from 'vitest'
import {
  createBottomReach,
  isHiddenInTree,
  renderMoreState,
  shouldRequestMore,
  watchBottomReach,
  type BottomReachOptions,
} from './bottom-reach.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** 假哨兵：几何直接给定（happy-dom 不做布局，矩形全 0） */
function fakeSentinel(top: number): HTMLElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = () =>
    ({ top, bottom: top + 1, left: 0, right: 0, width: 0, height: 1, x: 0, y: top, toJSON() {} }) as DOMRect
  return el
}

function harness(over: Partial<BottomReachOptions> = {}) {
  let pending = false
  const calls: number[] = []
  const options: BottomReachOptions = {
    sentinel: () => fakeSentinel(0),
    hasContent: () => true,
    hidden: () => false,
    state: () => ({ loading: false, noMore: false, pending }),
    setPending: (value) => {
      pending = value
    },
    request: () => calls.push(1),
    ...over,
  }
  return { reach: createBottomReach(options), calls, pending: () => pending }
}

describe('shouldRequestMore 触底判定（触底内核唯一真源）', () => {
  const base = { loading: false, noMore: false, pending: false }

  it('哨兵进入视口（含 240px 提前量）才触发；三态任一为真不触发', () => {
    expect(shouldRequestMore(500, 600, base)).toBe(true)
    expect(shouldRequestMore(840, 600, base)).toBe(true)
    expect(shouldRequestMore(841, 600, base)).toBe(false)
    expect(shouldRequestMore(500, 600, { ...base, loading: true })).toBe(false)
    expect(shouldRequestMore(500, 600, { ...base, noMore: true })).toBe(false)
    expect(shouldRequestMore(500, 600, { ...base, pending: true })).toBe(false)
  })

  it('非法几何值不触发（SSR / 未布局退化安全）', () => {
    expect(shouldRequestMore(Number.NaN, 600, base)).toBe(false)
    expect(shouldRequestMore(500, 0, base)).toBe(false)
    expect(shouldRequestMore(500, Number.NaN, base)).toBe(false)
  })
})

describe('createBottomReach 触底协议状态机', () => {
  it('满足条件派发一次并置 pending；pending 未解除不重复派发', () => {
    const { reach, calls, pending } = harness()
    reach.check()
    expect(calls).toHaveLength(1)
    expect(pending()).toBe(true)
    reach.check()
    expect(calls).toHaveLength(1)
  })

  it('release 信号（items / slot 签名变化）解除 pending，下次检查再派发', () => {
    let release = false
    const { reach, calls } = harness({ release: () => release })
    reach.check()
    expect(calls).toHaveLength(1)
    release = true
    reach.check()
    expect(calls).toHaveLength(2)
  })

  it('守卫链：无内容 / 隐藏容器 / 哨兵缺失一律不派发', () => {
    const noContent = harness({ hasContent: () => false })
    noContent.reach.check()
    expect(noContent.calls).toHaveLength(0)

    const hidden = harness({ hidden: () => true })
    hidden.reach.check()
    expect(hidden.calls).toHaveLength(0)

    const noSentinel = harness({ sentinel: () => null })
    noSentinel.reach.check()
    expect(noSentinel.calls).toHaveLength(0)
  })

  it('loading / no-more 态不派发（宿主应答语义）', () => {
    let loading = true
    const { reach, calls } = harness({ state: () => ({ loading, noMore: false, pending: false }) })
    reach.check()
    expect(calls).toHaveLength(0)
    loading = false
    reach.check()
    expect(calls).toHaveLength(1)
  })

  it('哨兵在视口外不派发（240px 提前量之外）', () => {
    const { reach, calls } = harness({ sentinel: () => fakeSentinel(100000) })
    reach.check()
    expect(calls).toHaveLength(0)
  })
})

describe('isHiddenInTree 可见性守卫', () => {
  it('祖先 display:none 链路 → 隐藏；正常挂载 → 可见', () => {
    const wrapper = document.createElement('div')
    const el = document.createElement('div')
    wrapper.appendChild(el)
    document.body.appendChild(wrapper)
    expect(isHiddenInTree(el)).toBe(false)
    wrapper.style.display = 'none'
    expect(isHiddenInTree(el)).toBe(true)
  })
})

describe('watchBottomReach 滚动 / 尺寸监听（rAF 合并）', () => {
  it('scroll / resize 触发检查，同帧多次事件合并为一次；解绑后不再触发', async () => {
    let count = 0
    const unbind = watchBottomReach(() => {
      count++
    })
    document.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(count).toBe(1)
    unbind()
    document.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(count).toBe(1)
  })
})

describe('renderMoreState 加载更多区三态渲染', () => {
  function refs() {
    const more = document.createElement('div')
    const spinner = document.createElement('span')
    const text = document.createElement('span')
    return { more, spinner, text }
  }
  const labels = { loading: '加载中…', noMore: '没有更多了' }

  it('无内容时整区隐藏；有内容时按 loading / no-more / 缺省切换文案与 spinner', () => {
    const r = refs()
    renderMoreState({ ...r, labels, hasContent: false, loading: false, noMore: false })
    expect(r.more.hidden).toBe(true)

    renderMoreState({ ...r, labels, hasContent: true, loading: false, noMore: false })
    expect(r.more.hidden).toBe(false)
    expect(r.spinner.hidden).toBe(true)
    expect(r.text.hidden).toBe(true)

    renderMoreState({ ...r, labels, hasContent: true, loading: true, noMore: false })
    expect(r.spinner.hidden).toBe(false)
    expect(r.text.textContent).toBe('加载中…')
    expect(r.text.hidden).toBe(false)

    renderMoreState({ ...r, labels, hasContent: true, loading: false, noMore: true })
    expect(r.spinner.hidden).toBe(true)
    expect(r.text.textContent).toBe('没有更多了')
    expect(r.text.hidden).toBe(false)
  })

  it('元素缺失（未渲染 / 已摘除）不抛错', () => {
    expect(() =>
      renderMoreState({
        more: null,
        spinner: null,
        text: null,
        labels,
        hasContent: true,
        loading: true,
        noMore: false,
      }),
    ).not.toThrow()
  })
})
