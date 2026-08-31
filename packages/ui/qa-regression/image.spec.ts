// 复核回归：image——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('image 懒加载：视口外图片不加载（img 无 src、占位显示），滚动进入视口后逐图加载', async ({
  page,
}) => {
  // 回归：lazy 必须真正延迟加载——视口外 img 没有 src，进入视口后才发起加载。
  // 外部图床（picsum）不可靠：断网可能一直挂起而不返回错误，导致 error 事件不触发、
  // fallback 不接管、aria-busy 永远不复位。这里统一拦截 picsum 让其立即失败，
  // 走「外链失败 → fallback」的确定性路径，校验用户实际看到的状态。
  await page.route('**/picsum.photos/**', (route) => route.abort())
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-image[lazy]')
  // 动态创建的懒加载列表由 demo onMounted 填充，静态首图存在不代表列表已建完
  await page.waitForFunction(
    () => document.querySelectorAll('#image-lazy-list oas-image[lazy]').length >= 6,
    null,
    { timeout: 15000 },
  )
  // 懒加载列表块整体位于页面首屏之外（demo 页需先滚页面才可见）——
  // 仅滚内层容器时列表块仍在视口外，IO 永远不触发。先把列表整体滚入页面视口。
  await page.evaluate(() => document.querySelector('#image-lazy-list')?.scrollIntoView())
  await page.locator('#image-lazy-list').evaluate((el) => (el.scrollTop = 0))
  const state = await page.evaluate(() => {
    const list = document.querySelector('#image-lazy-list')!
    const imgs = [...list.querySelectorAll('oas-image[lazy]')]
    const noSrc = imgs.filter((i) => {
      const img = i.shadowRoot?.querySelector('img')
      return img && !img.hasAttribute('src')
    })
    return { total: imgs.length, noSrc: noSrc.length }
  })
  expect(state.total).toBeGreaterThan(5)
  expect(state.noSrc, '列表底部应有未加载的图片').toBeGreaterThan(0)
  // 逐步滚动内层列表到底部（模拟真实浏览：每屏都经过视口，IO 逐屏触发加载；
  // 一次滚到底会跳过中间项，这些项从未进入视口 → 永远不加载，属于正确懒加载行为）。
  // 注意：懒加载图片读入后从占位高度（160）长到真实尺寸（约 287），列表 scrollHeight
  // 随加载持续变大，故每轮必须重读 max，直到 scrollTop 停在稳定底部（内容不再增长）。
  await page.evaluate(async () => {
    const list = document.querySelector('#image-lazy-list') as HTMLElement
    let lastMax = -1
    let stable = 0
    let guard = 0
    while (guard < 400) {
      const max = list.scrollHeight - list.clientHeight
      if (list.scrollTop < max) {
        list.scrollTop = Math.min(list.scrollTop + 150, max)
      } else if (max === lastMax) {
        stable++
        if (stable >= 3) break
      } else {
        stable = 0
      }
      lastMax = max
      await new Promise((r) => setTimeout(r, 80))
      guard++
    }
  })
  await page.waitForFunction(
    () => {
      const list = document.querySelector('#image-lazy-list')!
      const imgs = [...list.querySelectorAll('oas-image[lazy]')]
      return (
        imgs.length > 0 &&
        imgs.every((i) => {
          const img = i.shadowRoot?.querySelector('img')
          return img && img.hasAttribute('src')
        })
      )
    },
    null,
    { timeout: 20000 },
  )
  // 状态机收尾：首批（列表首个）加载完成后 aria-busy 从 true 复位为 false
  await page.waitForFunction(
    () => {
      const first = document.querySelector('#image-lazy-list oas-image[lazy]')!
      return first.getAttribute('aria-busy') === 'false'
    },
    null,
    { timeout: 15000 },
  )
})
