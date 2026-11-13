import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// server 行模型（row-model="server"）真实浏览器回归：请求协议、失败反馈、模式切换、
// hover 可读性（F1 修复的视觉层——happy-dom 测不了真 hover，这里以真实渲染计算样式闭环）。
// mock 宿主写法与 table.spec.ts 的 windowed spec 同构：动态注入 fixture 元素 + 事件监听回填。

/** packages/ui/dist 真实路径：helper 不在 docs bundle 的全局，路由映射 dist 后动态 import（同 table.spec.ts 先例） */
const builtUiDist = fileURLToPath(new URL('../dist', import.meta.url))

/** 把构建产物按稳定前缀暴露给页面，保证浏览器回归跑的是真实构建产物 */
async function serveBuiltUi(page: Page): Promise<void> {
  await page.route('**/__qa_ui__/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    const relative = decodeURIComponent(pathname.replace(/^\/__qa_ui__\//, ''))
    return route.fulfill({
      path: join(builtUiDist, relative),
      contentType: 'text/javascript',
    })
  })
}

/** 收集 console error / [oas-table] warning / pageerror（零告警门禁口径，与 table.spec.ts 同构） */
function collectConsoleIssues(page: Page): string[] {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[oas-')))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))
  return issues
}

async function gotoTablePage(page: Page): Promise<void> {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, { timeout: 15000 })
}

/** 注入 server fixture：挂载即派 init 请求；initState 可预置 hold/failNext（挂载前生效） */
async function mountServerFixture(
  page: Page,
  id: string,
  attrs: Record<string, string> = {},
  initState: { failNext?: boolean; hold?: boolean } = {},
): Promise<void> {
  await page.evaluate(
    ({ id, attrs, initState }) => {
      const el = document.createElement('oas-table')
      el.id = id
      el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', sortable: true }]))
      el.setAttribute('row-model', 'server')
      el.setAttribute('total', '40')
      el.setAttribute('pagination', '')
      el.setAttribute('page-size', '10')
      el.setAttribute('data', '[]')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      const state = {
        reqs: [] as Array<{ requestId: number; reason: string; start: number; end: number }>,
        errors: [] as Array<{ requestId: number; reason?: string }>,
        /** 置 true 后下一轮请求不回填而改走 reportRowsError（模拟失败轮） */
        failNext: false,
        /** 置 true 后请求只收集不响应（loading 永久在途，供稳定断言在途态） */
        hold: false,
        ...initState,
      }
      ;(window as any)[`__srvState_${id}`] = state
      el.addEventListener('oas-rows-request', (e) => {
        const d = (e as CustomEvent).detail
        state.reqs.push({
          requestId: d.requestId,
          reason: d.reason,
          start: d.start,
          end: d.end,
        })
        // mock 宿主异步响应（对齐真实宿主 fetch 时序）：不在派发同步栈内嵌套写属性
        //（同步写会在 update 渲染管线中途重入 attributeChangedCallback，与外层 update 竞态）
        setTimeout(() => {
          if (state.hold) return
          if (state.failNext) {
            state.failNext = false
            ;(el as any).reportRowsError({ requestId: d.requestId, reason: d.reason, error: new Error('mock failure') })
            return
          }
          const rows = Array.from({ length: d.end - d.start }, (_, i) => ({
            id: `r${d.start + i}`,
            name: `行${d.start + i}`,
          }))
          el.setAttribute('total', '40')
          el.setAttribute('data', JSON.stringify(rows))
        }, 0)
      })
      el.addEventListener('oas-rows-error', (e) => {
        const d = (e as CustomEvent).detail
        state.errors.push({ requestId: d.requestId, reason: d.reason })
      })
      // fixed 定位隔离容器：fixture 不进文档流——文档站页面的右侧目录浮层（aside）会
      // 拦截落在视口右缘的 pointer 事件（click/hover 卡 actionability 重试直到超时）
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px'
      host.appendChild(el)
      document.body.appendChild(host)
    },
    { id, attrs, initState },
  )
}

const stateOf = (page: Page, id: string) => page.evaluate((id) => (window as any)[`__srvState_${id}`], id)

