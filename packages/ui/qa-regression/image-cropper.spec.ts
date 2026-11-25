// 复核回归：image-cropper——旋转/裁剪框键盘操作与确认裁剪的可见反馈。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

test('image-cropper：旋转按钮真实改变图片变换并派发可见变化', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-event')

  await realClick(page, '#ic-event', '[data-act="rotate"]')
  const state = await page.evaluate(() => {
    const host = document.querySelector('#ic-event')!
    const root = host.shadowRoot!
    return {
      rotation: (host as HTMLElement & { rotation: number }).rotation,
      transform: root.querySelector<HTMLImageElement>('[part="image"]')!.style.transform,
      feedback: document.querySelector('#ic-event-out')!.textContent ?? '',
    }
  })
  expect(state.rotation).toBe(90)
  expect(state.transform).toContain('rotate(90deg)')
  expect(state.feedback).toContain('oas-change')
})

test('image-cropper：裁剪框可聚焦并用方向键移动（真实按键）', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-square')

  const before = await page.evaluate(() => {
    const host = document.querySelector('#ic-square')!
    const frame = host.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    frame.focus()
    return Number.parseFloat(frame.style.left)
  })
  await page.keyboard.press('ArrowRight')
  const after = await page.evaluate(() =>
    Number.parseFloat(
      document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!.style.left,
    ),
  )
  expect(after).toBeGreaterThan(before)
})

test('image-cropper：确认裁剪产出 Blob 并在 demo 中显示尺寸', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-free')
  // 等图片加载完成（natual size 就绪才可能产出 blob）
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-free')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  await realClick(page, '#ic-free', '[data-act="confirm"]')
  await page.waitForFunction(() => (document.querySelector('#ic-free-out')?.textContent ?? '').includes('已裁剪'), {
    timeout: 15000,
  })
  const feedback = await page.evaluate(() => document.querySelector('#ic-free-out')!.textContent ?? '')
  expect(feedback).not.toContain('blob 不可用')
})

// 回归（history：zoom setter 走 setZoom → 派发 oas-change；宿主在事件里回写 el.zoom 造成同帧同步
// 递归爆栈）。真实浏览器下复现宿主双向绑定形态：事件回写不得抛错、不得无限派发。
test('image-cropper：宿主在 oas-change 里回写 el.zoom 不递归爆栈（真实浏览器）', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-event')
  const result = await page.evaluate(() => {
    const host = document.querySelector('#ic-event') as HTMLElement & { zoom: number }
    let calls = 0
    host.addEventListener('oas-change', (e) => {
      calls++
      const detail = (e as CustomEvent<{ zoom: number }>).detail
      host.zoom = detail.zoom
    })
    let error = ''
    try {
      const slider = host.shadowRoot!.querySelector<HTMLInputElement>('[part="zoom"]')!
      slider.value = '2'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      slider.dispatchEvent(new Event('change', { bubbles: true }))
    } catch (err) {
      error = String(err)
    }
    return { calls, error, zoom: host.zoom }
  })
  expect(result.error, '属性回写不得抛错（爆栈会在此暴露）').toBe('')
  expect(result.zoom).toBe(2)
  // 用户交互的一次提交只应产生一次 oas-change（回写不再派发）
  expect(result.calls).toBe(1)
})

// 回归（history：加载失败只派发 oas-error，舞台残留破图）。错误态必须可见且不留破图。
test('image-cropper：加载失败显示错误文案且不残留破图', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-error')
  await page.waitForFunction(() => (document.querySelector('#ic-error-out')?.textContent ?? '').includes('oas-error'), {
    timeout: 15000,
  })
  const state = await page.evaluate(() => {
    const host = document.querySelector('#ic-error') as HTMLElement & { shadowRoot: ShadowRoot }
    const root = host.shadowRoot
    const empty = root.querySelector<HTMLElement>('[part="empty"]')!
    const img = root.querySelector<HTMLImageElement>('[part="image"]')!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    const box = (el: HTMLElement) => el.getBoundingClientRect()
    const emptyBox = box(empty)
    return {
      text: empty.textContent ?? '',
      emptyVisible: emptyBox.width > 0 && emptyBox.height > 0,
      state: empty.dataset.state ?? '',
      imgHidden: img.hidden,
      frameVisible: box(frame).width > 0 && box(frame).height > 0,
      stageError: host.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!.hasAttribute('data-error'),
    }
  })
  expect(state.text).toContain('图片加载失败')
  expect(state.emptyVisible, '错误文案必须可见').toBe(true)
  expect(state.state).toBe('error')
  expect(state.imgHidden, '破图必须隐藏').toBe(true)
  expect(state.frameVisible, '错误态不显示裁剪框').toBe(false)
  expect(state.stageError).toBe(true)
})

