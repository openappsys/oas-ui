import type { Locator, Page } from '@playwright/test'

// 复核回归共享工具。历次人工复核发现并修复的缺陷，固化为各组件 spec 的断言防止复发。
// 覆盖：选中态可见性、纵向布局、圆角合并、hover 可读性、addon 属性存活、点击不滚动、demo 事件反馈。

// 等待组件 upgrade 完成：要求「已挂载 + shadowRoot 就绪」，不要求可见。
// 浮层类组件（drawer/modal/tooltip）关闭时宿主盒 0×0，等 visible 会超时——旧实现靠
// 「upgrade 前 light-DOM 内容仍在流里渲染」的竞态窗口侥幸通过（慢 server 掩盖了这一点）。
export async function up(p: import('@playwright/test').Page, sel: string, timeout = 15000) {
  await p.waitForSelector(sel, { state: 'attached', timeout })
  await p.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, sel, {
    timeout,
  })
}

// 等待 window.scrollY 静默 quietMs——页面初始自动滚动（如 default-editing demo 挂载即
// 聚焦 input 的焦点滚动）结束后，页面才处于可交互的稳定位置。
async function settleScroll(p: import('@playwright/test').Page, quietMs = 400): Promise<void> {
  await p.waitForFunction(
    (q) => {
      const w = window as any
      if (w.__sqY !== window.scrollY) {
        w.__sqY = window.scrollY
        w.__sqT = performance.now()
        return false
      }
      return performance.now() - w.__sqT >= q
    },
    quietMs,
    { timeout: 15000, polling: 60 },
  )
}

// 清除页面初始焦点并等滚动静默。
// 背景：demo 页的 default-editing 组件挂载即进编辑态并聚焦其 input；此后任何真实交互
// （点击/聚焦远处元素）都会让它失焦 → submit-on-blur 提交 → focusTrigger 归还焦点
// → 焦点滚动把页面拽回它那里，正在进行的点击/按键随之丢失（事件派发到错误坐标）。
// 主动 blur 触发同一条提交链后等滚动静默，后续交互不再被焦点滚动干扰。
export async function defocus(p: import('@playwright/test').Page): Promise<void> {
  await p.evaluate(() => {
    // shadow DOM 里的焦点元素会以 host 形式出现在 document.activeElement
    const ae = document.activeElement as HTMLElement | null
    const inner =
      ae?.shadowRoot && (ae.shadowRoot.activeElement as HTMLElement | null) != null
        ? (ae.shadowRoot.activeElement as HTMLElement)
        : ae
    inner?.blur()
  })
  await settleScroll(p)
}

// 把目标元素滚进视口中央（JS scrollIntoView，强制布局、位置精确），返回视口中心点坐标。
// 不用 locator 的 boundingBox：页面加载初期 CDP 盒子模型可能滞后于焦点滚动后的真实布局。
async function centerOf(
  p: import('@playwright/test').Page,
  hostSel: string,
  innerSel: string | null,
): Promise<{ x: number; y: number }> {
  await p.evaluate(
    ({ hostSel, innerSel }) => {
      const host = document.querySelector(hostSel)
      const target = innerSel ? host?.shadowRoot?.querySelector(innerSel) : host
      target?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    },
    { hostSel, innerSel },
  )
  return p.evaluate(
    ({ hostSel, innerSel }) => {
      const host = document.querySelector(hostSel)!
      const target = innerSel ? host.shadowRoot!.querySelector(innerSel)! : host
      const r = target.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    },
    { hostSel, innerSel },
  )
}

// 真实鼠标点击 shadow DOM 内目标：defocus → JS 滚动到位 → CDP Input 派发真实鼠标事件。
// 相比 locator.click：绕开页面加载初期焦点滚动/CDF 盒子错位导致的「滚动到错误位置、
// 事件落到错误坐标」静默丢失问题；仍走完整真实事件路径（hit-test + down/up/click 序列）。
export async function realClick(
  p: import('@playwright/test').Page,
  hostSel: string,
  innerSel: string | null,
): Promise<void> {
  await defocus(p)
  const pt = await centerOf(p, hostSel, innerSel)
  await p.mouse.click(pt.x, pt.y)
}

/** waitForTableMutationQuiet 写在 window 上的观察态（按宿主 id 分槽，多表并存互不覆盖） */
interface TableQuietStore {
  states?: Map<string, { readonly count: number; mo: MutationObserver }>
  seen?: Map<string, { c: number; t: number }>
}

