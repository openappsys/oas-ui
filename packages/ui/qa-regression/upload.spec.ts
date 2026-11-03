// 复核回归：upload——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

test('upload picture-card：list-type 属性在 Vue demo 存活，预置照片渲染缩略图卡片', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-full')
  // #upload-full 预置 3 张 SVG 图片（onMounted 异步 import 后设置 files）
  await page.waitForFunction(
    () => document.querySelector('#upload-full')?.shadowRoot?.querySelectorAll('.card').length === 3,
    null,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const full = document.querySelector('#upload-full')!
    return {
      listTypeAttr: full.getAttribute('list-type'),
      cards: full.shadowRoot!.querySelectorAll('.card').length,
      thumbs: full.shadowRoot!.querySelectorAll('.card .thumb img').length,
      thumbBlobSrc: full.shadowRoot!.querySelector('.card .thumb img')?.getAttribute('src') ?? '',
    }
  })
  expect(r.listTypeAttr, 'list-type 被 Vue 剥离').toBe('picture-card')
  expect(r.cards).toBe(3)
  expect(r.thumbs).toBe(3)
  expect(r.thumbBlobSrc).toContain('blob:') // URL.createObjectURL 缩略图
})

test('upload 文件大小显示 IEC 单位（KiB）：回显列表与 dark 主题均可读', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-echo')
  await page.waitForFunction(
    () => document.querySelector('#upload-echo')?.shadowRoot?.querySelectorAll('.item').length === 2,
    null,
    { timeout: 10000 },
  )
  // Task 9C 可见变化：2048 / 4096 字节 → 2.0 KiB / 4.0 KiB（旧文案为 2.0 KB / 4.0 KB）
  const light = await page.evaluate(() => {
    const el = document.querySelector('#upload-echo')!
    return [...el.shadowRoot!.querySelectorAll('.item .size')].map((n) => n.textContent)
  })
  expect(light).toEqual(['2.0 KiB', '4.0 KiB'])

  const dark = await page.evaluate(() => {
    document.documentElement.classList.add('dark')
    const el = document.querySelector('#upload-echo')!
    const sizes = [...el.shadowRoot!.querySelectorAll('.item .size')]
    const result = sizes.map((n) => {
      const rect = n.getBoundingClientRect()
      const style = getComputedStyle(n)
      return {
        text: n.textContent,
        visible: rect.width > 0 && rect.height > 0,
        opacity: style.opacity,
        color: style.color,
      }
    })
    document.documentElement.classList.remove('dark')
    return result
  })
  expect(dark.map((o) => o.text)).toEqual(['2.0 KiB', '4.0 KiB'])
  for (const item of dark) {
    expect(item.visible, 'dark 下大小文案不可见').toBe(true)
    expect(item.opacity).not.toBe('0')
    expect(item.color).not.toBe('rgba(0, 0, 0, 0)')
  }
})

