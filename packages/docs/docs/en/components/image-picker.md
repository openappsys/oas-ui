---
description: "Multi-image picker: click or drag to select, thumbnail grid preview, reorder and remove, count limit (fires exceed-limit), with files exposed as File[] for the upload chain."
---

# ImagePicker

A multi-image picker: click or drag to select → thumbnail grid → reorder / remove, with a count limit. The component does not upload; `files` is handed to the host's upload chain as `File[]`.

## Basic usage

<DemoBlock title="max=6">
  <oas-image-picker id="ip-basic" max="6"></oas-image-picker>
  <p id="ip-basic-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">No images selected yet</p>
</DemoBlock>

Click “Add image” to pick files, or drop images onto the component. Each thumbnail has move-forward / remove / move-backward actions (keyboard accessible).

## Count limit

Files beyond `max` are dropped and `oas-exceed-limit` is dispatched; once full, the add tile is hidden and the counter shows selected / max.

<DemoBlock title="max=2 (pick 3 to see the feedback)">
  <oas-image-picker id="ip-limit" max="2"></oas-image-picker>
  <p id="ip-limit-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Limit: 2 images</p>
</DemoBlock>

## Readonly and disabled

<DemoBlock title="disabled">
  <oas-image-picker disabled max="4"></oas-image-picker>
</DemoBlock>

<DemoBlock title="readonly (preview only)">
  <oas-image-picker readonly max="4"></oas-image-picker>
</DemoBlock>

- `disabled`: the add tile and all reorder/remove buttons are disabled
- `readonly`: the add entry is hidden and action buttons are disabled (for post-submit display)

## Type filtering and capture

`accept` passes through the native type filter (extensions or MIME types, comma separated); filtered-out files dispatch `oas-reject`. `capture` makes mobile browsers open the camera directly.

<DemoBlock title="accept only .jpg / .jpeg + capture">
  <oas-image-picker id="ip-accept" accept=".jpg,.jpeg" capture max="4"></oas-image-picker>
  <p id="ip-accept-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Try picking a PNG: it is rejected with feedback</p>
</DemoBlock>

## Auto compression and EXIF orientation (compress)

Automatic compression of picked images (default off; when enabled it only applies to **newly picked** files; controlled `files` writes are never compressed — what the host provides is final):

- `compress=""`: enable with defaults (quality 0.8 / max-dimension 4096)
- `compress='{"quality":0.8,"max-dimension":1920}'`: JSON overrides (quality 0–1, longest-edge pixel cap with proportional downscale)
- JPEG / WebP are re-encoded at the configured quality; PNG keeps transparency (kept as-is when no resize is needed); GIF / SVG and other types pass through untouched
- EXIF orientation: modern browsers already decode `<img>` upright per EXIF (sideways phone shots display correctly), so compression only scales proportionally and **never re-applies a rotation**; re-encoded output is upright (JPEG/WebP/PNG re-encoding carries no orientation marker)
- The source file's EXIF Orientation is reported as **meta info**: `compressed[].orientation` (1 = no orientation marker), so hosts can tell whether the original carried one
- Decode failure / canvas unavailable: graceful degradation keeps the original file (meta entry stays null)
- While enabled, `oas-change` detail carries a `compressed` array (aligned with `files`): each entry is `{ originalWidth, originalHeight, width, height, orientation, quality }` (original → compressed size) or `null` (untouched)
- Invalid configuration warns once in dev and behaves as off (detail returns to the current shape without `compressed`)

<DemoBlock title="compress auto compression (pick an image to see the compression meta)">
  <oas-image-picker id="ip-compress" compress='{"quality":0.8,"max-dimension":1920}' max="4"></oas-image-picker>
  <p id="ip-compress-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Pick an image to see the compression meta here</p>
</DemoBlock>

## Working with the upload chain

`files` is a JS property (not reflected to attributes); host assignment applies silently and dispatches no event, so echo-back in a form is straightforward.

```js
const picker = document.querySelector('oas-image-picker')
picker.addEventListener('oas-change', async (e) => {
  const form = new FormData()
  for (const file of e.detail.files) form.append('images', file)
  await fetch('/api/upload', { method: 'POST', body: form })
})

// Echo existing images (e.g. an edit form)
picker.files = existingFiles
```

## Events

