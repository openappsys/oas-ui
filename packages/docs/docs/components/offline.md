---
description: 断网提示组件，监听 online/offline 事件同步网络状态，断网显示提示条或提示块、恢复后自动消失，首帧按 navigator.onLine 判定不闪
---

# Offline 断网提示

监听浏览器 `online` / `offline` 事件同步网络状态：断网时显示提示，恢复后自动消失。首帧直接按 `navigator.onLine` 决定显隐，不会出现「先显示在线、再切离线」的闪烁。

- `variant="bar"`（默认）固定在视口顶部、铺满宽度；`variant="block"` 跟随文档流
- 文案缺省走 i18n `offline.message`，可用 `message` 覆盖
- 派发 `oas-offline` / `oas-online`（状态真正变化时才派发）
- `role="status"` + `aria-live="polite"`，在线时整体 `display:none` 不残留在可访问性树

## 基础用法

断网提示条默认固定顶部。下面的交互 demo 用 `block` 形态放在文档流里，并临时改写 `navigator.onLine` 模拟断网/恢复：覆写在本次页面会话内一直有效——SPA 内切到其它文档页会**继续显示断网态**（其它示例实例也随之出现），整页刷新（F5）才复原。仅调试演示用，生产环境请直接依赖浏览器真实网络事件。

<DemoBlock title="模拟断网 / 恢复（block 形态）">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-offline id="of-demo" variant="block"></oas-offline>
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="of-off" size="small">模拟断网</oas-button>
      <oas-button id="of-on" size="small">模拟恢复</oas-button>
      <span id="of-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">尚未触发</span>
    </div>
  </div>
</DemoBlock>

## 自定义文案

<DemoBlock title="message 覆盖默认文案">
  <oas-offline variant="block" message="当前无网络，已切换到离线缓存内容"></oas-offline>
</DemoBlock>

上例初始在线不可见；把 DevTools 切到 Offline 或使用上方模拟按钮即可看到文案效果（同一个页面只会显示一条，示例仅展示属性写法）。

## 固定提示条

`variant="bar"` 固定在视口顶部并铺满宽度，适合无导航栏的全屏页：

<DemoBlock title="bar 形态（常驻示例，初始在线不可见）">
  <oas-offline variant="bar" message="网络连接已断开，请检查网络设置"></oas-offline>
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">bar 形态在真实断网时覆盖视口顶部；此处为在线态，故不可见。</p>
</DemoBlock>

## 事件

`oas-offline` / `oas-online` 均为 bubbles + composed，可直接在宿主上监听：

```js
const offline = document.querySelector('oas-offline')
offline.addEventListener('oas-offline', () => console.info('offline'))
offline.addEventListener('oas-online', () => console.info('online'))
```

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-offline').then(() => {
    const demo = document.querySelector('#of-demo')
    const output = document.querySelector('#of-output')
    const setOnline = (value) => {
      if (output) output.textContent = value ? '已模拟恢复在线' : '已模拟断网'
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
      window.dispatchEvent(new Event(value ? 'online' : 'offline'))
    }
    document.querySelector('#of-off')?.addEventListener('click', () => setOnline(false))
    document.querySelector('#of-on')?.addEventListener('click', () => setOnline(true))
    demo?.addEventListener('oas-offline', () => {
      if (output) output.textContent = 'oas-offline 已派发（模拟断网）'
    })
    demo?.addEventListener('oas-online', () => {
      if (output) output.textContent = 'oas-online 已派发（模拟恢复）'
    })
  })
})
</script>

## API

### oas-offline

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `message` | 提示文案覆盖；缺省走 i18n `offline.message` | `string` | — |
| `variant` | 形态：`bar`（默认，固定视口顶部铺满）/ `block`（跟随文档流的提示块） | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-offline` | 进入断网态时派发（状态真正变化才派发） |
| `oas-online` | 网络恢复时派发（状态真正变化才派发） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-offline-bg` | 提示条背景（默认 danger 语义色） | `var(--oas-color-danger)` |
| `--oas-offline-color` | 提示文字色（默认 `--oas-color-text-on-danger`） | `var(--oas-color-text-on-danger)` |