/** 读裁剪器的舞台 / 裁剪框 / 图片几何（真实浏览器像素）。
 * 读前先把宿主滚进视口中央：page.mouse 用视口坐标，元素在首屏外时事件会派发到
 * 视口外的空处（不命中任何元素），拖拽链路整体失效——文档页在目标 demo 上方
 * 内容变多时（新增 demo 段）必然触发，滚动后坐标才与真实命中一致。 */
async function readCropper(page: import('@playwright/test').Page, host: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement & { offset: { x: number; y: number } }
    el.scrollIntoView({ block: 'center', behavior: 'instant' })
    const root = el.shadowRoot!
    const stage = root.querySelector<HTMLElement>('[part="stage"]')!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    const img = root.querySelector<HTMLImageElement>('[part="image"]')!
    const toRect = (node: HTMLElement) => {
      const r = node.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
    }
    return {
      offset: { ...el.offset },
      transform: img.style.transform,
      stage: toRect(stage),
      frame: toRect(frame),
      img: toRect(img),
      frameStyle: { left: frame.style.left, top: frame.style.top },
    }
  }, host)
}

// 回归（本轮新增能力）：激活 offset——拖舞台空白区平移图片，裁剪框不动，
// 且图片恒覆盖裁剪框（拖出可达范围时钳回，舞台不露底色）。
test('image-cropper：拖拽舞台平移图片，裁剪框不动且图片仍覆盖裁剪框', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-square')
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  const before = await readCropper(page, '#ic-square')
  // 1:1 裁剪框居中（左右各留 ~88px），从舞台左侧空白处向下拖 → 只能平移图片
  const startX = before.stage.left + 24
  const startY = before.stage.top + before.stage.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX, startY + 20, { steps: 4 })
  await page.mouse.move(startX, startY + 60, { steps: 4 })
  await page.mouse.up()

  const after = await readCropper(page, '#ic-square')
  expect(after.offset.y, '向下拖舞台应让图片下移（越界钳回后仍为正）').toBeGreaterThan(before.offset.y)
  expect(after.transform, '位移必须体现在图片 transform 上（用户可见）').toContain('translate(')
  expect(after.frameStyle.left, '裁剪框不得被拖动').toBe(before.frameStyle.left)
  expect(after.frameStyle.top, '裁剪框不得被拖动').toBe(before.frameStyle.top)
  // 覆盖约束：图片矩形必须完整包住裁剪框矩形（平移后舞台不露底色）
  expect(after.img.left).toBeLessThanOrEqual(after.frame.left + 0.5)
  expect(after.img.top).toBeLessThanOrEqual(after.frame.top + 0.5)
  expect(after.img.right).toBeGreaterThanOrEqual(after.frame.right - 0.5)
  expect(after.img.bottom).toBeGreaterThanOrEqual(after.frame.bottom - 0.5)
})

// 键盘平移：Alt+方向键移动图片（裁剪框不动），普通方向键仍移动裁剪框。
test('image-cropper：Alt+方向键平移图片，普通方向键仍移动裁剪框', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-square')
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  await page.evaluate(() => {
    const frame = document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    frame.focus()
  })
  const before = await readCropper(page, '#ic-square')
  await page.keyboard.down('Alt')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.up('Alt')
  const afterAlt = await readCropper(page, '#ic-square')
  expect(afterAlt.offset.y, 'Alt+方向键应平移图片').toBeGreaterThan(before.offset.y)
  expect(afterAlt.frameStyle.top, 'Alt+方向键不得移动裁剪框').toBe(before.frameStyle.top)

  await page.keyboard.press('ArrowLeft')
  const afterPlain = await readCropper(page, '#ic-square')
  expect(Number.parseFloat(afterPlain.frameStyle.left)).toBeLessThan(Number.parseFloat(afterAlt.frameStyle.left))
  expect(afterPlain.offset, '普通方向键不得平移图片').toEqual(afterAlt.offset)
})

