---
description: 多图选择：点击或拖拽选图、缩略图网格预览、前后排序与删除、数量上限（超出派发 exceed-limit），files 以 File[] 交给上传链路。
---

# ImagePicker 图片选择

多图选择器：点击或拖拽选图 → 缩略图网格 → 排序 / 删除，带数量上限。组件不负责上传，`files` 以 `File[]` 形式交给宿主的上传链路。

## 基础用法

<DemoBlock title="max=6">
  <oas-image-picker id="ip-basic" max="6"></oas-image-picker>
  <p id="ip-basic-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">尚未选择图片</p>
</DemoBlock>

点击「添加图片」选择文件，或把图片直接拖到组件区域；每张缩略图下方提供前移 / 删除 / 后移三个操作（键盘可达）。

## 数量上限

超过 `max` 的部分会被丢弃，并派发 `oas-exceed-limit`；达到上限后添加块隐藏，计数显示已选 / 上限。

<DemoBlock title="max=2（尝试选 3 张看超出反馈）">
  <oas-image-picker id="ip-limit" max="2"></oas-image-picker>
  <p id="ip-limit-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">上限 2 张</p>
</DemoBlock>

## 只读与禁用

<DemoBlock title="disabled">
  <oas-image-picker disabled max="4"></oas-image-picker>
</DemoBlock>

<DemoBlock title="readonly（只读预览）">
  <oas-image-picker readonly max="4"></oas-image-picker>
</DemoBlock>

- `disabled`：添加块与排序/删除按钮全部禁用
- `readonly`：隐藏添加入口，操作按钮禁用（用于提交后的回显）

## 文件类型过滤与拍照

`accept` 透传原生类型过滤（扩展名或 MIME，逗号分隔），被过滤掉的文件派发 `oas-reject`；`capture` 在场时移动端直接拉起相机。

<DemoBlock title="accept 只收 .jpg / .jpeg + capture">
  <oas-image-picker id="ip-accept" accept=".jpg,.jpeg" capture max="4"></oas-image-picker>
  <p id="ip-accept-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">试着选一张 PNG：会被拒绝并提示</p>
</DemoBlock>

## 自动压缩与 EXIF 方向（compress）

选图自动压缩（缺省关，开启后仅作用于**用户新选入**的文件；受控 `files` 写入不压缩——宿主给的即最终值）：

- `compress=""`：开启缺省档（quality 0.8 / max-dimension 4096）
- `compress='{"quality":0.8,"max-dimension":1920}'`：JSON 覆盖档位（quality 0–1、最长边像素上限，超出等比缩）
- JPEG / WebP 按档位重编码；PNG 保留透明（无缩放时保留原文件不重编）；GIF / SVG 等不动
- EXIF 方向：现代浏览器解码 `<img>` 已按 EXIF 正立渲染（手机竖拍照片不会躺倒），压缩只做等比缩放、**不做二次转正**；重编码输出正立图（JPEG/WebP/PNG 重编码不携带方向标记）
- 源文件的 EXIF Orientation 以**元信息**上报：`compressed[].orientation`（1 = 无方向标记），宿主可据此区分原始方向标记
- 解码失败 / canvas 不可用：优雅降级保留原文件（元信息位记 null）
- 开启期间 `oas-change` detail 增加 `compressed` 数组（与 `files` 对齐）：每项为 `{ originalWidth, originalHeight, width, height, orientation, quality }`（原尺寸 → 压缩后尺寸）或 `null`（未处理）
- 非法配置 devWarn 一次并按关闭处理（detail 恢复现状，不带 compressed）

<DemoBlock title="compress 自动压缩（选图后看压缩元信息）">
  <oas-image-picker id="ip-compress" compress='{"quality":0.8,"max-dimension":1920}' max="4"></oas-image-picker>
  <p id="ip-compress-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">选一张图后这里显示压缩元信息</p>
</DemoBlock>

## 与上传链路配合

`files` 是 JS property（不反射 attribute），宿主赋值静默生效、不派发事件：表单回显时直接赋值即可。

```js
const picker = document.querySelector('oas-image-picker')
picker.addEventListener('oas-change', async (e) => {
  const form = new FormData()
  for (const file of e.detail.files) form.append('images', file)
  await fetch('/api/upload', { method: 'POST', body: form })
})

// 回显已选图片（例如编辑场景）
picker.files = existingFiles
```

## 事件

