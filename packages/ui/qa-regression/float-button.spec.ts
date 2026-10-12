// 复核回归：float-button——家族扩展（mode group/menu、受控展开、链接化、徽标封顶、RTL 镜像）的
// 浏览器级断言。机制单测（happy-dom）验证状态与事件；此处验证真实渲染几何与 demo 可交互性。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/float-button.html'

async function waitMessage(p: import('@playwright/test').Page) {
  await p.waitForFunction(() => typeof (window as any).message !== 'undefined', null, { timeout: 10000 })
}

test('group 模式：点击主钮展开，子钮在主钮下方纵向可见（expand-direction=down 几何）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const group = page.locator('oas-float-button[mode="group"]').first()
  const main = group.locator('[part="btn"]')
  await main.click()
  await expect(group).toHaveAttribute('expanded', '', { timeout: 5000 })
  // 等滑入过渡（--oas-transition-base）结束再量几何：属性翻转瞬间 .actions 仍处于
  // 收起态 -8px 变换起点，立即测量会得到「子钮 top == 主钮 bottom」的假阴性
  await page.waitForTimeout(300)
  // 子钮真实渲染且在主钮正下方（down 方向：首个子钮最靠近主钮）
  const geom = await group.evaluate((el) => {
    const root = el.shadowRoot!
    const open = root.querySelector('[part="group"]')!.classList.contains('open')
    const mainRect = root.querySelector('[part="btn"]')!.getBoundingClientRect()
    const kids = [...el.querySelectorAll<HTMLElement>('[slot="action"]')].map((k) => {
      const r = k.getBoundingClientRect()
      return { top: r.top, left: r.left, w: r.width, h: r.height }
    })
    return { open, mainRect, kids }
  })
  expect(geom.open).toBe(true)
  expect(geom.kids.length).toBeGreaterThanOrEqual(3)
  for (const k of geom.kids) {
    expect(k.w, '子钮有真实渲染尺寸').toBeGreaterThan(0)
    expect(k.h, '子钮有真实渲染尺寸').toBeGreaterThan(0)
    expect(k.top, '子钮在主钮下方（down）').toBeGreaterThan(geom.mainRect.bottom)
  }
  // 纵向堆叠：子钮 x 对齐
  expect(geom.kids[0]!.left, '子钮横向对齐').toBe(geom.kids[1]!.left)
  // 收起：Esc 关闭
  await page.keyboard.press('Escape')
  await expect(group).not.toHaveAttribute('expanded', { timeout: 5000 })
})

test('group 展开事件反馈：点击主钮切换，oas-expand-change 有 message 可见反馈；宿主直切 expanded 不派发事件', async ({
  page,
}) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await waitMessage(page)
  // Demo A：默认 click 触发 + onoas-expand-change 反馈（该 demo 是第一个带 onoas-expand-change 的 group）
  const eventDemo = page.locator('oas-float-button[onoas-expand-change]')
  await up(page, 'oas-float-button[onoas-expand-change]')
  await eventDemo.locator('[part="btn"]').click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
  const msg = await page.evaluate(() =>
    [...document.querySelectorAll('oas-message')].map((m) => m.textContent ?? '').join('|'),
  )
  expect(msg).toContain('展开态：true')
  // 先收起 Demo A（Esc 也会触发其 onoas-expand-change 反馈），避免其外点收起污染后续计数
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  // Demo B：trigger=manual 受控——宿主切换 expanded 属性，组件不自切也不派发事件
  const host = page.locator('#fb-manual-demo')
  const before = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  const toggle = page.getByRole('button', { name: '切换 expanded' })
  await toggle.click()
  await expect(host).toHaveAttribute('expanded', '', { timeout: 5000 })
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  expect(after, '宿主直切 expanded 不派发事件（无新 message）').toBe(before)
})

test('menu 模式：主钮弹出动作菜单，选择项派发 oas-select 且 message 反馈含 label，菜单自动收起', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await waitMessage(page)
  const host = page.locator('oas-float-button[mode="menu"]')
  await up(page, 'oas-float-button[mode="menu"]')
  await host.locator('[part="btn"]').click()
  const panel = host.locator('[part="menu"]')
  await expect(panel).toHaveClass(/open/, { timeout: 5000 })
  // 菜单项可见（真实渲染）
  const items = host.locator('.item')
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBe(5)
  // 点「复制」（badge 数字项）→ oas-select 反馈
  await items.nth(1).click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
  const msg = await page.evaluate(() =>
    [...document.querySelectorAll('oas-message')].map((m) => m.textContent ?? '').join('|'),
  )
  expect(msg).toContain('选中：复制')
  await expect(host).not.toHaveAttribute('expanded', { timeout: 5000 })
})