const shadow = (page: Page, id: string) => page.locator(`#${id}`)

test('table server：请求序列 init/paginate/sort/filter + 页码重置 + 同值去重 + requestId 单调 + console 零告警', async ({
  page,
}) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)
  await mountServerFixture(page, 'table-server-seq')

  // ① init：挂载即派首载请求（requestId 1、区间 [0,10)），宿主回填后行渲染
  await page.waitForFunction(() => (window as any)['__srvState_table-server-seq'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  let state = await stateOf(page, 'table-server-seq')
  expect(state.reqs[0]).toMatchObject({ requestId: 1, reason: 'init', start: 0, end: 10 })
  await expect(shadow(page, 'table-server-seq').locator('tbody tr[part="row"]').first()).toContainText('行0')

  // ② 纯翻页：current 2 → paginate（不重置页码），requestId 2、区间 [10,20)
  await page.evaluate(() => {
    document.querySelector('#table-server-seq')!.setAttribute('current', '2')
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-seq'].reqs.length >= 2, null, {
    timeout: 15000,
  })
  state = await stateOf(page, 'table-server-seq')
  expect(state.reqs[1]).toMatchObject({ requestId: 2, reason: 'paginate', start: 10, end: 20 })
  await expect(shadow(page, 'table-server-seq').locator('tbody tr[part="row"]').first()).toContainText('行10')

  // ③ 排序：表头真点 → sort + 页码重置回 1（区间回 [0,10)），requestId 3
  await shadow(page, 'table-server-seq').locator('thead th.sortable').click()
  await page.waitForFunction(() => (window as any)['__srvState_table-server-seq'].reqs.length >= 3, null, {
    timeout: 15000,
  })
  state = await stateOf(page, 'table-server-seq')
  expect(state.reqs[2]).toMatchObject({ requestId: 3, reason: 'sort', start: 0, end: 10 })
  // 页码重置写回宿主属性（用户看到新口径首页）
  await page.waitForFunction(() => document.querySelector('#table-server-seq')!.getAttribute('current') === '1', null, {
    timeout: 15000,
  })

  // ④ 过滤：filter-values 变更 → filter + 页码保持 1，requestId 4
  await page.evaluate(() => {
    document.querySelector('#table-server-seq')!.setAttribute('filter-values', JSON.stringify({ name: '行' }))
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-seq'].reqs.length >= 4, null, {
    timeout: 15000,
  })
  state = await stateOf(page, 'table-server-seq')
  expect(state.reqs[3]).toMatchObject({ requestId: 4, reason: 'filter' })
  expect(state.reqs[3].start).toBe(0)

  // ② 同值去重：重复写同值 current / sort / filter-values → 零新请求；requestId 单调不回退
  await page.evaluate(() => {
    const el = document.querySelector('#table-server-seq')!
    el.setAttribute('current', '1')
    el.setAttribute('filter-values', JSON.stringify({ name: '行' }))
  })
  state = await stateOf(page, 'table-server-seq')
  expect(state.reqs.length, '同值属性写去重：零新请求').toBe(4)
  expect(
    state.reqs.map((r: { requestId: number }) => r.requestId),
    'requestId 严格单调递增',
  ).toEqual([1, 2, 3, 4])

  // ⑥ console 零告警（error + [oas-] 前缀 warning）
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})

