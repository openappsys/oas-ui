import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// Vue property 劫持门禁（SPA 导航全量扫描）：
// Vue 模板渲染时，若 'attr' in el 为 true（class 字段/prototype 方法/内建属性如 Element.prefix），
// 会走 property 赋值而非 setAttribute——组件若只读 attribute 就静默丢值（table 无数据、
// input prefix 丢失、select options 为空等同款根因）。SSR 硬加载恰好没事，只有 SPA 客户端渲染发作。
// 检测：SPA 导航到每页，vnode.props 里的 attribute 键若在元素上缺失且原型链无 setter
// （有 setter = 设计好的 property 入口，如 chart.data/options），即为漏网。
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))

test('Vue property 劫持门禁：全页 SPA 扫描', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-button', { timeout: 10000 })

  const report: Record<string, Record<string, string[]>> = {}
  for (const name of PAGES) {
    // 总览页（index.md）在侧栏的链接形态与其他组件页不同：Vitepress 对目录 index 归一化为
    // /components/（末尾斜杠），其余页为 /components/{name}.html（已实测确认，曾因
    // 硬查 a[href="/components/index.html"] 取到 null 导致 .click() 抛 TypeError）。
    // 按形态取锚点：index 优先末尾斜杠形态，其余用 .html 形态；找不到才抛明确错误。
    const hrefs = name === 'index' ? ['/components/'] : [`/components/${name}.html`]
    await page.evaluate((hs) => {
      const a = hs
        .map((h) => document.querySelector<HTMLAnchorElement>(`a[href="${h}"]`))
        .find((el): el is HTMLAnchorElement => el !== null)
      if (!a) throw new Error(`未找到侧栏锚点：${hs.join(' / ')}`)
      a.click()
    }, hrefs)
    await page.waitForURL(name === 'index' ? '**/components/' : `**/components/${name}.html`)
    await page.waitForTimeout(250)

    const missing = await page.evaluate(() => {
      const hasSetter = (el: Element, key: string): boolean => {
        let obj: object | null = el
        while (obj) {
          const d = Object.getOwnPropertyDescriptor(obj, key)
          if (d) return !!d.set
          obj = Object.getPrototypeOf(obj)
        }
        return false
      }
      const out: Record<string, string[]> = {}
      for (const el of document.querySelectorAll('*')) {
        if (!el.tagName.toLowerCase().startsWith('oas-')) continue
        const vnode = (el as any).__vnode
        if (!vnode?.props) continue
        const lost = Object.keys(vnode.props).filter(
          (k) =>
            !/^(class|style|key|ref|on[A-Z])/.test(k) && !el.hasAttribute(k) && !hasSetter(el, k),
        )
        if (lost.length) {
          const tag = el.tagName.toLowerCase()
          out[tag] = [...new Set([...(out[tag] ?? []), ...lost])]
        }
      }
      return out
    })
    if (Object.keys(missing).length) report[name] = missing
  }

  expect(
    report,
    `存在 Vue property 劫持漏网：\n${JSON.stringify(report, null, 2)}`,
  ).toEqual({})
})