test('menu 模式：Esc 关闭并回焦主钮', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="menu"]')
  const host = page.locator('oas-float-button[mode="menu"]')
  await host.locator('[part="btn"]').click()
  await expect(host.locator('[part="menu"]')).toHaveClass(/open/, { timeout: 5000 })
  await page.keyboard.press('Escape')
  await expect(host.locator('[part="menu"]')).not.toHaveClass(/open/, { timeout: 5000 })
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  expect(focused).toBe('OAS-FLOAT-BUTTON')
})

test('链接化存活：group 链接子钮与 menu 链接项均渲染为 a[href][target]', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  // group 链接子钮（light DOM，宿主自填）
  const linkChild = page.locator('oas-float-button[mode="group"] a[slot="action"]').first()
  await expect(linkChild).toHaveAttribute('href', 'https://example.com')
  await expect(linkChild).toHaveAttribute('target', '_blank')
  // menu 链接项（shadow 渲染）
  await up(page, 'oas-float-button[mode="menu"]')
  const host = page.locator('oas-float-button[mode="menu"]')
  await host.locator('[part="btn"]').click()
  const linkItem = host.locator('.item[href]')
  await expect(linkItem).toHaveCount(1, { timeout: 5000 })
  await expect(linkItem).toHaveAttribute('target', '_blank')
  await expect(linkItem).toHaveAttribute('role', 'menuitem')
})

test('徽标封顶可见：badge=120 显示 99+，badge=dot 为状态点', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[badge="120"]')
  const capped = await page
    .locator('oas-float-button[badge="120"]')
    .evaluate((el) => el.shadowRoot!.querySelector('[part="badge"]')!.textContent)
  expect(capped).toBe('99+')
  const dotHasClass = await page
    .locator('oas-float-button[badge="dot"]')
    .first()
    .evaluate((el) => el.shadowRoot!.querySelector('[part="badge"]')!.classList.contains('dot'))
  expect(dotHasClass).toBe(true)
})

test('RTL 镜像：group 横向展开方向在 dir=rtl 下 data-dir 自动互换（left↔right）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-float-button[mode="group"]')!
    el.setAttribute('expand-direction', 'left')
    const ltr = el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('data-dir')
    el.setAttribute('dir', 'rtl')
    const rtl = el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('data-dir')
    el.setAttribute('expand-direction', 'right')
    const rtlRight = el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('data-dir')
    el.removeAttribute('dir')
    el.removeAttribute('expand-direction')
    return { ltr, rtl, rtlRight }
  })
  expect(r.ltr).toBe('left')
  expect(r.rtl).toBe('right')
  expect(r.rtlRight).toBe('left')
})

test('group 子钮点击后组自动收起（选择即收起，浏览器级行为）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const group = page.locator('oas-float-button[mode="group"]').first()
  await group.locator('[part="btn"]').click()
  await expect(group).toHaveAttribute('expanded', '', { timeout: 5000 })
  await group.locator('button[slot="action"]').first().click()
  await expect(group).not.toHaveAttribute('expanded', { timeout: 5000 })
})

test('group 展开自动聚焦首项：visibility 过渡不得吞焦点（speed-dial 同类缺陷回归）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const group = page.locator('oas-float-button[mode="group"]').first()
  // 真实点击主钮展开：open 态 visibility 立即翻转（无过渡延迟），syncExpanded 展开帧
  // 聚焦首个子动作必须落在可见元素上——若回归为「过渡期末端才可见」，焦点会跌落 body
  await group.locator('[part="btn"]').click()
  await page.waitForTimeout(120) // 过渡中段即断言：焦点应已就位
  const state = await page.evaluate(() => {
    const el = document.querySelector('oas-float-button[mode="group"]')!
    const root = el.shadowRoot!
    const firstAction = el.querySelector('[slot="action"]') as HTMLElement | null
    const fab = root.querySelector('[part="btn"]')
    return {
      activeTag: document.activeElement?.tagName ?? 'null',
      isFirstAction: !!firstAction && document.activeElement === firstAction,
      isFabHost: document.activeElement === el,
      firstVisible: firstAction ? getComputedStyle(firstAction).visibility === 'visible' : false,
    }
  })
  expect(state.firstVisible, '展开过渡中段首个子动作应已可见（visibility 立即翻转）').toBe(true)
  expect(
    state.isFirstAction || state.isFabHost,
    `展开后焦点应落在面板内（首项子动作/宿主承接），实际 active=${state.activeTag}`,
  ).toBe(true)
})

