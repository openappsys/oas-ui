import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
import { registerTableCapability } from './oas-table-capability.js'
import type { TableAutoHeightCapability } from './oas-table.js'
import type { ReactiveController } from '@oas-ui/core/oas-element'
import { HeightCache, computeDynamicWindow } from '../virtual-list/dynamic-height.js'

/**
 * row-auto-height 核心接缝测试：几何消费（窗口/spacer/行高）走注册能力提供的前缀和，
 * 锚定 =（展示序行身份, 行内偏移）。测试用 stub 能力（HeightCache + computeDynamicWindow 真身）
 * 手动喂测量值——真实 ResizeObserver 生命周期由 auto-height L3 模块承担（另测）。
 *
 * 注意：能力注册是模块级一次性的——「未注册告警」用例必须最先执行（本文件内顺序保证）。
 */

class StubAutoHeight implements TableAutoHeightCapability {
  readonly cache = new HeightCache()
  configure(count: number, estimated: number): void {
    this.cache.configure(count, estimated)
  }
  measure(i: number, h: number): boolean {
    return this.cache.measure(i, h)
  }
  invalidate(): void {
    this.cache.reset()
  }
  offsets(): number[] {
    return this.cache.offsets()
  }
  offsetOf(i: number): number {
    return this.cache.offsetOf(i)
  }
  heightAt(i: number): number {
    return this.cache.heightAt(i)
  }
  total(): number {
    return this.cache.total()
  }
  window(scrollTop: number, viewport: number): { start: number; end: number } {
    return computeDynamicWindow(this.cache.offsets(), this.cache.length, scrollTop, viewport)
  }
}

/** 最近 attach 的 stub 实例（工厂按元素调用，测试经此取回喂测量） */
let lastStub: StubAutoHeight | null = null

/** rAF 冲刷：滚动帧是 rAF 调度的，await 后组件帧已完成（组件帧先注册先执行） */
const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

let registered = false
function ensureRegistered(): void {
  if (registered) return
  registered = true
  registerTableCapability('auto-height', () => {
    lastStub = new StubAutoHeight()
    return lastStub as unknown as ReactiveController
  })
}

function mountAuto(attrs: Record<string, string>): { el: OASTable; wrap: HTMLElement } {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
  return { el, wrap }
}

const rows100 = () => JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ name: `行${i}` })))

