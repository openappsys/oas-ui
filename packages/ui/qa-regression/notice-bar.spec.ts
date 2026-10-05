// 复核回归：notice-bar——通告栏固化断言。
// 覆盖：type 配色 token 派生（浏览器真实解析 color-mix+var，light/dark 变化）、closable
// 关闭可恢复（oas-close + open 恢复 + demo 可见反馈）、items 轮播真实切换、action 按钮事件
// 反馈、scrollable 内嵌 marquee 存在且滚动动画生效。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('notice-bar type 配色：底色 light/dark 均真实解析生效（token 派生，随主题变化）', async ({ page }) => {
  await page.goto('/components/notice-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-notice-bar')

  const readBar = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-notice-bar[type="success"]')!
      const bar = el.shadowRoot!.querySelector('[part="bar"]')!
      const s = getComputedStyle(bar)
      return { bg: s.backgroundColor, color: s.color, dataType: bar.getAttribute('data-type') }
    })
  const readInfo = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-notice-bar:not([type])')!
      const bar = el.shadowRoot!.querySelector('[part="bar"]')!
      return { bg: getComputedStyle(bar).backgroundColor }
    })

  const success = await readBar()
  expect(success.dataType).toBe('success')
  // color-mix(token, transparent) 真实解析——非透明才说明 token 通道通
  expect(success.bg).not.toBe('rgba(0, 0, 0, 0)')
  expect(success.bg).not.toBe('transparent')
  // info 与 success 底色不同（语义 token 派生）
  const info = await readInfo()
  expect(info.bg).not.toBe(success.bg)

  // 切暗色：底色随 token 变化（dark 变体），仍非透明
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(100)
  const dark = await readBar()
  expect(dark.bg).not.toBe('rgba(0, 0, 0, 0)')
  expect(dark.bg).not.toBe(success.bg)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})

test('notice-bar closable：点击关闭 → oas-close → 隐藏；恢复按钮设 open 复显（demo 可见反馈）', async ({ page }) => {
  await page.goto('/components/notice-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-notice-bar')

  const demo = page.locator('#nb-close-demo')
  // 关闭前可见
  await expect(demo).toBeVisible()
  // shadow 内关闭按钮点击（真实浏览器事件穿透 shadow）
  await demo.evaluate((el) => (el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click())
  // oas-close 派发 → 组件自隐藏（hidden 属性）→ demo 反馈文本更新
  await expect(page.locator('#nb-close-output')).toHaveText(/oas-close 已派发/, { timeout: 5000 })
  await expect(demo).toBeHidden()
  // 恢复按钮启用 → 点击 → open 属性恢复显示，反馈清空
  await expect(page.locator('#nb-close-restore')).not.toHaveAttribute('disabled', /.*/, { timeout: 5000 })
  await page.click('#nb-close-restore')
  await expect(demo).toBeVisible()
  await expect(page.locator('#nb-close-output')).toHaveText('')
})

test('notice-bar items 轮播：interval 到点后文本真实切换到第二条', async ({ page }) => {
  await page.goto('/components/notice-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-notice-bar')

  const readItem = () =>
    page.evaluate(() => {
      const el = document.querySelector('#nb-items-demo')!
      return el.shadowRoot!.querySelector('.item-text')!.textContent
    })

  expect(await readItem()).toBe('第一条：服务例行维护通知')
  // interval=2500 + 淡出换文本 200ms → 2.8s 后第二条已落定
  await page.waitForTimeout(2800)
  expect(await readItem()).toBe('第二条：新版主题编辑器上线')
})

test('notice-bar action：按钮形态点击派发 oas-action-click，demo 反馈文本更新；链接形态渲染 <a>', async ({ page }) => {
  await page.goto('/components/notice-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-notice-bar')

  // 链接形态：href 在场渲染 <a href>，button 隐藏
  const linkForm = await page.evaluate(() => {
    const el = document.querySelector('oas-notice-bar[action-text="查看详情"]')!
    const a = el.shadowRoot!.querySelectorAll('[part="action"]')[0] as HTMLAnchorElement
    const btn = el.shadowRoot!.querySelectorAll('[part="action"]')[1] as HTMLElement
    return { aHidden: a.hidden, href: a.getAttribute('href'), btnHidden: btn.hidden }
  })
  expect(linkForm.aHidden).toBe(false)
  expect(linkForm.href).toContain('developer.mozilla.org')
  expect(linkForm.btnHidden).toBe(true)

  // 按钮形态：点击 → oas-action-click → 反馈文本更新（可见反馈，非 console）
  await page.locator('#nb-action-demo').evaluate((el) => {
    ;(el.shadowRoot!.querySelectorAll('[part="action"]')[1] as HTMLElement).click()
  })
  await expect(page.locator('#nb-action-output')).toHaveText(/oas-action-click 已派发/, { timeout: 5000 })
})

test('notice-bar scrollable：内嵌 marquee 存在、内容物化、滚动动画生效', async ({ page }) => {
  await page.goto('/components/notice-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-notice-bar')

  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notice-bar[scrollable]:not([items])')!
    const mq = el.shadowRoot!.querySelector('oas-marquee')!
    const track = mq.shadowRoot!.querySelector('[part="track"]') as HTMLElement
    const anim = track.getAnimations()[0]
    return {
      mqHidden: (mq as HTMLElement).hidden,
      materialized: mq.textContent!.length,
      animName: anim ? (anim.effect as KeyframeEffect).getKeyframes().length > 0 : false,
      animDuration: anim ? anim.effect!.getTiming().duration : 0,
    }
  })
  expect(r.mqHidden).toBe(false)
  // 宿主内容已物化进 marquee（源份 + marquee 自建克隆份 → 文本长度大于 0）
  expect(r.materialized).toBeGreaterThan(10)
  // 滚动动画真实在跑（有 keyframes 与时长）
  expect(r.animName).toBe(true)
  expect(Number(r.animDuration)).toBeGreaterThan(0)
})