test('demo 宿主不溢出 DemoBlock：relative 覆盖必须配 inset 中和宿主 bottom/right 悬浮偏移', async ({ page }) => {
  // 缺陷背景：宿主 :host 自带 bottom/right（fixed 悬浮定位）。demo 用 position:relative
  // 覆盖时若不同时 inset 中和，这两个属性退化为「相对正常位置的偏移量」（左/上移 32px），
  // 按钮被推出 demo 容器（用户截图实抓）。此前曾复现：注入移除 inset 后立即报「带角标」demo。
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '.demo-block__body oas-float-button')
  const overflows = await page.evaluate(() => {
    const bad: { demo: string; rect: string; box: string }[] = []
    for (const el of document.querySelectorAll<HTMLElement>('.demo-block__body oas-float-button')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      const box = el.closest('.demo-block__body')!.getBoundingClientRect()
      const eps = 1
      if (
        r.left < box.left - eps ||
        r.top < box.top - eps ||
        r.right > box.right + eps ||
        r.bottom > box.bottom + eps
      ) {
        const demo = el.closest('.demo-block')?.querySelector('.demo-block__head')?.textContent?.trim() ?? '?'
        bad.push({
          demo,
          rect: `l=${r.left.toFixed(1)} t=${r.top.toFixed(1)} r=${r.right.toFixed(1)} b=${r.bottom.toFixed(1)}`,
          box: `l=${box.left.toFixed(1)} t=${box.top.toFixed(1)} r=${box.right.toFixed(1)} b=${box.bottom.toFixed(1)}`,
        })
      }
    }
    return bad
  })
  expect(overflows, `溢出 demo 容器的 float-button：${JSON.stringify(overflows, null, 2)}`).toEqual([])
})

test('拖拽跟手：absolute 定位（卡内 demo 容器）下按钮随指针 1:1 移动，不按视口坐标错位', async ({ page }) => {
  // 缺陷背景：拖拽实现曾硬编码 fixed/视口坐标系（rect.left/top 作起点、写 left/top、
  // 夹取用 innerWidth/Height）。demo 宿主为 absolute（相对卡内容器）时，视口坐标被当作
  // 相对容器坐标写入 → 按钮位置 = 逻辑位置 + 容器页面偏移 → 飘移很远（用户实报）。
  // 注意：需先滚动到元素（up() 不滚动；本页 demo 在页面下方），拖拽方向取左上——
  // 按钮初始锚在容器右下角（bottom/right:16），向右下拖会立即触边界被夹取。
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  const fab = page.locator('.demo-block__body oas-float-button[draggable]').first()
  await up(page, 'oas-float-button[draggable]')
  await fab.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const box = (await fab.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.waitForTimeout(60) // 等 pointerdown 处理与指针捕获生效
  // 分步小位移（每步 10px）。每步用 evaluate 读取实际几何：headless 下输入事件需一次
  // 往返才驱动事件循环/渲染落定（仅 Node 侧 sleep 不足以让 pointermove 全量生效），
  // 同时该值即断言关心的渲染位置。
  let lastLeft = 0
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(cx - i * 10, cy, { steps: 1 })
    await page.waitForTimeout(60)
    lastLeft = await fab.evaluate((el) => el.getBoundingClientRect().left)
  }
  await page.mouse.up()
  const mx = lastLeft + box.width / 2
  expect(Math.abs(mx - (cx - 50)), `按钮跟手 x：期望≈${(cx - 50).toFixed(0)}，实际 ${mx.toFixed(0)}`).toBeLessThan(3)
})

test('磁吸贴容器边缘：magnetic=x 松手吸附到 absolute 包含块（demo 卡片）的左右边缘', async ({ page }) => {
  // 磁吸与拖拽同源坐标系问题：曾用 window.innerWidth 算吸附目标，absolute 下吸到视口边缘。
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  const fab = page.locator('.demo-block__body oas-float-button[draggable][magnetic="x"]').first()
  await up(page, 'oas-float-button[draggable][magnetic="x"]')
  await fab.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const box = (await fab.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.waitForTimeout(60) // 等指针捕获生效
  // 向左拖少量后松手：按钮仍在容器右半边 → 磁吸应贴容器右缘（视口坐标系下会吸到错误边缘）。
  // 每步 evaluate 驱动事件循环落定（同跟手断言）。
  for (let i = 1; i <= 3; i++) {
    await page.mouse.move(cx - i * 10, cy, { steps: 1 })
    await page.waitForTimeout(60)
    await fab.evaluate((el) => el.getBoundingClientRect().left)
  }
  await page.mouse.up()
  await page.waitForTimeout(400) // 等磁吸过渡（--oas-transition-base）
  // 吸附目标是 absolute 宿主所属的定位包含块（offsetParent = demo 内层 relative 容器）。
  // 不能用 .demo-block__body：它自带 padding（space-5），与包含块差一圈 padding 距离。
  const gaps = await fab.evaluate((el) => {
    const inner = el.offsetParent as HTMLElement
    const r = el.getBoundingClientRect()
    const c = inner.getBoundingClientRect()
    return { left: r.left - c.left, right: c.right - r.right }
  })
  expect(
    Math.min(Math.abs(gaps.left), Math.abs(gaps.right)),
    `磁吸应贴包含块左/右边缘（左缝=${gaps.left.toFixed(1)} 右缝=${gaps.right.toFixed(1)}；贴合视口边缘则为缺陷）`,
  ).toBeLessThan(3)
})