test('table server：失败保留旧数据 + 错误条真点重试恢复 + console 零告警', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)
  await mountServerFixture(page, 'table-server-fail')

  // init 成功回填（首屏数据可见）
  await page.waitForFunction(() => (window as any)['__srvState_table-server-fail'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  await expect(shadow(page, 'table-server-fail').locator('tbody tr[part="row"]').first()).toContainText('行0')

  // 翻页 → mock 宿主本轮不回填而是报告失败（模拟网络失败轮）
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-fail'].failNext = true
    document.querySelector('#table-server-fail')!.setAttribute('current', '2')
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-fail'].errors.length >= 1, null, {
    timeout: 15000,
  })

  // 错误条可见（role=alert + 重试按钮）+ oas-rows-error 派发 + 旧数据保留（第 1 页行仍在）
  const errorBar = shadow(page, 'table-server-fail').locator('.rows-error')
  await expect(errorBar).toBeVisible()
  await expect(errorBar).toHaveAttribute('role', 'alert')
  await expect(errorBar.locator('.rows-error-retry')).toContainText('重试')
  const errState = await stateOf(page, 'table-server-fail')
  expect(errState.errors).toEqual([{ requestId: 2, reason: 'paginate' }])
  await expect(shadow(page, 'table-server-fail').locator('tbody tr[part="row"]').first()).toContainText('行0')

  // 真点重试：refresh 请求（requestId 3）→ mock 回填第 2 页 → 错误条消失、新页渲染
  await shadow(page, 'table-server-fail').locator('.rows-error-retry').click()
  await page.waitForFunction(() => (window as any)['__srvState_table-server-fail'].reqs.length >= 3, null, {
    timeout: 15000,
  })
  const retryState = await stateOf(page, 'table-server-fail')
  expect(retryState.reqs[2]).toMatchObject({ requestId: 3, reason: 'refresh', start: 10, end: 20 })
  await expect(errorBar).toBeHidden()
  await expect(shadow(page, 'table-server-fail').locator('tbody tr[part="row"]').first()).toContainText('行10')

  // R10 收紧请求总数（此前 >= 阈值对 F6 监听叠加回归不敏感）：回填落定后总数恰 3，
  // 单击重试只派 1 个 refresh——监听叠加/重复派发会让总数超过 3 被此处拦下
  const settledState = await stateOf(page, 'table-server-fail')
  expect(settledState.reqs.length, '重试单击只派 1 个 refresh（总数收紧）').toBe(3)
  expect(
    settledState.reqs.map((r: { requestId: number }) => r.requestId),
    'requestId 严格单调 [1,2,3]',
  ).toEqual([1, 2, 3])

  // ⑥ console 零告警
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})

test('table server：重试按钮 hover 前后可读（F1：hover 文字 text-on-danger 实底反色，light/dark 双主题）', async ({
  page,
}) => {
  await gotoTablePage(page)
  // hold 预置于挂载前（失败上报时序确定性）：init 请求只收集不响应——失败上报与异步
  // 回填零竞态（时序固定：请求在途 → 直接报告失败），错误条必现；回填后同号失败同生效
  //（登记语义收窄后成功回填不占序号），此处 hold 仅为断言时序稳定
  await mountServerFixture(page, 'table-server-hover', {}, { hold: true })

  // 进入失败态（错误条 + 重试按钮在场）
  await page.waitForFunction(() => (window as any)['__srvState_table-server-hover'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const el = document.querySelector('#table-server-hover') as any
    const state = (window as any)['__srvState_table-server-hover']
    el.reportRowsError({ requestId: state.reqs.at(-1).requestId, reason: 'init', error: new Error('x') })
  })
  const retry = shadow(page, 'table-server-hover').locator('.rows-error-retry')
  await expect(retry).toBeVisible()

  // 静置态：danger 描边 + danger 文字（描边按钮）
  const idle = await retry.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor }
  })
  expect(idle.color, '静置文字 = danger（#dc2626）').toBe('rgb(220, 38, 38)')
  expect(idle.background, '静置底 = 页面底色（非 danger 实底）').not.toBe('rgb(220, 38, 38)')

  // hover 态（F1 修复）：danger 实底 + text-on-danger 反色文字——light 下白字红底可读
  //（修复前 hover 用 danger-text：light 下 #d82525 文字压 #dc2626 底近乎不可读）
  // 文档站页面流的 actionability 拦截（目录浮层/滚动容器）会卡 locator.hover()——
  // 改用真实鼠标坐标移动（scrollIntoView 居中后取 boundingBox 中心，等价真 hover）
  await retry.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await retry.boundingBox()
  expect(box, '重试按钮可取到视口坐标').not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  const hoverLight = await retry.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor }
  })
  expect(hoverLight.background, 'hover 底 = danger 实底').toBe('rgb(220, 38, 38)')
  expect(hoverLight.color, 'hover 文字 = text-on-danger（light #fff）').toBe('rgb(255, 255, 255)')

  // dark 主题：text-on-danger=#18181b 深字压 #fbb2b2 亮红底（修复前 danger-text=#fbb2b2 与底同值全隐）
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  const hoverDark = await retry.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor }
  })
  expect(hoverDark.background, 'dark hover 底 = danger（#fbb2b2）').toBe('rgb(251, 178, 178)')
  expect(hoverDark.color, 'dark hover 文字 = text-on-danger（#18181b 深字）').toBe('rgb(24, 24, 27)')
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
})