test('upload max-size 接受 IEC 写法：2KiB 真实拦截 3KiB 文件（不再静默当作无限制）', async ({ page }) => {
  // Task 9C fix round 1：用户照新的显示文案写 `2KiB` 时必须生效；旧解析表只认 b|kb|mb|gb，
  // 会 return 0（=不限制）静默放行。devWarn 属 dev-only 通道（docs 为生产构建会被摇掉），
  // 告警本身由 oas-upload.test.ts 单测锁定；这里断言用户可感知的拦截结果。
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-drag')
  const r = await page.evaluate(async () => {
    if (!customElements.get('oas-upload')) await customElements.whenDefined('oas-upload')
    const host = document.createElement('oas-upload') as HTMLElement & { files: unknown[] }
    host.id = 'max-size-kib-probe'
    host.setAttribute('max-size', '2KiB')
    host.style.cssText = 'display:block;width:320px;position:fixed;top:80px;left:20px;z-index:9999;'
    document.body.appendChild(host)
    const detail: { type?: string; maxSize?: number; rejected?: number } = {}
    host.addEventListener('oas-exceed-limit', (e) => {
      const d = (e as CustomEvent).detail as { type?: string; maxSize?: number; files?: unknown[] }
      detail.type = d.type
      detail.maxSize = d.maxSize
      detail.rejected = d.files?.length ?? 0
    })
    const dt = new DataTransfer()
    dt.items.add(new File([new ArrayBuffer(3 * 1024)], 'three-kib.bin', { type: 'application/octet-stream' }))
    host
      .shadowRoot!.querySelector('.zone')!
      .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
    await new Promise((res) => setTimeout(res, 50))
    const result = {
      files: host.files.length,
      type: detail.type,
      maxSize: detail.maxSize,
      rejected: detail.rejected ?? 0,
    }
    host.remove()
    return result
  })
  expect(r.files, '3KiB 超过 2KiB 上限，不得入列').toBe(0)
  expect(r.rejected).toBe(1)
  expect(r.type).toBe('size')
  expect(r.maxSize).toBe(2048)

  // 同一提交的边界收口：`0.4B` 舍入到 0 后必须按 1 字节生效，而不是静默变成「不限制」
  const sub = await page.evaluate(async () => {
    if (!customElements.get('oas-upload')) await customElements.whenDefined('oas-upload')
    const host = document.createElement('oas-upload') as HTMLElement & { files: unknown[] }
    host.setAttribute('max-size', '0.4B')
    host.style.cssText = 'display:block;width:320px;position:fixed;top:80px;left:20px;z-index:9999;'
    document.body.appendChild(host)
    let maxSize: number | undefined
    host.addEventListener('oas-exceed-limit', (e) => {
      maxSize = ((e as CustomEvent).detail as { maxSize?: number }).maxSize
    })
    const dt = new DataTransfer()
    dt.items.add(new File([new ArrayBuffer(2)], 'two-bytes.bin', { type: 'application/octet-stream' }))
    host
      .shadowRoot!.querySelector('.zone')!
      .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
    await new Promise((res) => setTimeout(res, 50))
    const result = { files: host.files.length, maxSize }
    host.remove()
    return result
  })
  expect(sub.files, '2 字节超过 0.4B（按 1 字节）上限，不得入列').toBe(0)
  expect(sub.maxSize, '0.4B 应按 1 字节而不是不限制').toBe(1)
})

test('upload 拖拽 drop：真实拖放文件到拖拽区即渲染', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-drag')
  await page.evaluate(() => {
    const el = document.querySelector('#upload-drag')!
    const zone = el.shadowRoot!.querySelector('.zone')!
    const dt = new DataTransfer()
    dt.items.add(new File(['hello'], 'drag.txt', { type: 'text/plain' }))
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(
    () => document.querySelector('#upload-drag')?.shadowRoot?.querySelector('.item') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('#upload-drag')!
    return {
      items: el.shadowRoot!.querySelectorAll('.item').length,
      hasName: el.shadowRoot!.querySelector('.item .name')?.textContent,
    }
  })
  expect(r.items).toBe(1)
  expect(r.hasName).toBe('drag.txt')
})

test('upload 超限 max：drop 超过 max 的文件触发 oas-exceed-limit 并弹出 message 可见反馈', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-wall-exceed')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    const el = document.querySelector('#upload-wall-exceed')!
    const zone = el.shadowRoot!.querySelector('.zone')!
    const dt = new DataTransfer()
    for (let i = 0; i < 4; i++) {
      dt.items.add(new File(['x'], `f${i}.png`, { type: 'image/png' }))
    }
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const r = await page.evaluate(() => {
    const el = document.querySelector('#upload-wall-exceed')!
    return {
      msgCount: document.querySelectorAll('oas-message').length,
      msgText: document.querySelector('oas-message')?.shadowRoot?.textContent ?? '',
      cards: el.shadowRoot!.querySelectorAll('.card').length, // max=3：只接收 3 个
    }
  })
  expect(r.msgCount).toBe(1)
  expect(r.msgText).toContain('最多上传 3 个文件')
  expect(r.cards).toBe(3)
})

