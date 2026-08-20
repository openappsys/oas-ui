# Upload 上传

点击或拖拽选择文件，展示文件列表与上传进度。

## 基础用法

<DemoBlock title="基础（选择文件）">
  <oas-upload></oas-upload>
</DemoBlock>

## 多选与数量限制

<DemoBlock title="多选 + max">
  <oas-upload multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

`max` 限制最多可选文件数，`accept` 过滤文件类型；超出 `max` 的文件被拒绝并派发 `oas-exceed`。

## 自动上传

<DemoBlock title="自动上传（模拟进度）">
  <oas-upload auto-upload multiple></oas-upload>
</DemoBlock>

`auto-upload` 时添加文件即自动模拟上传进度，进度条复用 `oas-progress`。

## 拖拽上传

<DemoBlock title="拖拽上传">
  <oas-upload id="upload-drag" multiple auto-upload></oas-upload>
</DemoBlock>

将文件直接拖入虚线区域，松开即添加（支持多选）；拖入时区域高亮提示。`disabled` 时拖拽会显示禁止光标且不接收文件。

## 照片墙

`list-type` 控制列表样式：`list`（默认，文本行）、`picture`（列表带小缩略图）、`picture-card`（卡片缩略图墙）。

### picture-card 卡片墙

<DemoBlock title="照片墙（picture-card）">
  <oas-upload id="upload-wall" list-type="picture-card" multiple max="4" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

图片文件显示缩略图（`URL.createObjectURL`），非图片显示文件图标与文件名；点击缩略图打开预览浮层（Esc 或点击遮罩关闭），右上角 × 删除，hover 卡片出现预览/删除操作区。

### 删除、预览与超限拦截

<DemoBlock title="照片墙 · 删除/预览/超限">
  <oas-upload id="upload-wall-exceed" list-type="picture-card" multiple max="3" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

选择/拖入第 4 张时被 `max="3"` 拦截，触发 `oas-exceed` 弹出警告；点击缩略图触发 `oas-preview`。

### picture 列表带缩略图

<DemoBlock title="列表带小缩略图（picture）">
  <oas-upload list-type="picture" multiple auto-upload></oas-upload>
</DemoBlock>

### 已达上限

<DemoBlock title="已达 max 上限（预置满 3 张）">
  <oas-upload id="upload-full" list-type="picture-card" multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

预置满 `max="3"` 后继续选择会被 `oas-exceed` 拦截。

## 禁用

<DemoBlock title="禁用">
  <oas-upload disabled></oas-upload>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-upload id="upload-event" multiple></oas-upload>
  <span id="upload-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

监听 `oas-change` / `oas-remove` / `oas-upload`：

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  const el = document.getElementById('upload-event')
  const out = document.getElementById('upload-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.files.length} 个文件`
  })
  el?.addEventListener('oas-remove', () => {
    out.textContent = `oas-remove`
  })
  el?.addEventListener('oas-upload', (e) => {
    out.textContent = `oas-upload: ${e.detail.file.name} ${e.detail.percent}%`
  })

  // 照片墙：超限拦截 + 预览反馈
  const wall = document.getElementById('upload-wall-exceed')
  wall?.addEventListener('oas-exceed', (e) => {
    message.warning(`最多上传 ${e.detail.max} 个文件`)
  })
  wall?.addEventListener('oas-preview', (e) => {
    message.info(`预览：${e.detail.file.name}`)
  })

  // 已达上限演示：预置 3 张 SVG 图片（占满 max="3"）
  const full = document.getElementById('upload-full')
  if (full) {
    const photo = (i) =>
      new File(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#4d9fff"/></linearGradient></defs><rect width="200" height="200" rx="12" fill="url(#g)" opacity="0.92"/><text x="100" y="122" font-size="76" font-family="sans-serif" fill="#ffffff" text-anchor="middle">${i}</text></svg>`,
        ],
        `photo-${i}.svg`,
        { type: 'image/svg+xml' },
      )
    full.files = [photo(1), photo(2), photo(3)]
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accept` | 接受的文件类型 | `string` | — |
| `auto-upload` | 添加后自动模拟上传 | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `files` | 文件列表（property，`File[]`） | `File[]` | `[]` |
| `list-type` | 列表样式：`list`（默认）/ `picture`（列表带小缩略图）/ `picture-card`（卡片缩略图墙） | `string` | `list` |
| `max` | 最大文件数 | `string` | `0` |
| `multiple` | 多选 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 文件列表变化，`detail: { files }` |
| `oas-exceed` | 添加文件超限被拒绝，`detail: { files, max, total }` |
| `oas-preview` | 打开预览浮层，`detail: { file, url }` |
| `oas-remove` | 移除文件，`detail: { file, index }` |
| `oas-upload` | 上传进度，`detail: { file, percent, status }` |

键盘：拖拽区 `Enter` / `空格` 打开文件选择；删除按钮可聚焦；预览浮层 Esc 关闭。
