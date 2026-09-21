// 复核回归：marquee——速度测量通道、reduced-motion 降级、克隆组无障碍、悬停暂停固化断言。
// 动画相关断言一律轮询（expect.poll / waitForFunction），不用固定等待代替断言。
// 另含三条「等价路径」回归（速度变更 / auto-fill 重算 / 悬停暂停）：任何改 timing、
// 重建克隆组、暂停恢复的路径都不得让位移距离跳变、不得重启动画——
// 动画被重启 = 肉眼必见顿挫，即使布局层采样连续；速度用高值（300-1000px/s）缩短周期、放大 SNR。

import { test, expect, type Page } from '@playwright/test'
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

test('marquee fade-edges：mask 挂内层 viewport 而非 :host（宿主 border/圆角不被淡出「开口」）', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee[fade-edges]')
  const r = await page.evaluate(() => {
    const host = document.querySelector('oas-marquee[fade-edges]')!
    const viewport = host.shadowRoot!.querySelector('.viewport')!
    return {
      hostMask: getComputedStyle(host).maskImage,
      viewportMask: getComputedStyle(viewport).maskImage,
    }
  })
  // 回归：mask 曾挂 :host——带框 demo 宿主的 border/圆角在两端约一个渐隐宽度内被一起淡出（框呈「开口」）
  expect(r.hostMask, ':host 不得有 mask（宿主自身边框/圆角必须保持完整）').toBe('none')
  expect(r.viewportMask, '渐隐 mask 应在内层 viewport（尺寸=宿主内容区，渐隐贴可视边缘）').toContain('linear-gradient')
})

test('marquee 相位连续：内容追加触发时长重写时位移序列无跳变（等位移补偿，周期性顿挫回归）', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee')
  const samples = await page.evaluate(async () => {
    // 独立实例：提速 400px/s 缩短周期，让它远离 demo 页其他实例与 #mq-live interval 噪声
    const host = document.createElement('oas-marquee')
    host.setAttribute('speed', '400')
    host.style.cssText = 'display: block; width: 600px; position: fixed; top: -200px; left: 0;'
    host.textContent = '相位连续回归采样内容 · '
    document.body.appendChild(host)
    // 等测量完成（measuring 移除 + 时长写入）
    await new Promise<void>((resolve) => {
      const check = () => {
        const t = host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
        if (!t.classList.contains('measuring') && t.style.getPropertyValue('--oas-marquee-duration')) resolve()
        else requestAnimationFrame(check)
      }
      check()
    })
    const track = host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    // 采样 1.5s：t≈500ms 时追加内容（slotchange → 克隆重建 + RO remeasure → 时长重写）
    // 缺陷形态：时长突变无补偿 → 该帧位移大幅偏离恒速（实测 ±130~300px 震荡/巨跳）
    const out: Array<{ t: number; x: number; shift: number }> = []
    let appended = false
    const t0 = await new Promise<number>((r) => requestAnimationFrame(r))
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const el = now - t0
        if (!appended && el > 500) {
          appended = true
          host.appendChild(document.createTextNode(' 追加段落 · '))
        }
        out.push({
          t: el,
          x: track.getBoundingClientRect().x,
          shift: parseFloat(track.style.getPropertyValue('--oas-marquee-shift')) || 0,
        })
        if (el > 1500) {
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    host.remove()
    return out
  })
  // 相邻帧速度序列；dx > shift/2 是周期回绕帧（wrap 正常形态），剔除后断言恒速
  const deltas: Array<{ v: number; wrap: boolean }> = []
  for (let i = 1; i < samples.length; i++) {
    const dt = (samples[i]!.t - samples[i - 1]!.t) / 1000
    if (dt <= 0) continue
    const dx = samples[i]!.x - samples[i - 1]!.x
    const shift = samples[i]!.shift
    deltas.push({ v: dx / dt, wrap: shift > 0 && dx > shift / 2 })
  }
  const speeds = deltas.filter((d) => !d.wrap).map((d) => d.v)
  expect(speeds.length, '采样应覆盖足够多常规帧').toBeGreaterThan(30)
  const sorted = [...speeds].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  expect(Math.abs(median), '中位速度 ≈ 400px/s（采样有效性）').toBeGreaterThan(300)
  // 缺陷回归断言：timing 变更（内容追加 → 时长重写）帧的位移速度不得偏离恒速
  // （修复前实测 -7821px/s 震荡；容差 40% + 5px/s 下限，覆盖帧时钟抖动）
  const worst = speeds.reduce((m, v) => Math.max(m, Math.abs(v - median)), 0)
  expect(
    worst,
    `位移速度偏离中位不得超过 40%（worst=${worst.toFixed(1)}px/s, median=${median.toFixed(1)}px/s）`,
  ).toBeLessThanOrEqual(Math.max(5, Math.abs(median) * 0.4))
})

