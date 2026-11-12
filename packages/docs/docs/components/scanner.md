# Scanner 扫码器

调用设备相机实时扫码识别的组件。解码使用浏览器原生 `BarcodeDetector` API（零第三方解码库），环境不支持、权限被拒或相机异常时自动降级为手动输入行，行为确定、可测。

## 基础用法

`active` 是在场布尔属性：置位即请求相机并开始预览识别；移除即停止并关流。真实相机 demo 需要浏览器授权（提示框选「允许」），建议在支持 `BarcodeDetector` 的浏览器（Chrome / Edge / Android WebView 等）打开本页体验。

<DemoBlock title="active 属性驱动（按钮触发，需授权相机）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-button id="scanner-toggle-btn" size="small">启动相机扫描</oas-button>
    <oas-button id="scanner-stop-btn" size="small">停止</oas-button>
    <span id="scanner-toggle-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击「启动相机扫描」请求相机授权并开始预览</span>
  </div>
  <oas-scanner id="scanner-basic" manual style="width: 100%; max-width: 480px; margin-top: var(--oas-space-3)"></oas-scanner>
</DemoBlock>

```js
const el = document.querySelector('oas-scanner')
el.start()   // = setAttribute('active', '')：请求相机并开始预览
el.stop()    // = removeAttribute('active')：停止并关流
```

`start()`/`stop()` 只是 `active` 属性的命令式便捷——状态始终以属性为准，宿主框架（Vue/React）直接绑定属性同样生效。

## 手动输入模式

`manual` 在场时显示手动输入行（label 关联 input，Enter 或按钮均可提交）。它与相机预览互不冲突：可以只开手动（`manual` 单独在场），也可以相机 + 手动并存（如上例）——扫码失败时用户始终有输入途径。

<DemoBlock title="manual 手动输入（不依赖相机，任何环境可用）">
  <oas-scanner id="scanner-manual" manual style="width: 100%; max-width: 480px"></oas-scanner>
  <p id="scanner-manual-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">在上方输入码值（如 <code>OAS-2026-001</code>）后回车或点「确认」——组件派发 oas-scan 并清空输入框。</p>
</DemoBlock>

手动提交与相机识别共享同一幂等契约：同一码值连续提交不重复派发（见下文「识别去重」）。

## 降级链与 oas-error

三类失败自动落手动模式并派发一次 `oas-error`（同一 `code` 每次激活会话只派发一次；`active` 移除再置位视为新会话）：

| `detail.code` | 场景 | 组件行为 |
| --- | --- | --- |
| `not-supported` | 浏览器无原生 `BarcodeDetector`（Firefox 旧版 / iOS Safari / happy-dom 等测试环境），或页面处于非安全上下文（非 HTTPS/localhost，无 `getUserMedia`） | 直接落手动模式，不请求相机 |
| `permission` | `getUserMedia` 权限被用户/系统拒绝（`NotAllowedError` / `SecurityError`） | 落手动模式，状态区提示权限被拒 |
| `camera` | 无摄像头设备、设备占用、`play()` 被拒等其他相机异常 | 落手动模式，状态区提示相机失败 |

<DemoBlock title="oas-error / oas-scan 事件接管">
  <oas-scanner id="scanner-events" manual style="width: 100%; max-width: 480px"></oas-scanner>
  <p id="scanner-events-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">组件派发的 oas-scan / oas-error 会显示在这里。</p>
</DemoBlock>

## 识别去重与节流

- `oas-scan`（detail `{ value, format? }`）幂等：同一 `format+value` 指纹在会话内只派发一次；相机持续对准同一码不会连续触发。`start()`（或 `active` 移除再置位）开启新会话并重置指纹，可强制重扫同一码。
- 命中后抽帧暂停 1200ms 再自动继续（节流）——短暂遮挡或调整角度后无需重启；无命中则每 150ms 抽帧一次（video 帧 → 离屏 canvas → `BarcodeDetector.detect()`）。
- 手动提交派发的 `oas-scan` 省略 `format`；相机命中携带 `BarcodeDetector` 报告的格式名（如 `qr_code`、`ean_13`）。

