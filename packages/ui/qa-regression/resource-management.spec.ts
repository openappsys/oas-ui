// 「资源管理示例（组合示例）」指南页回归：
// 卡片统计、分配表勾选联动重算、一键平衡（levelResources 按 id 合并 + 无超载收敛）、
// 重置恢复初始、console 零告警。guide 页不在 components 自动收集面内，防止 demo 脚本随组件演进腐化。
// demo 选择器：#rm-demo / #rm-resource / #rm-tbody / #rm-level-btn / #rm-reset-btn / #rm-result / #rm-overload /
// #rm-peak-{zhang,lisi,wangwu} / #rm-over-days-{zhang,lisi,wangwu}。
import { test, expect } from '@playwright/test'

const PAGE = '/guide/resource-management.html'

/** 等页面脚本挂载完成（组件升级 + 首次 render：泳道条与分配表行都已渲染） */
async function waitDemoReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => !!customElements.get('oas-resource'), undefined, { timeout: 15000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('rm-resource') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
      const rows = document.getElementById('rm-tbody')?.children.length ?? 0
      return !!el?.shadowRoot?.querySelector('.lanes .row.lane .bar') && rows > 0
    },
    undefined,
    { timeout: 15000 },
  )
}

/** shadow DOM 内的聚合快照（泳道条 / 超载柱 / 任务日期） */
function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = document.getElementById('rm-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    const num = (id: string) => document.getElementById(id)?.textContent?.trim() ?? ''
    return {
      lanes: el.shadowRoot.querySelectorAll('.lanes .row.lane').length,
      bars: el.shadowRoot.querySelectorAll('.lanes .bar').length,
      lisiT2Bar: el.shadowRoot.querySelectorAll('.lane[data-resource-id="lisi"] .bar[data-task-id="t2"]').length,
      overPillars: el.shadowRoot.querySelectorAll('.pillar.over').length,
      peakZhang: num('rm-peak-zhang'),
      peakLisi: num('rm-peak-lisi'),
      peakWangwu: num('rm-peak-wangwu'),
      overDaysZhang: num('rm-over-days-zhang'),
      overDaysLisi: num('rm-over-days-lisi'),
      overDaysWangwu: num('rm-over-days-wangwu'),
      result: document.getElementById('rm-result')?.textContent ?? '',
      overload: document.getElementById('rm-overload')?.textContent ?? '',
      taskStarts: Object.fromEntries(
        (el as unknown as { tasks: Array<{ id: string; start: string }> }).tasks.map((t) => [t.id, t.start]),
      ),
      checkboxes: document.querySelectorAll('#rm-tbody oas-checkbox').length,
      t2LisiChecked: document
        .querySelector<HTMLElement>('#rm-tbody oas-checkbox[data-task="t2"][data-res="lisi"]')
        ?.hasAttribute('checked'),
    }
  })
}

