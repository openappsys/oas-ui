// 复核回归：confirm——命令式 Promise 契约（确定 resolve / 取消 reject）、demo 反馈消息、自定义按钮文案。
// confirm() 向 body 追加 oas-modal[visible]，确定/取消对应 modal 内 [part="ok"] / [part="cancel"]。

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { up } from './helpers'

// 等 demo 脚本就绪（openConfirm 在 onMounted 末尾挂到 window）与命令式确认框出现
async function waitReady(page: Page) {
  await page.waitForFunction(() => typeof (window as any).openConfirm === 'function', null, { timeout: 10000 })
}

async function waitModal(page: Page) {
  await page.waitForFunction(
    () => {
      const m = document.querySelector('body > oas-modal')
      return m != null && m.shadowRoot != null
    },
    null,
    { timeout: 5000 },
  )
}

async function clickPart(page: Page, part: string) {
  await page.evaluate((p) => {
    const modal = document.querySelector('body > oas-modal')!
    ;(modal.shadowRoot!.querySelector(`[part="${p}"]`) as HTMLElement).click()
  }, part)
}

test('confirm 命令式调用返回 Promise 并渲染对话框（title 吸收 + 正文）', async ({ page }) => {
  await page.goto('/components/confirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitReady(page)
  await page.evaluate(() => {
    ;(window as any).__result = 'pending'
    ;(window as any).confirm({ title: '回归测试', content: '删除后不可恢复' }).then(
      () => ((window as any).__result = 'ok'),
      () => ((window as any).__result = 'cancel'),
    )
  })
  await waitModal(page)
  const r = await page.evaluate(() => {
    const modal = document.querySelector('body > oas-modal')!
    return {
      visible: modal.hasAttribute('visible'),
      title: modal.shadowRoot!.querySelector('[part="title"]')!.textContent,
      content: modal.textContent ?? '',
      nativeTitle: modal.getAttribute('title'),
    }
  })
  expect(r.visible).toBe(true)
  expect(r.title).toBe('回归测试')
  expect(r.content).toContain('删除后不可恢复')
  expect(r.nativeTitle, '原生 title 被吸收后不得残留悬浮提示属性').toBeNull()
})

test('confirm 点确定 resolve：对话框关闭 + demo success 消息可见', async ({ page }) => {
  await page.goto('/components/confirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitReady(page)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('oas-button')].find((b) => (b.textContent || '').includes('打开确认框'))
    ;(btn as HTMLElement).click()
  })
  await waitModal(page)
  const title = await page.evaluate(
    () => document.querySelector('body > oas-modal')!.shadowRoot!.querySelector('[part="title"]')!.textContent,
  )
  expect(title).toBe('确认操作')
  await clickPart(page, 'ok')
  await page.waitForFunction(() => document.querySelector('body > oas-modal') == null, null, { timeout: 5000 })
  // demo 用户可见反馈：resolve 后 message.success('已确认')
  await page.waitForFunction(
    () => [...document.querySelectorAll('oas-message')].some((m) => (m.textContent ?? '').includes('已确认')),
    null,
    { timeout: 5000 },
  )
})

test('confirm 点取消与 Esc 均 reject：对话框关闭、Promise 落 cancel', async ({ page }) => {
  await page.goto('/components/confirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitReady(page)
  // 路径一：点取消按钮
  await page.evaluate(() => {
    ;(window as any).__result = 'pending'
    ;(window as any).confirm({ title: '取消路径' }).then(
      () => ((window as any).__result = 'ok'),
      () => ((window as any).__result = 'cancel'),
    )
  })
  await waitModal(page)
  await clickPart(page, 'cancel')
  await page.waitForFunction(() => (window as any).__result === 'cancel', null, { timeout: 5000 })
  await page.waitForFunction(() => document.querySelector('body > oas-modal') == null, null, { timeout: 5000 })
  // 路径二：Esc 关闭（modal 打开时焦点在对话框内）
  await page.evaluate(() => {
    ;(window as any).__result2 = 'pending'
    ;(window as any).confirm({ title: 'Esc 路径' }).then(
      () => ((window as any).__result2 = 'ok'),
      () => ((window as any).__result2 = 'cancel'),
    )
  })
  await waitModal(page)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => (window as any).__result2 === 'cancel', null, { timeout: 5000 })
  await page.waitForFunction(() => document.querySelector('body > oas-modal') == null, null, { timeout: 5000 })
})

test('confirm 自定义按钮文案：okText/cancelText 渲染进确定/取消按钮', async ({ page }) => {
  await page.goto('/components/confirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitReady(page)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('oas-button')].find((b) =>
      (b.textContent || '').includes('自定义按钮文案'),
    )
    ;(btn as HTMLElement).click()
  })
  await waitModal(page)
  const labels = await page.evaluate(() => {
    const root = document.querySelector('body > oas-modal')!.shadowRoot!
    return {
      ok: root.querySelector('[part="ok"]')!.textContent?.trim() ?? '',
      cancel: root.querySelector('[part="cancel"]')!.textContent?.trim() ?? '',
    }
  })
  expect(labels.ok).toBe('狠心删除')
  expect(labels.cancel).toBe('再想想')
  // 点确定收尾：resolve → demo message.success('已删除')，避免悬挂 Promise
  await clickPart(page, 'ok')
  await page.waitForFunction(() => document.querySelector('body > oas-modal') == null, null, { timeout: 5000 })
  await page.waitForFunction(
    () => [...document.querySelectorAll('oas-message')].some((m) => (m.textContent ?? '').includes('已删除')),
    null,
    { timeout: 5000 },
  )
})
