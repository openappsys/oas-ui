// 复核回归：masonry——列数契约（含断点简写）、两值 gap 分离、items 数据通道与 column 指定列固化断言。
// 布局测量：先 scrollIntoViewIfNeeded，再等 DOM 静止后读几何；列数断言用几何/计算值，不依赖像素绝对值。

import { test, expect, type Page } from '@playwright/test'
import { up } from './helpers'

/** DOM 静止等待：body 序列化长度连续 150ms 无变化（稳定等待，断言本身仍轮询/计算值） */
async function settleDom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
    let last = document.body.innerHTML.length
    for (let i = 0; i < 20; i++) {
      await wait(150)
      const now = document.body.innerHTML.length
      if (now === last) return
      last = now
    }
  })
}

test('masonry 列数契约：columns=3 生效且子项分布 ≤3 列、断点简写命中 lg 4 列、两值 gap 行/列距分离', async ({
  page,
}) => {
  await page.goto('/components/masonry.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-masonry')
  await page.locator('oas-masonry[columns="3"]').first().scrollIntoViewIfNeeded()
  await settleDom(page)
  const r = await page.evaluate(() => {
    const rootOf = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.masonry')!
    const three = document.querySelector('oas-masonry[columns="3"]')!
    const lefts = new Set(
      [...three.querySelectorAll('oas-card')].map((c) => Math.round(c.getBoundingClientRect().left)),
    )
    const bp = document.querySelector('oas-masonry[columns="1 md:2 lg:4"]')!
    const two = document.querySelector('oas-masonry[gap="12 24"]')!
    return {
      col3: getComputedStyle(rootOf(three)).columnCount,
      gap16: getComputedStyle(rootOf(three)).columnGap,
      leftGroups: lefts.size,
      bpCol: getComputedStyle(rootOf(bp)).columnCount,
      rowGapVar: rootOf(two).style.getPropertyValue('--oas-masonry-item-gap'),
      colGap24: getComputedStyle(rootOf(two)).columnGap,
    }
  })
  expect(r.col3, 'columns=3 → column-count 3').toBe('3')
  expect(r.gap16, 'gap=16 → 列距 16px（纯数字补 px）').toBe('16px')
  expect(r.leftGroups, '子项分布不超过 3 列（列 x 坐标分组）').toBeLessThanOrEqual(3)
  expect(r.bpCol, '断点简写在宽视口命中 lg → 4 列（@media 变量注入生效）').toBe('4')
  expect(r.rowGapVar, '两值 gap「行 列」：行距 12px 写入子项 margin 变量').toBe('12px')
  expect(r.colGap24, '两值 gap：列距 24px').toBe('24px')
})

test('masonry items 数据通道：shadow 渲染、slot 隐藏、property 赋值热更新；column 指定列 DOM 重排', async ({
  page,
}) => {
  await page.goto('/components/masonry.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-masonry[items]')
  await page.locator('oas-masonry[items]').first().scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('oas-masonry[items]')!.shadowRoot!.querySelectorAll('.masonry-item').length,
      ),
    )
    .toBe(7)
  const slotHidden = await page.evaluate(
    () => document.querySelector('oas-masonry[items]')!.shadowRoot!.querySelector<HTMLElement>('slot')!.hidden,
  )
  expect(slotHidden, 'items 显式非空时 slot 子元素通道隐藏').toBe(true)

  // property 通道热更新：赋数组 → 渲染项重建为最新数据（setter 反射 attribute 统一解析链路）
  await page.evaluate(() => {
    const el = document.querySelector('oas-masonry[items]')! as HTMLElement & { items: unknown }
    el.items = [{ text: '热更新 A' }, { text: '热更新 B' }, { text: '热更新 C' }]
  })
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('oas-masonry[items]')!.shadowRoot!.querySelectorAll('.masonry-item').length,
      ),
    )
    .toBe(3)
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-masonry[items]')!
    return {
      firstText: el.shadowRoot!.querySelector('.masonry-item')!.textContent,
      attrReflected: (el.getAttribute('items') ?? '').includes('热更新 A'),
    }
  })
  expect(after.firstText, 'property 赋值渲染最新数据').toBe('热更新 A')
  expect(after.attrReflected, 'items setter 反射到 attribute（统一解析链路）').toBe(true)
  // 回归：曾现缺陷——syncItems 解析结果未回写内部状态，property getter 恒返回空数组
  const back = await page.evaluate(() => {
    const el = document.querySelector('oas-masonry[items]')! as HTMLElement & { items: Array<{ text: string }> }
    return { len: el.items.length, first: el.items[0]?.text ?? '' }
  })
  expect(back.len, 'items getter 应回读解析结果（不再恒为空数组）').toBe(3)
  expect(back.first).toBe('热更新 A')

  // column 指定列：7 项 4 列 → 每列 2 槽；column=2 → 槽位 2、column=4 → 槽位 6（重排幂等稳定）
  const pin = await page.evaluate(() =>
    [...[...document.querySelectorAll('oas-masonry[items]')][1]!.shadowRoot!.querySelectorAll('.masonry-item')].map(
      (i) => i.getAttribute('column'),
    ),
  )
  expect(pin, 'column=2 重排到第 2 列头部槽位、column=4 到第 4 列').toEqual([null, null, '2', null, null, null, '4'])
})
