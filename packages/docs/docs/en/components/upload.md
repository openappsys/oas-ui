# Upload

Click or drag to select files; displays the file list and upload progress. Supports a real upload channel (`action` XHR / `custom-request` escape hatch), before-upload validation & transform, failure retry and cancel.

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

With `auto-upload`, adding a file automatically starts uploading. When neither `action` nor `custom-request` is set, progress is **simulated** (built-in timer fallback, no network request); the progress bar reuses `oas-progress`.

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

Image files render thumbnails (`URL.createObjectURL`); non-image files show a file icon and name. Click a thumbnail to open the preview overlay (close with Esc or by clicking the mask); remove via the top-right ×, and hover shows preview/remove actions. A circular avatar card can be achieved with the CSS variable `--oas-upload-card-radius: 50%`.

### Remove, preview & max rejection

<DemoBlock title="Picture wall · remove/preview/exceed">
  <oas-upload id="upload-wall-exceed" list-type="picture-card" multiple max="3" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

A 4th file is rejected by `max="3"` and triggers `oas-exceed` with a warning; clicking a thumbnail triggers `oas-preview`.

### picture rows with thumbnails

<DemoBlock title="Rows with thumbnails (picture)">
  <oas-upload list-type="picture" multiple auto-upload></oas-upload>
</DemoBlock>

In `list` / `picture` modes, clicking the **file name** also opens the preview overlay (the name is a focusable button).

### At the max

<DemoBlock title="Reached max (pre-filled with 3)">
  <oas-upload id="upload-full" list-type="picture-card" multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

Pre-filled to `max="3"`; further selections are rejected via `oas-exceed`.

## Disabled

<DemoBlock title="Disabled">
  <oas-upload disabled></oas-upload>
</DemoBlock>

## Real Upload Channel (action)

With `action` set, the built-in XHR channel is used: `name` (form file field, default `file`), `data` (extra form fields JSON), `headers` (request headers JSON), `method` (default `POST`) and `with-credentials` are passed through; progress/success/failure come from real XHR events.

<DemoBlock title="action channel (with failure/retry demo)">
  <oas-upload id="upload-action" action="/api/upload" name="file" data='{"biz":"demo"}' method="POST" with-credentials auto-upload multiple></oas-upload>
</DemoBlock>

The docs site has no real upload endpoint — `/api/upload` returns 404, which conveniently demonstrates the **failure state**: the row turns red with a retry button (⟳); clicking retry re-sends the request; while uploading you can click × to cancel (emits `oas-cancel`). Success emits `oas-success` (`detail: { file, response }`, where `response` is parsed JSON or raw text); failure emits `oas-error` (`detail: { file, response, status }`).

## Custom Request Channel (custom-request)

Chunked uploads, object-storage direct upload, WebSocket and other non-standard channels are taken over by the `custom-request` function property (the component does not care about request strategy):

<DemoBlock title="custom-request takes over the request">
  <oas-upload id="upload-request" auto-upload multiple></oas-upload>
</DemoBlock>

```js
el.customRequest = ({ file, name, action, onProgress, onSuccess, onError }) => {
  // send the request yourself; callback pacing is controlled by the host
  onProgress({ percent: 60 })
  onSuccess({ url: 'https://example.com/f.png' }) // or onError({ status: 500 })
  return { abort: () => {/* cancel */} } // optional: a cancel button appears while uploading
}
```

## Manual Upload

Without `auto-upload` the component is in manual mode: after selecting files, call `submit()` (an alias of `startUpload()`) to upload them together.

<DemoBlock title="Manual upload (submit together)">
  <oas-upload id="upload-manual" multiple></oas-upload>
  <oas-button type="primary" size="small" id="upload-manual-btn" style="margin-top: var(--oas-space-2)">Start upload</oas-button>
</DemoBlock>

## Before Upload (validation & transform)

The `before-upload` function property: return `false` to reject a file; return a new `File` to transform (rename/compress); async `Promise` is supported.

