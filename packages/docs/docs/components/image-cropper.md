---
description: 图片裁剪：固定/自由比例裁剪框、拖拽平移取景、缩放（滚轮以光标为锚点）、90° 旋转、方向键微调裁剪框，导出 Blob / dataURL，可直接接上传链路（裁剪产物 → File → 上传）。
---

# ImageCropper 图片裁剪

在舞台内移动 / 缩放裁剪框、拖拽平移图片取景、缩放与旋转图片，确认后拿到裁剪结果。可独立使用（头像/封面裁剪），也可作为上传链路的前处理：选图 → 裁剪 → 上传。

## 基础用法（自由比例）

拖动裁剪框移动位置，拖四角改变大小；在裁剪框外的舞台区域拖动可平移图片取景；工具栏可放大/缩小、旋转、重置；确认后派发 `oas-crop`。

<DemoBlock title="自由比例（拖动 + 缩放 + 旋转）">
  <oas-image-cropper id="ic-free" src="/assets/demo-wide-1.svg"></oas-image-cropper>
  <p id="ic-free-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">调整后点击「裁剪」</p>
</DemoBlock>

## 图片平移与取景

图片可以拖动平移：在**裁剪框之外**的舞台区域按住拖动（框内拖动仍是移动裁剪框），或用键盘 `Alt` + 方向键（`Shift` 加速 10px）。平移恒受「**图片覆盖裁剪框**」约束——拖出可达范围会被钳回，舞台不会露出底色。

鼠标在舞台内滚动滚轮可按 10% 步进缩放，**以光标位置为锚点**（光标下的图片内容缩放前后停在同一处）；`Ctrl` / `⌘` + 滚轮是浏览器页面缩放手势，组件不接管。缩放滑块与 `+` / `−` 按钮按舞台中心缩放。

<DemoBlock title="拖拽平移 + 滚轮缩放（16:9）">
  <oas-image-cropper id="ic-pan" src="/assets/demo-wide-2.svg" aspect-ratio="16/9"></oas-image-cropper>
  <p id="ic-pan-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">在框外拖动平移图片，滚轮缩放</p>
</DemoBlock>

## 固定比例

`aspect-ratio` 锁定裁剪框比例：缩放窗口时裁剪框按比例适配，拖角保持比例。

<DemoBlock title="aspect-ratio=1（头像方形）">
  <oas-image-cropper id="ic-square" src="/assets/demo-wide-1.svg" aspect-ratio="1"></oas-image-cropper>
  <p id="ic-square-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">1:1</p>
</DemoBlock>

<DemoBlock title="aspect-ratio=16/9（封面比例）">
  <oas-image-cropper src="/assets/demo-wide-1.svg" aspect-ratio="16/9"></oas-image-cropper>
</DemoBlock>

## 输出参数

`max-zoom` 限制放大倍数（滑块与 `+` / `−` 按钮共用上界），`max-output-size` 限制导出图最长边像素，`output-type` 选择导入格式（`image/png` / `image/jpeg` / `image/webp`）。下面的实例：左侧只能放到 2 倍；右侧导出 JPEG 且最长边最多 640px。

<DemoBlock title="max-zoom=2 · max-output-size=640 · output-type=image/jpeg">
  <oas-image-cropper id="ic-zoom" src="/assets/demo-wide-2.svg" max-zoom="2"></oas-image-cropper>
  <oas-image-cropper id="ic-output" src="/assets/demo-wide-2.svg" aspect-ratio="1" max-output-size="640" output-type="image/jpeg"></oas-image-cropper>
  <p id="ic-output-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">点「裁剪」看导出类型与尺寸</p>
</DemoBlock>

## 加载失败

`src` 指向的图片加载不出来时派发 `oas-error`，舞台显示错误文案而不是残留破图。

<DemoBlock title="src 不可用（错误态）">
  <oas-image-cropper id="ic-error" src="/assets/not-found.png"></oas-image-cropper>
  <p id="ic-error-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">等待加载…</p>
</DemoBlock>

## 与上传链路配合

```js
const cropper = document.querySelector('oas-image-cropper')
cropper.addEventListener('oas-crop', async (e) => {
  if (!e.detail.blob) return
  const file = new File([e.detail.blob], 'avatar.png', { type: 'image/png' })
  const form = new FormData()
  form.append('avatar', file)
  await fetch('/api/avatar', { method: 'POST', body: form })
})
```

也可以直接调用方法：`await cropper.toBlob('image/jpeg', 0.9)` / `cropper.toDataURL()`。

## 事件与键盘操作

裁剪框可聚焦：方向键移动 1px，`Shift` + 方向键移动 10px；`Alt` + 方向键平移图片（`Shift` 加速 10px）。缩放滑块与工具栏按钮均为原生控件。

<DemoBlock title="oas-change / oas-crop">
  <oas-image-cropper id="ic-event" src="/assets/demo-wide-2.svg" aspect-ratio="4/3"></oas-image-cropper>
  <p id="ic-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">等待操作…</p>
</DemoBlock>

| 事件 | 时机 | detail |
| --- | --- | --- |
| `oas-change` | 缩放 / 旋转 / 裁剪框调整 / 图片平移后 | `{ zoom, rotation, frame, offset }` |
| `oas-crop` | 点击「裁剪」 | `{ blob, zoom, rotation, frame, offset }`（canvas 不可用时 `blob` 为 null） |
| `oas-load` | 图片加载成功 | `{ width, height }` |
| `oas-error` | 图片加载失败 | `{ src }` |

