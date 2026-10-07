# Barcode

A 1D barcode component based on a **pure TypeScript, zero-dependency encoder** (built in-house). The first release covers 6 symbologies (CODE128 / EAN-13 / EAN-8 / UPC-A / CODE39 / ITF-14), outputs inline SVG, and is scannable and downloadable.

## Basic Usage

<DemoBlock title="Basic barcode">
  <oas-barcode value="OAS-UI-2026" aria-label="Shipping number barcode"></oas-barcode>
</DemoBlock>

`value` accepts arbitrary text (CODE128 auto switches between A/B/C subsets); **the overall width is determined by the content** (digits × symbology × `bar-width` + quiet zone) — the component has no `size`/`width` attribute, which is the biggest API difference from the QR code component.

## Symbologies

<DemoBlock title="6 symbologies in the first release">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="LOG-2026-0042" format="code128" aria-label="CODE128 barcode"></oas-barcode>
    <oas-barcode value="4006381333931" format="ean13" aria-label="EAN-13 product barcode"></oas-barcode>
    <oas-barcode value="96385074" format="ean8" aria-label="EAN-8 product barcode"></oas-barcode>
    <oas-barcode value="036000291452" format="upca" aria-label="UPC-A product barcode"></oas-barcode>
    <oas-barcode value="ASSET-0093" format="code39" aria-label="CODE39 asset barcode"></oas-barcode>
    <oas-barcode value="10614141000415" format="itf14" aria-label="ITF-14 carton barcode"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>format</code>: <code>code128</code> (default, auto A/B/C) / <code>ean13</code> / <code>ean8</code> / <code>upca</code> / <code>code39</code> / <code>itf14</code>; invalid values fall back to code128. For EAN/UPC, 12/7/11/13 data digits get the **check digit calculated automatically**; a full-length code is validated against its last digit. The EAN-13 first digit and the UPC-A first/last digits are rendered outside the guard bars per the standard, and guard bars extend downward. CODE39 upper-cases input automatically; ITF-14 is a fixed 13+1 digit carton code.
  </p>
</DemoBlock>

## Bar Width & Height

<DemoBlock title="bar-width / height">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="OAS-UI-2026" bar-width="1" height="80" aria-label="Thin barcode"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" bar-width="2" aria-label="Default barcode"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" bar-width="3" height="120" aria-label="Thick barcode"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>bar-width</code> is the first parameter of scannability (X-dimension, default 2, floor 1); <code>height</code> controls the bar height only (default 100, excluding the text zone). Shortening the bar height lowers the first-read rate of laser scanners — keep the default for printed labels.
  </p>
</DemoBlock>

## Human Readable Interpretation (HRI)

<DemoBlock title="display-value / text-position / font size & spacing">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="4006381333931" format="ean13" aria-label="Barcode with default HRI text"></oas-barcode>
    <oas-barcode value="4006381333931" format="ean13" text-position="top" font-size="14" text-margin="6" aria-label="Barcode with text on top"></oas-barcode>
    <oas-barcode value="PURE-GRAPHIC" display-value="false" height="64" aria-label="Pure graphic barcode"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>display-value</code> shows the HRI text by default (set <code>display-value="false"</code> to hide it); <code>text-position</code> is <code>bottom</code> (default) / <code>top</code>; <code>font-size</code> (default 16) and <code>text-margin</code> (default 4) control the text zone geometry. Text uses a generic sans — the barcode standard font OCR-B has no free license and is not embedded; hosts may load it via <code>@font-face</code> and override through <code>::part(text)</code>.
  </p>
</DemoBlock>

## Colors & Dark-theme Scannability

<DemoBlock title="color / bg-color customization">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="OAS-UI-2026" color="#146ae3" aria-label="Blue barcode"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" color="green" aria-label="Preset color barcode"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" bg-color="#fff7e6" color="#ad4e00" margin="30" aria-label="Warm background barcode with a wide quiet zone"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The bar color <code>color</code> defaults to fixed dark <code>#18181b</code> and accepts any CSS color or one of the 11 preset names; the quiet zone <code>bg-color</code> defaults to fixed <b>white</b> — scannability takes precedence over theme consistency, so it stays scannable under the dark theme (also overridable globally via the <code>--oas-barcode-bg</code> variable). <b>Contrast warning</b>: infrared scanners cannot read red-ish bars (red = white); keep "dark bars on a light background" when customizing colors.
  </p>
</DemoBlock>

## Quiet Zone (hard scannability constraint)

<DemoBlock title="margin quiet zone">
  <div style="width: 100%; display: flex; gap: var(--oas-space-5); align-items: flex-start; flex-wrap: wrap">
    <oas-barcode value="OAS-UI-2026" aria-label="Barcode with the default (10 × bar-width) quiet zone"></oas-barcode>
    <oas-barcode value="OAS-UI-2026" margin="48" aria-label="Barcode with an enlarged quiet zone"></oas-barcode>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>margin</code> is the left/right quiet zone (px, <b>defaults to <code>10 × bar-width</code></b>—the default output is scannable out of the box). Scanners require enough whitespace on both sides or they refuse to read — the component has a built-in guardrail: explicit values below <code>10 × bar-width</code> are clamped up to the floor with a one-time console.warn. Hosts may enlarge it, not break it. The guardrail only enforces the floor — whether the quiet zone meets the physical requirements of a specific deployment (print size, scan distance, scanner model) is for the host to evaluate.
  </p>