<DemoBlock title="before-upload validation & transform">
  <oas-upload id="upload-before" multiple></oas-upload>
</DemoBlock>

## File Size Limit (max-size)

`max-size` accepts bytes or a unit form (`512KB` / `2MB` / `1GB`); oversized files are rejected with `oas-exceed` (`detail.type === 'size'`, including the `maxSize` in bytes).

<DemoBlock title="max-size (100KB)">
  <oas-upload id="upload-size" multiple max-size="100KB"></oas-upload>
</DemoBlock>

## Replace on Exceed

With `replace`, exceeding the count limit no longer rejects: the oldest file is removed to make room (for `max=1` / single-select this is "new replaces old" — no more "delete first, then select" for avatar-like scenarios).

<DemoBlock title="replace (max=1, selecting a new file replaces the old)">
  <oas-upload id="upload-replace" max="1" replace></oas-upload>
</DemoBlock>

## Directory & Paste Upload

`directory` enables directory upload (sets `webkitdirectory` on the input; the list shows relative paths). `paste` enables paste upload (Ctrl+V clipboard files directly on the component — great for screenshots; off by default).

<DemoBlock title="Directory upload (directory)">
  <oas-upload id="upload-dir" directory multiple></oas-upload>
</DemoBlock>

<DemoBlock title="Paste upload (paste)">
  <oas-upload id="upload-paste" paste multiple tip="Click to select files, or focus this area and Ctrl+V to paste a screenshot"></oas-upload>
</DemoBlock>

## Trigger, Tip & Item Customization

- `slot="trigger"`: replaces the drop zone content (click/drag semantics stay on the zone container; the content should be focusable itself, e.g. an `oas-button`)
- `tip` attribute or `template[slot="tip"]`: secondary hint text below the zone (attribute wins)
- `template[slot="item"]`: cloned into every `list` / `picture` row; `[data-item-name]` / `[data-item-size]` bind the file name and size automatically

<DemoBlock title="trigger / tip slots">
  <oas-upload id="upload-trigger" multiple tip="Any file type, up to 20MB each">
    <template slot="trigger">
      <oas-button>Select files</oas-button>
      <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">or drop files here</span>
    </template>
  </oas-upload>
</DemoBlock>

<DemoBlock title="item slot (custom list rows)">
  <oas-upload id="upload-item" multiple>
    <template slot="item">
      <oas-icon name="form" size="16"></oas-icon>
      <b data-item-name></b>
      <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)" data-item-size></span>
    </template>
  </oas-upload>
</DemoBlock>

## Echo Back & Hiding the List

- The `files` / `defaultFiles` properties accept `{ name, url, size? }` echo records (status done, preview uses the remote url) — the initial-value semantics for edit scenarios
- `show-file-list="false"` hides the built-in list, leaving only the trigger area (premise for host-drawn previews)

<DemoBlock title="Echo back (defaultFiles)">
  <oas-upload id="upload-echo" list-type="picture" multiple></oas-upload>
</DemoBlock>

<DemoBlock title="Avatar (show-file-list=false + custom trigger + before-upload validation)">
  <oas-upload id="upload-avatar" accept="image/*" replace show-file-list="false" list-type="picture-card">
    <template slot="trigger">
      <img id="upload-avatar-img" alt="Avatar preview" style="width: 104px; height: 104px; object-fit: cover; border-radius: var(--oas-upload-card-radius, var(--oas-radius-md)); display: none" />
      <oas-icon name="user" size="28"></oas-icon>
      <span style="font-size: var(--oas-font-size-xs)">Click or drag to upload an avatar</span>
    </template>
  </oas-upload>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-upload id="upload-event" multiple></oas-upload>
  <span id="upload-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

Listen to `oas-change` / `oas-remove` / `oas-upload`:

