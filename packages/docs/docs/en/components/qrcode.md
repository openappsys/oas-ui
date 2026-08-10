# QRCode

A QR code component based on a **pure TypeScript, zero-dependency encoder** (built in-house) that outputs inline SVG and is scannable and downloadable.

## Basic Usage

<DemoBlock title="Basic QR code">
  <oas-qrcode value="https://oas-ui.dev" aria-label="QR code for the official website"></oas-qrcode>
</DemoBlock>

`value` accepts arbitrary text (numeric / alphanumeric / byte modes are chosen automatically); the default size is 128px.

## Sizes

<DemoBlock title="Custom size">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" size="96" aria-label="Small QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" size="160" aria-label="Large QR code"></oas-qrcode>
  </div>
</DemoBlock>

`size` controls the rendered width/height (minimum 32; invalid values fall back to 128); the SVG scales via `viewBox`, so any size stays sharp.

## Error Correction Level

<DemoBlock title="error-correction">
  <oas-qrcode value="https://oas-ui.dev" error-correction="l" aria-label="L-level error correction QR code"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    `error-correction` accepts `l/m/q/h`, but the current in-house encoder only implements **L-level** correction; m/q/h are normalized to l (it still renders normally and scanning is unaffected). Higher correction levels will be completed with encoder iterations.
  </p>
</DemoBlock>

## Empty and Overflow

<DemoBlock title="Empty value">
  <oas-qrcode aria-label="Empty-content QR code"></oas-qrcode>
</DemoBlock>

When `value` is empty, a "暂无内容" placeholder is shown; when the content exceeds the L-level capacity of versions 1–10 (about 307 bytes), a "内容过长" message is shown.

## Accessibility

<DemoBlock title="aria-label">
  <oas-qrcode value="https://oas-ui.dev" aria-label="QR code linking to the product detail page"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The container has `role="img"`; the `aria-label` attribute takes precedence, otherwise it falls back to the locale default copy (Chinese "二维码" / English "QR code"), readable by screen readers.
  </p>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name of the container; defaults to i18n | — | — |
| `error-correction` | Error correction level l/m/q/h (currently L only; the rest are normalized to l) | — | — |
| `size` | Rendered width/height (px) | — | `128` |
| `value` | QR code content text | — | — |

### Encoder Choice (Architecture Decision)

- Under the **zero-dependency principle**, a full QR standard implementation (M/Q/H correction + masks + full version block tables) was judged too heavy, so a **custom simplified L-level version** was chosen;
- Supports versions 1–10, byte / alphanumeric / numeric modes, and picks the best of 8 mask patterns by penalty scoring;
- Correctness is cross-validated against standard reference vectors (RS error correction / format info / version info) and verified by matrix read-back self-checks; the output is recognized by standard scanners;
- The encoder functions (`encodeQR` / `matrixToPath`, etc.) are exported by `@oas-ui/ui` and can be used for SSR or custom rendering.