// ===== 三条「等价路径」回归：速度变更 / auto-fill 重算 / 悬停暂停 =====
// 不变量（与组件实现注释一致）：位移距离连续 + 动画不重启。
// 采样两层数据：布局层（track gBCR x）+ 动画层（currentTime / animationstart 计数）——
// 「动画被重启」即使布局采样连续也必肉眼可见，必须单独断言。

interface MqSample {
  /** rAF 时间戳（相对采样起点，ms） */
  t: number
  /** track 布局 x（px，含动画 transform） */
  x: number
  /** 动画 currentTime（ms；浏览器不支持 getAnimations 时为 null） */
  ct: number | null
  /** 当前 --oas-marquee-shift（px） */
  shift: number
  /** animation-play-state 计算值 */
  ps: string
  /** animationstart 累计次数（重启检测） */
  starts: number
}

interface MqTrigger {
  at: number
  kind: 'speed' | 'width'
  value: string
}

/** 页面内探针句柄 key */
const PROBE_KEY = '__oasMqProbe'

/** 页面内探针对象结构（window 挂载，多个 evaluate 之间共享） */
interface MqPageProbe {
  host: HTMLElement
  trackEl: () => HTMLElement
  startsRef: () => number
  samples: MqSample[]
  raf: number
  t0: number | null
  begin: () => void
  stop: () => { samples: MqSample[]; starts: number }
}

// 注意：page.evaluate 的回调在浏览器上下文执行，Node 侧闭包变量不随之序列化——
// 页面内一律通过参数取 key，不引用 PROBE_KEY 等模块级变量

/** 装载独立实例 + 等测量完成（measuring 移除 + 时长写入）；固定定位远离 demo 页噪声 */
async function installMqProbe(
  page: Page,
  opts: { text: string; speed: number; width: number; pauseOnHover?: boolean; top?: string },
): Promise<void> {
  await page.evaluate(
    (o) => {
      return new Promise<void>(async (resolve) => {
        // goto(domcontentloaded) 时组件 bundle 可能仍在加载——先等元素定义再创建，否则不升级、无 shadowRoot
        if (!customElements.get('oas-marquee')) await customElements.whenDefined('oas-marquee')
        const host = document.createElement('oas-marquee')
        if (o.pauseOnHover) host.setAttribute('pause-on-hover', '')
        host.setAttribute('speed', String(o.speed))
        // hover 场景宿主要在视口内且盖过底下页面内容（z-index），其余场景放视口外避免干扰 demo 页
        host.style.cssText = `display:block;width:${o.width}px;position:fixed;top:${o.top ?? '-200px'};left:0;z-index:9999;`
        host.textContent = o.text
        document.body.appendChild(host)
        const trackEl = () => host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
        let starts = 0
        trackEl().addEventListener('animationstart', () => {
          starts += 1
        })
        const probe: MqPageProbe = {
          host,
          trackEl,
          startsRef: () => starts,
          samples: [],
          raf: 0,
          t0: null,
          begin() {
            const tick = (now: number) => {
              if (probe.t0 === null) probe.t0 = now
              const track = probe.trackEl()
              const anim = (
                track as HTMLElement & { getAnimations?: () => Array<{ currentTime: number | null }> }
              ).getAnimations?.()[0]
              probe.samples.push({
                t: now - probe.t0,
                x: track.getBoundingClientRect().x,
                ct: anim && typeof anim.currentTime === 'number' ? anim.currentTime : null,
                shift: parseFloat(track.style.getPropertyValue('--oas-marquee-shift')) || 0,
                ps: getComputedStyle(track).animationPlayState,
                starts: probe.startsRef(),
              })
              probe.raf = requestAnimationFrame(tick)
            }
            probe.raf = requestAnimationFrame(tick)
          },
          stop() {
            cancelAnimationFrame(probe.raf)
            return { samples: probe.samples, starts: probe.startsRef() }
          },
        }
        ;(window as typeof window & Record<string, MqPageProbe>)[o.key] = probe
        // 等测量完成（轮询，不用固定等待）
        const check = () => {
          const t = trackEl()
          if (!t.classList.contains('measuring') && t.style.getPropertyValue('--oas-marquee-duration')) resolve()
          else requestAnimationFrame(check)
        }
        check()
      })
    },
    { key: PROBE_KEY, ...opts },
  )
}

