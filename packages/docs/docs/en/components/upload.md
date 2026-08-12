# Upload

Click or drag to select files; displays the file list and upload progress.

## Basic Usage

<DemoBlock title="Basic (select files)">
  <oas-upload></oas-upload>
</DemoBlock>

## Multiple & Limit

<DemoBlock title="Multiple + max">
  <oas-upload multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

`max` limits the maximum number of selectable files; `accept` filters file types. Files exceeding `max` are rejected and an `oas-exceed` event is emitted.

## Auto Upload

<DemoBlock title="Auto upload (simulated progress)">
  <oas-upload auto-upload multiple></oas-upload>
</DemoBlock>

With `auto-upload`, adding a file automatically simulates upload progress; the progress bar reuses `oas-progress`.

## Drag & Drop

<DemoBlock title="Drag & drop upload">
  <oas-upload id="upload-drag" multiple auto-upload></oas-upload>
</DemoBlock>

Drag files directly into the dashed area and release to add them (multiple supported); the area highlights while dragging. When `disabled`, the drag shows a not-allowed cursor and drops are ignored.

## Picture Wall

`list-type` controls the list style: `list` (default, text rows), `picture` (rows with small thumbnails), `picture-card` (card thumbnail wall).

### picture-card

<DemoBlock title="Picture wall (picture-card)">
  <oas-upload id="upload-wall" list-type="picture-card" multiple max="4" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

Image files render thumbnails (`URL.createObjectURL`); non-image files show a file icon and name. Click a thumbnail to open the preview overlay (close with Esc or by clicking the mask); remove via the top-right ×, and hover shows preview/remove actions.

### Remove, preview & max rejection

<DemoBlock title="Picture wall · remove/preview/exceed">
  <oas-upload id="upload-wall-exceed" list-type="picture-card" multiple max="3" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

A 4th file is rejected by `max="3"` and triggers `oas-exceed` with a warning; clicking a thumbnail triggers `oas-preview`.

### picture rows with thumbnails

<DemoBlock title="Rows with thumbnails (picture)">
  <oas-upload list-type="picture" multiple auto-upload></oas-upload>
</DemoBlock>

### At the max

<DemoBlock title="Reached max (pre-filled with 3)">
  <oas-upload id="upload-full" list-type="picture-card" multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

Pre-filled to `max="3"`; further selections are rejected via `oas-exceed`.

## Disabled

<DemoBlock title="Disabled">
  <oas-upload disabled></oas-upload>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-upload id="upload-event" multiple></oas-upload>
  <span id="upload-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

Listen to `oas-change` / `oas-remove` / `oas-upload`:

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  const el = document.getElementById('upload-event')
  const out = document.getElementById('upload-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.files.length} files`
  })
  el?.addEventListener('oas-remove', () => {
    out.textContent = `oas-remove`
  })
  el?.addEventListener('oas-upload', (e) => {
    out.textContent = `oas-upload: ${e.detail.file.name} ${e.detail.percent}%`
  })

  // Picture wall: max rejection + preview feedback
  const wall = document.getElementById('upload-wall-exceed')
  wall?.addEventListener('oas-exceed', (e) => {
    message.warning(`Up to ${e.detail.max} files`)
  })
  wall?.addEventListener('oas-preview', (e) => {
    message.info(`Preview: ${e.detail.file.name}`)
  })

  // At-the-max demo: pre-fill 3 SVG images (max="3")
  const full = document.getElementById('upload-full')
  if (full) {
    const photo = (i) =>
      new File(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#4d9fff"/></linearGradient></defs><rect width="200" height="200" rx="12" fill="url(#g)" opacity="0.92"/><text x="100" y="122" font-size="76" font-family="sans-serif" fill="#ffffff" text-anchor="middle">${i}</text></svg>`,
        ],
        `photo-${i}.svg`,
        { type: 'image/svg+xml' },
      )
    full.files = [photo(1), photo(2), photo(3)]
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accept` | Accepted file types | `string` | — |
| `auto-upload` | Auto-simulate upload after adding | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `files` | File list (property, `File[]`) | `File[]` | `[]` |
| `list-type` | List style: `list` (default) / `picture` (rows with thumbnails) / `picture-card` (card thumbnail wall) | `ListType` | `list` |
| `max` | Maximum number of files | `string` | `0` |
| `multiple` | Multiple selection | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | File list change, `detail: { files }` |
| `oas-exceed` | Files rejected by the max limit, `detail: { files, max, total }` |
| `oas-preview` | Preview overlay opened, `detail: { file, url }` |
| `oas-remove` | File removed, `detail: { file, index }` |
| `oas-upload` | Upload progress, `detail: { file, percent, status }` |

Keyboard: `Enter` / `Space` on the drop zone opens the file picker; remove buttons are focusable; the preview overlay closes with Esc.
