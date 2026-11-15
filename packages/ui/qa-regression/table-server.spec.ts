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
  // 精确契约替代存在性断言：boundingBox 与按钮自身布局盒一致（缺席 → null 不过
  // objectContaining；数值漂移 → 与 DOM 现算值不等一并拦下），下游鼠标坐标移动才可信
  const boxRect = await retry.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  const box = await retry.boundingBox()
  expect(box, '重试按钮可取到视口坐标，且与自身布局盒一致').toEqual(
    expect.objectContaining({ x: boxRect.x, y: boxRect.y, width: boxRect.width, height: boxRect.height }),
  )
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
      /** fetcher 实际 resolve 的 requestId 序列（慢响应到齐观测——条件等待用，不盲等时长） */
      resolved: [] as number[],
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
            () => {
              state.resolved.push(req.requestId)
              resolve({
                rows: Array.from({ length: req.end - req.start }, (_, i) => ({
                  id: `r${req.start + i}`,
                  name: `${reqMode === 'slow' ? '慢' : '快'}${req.start + i}`,
                })),
                total: 40,
              })
            },
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

  // ⑤ 慢响应晚到（600ms 到期）→ 不得覆盖快内容。条件等待「慢 fetcher 已 resolve」：
  // 竞态用例共 3 个请求（init/慢 sort/快 sort），resolved 计数达 3 即最后一个（慢）已到——
  // 替代固定 650ms 盲等，慢档真正到期即放行，不依赖时长估计
  await page.waitForFunction(() => (window as any)['__srvState_table-server-race'].resolved.length >= 3, null, {
    timeout: 15000,
  })
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

/**
 * server 分组协议（批 B）真实浏览器回归：混合行渲染、聚合值列对齐、折叠本地过滤
 * （不重取）、虚拟滚动窗口切片下组行照常、dark 主题组行可读、console 零告警。
 */
