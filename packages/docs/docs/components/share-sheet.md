---
description: 底部弹出的分享面板，宫格渠道 + 取消/关闭，点击渠道派发 oas-select 后自动关闭，支持标题与取消文案覆盖
---

# ShareSheet 分享面板

底部升起的分享面板：标题 + 宫格渠道 + 取消按钮。渠道由 `channels` JSON 声明（`[{ key, name, icon? }]`），`icon` 为 `oas-icon` 图标名（内置或宿主注册）；点击渠道派发 `oas-select` 后自动关闭。

- `open` 属性受控；`show()` / `close()` 命令式开关
- 标题 / 取消 / 关闭按钮文案走 i18n，可用 `heading` / `cancel-text` 覆盖
- 打开时焦点进入首个渠道，Tab 在面板内循环，Esc 关闭，关闭后焦点回到打开前的元素
- `role="dialog"` + `aria-modal="true"`，标题作为可读名称

## 基础用法

<DemoBlock title="点击按钮打开（含渠道点击 / 关闭反馈）">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="ss-open">打开分享面板</oas-button>
      <span id="ss-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">尚未选择渠道</span>
    </div>
    <oas-share-sheet
      id="ss-demo"
      heading="分享到"
      channels='[{"key":"copy","name":"复制链接","icon":"copy"},{"key":"mail","name":"邮件","icon":"mail"},{"key":"star","name":"收藏","icon":"star"},{"key":"download","name":"下载","icon":"download"},{"key":"more","name":"更多","icon":"more"}]'
    ></oas-share-sheet>
  </div>
</DemoBlock>

## 自定义标题与取消文案

<DemoBlock title="heading / cancel-text 覆盖">
  <oas-share-sheet
    id="ss-custom"
    heading="发给好友"
    cancel-text="算了"
    channels='[{"key":"copy","name":"复制链接","icon":"copy"},{"key":"mail","name":"邮件","icon":"mail"}]'
  ></oas-share-sheet>
  <oas-button id="ss-custom-open" size="small">打开自定义面板</oas-button>
</DemoBlock>

## 无图标渠道

渠道缺少 `icon` 时用名称首字符占位，便于宿主接入未注册图标的渠道：

<DemoBlock title="icon 缺省 → 首字符占位">
  <oas-share-sheet
    id="ss-fallback"
    heading="更多渠道"
    channels='[{"key":"a","name":"微信"},{"key":"b","name":"微博"},{"key":"c","name":"邮件"}]'
  ></oas-share-sheet>
  <oas-button id="ss-fallback-open" size="small">打开无图标面板</oas-button>
</DemoBlock>

## 事件

`oas-select`（detail `{ key, name, channel }`）在点击渠道时派发；`oas-close`（detail `{ reason, key? }`）在关闭时派发，reason 可能是 `select` / `cancel` / `close` / `backdrop` / `esc` / `api`。

```js
sheet.addEventListener('oas-select', (e) => console.info(e.detail.key))
sheet.addEventListener('oas-close', (e) => console.info(e.detail.reason))
```

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-share-sheet').then(() => {
    const output = document.querySelector('#ss-output')
    const demo = document.querySelector('#ss-demo')
    document.querySelector('#ss-open')?.addEventListener('click', () => demo?.show())
    demo?.addEventListener('oas-select', (event) => {
      if (output) output.textContent = `已选择：${event.detail.name}（key: ${event.detail.key}），面板已自动关闭`
    })
    demo?.addEventListener('oas-close', (event) => {
      if (output && event.detail.reason !== 'select') output.textContent = `面板关闭：${event.detail.reason}`
    })
    document.querySelector('#ss-custom-open')?.addEventListener('click', () => document.querySelector('#ss-custom')?.show())
    document.querySelector('#ss-fallback-open')?.addEventListener('click', () => document.querySelector('#ss-fallback')?.show())
  })
})
</script>

## API

### oas-share-sheet

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cancel-text` | 取消按钮文案；缺省走 i18n `shareSheet.cancel` | `string` | — |
| `channels` | 渠道 JSON 数组 `[{ key, name, icon? }]`：`icon` 为 `oas-icon` 图标名，缺省用名称首字符占位；非法 JSON 忽略并 dev 告警一次 | `ShareSheetChannel[] \| string` | — |
| `heading` | 面板标题；缺省走 i18n `shareSheet.title` | `string` | — |
| `open` | 受控显隐（在场=展开；宿主直接写入静默） | — | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `channels` | 渠道列表（property 通道）：等价 channels 属性的解析结果；赋数组时自动序列化反射回属性 | `ShareSheetChannel[] \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `show` | `show(): void` | 展开面板（写入 `open` 属性） |
| `close` | `close(reason: CloseReason): void` | 收起面板并派发 `oas-close`（reason 默认 `api`） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 关闭时派发（reason: select / cancel / close / backdrop / esc / api），`detail: key === undefined ? { reason } : { reason, key }` |
| `oas-select` | 点击渠道时派发，随后自动关闭，`detail: { key: channel.key, name: channel.name, channel }` |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-share-sheet-bg` | 面板背景 | `var(--oas-color-bg)` |
| `--oas-share-sheet-channel-bg` | 渠道图标底色 | `var(--oas-color-bg-elevated)` |
| `--oas-share-sheet-channel-color` | 渠道图标前景色 | `var(--oas-color-text-primary)` |
| `--oas-share-sheet-color` | 面板文字色 | `var(--oas-color-text-primary)` |
| `--oas-share-sheet-columns` | 宫格列数 | `4` |
| `--oas-share-sheet-mask` | 遮罩颜色 | `var(--oas-color-overlay)` |
| `--oas-share-sheet-max-height` | 面板最大高度 | `80vh` |
