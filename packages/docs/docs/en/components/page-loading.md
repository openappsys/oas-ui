---
description: A full-page loading overlay with three switchable modes (spinner / skeleton / progress) and programmatic show()/close() control
---

# PageLoading

A full-page loading state: a full-screen mask with three built-in modes — `spinner` (default), `skeleton` rows, and `progress`.

- The `open` attribute controls visibility (controlled); `show()` / `close()` offer programmatic control
- `mode` switches the presentation; `text` overrides the loading copy (default i18n `loading.loading`)
- `skeleton` uses `rows`; `progress` uses `value` (0–100)
- `role="status"` + `aria-live="polite"`; the progress track keeps `aria-valuenow` in sync
- Under `prefers-reduced-motion` the spin and skeleton pulse animations are disabled

## Basic Usage

<DemoBlock title="Three modes (each closes itself after 2s)">
  <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
    <oas-button id="pl-spinner">Spinner</oas-button>
    <oas-button id="pl-skeleton">Skeleton</oas-button>
    <oas-button id="pl-progress">Progress</oas-button>
  </div>
  <oas-page-loading id="pl-demo" text="Loading the page…"></oas-page-loading>
  <p id="pl-output" style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Not closed yet</p>
</DemoBlock>

## Skeleton Mode

`skeleton` generates rows from `rows`, with the last row shortened (1–12 rows, clamped):

<DemoBlock title="Skeleton rows (invisible while not open)">
  <oas-page-loading mode="skeleton" rows="3" text="Loading content"></oas-page-loading>
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">This instance has no open attribute — click "Skeleton" above to see the full-screen effect.</p>
</DemoBlock>

## Progress Mode

`value` is a 0–100 percentage; out-of-range values clamp, invalid values fall back to 0, and `aria-valuenow` follows the width.

<DemoBlock title="Progress demo (script drives it to 100% then closes)">
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Click "Progress" above to watch the automatic advance.</p>
</DemoBlock>

## Programmatic Control

```js
const loading = document.querySelector('oas-page-loading')
loading.show() // same as writing the open attribute
loading.close() // removes open and dispatches oas-close
```

Removing the `open` attribute from the host is silent (no event); only `close()` dispatches `oas-close` with detail `{ mode }`.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-page-loading').then(() => {
    const demo = document.querySelector('#pl-demo')
    let timer = null
    const clear = () => {
      if (timer) {
        clearTimeout(timer)
        clearInterval(timer)
        timer = null
      }
    }
    const closeLater = (ms) => {
      clear()
      timer = setTimeout(() => {
        timer = null
        demo?.close()
      }, ms)
    }
    const show = (mode) => {
      if (!demo) return
      clear()
      demo.setAttribute('mode', mode)
      if (mode === 'skeleton') demo.setAttribute('rows', '5')
      if (mode === 'progress') {
        let value = 10
        demo.setAttribute('value', String(value))
        demo.show()
        timer = setInterval(() => {
          value += 10
          demo.setAttribute('value', String(Math.min(100, value)))
          if (value >= 100) {
            clear()
            setTimeout(() => demo.close(), 320)
          }
        }, 260)
        return
      }
      demo.show()
      closeLater(2000)
    }
    document.querySelector('#pl-spinner')?.addEventListener('click', () => show('spinner'))
    document.querySelector('#pl-skeleton')?.addEventListener('click', () => show('skeleton'))
    document.querySelector('#pl-progress')?.addEventListener('click', () => show('progress'))
    demo?.addEventListener('oas-close', () => {
      const output = document.querySelector('#pl-output')
      if (output) output.textContent = 'oas-close dispatched'
    })
  })
})
</script>

## API

### oas-page-loading

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `mode` | Presentation: `spinner` (default) / `skeleton` / `progress`; invalid falls back to spinner | `string` | — |
| `open` | Controlled visibility (present = full-screen mask). Removing it from the host is silent | — | — |
| `rows` | Skeleton row count (skeleton mode only): positive integer, default 4, clamped to 1–12 | `string` | — |
| `text` | Copy override; defaults to i18n `loading.loading` | `string` | — |
| `value` | Progress percentage (progress mode only): 0–100, clamped; invalid falls back to 0 | `string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `show` | `show(): void` | Show the loading state (same as writing the `open` attribute) |
| `close` | `close(): void` | Close: removes `open` and dispatches `oas-close` |

#### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched when closed via `close()`, `detail: { mode: this.resolveMode() }` |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-page-loading-bar` | Progress bar color | `var(--oas-color-primary)` |
| `--oas-page-loading-bg` | Panel background | `var(--oas-color-bg)` |
| `--oas-page-loading-blur` | Mask backdrop blur | `none` |
| `--oas-page-loading-color` | Panel text color | `var(--oas-color-text-primary)` |
| `--oas-page-loading-mask` | Full-screen mask color | `var(--oas-color-overlay)` |
| `--oas-page-loading-max-width` | Panel max width | `360px` |
| `--oas-page-loading-pulse-duration` | Skeleton pulse period | `1.4s` |
| `--oas-page-loading-shadow` | Panel shadow | `0 8px 32px color-mix(in srgb, var(--oas-color-overlay) 28%, transparent)` |
| `--oas-page-loading-skeleton` | Skeleton row color | `color-mix(in srgb, var(--oas-color-text-primary) 10%, transparent)` |
| `--oas-page-loading-spin-duration` | Spinner rotation period | `0.9s` |
| `--oas-page-loading-spinner-color` | Spinner color | `var(--oas-color-primary)` |
| `--oas-page-loading-spinner-size` | Spinner size | `32px` |
| `--oas-page-loading-track` | Progress track color | `color-mix(in srgb, var(--oas-color-text-primary) 12%, transparent)` |