test('table server 分组：混合行渲染 + 聚合值按列 + 折叠本地过滤 + 滚动窗口组行 + dark 可读 + console 零告警', async ({
  page,
}) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)

  // 注入 server 分组 fixture：mock 宿主回填混合行（组行 kind:'group' + 数据行，两组，
  // aggregates 由「宿主」计算）；收集请求以断言 detail.groupBy 与折叠不重取
  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'table-server-group'
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'amount', title: '金额', aggregate: true, type: 'number' },
      ]),
    )
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '5')
    el.setAttribute('group-by', 'dept')
    el.setAttribute('data', '[]')
    const state = {
      reqs: [] as Array<{ requestId: number; reason: string; groupBy?: string }>,
    }
    ;(window as any)['__srvState_table-server-group'] = state
    el.addEventListener('oas-rows-request', (e) => {
      const d = (e as CustomEvent).detail
      state.reqs.push({ requestId: d.requestId, reason: d.reason, groupBy: d.groupBy })
      // mock 宿主异步回填（不在派发同步栈内嵌套写属性——与真实 fetch 时序对齐）：
      // 组行 + 组内数据行按宿主顺序（含层级：第二组带 depth=1 子组）
      setTimeout(() => {
        const rows = [
          { kind: 'group', groupKey: '研发', groupLabel: '研发组', groupCount: 3, aggregates: { amount: 60 } },
          { kind: 'data', key: 'a1', name: '张三', amount: 20, dept: '研发' },
          { kind: 'data', key: 'a2', name: '李四', amount: 25, dept: '研发' },
          { kind: 'data', key: 'a3', name: '王五', amount: 15, dept: '研发' },
          { kind: 'group', groupKey: '销售', groupLabel: '销售组', groupCount: 2, aggregates: { amount: 100 } },
          { kind: 'data', key: 'b1', name: '赵六', amount: 60, dept: '销售' },
          { kind: 'data', key: 'b2', name: '钱七', amount: 40, dept: '销售' },
        ]
        el.setAttribute('data', JSON.stringify(rows))
      }, 0)
    })
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px'
    host.appendChild(el)
    document.body.appendChild(host)
  })

  // ① init 请求 detail 携带 groupBy（协议落地面）
  await page.waitForFunction(() => (window as any)['__srvState_table-server-group'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  let state = await stateOf(page, 'table-server-group')
  expect(state.reqs[0]).toMatchObject({ requestId: 1, reason: 'init', groupBy: 'dept' })

  const root = page.locator('#table-server-group')

  // ② 混合行渲染：组行 label/count + 数据行宿主顺序；聚合值在对应列可见 + 数值列右对齐
  await expect(root.locator('tbody tr.group-header[data-group="研发"]')).toContainText('研发组')
  await expect(root.locator('tbody tr.group-header[data-group="研发"]')).toContainText('3')
  const devTds = root.locator('tbody tr.group-header[data-group="研发"] td')
  await expect(devTds).toHaveCount(2)
  await expect(devTds.nth(1)).toHaveText('60')
  await expect(devTds.nth(1)).toHaveAttribute('data-col', 'amount')
  await expect(devTds.nth(1)).toHaveClass(/align-right/)
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('张三')
  await expect(root.locator('tbody tr[part="row"]')).toHaveCount(5)

  // ③ 折叠：点研发组折叠钮 → 组内 3 行本地隐藏（销售组不受影响），零新请求（本地过滤不重取）
  const reqsBefore = (await stateOf(page, 'table-server-group')).reqs.length
  await root.locator('tbody tr.group-header[data-group="研发"] button.toggle').click()
  await expect(root.locator('tbody tr[part="row"]')).toHaveCount(2)
  await expect(root.locator('tbody tr.group-header')).toHaveCount(2)
  expect((await stateOf(page, 'table-server-group')).reqs.length, '折叠在已装载行内本地过滤，不触发重取').toBe(
    reqsBefore,
  )
  // aria-expanded 同步 + 再展开恢复
  await expect(root.locator('tbody tr.group-header[data-group="研发"] button.toggle')).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await root.locator('tbody tr.group-header[data-group="研发"] button.toggle').click()
  await expect(root.locator('tbody tr[part="row"]')).toHaveCount(5)
  expect((await stateOf(page, 'table-server-group')).reqs.length).toBe(reqsBefore)

  // ④ 虚拟滚动：height 开启虚拟窗口 + 大量混合行（16 组 × 组行+数据行 > 视口；末组为
  // depth=1 子组供缩进断言），窗口切片中的组行照常渲染（buildVirtualRow 分派）
  await page.evaluate(() => {
    const el = document.querySelector('#table-server-group')!
    el.setAttribute('height', '260')
    const rows: Array<Record<string, unknown>> = []
    for (let g = 0; g < 16; g++) {
      rows.push({
        kind: 'group',
        groupKey: `组${g}`,
        groupLabel: `组${g}`,
        groupCount: 2,
        aggregates: { amount: g },
        ...(g === 15 ? { depth: 1 } : {}),
      })
      for (let i = 0; i < 2; i++) {
        rows.push({ kind: 'data', key: `g${g}-${i}`, name: `${g}-${i}号`, amount: i, dept: `组${g}` })
      }
    }
    el.setAttribute('total', String(rows.filter((r) => r.kind !== 'group').length))
    el.setAttribute('data', JSON.stringify(rows))
  })
  // 初始窗口：首组行渲染 + 顶层组行无内联缩进（既有视觉零漂移）
  await expect(root.locator('tbody tr.group-header[data-group="组0"]')).toContainText('组0', { timeout: 15000 })
  const flatIndent = await root
    .locator('tbody tr.group-header[data-group="组0"] td')
    .first()
    .evaluate((td) => (td as HTMLElement).style.paddingInlineStart)
  expect(flatIndent, '顶层组行无内联缩进（既有视觉零漂移）').toBe('')
  // 滚动到底 → 窗口切片：末组行（depth=1 子组）缩进与末数据行渲染（虚拟窗口重建路径的 kind 分派）
  await root.locator('.table-scroll').evaluate((wrap) => {
    wrap.scrollTop = wrap.scrollHeight
  })
  await expect(root.locator('tbody tr.group-header[data-group="组15"]')).toContainText('组15', { timeout: 15000 })
  const subIndent = await root
    .locator('tbody tr.group-header[data-group="组15"] td')
    .first()
    .evaluate((td) => (td as HTMLElement).style.paddingInlineStart)
  expect(subIndent, '层级组行 depth 缩进（树形同款公式，逻辑属性 padding-inline-start）').toBe('40px')
  await expect(root.locator('tbody tr[part="row"]').last()).toContainText('15-1号')

  // ⑤ 滚动后折叠末组：窗口内本地过滤生效（不重取——滚动场景折叠语义不变）
  const reqsBeforeScroll = (await stateOf(page, 'table-server-group')).reqs.length
  await root.locator('tbody tr.group-header[data-group="组15"] button.toggle').click()
  await expect(root.locator('tbody tr[part="row"]').last()).not.toContainText('15-1号')
  expect((await stateOf(page, 'table-server-group')).reqs.length).toBe(reqsBeforeScroll)

  // ⑦ dark 主题：组行底色/文字 = token 实际解析值（收紧断言：此前只断「非透明/≠底色」，
  // 与注释「= token 值」不符——现以探针元素解析同款 token 逐值比对）
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  const tokenColors = await page.evaluate(() => {
    const probe = (styleDecl: string): string => {
      const d = document.createElement('div')
      d.style.cssText = styleDecl
      document.body.appendChild(d)
      const v = getComputedStyle(d).backgroundColor
      d.remove()
      return v
    }
    return {
      bgHover: probe('background: var(--oas-color-bg-hover)'),
      textPrimary: probe('background: var(--oas-color-text-primary)'),
    }
  })
  const darkGroupCell = root.locator('tbody tr.group-header[data-group="组15"] td').first()
  const groupBg = await darkGroupCell.evaluate((td) => getComputedStyle(td).backgroundColor)
  expect(groupBg, 'dark 组行背景 = --oas-color-bg-hover 实际解析值').toBe(tokenColors.bgHover)
  const groupText = await darkGroupCell.evaluate((td) => getComputedStyle(td).color)
  expect(groupText, 'dark 组行文字 = --oas-color-text-primary 实际解析值（非刺眼硬编码色）').toBe(
    tokenColors.textPrimary,
  )
  expect(groupText, 'dark 组行文字与背景不同值（可读）').not.toBe(groupBg)
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

  // ⑧ console 零告警
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})

