---
description: 图片裁剪：固定/自由比例裁剪框、缩放、90° 旋转、方向键微调裁剪框，导出 Blob / dataURL，可直接接上传链路（裁剪产物 → File → 上传）。
---

# ImageCropper 图片裁剪

在舞台内拖动、缩放、旋转图片并调整裁剪框，确认后拿到裁剪结果。可独立使用（头像/封面裁剪），也可作为上传链路的前处理：选图 → 裁剪 → 上传。

## 基础用法（自由比例）

拖动裁剪框移动位置，拖四角改变大小；工具栏可放大/缩小、旋转、重置；确认后派发 `oas-crop`。

<DemoBlock title="自由比例（拖动 + 缩放 + 旋转）">
  <oas-image-cropper id="ic-free" src="/assets/demo-wide-1.svg"></oas-image-cropper>
  <p id="ic-free-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">调整后点击「裁剪」</p>
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

裁剪框可聚焦：方向键移动 1px，`Shift` + 方向键移动 10px。缩放滑块与工具栏按钮均为原生控件。

<DemoBlock title="oas-change / oas-crop">
  <oas-image-cropper id="ic-event" src="/assets/demo-wide-2.svg" aspect-ratio="4/3"></oas-image-cropper>
  <p id="ic-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">等待操作…</p>
</DemoBlock>

| 事件 | 时机 | detail |
| --- | --- | --- |
| `oas-change` | 缩放 / 旋转 / 裁剪框调整后 | `{ zoom, rotation, frame }` |
| `oas-crop` | 点击「裁剪」 | `{ blob, zoom, rotation, frame }`（canvas 不可用时 `blob` 为 null） |
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
| `rotation` | 当前旋转角度（0 / 90 / 180 / 270，只读） | `number` | `0` |
| `zoom` | 当前缩放（1 起；写入即生效并派发 `oas-change`） | `number` | `1` |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `setZoom` | `setZoom(value: number): void` | 设置缩放（夹到 `[1, max-zoom]` 并派发 `oas-change`） |
| `rotate` | `rotate(delta: number): void` | 旋转指定角度（默认 +90° 并派发 `oas-change`） |
| `reset` | `reset(): void` | 恢复初始缩放 / 旋转 / 裁剪框（派发 `oas-change`） |
| `toBlob` | `toBlob(type?: string, quality?: number): Promise<Blob \| null>` | 导出裁剪结果 Blob（canvas 不可用时返回 null） |
| `toDataURL` | `toDataURL(type?: string, quality?: number): string` | 导出裁剪结果 dataURL（canvas 不可用时返回空串） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 缩放 / 旋转 / 裁剪框调整后派发，`detail: { zoom, rotation, frame }` |
| `oas-crop` | 确认裁剪，`detail: { blob, zoom, rotation, frame }`；canvas 不可用时 `blob` 为 null |
| `oas-error` | 图片加载失败，`detail: { src }` |
| `oas-load` | 图片加载成功，`detail: { width, height }` |