| Event | When | detail |
| --- | --- | --- |
| `oas-change` | After the user adds / removes / reorders | `{ files, count }` |
| `oas-exceed-limit` | The selection exceeds the limit (extra files dropped; dispatched after `oas-change`) | `{ count, max }` |
| `oas-reject` | A file is filtered out by `accept` | `{ files }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const basic = document.getElementById('ip-basic')
  const basicOut = document.getElementById('ip-basic-out')
  basic?.addEventListener('oas-change', (e) => {
    const names = e.detail.files.map((f) => f.name)
    log(basicOut, names.length ? `Selected ${names.length}: ${names.join(', ')}` : 'No images selected yet')
  })
  basic?.addEventListener('oas-exceed-limit', (e) => log(basicOut, `Over the limit: ${e.detail.count} selected, max ${e.detail.max}`))
  basic?.addEventListener('oas-reject', (e) => log(basicOut, `Ignored ${e.detail.files.length} non-image file(s)`))

  const limit = document.getElementById('ip-limit')
  const limitOut = document.getElementById('ip-limit-out')
  limit?.addEventListener('oas-change', (e) => log(limitOut, `Selected ${e.detail.count} / ${limit.getAttribute('max')}`))
  limit?.addEventListener('oas-exceed-limit', (e) => log(limitOut, `Over the limit (${e.detail.count}); only the first ${e.detail.max} kept`))

  // Type filter: accept=".jpg,.jpeg" rejects everything else
  const acceptOnly = document.getElementById('ip-accept')
  const acceptOut = document.getElementById('ip-accept-out')
  acceptOnly?.addEventListener('oas-change', (e) => log(acceptOut, `Selected ${e.detail.count} .jpg / .jpeg image(s)`))
  acceptOnly?.addEventListener('oas-reject', (e) => log(acceptOut, `Ignored ${e.detail.files.length} non-jpg file(s)`))

  // Auto compression: oas-change detail.compressed aligns with files (original → compressed size / source orientation marker)
  const compress = document.getElementById('ip-compress')
  const compressOut = document.getElementById('ip-compress-out')
  compress?.addEventListener('oas-change', (e) => {
    const metas = e.detail.compressed ?? []
    const parts = e.detail.files.map((f, i) => {
      const m = metas[i]
      if (!m) return `${f.name} (untouched)`
      const marked = m.orientation > 1 ? `, source carried EXIF ${m.orientation} marker (output is upright)` : ''
      return `${f.name} (${m.originalWidth}×${m.originalHeight} → ${m.width}×${m.height}${marked})`
    })
    log(compressOut, parts.join('; ') || 'No images selected yet')
  })
})
</script>

## API

### oas-image-picker

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accept` | File type filter (native `accept` syntax, default `image/*`) | `string` | `image/*` |
| `capture` | Passes through native `capture`: opens the camera directly on mobile | `boolean` | — |
| `compress` | Auto compression for picked images (default off = byte-identical to current behavior): empty string = defaults (quality 0.8 / max-dimension 4096); JSON `{"quality":0.8,"max-dimension":1920}` overrides; invalid warns once and behaves as off. Only applies to newly picked files (controlled files writes are never compressed); EXIF orientation is handled by the browser's upright decoding — output is always upright, with the source orientation marker reported as orientation meta; while active oas-change detail carries the compressed meta array | `string` | — |
| `disabled` | Disabled: adding, reordering and removing are all unavailable | `boolean` | — |
| `max` | Max image count (default 9); invalid/non-positive values fall back with a warning | `string` | — |
| `readonly` | Preview only: add entry hidden and action buttons disabled | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `files` | Current image list (`File[]`, controlled): assignment refreshes silently; only user interaction dispatches `oas-change` | `File[]` | `[]` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `removeAt` | `removeAt(index: number): void` | Remove the image at `index` (out-of-range ignored, dispatches `oas-change`) |
| `move` | `move(index: number, delta: number): void` | Move an image by `delta` (±1, out-of-range ignored, dispatches `oas-change`) |
| `open` | `open(): void` | Open the system file picker (requires a user gesture) |
| `clear` | `clear(): void` | Clear the list (dispatches `oas-change`) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | After the user adds / removes / reorders, `detail: { files, count }` |
| `oas-exceed-limit` | The selection exceeds the limit, `detail: { count, max }` (extra files dropped; dispatched after `oas-change`) |
| `oas-reject` | Files filtered out by `accept`, `detail: { files }` |