</DemoBlock>

## Invalid Input Feedback

<DemoBlock title="oas-invalid event (error placeholder + event takeover)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-input id="barcode-invalid-input" value="4006381333931" style="width: 220px" aria-label="Product code input"></oas-input>
    <oas-button id="barcode-invalid-btn" size="small">Generate barcode</oas-button>
    <oas-barcode id="barcode-invalid-demo" value="4006381333931" format="ean13" aria-label="Product barcode to generate"></oas-barcode>
  </div>
  <p id="barcode-invalid-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Change the value to something invalid (letters, wrong digit count, wrong check digit) and click "Generate barcode" — the component renders an error placeholder and fires oas-invalid.
  </p>
</DemoBlock>

Invalid input comes in three classes, mapped one-to-one onto `detail.reason` of the `oas-invalid` event: <code>charset</code> (characters not allowed, e.g. letters in an EAN), <code>length</code> (wrong digit count), <code>checksum</code> (check digit mismatch). Hosts may take over the messaging (as this demo does); the component always renders its error placeholder as a fallback.

## Download PNG

<DemoBlock title="download() offscreen rasterize">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-barcode id="barcode-download" value="4006381333931" format="ean13" aria-label="Downloadable barcode"></oas-barcode>
    <oas-button id="barcode-download-btn" size="small">Download PNG</oas-button>
    <span id="barcode-download-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click to download a 4× PNG (quiet zone / colors / text identical to the screen rendering)</span>
  </div>
</DemoBlock>

`download()` rasterizes the current barcode offscreen into a PNG and triggers the download — the rendering layer stays SVG-only (vector + SSR snapshot consistency) with no persistent canvas; empty or invalid values return silently instead of producing an unscannable image.

## Empty State

<DemoBlock title="Empty value">
  <oas-barcode aria-label="Empty barcode"></oas-barcode>
</DemoBlock>

When `value` is empty, a "No content" placeholder is shown.

## Accessibility

<DemoBlock title="aria-label">
  <oas-barcode value="OAS-UI-2026" aria-label="Bin A-12 barcode"></oas-barcode>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The graphic element carries `role="img"`; the `aria-label` attribute takes precedence, falling back to the locale default (Chinese "条码" / English "Barcode"), readable by screen readers. The component has no keyboard interaction (purely presentational, not in the tab order).
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-barcode').then(() => {
    const input = document.getElementById('barcode-invalid-input')
    const demo = document.getElementById('barcode-invalid-demo')
    const out = document.getElementById('barcode-invalid-out')
    const reasons = {
      charset: 'Invalid characters (EAN-13 accepts digits only)',
      length: 'Wrong digit count (EAN-13 needs 12 or 13 digits)',
      checksum: 'Check digit mismatch (last digit differs from the computed value)',
    }
    document.getElementById('barcode-invalid-btn')?.addEventListener('click', () => {
      if (!input || !demo) return
      demo.setAttribute('value', input.value || '')
    })
    demo?.addEventListener('oas-invalid', (e) => {
      const reason = e.detail?.reason
      if (out) out.textContent = `oas-invalid fired: ${reasons[reason] ?? reason} (error placeholder rendered)`
    })
    const dl = document.getElementById('barcode-download')
    const dlOut = document.getElementById('barcode-download-out')
    document.getElementById('barcode-download-btn')?.addEventListener('click', () => {
      dl?.download('oas-ui-barcode.png')
      if (dlOut) dlOut.textContent = 'Download triggered: oas-ui-barcode.png'
    })
  })
})
</script>

## API

### oas-barcode

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name of the container; defaults to i18n | — | — |
| `bar-width` | Bar width X-dimension (px, default 2, clamped to ≥1) | `string` | `2` |
| `bg-color` | Quiet-zone background (default white — scanners need a light quiet zone; stays white in dark theme for scannability; override via `--oas-barcode-bg`) | `string` | — |
| `color` | Bar color (default fixed dark `#18181b` — paired with the white background for dark-theme scannability; override via `--oas-barcode-color`, preset name, or any color value) | `string` | — |
| `display-value` | Show the human readable interpretation (shown by default; set to `"false"` to hide) | `string` | — |
| `font-size` | HRI text font size (px, default 16) | `string` | `16` |
| `format` | Symbology: `code128` (default, auto A/B/C subset switching) / `ean13` / `ean8` / `upca` / `code39` / `itf14` (invalid values fall back to code128) | `string` | `code128` |
| `height` | Bar height (px, default 100, excluding the text zone and guard-bar extension) | `string` | `100` |
| `margin` | Left/right quiet zone (px, defaults to `10 × bar-width`—scannable out of the box); explicit values below `10 × bar-width` are clamped up to the floor with a one-time console.warn (scannability guardrail) | — | — |
| `text-margin` | Spacing between text and bars (px, default 4) | `string` | `4` |
| `text-position` | HRI text position: `bottom` (default) / `top` | `string` | `bottom` |
| `value` | Barcode content (empty value shows the empty placeholder) | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-invalid` | Fired when invalid input renders the error placeholder, detail { reason }: `charset` (characters not allowed) / `length` (wrong digit count) / `checksum` (check digit mismatch); fires once per invalid input |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-barcode-bg` | `#ffffff` |
| `--oas-barcode-color` | `#18181b` |
