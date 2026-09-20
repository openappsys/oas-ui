// 复核回归：marquee——速度测量通道、reduced-motion 降级、克隆组无障碍、悬停暂停固化断言。
// 动画相关断言一律轮询（expect.poll / waitForFunction），不用固定等待代替断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('marquee 速度通道：测量退出 measuring、时长 = 内容宽 / speed；reduced-motion 静态降级', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee[speed="96"]')
  // ResizeObserver 测量完成：measuring 移除 + 时长写入（轮询）
  await page.waitForFunction(
    () => {
      const track = document
        .querySelector('oas-marquee[speed="96"]')
        ?.shadowRoot?.querySelector<HTMLElement>('[part="track"]')
      return (
        !!track &&
        !track.classList.contains('measuring') &&
        track.style.getPropertyValue('--oas-marquee-duration') !== ''
      )
    },
    null,
    { timeout: 10000 },
  )
  const t = await page.evaluate(() => {
    const track = document
      .querySelector('oas-marquee[speed="96"]')!
      .shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    return {
      shift: parseFloat(track.style.getPropertyValue('--oas-marquee-shift')),
      duration: parseFloat(track.style.getPropertyValue('--oas-marquee-duration')),
    }
  })
  expect(t.shift, '测得一组内容宽 > 0（无缝循环平移距离）').toBeGreaterThan(0)
  // 速度语义：像素/秒真实速度 → 时长 = 距离 / 速度（1% 容差）
  expect(Math.abs(t.duration - t.shift / 96), '时长 = 内容宽 ÷ 速度（96px/s 恒速）').toBeLessThan(
    Math.max(0.05, t.shift / 9600),
  )

  // prefers-reduced-motion: reduce → 动画整体关闭（静态展示），恢复后重新滚动
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          getComputedStyle(
            document
              .querySelector('oas-marquee[speed="96"]')!
              .shadowRoot!.querySelector<HTMLElement>('[part="track"]')!,
          ).animationName,
      ),
    )
    .toBe('none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          getComputedStyle(
            document
              .querySelector('oas-marquee[speed="96"]')!
              .shadowRoot!.querySelector<HTMLElement>('[part="track"]')!,
          ).animationName,
      ),
    )
    .toBe('oas-marquee-x')
})

test('marquee 克隆组 aria-hidden（读屏不重复播报）+ pause-on-hover 悬停暂停 / 移出恢复', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee[speed="96"]')
  const clone = await page.evaluate(() => {
    const el = document.querySelector('oas-marquee[speed="96"]')!
    const cloneEl = el.shadowRoot!.querySelector<HTMLElement>('.group.clone')!
    return {
      ariaHidden: cloneEl.getAttribute('aria-hidden'),
      cloneChildren: cloneEl.childElementCount,
      sourceChildren: el.childElementCount,
    }
  })
  expect(clone.ariaHidden, '克隆组对读屏隐藏').toBe('true')
  expect(clone.cloneChildren, '克隆组内容不少于源组（auto-fill 可多份）').toBeGreaterThanOrEqual(clone.sourceChildren)

  // 悬停暂停 / 移出恢复（play-state 计算值轮询）
  const hoverSel = 'oas-marquee[pause-on-hover]'
  await up(page, hoverSel)
  const host = page.locator(hoverSel).first()
  await host.scrollIntoViewIfNeeded()
  await host.hover()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          getComputedStyle(
            document
              .querySelector('oas-marquee[pause-on-hover]')!
              .shadowRoot!.querySelector<HTMLElement>('[part="track"]')!,
          ).animationPlayState,
      ),
    )
    .toBe('paused')
  await page.mouse.move(4, 4)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          getComputedStyle(
            document
              .querySelector('oas-marquee[pause-on-hover]')!
              .shadowRoot!.querySelector<HTMLElement>('[part="track"]')!,
          ).animationPlayState,
      ),
    )
    .toBe('running')
})