test('resource-management 组合示例：初始超载 → 取消勾选重算 → 一键平衡收敛 → 重置恢复', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await waitDemoReady(page)

  // ===== 初始：3 资源容量 1，7 任务 → 卡片峰值 2/2/2，超载天数 3/4/2（合计 9 档红柱） =====
  const initial = await snapshot(page)
  expect(initial.lanes, '3 条资源泳道').toBe(3)
  expect(initial.bars, '泳道内任务条已渲染').toBeGreaterThan(0)
  expect(initial.checkboxes, '分配表 7 任务 × 3 资源 = 21 个勾选框').toBe(21)
  expect(initial.peakZhang, '张三峰值').toBe('2')
  expect(initial.peakLisi, '李四峰值').toBe('2')
  expect(initial.peakWangwu, '王五峰值').toBe('2')
  expect(initial.overDaysZhang, '张三超载天数').toBe('3')
  expect(initial.overDaysLisi, '李四超载天数').toBe('4')
  expect(initial.overDaysWangwu, '王五超载天数').toBe('2')
  expect(initial.overPillars, '直方图 9 根超载红柱').toBe(9)
  expect(initial.result, '#rm-result 初始为空').toBe('')
  expect(initial.overload, '#rm-overload 初始显示超载 9 档').toContain('超载')
  expect(initial.overload).toContain('9 档')

  // ===== 取消 t2 的「李四」勾选 → 分配写回 + 全量重算（lisi 泳道 t2 条消失、超载 9 → 7 档） =====
  await page.evaluate(() => {
    const cb = document.querySelector<HTMLElement>('#rm-tbody oas-checkbox[data-task="t2"][data-res="lisi"]')!
    ;(cb.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(
    () =>
      !!document.getElementById('rm-resource')?.shadowRoot &&
      (
        document.getElementById('rm-resource') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
      )?.shadowRoot!.querySelectorAll('.pillar.over').length === 7,
    undefined,
    { timeout: 5000 },
  )
  const afterUncheck = await snapshot(page)
  expect(afterUncheck.t2LisiChecked, 't2 × 李四 勾选态已取消（表格重建自数据派生）').toBe(false)
  expect(afterUncheck.lisiT2Bar, 'lisi 泳道的 t2 条已消失').toBe(0)
  expect(afterUncheck.overPillars, '超载红柱 9 → 7').toBe(7)
  expect(afterUncheck.overDaysLisi, '李四超载天数 4 → 2（卡片同步重算）').toBe('2')
  expect(afterUncheck.overload, '#rm-overload 同步为 7 档').toContain('7 档')

  // ===== 一键平衡：levelResources 收敛至无超载；结果按 id 合并 + 日期确有后移 =====
  await page.locator('#rm-level-btn').click()
  await page.waitForFunction(() => /后移/.test(document.getElementById('rm-result')?.textContent ?? ''), undefined, {
    timeout: 5000,
  })
  const afterLevel = await snapshot(page)
  expect(afterLevel.result, '结果行含后移明细').toContain('后移')
  expect(afterLevel.overPillars, '平衡后无超载红柱').toBe(0)
  expect(afterLevel.overload, '#rm-overload 变「无超载」').toContain('无超载')
  const initialStarts: Record<string, string> = {
    t1: '2026-03-02',
    t2: '2026-03-03',
    t3: '2026-03-04',
    t4: '2026-03-04',
    t5: '2026-03-09',
    t6: '2026-03-05',
    t7: '2026-03-09',
  }
  const shifted = Object.keys(initialStarts).filter((id) => afterLevel.taskStarts[id] !== initialStarts[id])
  expect(shifted.length, '至少一个任务日期确有后移').toBeGreaterThan(0)
  expect(
    shifted.every((id) => afterLevel.taskStarts[id]! > initialStarts[id]!),
    '被移动任务的 start 只往后移',
  ).toBe(true)

  // ===== 重置：恢复初始数据 + 清空结果 + 超载回到 9 档 =====
  await page.locator('#rm-reset-btn').click()
  await page.waitForFunction(
    () => {
      const el = document.getElementById('rm-resource') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
      return !!el?.shadowRoot && el.shadowRoot.querySelectorAll('.pillar.over').length === 9
    },
    undefined,
    { timeout: 5000 },
  )
  const afterReset = await snapshot(page)
  expect(afterReset.result, '#rm-result 已清空').toBe('')
  expect(afterReset.overload, '#rm-overload 回到超载 9 档').toContain('9 档')
  expect(afterReset.taskStarts, '任务日期恢复初始').toEqual(initialStarts)
  expect(afterReset.t2LisiChecked, 't2 × 李四 勾选恢复').toBe(true)
  expect(afterReset.lisiT2Bar, 'lisi 泳道 t2 条恢复').toBe(1)
  expect(issues, 'console 零 error/warning').toEqual([])
})

test('resource-management en 页冒烟：标题/卡片/泳道渲染 + console 零告警', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto('/en/guide/resource-management.html', { waitUntil: 'domcontentloaded' })
  await waitDemoReady(page)
  const info = await page.evaluate(() => {
    const el = document.getElementById('rm-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    return {
      title: document.querySelector('h1')?.textContent ?? '',
      cards: ['rm-peak-zhang', 'rm-peak-lisi', 'rm-peak-wangwu'].map(
        (id) => document.getElementById(id)?.textContent ?? '',
      ),
      rows: document.getElementById('rm-tbody')?.children.length ?? 0,
      lanes: el.shadowRoot.querySelectorAll('.lanes .row.lane').length,
      bars: el.shadowRoot.querySelectorAll('.lanes .bar').length,
    }
  })
  expect(info.title, 'en 页标题').toContain('Resource Management')
  expect(
    info.cards.every((c) => /^\d+$/.test(c)),
    '3 张卡片峰值已填充',
  ).toBe(true)
  expect(info.rows, '分配表 7 行').toBe(7)
  expect(info.lanes, '3 条泳道').toBe(3)
  expect(info.bars, '任务条已渲染').toBeGreaterThan(0)
  expect(issues, 'console 零 error/warning').toEqual([])
})

// 资源卡色点与泳道/负载配色一致：resources[].color → 行上 --_oas-res-color → 条/柱 color-mix 着色。
test('resource-management 资源颜色：卡片色点与泳道任务条/负载柱同源着色', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await waitDemoReady(page)
  const out = await page.evaluate(() => {
    const el = document.getElementById('rm-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    const lanes = [...el.shadowRoot.querySelectorAll<HTMLElement>('.row.lane')].map((row) => ({
      id: row.getAttribute('data-resource-id'),
      color: row.style.getPropertyValue('--oas-resource-bar-bg').trim(),
    }))
    const bg = (rid: string) => {
      const bar = el.shadowRoot.querySelector<HTMLElement>(`.row.lane[data-resource-id="${rid}"] .bar`)
      return bar ? getComputedStyle(bar).backgroundColor : ''
    }
    const loadBg = (rid: string) => {
      const pillar = el.shadowRoot.querySelector<HTMLElement>(`.row.load[data-resource-id="${rid}"] .pillar:not(.over)`)
      return pillar ? getComputedStyle(pillar).backgroundColor : ''
    }
    return {
      lanes,
      barBg: { zhang: bg('zhang'), lisi: bg('lisi'), wangwu: bg('wangwu') },
      loadBg: { zhang: loadBg('zhang'), lisi: loadBg('lisi'), wangwu: loadBg('wangwu') },
    }
  })
  const byId = new Map(out.lanes.map((l) => [l.id, l.color]))
  expect(byId.get('zhang'), '张三泳道消费卡片同源 primary').toContain('var(--oas-color-primary)')
  expect(byId.get('lisi'), '李四泳道消费 success').toContain('var(--oas-color-success)')
  expect(byId.get('wangwu'), '王五泳道消费 warning').toContain('var(--oas-color-warning)')
  // 真浏览器解析 color-mix：三条泳道的条/柱底色应互不相同（证明确实按资源着色，而非统一 primary）
  expect(new Set(Object.values(out.barBg)).size, '三条泳道任务条底色互不相同').toBe(3)
  const loadColors = Object.values(out.loadBg).filter(Boolean)
  expect(loadColors.length, '负载柱存在（非超载）').toBeGreaterThan(0)
  expect(new Set(loadColors).size, '负载柱底色按资源区分').toBeGreaterThan(1)
})
