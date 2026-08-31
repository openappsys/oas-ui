// 复核回归：message——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('message 分组与更新：同组合并计数、update/destroy 可见反馈', async ({ page }) => {
  // 曾现风险：group/key 能力不透明，命令式 API 只有 show/close，同组消息堆叠、更新只能先关再弹。
  // 现要求：同 group 合并为一条并递增计数；update(key, options) 原位改内容/类型；destroy(key) 关单条。
  await page.goto('/components/message.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 同 group 连点两次 → 合并为一条且计数 ×2（demo 按钮带 group + duration 0，可连点）
  const groupBlock = page.locator('.demo-block', { hasText: '分组消息' })
  await groupBlock.locator('oas-button').nth(0).click()
  await groupBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length === 1, null, {
    timeout: 5000,
  })
  let text = await page.evaluate(
    () =>
      document.querySelector('oas-message')?.shadowRoot?.querySelector('[part="text"]')
        ?.textContent ?? '',
  )
  expect(text).toContain('保存成功')
  expect(text).toContain('×2')
  // 不同 group → 相互独立（2 条）
  await groupBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length === 2, null, {
    timeout: 5000,
  })
  // update：点「开始上传」新建 key=upload，再点「更新为成功」→ 原位改类型/内容（计数不显示后缀）
  const updateBlock = page.locator('.demo-block', { hasText: '更新消息' })
  await updateBlock.locator('oas-button').nth(0).click()
  await updateBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () => document.querySelector('oas-message[key="upload"]')?.getAttribute('type') === 'success',
    null,
    { timeout: 5000 },
  )
  const upd = await page.evaluate(() => {
    const el = document.querySelector('oas-message[key="upload"]')!
    return {
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent ?? '',
      total: document.querySelectorAll('oas-message').length,
    }
  })
  expect(upd.text).toBe('上传成功')
  expect(upd.total).toBe(3)
  // destroy：关闭指定 key，其余保留
  await updateBlock.locator('oas-button').nth(2).click()
  await page.waitForFunction(
    () => document.querySelector('oas-message[key="upload"]') == null,
    null,
    {
      timeout: 5000,
    },
  )
  expect(await page.locator('oas-message').count()).toBe(2)
  // 同组再点 → 计数继续累加（×3，分组合并后 count 持久）
  await groupBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-message[group="save"]')
        ?.shadowRoot?.querySelector('[part="text"]')
        ?.textContent?.includes('×3') ?? false,
    null,
    { timeout: 5000 },
  )
})

// —— breadcrumb P1 补缺：折叠（collapsed/max-items）+ 单行省略（ellipsis）——
// 曾现缺口：长路径面包屑无处折叠、窄容器下换行/溢出。本次补 collapsed + max-items 中间折叠为 …，
// 点击展开下拉查看全部；ellipsis 单行省略 + 链接全文 title。
