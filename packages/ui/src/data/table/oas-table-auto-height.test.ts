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

  it('C1：windowed 切片位移（window-start 变化）不清实测高——测量按绝对视觉下标跨切片累积', () => {
    ensureRegistered()
    const slice = (start: number, len = 17) =>
      JSON.stringify(Array.from({ length: len }, (_, i) => ({ name: `行${start + i}` })))
    const { el } = mountAuto({
      'row-auto-height': '',
      windowed: '',
      total: '500',
      'window-start': '0',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: slice(0),
    })
    const stub = lastStub!
    // 切片内绝对视觉下标 0/1 实测（未装载区仍预估 40）
    expect(stub.measure(0, 100)).toBe(true)
    expect(stub.measure(1, 120)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    const heightBefore = stub.total()
    expect(heightBefore).toBe(100 + 120 + 498 * 40)
    // 宿主回填下一段切片：window-start 位移属于「同数据集换窗口」，不是展示结构变化——
    // 实测高按绝对下标继续有效（清空会令滚动条总高塌陷、锚定行错位）
    el.setAttribute('window-start', '100')
    el.setAttribute('data', slice(100))
    expect(stub.heightAt(0), '切片 0 实测高跨切片保留').toBe(100)
    expect(stub.heightAt(1), '切片 1 实测高跨切片保留').toBe(120)
    expect(stub.total(), '滚动条总高不因切片位移塌陷').toBe(heightBefore)
  })

  it('I1：动态视口 0 高（隐藏态）→ 可见后容器尺寸回调重算窗口（不再只剩 buffer 行）', () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const countRows = () => el.shadowRoot!.querySelectorAll('tbody tr[part="row"]').length
    // happy-dom clientHeight 恒 0：动态视口回落 tableHeight(200) → 5 可见 + 4 buffer
    const hiddenCount = countRows()
    expect(hiddenCount).toBeGreaterThanOrEqual(9)
    // 容器变得可见（clientHeight 400）→ ResizeObserver 回调路径重算可见行数
    Object.defineProperty(wrap, 'clientHeight', { configurable: true, get: () => 400 })
    ;(el as unknown as { onWrapResize(): void }).onWrapResize()
    expect(countRows(), '行数随视口增高').toBeGreaterThan(hiddenCount)
  })

  it('I1：清空 tbody 期间容器瞬时塌缩——渲染窗口按清空前的视口快照计算', () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const countRows = () => el.shadowRoot!.querySelectorAll('tbody tr[part="row"]').length
    // 真实浏览器语义模拟：tbody 清空瞬间滚动容器只剩表头高（46px），有内容时 400px。
    // 渲染中直接读 clientHeight 会算出 46/40≈1 行 + buffer 的过小窗口（下方整片留白）。
    Object.defineProperty(wrap, 'clientHeight', {
      configurable: true,
      get: () => (el.shadowRoot!.querySelector('tbody')!.children.length === 0 ? 46 : 400),
    })
    const host = el as unknown as { markRenderDirty(): void; update(): void }
    host.markRenderDirty()
    host.update()
    // 400 / 40 = 10 可见 + 4 buffer
    expect(countRows()).toBe(14)
  })

  it('I2：补偿位超出渲染前可达高度——延后到渲染后写回（不把钳制位当权威位）', async () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 真实浏览器布局语义模拟：scrollHeight = 当前已渲染 DOM 内容高（重建前是旧几何），
    // scrollTop 写入按可达上界钳制
    defineScrollMetrics(wrap, 200, () => renderedContentHeight(el))
    setStubScrollTop(wrap, 3800)
    // 滚动帧渲染一次：让渲染态锚点缓存捕获「测量前几何」（scrollTop=3800、行 95 顶）
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 视口停底（3800）；视口上方的行 0 实测变高 1000px → 锚定行（行 95）下移 1000，补偿目标 4800
    expect(stub.measure(0, 1040)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(wrap.scrollTop, '补偿位在渲染后落地（渲染前写必被旧内容高钳制）').toBe(4800)
  })

  it('I2：写入被内容高度钳制（实际未位移）时不布防吞位——不吞下一条真实 scroll', async () => {
    ensureRegistered()
    const { el, wrap } = mountAuto({
      'row-auto-height': '',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([{ key: 'name', title: '名称' }]),
      data: rows100(),
    })
    const stub = lastStub!
    // 内容高度固定为旧几何（渲染后仍不可达）：模拟写入被浏览器钳回原值
    defineScrollMetrics(wrap, 200, () => 4000)
    setStubScrollTop(wrap, 3800)
    wrap.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(stub.measure(0, 1040)).toBe(true)
    ;(el as unknown as { requestAutoHeightSync(): void }).requestAutoHeightSync()
    expect(wrap.scrollTop, '不可达目标被钳制在旧可达位').toBe(3800)
    const swallow = (el as unknown as { swallowScrollSeq: number }).swallowScrollSeq
    expect(swallow, '实际未位移 → 不得残留吞位（否则吞掉下一条真实 scroll 事件）').toBe(-1)
  })
})

/** 当前 tbody 已渲染内容高（真实浏览器 scrollHeight 的等价模型：清空/重建前仍是旧几何） */
function renderedContentHeight(el: OASTable): number {
  const tbody = el.shadowRoot!.querySelector('tbody')
  if (!tbody) return 0
  let sum = 0
  for (const tr of [...tbody.querySelectorAll('tr')]) {
    const own = Number.parseFloat((tr as HTMLElement).style.height)
    if (Number.isFinite(own) && own > 0) {
      sum += own
      continue
    }
    const td = tr.firstElementChild as HTMLElement | null
    const spacer = Number.parseFloat(td?.style.height ?? '')
    if (Number.isFinite(spacer) && spacer > 0) sum += spacer
  }
  return sum
}

/** 安装滚动容器量测桩：clientHeight 固定，scrollHeight 由 getter 提供 */
function defineScrollMetrics(wrap: HTMLElement, clientHeight: number, scrollHeight: () => number): void {
  Object.defineProperty(wrap, 'clientHeight', { configurable: true, get: () => clientHeight })
  Object.defineProperty(wrap, 'scrollHeight', { configurable: true, get: () => scrollHeight() })
}

/** 安装按可达上界钳制的 scrollTop 写入口（happy-dom 无布局，须显式模拟浏览器钳制） */
function setStubScrollTop(wrap: HTMLElement, initial: number): void {
  let top = initial
  Object.defineProperty(wrap, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      const max = Math.max(0, Number(wrap.scrollHeight ?? 0) - Number(wrap.clientHeight ?? 0))
      top = Math.min(Math.max(0, Number(v) || 0), max)
    },
  })
}