test('table server：模式切换三态复位（loading/错误条/请求状态；F3/F4 真实渲染链）', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)
  // hold 预置于挂载前：init 请求只收集不响应 → loading 稳定在途
  await mountServerFixture(page, 'table-server-switch', {}, { hold: true })

  // 首载 hold（init 不响应）→ loading 行稳定在途 → 切 client：loading 消失（F3①）
  await page.waitForFunction(() => (window as any)['__srvState_table-server-switch'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  const loading = shadow(page, 'table-server-switch').locator('td.loading')
  await expect(loading).toBeVisible()
  await page.evaluate(() => document.querySelector('#table-server-switch')!.setAttribute('row-model', 'client'))
  await expect(loading).toHaveCount(0)

  // 释放 hold 并切回 server：请求状态已复位 → 重新派 init（requestId 2，此轮回填）→ 数据渲染（F3③）
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-switch'].hold = false
    document.querySelector('#table-server-switch')!.setAttribute('row-model', 'server')
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-switch'].reqs.length >= 2, null, {
    timeout: 15000,
  })
  const s2 = await stateOf(page, 'table-server-switch')
  expect(s2.reqs[1]).toMatchObject({ requestId: 2, reason: 'init' })
  await expect(shadow(page, 'table-server-switch').locator('tbody tr[part="row"]').first()).toContainText('行0')

  // 翻页 hold（请求挂起不响应）→ 手动报告失败（requestId=当前在途）→ 错误条（F3②）。
  // 不用 failNext 轮：预置 flag 与上一轮异步响应回调存在消费错位竞态（webkit flaky 实抓）
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-switch'].hold = true
    document.querySelector('#table-server-switch')!.setAttribute('current', '2')
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-switch'].reqs.length >= 3, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const el = document.querySelector('#table-server-switch') as any
    const state = (window as any)['__srvState_table-server-switch']
    el.reportRowsError({ requestId: state.reqs.at(-1).requestId, reason: 'paginate', error: new Error('x') })
  })
  const bar = shadow(page, 'table-server-switch').locator('.rows-error')
  await expect(bar).toBeVisible()
  await page.evaluate(() => document.querySelector('#table-server-switch')!.setAttribute('row-model', 'client'))
  await expect(bar).toBeHidden()

  // 切回 server（hold 释放，init 回填）→ 再造一轮 hold 失败 → F4：错误态下写同值 total → 错误条消失
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-switch'].hold = false
    document.querySelector('#table-server-switch')!.setAttribute('row-model', 'server')
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-switch'].reqs.length >= 4, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-switch'].hold = true
    document.querySelector('#table-server-switch')!.setAttribute('current', '3')
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-switch'].reqs.length >= 5, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const el = document.querySelector('#table-server-switch') as any
    const state = (window as any)['__srvState_table-server-switch']
    el.reportRowsError({ requestId: state.reqs.at(-1).requestId, reason: 'paginate', error: new Error('x') })
  })
  await expect(bar).toBeVisible()
  await page.evaluate(() => {
    const el = document.querySelector('#table-server-switch')!
    el.setAttribute('total', el.getAttribute('total')!)
  })
  await expect(bar).toBeHidden()

  // ⑥ console 零告警
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})