test('upload 预览浮层关闭态不拦截指针事件 + 拖拽区图标尺寸稳定', async ({ page }) => {
  // 曾现风险 1：.preview-mask 的 display:flex 压过 UA [hidden] 规则 → 关闭态浮层 fixed 铺满
  // 视口拦截全页指针事件（DSD 真水合 e2e 全页点击被 oas-upload 拦截而超时）。
  // 曾现风险 2：zone 内 oas-icon 未 upgrade 前高度 0、upgrade 后 28px → 拖拽区高度跳变。
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-drag')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#upload-drag')!
    const mask = el.shadowRoot!.querySelector('.preview-mask')!
    const icon = el.shadowRoot!.querySelector('.zone .icon')!
    const rect = mask.getBoundingClientRect()
    const iconStyle = getComputedStyle(icon)
    return {
      maskHidden: mask.hasAttribute('hidden'),
      maskDisplay: getComputedStyle(mask).display,
      maskCoversPage: rect.width > 0 && rect.height > 0,
      iconW: iconStyle.width,
      iconH: iconStyle.height,
    }
  })
  expect(r.maskHidden).toBe(true)
  expect(r.maskDisplay).toBe('none')
  expect(r.maskCoversPage).toBe(false)
  expect(r.iconW).toBe('28px')
  expect(r.iconH).toBe('28px')
})

// —— picture-card 触屏适配：coarse 下删除×常显（无 hover 可依赖）——
test('upload picture-card 触屏（coarse）：删除×常显且触控热区规则在样式表', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 667 } })
  const p = await ctx.newPage()
  await p.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(p, '#upload-full')
  await p.waitForFunction(
    () => document.querySelector('#upload-full')?.shadowRoot?.querySelectorAll('.card').length === 3,
    null,
    { timeout: 10000 },
  )
  const r = await p.evaluate(() => {
    const root = document.querySelector('#upload-full')!.shadowRoot!
    const remove = root.querySelector('.card .remove') as HTMLElement
    const css = root.querySelector('style')!.textContent!
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const cs = getComputedStyle(remove)
    return {
      coarse,
      opacity: cs.opacity,
      pointerEvents: cs.pointerEvents,
      coarseCss: css.includes('@media (pointer: coarse)'),
      tokenCss: css.includes('var(--oas-touch-target-min, 44px)'),
    }
  })
  expect(r.coarse, 'touch context 应命中 pointer: coarse').toBe(true)
  expect(r.coarseCss).toBe(true)
  expect(r.tokenCss).toBe(true)
  // 删除×触屏常显（修复前 opacity:0 + pointer-events:none，触屏不可达）
  expect(r.opacity).toBe('1')
  expect(r.pointerEvents).toBe('auto')
  await ctx.close()
})

// —— 移动端视觉复核缺陷：picture-card 删除× dark 对比度不足（深色徽标配深色 × 融为一团）——
// 修复：徽标底色/字色成对取 text-primary+bg——dark 下反转为浅底深字。
test('upload picture-card：dark 下删除×徽标反转为浅底深字（× 在深色缩略图上可读）', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-full')
  await page.waitForFunction(
    () => document.querySelector('#upload-full')?.shadowRoot?.querySelectorAll('.card').length === 3,
    null,
    { timeout: 10000 },
  )
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  // dark token 翻转完成的真实信号：徽标底/字亮度关系已达断言条件（bgL>200、colorL<80、差>120）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const cs = getComputedStyle(
          document.querySelector('#upload-full')!.shadowRoot!.querySelector('.card .remove') as HTMLElement,
        )
        const lum = (rgb: string) => {
          const [rr, gg, bb] = rgb.match(/\d+/g)!.map(Number)
          return 0.2126 * rr! + 0.7152 * gg! + 0.0722 * bb!
        }
        const bgL = lum(cs.backgroundColor)
        const colorL = lum(cs.color)
        return bgL > 200 && colorL < 80 && bgL - colorL > 120
      }),
    )
    .toBe(true)
  const r = await page.evaluate(() => {
    const remove = document.querySelector('#upload-full')!.shadowRoot!.querySelector('.card .remove') as HTMLElement
    const cs = getComputedStyle(remove)
    const lum = (rgb: string) => {
      const [rr, gg, bb] = rgb.match(/\d+/g)!.map(Number)
      return 0.2126 * rr! + 0.7152 * gg! + 0.0722 * bb!
    }
    return { bg: cs.backgroundColor, color: cs.color, bgL: lum(cs.backgroundColor), colorL: lum(cs.color) }
  })
  expect(r.bgL, `dark 下徽标底色应接近白（实际 ${r.bg}）`).toBeGreaterThan(200)
  expect(r.colorL, `dark 下 × 应为深色（实际 ${r.color}）`).toBeLessThan(80)
  expect(r.bgL - r.colorL, '徽标底/字亮度差应足够大').toBeGreaterThan(120)
})

