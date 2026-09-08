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

<DemoBlock title="error-correction levels compared">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" error-correction="l" aria-label="L-level error correction QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" error-correction="m" aria-label="M-level error correction QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" error-correction="q" aria-label="Q-level error correction QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" error-correction="h" aria-label="H-level error correction QR code"></oas-qrcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>error-correction</code> accepts four levels, <code>l/m/q/h</code> (default l), all genuinely implemented by the in-house encoder (versions 1–40) — no more silent normalization. Higher levels tolerate more damage (H ≈ 30%) at the cost of a denser symbol; use q/h when embedding a center logo or scanning in poor light.
  </p>
</DemoBlock>

## Center Logo

<DemoBlock title="icon center logo (with high error correction)">
  <oas-qrcode value="https://oas-ui.dev" error-correction="h" icon="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='12' fill='%23146ae3'/%3E%3Ctext x='32' y='42' font-size='22' text-anchor='middle' fill='white' font-family='sans-serif'%3EOAS%3C/text%3E%3C/svg%3E" icon-size="32" aria-label="QR code with center logo"></oas-qrcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>icon</code> is the center image URL (rendered inline in the SVG, on an automatic background pad); <code>icon-size</code> defaults to size/5 (the usual ≤1/5 rule of thumb) — an oversized logo eats the correction budget and can make the code unscannable, so pair logos with q/h correction.
  </p>
</DemoBlock>

## Colors and Dark-theme Scannability

<DemoBlock title="color / bg-color customization">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode value="https://oas-ui.dev" color="#1677ff" aria-label="Blue QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" color="green" aria-label="Preset-color QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" bg-color="#fff7e6" color="#ad4e00" margin="8" aria-label="Warm-background large-quiet-zone QR code"></oas-qrcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Foreground <code>color</code> defaults to the host text color (currentColor); it accepts any CSS color or one of 11 preset names (e.g. <code>blue</code> → <code>var(--oas-preset-blue)</code>). Background <code>bg-color</code> defaults to <b>pure white</b> — scannability outranks theme consistency, so the code stays scannable in dark themes (override globally via <code>--oas-qrcode-bg</code> if needed). The quiet-zone margin <code>margin</code> defaults to 4 modules (the QR standard requirement).
  </p>
</DemoBlock>

## Status (expired / loading / scanned)

<DemoBlock title="status state machine (click refresh on expired)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-qrcode id="qrcode-status" value="https://oas-ui.dev" status="expired" aria-label="Expired QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" status="loading" aria-label="Loading QR code"></oas-qrcode>
    <oas-qrcode value="https://oas-ui.dev" status="scanned" aria-label="Scanned QR code"></oas-qrcode>
  </div>
  <p id="qrcode-status-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click "Refresh" on the expired code to fire the <code>oas-refresh</code> event (this demo simulates a refresh flow: loading → active).
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
      if (out) out.textContent = 'oas-refresh fired, refreshing…'
      setTimeout(() => {
        qr.setAttribute('status', 'active')
        if (out) out.textContent = 'Refreshed (status → active); set it back to expired to try again'
      }, 1200)
    })
    const dl = document.getElementById('qrcode-download')
    const dlOut = document.getElementById('qrcode-download-out')
    document.getElementById('qrcode-download-btn')?.addEventListener('click', () => {
      dl?.download('oas-ui-qrcode.png')
      if (dlOut) dlOut.textContent = 'Download triggered: oas-ui-qrcode.png'
    })
  })
})
</script>

`status`: `active` (default) / `expired` / `loading` / `scanned`. Any non-active value overlays the code: expired shows "QR code expired" plus a refresh button (click fires `oas-refresh`), loading shows a spinner (`aria-busy`), scanned shows "Scanned". The overlay content can be fully customized by cloning a `template[slot="status"]`.

## Download PNG

<DemoBlock title="download() offscreen rasterize">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-qrcode id="qrcode-download" value="https://oas-ui.dev" error-correction="q" icon="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='12' fill='%23146ae3'/%3E%3Ctext x='32' y='42' font-size='22' text-anchor='middle' fill='white' font-family='sans-serif'%3EOAS%3C/text%3E%3C/svg%3E" icon-size="28" aria-label="Downloadable QR code"></oas-qrcode>
    <oas-button id="qrcode-download-btn" size="small">Download PNG</oas-button>
    <span id="qrcode-download-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click to download a 4x PNG (margin / colors / logo match the on-screen render)</span>
  </div>
</DemoBlock>

`download()` rasterizes the current code offscreen into a PNG download — the render layer stays SVG-only (vector + SSR snapshot consistency), with no resident canvas; the center logo is drawn in a second pass during rasterization (browsers block external images inside SVG loaded via `<img>`).

## Empty and Overflow

<DemoBlock title="Empty value">
  <oas-qrcode aria-label="Empty-content QR code"></oas-qrcode>
</DemoBlock>

When `value` is empty, a "No content" placeholder is shown; when the content exceeds the capacity of versions 1–40 at the chosen correction level (2953 bytes at v40-L), a "Content is too long" message is shown.

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
| `bg-color` | Background color (default white — scanners need a light quiet zone; stays white in dark theme for scannability; override via `--oas-qrcode-bg`) | `string` | — |
| `color` | Foreground (module) color, default fixed dark `#18181b` (paired with the white quiet zone for dark-theme scannability; override via `--oas-qrcode-color`, preset name, or any color value) | `string` | — |
| `error-correction` | Error correction level l/m/q/h (currently L only; the rest are normalized to l) | `string` | `l` |
| `icon` | Center logo image URL (use with `error-correction="h"` to keep scannability) | `string` | — |
| `icon-size` | Center logo size in px (default size/5, clamped to [16, size/2]) | — | — |
| `margin` | Quiet-zone margin in modules (default 4) | `string` | `4` |
| `size` | Rendered width/height (px) | `string` | `128` |
| `status` | State machine: `active` (default) / `expired` (overlay, refresh button fires `oas-refresh`) / `loading` / `scanned` | `string` | `active` |
| `value` | QR code content text | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-refresh` | Fired when the refresh button is clicked in expired state; the host reassigns content and switches back to `active` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="status"]` | Custom status overlay content (built-in overlays per state by default) |

### Encoder Choice (Architecture Decision)

- Under the **zero-dependency principle**, a full QR standard implementation (M/Q/H correction + masks + full version block tables) was judged too heavy, so a **custom simplified L-level version** was chosen;
- Supports versions 1–10, byte / alphanumeric / numeric modes, and picks the best of 8 mask patterns by penalty scoring;
- Correctness is cross-validated against standard reference vectors (RS error correction / format info / version info) and verified by matrix read-back self-checks; the output is recognized by standard scanners;
- The encoder functions (`encodeQR` / `matrixToPath`, etc.) are exported by `@oas-ui/ui` and can be used for SSR or custom rendering.
