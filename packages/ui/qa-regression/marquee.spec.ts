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
    // 克隆份本体在 light DOM（页面样式可达，见下方「克隆份继承页面样式」回归），
    // 每份一个宿主直系包裹节点；每份内的子节点数应与宿主内容子节点数（排除克隆份）相同
    const copies = [...el.querySelectorAll<HTMLElement>(':scope > [data-oas-marquee-copy]')]
    const sourceNodes = [...el.childNodes].filter(
      (n) => !(n.nodeType === 1 && (n as Element).hasAttribute('data-oas-marquee-copy')),
    )
    return {
      ariaHidden: cloneEl.getAttribute('aria-hidden'),
      copyAriaHidden: copies[0]?.getAttribute('aria-hidden') ?? null,
      copyCount: copies.length,
      copyChildNodes: copies[0]?.childNodes.length ?? 0,
      sourceChildNodes: sourceNodes.length,
    }
  })
  expect(clone.ariaHidden, '克隆组对读屏隐藏').toBe('true')
  expect(clone.copyCount, '克隆份至少 1 份').toBeGreaterThanOrEqual(1)
  expect(clone.copyAriaHidden, '克隆份本体在 light DOM，须自身标注 aria-hidden').toBe('true')
  expect(clone.copyChildNodes, '每份克隆的子节点数 = 源内容子节点数').toBe(clone.sourceChildNodes)

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

