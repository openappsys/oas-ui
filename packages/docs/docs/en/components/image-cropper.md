---
description: Image cropping with fixed/free-ratio crop frame, drag-to-pan framing, cursor-anchored wheel zoom, 90° rotation and arrow-key nudging, exporting a Blob / dataURL for the upload chain (crop → File → upload).
---

# ImageCropper

Move / resize the crop frame, drag the image to reframe it, and zoom or rotate inside the stage, then confirm to get the result. Use it standalone (avatar / cover cropping) or as an upload pre-step: pick → crop → upload.

## Basic usage (free ratio)

Drag the crop frame to move it and its corners to resize; drag anywhere outside the frame to pan the image; the toolbar zooms, rotates and resets. Confirming dispatches `oas-crop`.

<DemoBlock title="Free ratio (drag + zoom + rotate)">
  <oas-image-cropper id="ic-free" src="/assets/demo-wide-1.svg"></oas-image-cropper>
  <p id="ic-free-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Adjust, then click “Crop”</p>
</DemoBlock>

## Panning and framing

The image can be panned: press and drag on the stage **outside the crop frame** (dragging inside the frame still moves the frame), or use `Alt` + arrow keys (`Shift` steps 10px). Panning always honours **the image covers the crop frame** — going past the allowed range is clamped back, so the stage never shows its background.

Scrolling the wheel over the stage zooms **anchored at the cursor** (the content under the cursor stays put). Wheel handling is tiered: trackpad two-finger scrolls (pixel deltas) zoom continuously — one 25% step per 100px of travel, clamped to 50% per event, so small movements no longer jump a whole step; a classic mouse-wheel notch is ~100px (deltaY=100 platforms land exactly one 25% step, deltaY=120 platforms ≈30% per notch, both within the per-event clamp); Firefox line-mode wheels keep the discrete 25% step too. `Ctrl` / `⌘` + wheel is the browser page-zoom gesture and is left alone. The zoom slider and `+` / `−` buttons zoom around the stage centre (25% per click).

<DemoBlock title="Drag to pan + wheel zoom (16:9)">
  <oas-image-cropper id="ic-pan" src="/assets/demo-wide-2.svg" aspect-ratio="16/9"></oas-image-cropper>
  <p id="ic-pan-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Drag outside the frame to pan, wheel to zoom</p>
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

## Output options

`max-zoom` caps the zoom factor (shared by the slider and the `+` / `−` buttons), `max-output-size` caps the long edge of the exported image, and `output-type` picks the format (`image/png` / `image/jpeg` / `image/webp`). In the instances below the left one stops at 2×, while the right one exports JPEG with a 640px long-edge cap.

<DemoBlock title="max-zoom=2 · max-output-size=640 · output-type=image/jpeg">
  <oas-image-cropper id="ic-zoom" src="/assets/demo-wide-2.svg" max-zoom="2"></oas-image-cropper>
  <oas-image-cropper id="ic-output" src="/assets/demo-wide-2.svg" aspect-ratio="1" max-output-size="640" output-type="image/jpeg"></oas-image-cropper>
  <p id="ic-output-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Click “Crop” to see the export type and size</p>
</DemoBlock>

## Load failure

When the image behind `src` cannot be loaded, `oas-error` is dispatched and the stage shows an error message instead of a broken image.

<DemoBlock title="Unavailable src (error state)">
  <oas-image-cropper id="ic-error" src="/assets/not-found.png"></oas-image-cropper>
  <p id="ic-error-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Waiting for load…</p>
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

The crop frame is focusable: arrow keys move it by 1px, `Shift` + arrow keys by 10px; `Alt` + arrow keys pan the image (`Shift` steps 10px). The zoom slider and toolbar buttons are native controls.

<DemoBlock title="oas-change / oas-crop">
  <oas-image-cropper id="ic-event" src="/assets/demo-wide-2.svg" aspect-ratio="4/3"></oas-image-cropper>
  <p id="ic-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Waiting for interaction…</p>
</DemoBlock>

| Event | When | detail |
| --- | --- | --- |
| `oas-change` | After zoom / rotate / crop-frame adjustment / image pan | `{ zoom, rotation, frame, offset }` |
| `oas-crop` | “Crop” is clicked | `{ blob, zoom, rotation, frame, offset }` (`blob` is null when canvas is unavailable) |
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

  // Output options: export type and pixel size
  const output = document.getElementById('ic-output')
  const outputOut = document.getElementById('ic-output-out')
  output?.addEventListener('oas-crop', (e) => {
    const { blob, frame } = e.detail
    const size = blob ? `${blob.type || 'unknown type'} · ${Math.round(blob.size / 1024)} KB` : 'blob unavailable'
    log(outputOut, `Exported ${size} (frame ${Math.round(frame.width)}×${Math.round(frame.height)} stage px)`)
  })

  // Load failure state
  const err = document.getElementById('ic-error')
  const errOut = document.getElementById('ic-error-out')
  err?.addEventListener('oas-error', (e) => log(errOut, `oas-error: failed to load ${e.detail.src}`))
  err?.addEventListener('oas-load', (e) => log(errOut, `oas-load: ${e.detail.width}×${e.detail.height}`))

  // Panning: drag outside the frame to pan, wheel zooms anchored at the cursor
  const pan = document.getElementById('ic-pan')
  const panOut = document.getElementById('ic-pan-out')
  pan?.addEventListener('oas-change', (e) => {
    const { zoom, offset } = e.detail
    log(
      panOut,
      `Image offset x ${Math.round(offset.x)}px / y ${Math.round(offset.y)}px, zoom ${Math.round(zoom * 100)}% (clamped at the edges)`,
    )
  })
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
| `offset` | Current image offset `{ x, y }` (pixels from the stage centre, read-only; already clamped by the “image covers the crop frame” constraint) | `CropOffset` | — |
| `rotation` | Current rotation in degrees (normalized 0–360, read-only; any angle can be set via `rotate()`) | `number` | `0` |
| `zoom` | Current zoom (starts at 1). Writes apply immediately but dispatch **no event** — `oas-change` only reports user interaction, so echoing `el.zoom` back from the handler cannot recurse | `number` | `1` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `setZoom` | `setZoom(value: number): void` | Set zoom (clamped to `[1, max-zoom]`, dispatches `oas-change` only when the value actually changes) |
| `rotate` | `rotate(delta: number): void` | Rotate by a delta (default +90°; accepts any angle, dispatches `oas-change`) |
| `reset` | `reset(): void` | Restore initial zoom / rotation / image offset / crop frame (dispatches `oas-change`) |
| `toBlob` | `toBlob(type?: string, quality?: number): Promise<Blob \| null>` | Export the crop as a Blob (null when canvas is unavailable) |
| `toDataURL` | `toDataURL(type?: string, quality?: number): string` | Export the crop as a dataURL (empty string when canvas is unavailable) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | After zoom / rotate / crop-frame adjustment / image pan, `detail: { zoom, rotation, frame, offset }` |
| `oas-crop` | Crop confirmed, `detail: { blob, zoom, rotation, frame, offset }`; `blob` is null when canvas is unavailable |
| `oas-error` | Image failed to load, `detail: { src }` |
| `oas-load` | Image loaded, `detail: { width, height }` |
