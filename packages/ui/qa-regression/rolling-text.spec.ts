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
  expect(changed.digits.join(''), '滚轮目标数字与完整文本一致').toBe(digitText)

  await page.click('#rt-reset')
  await expect.poll(async () => (await read()).sr).toBe('¥1288.00')
})
