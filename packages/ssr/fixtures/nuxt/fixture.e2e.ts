import { test, expect, type Page } from '@playwright/test'

/**
 * T11 Nuxt fixture 验收（`nuxt build` + `node .output/server/index.mjs`）：
 * DSD 页由 Nitro 原样 HTML 输出；Vue 模板页覆盖 @oas-ui/nuxt 的 isCustomElement 配置。
 */

const CASES = [
  { locale: 'zh-CN', render: 'zh-CN', empty: '暂无数据', select: '请选择', tool: '已完成', dir: 'ltr' },
  { locale: 'en-US', render: 'en', empty: 'No data', select: 'Please select', tool: 'Completed', dir: 'ltr' },
  { locale: 'ar', render: 'ar', empty: 'لا توجد بيانات', select: 'يرجى الاختيار', tool: 'مكتمل', dir: 'rtl' },
] as const

const HOSTS = {
  empty: 'oas-empty',
  table: 'oas-table',
  select: 'oas-select',
  tool: 'oas-tool-call',
} as const

const url = (locale: string, theme = 'light') => `/?locale=${encodeURIComponent(locale)}&theme=${theme}`

async function shadowText(page: Page, caseId: keyof typeof HOSTS): Promise<string> {
  return page
    .locator(`[data-case="${caseId}"] ${HOSTS[caseId]}`)
    .evaluate((el) => (el.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim())
}

test.describe('Nuxt fixture', () => {
  test('冷/热混合 locale 请求逐 ID 语言正确且请求互不串扰', async ({ page, request }) => {
    const order = [...CASES, CASES[0]]

    for (const item of order) {
      const response = await request.get(url(item.locale))
      expect(response.status(), item.locale).toBe(200)
      const html = await response.text()
      expect(html, item.locale).toContain('shadowrootmode="open"')
      expect(html, item.locale).toContain(`data-locale="${item.render}"`)
      expect(html, item.locale).toContain(`data-request-locale="${item.locale}"`)
      expect(html, `${item.locale} empty`).toContain(item.empty)
      expect(html, `${item.locale} tool`).toContain(item.tool)
      expect(html, `${item.locale} select`).toContain(item.select)
      for (const other of CASES) {
        if (other.locale === item.locale) continue
        expect(html, `${item.locale} 不应含 ${other.locale} 文案`).not.toContain(other.empty)
        expect(html, `${item.locale} 不应含 ${other.locale} 文案`).not.toContain(other.tool)
      }

      await page.goto(url(item.locale))
      expect(await page.locator('main').getAttribute('data-locale')).toBe(item.render)
      expect(await page.locator('main').getAttribute('dir')).toBe(item.dir)
      await expect.poll(() => shadowText(page, 'empty')).toContain(item.empty)
      await expect.poll(() => shadowText(page, 'table')).toContain(item.empty)
      await expect.poll(() => shadowText(page, 'select')).toContain(item.select)
      await expect.poll(() => shadowText(page, 'tool')).toContain(item.tool)
    }
  })

  test('禁 JS 时 DSD 快照逐 ID 可见（服务端渲染证据）', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    try {
      for (const item of CASES) {
        const response = await page.goto(url(item.locale))
        expect(response?.status(), item.locale).toBe(200)

        const snapshot = await page.evaluate(() => {
          const read = (id: string, tag: string) => {
            const el = document.querySelector(`[data-case="${id}"] ${tag}`)
            return {
              host: el !== null,
              shadow: !!el?.shadowRoot,
              text: (el?.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim(),
            }
          }
          return {
            empty: read('empty', 'oas-empty'),
            table: read('table', 'oas-table'),
            select: read('select', 'oas-select'),
            tool: read('tool', 'oas-tool-call'),
            leftoverTemplates: document.querySelectorAll('template[shadowrootmode]').length,
            clientRegistered: typeof customElements.get === 'function' && !!customElements.get('oas-empty'),
            theme: document.documentElement.getAttribute('data-theme'),
          }
        })

        for (const [id, expected] of [
          ['empty', item.empty],
          ['table', item.empty],
          ['select', item.select],
          ['tool', item.tool],
        ] as const) {
          const seen = snapshot[id]
          expect(seen.host, `${item.locale} ${id} 宿主存在`).toBe(true)
          expect(seen.shadow, `${item.locale} ${id} 已附加 shadow root`).toBe(true)
          expect(seen.text, `${item.locale} ${id} 文案`).toContain(expected)
        }
        expect(snapshot.leftoverTemplates, `${item.locale} DSD 模板不残留`).toBe(0)
        expect(snapshot.clientRegistered, `${item.locale} 组件未注册`).toBe(false)
      }

      // 暗色同样禁 JS：token 由内联主题 CSS 提供
      await page.goto(url('zh-CN', 'dark'))
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
      await expect.poll(() => shadowText(page, 'empty')).toContain('暂无数据')
    } finally {
      await context.close()
    }
  })

  test('水合复用 DSD shadow root（style/meta 节点引用不重建）', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`[console.${message.type()}] ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`))

    await page.route('**/vendor/oas-client.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await route.continue()
    })
    await page.goto(url('zh-CN'), { waitUntil: 'commit' })
    await page.locator('[data-case="empty"] oas-empty').waitFor({ state: 'attached' })

    const stamped = await page.evaluate(() => {
      const map: Record<string, boolean> = {}
      for (const [id, tag] of Object.entries({
        empty: 'oas-empty',
        table: 'oas-table',
        select: 'oas-select',
        tool: 'oas-tool-call',
      })) {
        const el = document.querySelector(`[data-case="${id}"] ${tag}`)
        const style = el?.shadowRoot?.querySelector('style')
        const meta = el?.shadowRoot?.querySelector('meta[data-oas-ssr]')
        if (style) style.setAttribute('data-hydration-mark', id)
        map[id] = !!style && !!meta
      }
      return map
    })
    expect(stamped).toEqual({ empty: true, table: true, select: true, tool: true })

    await page.waitForFunction(
      () =>
        (window as unknown as { __oasClientReady?: boolean }).__oasClientReady === true &&
        ['oas-empty', 'oas-table', 'oas-select', 'oas-tool-call'].every((tag) => !!customElements.get(tag)),
      undefined,
      { timeout: 30_000 },
    )
    await page.waitForTimeout(500)

    const after = await page.evaluate(() => {
      const result: Record<string, { mark: string | null; meta: boolean }> = {}
      for (const [id, tag] of Object.entries({
        empty: 'oas-empty',
        table: 'oas-table',
        select: 'oas-select',
        tool: 'oas-tool-call',
      })) {
        const el = document.querySelector(`[data-case="${id}"] ${tag}`)
        result[id] = {
          mark: el?.shadowRoot?.querySelector('style')?.getAttribute('data-hydration-mark') ?? null,
          meta: !!el?.shadowRoot?.querySelector('meta[data-oas-ssr]'),
        }
      }
      return result
    })
    for (const id of Object.keys(HOSTS)) {
      expect(after[id]?.mark, `${id} 的 style 节点被重建（水合未复用快照）`).toBe(id)
      expect(after[id]?.meta, `${id} 的 SSR 指纹 meta 未被消费（hydrate 未接管，走了 render 重建）`).toBe(false)
    }
    await expect.poll(() => shadowText(page, 'empty')).toContain('暂无数据')
    expect(problems).toEqual([])
  })

  test('tool-call 点击展开/收起，oas-toggle 每次点击恰好一次', async ({ page }) => {
    await page.goto(url('zh-CN'))
    await page.waitForFunction(() => !!customElements.get('oas-tool-call'))

    const host = page.locator('[data-case="tool"] oas-tool-call')
    const head = host.locator('[part="head"]')
    const body = host.locator('[part="body"]')
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(body).toBeHidden()

    await page.evaluate(() => {
      const el = document.querySelector('[data-case="tool"] oas-tool-call')
      const events: Array<{ open: boolean; name: string }> = []
      ;(window as unknown as { __toggleEvents: typeof events }).__toggleEvents = events
      el?.addEventListener('oas-toggle', (event) => {
        events.push((event as CustomEvent).detail)
      })
    })

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect(body).toBeVisible()
    await expect.poll(() => host.getAttribute('open')).toBe('')

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(body).toBeHidden()
    await expect.poll(() => host.getAttribute('open')).toBeNull()

    const events = await page.evaluate(
      () => (window as unknown as { __toggleEvents: Array<{ open: boolean; name: string }> }).__toggleEvents,
    )
    expect(events).toEqual([
      { open: true, name: 'search_docs' },
      { open: false, name: 'search_docs' },
    ])
  })

  test('Vue 模板页：isCustomElement 生效、SSR + 升级、console 零告警', async ({ page, request }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`[console.${message.type()}] ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`))

    const response = await request.get('/vue')
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('<oas-empty')
    expect(html).toContain('data-case="vue-empty"')

    await page.goto('/vue')
    await page.waitForFunction(() => !!customElements.get('oas-empty'))
    const empty = page.locator('[data-case="vue-empty"]')
    await expect(empty).toBeVisible()
    await expect
      .poll(() => empty.evaluate((el) => (el.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim()))
      .toContain('暂无数据')
    // 模板里直接写了 oas-tag：模块未配置 isCustomElement 时会退化为未解析组件（Vue 告警 + 无 shadow）
    const tags = page.locator('oas-tag')
    await expect(tags).toHaveCount(2)
    // oas-tag 的文案走 light DOM slot（不在 shadow 内）；shadow 存在即已完成 upgrade
    await expect.poll(() => tags.first().evaluate((el) => el.textContent?.trim() ?? '')).toBe('alpha')
    await expect.poll(() => tags.first().evaluate((el) => !!el.shadowRoot)).toBe(true)
    expect(problems).toEqual([])
  })

  test('locale 导航与 Vue 页 console error/warning 与 pageerror 均为零', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        problems.push(`[console.${message.type()}] ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`))

    for (const item of CASES) {
      await page.goto(url(item.locale))
      await page.waitForFunction(() => (window as unknown as { __oasClientReady?: boolean }).__oasClientReady === true)
      await expect.poll(() => shadowText(page, 'empty')).toContain(item.empty)
    }
    expect(problems).toEqual([])
  })
})
