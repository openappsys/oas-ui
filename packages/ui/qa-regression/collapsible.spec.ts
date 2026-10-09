// 复核回归：collapsible——浏览器级固化断言。
// 覆盖：非受控点击开合（aria-expanded + 内容可见性 + oas-toggle）、受控 open 写回
// （open="" ↔ open="false"）、default-open 初值、disabled 拦截、键盘 Enter/Space、
// 暗色渲染、console 零告警。
// 注意：展开/收起是 grid-template-rows 0fr→1fr 过渡动画，内容可见性断言前等待过渡完成。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/collapsible.html'

test('collapsible 非受控点击开合：aria-expanded 同步 + 内容可见性 + oas-toggle 派发', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('oas-collapsible')!
    const events: unknown[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    const bodyWrap = el.shadowRoot!.querySelector<HTMLElement>('[part="body-wrap"]')!
    const read = () => ({
      expanded: trigger.getAttribute('aria-expanded'),
      height: bodyWrap.getBoundingClientRect().height,
      hostOpen: el.hasAttribute('open'),
    })
    const before = read()
    trigger.click()
    await new Promise((res) => setTimeout(res, 450)) // 等展开过渡
    const opened = read()
    trigger.click()
    await new Promise((res) => setTimeout(res, 450))
    const closed = read()
    return { before, opened, closed, events }
  })
  expect(r.before.expanded).toBe('false')
  expect(r.before.height).toBe(0)
  expect(r.before.hostOpen, '非受控点击不得写回 open 属性').toBe(false)
  expect(r.opened.expanded).toBe('true')
  expect(r.opened.height, '展开后内容可见').toBeGreaterThan(0)
  expect(r.closed.expanded).toBe('false')
  expect(r.closed.height, '收起后内容高度归零').toBe(0)
  expect(r.events, '应派发 oas-toggle { open: true } → { open: false }').toEqual([{ open: true }, { open: false }])
})

test('collapsible 受控模式：点击写回 open 属性（"" ↔ "false"），default-open 在受控下失效', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible')
  // 受控 demo：#collapsible-ctrl 带 open 属性；default-open demo 是非受控初值
  const r = await page.evaluate(async () => {
    const ctrl = document.querySelector('#collapsible-ctrl')!
    const trigger = ctrl.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    const read = () => ({ open: ctrl.getAttribute('open'), expanded: trigger.getAttribute('aria-expanded') })
    const init = read()
    trigger.click()
    await new Promise((res) => setTimeout(res, 50))
    const afterCollapse = read()
    trigger.click()
    await new Promise((res) => setTimeout(res, 50))
    const afterExpand = read()
    // default-open demo：非受控初值展开、宿主无 open 属性
    const seeded = [...document.querySelectorAll('oas-collapsible')].find((c) => c.hasAttribute('default-open'))!
    return {
      init,
      afterCollapse,
      afterExpand,
      seededExpanded: seeded.shadowRoot!.querySelector('[part="trigger"]')!.getAttribute('aria-expanded'),
      seededHostOpen: seeded.hasAttribute('open'),
    }
  })
  expect(r.init.open).toBe('')
  expect(r.init.expanded).toBe('true')
  expect(r.afterCollapse.open, '受控收起写回 open="false"（属性保持在场）').toBe('false')
  expect(r.afterCollapse.expanded).toBe('false')
  expect(r.afterExpand.open, '受控再展开写回 open=""').toBe('')
  expect(r.afterExpand.expanded).toBe('true')
  expect(r.seededExpanded, 'default-open 非受控初值首帧展开').toBe('true')
  expect(r.seededHostOpen, '非受控不写回宿主属性').toBe(false)
})

test('collapsible 受控 demo 外部切换按钮联动（页面脚本写属性 → 组件反映）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#collapsible-ctrl')
  // demo 脚本在 onMounted 内异步 import('@oas-ui/ui') 后才定义 window.collapsibleToggle
  await page.waitForFunction(
    () => typeof (window as unknown as { collapsibleToggle?: unknown }).collapsibleToggle === 'function',
  )
  await page.evaluate(() => (window as unknown as { collapsibleToggle: () => void }).collapsibleToggle())
  await page.waitForTimeout(100)
  const afterToggle = await page.evaluate(() => {
    const el = document.querySelector('#collapsible-ctrl')!
    return {
      open: el.getAttribute('open'),
      expanded: el.shadowRoot!.querySelector('[part="trigger"]')!.getAttribute('aria-expanded'),
      stateText: document.querySelector('#collapsible-state')!.textContent,
    }
  })
  expect(afterToggle.open).toBe('false')
  expect(afterToggle.expanded).toBe('false')
  expect(afterToggle.stateText, 'demo 可见反馈：状态文本随 oas-toggle 更新').toBe('收起')
})