// —— PRD P2：oas-progress 对外进度事件通道 ——
test('upload oas-progress：drop 后进度事件派发（percent 推进到 100，页面反馈可见）', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-progress')
  await page.evaluate(() => {
    const el = document.querySelector('#upload-progress')!
    el.scrollIntoView({ block: 'center' })
    ;(window as any).__prog = []
    el.addEventListener('oas-progress', (e) => (window as any).__prog.push((e as CustomEvent).detail.percent))
  })
  await page.evaluate(() => {
    const el = document.querySelector('#upload-progress')!
    const zone = el.shadowRoot!.querySelector('.zone')!
    const dt = new DataTransfer()
    dt.items.add(new File(['progress'], 'progress.txt', { type: 'text/plain' }))
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(
    () => ((window as any).__prog ?? []).length > 0 && ((window as any).__prog as number[]).at(-1) === 100,
    null,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const prog = (window as any).__prog as number[]
    const mono = prog.every((p, i) => i === 0 || p >= prog[i - 1]!)
    return {
      count: prog.length,
      last: prog.at(-1),
      mono,
      output: document.getElementById('upload-progress-output')?.textContent ?? '',
    }
  })
  expect(r.last, '进度收尾应为 100').toBe(100)
  expect(r.mono, '进度应单调不回退').toBe(true)
  expect(r.count, '至少派发一次 oas-progress').toBe(5)
  expect(r.output, 'demo 反馈区应显示进度').toContain('100%')
})

// ===== crop：图片上传前裁剪（D19）=====
// 机制链路（真实 drop → 裁剪对话框 → canvas 导出入列）；视觉核对由人工截图负责。