test('marquee 克隆份继承页面样式：页面 class 定尺寸的内容，克隆份与源份同尺寸（克隆体丢页面样式回归）', async ({
  page,
}) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee')
  // 页面级 class 样式（不在 shadow 内）：缺陷形态下只有源份吃得到，克隆份尺寸归零 → 右侧整片空白
  await page.addStyleTag({
    content:
      '.mq-page-tile { width: 64px; height: 64px; background: #0b6cff; border-radius: 8px; display: inline-block; margin: 0 8px; }',
  })
  const r = await page.evaluate(async () => {
    if (!customElements.get('oas-marquee')) await customElements.whenDefined('oas-marquee')
    const host = document.createElement('oas-marquee')
    host.id = 'page-style-probe'
    host.setAttribute('speed', '120')
    host.style.cssText = 'display:block;width:600px;height:80px;position:fixed;top:-200px;left:0;'
    for (let i = 0; i < 6; i++) {
      const tile = document.createElement('div')
      tile.className = 'mq-page-tile'
      host.appendChild(tile)
    }
    document.body.appendChild(host)
    await new Promise<void>((resolve) => {
      const check = () => {
        const t = host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
        if (!t.classList.contains('measuring') && t.style.getPropertyValue('--oas-marquee-duration')) resolve()
        else requestAnimationFrame(check)
      }
      check()
    })
    const rect = (el: Element): { w: number; h: number } => {
      const b = el.getBoundingClientRect()
      return { w: +b.width.toFixed(2), h: +b.height.toFixed(2) }
    }
    const root = host.shadowRoot!
    const srcGroup = root.querySelector<HTMLElement>('.group:not(.clone)')!
    const cloneGroup = root.querySelector<HTMLElement>('.group.clone')!
    const srcTile = host.querySelector<HTMLElement>('.mq-page-tile')!
    // 克隆份本体在 light DOM（修复后的位置）；历史位置是 shadow 克隆组内的 .copy —— 两处都找，
    // 保证断言只依赖「用户看到的克隆份」而不绑定实现落点
    const cloneTile =
      cloneGroup.querySelector<HTMLElement>('.mq-page-tile') ??
      host
        .querySelector<HTMLElement>(':scope > [data-oas-marquee-copy]')
        ?.querySelector<HTMLElement>('.mq-page-tile') ??
      null
    const out = {
      srcTile: rect(srcTile),
      srcTileBg: getComputedStyle(srcTile).backgroundColor,
      cloneTile: cloneTile ? rect(cloneTile) : null,
      cloneTileBg: cloneTile ? getComputedStyle(cloneTile).backgroundColor : null,
      srcGroupW: rect(srcGroup).w,
      cloneGroupW: rect(cloneGroup).w,
      shift: parseFloat(
        root.querySelector<HTMLElement>('[part="track"]')!.style.getPropertyValue('--oas-marquee-shift'),
      ),
    }
    host.remove()
    return out
  })
  expect(r.srcTile.w, '前置：源份由页面 class 定尺寸（64×64）').toBeCloseTo(64, 1)
  expect(r.srcTile.h, '前置：源份高度由页面 class 定').toBeCloseTo(64, 1)
  expect(r.cloneTile, '克隆份存在').not.toBeNull()
  // 缺陷回归：修前克隆份 0×0（丢页面样式）→ 右侧整片空白
  expect(r.cloneTile!.w, '克隆份宽必须同源份（修前 0 = 丢页面样式）').toBeCloseTo(r.srcTile.w, 1)
  expect(r.cloneTile!.h, '克隆份高必须同源份').toBeCloseTo(r.srcTile.h, 1)
  expect(r.cloneTileBg, '克隆份背景色（页面 class）必须同源份').toBe(r.srcTileBg)
  // 克隆组宽度必须是源组宽的整数倍（repeat 份，份宽 === 位移距离）且足以覆盖视口（无右侧空白）
  expect(r.cloneGroupW, 'cloneGroupW 必须 > 0（修前为 0）').toBeGreaterThan(0)
  expect(
    Math.abs(r.cloneGroupW / r.srcGroupW - Math.round(r.cloneGroupW / r.srcGroupW)),
    `克隆组宽 ${r.cloneGroupW} 应为源组宽 ${r.srcGroupW} 的整数倍`,
  ).toBeLessThanOrEqual(0.02)
  expect(r.cloneGroupW, `克隆组宽 ${r.cloneGroupW} 必须覆盖视口（shift=${r.shift}）`).toBeGreaterThanOrEqual(r.shift)
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
  // 克隆份本体在 light DOM（页面样式可达）：每个份是一个带标记的宿主直系包裹节点，数量即份数
  const cloneCountBefore = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    return probe.host.querySelectorAll(':scope > [data-oas-marquee-copy]').length
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
    return probe.host.querySelectorAll(':scope > [data-oas-marquee-copy]').length
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

// ===== 接缝（wrap）无缝回归：几何不变量 + 渲染帧像素证据 =====
// 教训（上一轮漏检的根因）：布局层采样（track 的 gBCR.x / currentTime 单调）只能证明 transform 连续，
// 证明不了「内容本身以位移距离为周期」。历史缺陷：克隆组内相邻两份的文本连成同一行 → 份间空白
// 折叠成 1 个空格被保留；而源组末尾空白是行尾空白被移除 → 克隆份宽 = 源组宽 + 一个空格宽
// （实测 4.7px）≠ 动画位移距离 → 每轮 wrap 接缝右侧内容一次性前跳一个空格宽（实测单帧 -4.7px，
// 每轮一次）。下面两条断言分别锁「几何不变量」与「跨 wrap 的渲染帧位移」。

/** 接缝探针：独立实例（固定定位在视口左上、白底、600 宽）并等测量完成；用完 host.remove() */
async function installSeamProbe(page: Page, text: string, speed: number): Promise<void> {
  await page.evaluate(
    ({ text, speed }) => {
      return new Promise<void>(async (resolve) => {
        if (!customElements.get('oas-marquee')) await customElements.whenDefined('oas-marquee')
        const host = document.createElement('oas-marquee')
        host.id = 'seam-probe'
        host.setAttribute('speed', String(speed))
        host.style.cssText =
          'display:block;width:600px;height:40px;position:fixed;top:0;left:0;z-index:9999;background:#fff;'
        host.textContent = text
        document.body.appendChild(host)
        const ready = () => {
          const t = host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
          if (!t.classList.contains('measuring') && t.style.getPropertyValue('--oas-marquee-duration')) resolve()
          else requestAnimationFrame(ready)
        }
        ready()
      })
    },
    { text, speed },
  )
}

test('marquee 接缝几何：每份渲染宽 === 动画位移距离（份间不得多出/少掉一个空白宽）', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee')
  // 内容带结尾空白：历史缺陷的触发形态（源组末尾空白被移除、克隆份间空白被保留 ⇒ 份宽不等）
  await installSeamProbe(page, '✦ 短公告 ', 240)
  const r = await page.evaluate(() => {
    const host = document.querySelector('#seam-probe')!
    const track = host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    const src = host.shadowRoot!.querySelector<HTMLElement>('.group:not(.clone)')!
    const cln = host.shadowRoot!.querySelector<HTMLElement>('.group.clone')!
    const rangeW = (node: Node): number => {
      const rg = document.createRange()
      rg.selectNodeContents(node)
      return rg.getBoundingClientRect().width
    }
    // 克隆份本体在 light DOM（页面样式可达）：每个包裹节点是一个「份」
    const copies = [...host.querySelectorAll<HTMLElement>(':scope > [data-oas-marquee-copy]')]
    // 克隆份内每个「非空白文本 run」的渲染宽：份的行尾空白若被保留，run 宽会多出一个空格宽
    const runs: number[] = []
    const walk = (n: Node): void => {
      for (const k of n.childNodes) {
        if (k.nodeType === 3) {
          if ((k.textContent ?? '').trim() !== '') runs.push(rangeW(k))
        } else if (k.nodeType === 1) walk(k)
      }
    }
    for (const c of copies) walk(c)
    // 源内容渲染宽：宿主内容节点（排除克隆份）整体范围——克隆份在 light DOM，selectNodeContents(host)
    // 会把它们一并算进去，故按首末源节点取范围
    const sourceNodes = [...host.childNodes].filter(
      (n) => !(n.nodeType === 1 && (n as Element).hasAttribute('data-oas-marquee-copy')),
    )
    const srcRange = document.createRange()
    if (sourceNodes.length) {
      srcRange.setStartBefore(sourceNodes[0]!)
      srcRange.setEndAfter(sourceNodes[sourceNodes.length - 1]!)
    }
    return {
      shift: parseFloat(track.style.getPropertyValue('--oas-marquee-shift')),
      sourceW: src.getBoundingClientRect().width,
      cloneW: cln.getBoundingClientRect().width,
      sourceContentW: sourceNodes.length ? srcRange.getBoundingClientRect().width : 0,
      copies: copies.length,
      runs,
    }
  })
  await page.evaluate(() => document.querySelector('#seam-probe')!.remove())
  // 前置：本用例必须落在 auto-fill 多份区间（否则不存在份间接缝）
  const copies = Math.round(r.cloneW / r.sourceW)
  expect(copies, 'auto-fill 生效（>= 2 份）').toBeGreaterThanOrEqual(2)
  expect(r.copies, '克隆份包裹节点数 === 计算份数').toBe(copies)
  // 1) CSS 位移距离 === 源组（1 份）渲染宽（JS 测量与 CSS 动画同口径）
  expect(Math.abs(r.shift - r.sourceW), `位移距离 ${r.shift} 应等于源组宽 ${r.sourceW}`).toBeLessThanOrEqual(0.5)
  expect(
    Math.abs(r.sourceContentW - r.sourceW),
    `源内容渲染宽 ${r.sourceContentW} 应等于源组宽 ${r.sourceW}`,
  ).toBeLessThanOrEqual(0.5)
  // 2) 份宽不变量：克隆组内每个文本 run 宽 === 源组宽（±0.5px，覆盖次像素/取整误差）
  expect(r.runs.length, '克隆组内存在可测文本 run').toBeGreaterThanOrEqual(2)
  for (const w of r.runs) {
    expect(
      Math.abs(w - r.sourceW),
      `克隆份文本 run 宽 ${w.toFixed(3)} 必须等于源组宽 ${r.sourceW.toFixed(3)}（差 1 个空格宽 = 接缝顿挫）`,
    ).toBeLessThanOrEqual(0.5)
  }
  // 3) 克隆组宽必须是源组宽的整数倍（份宽 === 位移距离的直接推论）
  expect(
    Math.abs(r.cloneW - copies * r.sourceW),
    `克隆组宽 ${r.cloneW} 应为 ${copies} × 源组宽 ${r.sourceW}`,
  ).toBeLessThanOrEqual(0.5)
})

