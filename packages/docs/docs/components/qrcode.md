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

<DemoBlock title="error-correction">
  <oas-qrcode value="https://oas-ui.dev" error-correction="l" aria-label="L 级纠错二维码"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    `error-correction` 接受 `l/m/q/h`，但当前自研编码器仅实现 **L 级**纠错，m/q/h 归一为 l 处理（可正常渲染，扫码不受影响）。更高纠错级别将随编码器迭代补全。
  </p>
</DemoBlock>

## 空态与超长

<DemoBlock title="空 value">
  <oas-qrcode aria-label="空内容二维码"></oas-qrcode>
</DemoBlock>

`value` 为空时显示「暂无内容」占位；内容超出 L 级纠错、版本 1–10 的容量（约 307 字节）时显示「内容过长」提示。

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
| `error-correction` | 纠错级别 l/m/q/h（当前仅 L 级，其余归一为 l） | — | — |
| `size` | 渲染宽高（px） | `string` | `128` |
| `value` | 二维码内容文本 | `string` | — |

### 编码器选型（架构决策）

- **零依赖原则**下评估纯 TS 编码器：完整 QR 标准（M/Q/H 纠错 + 掩码 + 全版本块表）实现过重，故选**自研 L 级简化版**；
- 支持版本 1–10、字节/字母数字/数字三种模式、8 种掩码罚分择优；
- 正确性经标准参考向量交叉验证（RS 纠错码 / 格式信息 / 版本信息）与矩阵回读自检，产物可被标准扫码器识别；
- 编码器函数（`encodeQR` / `matrixToPath` 等）由 `@oas-ui/ui` 导出，可用于 SSR 或自定义渲染。