test('table server helper：竞态丢弃——慢响应晚到不覆盖快响应（两档延迟 + requestId 单调 + console 零告警）', async ({
  page,
}) => {
  const issues = collectConsoleIssues(page)
  await serveBuiltUi(page)
  await gotoTablePage(page)

  // createServerSource 接管取数：fetchRows 两档延迟（慢 600ms / 快 100ms），档位在请求
  // 发起时快照进内容标识（慢响应 resolve 时档位可能已切快，标识必须在发起时定死）。
  // mock 不响应 signal——helper 的 requestId 守卫是「fetcher 不响应取消时」的兜底路径，
  // 本用例固化正是这条兜底：晚到旧响应静默丢弃。
  await page.evaluate(async () => {
    const moduleUrl = '/__qa_ui__/data/table/advanced/server-rows.js'
    const { createServerSource } = (await import(moduleUrl)) as {
      createServerSource: (table: HTMLElement, options: Record<string, unknown>) => { destroy(): void }
    }
    const el = document.createElement('oas-table')
    el.id = 'table-server-race'
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', sortable: true }]))
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px'
    host.appendChild(el)
    document.body.appendChild(host)
    const state = {
      /** 取数延迟档位：slow=600ms / fast=100ms */
      mode: 'fast' as 'fast' | 'slow',
      /** helper 收到的请求（requestId 单调性断言输入） */
      reqs: [] as Array<{ requestId: number; reason: string }>,
    }
    ;(window as any)['__srvState_table-server-race'] = state
    const source = createServerSource(el, {
      total: 40,
      fetchRows: (req: { requestId: number; reason: string; start: number; end: number; signal: AbortSignal }) => {
        // 发起时快照档位（resolve 时读全局 mode 会把慢响应误标成快内容）
        const reqMode = state.mode
        state.reqs.push({ requestId: req.requestId, reason: req.reason })
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                rows: Array.from({ length: req.end - req.start }, (_, i) => ({
                  id: `r${req.start + i}`,
                  name: `${reqMode === 'slow' ? '慢' : '快'}${req.start + i}`,
                })),
                total: 40,
              }),
            reqMode === 'slow' ? 600 : 100,
          ),
        )
      },
    })
    ;(window as any)['__srvSource_table-server-race'] = source
  })

  // ① init（快档 100ms）→ 首屏渲染快内容
  await page.waitForFunction(() => (window as any)['__srvState_table-server-race'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  await expect(shadow(page, 'table-server-race').locator('tbody tr[part="row"]').first()).toContainText('快0')

  // ② 切慢档 → 第一次排序（requestId 2，600ms 在途）
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-race'].mode = 'slow'
    document.querySelector('#table-server-race')!.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
  })
  await page.waitForFunction(() => (window as any)['__srvState_table-server-race'].reqs.length >= 2, null, {
    timeout: 15000,
  })

  // ③ 在慢请求 600ms 窗口内切回快档 → 第二次排序反向（requestId 3，100ms）——快速触发两次请求
  await page.evaluate(() => {
    ;(window as any)['__srvState_table-server-race'].mode = 'fast'
    document.querySelector('#table-server-race')!.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
  })

  // ④ 快响应回填（100ms）→ data 只含快请求内容
  await page.waitForFunction(
    () => document.querySelector('#table-server-race')!.getAttribute('data')?.includes('"快0"') === true,
    null,
    { timeout: 15000 },
  )
  await expect(shadow(page, 'table-server-race').locator('tbody tr[part="row"]').first()).toContainText('快0')

  // ⑤ 慢响应晚到（600ms 到期）→ 不得覆盖快内容
  await page.waitForTimeout(650)
  const dataAfter = await page.evaluate(() => document.querySelector('#table-server-race')!.getAttribute('data'))
  expect(dataAfter, '慢响应晚到后 data 仍只含快请求结果').toContain('"快0"')
  expect(dataAfter, 'data 无慢请求内容').not.toContain('"慢')
  await expect(shadow(page, 'table-server-race').locator('tbody tr[part="row"]').first()).toContainText('快0')

  // ⑥ requestId 严格单调
  const state = await stateOf(page, 'table-server-race')
  expect(
    state.reqs.map((r: { requestId: number }) => r.requestId),
    'requestId 严格单调',
  ).toEqual([1, 2, 3])
  expect(
    state.reqs.map((r: { reason: string }) => r.reason),
    '原因序列 init→sort→sort',
  ).toEqual(['init', 'sort', 'sort'])

  // ⑦ console 零告警
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})