test('upload crop：drop 图片弹裁剪框（固定比例 1:1），确认后 canvas 结果入列 + oas-crop', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-wall')
  const opened = await page.evaluate(async () => {
    if (!customElements.get('oas-upload')) await customElements.whenDefined('oas-upload')
    // 真实 PNG（canvas 绘制 → toBlob → File）：裁剪对话框的图像解码与导出走真数据
    const cv = document.createElement('canvas')
    cv.width = 640
    cv.height = 480
    const ctx = cv.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 640, 480)
    g.addColorStop(0, '#0b6cff')
    g.addColorStop(1, '#16a34a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 640, 480)
    const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), 'image/png'))
    const file = new File([blob], 'crop-e2e.png', { type: 'image/png' })
    const host = document.createElement('oas-upload')
    host.id = 'crop-probe'
    for (const [k, v] of [
      ['crop', ''],
      ['crop-aspect', '1:1'],
      ['list-type', 'picture-card'],
      ['accept', 'image/*'],
    ] as const) {
      host.setAttribute(k, v)
    }
    host.style.cssText = 'display:block;width:360px;position:fixed;top:80px;left:20px;z-index:9999;'
    document.body.appendChild(host)
    const zone = host.shadowRoot!.querySelector('.zone')!
    const dt = new DataTransfer()
    dt.items.add(file)
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
    return host.id
  })
  expect(opened).toBe('crop-probe')
  // 图像解码 + 舞台绘制：canvas 中心像素非透明（未解码/未绘制 = 全透明）
  await page.waitForFunction(
    () => {
      const host = document.querySelector('#crop-probe')
      const canvas = host?.shadowRoot?.querySelector<HTMLCanvasElement>('.crop-canvas')
      if (!canvas) return false
      const d = canvas.getContext('2d')!.getImageData(160, 120, 1, 1).data
      return d[3]! > 0
    },
    null,
    { timeout: 8000 },
  )
  const frame = await page.evaluate(() => {
    const host = document.querySelector('#crop-probe')!
    const frame = host.shadowRoot!.querySelector<HTMLElement>('.crop-frame')!
    const mask = host.shadowRoot!.querySelector<HTMLElement>('.crop-mask')!
    return {
      opened: !mask.hasAttribute('hidden'),
      aspect: frame.getAttribute('data-crop-aspect'),
      w: frame.offsetWidth,
      h: frame.offsetHeight,
      role: host.shadowRoot!.querySelector<HTMLElement>('.crop-dialog')!.getAttribute('role'),
    }
  })
  expect(frame.opened, '裁剪对话框打开').toBe(true)
  expect(frame.role, 'role=dialog').toBe('dialog')
  expect(frame.aspect, '固定比例标记').toBe('1:1')
  // 初始框 0.8×240 = 192×192（1:1），border 2px → offsetWidth 194；宽高必须相等
  expect(Math.abs(frame.w - frame.h), `裁剪框宽高相等（1:1，实测 ${frame.w}×${frame.h}）`).toBeLessThanOrEqual(2)
  // 确认：真实 canvas 导出 → oas-crop + 卡片入列
  await realClick(page, '#crop-probe', '.crop-ok')
  await page.waitForFunction(
    () => document.querySelector('#crop-probe')?.shadowRoot?.querySelectorAll('.card').length === 1,
    null,
    { timeout: 8000 },
  )
  const after = await page.evaluate(() => {
    const host = document.querySelector('#crop-probe') as HTMLElement & { files: Array<unknown> }
    const mask = host.shadowRoot!.querySelector<HTMLElement>('.crop-mask')!
    const img = host.shadowRoot!.querySelector<HTMLImageElement>('.card .thumb img')!
    const first = host.files[0] as File | undefined
    return {
      maskHidden: mask.hasAttribute('hidden'),
      cards: host.shadowRoot!.querySelectorAll('.card').length,
      thumbSrc: img.getAttribute('src') ?? '',
      name: first?.name ?? '',
      type: first instanceof File ? first.type : '',
    }
  })
  expect(after.maskHidden, '确认后对话框关闭').toBe(true)
  expect(after.cards).toBe(1)
  expect(after.thumbSrc, '裁剪结果缩略图（对象 URL）').toContain('blob:')
  expect(after.name).toBe('crop-e2e.png')
  expect(after.type).toBe('image/png')
  await page.evaluate(() => document.querySelector('#crop-probe')!.remove())
})

test('upload crop：取消（cancel 按钮）不入列；Esc 同效', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-wall')
  await page.evaluate(async () => {
    if (!customElements.get('oas-upload')) await customElements.whenDefined('oas-upload')
    const cv = document.createElement('canvas')
    cv.width = 320
    cv.height = 240
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#d97706'
    ctx.fillRect(0, 0, 320, 240)
    const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), 'image/png'))
    const host = document.createElement('oas-upload')
    host.id = 'crop-cancel-probe'
    for (const [k, v] of [
      ['crop', ''],
      ['list-type', 'picture-card'],
      ['accept', 'image/*'],
    ] as const) {
      host.setAttribute(k, v)
    }
    host.style.cssText = 'display:block;width:360px;position:fixed;top:80px;left:20px;z-index:9999;'
    document.body.appendChild(host)
    const dt = new DataTransfer()
    dt.items.add(new File([blob], 'cancel-e2e.png', { type: 'image/png' }))
    host
      .shadowRoot!.querySelector('.zone')!
      .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(
    () => {
      const mask = document.querySelector('#crop-cancel-probe')?.shadowRoot?.querySelector<HTMLElement>('.crop-mask')
      return !!mask && !mask.hasAttribute('hidden')
    },
    null,
    { timeout: 8000 },
  )
  await realClick(page, '#crop-cancel-probe', '.crop-cancel')
  await page.waitForFunction(
    () =>
      document
        .querySelector('#crop-cancel-probe')
        ?.shadowRoot?.querySelector<HTMLElement>('.crop-mask')
        ?.hasAttribute('hidden') === true,
    null,
    { timeout: 8000 },
  )
  const cards = await page.evaluate(
    () => document.querySelector('#crop-cancel-probe')!.shadowRoot!.querySelectorAll('.card').length,
  )
  expect(cards, '取消不入列').toBe(0)
  // Esc 路径：再 drop 一张，Esc 关闭同样不入列
  await page.evaluate(async () => {
    const host = document.querySelector('#crop-cancel-probe')!
    const dt = new DataTransfer()
    dt.items.add(new File([new ArrayBuffer(8)], 'esc-e2e.png', { type: 'image/png' }))
    host
      .shadowRoot!.querySelector('.zone')!
      .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(
    () => {
      const mask = document.querySelector('#crop-cancel-probe')?.shadowRoot?.querySelector<HTMLElement>('.crop-mask')
      return !!mask && !mask.hasAttribute('hidden')
    },
    null,
    { timeout: 8000 },
  )
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  await page.waitForFunction(
    () =>
      document
        .querySelector('#crop-cancel-probe')
        ?.shadowRoot?.querySelector<HTMLElement>('.crop-mask')
        ?.hasAttribute('hidden') === true,
    null,
    { timeout: 8000 },
  )
  const cards2 = await page.evaluate(
    () => document.querySelector('#crop-cancel-probe')!.shadowRoot!.querySelectorAll('.card').length,
  )
  expect(cards2, 'Esc 取消同样不入列').toBe(0)
  await page.evaluate(() => document.querySelector('#crop-cancel-probe')!.remove())
})