// 等表格 tbody 重建静默 quietMs。
//
// 语义：观察宿主 shadow 内当前 tbody 的 childList，任一重建批次到达即重置计时；连续 quietMs
// 无变更才返回——等的是「重建排空」这个状态，不是固定 sleep。
//
// 用途（实测归因）：oas-table 在挂载/尺寸测量/滚动帧/焦点 reveal 后会异步重建 tbody，
// 动作落在这一波重建里会被随后的重建直接抹掉——WebKit 行内编辑曾稳定复现：dblclick 后
// data-editing 已置 true、input.cell-editor 已挂载，约 26ms 后宿主又一次 tbody 重建
// （失败样本 rebuilds=5 vs 成功 2）把编辑态清空；单次 dblclick 落在即将销毁的 td 上时
// 编辑器则 5s 都不出现。故交互前先等排空，再单次派发动作（不重试、不延长超时）。
export async function waitForTableMutationQuiet(
  p: import('@playwright/test').Page,
  id: string,
  quiet = 500,
): Promise<void> {
  const sel = `#${id}`
  // 门：tbody 已渲染进 shadow（首帧可能还没有；挂载竞态与重建竞态无关，先分开等）
  await p.waitForFunction((s) => !!document.querySelector(s)?.shadowRoot?.querySelector('tbody'), sel, {
    timeout: 15000,
  })
  // 布防：只观察当前 tbody（核心模板里 tbody 容器稳定，重建 = 换子节点）
  await p.evaluate((s) => {
    const w = window as unknown as { __oasTableQuiet?: TableQuietStore }
    const store = (w.__oasTableQuiet ??= {})
    store.states ??= new Map()
    store.seen ??= new Map()
    store.states.get(s)?.mo.disconnect()
    const tbody = document.querySelector(s)!.shadowRoot!.querySelector('tbody')!
    let count = 0
    const mo = new MutationObserver(() => {
      count += 1
    })
    mo.observe(tbody, { childList: true })
    store.states.set(s, {
      get count() {
        return count
      },
      mo,
    })
    store.seen.delete(s)
  }, sel)
  // 静默判定：计数变化（含一次重建里的多批记录）即重置计时；计数单调，轮询漏拍也不会误判
  await p.waitForFunction(
    ({ s, q }) => {
      const store = (window as unknown as { __oasTableQuiet?: TableQuietStore }).__oasTableQuiet
      const state = store?.states?.get(s)
      if (!state) return false
      const seen = (store!.seen ??= new Map())
      const last = seen.get(s)
      if (!last || last.c !== state.count) {
        seen.set(s, { c: state.count, t: performance.now() })
        return false
      }
      return performance.now() - last.t >= q
    },
    { s: sel, q: quiet },
    { timeout: 15000, polling: 100 },
  )
  // 收线：观察器不留在页面上（后续交互/断言不再受其影响）
  await p.evaluate((s) => {
    const store = (window as unknown as { __oasTableQuiet?: TableQuietStore }).__oasTableQuiet
    store?.states?.get(s)?.mo.disconnect()
    store?.states?.delete(s)
    store?.seen?.delete(s)
  }, sel)
}

export interface PanelGeom {
  left: number
  anchorLeft: number
  width: number
  anchorWidth: number
}

// 浮层定位回归：首开→关→再开，返回两次的面板/锚点几何。
// 锁定不变量：面板「撑到锚点宽度」必须发生在定位之前——否则首开用塌缩宽度算 left 会偏（select 实测偏 +74px），
// 再开因上一次内联宽度还在才对齐。Escape/外部点击关闭；关闭失败时回退向 trigger 派发 Escape。
export async function panelGeometryAcrossOpens(
  p: Page,
  tag: string,
  openPanel: (host: Locator) => Promise<void>,
): Promise<{ first: PanelGeom; second: PanelGeom }> {
  const host = p.locator(tag).first()
  const dropOpen = (want: boolean) =>
    p.waitForFunction(
      ({ t, w }) => {
        const d = (document.querySelector(t) as Element | null)?.shadowRoot?.querySelector('[part="dropdown"]')
        return !!d && d.classList.contains('open') === w
      },
      { t: tag, w: want },
      { timeout: 5000 },
    )
  const read = (): Promise<PanelGeom> =>
    host.evaluate((el) => {
      const root = el.shadowRoot!
      const trig = (root.querySelector('[part="trigger"]') ?? root.querySelector('input')) as HTMLElement
      const drop = root.querySelector('[part="dropdown"]') as HTMLElement
      const t = trig.getBoundingClientRect()
      const d = drop.getBoundingClientRect()
      return { left: d.left, anchorLeft: t.left, width: d.width, anchorWidth: t.width }
    })
  const close = async () => {
    await host.evaluate((el) => {
      const trig = (el.shadowRoot!.querySelector('[part="trigger"]') ??
        el.shadowRoot!.querySelector('input')) as HTMLElement
      trig.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      // 一并 blur：combobox/auto-complete 仅靠 input focus 展开，仍聚焦时再次 click 不会触发 focus 事件
      trig.blur()
    })
    try {
      await dropOpen(false)
    } catch {
      await p.evaluate(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })))
      await dropOpen(false)
    }
  }
  await openPanel(host)
  await dropOpen(true)
  const first = await read()
  await close()
  await openPanel(host)
  await dropOpen(true)
  const second = await read()
  await close()
  return { first, second }
}

export async function visibleSubmenuRects(page: import('@playwright/test').Page): Promise<
  Array<{
    left: number
    right: number
    top: number
    bottom: number
    vw: number
    vh: number
    flipLeft: boolean
  }>
> {
  return page.evaluate(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const out: Array<{
      left: number
      right: number
      top: number
      bottom: number
      vw: number
      vh: number
      flipLeft: boolean
    }> = []
    const walk = (root: Document | ShadowRoot): void => {
      for (const el of root.querySelectorAll('*')) {
        if (el.getAttribute('part') === 'submenu') {
          const b = el.getBoundingClientRect()
          if (b.width > 0 && b.height > 0) {
            out.push({
              left: b.left,
              right: b.right,
              top: b.top,
              bottom: b.bottom,
              vw,
              vh,
              flipLeft: el.classList.contains('flip-left'),
            })
          }
        }
        if (el.shadowRoot) walk(el.shadowRoot)
      }
    }
    walk(document)
    return out
  })
}
