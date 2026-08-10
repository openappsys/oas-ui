# QRCode

A QR code component based on a **pure TypeScript, zero-dependency encoder** (built in-house) that outputs inline SVG and is scannable and downloadable.

## Basic Usage

<DemoBlock title="Basic QR code">
  <oas-qrcode value="https://oas-ui.dev" aria-label="官网链接二维码"></oas-qrcode>
</DemoBlock>

`value` accepts arbitrary text (numeric / alphanumeric / byte modes are chosen automatically); the default size is 128px.

## Sizes

<DemoBlock title="Custom size">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" size="96" aria-label="小尺寸二维码"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" size="160" aria-label="大尺寸二维码"></oas-qrcode>
  </div>
</DemoBlock>

`size` controls the rendered width/height (minimum 32; invalid values fall back to 128); the SVG scales via `viewBox`, so any size stays sharp.

## Error Correction Level

<DemoBlock title="error-correction">
  <oas-qrcode value="https://oas-ui.dev" error-correction="l" aria-label="L 级纠错二维码"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    `error-correction` 接受 `l/m/q/h`，但当前自研编码器仅实现 **L 级**纠错，m/q/h 归一为 l 处理（可正常渲染，扫码不受影响）。更高纠错级别将随编码器迭代补全。
  </p>
</DemoBlock>

## Empty and Overflow

<DemoBlock title="Empty value">
  <oas-qrcode aria-label="空内容二维码"></oas-qrcode>
</DemoBlock>

When `value` is empty, a "暂无内容" placeholder is shown; when the content exceeds the L-level capacity of versions 1–10 (about 307 bytes), a "内容过长" message is shown.

## Accessibility

<DemoBlock title="aria-label">
  <oas-qrcode value="https://oas-ui.dev" aria-label="商品详情页链接二维码"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    容器 `role="img"`；`aria-label` 属性优先，缺省走 locale 默认文案（中文「二维码」/ 英文「QR code」），可被屏幕阅读器读出。
  </p>
</DemoBlock>

## API

### Attributes

| Attribute          | Description                                      | Type     | Default |
| ------------------ | ------------------------------------------------ | -------- | ------- |
| `value`            | QR code content text                             | `string` | —       |
| `size`             | Rendered width/height (px)                       | `number` | `128`   |
| `error-correction` | Error correction level l/m/q/h (currently L only; the rest are normalized to l) | `string` | `l`     |
| `aria-label`       | Accessible name of the container; defaults to i18n | `string` | 二维码 |

### Encoder Choice (Architecture Decision)

- Under the **zero-dependency principle**, a full QR standard implementation (M/Q/H correction + masks + full version block tables) was judged too heavy, so a **custom simplified L-level version** was chosen;
- Supports versions 1–10, byte / alphanumeric / numeric modes, and picks the best of 8 mask patterns by penalty scoring;
- Correctness is cross-validated against standard reference vectors (RS error correction / format info / version info) and verified by matrix read-back self-checks; the output is recognized by standard scanners;
- The encoder functions (`encodeQR` / `matrixToPath`, etc.) are exported by `@oas-ui/ui` and can be used for SSR or custom rendering.
