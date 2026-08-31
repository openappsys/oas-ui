import type { Page } from '@playwright/test'

// 复核回归共享工具。历次人工复核发现并修复的缺陷，固化为各组件 spec 的断言防止复发。
// 覆盖：选中态可见性、纵向布局、圆角合并、hover 可读性、addon 属性存活、点击不滚动、demo 事件反馈。

export async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { timeout: 15000 })
  await p.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, sel, {
    timeout: 15000,
  })
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