/**
 * 交叉审修复批回归（R1/R5）：按列聚合 × 可展开行的列位几何 + total 数据行口径。
 * R1：label 跨度只计前导附加列 + 首个聚合列之前的叶子列，尾部展开列逐格补占位——
 * 聚合格与数据行同列位、不与展开列重叠（此前 labelSpan 把尾部展开列计入导致整行右移
 * 一列、金额列被 label 覆盖、聚合值落到展开箭头列下方）。
 * R5：`total` 只计数据行（组行是装饰行不计入）——分页页数按数据行算（fixture 示范 +
 * 页数断言双锁定）。
 */
test('table server 分组修复批：按列聚合 × 可展开行列位几何 + total 数据行口径（分页页数）+ console 零告警', async ({
  page,
}) => {
  const issues = collectConsoleIssues(page)
  await gotoTablePage(page)

  await page.evaluate(() => {
    const el = document.createElement('oas-table')
    el.id = 'table-server-group-fix'
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'amount', title: '金额', aggregate: true, type: 'number' },
      ]),
    )
    el.setAttribute('row-model', 'server')
    // total 只计数据行（4 数据行；组行是装饰行不计入——错误示范 rows.length=6 会算出 3 页）
    el.setAttribute('total', '4')
    el.setAttribute('pagination', '')
    el.setAttribute('page-size', '2')
    el.setAttribute('group-by', 'dept')
    el.setAttribute('data', '[]')
    const state = { reqs: [] as Array<{ requestId: number; reason: string }> }
    ;(window as any)['__srvState_table-server-group-fix'] = state
    el.addEventListener('oas-rows-request', (e) => {
      const d = (e as CustomEvent).detail
      state.reqs.push({ requestId: d.requestId, reason: d.reason })
      setTimeout(() => {
        const rows = [
          { kind: 'group', groupKey: '研发', groupLabel: '研发组', groupCount: 2, aggregates: { amount: 130 } },
          { kind: 'data', key: 'a1', name: '张三', amount: 70, dept: '研发', expand: '<p>张三明细</p>' },
          { kind: 'data', key: 'a2', name: '李四', amount: 60, dept: '研发' },
          { kind: 'group', groupKey: '销售', groupLabel: '销售组', groupCount: 2 },
          { kind: 'data', key: 'b1', name: '王五', amount: 40, dept: '销售' },
          { kind: 'data', key: 'b2', name: '赵六', amount: 30, dept: '销售' },
        ]
        el.setAttribute('data', JSON.stringify(rows))
      }, 0)
    })
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px'
    host.appendChild(el)
    document.body.appendChild(host)
  })
  const root = page.locator('#table-server-group-fix')
  await page.waitForFunction(() => (window as any)['__srvState_table-server-group-fix'].reqs.length >= 1, null, {
    timeout: 15000,
  })
  await expect(root.locator('tbody tr.group-header[data-group="研发"]')).toContainText('研发组')

  // ① R1 格子序列：label 格（colSpan=1，无附加列 + name 叶子）+ amount 聚合格 + 尾部展开占位格
  const devTds = root.locator('tbody tr.group-header[data-group="研发"] td')
  await expect(devTds).toHaveCount(3)
  await expect(devTds.nth(1)).toHaveAttribute('data-col', 'amount')
  await expect(devTds.nth(1)).toHaveAttribute('part', 'cell')
  await expect(devTds.nth(1)).toHaveText('130')
  await expect(devTds.nth(1)).toHaveClass(/align-right/)
  // 无 aggregates 的组行同形（表级形态统一）：聚合格留空、尾部占位格在位
  const salesTds = root.locator('tbody tr.group-header[data-group="销售"] td')
  await expect(salesTds).toHaveCount(3)
  await expect(salesTds.nth(1)).toHaveAttribute('data-col', 'amount')
  await expect(salesTds.nth(1)).toHaveText('')

  // ② R1 几何：聚合格与数据行 amount 列同列位；不与尾部展开列重叠
  const aggBox = await devTds.nth(1).evaluate((td) => {
    const r = (td as HTMLElement).getBoundingClientRect()
    return { x: r.x, right: r.right }
  })
  const dataAmountBox = await root.locator('tbody tr[data-key="a1"] td[data-col="amount"]').evaluate((td) => {
    const r = (td as HTMLElement).getBoundingClientRect()
    return { x: r.x, right: r.right }
  })
  expect(Math.abs(aggBox.x - dataAmountBox.x), '聚合格与数据行 amount 列同列位（不再右移一列）').toBeLessThan(2)
  const expandBox = await root.locator('tbody tr[data-key="a1"] td.expand-toggle-cell').evaluate((td) => {
    const r = (td as HTMLElement).getBoundingClientRect()
    return { x: r.x }
  })
  expect(aggBox.right, '聚合格右缘不越过尾部展开列左缘（不与展开箭头列重叠）').toBeLessThanOrEqual(expandBox.x + 1)

  // ③ R5 分页页数按数据行算：total=4 数据行 / pageSize 2 → 2 页（若误把组行计入 total=6 → 3 页）
  const pageButtons = await root.locator('.pagination oas-pagination').evaluate((p) => {
    const sr = (p as HTMLElement).shadowRoot
    return sr ? [...sr.querySelectorAll<HTMLElement>('[part="page"]')].map((b) => b.textContent!.trim()) : []
  })
  expect(pageButtons, '分页页数按数据行算（组行不计入 total 口径）').toEqual(['1', '2'])

  // ④ console 零告警
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})

