// 复核回归：steps——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('steps progress-dot：属性在 Vue demo 存活、指示器为装饰性圆点、连线细且对齐圆心', async ({
  page,
}) => {
  await page.goto('/components/steps.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-steps[progress-dot]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[progress-dot]')!
    const root = el.shadowRoot!
    const items = [...root.querySelectorAll('.item')]
    const icons = items.map((it) => it.querySelector('.icon')!)
    const line = getComputedStyle(items[0]!, '::after')
    const iconRect = icons[0]!.getBoundingClientRect()
    const itemRect = items[0]!.getBoundingClientRect()
    return {
      attrSurvived: el.getAttribute('progress-dot'),
      dotMarked: root.querySelector('[part="steps"]')!.getAttribute('data-progress-dot'),
      iconsEmpty: icons.every((i) => i.textContent === ''),
      iconsAriaHidden: icons.every((i) => i.getAttribute('aria-hidden') === 'true'),
      lineHeight: line.height,
      lineTop: line.top,
      iconCenterY: Math.round(iconRect.top + iconRect.height / 2 - itemRect.top),
      processAriaCurrent: items
        .find((i) => i.getAttribute('data-status') === 'process')
        ?.getAttribute('aria-current'),
      processDotWider:
        parseFloat(
          getComputedStyle(
            items.find((i) => i.getAttribute('data-status') === 'process')!.querySelector('.icon')!,
            '::before',
          ).width,
        ) >
        parseFloat(
          getComputedStyle(
            items.find((i) => i.getAttribute('data-status') === 'wait')!.querySelector('.icon')!,
            '::before',
          ).width,
        ),
    }
  })
  expect(r.attrSurvived, 'progress-dot 被 Vue 剥离').toBe('')
  expect(r.dotMarked).toBe('true')
  expect(r.iconsEmpty).toBe(true)
  expect(r.iconsAriaHidden).toBe(true)
  expect(r.lineHeight).toBe('2px')
  // 连线贴近圆心（此前在指示器底部；24px 指示器中心 12，允许 1px 误差）
  expect(Math.abs(parseFloat(r.lineTop) + 1 - r.iconCenterY)).toBeLessThanOrEqual(2)
  expect(r.processAriaCurrent).toBe('step')
  expect(r.processDotWider, '当前步圆点应放大').toBe(true)
})

test('steps navigation：底部上一步/下一步可见，点击切换 current 并弹 message 反馈，末步下一步禁用', async ({
  page,
}) => {
  await page.goto('/components/steps.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-steps[navigation]')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  const r0 = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    const root = el.shadowRoot!
    const nav = root.querySelector('[part="nav"]')!
    const items = [...root.querySelectorAll('.item')]
    const process = items.find((i) => i.getAttribute('data-status') === 'process')!
    return {
      attrSurvived: el.getAttribute('navigation'),
      navMarked: root.querySelector('[part="steps"]')!.getAttribute('data-navigation'),
      navVisible: !nav.hasAttribute('hidden'),
      prevText: nav.querySelector<HTMLButtonElement>('[part="prev"]')!.textContent,
      nextText: nav.querySelector<HTMLButtonElement>('[part="next"]')!.textContent,
      prevDisabled: nav.querySelector<HTMLButtonElement>('[part="prev"]')!.disabled,
      nextDisabled: nav.querySelector<HTMLButtonElement>('[part="next"]')!.disabled,
      processAriaCurrent: process.getAttribute('aria-current'),
      processBg: getComputedStyle(process).backgroundColor,
      processColor: getComputedStyle(process.querySelector('.text')!).color,
      itemClickable: items.every(
        (i) => i.getAttribute('role') === 'button' && i.getAttribute('tabindex') === '0',
      ),
      descHidden: items.every((i) => !i.querySelector('.desc')),
      arrowExists: getComputedStyle(items[0]!, '::after').width === '16px',
    }
  })
  expect(r0.attrSurvived, 'navigation 被 Vue 剥离').toBe('')
  expect(r0.navMarked).toBe('true')
  expect(r0.navVisible).toBe(true)
  expect(r0.prevText).toBe('上一步')
  expect(r0.nextText).toBe('下一步')
  expect(r0.prevDisabled).toBe(false)
  expect(r0.nextDisabled).toBe(false)
  expect(r0.processAriaCurrent).toBe('step')
  expect(r0.processBg).toBe('rgb(11, 108, 255)') // --oas-color-primary（light）
  expect(r0.processColor).toBe('rgb(255, 255, 255)') // --oas-color-text-on-primary
  expect(r0.itemClickable).toBe(true)
  expect(r0.descHidden).toBe(true)
  expect(r0.arrowExists).toBe(true)

  // 点击下一步 → current 前移 + oas-change 弹 message（可见反馈）
  await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!.click()
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    const root = el.shadowRoot!
    const msg = document.querySelector('oas-message')?.shadowRoot?.textContent ?? ''
    const items = [...root.querySelectorAll('.item')]
    const process = items.find((i) => i.getAttribute('data-status') === 'process')!
    return {
      current: el.getAttribute('current'),
      processText: process.querySelector('.text')?.textContent,
      msg,
    }
  })
  expect(after.current).toBe('2')
  expect(after.processText).toContain('提交完成')
  expect(after.msg).toContain('当前步骤')
  expect(after.msg).toContain('第 3 步')

  // 末步下一步禁用
  const lastDisabled = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!.disabled
  })
  expect(lastDisabled).toBe(true)

  // 点击上一步回退 + 步骤项点击也可切换（点击第 1 项回到第 1 步）
  await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    el.shadowRoot!.querySelector<HTMLElement>('.item')!.click()
  })
  await page.waitForFunction(
    () => document.querySelector('oas-steps[navigation]')?.getAttribute('current') === '0',
    null,
    { timeout: 5000 },
  )
})

