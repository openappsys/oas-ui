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
})
</script>

## API

### oas-image-picker

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accept` | 文件类型过滤（原生 `accept` 语法，默认 `image/*`） | `string` | `image/*` |
| `capture` | 透传原生 `capture`：移动端直接拉起相机 | `boolean` | — |
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
