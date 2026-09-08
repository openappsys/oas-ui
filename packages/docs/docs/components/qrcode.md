# QRCode 二维码

基于**纯 TypeScript 零依赖编码器**（自研）的二维码组件，输出内联 SVG，可扫码、可下载。

## 基础用法

<DemoBlock title="基础二维码">
  <oas-qrcode value="https://oas-ui.dev" aria-label="官网链接二维码"></oas-qrcode>
</DemoBlock>

`value` 支持任意文本（数字/字母数字/字节模式自动选择），默认尺寸 128px。

## 尺寸

<DemoBlock title="自定义尺寸">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" size="96" aria-label="小尺寸二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" size="160" aria-label="大尺寸二维码"></oas-qrcode>
  </div>
</DemoBlock>

`size` 控制渲染宽高（最小 32，非法值回退 128）；SVG 用 `viewBox` 缩放，任意尺寸均清晰。

## 纠错级别

<DemoBlock title="error-correction 四级别对比">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" error-correction="l" aria-label="L 级纠错二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" error-correction="m" aria-label="M 级纠错二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" error-correction="q" aria-label="Q 级纠错二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" error-correction="h" aria-label="H 级纠错二维码"></oas-qrcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>error-correction</code> 接受 <code>l/m/q/h</code> 四级别（默认 l），自研编码器全级别真实实现（v1–40 全版本），不再归一降级。级别越高容错越强（H 级约可容忍 30% 污损），同内容下码更密；中心 logo / 弱光扫码场景建议 q/h。
  </p>
</DemoBlock>

## 中心 Logo

<DemoBlock title="icon 中心 logo（搭配高纠错级别）">
  <oas-qrcode value="https://oas-ui.dev" error-correction="h" icon="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='12' fill='%23146ae3'/%3E%3Ctext x='32' y='42' font-size='22' text-anchor='middle' fill='white' font-family='sans-serif'%3EOAS%3C/text%3E%3C/svg%3E" icon-size="32" aria-label="带中心 logo 的二维码"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>icon</code> 为中心图片 URL（SVG 内嵌渲染，底部自动铺背景色托底）；<code>icon-size</code> 默认 size/5（经验取值 ≤1/5），过大将吃掉纠错余量导致不可扫——logo 遮挡场景请用 q/h 级纠错。
  </p>
</DemoBlock>

## 颜色与暗色可扫性

<DemoBlock title="color / bg-color 定制">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" color="#1677ff" aria-label="蓝色前景二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" color="green" aria-label="预设色二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" bg-color="#fff7e6" color="#ad4e00" margin="8" aria-label="暖底大静区二维码"></oas-qrcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    前景 <code>color</code> 缺省走宿主文本色（currentColor），可给任意 CSS 色值或 11 个预设名（如 <code>blue</code> → <code>var(--oas-preset-blue)</code>）；背景 <code>bg-color</code> 默认固定<b>纯白</b>——二维码可扫性优先于主题一致性，dark 主题下同样可扫（也可用 <code>--oas-qrcode-bg</code> 变量全局覆盖）。静区边距 <code>margin</code> 默认 4 模块（QR 标准静区要求）。
  </p>
</DemoBlock>

## 状态（过期 / 加载 / 已扫描）

<DemoBlock title="status 状态机（expired 点击刷新）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode id="qrcode-status" value="https://oas-ui.dev" status="expired" aria-label="过期二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" status="loading" aria-label="加载中二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" status="scanned" aria-label="已扫描二维码"></oas-qrcode>
  </div>
  <p id="qrcode-status-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点击过期二维码上的「刷新」按钮触发 <code>oas-refresh</code> 事件（demo 中模拟刷新流程：loading → active）。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-qrcode').then(() => {
    const qr = document.getElementById('qrcode-status')
    const out = document.getElementById('qrcode-status-out')
    qr?.addEventListener('oas-refresh', () => {
      qr.setAttribute('status', 'loading')
      if (out) out.textContent = 'oas-refresh 已触发，正在刷新…'
      setTimeout(() => {
        qr.setAttribute('status', 'active')
        if (out) out.textContent = '已刷新（status → active），可再次置为 expired 重试'
      }, 1200)
    })
    const dl = document.getElementById('qrcode-download')
    const dlOut = document.getElementById('qrcode-download-out')
    document.getElementById('qrcode-download-btn')?.addEventListener('click', () => {
      dl?.download('oas-ui-qrcode.png')
      if (dlOut) dlOut.textContent = '已触发下载：oas-ui-qrcode.png'
    })
  })
})
</script>

