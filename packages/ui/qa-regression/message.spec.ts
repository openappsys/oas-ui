// 复核回归：message——历史缺陷 + 能力增强（P1-P16）的可见反馈断言。
// 曾现缺口：group/key 能力不透明、关闭来源不可区分、loading 无收尾路径、
// 悬停无暂停、上限无挤出、富内容无通道。本次增强后逐能力固化。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('message 能力回归：分组徽标/更新流/max/promise/暂停/可关性/声明式/自定义类型/杂项', async ({
  page,
}) => {
  await page.goto('/components/message.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })

  // —— P2/P9 更新流：loading(key=upload) → update 为 success → destroy ——
  const asyncBlock = page.locator('.demo-block', { hasText: 'Loading 与异步流' })
  await asyncBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-message[key="upload"]')
    if (!el || el.getAttribute('type') !== 'loading') return false
    // loading 态不可关：关闭按钮隐藏
    const close = el.shadowRoot?.querySelector<HTMLElement>('[part="close"]')
    return close?.style.display === 'none'
  })
  await asyncBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () => document.querySelector('oas-message[key="upload"]')?.getAttribute('type') === 'success',
    null,
    { timeout: 5000 },
  )
  const updText = await page.evaluate(
    () =>
      document.querySelector('oas-message[key="upload"]')?.shadowRoot?.querySelector(
        '[part="text"]',
      )?.textContent ?? '',
  )
  expect(updText).toBe('上传成功')
  await asyncBlock.locator('oas-button').nth(2).click()
  await page.waitForFunction(() => document.querySelector('oas-message[key="upload"]') == null)

  // —— P13 分组 + 重复计数徽标：同组连点合并 ×2 且徽标显示 2 ——
  const groupBlock = page.locator('.demo-block', { hasText: '分组消息' })
  await groupBlock.locator('oas-button').nth(0).click()
  await groupBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-message[group="save"]')
    const text = el?.shadowRoot?.querySelector('[part="text"]')?.textContent ?? ''
    const badge = el?.shadowRoot?.querySelector<HTMLElement>('[part="badge"]')
    return text.includes('×2') && !!badge && !badge.hidden && badge.textContent === '2'
  })
  // 不同 group 相互独立
  await groupBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(() => document.querySelector('oas-message[group="sync"]') != null)

  // —— P6 max 上限：丢最旧派（队列消息 1 被挤出，3/4 存活）——
  const maxBlock = page.locator('.demo-block', { hasText: '数量上限' })
  for (let i = 0; i < 4; i++) await maxBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-message')].filter((el) =>
        (el.textContent ?? '').startsWith('队列消息'),
      ).length === 2,
  )
  const queueTexts = await page.evaluate(() =>
    [...document.querySelectorAll('oas-message')]
      .filter((el) => (el.textContent ?? '').startsWith('队列消息'))
      .map((el) => el.textContent ?? ''),
  )
  expect(queueTexts).toContain('队列消息 3')
  expect(queueTexts).toContain('队列消息 4')
  expect(queueTexts).not.toContain('队列消息 1')

  // —— P11 promise 链：loading → success 可见反馈 ——
  const promiseBlock = page.locator('.demo-block', { hasText: 'Promise 链' })
  await promiseBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some((el) =>
      (el.textContent ?? '').includes('请求中'),
    ),
  )
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-message')].some((el) =>
        (el.textContent ?? '').includes('成功：数据'),
      ),
    null,
    { timeout: 10000 },
  )

  // —— P4 悬停暂停：hover 设 paused 属性，移开恢复 ——
  const pauseBlock = page.locator('.demo-block', { hasText: '悬停暂停' })
  await pauseBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some((el) =>
      (el.textContent ?? '').includes('悬停我可暂停计时'),
    ),
  )
  const pauseMsg = page
    .locator('oas-message')
    .filter({ hasText: '悬停我可暂停计时' })
    .last()
  await pauseMsg.hover()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) => (el.textContent ?? '').includes('悬停我可暂停计时') && el.hasAttribute('paused'),
    ),
  )
  await page.mouse.move(0, 0)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')]
      .filter((el) => (el.textContent ?? '').includes('悬停我可暂停计时'))
      .every((el) => !el.hasAttribute('paused')),
  )

  // —— P3 closable=false：关闭按钮隐藏（duration>0 也可观察）——
  const durationBlock = page.locator('.demo-block', { hasText: '自定义时长' })
  await durationBlock.locator('oas-button').nth(4).click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) =>
        (el.textContent ?? '').includes('不可手动关闭') &&
        el.shadowRoot?.querySelector<HTMLElement>('[part="close"]')?.style.display === 'none',
    ),
  )

  // —— P13 定制杂项：avatar / spinner / 自定义类型 / mask ——
  const customBlock = page.locator('.demo-block', { hasText: '定制杂项' })
  await customBlock.locator('oas-button').nth(0).click() // avatar
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) =>
        (el.textContent ?? '').includes('带头像') &&
        el.shadowRoot?.querySelector<HTMLElement>('[part="avatar"]')?.hidden === false,
    ),
  )
  await customBlock.locator('oas-button').nth(1).click() // 自定义 spinner（图标名）
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) =>
        (el.textContent ?? '').includes('自定义 spinner') &&
        (el.shadowRoot?.querySelector('.spinner-fallback')?.innerHTML ?? '').includes('<svg'),
    ),
  )
  await customBlock.locator('oas-button').nth(2).click() // 自定义类型
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) => el.getAttribute('type') === 'custom-alert',
    ),
  )
  await customBlock.locator('oas-button').nth(3).click() // 遮罩
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) =>
        (el.textContent ?? '').includes('带遮罩') &&
        el.shadowRoot?.querySelector<HTMLElement>('[part="mask"]')?.hidden === false,
    ),
  )
  // 点击遮罩关闭消息
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-message')].find((e) =>
      (e.textContent ?? '').includes('带遮罩'),
    )
    el?.shadowRoot?.querySelector<HTMLElement>('[part="mask"]')?.click()
  })
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].every((el) => !(el.textContent ?? '').includes('带遮罩')),
  )

  // —— P7 富内容（Node 注入文本区；Node 内容在 shadow [part=text]，宿主 textContent 为空）——
  const richBlock = page.locator('.demo-block', { hasText: '富内容' })
  await richBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) =>
        (el.shadowRoot?.querySelector('[part="text"]')?.textContent ?? '').includes('加粗内容'),
    ),
  )

  // —— P15 声明式：静态元素渲染文本/类型/关闭钮 ——
  const declBlock = page.locator('.demo-block', { hasText: '声明式用法' })
  const declEl = declBlock.locator('oas-message').first()
  await declEl.waitFor({ state: 'visible' })
  const declText = await declEl.evaluate(
    (el) => el.shadowRoot?.querySelector('[part="text"]')?.textContent ?? '',
  )
  expect(declText).toContain('声明式成功消息')
  const declClose = await declEl.evaluate(
    (el) => el.shadowRoot?.querySelector<HTMLElement>('[part="close"]')?.style.display,
  )
  expect(declClose).not.toBe('none')

  // —— P1 类型图标：默认渲染 SVG ——
  const basicBlock = page.locator('.demo-block', { hasText: '六种类型' })
  await basicBlock.locator('oas-button').nth(0).click() // 成功
  await page.waitForFunction(() =>
    [...document.querySelectorAll('oas-message')].some(
      (el) =>
        (el.textContent ?? '').includes('操作成功') &&
        (el.shadowRoot?.querySelector('[part="icon"]')?.innerHTML ?? '').includes('<svg'),
    ),
  )
})