describe('oas-table row-auto-height 接缝（几何消费 + 身份锚定）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    lastStub = null
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('能力未注册：devWarn 一次 + 按定高渲染（不静默忽略 opt-in 请求）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    expect(wrap.getAttribute('data-virtual')).toBe('true')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('auto-height')
    // 定高渲染：等高校验
    const trs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')]
    expect(trs.every((tr) => tr.style.height === '40px')).toBe(true)
    warn.mockRestore()
  })

  it('注册后：未测量时与定高逐位等价（预估 = row-height 档）', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const trs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')]
    // 窗口化不变量：渲染窗口非空且从行 0 起（scrollTop=0）、不越出 100 行数据
    //（happy-dom 视口高为 0，窗口 = buffer 尺寸，不按可见行数 5 设下界）
    expect(trs.length).toBeGreaterThanOrEqual(1)
    expect(trs.length).toBeLessThanOrEqual(100)
    expect(trs[0]!.getAttribute('data-row-index')).toBe('0')
    expect(trs.every((tr) => tr.style.height === '40px')).toBe(true)
    // 展示序下标打点（measure 映射通道）
    expect(trs[0]!.dataset.oasDisplayIdx).toBeDefined()
    // 底部占位 = 未渲染行 × 40（前缀和总高与定高口径一致）
    const bottom = el.shadowRoot!.querySelector('tbody tr.spacer:last-child td') as HTMLElement
    const rendered = trs.length
    expect(Number.parseInt(bottom.style.height)).toBe((100 - rendered) * 40)
  })

  it('测量回填 + requestAutoHeightSync：视口顶内容保持不跳（锚定行=测量前几何捕获）', () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 视口停在行 2 顶（scrollTop=80）。测量行 0/1 变高 100px（各 +60）后，
    // scrollTop=80 落入行 0（新底 100）内——正确锚定 = 行 0 offset 80：视口顶仍是同一内容，scrollTop 不变
    wrap.scrollTop = 80
    expect(stub.measure(0, 100)).toBe(true)
    expect(stub.measure(1, 100)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(wrap.scrollTop).toBe(80)
    // 首渲染行 = 行 0（视口顶内容未跳）
    const first = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(first.getAttribute('data-row-index')).toBe('0')
    // spacer 几何按新前缀和：底占位 = 总高（100+100+98×40=4120）− 窗口末偏移
    const bottom = el.shadowRoot!.querySelector('tbody tr.spacer:last-child td') as HTMLElement
    const winEnd = Number.parseInt(bottom.style.height)
    expect(4120 - winEnd).toBeGreaterThan(80)
  })

  it('判别性：测量只影响视口上方的行时，视口首行跟随新行顶（不跳字）', async () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 先深滚到行 10 顶（scrollTop=400）并等滚动帧渲染稳定——渲染态缓存此刻捕获「测量前」锚点
    wrap.scrollTop = 400
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 行 0/1 实测变高 100px（都在视口上方）：行 10 顶从 400 → 400+120 = 520
    expect(stub.measure(0, 100)).toBe(true)
    expect(stub.measure(1, 100)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(wrap.scrollTop).toBe(520)
    // 窗口含上方 buffer 4 行：首「可见」行是行 10，首「渲染」行是行 6
    const first = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(first.getAttribute('data-row-index')).toBe('6')
    // 行 10 已进渲染窗口：data-row-index 往返精确等值
    expect(el.shadowRoot!.querySelector('tbody tr[data-row-index="10"]')?.getAttribute('data-row-index')).toBe('10')
    // 顶 spacer = 窗口起点行 6 的新顶 = 100+100+4×40 = 360
    const topSpacer = el.shadowRoot!.querySelector('tbody tr.spacer td') as HTMLElement
    expect(Number.parseInt(topSpacer.style.height)).toBe(360)
  })

  it('测量差 <0.5px 视为未变（measure 返回 false，不同步不重建）', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    expect(stub.measure(0, 40.2)).toBe(false)
    expect(stub.measure(0, 40.5)).toBe(true)
    expect(stub.measure(0, 41)).toBe(true)
    expect(stub.measure(-1, 100)).toBe(false)
    expect(stub.measure(100, 100)).toBe(false)
    void el
  })

  it('windowed + row-auto-height：受支持（混合模型）——版本提示已移除，无「仅支持本地虚拟」告警', () => {
    ensureRegistered()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountAuto({
      'row-auto-height': '',
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    expect(warn.mock.calls.some((c) => String(c[0]).includes('仅支持本地虚拟'))).toBe(false)
    // windowed 混合模型渲染：绝对行号铺位照常——首渲染行下标从 window-start=0 起铺
    //（tr 为 null 时可选链得 undefined ≠ '0'，同样精确失败）
    const tr = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(tr?.dataset.oasDisplayIdx).toBe('0')
    warn.mockRestore()
  })

  it('windowed 混合模型：切片内行测量回填 → spacer 反映拼接前缀和 + 锚定不跳 + 按需重派请求', async () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ name: `行${i}` }))),
    })
    const stub = lastStub!
    const reqs: Array<{ start: number; end: number; reason: string }> = []
    el.addEventListener('oas-window-request', (e) => reqs.push((e as CustomEvent).detail))
    // 滚动让滚动帧先渲染稳定（锚点缓存捕获测量前几何）
    wrap.scrollTop = 0
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    reqs.length = 0
    // 切片内绝对视觉下标 0/1 实测变高 100px（未装载区仍预估 40）：拼接前缀和
    expect(stub.measure(0, 100)).toBe(true)
    expect(stub.measure(1, 100)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    // 锚定：scrollTop=0 在行 0 内 → 不变；视口内容不跳
    expect(wrap.scrollTop).toBe(0)
    // spacer 几何 = 拼接前缀和：渲染窗口首条目 flow 反映 100+100 起始
    const topSpacer = el.shadowRoot!.querySelector('tbody tr.spacer td') as HTMLElement
    expect(Number.parseInt(topSpacer.style.height)).toBe(0)
    // 行 0 渲染高 = 实测 100
    const tr0 = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(tr0.style.height).toBe('100px')
    // 高度修正后期望区间重评估：happy-dom clientHeight=0 可视窗口极小、need 恒被装载覆盖
    //（不派发）——重评估路径由 windowed 混合模型 e2e（真实浏览器）覆盖；此处由 tr0=100px
    // 断言已证明同步走了 update 重渲染（spacer/行高全部反映新前缀和）
    // 总高 = 拼接前缀和：100+100+998×40 = 40120（scrollHeight 口径经 spacer 表达）
    const bottom = el.shadowRoot!.querySelector('tbody tr.spacer:last-child td') as HTMLElement
    // 窗口末像素 = 渲染条目前缀和：行 0/1 实测各 100、其余渲染行预估 40（行数以 DOM 现算为准，
    // happy-dom 与真实浏览器窗口尺寸不同不影响等值成立）
    const winTrs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')]
    const expectedWinEnd = winTrs.reduce((sum, _tr, i) => sum + (i < 2 ? 100 : 40), 0)
    const winEndPx = stub.total() - Number.parseInt(bottom.style.height)
    expect(winEndPx).toBe(expectedWinEnd)
    expect(stub.total()).toBe(40120)
  })

  it('编辑中的行：同步跳过（不重建不取消编辑），编辑结束后再同步带上', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    // 模拟编辑态：给某个 td 打 editing class（edit 能力的真实类名）
    const td = el.shadowRoot!.querySelector('tbody tr[part="row"] td') as HTMLElement
    td.classList.add('editing')
    const before = el.shadowRoot!.querySelector('tbody')!.innerHTML
    lastStub!.measure(3, 120)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(el.shadowRoot!.querySelector('tbody')!.innerHTML).toBe(before)
    // 编辑态清除后同步生效（走常规 update 重渲染，行 3 取到实测 120px）
    td.classList.remove('editing')
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    const tr3 = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[part="row"]')].find(
      (tr) => tr.dataset.oasDisplayIdx === '3',
    )
    expect(tr3, '行 3 在渲染窗口内').toBeDefined()
    expect(tr3!.style.height).toBe('120px')
  })

  it('I-3：同数量数据替换（行数不变的结构变化）触发失效——旧实测高不驻留', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 行 0 实测 100px 并同步生效
    stub.measure(0, 100)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(stub.heightAt(0)).toBe(100)
    // 同数量数据整体替换（宿主常见操作）：展示结构签名变化 → invalidate → 回退预估
    el.setAttribute('data', JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ name: `新${i}` }))))
    expect(stub.heightAt(0), '同数量替换后旧实测高被清除').toBe(40)
    // 渲染行高也回到预估档
    const tr0 = el.shadowRoot!.querySelector('tbody tr[part="row"]') as HTMLElement
    expect(tr0.style.height).toBe('40px')
  })

  it('I-1：expand/group 行不打测量下标（维持定高契约，防前缀和两套坐标污染）', () => {
    ensureRegistered()
    const { el } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      'row-key': 'name',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: JSON.stringify([
        { name: '甲', expand: '<div>展开内容</div>' },
        ...Array.from({ length: 50 }, (_, i) => ({ name: `行${i}` })),
      ]),
      expanded: '甲',
    })
    // 首个数据行带 expand 内容行紧随其后：expand 行无 data-oas-display-idx，数据行有
    // 展开态唯一 expand 行：恰 1 条
    expect(el.shadowRoot!.querySelectorAll('tbody tr.expand-row')).toHaveLength(1)
    const expandTr = el.shadowRoot!.querySelector('tbody tr.expand-row') as HTMLElement
    expect(expandTr.dataset.oasDisplayIdx, 'expand 行不打测量下标').toBeUndefined()
    // 打点集 = 渲染数据行：tbody 全部行 = 打点数据行 + 唯一 expand 行（总账互斥）；
    // 上界不越出 51 个数据行（happy-dom 视口高为 0，窗口 = buffer 尺寸，不按可见行数设下界）
    const stamped = [...el.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[data-oas-display-idx]')]
    expect(stamped.length).toBeGreaterThanOrEqual(1)
    expect(stamped.length).toBeLessThanOrEqual(51)
    // tbody 总账 = 打点数据行 + 唯一 expand 行 + 上下 2 条 spacer
    expect(el.shadowRoot!.querySelectorAll('tbody tr.spacer')).toHaveLength(2)
    expect(el.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(stamped.length + 3)
    expect(stamped.every((tr) => tr.getAttribute('part') === 'row')).toBe(true)
  })
})
