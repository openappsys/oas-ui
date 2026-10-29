// 人工回归：relative-time 真实页面交互（自动刷新 / datetime / 空态 / dark / console）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 读取宿主 shadow 内 time 的文本与机器可读属性 */
async function readTime(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel)
    const time = host?.shadowRoot?.querySelector('[part="time"]') as HTMLTimeElement | null
    return {
      text: time?.textContent ?? '',
      datetime: time?.getAttribute('datetime') ?? null,
      hidden: time?.hidden ?? null,
    }
  }, selector)
}

test('relative-time：真实页面相对文案 / datetime / 自动刷新 / 空态 / dark / console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
  })

  await page.goto('/components/relative-time.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-relative-time')

  // 基础块：epoch 值渲染出可读相对文案 + 与时刻同步的 datetime
  const epoch = await readTime(page, 'oas-relative-time[value="1700000000000"]')
  expect(epoch.text, 'epoch 值应有相对文案').not.toBe('')
  expect(epoch.text).not.toMatch(/NaN|Invalid|undefined|null/)
  expect(epoch.datetime, 'datetime 应与机器可读时刻同步').toBe('2023-11-14T22:13:20.000Z')
  expect(epoch.hidden).toBe(false)

  // property 通道（Date）：脚本注入后生效
  const dateProp = await readTime(page, '#relative-time-date')
  expect(dateProp.text).toContain('5分钟前')
  // datetime 是动态值（demo 注入 Date.now()-5min），断言格式 + 与期望时刻的偏差，而不是只判非空
  expect(dateProp.datetime, 'datetime 应为 UTC ISO 8601').toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  const dateMs = Date.parse(dateProp.datetime!)
  expect(Number.isNaN(dateMs), `datetime 应可解析：${dateProp.datetime}`).toBe(false)
  expect(Math.abs(dateMs - (Date.now() - 5 * 60 * 1000)), 'datetime 应为注入的 5 分钟前').toBeLessThan(90_000)

  // 非法值：安全空态，不显示 raw key / NaN
  const invalid = await readTime(page, 'oas-relative-time[value="not-a-date"]')
  expect(invalid.text).toBe('')
  expect(invalid.datetime).toBeNull()
  expect(invalid.hidden).toBe(true)

  // auto-refresh：秒级单位真实时钟推进后文案变化
  // 先等 demo 脚本注入 value 并渲染出秒级文案，避免读到注入前的空态（时序竞态）
  const autoText = () =>
    page.evaluate(
      () =>
        document.querySelector('#relative-time-auto')?.shadowRoot?.querySelector('[part="time"]')?.textContent ?? '',
    )
  await expect.poll(autoText, { message: '等待 demo 注入 value 后渲染秒级文案' }).toMatch(/秒/)
  const first = await autoText()
  // 轮询等文案变化，替代固定 1300ms 等待：秒级节流最多 1s，留足余量但不写死睡眠
  await expect.poll(autoText, { message: 'auto-refresh 应逐秒刷新', timeout: 5_000 }).not.toBe(first)
  const second = await autoText()
  expect(second).toMatch(/秒/)

  // dark：相对时间文字跟随 --oas-color-text-secondary 反转且仍可读
  const color = () =>
    page.evaluate(() => {
      const host = document.querySelector('oas-relative-time[value="1700000000000"]')
      const time = host?.shadowRoot?.querySelector('[part="time"]') as HTMLElement | null
      return time ? getComputedStyle(time).color : ''
    })
  const lightColor = await color()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  // 轮询等 computed color 真正变化（代替固定 300ms 等待）
  await expect.poll(color, { message: 'dark 下颜色应随 token 反转', timeout: 3_000 }).not.toBe(lightColor)
  const darkColor = await color()
  expect(lightColor).not.toBe('')
  expect(darkColor, 'dark 下颜色应随 token 反转').not.toBe(lightColor)

  expect(errors, '页面 console 应零 error / warning').toEqual([])
})