// 触控板像素级缩放（v2.6.9 批 A）：page.mouse.wheel 派发像素增量（deltaMode=0），
// 真实浏览器断言小位移细粒度（±40px → ±0.1，不再整档 0.25 跳变）、锚点缩放照常派发 oas-change。
test('image-cropper：触控板像素级滚轮细粒度缩放（40px → 0.1），oas-change 跟随', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-square')
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  const center = await page.evaluate(() => {
    const el = document.querySelector('#ic-square')!
    el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    const stage = el.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!
    const r = stage.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  const zoomBefore = await page.evaluate(
    () => (document.querySelector('#ic-square') as HTMLElement & { zoom: number }).zoom,
  )

  // 触控板小位移：40px → 0.1（细粒度；旧实现一步 0.25）
  await page.mouse.move(center.x, center.y)
  await page.mouse.wheel(0, -40)
  await page.waitForFunction(
    (z) => (document.querySelector('#ic-square') as HTMLElement & { zoom: number }).zoom > z,
    zoomBefore,
    { timeout: 5000 },
  )
  const zoomFine = await page.evaluate(
    () => (document.querySelector('#ic-square') as HTMLElement & { zoom: number }).zoom,
  )
  expect(zoomFine - zoomBefore, '40px 位移 → 0.1 细粒度（非整档 0.25）').toBeCloseTo(0.1, 5)

  // 经典滚轮一格（100px）恰为一个整档 0.25（旧行为逐值保留）
  await page.mouse.wheel(0, -100)
  await page.waitForFunction(
    (z) => (document.querySelector('#ic-square') as HTMLElement & { zoom: number }).zoom > z + 0.2,
    zoomFine,
    { timeout: 5000 },
  )
  const zoomStep = await page.evaluate(
    () => (document.querySelector('#ic-square') as HTMLElement & { zoom: number }).zoom,
  )
  expect(zoomStep - zoomFine, '100px → 一个 0.25 整档').toBeCloseTo(0.25, 5)

  // 工具栏缩放读数跟随（用户可见：1 + 0.1 + 0.25 = 135%）
  const zoomLabel = await page.evaluate(
    () =>
      document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLElement>('.zoom-value')!.textContent ?? '',
  )
  expect(zoomLabel, '工具栏缩放读数跟随细粒度缩放').toBe('135%')
})

// 修复批回归：抓取光标（grab）必须在图片加载完成后出现。
// 真机 load 是异步事件、不经过 update()；只靠 update() 写入时该提示永远缺席。
test('image-cropper：图片加载完成后舞台给出 grab 光标（异步 load 也要有提示）', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-square')
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  const state = await page.evaluate(() => {
    const host = document.querySelector('#ic-square') as HTMLElement
    const stage = host.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!
    return {
      pannable: stage.hasAttribute('data-pannable'),
      cursor: getComputedStyle(stage).cursor,
      // 加载完成后继续拖动仍要生效（提示不是纯装饰：拖一下必须真的动）
      offsetBefore: { ...(host as HTMLElement & { offset: { x: number; y: number } }).offset },
    }
  })
  expect(state.pannable, '加载完成后舞台必须标记可抓取').toBe(true)
  expect(state.cursor, '可抓取提示必须是 grab 光标').toBe('grab')
})

// 修复批回归：舞台尺寸变化（ResizeObserver 路径）后位移必须按覆盖约束重新钳回，
// 否则裁剪框内会露出舞台底色（尺寸变小后旧位移超出新可行区间）。
test('image-cropper：舞台尺寸变小后位移钳回，裁剪框内不露舞台底色', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-pan')
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-pan')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  // 先把舞台撑高（可行区间随之变大），在「高阶状态」下把图片拖到纵向边界，
  // 再把舞台压回原高度——此时旧位移超出新区间，必须被钳回。
  const tallStyle = await page.addStyleTag({ content: '#ic-pan::part(stage) { height: 520px }' })
  await page.waitForFunction(
    () => {
      const stage = document.querySelector('#ic-pan')!.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!
      return stage.getBoundingClientRect().height > 500
    },
    { timeout: 5000 },
  )
  // 舞台撑高后 ResizeObserver 回调才按新尺寸重排裁剪框：只等「舞台变高」会读到回调前的旧框
  // （Chromium 常读到 304 高的旧框、Firefox 已读到 494 高的新框——起始几何跨引擎不一致，
  // 位移可行区间也就不同）。等裁剪框也按新高度落定，两引擎才从同一几何起跑。
  await page.waitForFunction(
    () => {
      const frame = document.querySelector('#ic-pan')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
      return frame.getBoundingClientRect().height > 400
    },
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    const host = document.querySelector('#ic-pan') as HTMLElement & { zoom: number }
    host.zoom = 2
  })
  const start = await readCropper(page, '#ic-pan')
  // 高位舞台下裁剪框左右各留 ~49px、上下仅 ~13px——从左侧空白带起拖才是平移（顶部会落进框内）
  const sx = start.stage.left + 12
  const sy = start.stage.top + start.stage.height / 2
  // 拖拽必须留在视口内：越过窗口边界后 Firefox 送来的 pointermove 坐标是无效值
  // （实测 clientX=0 / clientY=-85），位移会跳到负方向——这是指针工具的投递限制，不是平移语义。
  const viewportH = page.viewportSize()!.height
  const dy = Math.min(600, Math.floor(viewportH - sy - 8))
  expect(dy, '前置：视口内还有足够下拖空间把图片拖到纵向边界').toBeGreaterThan(start.stage.height / 2)
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx, sy + dy, { steps: 8 })
  await page.mouse.up()
  const dragged = await readCropper(page, '#ic-pan')
  expect(dragged.offset.y, '前置：向下拖动确实平移了图片（位移增大）').toBeGreaterThan(start.offset.y)

  // 压回原高度 → ResizeObserver 回调：帧变矮、可行区间收窄
  await tallStyle.evaluate((el) => (el as Element).remove())
  await page.waitForFunction(
    () => {
      const stage = document.querySelector('#ic-pan')!.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!
      return stage.getBoundingClientRect().height < 400
    },
    { timeout: 5000 },
  )
  // RO 回调在布局之后异步到达：用 poll 等位移落定（回归时这里会超时并报同一句话）
  await expect
    .poll(async () => (await readCropper(page, '#ic-pan')).offset.y, {
      message: '尺寸变小后位移必须被钳回（不得沿用旧区间）',
      timeout: 5000,
    })
    .toBeLessThan(dragged.offset.y)
  const resized = await readCropper(page, '#ic-pan')
  // 用户可见口径：图片矩形仍完整包住裁剪框（框内不露舞台底色）
  expect(resized.img.top, '裁剪框顶部不得露出舞台底色').toBeLessThanOrEqual(resized.frame.top + 0.5)
  expect(resized.img.bottom).toBeGreaterThanOrEqual(resized.frame.bottom - 0.5)
  expect(resized.img.left).toBeLessThanOrEqual(resized.frame.left + 0.5)
  expect(resized.img.right).toBeGreaterThanOrEqual(resized.frame.right - 0.5)
})

