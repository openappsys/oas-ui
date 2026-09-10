// 复核回归：image——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('image-group：容器收集子图为共享图集，点击打开共享预览、prev/next 切换 current、动态增删同步', async ({
  page,
}) => {
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#image-group-demo')
  // 收集：内部预览宿主 preview-src-list 展平子图数；容器 role=group 语义
  const collected = await page.evaluate(() => {
    const g = document.querySelector('#image-group-demo')!
    const inner = g.shadowRoot!.querySelector('oas-image')!
    return {
      children: g.querySelectorAll('oas-image').length,
      list: JSON.parse(inner.getAttribute('preview-src-list') || '[]').length,
      role: g.shadowRoot!.querySelector('[part="group"]')!.getAttribute('role'),
      ariaLabel: g.shadowRoot!.querySelector('[part="group"]')!.getAttribute('aria-label'),
    }
  })
  expect(collected.children).toBeGreaterThanOrEqual(3)
  expect(collected.list, '图集列表应收集全部子图').toBe(collected.children)
  expect(collected.role).toBe('group')
  expect(collected.ariaLabel).toBe('图集')

  // 点击第 2 张 → 共享预览从 2/N 起开；子图自身预览被接管（自身遮罩保持关闭）
  await page.locator('#image-group-demo oas-image').nth(1).click()
  await page.waitForSelector('[data-oas-image-preview-portal]', { timeout: 15000 })
  const opened = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const mask = portal.shadowRoot!.querySelector('.preview-mask')!
    const counter = portal.shadowRoot!.querySelector('[part="preview-counter"]')!
    const g = document.querySelector('#image-group-demo')!
    const childMask = g
      .querySelectorAll('oas-image')[1]!
      .shadowRoot!.querySelector('.preview-mask')!
    return {
      maskHidden: mask.hasAttribute('hidden'),
      counter: counter.textContent,
      childMaskHidden: childMask.hasAttribute('hidden'),
      current: g.getAttribute('current'),
    }
  })
  expect(opened.maskHidden).toBe(false)
  expect(opened.counter).toBe(`2/${collected.children}`)
  expect(opened.childMaskHidden, '子图自身预览应被容器接管').toBe(true)
  // 非受控模式不反射 current（保持点击哪张从哪张开的直觉）
  expect(opened.current).toBeNull()

  // prev/next 在整组间切换：next → current 反射 2，页码 3/N
  await page.evaluate(() => {
    document
      .querySelector('[data-oas-image-preview-portal]')!
      .shadowRoot!.querySelector<HTMLElement>('[part="preview-next"]')!
      .click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-oas-image-preview-portal]')!
        .shadowRoot!.querySelector('[part="preview-counter"]')!
        .textContent!.startsWith('3/'),
    null,
    { timeout: 15000 },
  )
  expect(await page.$eval('#image-group-demo', (el) => el.getAttribute('current'))).toBeNull()

  // Esc 关闭共享预览：portal 拆除，无孤儿浮层
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => document.querySelector('[data-oas-image-preview-portal]') === null,
    null,
    { timeout: 15000 },
  )

  // 动态增删子图：图集列表同步（+1 / 还原）
  const synced = await page.evaluate(async () => {
    const g = document.querySelector('#image-group-demo')!
    const read = () =>
      JSON.parse(
        g.shadowRoot!.querySelector('oas-image')!.getAttribute('preview-src-list') || '[]',
      ).length
    const before = read()
    const el = document.createElement('oas-image')
    el.setAttribute('src', 'https://picsum.photos/seed/isui-group-added/480/300')
    g.appendChild(el)
    await new Promise((r) => setTimeout(r, 100))
    const afterAdd = read()
    el.remove()
    await new Promise((r) => setTimeout(r, 100))
    const afterRemove = read()
    return { before, afterAdd, afterRemove }
  })
  expect(synced.afterAdd).toBe(synced.before + 1)
  expect(synced.afterRemove).toBe(synced.before)
})

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
