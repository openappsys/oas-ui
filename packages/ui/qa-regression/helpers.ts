import type { Locator, Page } from '@playwright/test'

// 复核回归共享工具。历次人工复核发现并修复的缺陷，固化为各组件 spec 的断言防止复发。
// 覆盖：选中态可见性、纵向布局、圆角合并、hover 可读性、addon 属性存活、点击不滚动、demo 事件反馈。

// 等待组件 upgrade 完成：要求「已挂载 + shadowRoot 就绪」，不要求可见。
// 浮层类组件（drawer/modal/tooltip）关闭时宿主盒 0×0，等 visible 会超时——旧实现靠
// 「upgrade 前 light-DOM 内容仍在流里渲染」的竞态窗口侥幸通过（慢 server 掩盖了这一点）。
export async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { state: 'attached', timeout: 15000 })
  await p.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, sel, {
    timeout: 15000,
  })
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