// 回归（本批修复）：任意旋转角的 cover 适配比——倾斜矩形必须真覆盖舞台与裁剪框。
// 判据用几何真值（把裁剪框/舞台四角反旋回图片局部坐标，与绘制尺寸比较），不能用
// 「图片包围盒 ⊇ 舞台」：倾斜矩形的包围盒比矩形本身大，45° 下包围盒等于舞台时舞台四角
// 其实远在图片外（修复前实测绘制尺寸 387.9×290.9，比舞台 480×320 还小，整圈露舞台底色）。
test('image-cropper：rotate(45°) 后裁剪框四角与舞台四角都落在旋转后的图片内', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-free')
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-free')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('#ic-free') as HTMLElement & { rotate(delta: number): void }
    el.rotate(45)
  })
  const state = await page.evaluate(() => {
    const el = document.querySelector('#ic-free') as HTMLElement & {
      rotation: number
      offset: { x: number; y: number }
    }
    el.scrollIntoView({ block: 'center', behavior: 'instant' })
    const root = el.shadowRoot!
    const stage = root.querySelector<HTMLElement>('[part="stage"]')!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    const img = root.querySelector<HTMLImageElement>('[part="image"]')!
    const box = (node: HTMLElement) => {
      const r = node.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
    }
    const drawW = Number.parseFloat(img.style.width)
    const drawH = Number.parseFloat(img.style.height)
    // 旋转不改元素中心：轴对齐包围盒的中心即旋转后矩形的中心
    const ib = box(img)
    const cx = ib.left + ib.width / 2
    const cy = ib.top + ib.height / 2
    const rad = (el.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const covered = (px: number, py: number): boolean => {
      const dx = px - cx
      const dy = py - cy
      const u = dx * cos + dy * sin
      const v = -dx * sin + dy * cos
      return Math.abs(u) <= drawW / 2 + 0.5 && Math.abs(v) <= drawH / 2 + 0.5
    }
    const fb = box(frame)
    const sb = box(stage)
    const frameCorners: Array<[number, number]> = [
      [fb.left, fb.top],
      [fb.right, fb.top],
      [fb.left, fb.bottom],
      [fb.right, fb.bottom],
    ]
    const stageCorners: Array<[number, number]> = [
      [sb.left, sb.top],
      [sb.right, sb.top],
      [sb.left, sb.bottom],
      [sb.right, sb.bottom],
    ]
    return {
      rotation: el.rotation,
      drawW,
      drawH,
      frameCovered: frameCorners.every(([x, y]) => covered(x, y)),
      stageCovered: stageCorners.every(([x, y]) => covered(x, y)),
    }
  })
  expect(state.rotation, '前置：旋转到 45°').toBe(45)
  expect(state.frameCovered, '裁剪框四角必须在图片内（不得露舞台底色）').toBe(true)
  expect(state.stageCovered, '舞台四角必须在图片内（恒 cover 舞台）').toBe(true)
  // 反证公式方向：包围盒口径在该角度只给 ~0.485 的适配比（绘制宽 < 舞台宽），覆盖口径必须更大
  expect(state.drawW, '倾斜角下绘制宽必须覆盖舞台宽').toBeGreaterThan(480)
})