/** 页面内跑采样循环 + 按时刻触发变更（触发在 rAF tick 内同步执行，marks 记实际触发时刻） */
async function runMqProbe(
  page: Page,
  triggers: MqTrigger[],
  total: number,
): Promise<{ samples: MqSample[]; starts: number; marks: number[] }> {
  return page.evaluate(
    ({ key, triggers: trigs, total: totalMs }) => {
      const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
      const samples: MqSample[] = []
      const marks: number[] = []
      let ti = 0
      return new Promise((resolve) => {
        const tick = (now: number) => {
          if (probe.t0 === null) probe.t0 = now
          const t = now - probe.t0
          while (ti < trigs.length && t >= trigs[ti]!.at) {
            const trg = trigs[ti]!
            if (trg.kind === 'speed') probe.host.setAttribute('speed', trg.value)
            else probe.host.style.width = trg.value
            marks.push(t)
            ti += 1
          }
          const track = probe.trackEl()
          const anim = (
            track as HTMLElement & { getAnimations?: () => Array<{ currentTime: number | null }> }
          ).getAnimations?.()[0]
          samples.push({
            t,
            x: track.getBoundingClientRect().x,
            ct: anim && typeof anim.currentTime === 'number' ? anim.currentTime : null,
            shift: parseFloat(track.style.getPropertyValue('--oas-marquee-shift')) || 0,
            ps: getComputedStyle(track).animationPlayState,
            starts: probe.startsRef(),
          })
          if (t >= totalMs) {
            resolve({ samples, starts: probe.startsRef(), marks })
            return
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    },
    { key: PROBE_KEY, triggers, total },
  )
}

/** 相邻帧动画时钟最大回退（动画重启 = currentTime 归零 = 巨幅回退） */
function mqRestartDrop(samples: MqSample[]): number {
  let drop = 0
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!
    const b = samples[i]!
    if (a.ct == null || b.ct == null) continue
    drop = Math.max(drop, a.ct - b.ct)
  }
  return drop
}

/** 分段恒速断言：每段中位速度贴近期望值，段内最大偏离 ≤ max(40% 中位, 30px/s)。
 * 帧速度 dt 取动画时钟差：暂停帧（ct 停走）自然剔除，恢复帧速度即真实动画速度——
 * 若恢复瞬间有 delay 重映射错误或重启，位移跳变会直接体现在该帧速度上 */
function expectSegmentContinuous(
  samples: MqSample[],
  marks: number[],
  segments: Array<{ expected: number; label: string }>,
): void {
  expect(segments.length, '分段数 = 触发数 + 1').toBe(marks.length + 1)
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]!
    const from = s === 0 ? -1 : marks[s - 1]!
    const to = s === segments.length - 1 ? Number.POSITIVE_INFINITY : marks[s]!
    const segVs: number[] = []
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!
      const b = samples[i]!
      // 段归属按前一帧时刻；触发帧（t≈mark）已反映新时序，归入新段
      if (a.t < from || a.t >= to) continue
      if (a.ct == null || b.ct == null) continue
      const dct = b.ct - a.ct
      if (dct <= 0 || dct > 120) continue
      const dx = b.x - a.x
      // 周期回绕帧（wrap 正常形态）：dx 超过半程即判 wrap
      if (b.shift > 0 && dx > b.shift / 2) continue
      segVs.push(Math.abs(dx) / (dct / 1000))
    }
    expect(segVs.length, `${seg.label}：段内采样帧数足够`).toBeGreaterThan(15)
    const sorted = [...segVs].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]!
    expect(
      median,
      `${seg.label}：中位速度 ${median.toFixed(1)}px/s 应贴近期望 ${seg.expected}px/s`,
    ).toBeGreaterThanOrEqual(seg.expected * 0.6)
    expect(median).toBeLessThanOrEqual(seg.expected * 1.45)
    const worst = segVs.reduce((m, v) => Math.max(m, Math.abs(v - median)), 0)
    expect(
      worst,
      `${seg.label}：段内速度偏离中位 ≤ max(40%, 30px/s)（worst=${worst.toFixed(1)}, median=${median.toFixed(1)}）`,
    ).toBeLessThanOrEqual(Math.max(median * 0.4, 30))
  }
}

test('marquee 速度路径回归：连续两次改 speed，位移序列无跳变、动画不重启（等位移反解）', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  // 缺陷形态（旧实现）：update() 重写时长无补偿 → 进度按新时长整段重映射 → 速度切换帧位移巨跳
  // （实测 -1493~-7800px/s）；新实现按时长等位移反解负 delay，速度切换帧位移连续
  await installMqProbe(page, { text: '速度切换回归采样内容 · ', speed: 400, width: 600 })
  const { samples, starts, marks } = await runMqProbe(
    page,
    [
      { at: 500, kind: 'speed', value: '1000' },
      { at: 1000, kind: 'speed', value: '400' },
    ],
    1800,
  )
  expect(marks.length, '两次速度变更都已触发').toBe(2)
  // 动画不重启：animationstart 只在初始发生 1 次；currentTime 无巨幅回退
  expect(starts, '改速度不得重启动画（animationstart 计数不变）').toBe(1)
  expect(mqRestartDrop(samples), 'currentTime 不得回退（重启特征）').toBeLessThanOrEqual(50)
  expectSegmentContinuous(samples, marks, [
    { expected: 400, label: '段1 speed=400' },
    { expected: 1000, label: '段2 speed=1000' },
    { expected: 400, label: '段3 speed=400' },
  ])
})