test('marquee 接缝像素：跨 wrap 的相邻渲染帧位移与常规帧一致（无一次性跳变/顿挫）', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marquee')
  await installSeamProbe(page, '✦ 短公告 ', 240)
  const geo = await page.evaluate(() => {
    const host = document.querySelector('#seam-probe')!
    const track = host.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    const anim = (track as HTMLElement & { getAnimations: () => Animation[] }).getAnimations()[0]!
    anim.pause()
    return {
      shift: parseFloat(track.style.getPropertyValue('--oas-marquee-shift')),
      dur: parseFloat(track.style.getPropertyValue('--oas-marquee-duration')) * 1000,
    }
  })
  const clip = { x: 0, y: 0, width: 600, height: 40 }
  /** 把动画位移（px）显式设到 dispPx 后截图：位移窗口可任意跨 wrap（进度取模） */
  const seekShot = async (dispPx: number): Promise<string> => {
    await page.evaluate(
      ({ d, shift, dur }) => {
        const host = document.querySelector('#seam-probe')!
        const anim = (
          host.shadowRoot!.querySelector('[part="track"]') as HTMLElement & {
            getAnimations: () => Animation[]
          }
        ).getAnimations()[0]!
        const p = d / shift
        anim.currentTime = (p - Math.floor(p)) * dur
        return new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 30))))
      },
      { d: dispPx, shift: geo.shift, dur: geo.dur },
    )
    // animations: 'allow' —— 默认的 'disabled' 会接管/改写 CSS 动画，破坏显式相位控制
    const buf = await page.screenshot({ clip, animations: 'allow' })
    return buf.toString('base64')
  }
  const STEP = 2
  const pairs: Array<{ label: string; a: string; b: string }> = []
  for (const [label, mid] of [
    ['wrap', geo.shift],
    ['mid-cycle', geo.shift / 2],
  ] as const) {
    const a = await seekShot(mid - STEP / 2)
    const b = await seekShot(mid + STEP / 2)
    pairs.push({ label, a, b })
  }
  const est = await page.evaluate(async (ps) => {
    const bitmap = async (b64: string): Promise<ImageBitmap> => {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    }
    const cv = document.createElement('canvas')
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const gray = async (b64: string) => {
      const img = await bitmap(b64)
      cv.width = img.width
      cv.height = img.height
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data
      const g = new Float32Array(cv.width * cv.height)
      for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!
      return { g, w: cv.width, h: cv.height }
    }
    const out: Array<{ label: string; shiftCss: number }> = []
    for (const p of ps) {
      const A = await gray(p.a)
      const B = await gray(p.b)
      const R = 12
      const sad: number[] = []
      let bk = 0
      for (let s = -R; s <= R; s++) {
        let sum = 0
        let n = 0
        for (let y = 0; y < A.h; y += 2) {
          const row = y * A.w
          for (let x = R; x < A.w - R; x += 2) {
            sum += Math.abs(A.g[row + x]! - B.g[row + x + s]!)
            n++
          }
        }
        sad.push(sum / n)
        if (sad.length === 1 || sum / n < sad[bk]!) bk = sad.length - 1
      }
      let sub = -R + bk
      if (bk > 0 && bk < sad.length - 1) {
        const y0 = sad[bk - 1]!
        const y1 = sad[bk]!
        const y2 = sad[bk + 1]!
        const den = y0 - 2 * y1 + y2
        if (den !== 0) sub = -R + bk + (0.5 * (y0 - y2)) / den
      }
      const dpr = window.devicePixelRatio || 1
      out.push({ label: p.label, shiftCss: sub / dpr })
    }
    return out
  }, pairs)
  await page.evaluate(() => document.querySelector('#seam-probe')!.remove())
  const midCycle = est.find((e) => e.label === 'mid-cycle')
  const wrap = est.find((e) => e.label === 'wrap')
  expect(midCycle, '中段控制组已测').toBeDefined()
  expect(wrap, 'wrap 组已测').toBeDefined()
  // 装置自检：周期中段的帧位移 = -STEP（内容左移 STEP px）
  expect(
    Math.abs(midCycle!.shiftCss + STEP),
    `中段帧位移应 ≈ -${STEP}px（实测 ${midCycle!.shiftCss.toFixed(2)}px，装置有效性自检）`,
  ).toBeLessThanOrEqual(1.5)
  // 缺陷回归：跨 wrap 帧位移同样是 -STEP；历史缺陷为 -STEP - 一个空格宽（实测 -6.7px）
  expect(
    Math.abs(wrap!.shiftCss + STEP),
    `跨 wrap 帧位移应 ≈ -${STEP}px（实测 ${wrap!.shiftCss.toFixed(2)}px；缺陷形态 = 额外跳一个空格宽）`,
  ).toBeLessThanOrEqual(1.5)
})

