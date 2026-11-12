# Scanner

Camera-based code scanning. Decoding uses the native `BarcodeDetector` browser API (zero third-party decoding libraries); when the environment is unsupported, permission is denied, or the camera fails, the component automatically falls back to a manual input row — deterministic and testable.

## Basic usage

`active` is a presence-boolean attribute: set it to request the camera and start preview scanning; remove it to stop and release the stream. The live-camera demo requires browser authorization (choose "Allow"), and is best experienced in a `BarcodeDetector`-capable browser (Chrome / Edge / Android WebView, etc.).

<DemoBlock title="Driven by the active attribute (button-triggered, camera permission required)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: center; flex-wrap: wrap">
    <oas-button id="scanner-toggle-btn" size="small">Start camera scanning</oas-button>
    <oas-button id="scanner-stop-btn" size="small">Stop</oas-button>
    <span id="scanner-toggle-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click "Start camera scanning" to request camera permission and begin preview</span>
  </div>
  <oas-scanner id="scanner-basic" manual style="width: 100%; max-width: 480px; margin-top: var(--oas-space-3)"></oas-scanner>
</DemoBlock>

```js
const el = document.querySelector('oas-scanner')
el.start()   // = setAttribute('active', ''): request the camera and start preview
el.stop()    // = removeAttribute('active'): stop and release the stream
```

`start()`/`stop()` are imperative conveniences for the `active` attribute — state is always owned by the attribute; binding attributes directly from host frameworks (Vue/React) works identically.

## Manual input mode

With `manual` present, a manual input row is shown (label-associated input; submit via Enter or the button). It does not conflict with camera preview: you can use manual-only (`manual` alone), or camera + manual together (as above) — users always have an input path when scanning fails.

<DemoBlock title="manual input (no camera required, works in any environment)">
  <oas-scanner id="scanner-manual" manual style="width: 100%; max-width: 480px"></oas-scanner>
  <p id="scanner-manual-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Enter a code (e.g. <code>OAS-2026-001</code>) above, then press Enter or click "Confirm" — the component fires oas-scan and clears the input.</p>
</DemoBlock>

Manual submits share the same idempotency contract as camera decodes: repeated submits of the same value do not re-fire (see "Dedup and throttling").

## Fallback chain and oas-error

Three failure classes fall back to manual mode automatically and fire `oas-error` once (per activation session per `code`; removing and re-setting `active` starts a new session):

| `detail.code` | Scenario | Component behavior |
| --- | --- | --- |
| `not-supported` | No native `BarcodeDetector` (older Firefox / iOS Safari / test environments like happy-dom), or an insecure context (non-HTTPS/localhost, no `getUserMedia`) | Falls back to manual without requesting the camera |
| `permission` | `getUserMedia` denied by user/system (`NotAllowedError` / `SecurityError`) | Falls back to manual; status shows permission denied |
| `camera` | No camera device, device busy, `play()` rejected, or other camera errors | Falls back to manual; status shows camera failure |

<DemoBlock title="oas-error / oas-scan event takeover">
  <oas-scanner id="scanner-events" manual style="width: 100%; max-width: 480px"></oas-scanner>
  <p id="scanner-events-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Fired oas-scan / oas-error events will appear here.</p>
</DemoBlock>

## Dedup and throttling

- `oas-scan` (detail `{ value, format? }`) is idempotent: the same `format+value` fingerprint fires at most once per session; keeping the camera aimed at the same code does not re-trigger. `start()` (or removing then re-setting `active`) opens a new session and resets the fingerprint, forcing a re-fire of the same code.
- After a hit, frame sampling pauses for 1200 ms then resumes automatically (throttling) — brief occlusions or angle adjustments need no restart; with no hits, frames are sampled every 150 ms (video frame → offscreen canvas → `BarcodeDetector.detect()`).
- Manual submits fire `oas-scan` without `format`; camera hits carry the format reported by `BarcodeDetector` (e.g. `qr_code`, `ean_13`).

## Browser support (honest boundary)

`BarcodeDetector` is a newer native API: Chromium-based browsers (Chrome / Edge / Android WebView) and some platforms support it; Firefox and iOS Safari have long lacked it or ship it experimentally. The component feature-detects per environment; unsupported environments are not a broken experience — manual mode works out of the box. A pure-TS software decoder is out of scope for this release; hosts needing full-browser scanning should integrate a third-party decoding library and bridge it through the same `oas-scan` event protocol.

## Accessibility

- The video area carries `role="img"` with a built-in `aria-label` (Chinese「相机扫描画面」/ English "Camera scan preview"; overridable via the `aria-label` attribute).
- The status area carries `role="status"`: state changes (scanning / unsupported / permission denied / camera error) are announced by screen readers.
- The manual row associates its `<label>` to the input via `for`; `<form>` semantics make Enter submit directly; the confirm button is keyboard-reachable, and the focus ring uses library tokens (falling back to a system-color outline under forced-colors).

## API

### oas-scanner

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Starts camera scanning (presence requests getUserMedia and begins preview); falls back to manual input when BarcodeDetector is unavailable, permission is denied, or the camera errors | `boolean` | — |
| `aria-label` | Accessible name of the component, defaults to i18n | — | — |
| `manual` | Always show the manual input row (also entered automatically when the camera or permission is unavailable) | `boolean` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `start` | `start(): void` | Start camera scanning (equivalent to setting the `active` attribute) |
| `stop` | `stop(): void` | Stop the camera and release the media stream (equivalent to removing the `active` attribute) |

#### Events

| Event | Description |
| --- | --- |
| `oas-error` | Fired when camera or recognition capability is unavailable, detail { code }: `not-supported` (no BarcodeDetector) / `permission` (permission denied) / `camera` (camera error); the component falls back to manual input mode after firing |
| `oas-scan` | Fired when a code is recognized, detail { value, format? }; consecutive identical fingerprints are not re-fired, and detection auto-resumes after a throttling delay |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-scanner-height` | `220px` |

#### Parts

`root` / `viewport` / `video` / `status` / `manual` / `input` / `submit` are customizable via `::part()`.

<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-scanner').then(() => {
    const basic = document.getElementById('scanner-basic')
    const basicOut = document.getElementById('scanner-toggle-out')
    document.getElementById('scanner-toggle-btn')?.addEventListener('click', () => {
      basic?.start()
      if (basicOut) basicOut.textContent = 'Camera requested: preview starts after authorization; falls back to manual mode if unsupported'
    })
    document.getElementById('scanner-stop-btn')?.addEventListener('click', () => {
      basic?.stop()
      if (basicOut) basicOut.textContent = 'Stopped and camera released'
    })
    const manual = document.getElementById('scanner-manual')
    const manualOut = document.getElementById('scanner-manual-out')
    manual?.addEventListener('oas-scan', (e) => {
      const d = (e as CustomEvent).detail as { value: string }
      if (manualOut) manualOut.textContent = `oas-scan fired: value="${d.value}" (input cleared; repeated submits of the same value do not re-fire)`
    })
    const events = document.getElementById('scanner-events')
    const eventsOut = document.getElementById('scanner-events-out')
    events?.addEventListener('oas-scan', (e) => {
      const d = (e as CustomEvent).detail as { value: string; format?: string }
      if (eventsOut) eventsOut.textContent = `oas-scan: value="${d.value}"${d.format ? ` format=${d.format}` : ''}`
    })
    events?.addEventListener('oas-error', (e) => {
      const d = (e as CustomEvent).detail as { code: string }
      if (eventsOut) eventsOut.textContent = `oas-error: code=${d.code} (fell back to manual input)`
    })
  })
})
</script>