`status` 取值：`active`（默认）/ `expired` / `loading` / `scanned`。非 active 时盖覆盖层：expired 显示「已过期」+ 刷新按钮（点击派发 `oas-refresh`）、loading 显示加载动画（`aria-busy`）、scanned 显示「已扫描」。覆盖层内容可整体自定义：`template[slot="status"]` 克隆替换。

## 下载 PNG

<DemoBlock title="download() 离屏 rasterize 下载">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-qrcode id="qrcode-download" value="https://oas-ui.dev" error-correction="q" icon="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='12' fill='%23146ae3'/%3E%3Ctext x='32' y='42' font-size='22' text-anchor='middle' fill='white' font-family='sans-serif'%3EOAS%3C/text%3E%3C/svg%3E" icon-size="28" aria-label="可下载二维码"></oas-qrcode>
    <oas-button id="qrcode-download-btn" size="small">下载 PNG</oas-button>
    <span id="qrcode-download-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击按钮下载 4 倍清晰度 PNG（静区/颜色/logo 与屏幕渲染一致）</span>
  </div>
</DemoBlock>

`download()` 把当前二维码离屏栅格化为 PNG 触发下载——渲染层保持 SVG-only（矢量 + SSR 快照一致性），不引入常驻 canvas；中心 logo 在栅格化阶段二次绘制（浏览器会拦截 SVG 内嵌外部图）。

## 空态与超长

<DemoBlock title="空 value">
  <oas-qrcode aria-label="空内容二维码"></oas-qrcode>
</DemoBlock>

`value` 为空时显示「暂无内容」占位；内容超出所选纠错级别、版本 1–40 的容量（v40-L 字节容量 2953）时显示「内容过长」提示。

## 无障碍

<DemoBlock title="aria-label">
  <oas-qrcode value="https://oas-ui.dev" aria-label="商品详情页链接二维码"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    容器 `role="img"`；`aria-label` 属性优先，缺省走 locale 默认文案（中文「二维码」/ 英文「QR code」），可被屏幕阅读器读出。
  </p>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 容器可访问名称，缺省走 i18n | — | — |
| `bg-color` | 背景色（默认白色——扫码器要求浅色静区，dark 主题下保持白底保证可扫；`--oas-qrcode-bg` 变量可覆盖） | `string` | — |
| `color` | 前景色（码点颜色，默认固定深色 `#18181b`——与固定白静区配套保证 dark 可扫；`--oas-qrcode-color` 变量或预设名/任意色值覆盖） | `string` | — |
| `error-correction` | 纠错级别 l/m/q/h（当前仅 L 级，其余归一为 l） | `string` | `l` |
| `icon` | 中心 logo 图片 URL（建议配合 `error-correction="h"` 保可扫性） | `string` | — |
| `icon-size` | 中心 logo 尺寸（px，默认 size/5， clamp 在 [16, size/2]） | — | — |
| `margin` | 静区边距（模块单位，默认 4） | `string` | `4` |
| `size` | 渲染宽高（px） | `string` | `128` |
| `status` | 状态机：`active`（默认）/ `expired`（过期遮罩，点击刷新派 `oas-refresh`）/ `loading` / `scanned` | `string` | `active` |
| `value` | 二维码内容文本 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-refresh` | 过期态点击刷新按钮时派发，宿主重新赋值内容后切回 `active` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="status"]` | 自定义状态覆盖层内容（缺省为各状态内建遮罩） |

### 编码器选型（架构决策）

- **零依赖原则**下评估纯 TS 编码器：完整 QR 标准（M/Q/H 纠错 + 掩码 + 全版本块表）实现过重，故选**自研 L 级简化版**；
- 支持版本 1–10、字节/字母数字/数字三种模式、8 种掩码罚分择优；
- 正确性经标准参考向量交叉验证（RS 纠错码 / 格式信息 / 版本信息）与矩阵回读自检，产物可被标准扫码器识别；
- 编码器函数（`encodeQR` / `matrixToPath` 等）由 `@oas-ui/ui` 导出，可用于 SSR 或自定义渲染。
