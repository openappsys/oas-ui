# Signature

A canvas-based signature pad: pointer events cover mouse/pen/touch, DPR-aware crisp rendering, stroke color follows theme tokens (auto-flips in dark), strokes survive container resizes, and `value` (PNG dataURL) is two-way bindable.

## Basic Usage

<DemoBlock title="Basic signature">
  <oas-signature id="sig-basic" clearable style="max-width: 480px"></oas-signature>
  <p id="sig-basic-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Press and drag on the pad to sign; <code>oas-change</code> fires when the stroke ends (pointer up).
  </p>
</DemoBlock>

`value` is a PNG dataURL of the signature: it is written to the attribute automatically when a stroke ends, and `oas-change` (detail `{ value }`) fires with idempotent deduplication per value. `clearable` shows a "Clear" button; `clear()` programmatically clears the pad (idempotent — no-op when already empty). **A single tap (press-and-release without movement) does not count as a stroke** — no value is produced and the state does not flip; an in-progress stroke only follows the first pointer, so a second finger or palm never pollutes it.

## Controlled Value

<DemoBlock title="Controlled echo (sign → readonly echo pad)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature id="sig-src" clearable></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Sign here</p>
    </div>
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature id="sig-echo" readonly></oas-signature>
      <p id="sig-echo-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Readonly echo pad on the right</p>
    </div>
  </div>
</DemoBlock>

Writing `value` from the host (e.g. copying the left pad's dataURL to the right one) renders it as a controlled echo: local strokes are cleared and the external image is loaded (contain, centered). Writing back **the very value the component just dispatched does not trigger a clear** (no controlled-loop oscillation). Use `toDataURL()` to read programmatically: it returns an empty string for an empty pad.

## Disabled & Readonly

<DemoBlock title="disabled / readonly">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature disabled></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">disabled: no signing at all</p>
    </div>
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature id="sig-ro" readonly></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">readonly: strokes stay visible, edits blocked</p>
    </div>
  </div>
</DemoBlock>

`disabled` / `readonly` are presence semantics: stroke start is blocked (moves/ups have no effect either). `readonly` keeps existing strokes and `value`; both grey out the clear button.

## Stroke Styling

<DemoBlock title="pen-size / pen-color / height">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1 1 220px; min-width: 220px">
      <oas-signature clearable pen-size="4" pen-color="blue"></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">pen-size=4 · pen-color=blue</p>
    </div>
    <div style="flex: 1 1 220px; min-width: 220px">
      <oas-signature clearable pen-color="#c41d7f" height="120"></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">pen-color=#c41d7f · height=120</p>
    </div>
  </div>
</DemoBlock>

`pen-size` defaults to 2 (px; invalid values fall back). `pen-color` accepts 11 preset names (`magenta / red / volcano / orange / gold / lime / green / cyan / blue / geekblue / purple`, resolved via `--oas-preset-*` tokens with dark variants) or any CSS color; the default `var(--oas-color-text-primary)` follows the theme — **theme switches re-resolve and repaint strokes automatically**. `height` controls the pad height (px, default 160); the width fills the host at 100%.

## Dark Theme

<DemoBlock title="Signature pad in dark theme">
  <div data-theme="dark" style="width: 100%; padding: var(--oas-space-4); border-radius: var(--oas-radius-md); background: var(--oas-color-bg); box-sizing: border-box">
    <oas-signature clearable></oas-signature>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The default stroke color is <code>--oas-color-text-primary</code>, which flips to a light tone in dark mode; the pad background/border use the <code>--oas-color-bg-elevated</code> / <code>--oas-color-border</code> tokens.
  </p>
</DemoBlock>

## Accessibility & forced-colors

The canvas carries `role="img"` with a stateful accessible name ("Signature pad, not signed / signed") and announces state flips through an `aria-live="polite"` region; the clear control is a native keyboard-reachable button with a focus-visible ring. Under forced-colors (Windows high contrast) canvas strokes cannot be system-recolored — a canvas limitation. In v1 the pad keeps a 1px border so its bounds stay visible, and no DOM stroke replica is provided; contrast of the signature image is the host's responsibility via `pen-color`.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-signature').then(() => {
    const basic = document.getElementById('sig-basic')
    const basicOut = document.getElementById('sig-basic-out')
    basic?.addEventListener('oas-change', (e) => {
      const v = e.detail?.value ?? ''
      if (basicOut) {
        basicOut.textContent = v
          ? `oas-change dispatched: value is a PNG dataURL (${v.length} chars)`
          : 'oas-change dispatched: value cleared'
      }
    })
    const src = document.getElementById('sig-src')
    const echo = document.getElementById('sig-echo')
    const echoOut = document.getElementById('sig-echo-out')
    src?.addEventListener('oas-change', (e) => {
      const v = e.detail?.value ?? ''
      if (echo) echo.setAttribute('value', v)
      if (echoOut) {
        echoOut.textContent = v
          ? `Controlled echo: wrote a ${v.length}-char dataURL`
          : 'Controlled echo: cleared'
      }
    })
  })
})
</script>

## Edge Cases

- Theme observation only listens at the `documentElement` level (`class` / `data-theme` on `<html>`); a runtime container-level `data-theme` switch does not re-resolve the pen color immediately — it takes effect on the next repaint (e.g. a container resize). If a resize or theme switch happens mid-stroke, the already-drawn segments are fully preserved by the repaint; no stroke is lost.
- Setting `disabled` / `readonly` mid-stroke lets the current stroke finish normally (its captured trail is fully committed to `value`); new strokes are intercepted starting from the next one.

## API

### oas-signature

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | Show clear button | `boolean` | — |
| `disabled` | Disabled (blocks drawing) | `boolean` | — |
| `height` | Canvas height (px, default 160) | `string` | `160` |
| `pen-color` | Stroke color (11 preset names or CSS color, defaults to theme text color) | `string` | — |
| `pen-size` | Stroke width (px, default 2) | `string` | `2` |
| `readonly` | Readonly (blocks drawing, keeps strokes visible) | `boolean` | — |
| `value` | Signature image (PNG dataURL), two-way bindable | `string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `clear` | `clear(): void` | 清空画布与笔迹，value 归空并按指纹派发 oas-change。 |
| `toDataURL` | `toDataURL(): string` | 当前画布 PNG dataURL。空画布（无笔迹且无外部图像）或无 canvas 环境时返回空串。 |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched on stroke end or clear (idempotent per value), `detail: { value: url } \| { value: '' }` |