## 禁用

<DemoBlock title="disabled">
  <oas-image-cropper disabled src="/assets/demo-wide-1.svg"></oas-image-cropper>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const free = document.getElementById('ic-free')
  const freeOut = document.getElementById('ic-free-out')
  free?.addEventListener('oas-crop', (e) => {
    const { blob, frame, zoom, rotation } = e.detail
    const size = blob ? `${Math.round(blob.size / 1024)} KB` : 'blob 不可用'
    log(freeOut, `已裁剪：${Math.round(frame.width)}×${Math.round(frame.height)} 舞台 px，缩放 ${Math.round(zoom * 100)}%，旋转 ${rotation}°，输出 ${size}`)
  })

  const square = document.getElementById('ic-square')
  const squareOut = document.getElementById('ic-square-out')
  square?.addEventListener('oas-crop', (e) => {
    const { blob, frame } = e.detail
    log(squareOut, `已裁剪 1:1：${Math.round(frame.width)}×${Math.round(frame.height)}，输出 ${blob ? `${Math.round(blob.size / 1024)} KB` : 'blob 不可用'}`)
  })

  const ev = document.getElementById('ic-event')
  const evOut = document.getElementById('ic-event-out')
  ev?.addEventListener('oas-change', (e) => {
    const { zoom, rotation, frame } = e.detail
    log(evOut, `oas-change：缩放 ${Math.round(zoom * 100)}%，旋转 ${rotation}°，裁剪框 ${Math.round(frame.width)}×${Math.round(frame.height)}`)
  })
  ev?.addEventListener('oas-crop', (e) => log(evOut, `oas-crop：${e.detail.blob ? '已生成 Blob' : 'blob 不可用'}`))

  // 输出参数：导出类型与像素尺寸
  const output = document.getElementById('ic-output')
  const outputOut = document.getElementById('ic-output-out')
  output?.addEventListener('oas-crop', (e) => {
    const { blob, frame } = e.detail
    const size = blob ? `${blob.type || '未知类型'} · ${Math.round(blob.size / 1024)} KB` : 'blob 不可用'
    log(outputOut, `导出 ${size}（裁剪框 ${Math.round(frame.width)}×${Math.round(frame.height)} 舞台 px）`)
  })

  // 加载失败态
  const err = document.getElementById('ic-error')
  const errOut = document.getElementById('ic-error-out')
  err?.addEventListener('oas-error', (e) => log(errOut, `oas-error：${e.detail.src} 加载失败`))
  err?.addEventListener('oas-load', (e) => log(errOut, `oas-load：${e.detail.width}×${e.detail.height}`))

  // 平移取景：框外拖动图片 / 滚轮以光标为锚点缩放
  const pan = document.getElementById('ic-pan')
  const panOut = document.getElementById('ic-pan-out')
  pan?.addEventListener('oas-change', (e) => {
    const { zoom, offset } = e.detail
    log(
      panOut,
      `图片位移 x ${Math.round(offset.x)}px / y ${Math.round(offset.y)}px，缩放 ${Math.round(zoom * 100)}%（拖到边界会自动钳回）`,
    )
  })
})
</script>

## API

### oas-image-cropper

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aspect-ratio` | 裁剪框比例：`1` / `16/9` / `0.75` 等；缺省或 0 为自由比例 | `string` | — |
| `disabled` | 禁用全部交互（工具栏禁用、裁剪框不可聚焦） | `boolean` | — |
| `max-output-size` | 输出最长边像素上限（默认 1024）；非法值回落 | `string` | — |
| `max-zoom` | 最大缩放倍数（默认 3）；非法值回落 | `string` | — |
| `output-type` | 输出图片类型，默认 `image/png`（可选 `image/jpeg` / `image/webp`） | `string` | `image/png` |
| `src` | 图片地址（`http(s)` / `blob:` / `data:image/*` / 相对路径；可执行协议回落空） | `string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `offset` | 当前图片位移 `{ x, y }`（相对舞台居中的像素偏移，只读；已按「图片覆盖裁剪框」约束钳制） | `CropOffset` | — |
| `rotation` | 当前旋转角度（0 / 90 / 180 / 270，只读） | `number` | `0` |
| `zoom` | 当前缩放（1 起）。写入即生效但**不派发事件**——`oas-change` 只表达用户交互，宿主在事件里回写 `el.zoom` 不会递归 | `number` | `1` |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `setZoom` | `setZoom(value: number): void` | 设置缩放（夹到 `[1, max-zoom]`；值有变化才派发 `oas-change`） |
| `rotate` | `rotate(delta: number): void` | 旋转指定角度（默认 +90° 并派发 `oas-change`） |
| `reset` | `reset(): void` | 恢复初始缩放 / 旋转 / 图片位移 / 裁剪框（派发 `oas-change`） |
| `toBlob` | `toBlob(type?: string, quality?: number): Promise<Blob \| null>` | 导出裁剪结果 Blob（canvas 不可用时返回 null） |
| `toDataURL` | `toDataURL(type?: string, quality?: number): string` | 导出裁剪结果 dataURL（canvas 不可用时返回空串） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 缩放 / 旋转 / 裁剪框调整 / 图片平移后派发，`detail: { zoom, rotation, frame, offset }` |
| `oas-crop` | 确认裁剪，`detail: { blob, zoom, rotation, frame, offset }`；canvas 不可用时 `blob` 为 null |
| `oas-error` | 图片加载失败，`detail: { src }` |
| `oas-load` | 图片加载成功，`detail: { width, height }` |
