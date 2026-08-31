// 复核回归：affix——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('affix 吸附-解除-占位：top 滚过吸附线吸附、回滚解除、fixed 脱流时占位高度兜住文档流', async ({ page }) => {
  await page.goto('/components/affix.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-affix') !== undefined)
  // 构造独立长页场景：宿主在文档流 300px 处，offset=100
  await page.evaluate(() => {
    document.body.innerHTML = ''
    document.documentElement.style.height = '3000px'
    const host = document.createElement('oas-affix')
    host.setAttribute('offset', '100')
    host.innerHTML = '<div style="height:40px">stick</div>'
    host.style.marginTop = '300px'
    document.body.appendChild(host)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-affix')!
    return !!el.shadowRoot!.querySelector('.wrap')
  })
  // 滚到 500：占位 top = 300 - 500 = -200 <= 100 → 吸附
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.waitForFunction(() =>
    document.querySelector('oas-affix')!.shadowRoot!.querySelector<HTMLElement>('.wrap')!.classList.contains('fixed'),
  )
  const stuck = await page.evaluate(() => {
    const el = document.querySelector('oas-affix')!
    const ph = el.shadowRoot!.querySelector('.placeholder')!
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    return {
      top: wrap.style.top,
      fixedTop: Math.round(wrap.getBoundingClientRect().top),
      phHeight: Math.round(ph.getBoundingClientRect().height),
      docHeight: document.documentElement.scrollHeight,
    }
  })
  expect(stuck.top).toBe('100px')
  expect(stuck.fixedTop).toBe(100)
  // 占位兜住文档流：placeholder 高度 = 内容高（40），页面总高不因脱流塌陷
  expect(stuck.phHeight).toBe(40)
  expect(stuck.docHeight).toBe(3000)
  // 回滚到 0：占位 top = 300 > 100 → 解除，占位高度清空
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(() =>
    !document.querySelector('oas-affix')!.shadowRoot!.querySelector<HTMLElement>('.wrap')!.classList.contains('fixed'),
  )
  const released = await page.evaluate(() => {
    const el = document.querySelector('oas-affix')!
    return {
      wrapTop: el.shadowRoot!.querySelector<HTMLElement>('.wrap')!.style.top,
      phHeight: el.shadowRoot!.querySelector<HTMLElement>('.placeholder')!.style.height,
    }
  })
  expect(released.wrapTop).toBe('')
  expect(released.phHeight).toBe('')
})
