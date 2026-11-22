---
description: Image cropping with fixed/free-ratio crop frame, zoom, 90° rotation and arrow-key nudging, exporting a Blob / dataURL for the upload chain (crop → File → upload).
---

# ImageCropper

Drag, zoom and rotate the image inside the stage and adjust the crop frame, then confirm to get the result. Use it standalone (avatar / cover cropping) or as an upload pre-step: pick → crop → upload.

## Basic usage (free ratio)

Drag the crop frame to move it and its corners to resize; the toolbar zooms, rotates and resets. Confirming dispatches `oas-crop`.

<DemoBlock title="Free ratio (drag + zoom + rotate)">
  <oas-image-cropper id="ic-free" src="/assets/demo-wide-1.svg"></oas-image-cropper>
  <p id="ic-free-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Adjust, then click “Crop”</p>
</DemoBlock>

## Fixed ratio

`aspect-ratio` locks the crop frame ratio: the frame adapts proportionally to the container, and corner dragging keeps the ratio.

<DemoBlock title="aspect-ratio=1 (square avatar)">
  <oas-image-cropper id="ic-square" src="/assets/demo-wide-1.svg" aspect-ratio="1"></oas-image-cropper>
  <p id="ic-square-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">1:1</p>
</DemoBlock>

<DemoBlock title="aspect-ratio=16/9 (cover)">
  <oas-image-cropper src="/assets/demo-wide-1.svg" aspect-ratio="16/9"></oas-image-cropper>
</DemoBlock>

## Working with the upload chain

```js
const cropper = document.querySelector('oas-image-cropper')
cropper.addEventListener('oas-crop', async (e) => {
  if (!e.detail.blob) return
  const file = new File([e.detail.blob], 'avatar.png', { type: 'image/png' })
  const form = new FormData()
  form.append('avatar', file)
  await fetch('/api/avatar', { method: 'POST', body: form })
})
```

Or call the methods directly: `await cropper.toBlob('image/jpeg', 0.9)` / `cropper.toDataURL()`.

## Events and keyboard

The crop frame is focusable: arrow keys move it by 1px, `Shift` + arrow keys by 10px. The zoom slider and toolbar buttons are native controls.

<DemoBlock title="oas-change / oas-crop">
  <oas-image-cropper id="ic-event" src="/assets/demo-wide-2.svg" aspect-ratio="4/3"></oas-image-cropper>
  <p id="ic-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Waiting for interaction…</p>
</DemoBlock>

| Event | When | detail |
| --- | --- | --- |
| `oas-change` | After zoom / rotate / crop-frame adjustment | `{ zoom, rotation, frame }` |
| `oas-crop` | “Crop” is clicked | `{ blob, zoom, rotation, frame }` (`blob` is null when canvas is unavailable) |
| `oas-load` | Image loaded | `{ width, height }` |
| `oas-error` | Image failed to load | `{ src }` |

## Disabled

<DemoBlock title="disabled">
  <oas-image-cropper disabled src="/assets/demo-wide-1.svg"></oas-image-cropper>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const free = document.getElementById('ic-free')
  const freeOut = document.getElementById('ic-free-out')
  free?.addEventListener('oas-crop', (e) => {
    const { blob, frame, zoom, rotation } = e.detail
    const size = blob ? `${Math.round(blob.size / 1024)} KB` : 'blob unavailable'
    log(freeOut, `Cropped: ${Math.round(frame.width)}×${Math.round(frame.height)} stage px, zoom ${Math.round(zoom * 100)}%, rotation ${rotation}°, output ${size}`)
  })

  const square = document.getElementById('ic-square')
  const squareOut = document.getElementById('ic-square-out')
  square?.addEventListener('oas-crop', (e) => {
    const { blob, frame } = e.detail
    log(squareOut, `Cropped 1:1: ${Math.round(frame.width)}×${Math.round(frame.height)}, output ${blob ? `${Math.round(blob.size / 1024)} KB` : 'blob unavailable'}`)
  })

  const ev = document.getElementById('ic-event')
  const evOut = document.getElementById('ic-event-out')
  ev?.addEventListener('oas-change', (e) => {
    const { zoom, rotation, frame } = e.detail
    log(evOut, `oas-change: zoom ${Math.round(zoom * 100)}%, rotation ${rotation}°, frame ${Math.round(frame.width)}×${Math.round(frame.height)}`)
  })
  ev?.addEventListener('oas-crop', (e) => log(evOut, `oas-crop: ${e.detail.blob ? 'Blob created' : 'blob unavailable'}`))
})
</script>

## API

### oas-image-cropper

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aspect-ratio` | Crop frame ratio: `1` / `16/9` / `0.75` and so on; absent or 0 = free ratio | `string` | — |
| `disabled` | Disables all interaction (toolbar disabled, crop frame not focusable) | `boolean` | — |
| `max-output-size` | Max output long-edge pixels (default 1024); invalid values fall back | `string` | — |
| `max-zoom` | Max zoom factor (default 3); invalid values fall back | `string` | — |
| `output-type` | Output image type, default `image/png` (`image/jpeg` / `image/webp` also valid) | `string` | `image/png` |
| `src` | Image source (`http(s)` / `blob:` / `data:image/*` / relative; executable protocols resolve to empty) | `string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `rotation` | Current rotation in degrees (0 / 90 / 180 / 270, read-only) | `number` | `0` |
| `zoom` | Current zoom (starts at 1; writes apply immediately and dispatch `oas-change`) | `number` | `1` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `setZoom` | `setZoom(value: number): void` | Set zoom (clamped to `[1, max-zoom]`, dispatches `oas-change`) |
| `rotate` | `rotate(delta: number): void` | Rotate by a delta (default +90°, dispatches `oas-change`) |
| `reset` | `reset(): void` | Restore initial zoom / rotation / crop frame (dispatches `oas-change`) |
| `toBlob` | `toBlob(type?: string, quality?: number): Promise<Blob \| null>` | Export the crop as a Blob (null when canvas is unavailable) |
| `toDataURL` | `toDataURL(type?: string, quality?: number): string` | Export the crop as a dataURL (empty string when canvas is unavailable) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | After zoom / rotate / crop-frame adjustment, `detail: { zoom, rotation, frame }` |
| `oas-crop` | Crop confirmed, `detail: { blob, zoom, rotation, frame }`; `blob` is null when canvas is unavailable |
| `oas-error` | Image failed to load, `detail: { src }` |
| `oas-load` | Image loaded, `detail: { width, height }` |