// ===== reverse 运行时切换：方向也是相位的一部分 =====
// 不变量与 speed/width 路径同源（「同一时刻位移距离相等」），但切换帧的位移方向会**反向**，
// 故不能直接套 expectSegmentContinuous 的恒速分段断言：这里断言「切换帧的帧位移不得超常规帧阈值」。
// 切换时机按动画进度门控（progress ∈ [0.15,0.35]），保证可复现的小进度相位——缺陷形态下该处
// 位移跳变 (2p-1)×shift ≈ -0.3~-0.7 shift（实测 -135.6px，常规帧 1.67px），负向大跳不会被
// 「正向回卷」的 wrap 过滤误吞。

/** 帧位移统计：wrap 判定双向（位移恰好回卷一整个 shift：正向 +shift、反向 -shift） */
function mqFrameSteps(
  samples: MqSample[],
  shift: number,
  mark: number,
  nearMs = 60,
): Array<{ t: number; dx: number; wrap: boolean; near: boolean }> {
  const steps: Array<{ t: number; dx: number; wrap: boolean; near: boolean }> = []
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!
    const b = samples[i]!
    const dt = b.t - a.t
    if (dt <= 0 || dt > 60) continue
    const dx = b.x - a.x
    const wrap = shift > 0 && Math.abs(Math.abs(dx) - shift) < shift * 0.25
    steps.push({ t: b.t, dx, wrap, near: Math.abs(b.t - mark) < nearMs })
  }
  return steps
}