test('collapsible disabled：触发器原生禁用、点击不派发 oas-toggle', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible[disabled]')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('oas-collapsible[disabled]')!
    const events: unknown[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!
    trigger.click()
    await new Promise((res) => setTimeout(res, 100))
    return { disabled: trigger.disabled, ariaDisabled: trigger.getAttribute('aria-disabled'), events }
  })
  expect(r.disabled).toBe(true)
  expect(r.ariaDisabled).toBe('true')
  expect(r.events).toEqual([])
})

test('collapsible 键盘：触发器焦点上 Enter/Space 切换开合', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible')
  const trigger = page.locator('oas-collapsible').first().locator('[part="trigger"]')
  await trigger.focus()
  await page.keyboard.press('Enter')
  expect(
    await page.evaluate(() =>
      document
        .querySelector('oas-collapsible')!
        .shadowRoot!.querySelector('[part="trigger"]')!
        .getAttribute('aria-expanded'),
    ),
    'Enter 应展开',
  ).toBe('true')
  await page.keyboard.press(' ')
  expect(
    await page.evaluate(() =>
      document
        .querySelector('oas-collapsible')!
        .shadowRoot!.querySelector('[part="trigger"]')!
        .getAttribute('aria-expanded'),
    ),
    'Space 应收起',
  ).toBe('false')
})

test('collapsible 展开图标随生效态旋转（非受控展开转、受控 open="false" 不误转）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('oas-collapsible')!
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('.arrow')!
    const root = el.shadowRoot!.querySelector<HTMLElement>('.root')!
    const t = () => getComputedStyle(arrow).transform
    const before = { t: t(), open: root.classList.contains('open') }
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    await new Promise((res) => setTimeout(res, 450))
    const opened = { t: t(), open: root.classList.contains('open') }
    return { before, opened }
  })
  expect(r.before.open, '首帧收起：root 无 open 类').toBe(false)
  expect(r.before.t, '收起态箭头不旋转').toBe('none')
  expect(r.opened.open, '非受控展开 root 挂 open 类（bug 形态：无 open 属性时 :host([open]) 不命中）').toBe(true)
  expect(r.opened.t, '展开后箭头旋转（非 none）').not.toBe('none')
})

test('collapsible 受控收起 open="false"：箭头不误转（bug 形态：:host([open]) 属性选择器命中）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#collapsible-ctrl')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#collapsible-ctrl')!
    el.setAttribute('open', 'false')
    await new Promise((res) => setTimeout(res, 450)) // 等箭头旋转过渡结束再量最终态
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('.arrow')!
    const root = el.shadowRoot!.querySelector<HTMLElement>('.root')!
    const cs = getComputedStyle(arrow)
    return { transform: cs.transform, openClass: root.classList.contains('open'), attrPresent: el.hasAttribute('open') }
  })
  expect(r.attrPresent, '受控收起属性仍在场（open="false"）').toBe(true)
  expect(r.openClass, '受控收起 root 不得挂 open 类').toBe(false)
  expect(r.transform, '受控收起箭头不得旋转').toBe('none')
})

test('collapsible 暗色渲染 + 触发器 focus ring 可见（token 消费）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible')
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.waitForTimeout(100)
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-collapsible')!
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    const color = getComputedStyle(trigger).color
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    return {
      color,
      cssHasToken: css.includes('var(--oas-color-text-primary)') && css.includes('var(--oas-focus-ring)'),
    }
  })
  expect(r.color, '暗色下触发器文字色应为浅色（非亮主题黑字）').not.toBe('rgb(0, 0, 0)')
  expect(r.cssHasToken, '样式走 token').toBe(true)
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
})

test('collapsible 页面 console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    // 白名单：production preview 下 GA4 cookie 过期属性覆盖告警属 benign
    // （与 workbench/smoke/console-sweep 白名单同源口径，firefox 下以 JS Warning 形态出现）
    if (/_ga_RXS142HBXF|Google Analytics|gtag/.test(msg.text())) return
    errors.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapsible')
  await page.waitForTimeout(500)
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})