test('marquee auto-fill 路径回归：容器宽度变化触发份数重算，位移序列无跳变、动画不重启', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  // 缺陷形态（旧实现）：任意 RO 触发（含份数重算，即使时长不变）都执行 delay=-currentTime 旧式恢复
  // → delay 重映射让画面瞬移（实测 +1863px/s 单帧）；新实现同一次 preserveShift 内完成重建+重写
  await installMqProbe(page, { text: '自动填充重算回归内容 · ', speed: 300, width: 600 })
  // 克隆组里是 light DOM 节点的克隆（纯文本内容 → text node），计数用 childNodes 不用 childElementCount
  const cloneCountBefore = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    return probe.host.shadowRoot!.querySelector<HTMLElement>('.group.clone')!.childNodes.length
  }, PROBE_KEY)
  const { samples, starts, marks } = await runMqProbe(
    page,
    [
      { at: 500, kind: 'width', value: '300px' },
      { at: 1100, kind: 'width', value: '700px' },
    ],
    1900,
  )
  expect(marks.length, '两次宽度变更都已触发').toBe(2)
  // auto-fill 份数确实随容器宽度重算（700px 比 600px 需要更多份），证明重算路径真的被走到
  const cloneCountAfter = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    return probe.host.shadowRoot!.querySelector<HTMLElement>('.group.clone')!.childNodes.length
  }, PROBE_KEY)
  expect(
    cloneCountAfter,
    `份数重算后克隆份数应增加（before=${cloneCountBefore}, after=${cloneCountAfter}）`,
  ).toBeGreaterThan(cloneCountBefore)
  // 动画不重启 + 恒速连续
  expect(starts, '容器宽度变化不得重启动画').toBe(1)
  expect(mqRestartDrop(samples), 'currentTime 不得回退（重启特征）').toBeLessThanOrEqual(50)
  expectSegmentContinuous(samples, marks, [
    { expected: 300, label: '段1 width=600' },
    { expected: 300, label: '段2 width=300（份数重算）' },
    { expected: 300, label: '段3 width=700（份数重算）' },
  ])
})

test('marquee 悬停暂停回归：进出循环不重启动画（animationstart 计数不变）、play-state 切换、恢复位移连续', async ({
  page,
}) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  // 机制：pause-on-hover 必须走 animation-play-state: paused（CSS 伪类切换，零 JS 参与）——
  // 若将来改成加/删 class 或重写 animation 简写，动画会重启 → 每进/出一次肉眼顿一下，此断言拦截
  await installMqProbe(page, {
    text: '悬停暂停进出循环回归采样内容 · '.repeat(3),
    speed: 400,
    width: 600,
    pauseOnHover: true,
    // 宿主放视口内（top=200px）+ z-index 盖过底下内容，:hover 需要真实指针可达
    top: '200px',
  })
  // 采样期间用真实鼠标驱动 :hover（进入→离开→再进入→离开）
  await page.evaluate((key) => {
    ;(window as typeof window & Record<string, MqPageProbe>)[key]!.begin()
  }, PROBE_KEY)
  const box = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    const r = probe.host.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, PROBE_KEY)
  await page.mouse.move(box.x, box.y)
  await page.waitForTimeout(500)
  await page.mouse.move(4, 4)
  await page.waitForTimeout(500)
  await page.mouse.move(box.x, box.y)
  await page.waitForTimeout(500)
  await page.mouse.move(4, 4)
  await page.waitForTimeout(300)
  const { samples, starts } = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    return probe.stop()
  }, PROBE_KEY)
  // 1) 动画不重启：animationstart 只在初始发生 1 次；currentTime 无巨幅回退
  expect(starts, '悬停进出循环不得重启动画（animationstart 计数不变）').toBe(1)
  expect(mqRestartDrop(samples), 'currentTime 不得回退（重启特征）').toBeLessThanOrEqual(50)
  // 2) play-state 机制真实生效：paused 与 running 都出现过
  const states = new Set(samples.map((s) => s.ps))
  expect(states.has('paused'), '悬停期间出现 paused').toBe(true)
  expect(states.has('running'), '移出期间出现 running').toBe(true)
  // 3) 全程位移连续（暂停帧经 ct 停走自然剔除；恢复帧速度 = 真实动画速度，跳变即现形）
  expectSegmentContinuous(samples, [], [{ expected: 400, label: '全程（暂停帧剔除）' }])
})