/** 中位数（空数组返回 0） */
function mqMedian(xs: number[]): number {
  if (!xs.length) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

test('marquee reverse 运行时切换：切换帧位移不超常规帧阈值（方向连续，无整段跳变）', async ({ page }) => {
  await page.goto('/components/marquee.html', { waitUntil: 'domcontentloaded' })
  // 缺陷形态（旧实现）：restore 用**新**方向解读捕获到的裸进度 → 切换瞬间内容整体跳
  // (2p-1)×shift（p≈0.16 时实测 -135.6px = 81 倍常规帧）。新实现捕获「含方向」的位移比例。
  await installMqProbe(page, { text: '反向切换相位回归采样内容 · ', speed: 100, width: 600 })
  const marks = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    probe.begin()
    // 进度门控：动画进度进入 [0.15, 0.35] 才切 reverse（相位可复现；小进度处跳变最大且符号为负）
    return new Promise<number[]>((resolve) => {
      const tick = () => {
        const track = probe.trackEl()
        const anim = (
          track as HTMLElement & { getAnimations?: () => Array<{ currentTime: number | null }> }
        ).getAnimations?.()[0]
        // 时长走 CSS 变量（内联只写 --oas-marquee-duration），故不能读 style.animationDuration
        const durMs = (parseFloat(track.style.getPropertyValue('--oas-marquee-duration')) || 0) * 1000
        const delay = parseFloat(track.style.animationDelay) || 0
        const ct = anim && typeof anim.currentTime === 'number' ? anim.currentTime : null
        if (probe.t0 !== null && ct !== null && durMs > 0) {
          const p = ((((ct - delay) % durMs) + durMs) % durMs) / durMs
          if (p >= 0.15 && p <= 0.35) {
            probe.host.setAttribute('reverse', '')
            const mark = performance.now() - probe.t0
            // 采样继续 800ms（足够覆盖切换后的一次反向 wrap），再由 probe.stop() 一次性取回样本
            setTimeout(() => resolve([mark]), 800)
            return
          }
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }, PROBE_KEY)
  const { samples, starts } = await page.evaluate((key) => {
    const probe = (window as typeof window & Record<string, MqPageProbe>)[key]!
    return probe.stop()
  }, PROBE_KEY)
  expect(marks.length, 'reverse 切换已触发（进度门控命中）').toBe(1)
  const mark = marks[0]!
  const shift = samples.find((s) => s.shift > 0)?.shift ?? 0
  expect(shift, '位移距离已测量').toBeGreaterThan(0)
  // 1) 动画不重启：animationstart 只在初始发生 1 次；currentTime 无巨幅回退
  expect(starts, 'reverse 切换不得重启动画（animationstart 计数不变）').toBe(1)
  expect(mqRestartDrop(samples), 'currentTime 不得回退（重启特征）').toBeLessThanOrEqual(50)

  const steps = mqFrameSteps(samples, shift, mark)
  const far = steps.filter((s) => !s.wrap && !s.near)
  const near = steps.filter((s) => !s.wrap && s.near)
  expect(far.length, '切换点前后各有足够采样帧').toBeGreaterThan(15)
  expect(near.length, '切换点附近有采样帧').toBeGreaterThan(0)
  // 装置自检：常规帧位移 = 速度 100px/s × 帧时长（约 1.7px @60Hz），且切换前内容向左、切换后向右
  const medianStep = mqMedian(far.map((s) => Math.abs(s.dx)))
  expect(medianStep, `常规帧位移中位 ${medianStep.toFixed(2)}px 应贴合 100px/s（装置有效性自检）`).toBeGreaterThan(0.5)
  expect(medianStep).toBeLessThan(8)
  const before = steps.filter((s) => !s.wrap && s.t < mark - 60).map((s) => s.dx)
  const after = steps.filter((s) => !s.wrap && s.t > mark + 60).map((s) => s.dx)
  expect(mqMedian(before), '切换前内容左移（正向）').toBeLessThan(0)
  expect(mqMedian(after), '切换后内容右移（反向，证明方向真的翻了）').toBeGreaterThan(0)

  // 2) 缺陷回归断言：切换帧位移不得超常规帧阈值（修前实测 -135.6px vs 常规 1.67px）
  const worstToggle = near.reduce((m, s) => Math.max(m, Math.abs(s.dx)), 0)
  const limit = Math.max(8, medianStep * 3)
  expect(
    worstToggle,
    `切换帧位移 ${worstToggle.toFixed(2)}px 不得超过 max(8px, 3×常规帧 ${medianStep.toFixed(2)}px)（修前 = 0.3~0.7×shift）`,
  ).toBeLessThanOrEqual(limit)
})