## 浏览器兼容（边界如实说明）

`BarcodeDetector` 是较新的浏览器原生 API：Chromium 系（Chrome / Edge / Android WebView）与部分平台已支持；Firefox 与 iOS Safari 长期未支持或仅实验性提供。组件按帧特性检测，不支持的环境**不是坏体验**——直接可用手动模式。自研解码算法（纯 TS 软解码）不在本期范围，此为文档明示边界：需要全浏览器覆盖扫码能力的宿主，请自行接入第三方解码库并经 `oas-scan` 同款事件协议桥接。

## 无障碍

- 视频区域 `role="img"` + 内置 `aria-label`（中文「相机扫描画面」/ 英文「Camera scan preview」，`aria-label` 属性可覆盖）。
- 状态区 `role="status"`：扫描中 / 不支持 / 权限被拒 / 相机错误等状态变化会被屏幕阅读器播报。
- 手动输入行 `<label for>` 关联 input；`<form>` 语义保证 Enter 键可直接提交；确认按钮键盘可达，焦点环走库级 token（forced-colors 下回退系统色 outline）。

## API

### oas-scanner

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 在场=请求相机并开始预览识别；移除=停止并关流（零泄漏）。`start()`/`stop()` 为其命令式便捷 | — | — |
| `aria-label` | 视频区域（`role="img"`）可访问名，缺省走 i18n | — | — |
| `manual` | 在场=显示手动输入行；无相机/无权限/出错时自动降级为该模式 | — | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `start` | `start(): void` | 开启新会话并重置识别指纹（等价 `setAttribute('active', '')`） |
| `stop` | `stop(): void` | 结束会话、停止抽帧并关流（等价 `removeAttribute('active')`） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-error` | 失败降级时派发一次，detail `{ code: 'not-supported' \| 'permission' \| 'camera' }`；同一 code 每次激活会话只派发一次 |
| `oas-scan` | 识别成功或手动提交时派发，detail `{ value: string, format?: string }`；同一 format+value 指纹会话内不重复派发（手动提交省略 format） |

#### CSS 变量

| CSS 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `--oas-scanner-height` | `220px` | 取景框高度 |

#### part

`root` / `viewport` / `video` / `status` / `manual` / `input` / `submit` 可经 `::part()` 定制。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-scanner').then(() => {
    const basic = document.getElementById('scanner-basic')
    const basicOut = document.getElementById('scanner-toggle-out')
    document.getElementById('scanner-toggle-btn')?.addEventListener('click', () => {
      basic?.start()
      if (basicOut) basicOut.textContent = '已请求相机：授权后开始预览识别；若环境不支持将自动落手动模式'
    })
    document.getElementById('scanner-stop-btn')?.addEventListener('click', () => {
      basic?.stop()
      if (basicOut) basicOut.textContent = '已停止并释放相机'
    })
    const manual = document.getElementById('scanner-manual')
    const manualOut = document.getElementById('scanner-manual-out')
    manual?.addEventListener('oas-scan', (e) => {
      const d = (e as CustomEvent).detail as { value: string }
      if (manualOut) manualOut.textContent = `oas-scan 已派发：value="${d.value}"（输入框已清空；同一值重复提交不会重复派发）`
    })
    const events = document.getElementById('scanner-events')
    const eventsOut = document.getElementById('scanner-events-out')
    events?.addEventListener('oas-scan', (e) => {
      const d = (e as CustomEvent).detail as { value: string; format?: string }
      if (eventsOut) eventsOut.textContent = `oas-scan：value="${d.value}"${d.format ? ` format=${d.format}` : ''}`
    })
    events?.addEventListener('oas-error', (e) => {
      const d = (e as CustomEvent).detail as { code: string }
      if (eventsOut) eventsOut.textContent = `oas-error：code=${d.code}（已自动降级为手动输入）`
    })
  })
})
</script>