| 事件 | 时机 | detail |
| --- | --- | --- |
| `oas-change` | 用户新增 / 删除 / 排序后 | `{ files, count }` |
| `oas-exceed-limit` | 选择总数超过上限（超出部分丢弃；在 `oas-change` 之后派发） | `{ count, max }` |
| `oas-reject` | 文件被 `accept` 过滤 | `{ files }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const basic = document.getElementById('ip-basic')
  const basicOut = document.getElementById('ip-basic-out')
  basic?.addEventListener('oas-change', (e) => {
    const names = e.detail.files.map((f) => f.name)
    log(basicOut, names.length ? `已选 ${names.length} 张：${names.join('、')}` : '尚未选择图片')
  })
  basic?.addEventListener('oas-exceed-limit', (e) => log(basicOut, `超出上限：选了 ${e.detail.count} 张，最多 ${e.detail.max} 张`))
  basic?.addEventListener('oas-reject', (e) => log(basicOut, `已忽略 ${e.detail.files.length} 个非图片文件`))

  const limit = document.getElementById('ip-limit')
  const limitOut = document.getElementById('ip-limit-out')
  limit?.addEventListener('oas-change', (e) => log(limitOut, `已选 ${e.detail.count} / ${limit.getAttribute('max')} 张`))
  limit?.addEventListener('oas-exceed-limit', (e) => log(limitOut, `超出上限（${e.detail.count} 张），只保留前 ${e.detail.max} 张`))

  // 类型过滤：accept=".jpg,.jpeg" 会挡掉其他格式
  const acceptOnly = document.getElementById('ip-accept')
  const acceptOut = document.getElementById('ip-accept-out')
  acceptOnly?.addEventListener('oas-change', (e) => log(acceptOut, `已选 ${e.detail.count} 张 .jpg / .jpeg`))
  acceptOnly?.addEventListener('oas-reject', (e) => log(acceptOut, `已忽略 ${e.detail.files.length} 个非 .jpg / .jpeg 文件`))

  // 自动压缩：oas-change detail.compressed 与 files 对齐（原尺寸 → 压缩后尺寸 / 源文件方向标记）
  const compress = document.getElementById('ip-compress')
  const compressOut = document.getElementById('ip-compress-out')
  compress?.addEventListener('oas-change', (e) => {
    const metas = e.detail.compressed ?? []
    const parts = e.detail.files.map((f, i) => {
      const m = metas[i]
      if (!m) return `${f.name}（未处理）`
      const marked = m.orientation > 1 ? `，源文件带 EXIF ${m.orientation} 方向标记（输出为正立图）` : ''
      return `${f.name}（${m.originalWidth}×${m.originalHeight} → ${m.width}×${m.height}${marked}）`
    })
    log(compressOut, parts.join('；') || '尚未选择图片')
  })
})
</script>

## API

### oas-image-picker

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accept` | 文件类型过滤（原生 `accept` 语法，默认 `image/*`） | `string` | `image/*` |
| `capture` | 透传原生 `capture`：移动端直接拉起相机 | `boolean` | — |
| `compress` | 选图自动压缩（缺省关 = 现状逐字节等价）：空串 = 缺省档（quality 0.8 / max-dimension 4096）；JSON `{"quality":0.8,"max-dimension":1920}` 覆盖档位；非法 devWarn 一次按关闭处理。仅作用于用户新选入文件（受控 files 写入不压缩）；EXIF 方向由浏览器解码正立渲染，压缩输出恒正立并以 orientation 元信息报告源方向标记；开启时 oas-change detail 附 compressed 元信息数组 | `string` | — |
| `disabled` | 禁用：添加、排序、删除全部不可用 | `boolean` | — |
| `max` | 数量上限（默认 9）；非法/非正数回落默认并告警 | `string` | — |
| `readonly` | 只读预览：隐藏添加入口，操作按钮禁用 | `boolean` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `files` | 当前图片列表（`File[]`，受控）：赋值即刷新且不派发事件；用户交互才派发 `oas-change` | `File[]` | `[]` |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `removeAt` | `removeAt(index: number): void` | 删除指定图片（越界忽略，派发 `oas-change`） |
| `move` | `move(index: number, delta: number): void` | 前后移动图片（`delta` 为 ±1，越界忽略，派发 `oas-change`） |
| `open` | `open(): void` | 打开系统文件选择器（需在用户手势中调用） |
| `clear` | `clear(): void` | 清空列表（派发 `oas-change`） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 用户新增 / 删除 / 排序后派发，`detail: { files, count }` |
| `oas-exceed-limit` | 选择总数超过上限，`detail: { count, max }`（超出部分丢弃；在 `oas-change` 之后派发） |
| `oas-reject` | 文件被 `accept` 过滤，`detail: { files }` |
