# Attachment 附件

会话附件行：媒体（图标/缩略图）+ 文件名/元数据 + 上传状态机 + 操作（下载/删除/整卡触发器）。用于聊天发文件、AI 对话传图、客服工单附件等场景。

## 基础用法

<DemoBlock title="基础附件行">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-attachment name="quarterly-report.pdf" detail="PDF · 2.4 MB"></oas-attachment>
    <oas-attachment name="design-spec.md" detail="Markdown · 18 KB" downloadable></oas-attachment>
  </div>
</DemoBlock>

`name` 文件名 + `detail` 次级元数据（类型 · 大小）；`downloadable` 在场显示内置下载按钮（点击派发 `oas-download`，下载动作由宿主接管）。

## 上传状态机（state）

<DemoBlock title="idle / uploading / processing / error / done">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-attachment name="demo.mp4" detail="视频 · 48 MB" state="uploading" progress="62"></oas-attachment>
    <oas-attachment name="photo.png" detail="图片 · 3.1 MB" state="processing"></oas-attachment>
    <oas-attachment name="backup.zip" detail="压缩包 · 210 MB" state="error"></oas-attachment>
    <oas-attachment name="contract.pdf" detail="PDF · 860 KB" state="done" removable></oas-attachment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    `uploading`/`processing` 反射 <code>aria-busy</code> 并显示 spinner；`uploading` 渲染底部细进度条（<code>progress</code> 0–100，越界自动收敛）；`error` 缺省 <code>detail</code> 时显示 locale 错误文案（「上传失败」），显式给 <code>detail</code> 则保留宿主文案。
  </p>
</DemoBlock>

状态词表与 `oas-upload` 一致（库内统一）；`removable` 在场显示删除按钮（点击派发 `oas-remove`，默认不自移除——删除决策在宿主）。

## 尺寸（size）

<DemoBlock title="default / sm / xs">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-attachment name="presentation.key" detail="Keynote · 24 MB"></oas-attachment>
    <oas-attachment name="presentation.key" detail="Keynote · 24 MB" size="sm"></oas-attachment>
    <oas-attachment name="presentation.key" detail="Keynote · 24 MB" size="xs"></oas-attachment>
  </div>
</DemoBlock>

三档 `size`：`default` / `sm`（接受 `small` 别名）/ `xs`，逐档收内边距与媒体尺寸。

## 竖排与缩略图（orientation / 媒体槽）

<DemoBlock title="vertical + slot=media 缩略图">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <oas-attachment name="cover.png" detail="PNG · 1.2 MB" orientation="vertical">
      <svg slot="media" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="封面缩略图">
        <rect width="64" height="64" rx="8" fill="var(--oas-color-bg-hover)"/>
        <circle cx="24" cy="24" r="8" fill="var(--oas-color-primary)"/>
        <path d="M8 52 L26 34 L38 46 L48 38 L56 46" stroke="var(--oas-color-text-secondary)" stroke-width="3" fill="none" stroke-linejoin="round"/>
      </svg>
    </oas-attachment>
    <oas-attachment name="backup.zip" detail="ZIP · 210 MB" orientation="vertical" state="error"></oas-attachment>
  </div>
</DemoBlock>

`orientation="vertical"` 图上文下（窄栏/卡片场景）；`slot="media"` 放缩略图（任意 `<img>`/`<svg>`，最大 64px）即覆盖缺省图形，不放则渲染内置文件图形（纯装饰 `aria-hidden`）——媒体形态由「插槽有无内容」天然决定，无形态属性。

## 整卡触发器（href）

<DemoBlock title="href + oas-open 事件反馈">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-attachment id="att-open-demo" name="shared-doc.pdf" detail="PDF · 640 KB" href="#"></oas-attachment>
    <p id="att-open-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击上方附件卡触发 oas-open（demo 阻断导航并显示反馈）。</p>
  </div>
</DemoBlock>

有 `href` 时整卡变 `<a part="trigger">`，点击派发 `oas-open`（detail `{ href }`）；宿主在事件里 `preventDefault` 可接管打开方式（预览/新窗口），组件会同步阻断默认导航。

## 操作与事件反馈

<DemoBlock title="removable / downloadable / slot=actions">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-attachment id="att-remove-demo" name="draft-v1.docx" detail="Word · 92 KB" removable downloadable>
      <oas-button slot="actions" size="small" type="text">转发</oas-button>
    </oas-attachment>
    <p id="att-remove-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点删除/下载按钮，此处显示收到的事件。</p>
  </div>
</DemoBlock>

内置删除/下载按钮的可读名称包含文件名（如「移除 draft-v1.docx」——只读「删除」屏幕阅读器无法区分目标）；`slot="actions"` 追加自定义操作（组件不管具体动作，事件由插槽内组件派发）。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  const open = document.querySelector('#att-open-demo')
  open?.addEventListener('oas-open', (e) => {
    e.preventDefault()
    message.info('打开附件：' + e.detail.href)
  })
  const row = document.querySelector('#att-remove-demo')
  row?.addEventListener('oas-remove', () => message.success('收到 oas-remove（宿主决定是否移除）'))
  row?.addEventListener('oas-download', () => message.success('收到 oas-download'))
})
</script>

## 无障碍

- 进行中态反射 `aria-busy`；进度条 `role="progressbar"` 带 min/max/now 三值。
- 仅图标操作按钮的 `aria-label` 含目标文件名（不只「删除」）；装饰图形一律 `aria-hidden`。
- error 态用色 + 文案双重传达（不单靠颜色）；`slot="media"` 放真实缩略图时请自带可读名称（`alt`/`aria-label`）。

## API

### oas-attachment

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `detail` | 次级元数据（类型 · 大小）；error 态缺省时显示 locale 错误文案（「上传失败」），显式给值则保留宿主文案 | — | — |
| `downloadable` | 布尔在场：显示内置下载按钮（点击派发 oas-download，下载动作由宿主接管） | `boolean` | — |
| `href` | 有值则整卡为可点触发器（a[part=trigger]），点击派发 oas-open；宿主 preventDefault 可接管并阻断默认导航 | — | — |
| `name` | 文件名（title 通道；缺省只渲染 media 不报错） | — | — |
| `orientation` | 排布方向：horizontal（默认）/ vertical（图上文下，窄栏场景） | — | — |
| `progress` | 上传进度 0–100（越界自动收敛到 0/100；仅 uploading 态渲染底部细进度条 role=progressbar） | — | — |
| `removable` | 布尔在场：显示内置删除按钮（点击派发 oas-remove；组件默认不自移除，删除决策在宿主） | `boolean` | — |
| `size` | 三档尺寸：default（默认）/ sm（接受 small 别名）/ xs，逐档收内边距与媒体 | — | — |
| `state` | 上传状态机：idle / uploading / processing / error / done（默认 done；词表与 oas-upload 一致；uploading/processing 反射 aria-busy） | `string` | `done` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-download` | 点击内置下载按钮时派发，detail { name } |
| `oas-open` | 点击 href 整卡触发器时派发，detail { href }；cancelable——宿主 preventDefault 后组件同步阻断链接默认导航 |
| `oas-remove` | 点击内置删除按钮时派发，detail { name }；默认不自移除 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 追加自定义操作区（内置下载/删除按钮之后） |
| `media` | 媒体槽（图标/缩略图），放内容即覆盖内置缺省图形 |

部件：`::part(attachment)` 根、`::part(trigger)` 触发器、`::part(media)` / `::part(title)` / `::part(description)` / `::part(spinner)` / `::part(progress)` / `::part(actions)` / `::part(download)` / `::part(remove)`。