// —— 错误摘要条：失败 → 重试仍失败 → 清除错误（R2-M12） ——

test('upload 错误摘要条：404 失败 → 重试全部仍失败 → 清除错误只移除失败行（保留成功行）', async ({ page }) => {
  // 真实 XHR 通道 + 路由拦截模拟 404：bad.txt 恒失败、good.txt 成功
  let badHits = 0
  await page.route('**/api/upload', async (route) => {
    const body = route.request().postDataBuffer()?.toString('latin1') ?? ''
    if (body.includes('bad.txt')) {
      badHits += 1
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'https://cdn.example.com/good.txt' }),
    })
  })
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-summary')

  const snapshot = () =>
    page.evaluate(() => {
      const el = document.querySelector('#upload-summary')!
      const bar = el.shadowRoot!.querySelector<HTMLElement>('.error-bar')!
      const status = bar.querySelector<HTMLElement>('.error-bar-text')!
      return {
        barVisible: !bar.hasAttribute('hidden'),
        statusRole: status.getAttribute('role'),
        statusText: status.textContent ?? '',
        buttonsInLiveRegion: [...bar.querySelectorAll('button')].some((b) => b.closest('[role="status"]') !== null),
        rows: [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')].map((it) => ({
          name: it.querySelector('.name')?.textContent ?? '',
          error: it.classList.contains('is-error'),
          retry: it.querySelector('button.act-retry, button.retry') !== null,
        })),
      }
    })

  await page.evaluate(() => {
    const el = document.querySelector('#upload-summary')!
    const dt = new DataTransfer()
    dt.items.add(new File(['bad'], 'bad.txt', { type: 'text/plain' }))
    dt.items.add(new File(['good'], 'good.txt', { type: 'text/plain' }))
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  await expect.poll(async () => (await snapshot()).rows.length, { timeout: 10000 }).toBe(2)
  await expect.poll(async () => (await snapshot()).barVisible, { timeout: 10000 }).toBe(true)
  const failed = await snapshot()
  expect(failed.statusText, '摘要条文案给出失败数').toContain('1 个文件上传失败')
  expect(failed.statusRole, '活区落在文案节点').toBe('status')
  expect(failed.buttonsInLiveRegion, '两个按钮在活区外').toBe(false)
  expect(
    failed.rows.filter((r) => r.error).map((r) => r.name),
    '失败行标红',
  ).toEqual(['bad.txt'])
  expect(
    failed.rows.filter((r) => r.retry).map((r) => r.name),
    '失败行才有重试钮',
  ).toEqual(['bad.txt'])

  // 重试全部：仍走同一通道 → 再次 404，摘要条保留
  const beforeRetry = badHits
  await page.evaluate(() =>
    document.querySelector('#upload-summary')!.shadowRoot!.querySelector<HTMLElement>('.error-bar .retry-all')!.click(),
  )
  await expect.poll(() => badHits, { timeout: 10000 }).toBeGreaterThan(beforeRetry)
  await expect.poll(async () => (await snapshot()).rows.find((r) => r.error)?.name, { timeout: 10000 }).toBe('bad.txt')
  expect((await snapshot()).barVisible, '重试仍失败时摘要条不消失').toBe(true)

  // 清除错误：失败行移除，成功行保留，摘要条收起
  await page.evaluate(() =>
    document
      .querySelector('#upload-summary')!
      .shadowRoot!.querySelector<HTMLElement>('.error-bar .clear-errors')!
      .click(),
  )
  await expect.poll(async () => (await snapshot()).rows.map((r) => r.name), { timeout: 10000 }).toEqual(['good.txt'])
  const cleared = await snapshot()
  expect(cleared.barVisible, '失败行清空后摘要条收起').toBe(false)
  expect(
    cleared.rows.some((r) => r.error),
    '成功行不带错误态',
  ).toBe(false)
})