// —— dropdown P1 补缺：拆分下拉按钮（split）+ loading 菜单项 ——
// 曾现缺口：下拉只有整体触发一种形态、无拆分按钮形态；菜单项无 loading 态。
// 本批补：split（主按钮派发 oas-action + 箭头按钮开合菜单 + aria 同步）与菜单项 loading（spinner 禁点）。

test('steps 点状/普通模式连接线对准指示器中心（基线间隙 + 线 top 双坑回归）', async ({ page }) => {
  await page.goto('/components/steps.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-steps') !== undefined)
  const result = await page.evaluate(async () => {
    // 点状模式：圆点中心与连接线中心的 y 差 ≤ 0.5px
    const dotEl = [...document.querySelectorAll('oas-steps')].find((x) => x.hasAttribute('progress-dot'))!
    dotEl.scrollIntoView({ block: 'center' })
    await new Promise((r) => setTimeout(r, 200))
    const root = dotEl.shadowRoot!
    const item = root.querySelector('[part="item"]')!
    const icon = item.querySelector('.icon')!
    const ir = icon.getBoundingClientRect()
    const dotCenter = ir.top + ir.height / 2
    const after = getComputedStyle(item, '::after')
    const lineCenter = parseFloat(after.top) + item.getBoundingClientRect().top + parseFloat(after.height) / 2
    return { dotCenter: Math.round(dotCenter * 10) / 10, lineCenter: Math.round(lineCenter * 10) / 10 }
  })
  expect(Math.abs(result.dotCenter - result.lineCenter), `圆点中心 ${result.dotCenter} 应与线中心 ${result.lineCenter} 对齐（±0.5px）`).toBeLessThanOrEqual(0.5)
  // 普通模式（大圆圈 28 盒含 border）：圆心 sm/2+2，线中心同——三模式（普通/点状/纵向）几何一致
  const normal = await page.evaluate(async () => {
    const el = [...document.querySelectorAll('oas-steps')].find(
      (x) => !x.hasAttribute('progress-dot') && !x.hasAttribute('navigation') && x.getAttribute('direction') !== 'vertical',
    )!
    el.scrollIntoView({ block: 'center' })
    await new Promise((r) => setTimeout(r, 200))
    const root = el.shadowRoot!
    const item = root.querySelector('[part="item"]')!
    const icon = item.querySelector('.icon')!
    const ir = icon.getBoundingClientRect()
    const after = getComputedStyle(item, '::after')
    return {
      circle: Math.round((ir.top + ir.height / 2) * 10) / 10,
      line: Math.round((item.getBoundingClientRect().top + parseFloat(after.top) + parseFloat(after.height) / 2) * 10) / 10,
    }
  })
  expect(Math.abs(normal.circle - normal.line), `普通模式圆心 ${normal.circle} 应与线中心 ${normal.line} 对齐（±0.5px）`).toBeLessThanOrEqual(0.5)
})
