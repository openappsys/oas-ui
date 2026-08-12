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

`max` limits the maximum number of selectable files; `accept` filters file types.

## Auto Upload

<DemoBlock title="Auto upload (simulated progress)">
  <oas-upload auto-upload multiple></oas-upload>
</DemoBlock>

With `auto-upload`, adding a file automatically simulates upload progress; the progress bar reuses `oas-progress`.

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
onMounted(() => {
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
})
</script>

## API

### Attributes

| Attribute     | Description                       | Type      | Default |
| ------------- | --------------------------------- | --------- | ------- |
| `accept`      | Accepted file types               | `string`  | —       |
| `auto-upload` | Auto-simulate upload after adding | `boolean` | —       |
| `disabled`    | Disabled                          | `boolean` | —       |
| `files`       | File list (property, `File[]`)    | `File[]`  | `[]`    |
| `max`         | Maximum number of files           | `string`  | `0`     |
| `multiple`    | Multiple selection                | `boolean` | —       |

### Events

| Event        | Description                                          |
| ------------ | ---------------------------------------------------- |
| `oas-change` | File list change, `detail: { files }`                |
| `oas-remove` | File removed, `detail: { file, index }`              |
| `oas-upload` | Upload progress, `detail: { file, percent, status }` |

Keyboard: `Enter` / `Space` on the drop zone opens the file picker; remove buttons are focusable.
