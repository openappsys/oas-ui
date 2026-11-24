// 复核回归：image-picker——真实选图后的缩略图、删除与上限反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('image-picker：选图后渲染缩略图与计数，删除后回到空态', async ({ page }) => {
  await page.goto('/components/image-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ip-basic')

  await page.locator('#ip-basic input[type="file"]').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: PNG },
    { name: 'b.png', mimeType: 'image/png', buffer: PNG },
  ])

  const afterAdd = await page.evaluate(() => {
    const host = document.querySelector('#ip-basic')!
    const root = host.shadowRoot!
    return {
      tiles: root.querySelectorAll('[part="tile"]').length,
      thumbs: [...root.querySelectorAll('img')].filter((img) => img.getAttribute('src')).length,
      count: root.querySelector('[part="count"]')!.textContent ?? '',
      feedback: document.querySelector('#ip-basic-out')!.textContent ?? '',
    }
  })
  expect(afterAdd.tiles).toBe(2)
  expect(afterAdd.thumbs).toBe(2)
  expect(afterAdd.count).toContain('2')
  expect(afterAdd.feedback).toContain('a.png')

  // 删除第一张（真实点击缩略图上的操作按钮）
  await page.locator('#ip-basic [data-act="remove"]').first().click()
  const afterRemove = await page.evaluate(() => {
    const host = document.querySelector('#ip-basic')!
    return {
      tiles: host.shadowRoot!.querySelectorAll('[part="tile"]').length,
      feedback: document.querySelector('#ip-basic-out')!.textContent ?? '',
    }
  })
  expect(afterRemove.tiles).toBe(1)
  expect(afterRemove.feedback).toContain('b.png')
})

test('image-picker：超过 max 时截断并给出超出反馈', async ({ page }) => {
  await page.goto('/components/image-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ip-limit')

  await page.locator('#ip-limit input[type="file"]').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: PNG },
    { name: 'b.png', mimeType: 'image/png', buffer: PNG },
    { name: 'c.png', mimeType: 'image/png', buffer: PNG },
  ])

  const state = await page.evaluate(() => {
    const host = document.querySelector('#ip-limit')!
    return {
      tiles: host.shadowRoot!.querySelectorAll('[part="tile"]').length,
      addHidden: host.shadowRoot!.querySelector<HTMLElement>('[part="add"]')!.hidden,
      feedback: document.querySelector('#ip-limit-out')!.textContent ?? '',
    }
  })
  expect(state.tiles).toBe(2)
  expect(state.addHidden).toBe(true)
  expect(state.feedback).toContain('超出')
})

test('image-picker compress：开启后 oas-change 带 compressed 元信息（demo 可见），关闭的 demo 不带该键', async ({
  page,
}) => {
  await page.goto('/components/image-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ip-compress')

  await page
    .locator('#ip-compress input[type="file"]')
    .setInputFiles([{ name: 'meta.png', mimeType: 'image/png', buffer: PNG }])

  // demo 反馈：1×1 PNG 走压缩管线（真实浏览器 canvas 可用），元信息含「原尺寸 → 压缩后尺寸」
  await page.waitForFunction(() => /→/.test(document.querySelector('#ip-compress-out')?.textContent ?? ''), {
    timeout: 10000,
  })
  const state = await page.evaluate(() => document.querySelector('#ip-compress-out')!.textContent ?? '')
  expect(state, '元信息含尺寸对（1×1 → 1×1）').toContain('1×1')

  // 对照组：未开 compress 的基础 demo，detail 不带 compressed 键（零漂移）
  await up(page, '#ip-basic')
  await page.evaluate(() => {
    const host = document.querySelector('#ip-basic')!
    const w = window as unknown as { __ipKeys?: string[] }
    host.addEventListener(
      'oas-change',
      (e) => {
        w.__ipKeys = Object.keys((e as CustomEvent).detail).sort()
      },
      { once: true },
    )
  })
  await page
    .locator('#ip-basic input[type="file"]')
    .setInputFiles([{ name: 'plain.png', mimeType: 'image/png', buffer: PNG }])
  const basicKeys = await page.evaluate(() => (window as unknown as { __ipKeys?: string[] }).__ipKeys ?? [])
  expect(basicKeys, '关闭 compress 的 detail 只有 count/files').toEqual(['count', 'files'])
})