- `oas-upload`: progress, `detail: { file, percent, status }` (`status`: pending/uploading/done/error)
- `oas-success` / `oas-error`: upload success/failure (real channel), `detail: { file, response, status? }`
- `oas-retry` / `oas-cancel`: retry started / upload cancelled, `detail: { file }`
- `oas-exceed`: rejection, `detail: { files, max, total }` (count) or `{ files, type: 'size', maxSize, total }` (size)
- `oas-remove`: file removed, `detail: { file, index, replaced? }` (`replaced: true` means removed by the `replace` semantics)

Methods: `submit()` (manual upload), `startUpload()` (equivalent), `abort(file?)` (cancel one/all in-flight uploads).

## Third-party Composition Scenarios

These scenarios are not part of the component API; compose them via existing channels:

```js
// Large-file chunking / object-storage direct upload: take over via custom-request
// (chunking strategy is a business decision)
el.customRequest = async ({ file, onProgress, onSuccess, onError }) => {
  const chunks = sliceFile(file, 5 * 1024 * 1024) // chunk it yourself
  for (let i = 0; i < chunks.length; i++) {
    await uploadChunk(chunks[i], i)
    onProgress({ percent: ((i + 1) / chunks.length) * 100 })
  }
  onSuccess(await assembleChunks(file))
}
```