// —— storage-key：刷新后恢复（R2-M12） ——

test('upload storage-key：刷新后 done 条目回显（title 提示 + 无重试钮 + 列表零变化）', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-persist')
  await page.evaluate(() => window.localStorage.removeItem('oas-upload-demo'))

  // 选择两个文件 → 手动走模拟上传通道到 done → 落盘
  await page.evaluate(() => {
    const el = document.querySelector('#upload-persist')!
    const dt = new DataTransfer()
    dt.items.add(new File(['a'], 'keep-a.txt', { type: 'text/plain' }))
    dt.items.add(new File(['bb'], 'keep-b.txt', { type: 'text/plain' }))
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const rowCount = () =>
    page.evaluate(() => document.querySelector('#upload-persist')!.shadowRoot!.querySelectorAll('.item').length)
  await expect.poll(rowCount, { timeout: 10000 }).toBe(2)
  await page.evaluate(() => (document.querySelector('#upload-persist') as HTMLElement & { submit(): void }).submit())
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#upload-persist')!
      const rows = [...el.shadowRoot!.querySelectorAll('.item')]
      return rows.length === 2 && rows.every((r) => r.querySelector('oas-progress')?.getAttribute('percent') === '100')
    },
    null,
    { timeout: 15000 },
  )
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem('oas-upload-demo')
    if (!raw) return false
    const parsed = JSON.parse(raw) as { files?: Array<{ status?: string }> }
    return (parsed.files ?? []).length === 2 && (parsed.files ?? []).every((f) => f.status === 'done')
  })

  // 刷新：列表从 localStorage 回显（仅元数据）
  await page.reload({ waitUntil: 'domcontentloaded' })
  await up(page, '#upload-persist')
  await expect.poll(rowCount, { timeout: 10000 }).toBe(2)
  const restored = await page.evaluate(() => {
    const el = document.querySelector('#upload-persist')!
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.error-bar')!
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
    return {
      names: rows.map((r) => r.querySelector('.name')?.textContent ?? ''),
      titles: rows.map((r) => r.getAttribute('title') ?? ''),
      percents: rows.map((r) => r.querySelector('oas-progress')?.getAttribute('percent') ?? ''),
      rowRetry: rows.some((r) => r.querySelector('button.act-retry, button.retry') !== null),
      barVisible: !bar.hasAttribute('hidden'),
    }
  })
  expect(restored.names, 'done 条目按原顺序回显').toEqual(['keep-a.txt', 'keep-b.txt'])
  expect(restored.percents, 'done 条目回显为 100%').toEqual(['100', '100'])
  expect(restored.titles, '恢复条目带「已持久化」title 提示').toEqual([
    '已持久化：刷新后仍在列表中（不含文件内容）',
    '已持久化：刷新后仍在列表中（不含文件内容）',
  ])
  expect(restored.rowRetry, 'done 条目无行内重试钮').toBe(false)
  expect(restored.barVisible, '无失败文件 → 错误摘要条收起').toBe(false)

  // 收尾：清掉持久化，避免污染其它用例/页面
  await page.evaluate(() => {
    ;(document.querySelector('#upload-persist') as HTMLElement & { files: unknown[] }).files = []
    window.localStorage.removeItem('oas-upload-demo')
  })
})