/**
 * 数据层缓存（批 C S4）真实浏览器回归：createServerSource 默认缓存下翻页往返命中
 * 不重调 fetchRows（调用计数不增 + 渲染层回填的是缓存内容——代次标记区分）、
 * refresh({ purge: true }) 清空全部缓存后各键全重取、console 零告警。
 *
 * helper 用例走真实构建产物（serveBuiltUi 路由映射 dist + 动态 import，同上方
 * 竞态用例）；fetchRows 每次调用给行名加代次前缀（第 n 次 → 「行n-下标」），
 * 「渲染行代次 = 历史调用代次」即「内容来自缓存」的可观测证据。
 */
test('table server helper 缓存：翻页往返命中不重调 fetchRows + purge 清空重取 + console 零告警', async ({ page }) => {
  const issues = collectConsoleIssues(page)
  await serveBuiltUi(page)
  await gotoTablePage(page)

  await page.evaluate(async () => {
    const moduleUrl = '/__qa_ui__/data/table/advanced/server-rows.js'
    const { createServerSource } = (await import(moduleUrl)) as {
      createServerSource: (
        table: HTMLElement,
        options: Record<string, unknown>,
      ) => { refresh(options?: { purge?: boolean }): void; destroy(): void }
    }
    const el = document.createElement('oas-table')
    el.id = 'table-server-cache'
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称', sortable: true }]))
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;background:#fff;padding:4px'
    host.appendChild(el)
    document.body.appendChild(host)
    const state = { fetches: 0 }
    ;(window as any)['__srvState_table-server-cache'] = state
    let count = 0
    const source = createServerSource(el, {
      total: 40,
      fetchRows: (req: { start: number; end: number }) => {
        count++
        state.fetches = count
        const gen = count
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                rows: Array.from({ length: req.end - req.start }, (_, i) => ({
                  id: `r${req.start + i}`,
                  name: `行${gen}-${req.start + i}`,
                })),
                total: 40,
              }),
            20,
          ),
        )
      },
    })
    ;(window as any)['__srvSource_table-server-cache'] = source
  })

  const root = page.locator('#table-server-cache')
  const stateOf = () => page.evaluate(() => (window as any)['__srvState_table-server-cache'].fetches as number)

  // ① init（第 1 次取数）→ 首屏渲染代次 1 内容
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('行1-0', { timeout: 15000 })
  expect(await stateOf(), 'init 恰 1 次取数').toBe(1)

  // ② 翻页 2（第 2 次取数）→ 页 2 内容渲染
  await page.evaluate(() => document.querySelector('#table-server-cache')!.setAttribute('current', '2'))
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('行2-10', { timeout: 15000 })
  expect(await stateOf()).toBe(2)

  // ③ 翻回页 1：同键命中缓存——不调 fetchRows（计数不增）且渲染层回填的是缓存内容（代次 1）
  await page.evaluate(() => document.querySelector('#table-server-cache')!.setAttribute('current', '1'))
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('行1-0', { timeout: 15000 })
  expect(await stateOf(), '翻页往返命中缓存：fetchRows 调用计数不增').toBe(2)

  // ④ refresh({ purge: true })：清空全部缓存 + 强制重取当前页（页 1）→ 计数 +1、内容换新代次（第 3 次）
  await page.evaluate(() => (window as any)['__srvSource_table-server-cache'].refresh({ purge: true }))
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('行3-0', { timeout: 15000 })
  expect(await stateOf(), 'purge 后当前页重新取数').toBe(3)

  // ⑤ purge 后翻页 2：页 2 缓存已随 purge 清空 → 重新取数（第 4 次、代次 4）
  await page.evaluate(() => document.querySelector('#table-server-cache')!.setAttribute('current', '2'))
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('行4-10', { timeout: 15000 })
  expect(await stateOf(), 'purge 后各键缓存已清：翻页重新取数').toBe(4)

  // ⑥ purge 的强刷自身取数（第 3 次）已重新写入页1 缓存：翻回页1 命中不重取——
  // 「purge 清全部」由 ⑤（页2 重取）覆盖，此处固化 purge 后缓存链路完好（purge 不是禁用缓存）
  await page.evaluate(() => document.querySelector('#table-server-cache')!.setAttribute('current', '1'))
  await expect(root.locator('tbody tr[part="row"]').first()).toContainText('行3-0', { timeout: 15000 })
  expect(await stateOf(), 'purge 强刷写入的缓存正常命中（purge 后缓存仍在工作）').toBe(4)

  // ⑦ console 零告警
  expect(issues, `console 零告警（实得 ${JSON.stringify(issues)}）`).toEqual([])
})