- **Avatar cropping**: `before-upload` returns the cropped new `File` (with a third-party cropper)
- **List drag sorting**: customize rows via the `item` slot + reorder `files` with a third-party dnd library
- **Circular avatar card**: CSS variable `--oas-upload-card-radius: 50%` (no separate enum)

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

  // Real channel (action): no endpoint on the docs site, 404 → failure + retry demo
  const action = document.getElementById('upload-action')
  action?.addEventListener('oas-success', (e) => {
    message.success(`${e.detail.file.name} uploaded`)
  })
  action?.addEventListener('oas-error', (e) => {
    message.error(`${e.detail.file.name} failed (HTTP ${e.detail.status ?? '?'}), click retry`)
  })

  // custom-request: host takes over the request (no network dependency)
  const req = document.getElementById('upload-request')
  if (req) {
    req.customRequest = ({ file, onProgress, onSuccess }) => {
      let percent = 0
      const timer = setInterval(() => {
        percent = Math.min(100, percent + 20)
        onProgress({ percent })
        if (percent >= 100) {
          clearInterval(timer)
          onSuccess({ url: `https://example.com/files/${encodeURIComponent(file.name)}` })
        }
      }, 150)
      return { abort: () => clearInterval(timer) }
    }
    req.addEventListener('oas-success', (e) => {
      message.success(`${e.detail.file.name} uploaded: ${e.detail.response.url}`)
    })
  }

  // Manual upload
  const manualBtn = document.getElementById('upload-manual-btn')
  const manual = document.getElementById('upload-manual')
  manualBtn?.addEventListener('click', () => manual?.submit())

  // before-upload: validate (size) + transform (rename)
  const before = document.getElementById('upload-before')
  if (before) {
    before.beforeUpload = (file) => {
      if (file.size > 100 * 1024) {
        message.warning(`${file.name} exceeds 100KB, rejected`)
        return false
      }
      const renamed = new File([file], `demo-${Date.now()}-${file.name}`, { type: file.type })
      message.info(`Transformed name: ${renamed.name}`)
      return renamed
    }
  }

  // max-size feedback
  const size = document.getElementById('upload-size')
  size?.addEventListener('oas-exceed', (e) => {
    if (e.detail.type === 'size') {
      message.warning(`${e.detail.files[0].name} exceeds ${Math.round(e.detail.maxSize / 1024)}KB, rejected`)
    } else {
      message.warning('Count limit exceeded')
    }
  })

  // replace feedback
  const rep = document.getElementById('upload-replace')
  rep?.addEventListener('oas-remove', (e) => {
    if (e.detail.replaced) message.info(`Old file "${e.detail.file.name}" was replaced`)
  })

  // Echo back (defaultFiles: {name, url} records, status done)
  const echo = document.getElementById('upload-echo')
  if (echo) {
    const svg = (color, text) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="12" fill="${color}"/><text x="60" y="74" font-size="44" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${text}</text></svg>`,
      )}`
    echo.defaultFiles = [
      { name: 'brand-logo.svg', url: svg('#0b6cff', 'A'), size: 2048 },
      { name: 'poster.svg', url: svg('#18a058', 'B'), size: 4096 },
    ]
    echo.addEventListener('oas-preview', (e) => {
      message.info(`Preview: ${e.detail.file.name}`)
    })
  }

  // Avatar: before-upload validation + custom preview
  const avatar = document.getElementById('upload-avatar')
  if (avatar) {
    const img = document.getElementById('upload-avatar-img')
    avatar.beforeUpload = (file) => {
      if (!file.type.startsWith('image/')) {
        message.warning('Avatar must be an image')
        return false
      }
      if (file.size > 2 * 1024 * 1024) {
        message.warning('Avatar must be under 2MB')
        return false
      }
      return true
    }
    avatar.addEventListener('oas-change', (e) => {
      const f = e.detail.files[e.detail.files.length - 1]
      if (f && img) {
        img.src = URL.createObjectURL(f)
        img.style.display = 'block'
      }
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accept` | Accepted file types | `string` | — |
| `action` | Upload endpoint URL (real XHR channel; without it and customRequest, progress is simulated) | `string` | — |
| `auto-upload` | Auto-simulate upload after adding | `boolean` | — |
| `data` | Extra form fields (JSON string, submitted with the file) | — | — |
| `directory` | Directory upload (recursive folder intake) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `files` | File list (property, `File[]`) | `Array<File \| UploadEchoFile>` | `[]` |
| `headers` | Extra request headers (JSON string) | — | — |
| `list-type` | List style: `list` (default) / `picture` (rows with thumbnails) / `picture-card` (card thumbnail wall) | `string` | `list` |
| `max` | Maximum number of files | `string` | `0` |
| `max-size` | Per-file size limit (bytes or `2KB`/`1MB`/`1GB`; over limit fires oas-exceed size form) | `string` | — |
| `method` | HTTP method (default POST) | `string` | `POST` |
| `multiple` | Multiple selection | `boolean` | — |
| `name` | Form field name for the file (default `file`) | `string` | `file` |
| `paste` | Paste upload (off by default; clipboard files enter the list when on) | `boolean` | — |
| `replace` | Replace semantics at max-count=1 (new file replaces the old instead of being rejected) | `boolean` | — |
| `show-file-list` | File list visibility (`"false"` hides it, keeping only the drop zone) | `string` | `true` |
| `tip` | Drop-zone tip text (same as `template[slot="tip"]` for rich content) | `string` | — |
| `with-credentials` | Cross-origin credentials | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Upload cancelled, `detail: { file }` (cancel button on the item) |
| `oas-change` | File list change, `detail: { files }` |
| `oas-error` | Upload failed, `detail: { file, response?, status? }` (retry button appears) |
| `oas-exceed` | Files rejected by the max limit, `detail: { files, max, total }` |
| `oas-preview` | Preview overlay opened, `detail: { file, url }` |
| `oas-remove` | File removed, `detail: { file, index }` |
| `oas-retry` | Retry clicked, `detail: { file }` (re-upload after failure) |
| `oas-success` | Upload succeeded, `detail: { file, response }` |
| `oas-upload` | Upload progress, `detail: { file, percent, status }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="item"]` | Custom file row/card (`[data-item-name]`/`[data-item-size]` bindings) |
| `template[slot="tip"]` | Drop-zone tip rich content (tip attribute wins) |
| `trigger` | Replace the drop-zone content (zone semantics kept) |

Keyboard: `Enter` / `Space` on the drop zone opens the file picker; remove buttons are focusable; the preview overlay closes with Esc.
