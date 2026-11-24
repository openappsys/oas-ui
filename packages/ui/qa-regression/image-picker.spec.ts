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

// EXIF 方向回归（真实浏览器）：构造带 EXIF Orientation 1-8 的 JPEG（canvas 八色格 + 手工 APP1），
// 断言压缩输出的**像素方向正确**（此前 canvas 矩阵二次施加把 2-8 方向写坏——机制单测走不到
// 真实解码路径，只有这里能锁）+ 元信息 orientation/尺寸正确。
const CELL_COLORS: Array<[number, number, number]> = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [0, 255, 255],
  [255, 0, 255],
  [0, 0, 0],
  [255, 255, 255],
]

test('image-picker compress EXIF：8 方向 JPEG 压缩输出像素正立、元信息报告方向与尺寸', async ({ page }) => {
  await page.goto('/components/image-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ip-compress')

  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // 页面内 canvas 构造：160×80 正立八色格 → 按 EXIF 语义变换成存储像素 → JPEG 编码 → 插 APP1
    const base64 = await page.evaluate((o) => {
      const UW = 160
      const UH = 80
      const CELL = 40
      const COLORS: Array<[number, number, number]> = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [0, 255, 255],
        [255, 0, 255],
        [0, 0, 0],
        [255, 255, 255],
      ]
      const u = document.createElement('canvas')
      u.width = UW
      u.height = UH
      const uc = u.getContext('2d')!
      COLORS.forEach((c, i) => {
        uc.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
        uc.fillRect((i % 4) * CELL, Math.floor(i / 4) * CELL, CELL, CELL)
      })
      const swap = o >= 5
      const s = document.createElement('canvas')
      s.width = swap ? UH : UW
      s.height = swap ? UW : UH
      const sc = s.getContext('2d')!
      const uImg = uc.getImageData(0, 0, UW, UH)
      const sImg = sc.createImageData(s.width, s.height)
      const pick = (x: number, y: number): [number, number, number] => {
        const i = (y * UW + x) * 4
        return [uImg.data[i]!, uImg.data[i + 1]!, uImg.data[i + 2]!]
      }
      const W = s.width
      const H = s.height
      for (let sy = 0; sy < H; sy++) {
        for (let sx = 0; sx < W; sx++) {
          // D(o)：存储像素 (sx,sy) 在正立显示中的落点（EXIF 方向语义）
          let dx: number
          let dy: number
          switch (o) {
            case 2:
              dx = W - 1 - sx
              dy = sy
              break
            case 3:
              dx = W - 1 - sx
              dy = H - 1 - sy
              break
            case 4:
              dx = sx
              dy = H - 1 - sy
              break
            case 5:
              dx = sy
              dy = sx
              break
            case 6:
              dx = H - 1 - sy
              dy = sx
              break
            case 7:
              dx = H - 1 - sy
              dy = W - 1 - sx
              break
            case 8:
              dx = sy
              dy = W - 1 - sx
              break
            default:
              dx = sx
              dy = sy
          }
          const [r, g, b] = pick(dx, dy)
          const di = (sy * W + sx) * 4
          sImg.data[di] = r
          sImg.data[di + 1] = g
          sImg.data[di + 2] = b
          sImg.data[di + 3] = 255
        }
      }
      sc.putImageData(sImg, 0, 0)
      return new Promise<string>((resolve) => {
        s.toBlob(
          async (blob) => {
            const raw = new Uint8Array(await blob!.arrayBuffer())
            // 手工 EXIF APP1：JPEG FFD8 + [FFE1 len "Exif\0\0" TIFF(MM, IFD0 只含 Orientation)]
            const exif = new Uint8Array(30)
            exif.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 0) // "Exif\0\0"
            exif.set([0x4d, 0x4d], 6) // MM 大端
            exif.set([0x00, 0x2a], 8) // 魔数 0x002A
            exif.set([0, 0, 0, 8], 10) // IFD0 偏移 8
            exif.set([0, 1], 14) // IFD0 条目数 1
            exif.set([0x01, 0x12], 16) // tag Orientation
            exif.set([0x00, 0x03], 18) // type SHORT
            exif.set([0, 0, 0, 1], 20) // count 1
            exif.set([0x00, o], 24) // value（大端短整型）
            exif.set([0, 0, 0, 0], 26) // 下一 IFD 0
            const segLen = exif.length + 2
            const out = new Uint8Array(4 + segLen + raw.length - 2)
            out[0] = 0xff
            out[1] = 0xd8
            out[2] = 0xff
            out[3] = 0xe1
            out[4] = segLen >> 8
            out[5] = segLen & 0xff
            out.set(exif, 6)
            out.set(raw.subarray(2), 6 + exif.length)
            let bin = ''
            for (const byte of out) bin += String.fromCharCode(byte)
            resolve(btoa(bin))
          },
          'image/jpeg',
          0.9,
        )
      })
    }, orientation)

    const buffer = Buffer.from(base64, 'base64')
    await page.evaluate(() => {
      const host = document.querySelector('#ip-compress')!
      const w = window as unknown as { __exifDetail?: { compressed: Array<Record<string, number>>; files: File[] } }
      host.addEventListener(
        'oas-change',
        (e) => {
          const d = (e as CustomEvent).detail
          w.__exifDetail = { compressed: d.compressed, files: d.files }
        },
        { once: true },
      )
    })
    await page
      .locator('#ip-compress input[type="file"]')
      .setInputFiles([{ name: `photo-${orientation}.jpg`, mimeType: 'image/jpeg', buffer }])
    await page.waitForFunction(() => !!(window as unknown as { __exifDetail?: unknown }).__exifDetail, {
      timeout: 10000,
    })

    // 元信息：orientation = 源文件方向标记；尺寸 = 正立尺寸（浏览器解码已转正），未缩放。
    // 读最后一条（demo 每轮选 1 张、轮间清空，末位即本轮文件）
    const meta = await page.evaluate(() => {
      const d = (window as unknown as { __exifDetail: { compressed: Array<Record<string, number>> } }).__exifDetail
      const m = d.compressed[d.compressed.length - 1]!
      return { orientation: m.orientation, ow: m.originalWidth, oh: m.originalHeight, w: m.width, h: m.height }
    })
    expect(meta.orientation, `方向 ${orientation}：元信息报告源文件方向标记`).toBe(orientation)
    expect(meta.ow, `方向 ${orientation}：原尺寸宽 = 正立宽`).toBe(160)
    expect(meta.oh, `方向 ${orientation}：原尺寸高 = 正立高`).toBe(80)
    expect(meta.w, `方向 ${orientation}：输出宽`).toBe(160)
    expect(meta.h, `方向 ${orientation}：输出高`).toBe(80)

    // 像素方向：压缩输出解码后逐色块比对 —— 必须还原成正立八色格顺序（0..7）
    const cells = await page.evaluate(() => {
      const COLORS: Array<[number, number, number]> = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [0, 255, 255],
        [255, 0, 255],
        [0, 0, 0],
        [255, 255, 255],
      ]
      const CELL = 40
      const files = (window as unknown as { __exifDetail: { files: File[] } }).__exifDetail.files
      const file = files[files.length - 1]!
      const url = URL.createObjectURL(file)
      return new Promise<number[]>((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const cx = c.getContext('2d')!
          cx.drawImage(img, 0, 0)
          const data = cx.getImageData(0, 0, c.width, c.height).data
          URL.revokeObjectURL(url)
          const out: number[] = []
          for (let i = 0; i < 8; i++) {
            const x = (i % 4) * CELL + CELL / 2
            const y = Math.floor(i / 4) * CELL + CELL / 2
            const idx = (y * c.width + x) * 4
            const r = data[idx]!
            const g = data[idx + 1]!
            const b = data[idx + 2]!
            let best = 0
            let bestDist = Infinity
            COLORS.forEach((cc, ci) => {
              const dist = (r - cc[0]) ** 2 + (g - cc[1]) ** 2 + (b - cc[2]) ** 2
              if (dist < bestDist) {
                bestDist = dist
                best = ci
              }
            })
            out.push(best)
          }
          resolve(out)
        }
        img.src = url
      })
    })
    expect(cells, `方向 ${orientation}：压缩输出像素按正立八色格顺序（此前二次转正会打乱）`).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ])
    // 重置事件捕获并清空列表（demo max=4，轮间清空防越限；clear 的 oas-change 无监听消费）
    await page.evaluate(() => {
      delete (window as unknown as { __exifDetail?: unknown }).__exifDetail
      ;(document.querySelector('#ip-compress') as unknown as { clear: () => void }).clear()
    })
  }
})
