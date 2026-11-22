// 复核回归：rolling-text 值变化必须真的驱动每列滚轮（--n）与读屏文本，不能只换属性。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('rolling-text 值变化驱动数字列 --n 与完整文本，precision 补零生效', async ({ page }) => {
  await page.goto('/components/rolling-text.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#rt-demo')

  const read = () =>
    page.evaluate(() => {
      const host = document.querySelector('#rt-demo') as HTMLElement
      const digits = [...host.shadowRoot!.querySelectorAll<HTMLElement>('.digit-col .strip')].map((el) =>
        el.style.getPropertyValue('--n'),
      )
      return { digits, sr: host.shadowRoot!.querySelector('[part="sr"]')!.textContent }
    })

  const initial = await read()
  expect(initial.sr).toBe('¥1288.00')
  expect(initial.digits.join('')).toBe('128800')

  await page.click('#rt-random')
  await expect.poll(async () => (await read()).sr, { timeout: 4000 }).not.toBe('¥1288.00')
  const changed = await read()
  expect(changed.sr, 'precision=2 保留两位小数').toMatch(/\.\d{2}$/)
  const digitText = changed.sr!.replace('¥', '').replace('.', '')
  // 最短路径翻滚期间档位可能落在越界瞬态（9→0 落 10、0→9 落 -1），视觉数字 = 档位 mod 10
  const visual = changed.digits.map((n) => ((Number(n) % 10) + 10) % 10).join('')
  expect(visual, '滚轮视觉数字与完整文本一致').toBe(digitText)

  await page.click('#rt-reset')
  await expect.poll(async () => (await read()).sr).toBe('¥1288.00')
})

test('rolling-text RTL 宿主下数字列仍按 LTR 排列（123 不反转成 321）', async ({ page }) => {
  await page.goto('/components/rolling-text.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#rt-demo')

  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const lefts = await page.evaluate(() => {
    const host = document.querySelector('#rt-demo') as HTMLElement
    return [...host.shadowRoot!.querySelectorAll<HTMLElement>('.digit-col')].map(
      (el) => el.getBoundingClientRect().left,
    )
  })
  await page.evaluate(() => document.documentElement.removeAttribute('dir'))
  expect(lefts.length).toBeGreaterThan(1)
  for (let i = 1; i < lefts.length; i++) {
    expect(lefts[i]!, `第 ${i} 列应在第 ${i - 1} 列右侧（列序不随 RTL 反转）`).toBeGreaterThan(lefts[i - 1]!)
  }
})
