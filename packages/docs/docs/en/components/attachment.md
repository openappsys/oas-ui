# Attachment

A conversation attachment row: media (icon/thumbnail) + file name/metadata + upload state machine + actions (download/remove/whole-card trigger). For sending files in chats, uploading images to AI conversations, support ticket attachments, etc.

## Basic Usage

<DemoBlock title="Basic attachment rows">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-attachment name="quarterly-report.pdf" detail="PDF · 2.4 MB"></oas-attachment>
    <oas-attachment name="design-spec.md" detail="Markdown · 18 KB" downloadable></oas-attachment>
  </div>
</DemoBlock>

`name` is the file name and `detail` the secondary metadata (type · size); `downloadable` shows the built-in download button (clicking dispatches `oas-download`; the actual download is host-owned).

## Upload state machine (state)

<DemoBlock title="idle / uploading / processing / error / done">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-attachment name="demo.mp4" detail="Video · 48 MB" state="uploading" progress="62"></oas-attachment>
    <oas-attachment name="photo.png" detail="Image · 3.1 MB" state="processing"></oas-attachment>
    <oas-attachment name="backup.zip" detail="Archive · 210 MB" state="error"></oas-attachment>
    <oas-attachment name="contract.pdf" detail="PDF · 860 KB" state="done" removable></oas-attachment>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    `uploading`/`processing` reflect <code>aria-busy</code> and show a spinner; `uploading` renders a thin bottom progress bar (<code>progress</code> 0–100, clamped); `error` shows the localized failure text when <code>detail</code> is absent ("Upload failed"), or keeps the host's text when given.
  </p>
</DemoBlock>

The state vocabulary matches `oas-upload` (library-wide consistency); `removable` shows the remove button (clicking dispatches `oas-remove`; the component never removes itself — removal is a host decision).

## Sizes (size)

<DemoBlock title="default / sm / xs">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-attachment name="presentation.key" detail="Keynote · 24 MB"></oas-attachment>
    <oas-attachment name="presentation.key" detail="Keynote · 24 MB" size="sm"></oas-attachment>
    <oas-attachment name="presentation.key" detail="Keynote · 24 MB" size="xs"></oas-attachment>
  </div>
</DemoBlock>

Three `size` steps: `default` / `sm` (accepts the `small` alias) / `xs`, tightening padding and media per step.

## Vertical layout & thumbnails (orientation / media slot)

<DemoBlock title="vertical + slot=media thumbnail">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <oas-attachment name="cover.png" detail="PNG · 1.2 MB" orientation="vertical">
      <svg slot="media" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Cover thumbnail">
        <rect width="64" height="64" rx="8" fill="var(--oas-color-bg-hover)"/>
        <circle cx="24" cy="24" r="8" fill="var(--oas-color-primary)"/>
        <path d="M8 52 L26 34 L38 46 L48 38 L56 46" stroke="var(--oas-color-text-secondary)" stroke-width="3" fill="none" stroke-linejoin="round"/>
      </svg>
    </oas-attachment>
    <oas-attachment name="backup.zip" detail="ZIP · 210 MB" orientation="vertical" state="error"></oas-attachment>
  </div>
</DemoBlock>

`orientation="vertical"` stacks media above text (narrow columns/cards); any content in `slot="media"` (any `<img>`/`<svg>`, max 64px) overrides the default glyph; with no slotted media the built-in file glyph renders (decorative, `aria-hidden`) — the media form follows naturally from whether the slot has content, no form attribute needed.

## Whole-card trigger (href)

<DemoBlock title="href + oas-open event feedback">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-attachment id="att-open-demo" name="shared-doc.pdf" detail="PDF · 640 KB" href="#"></oas-attachment>
    <p id="att-open-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click the card above to trigger oas-open (this demo blocks navigation and shows feedback).</p>
  </div>
</DemoBlock>

With `href`, the whole card becomes `<a part="trigger">` and clicks dispatch `oas-open` (detail `{ href }`); calling `preventDefault` in the host handler takes over opening (preview/new window) and the component blocks default navigation accordingly.

## Actions & event feedback

<DemoBlock title="removable / downloadable / slot=actions">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-attachment id="att-remove-demo" name="draft-v1.docx" detail="Word · 92 KB" removable downloadable>
      <oas-button slot="actions" size="small" type="text">Forward</oas-button>
    </oas-attachment>
    <p id="att-remove-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click remove/download — received events show up here.</p>
  </div>
</DemoBlock>

The built-in buttons' accessible names include the file name (e.g. "Remove draft-v1.docx" — a bare "Remove" is ambiguous for screen readers); `slot="actions"` appends custom actions (the component owns no specific actions; events come from the slot content).

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  const open = document.querySelector('#att-open-demo')
  open?.addEventListener('oas-open', (e) => {
    e.preventDefault()
    message.info('Open attachment: ' + e.detail.href)
  })
  const row = document.querySelector('#att-remove-demo')
  row?.addEventListener('oas-remove', () => message.success('oas-remove received (removal is the host decision)'))
  row?.addEventListener('oas-download', () => message.success('oas-download received'))
})
</script>

## Attachment group (oas-attachment-group)

<DemoBlock title="Horizontal scroll + snap + edge fade">
  <div style="width: 100%; max-width: 520px">
    <oas-attachment-group>
      <oas-attachment name="photo-1.png" detail="PNG · 1.2 MB" removable></oas-attachment>
      <oas-attachment name="photo-2.png" detail="PNG · 980 KB" removable></oas-attachment>
      <oas-attachment name="design-spec.md" detail="Markdown · 18 KB" downloadable></oas-attachment>
      <oas-attachment name="demo.mp4" detail="MP4 · 48 MB" state="uploading" progress="62"></oas-attachment>
      <oas-attachment name="contract.pdf" detail="PDF · 860 KB" removable></oas-attachment>
      <oas-attachment name="backup.zip" detail="ZIP · 210 MB" state="error"></oas-attachment>
    </oas-attachment-group>
  </div>
</DemoBlock>

`oas-attachment-group` is a horizontal scroll row: items snap one by one (`scroll-snap-align: start`) and edges fade with a mask while scrollable (scrollability is reflected as `data-scrollable="start end"`). It owns no data (a pure container with no attributes); put `oas-attachment` or any cards in the default slot. Focus it with Tab and scroll horizontally with the arrow keys. Spacing and fade width use the CSS variables `--oas-attachment-group-gap` / `--oas-attachment-group-fade`.

## Accessibility

- Busy states reflect `aria-busy`; the progress bar is `role="progressbar"` with min/max/now values.
- Icon-only buttons carry accessible names including the target file name; decorative glyphs are always `aria-hidden`.
- The error state pairs color with text (never color alone); when slotting real thumbnails give them readable names (`alt`/`aria-label`).

## API

### oas-attachment

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `detail` | Secondary metadata (type · size); in the error state with no detail, shows the localized failure text ("Upload failed"); an explicit value is kept | — | — |
| `downloadable` | Boolean presence: shows the built-in download button (clicking dispatches oas-download; the download itself is host-owned) | `boolean` | — |
| `href` | When set, the whole card becomes a clickable trigger (a[part=trigger]) and clicks dispatch oas-open; host preventDefault takes over and blocks default navigation | — | — |
| `name` | File name (title channel; renders media only without error when absent) | — | — |
| `orientation` | Layout direction: horizontal (default) / vertical (media above text, for narrow columns) | — | — |
| `progress` | Upload progress 0–100 (clamped; the thin bottom progress bar with role=progressbar renders only while uploading) | — | — |
| `removable` | Boolean presence: shows the built-in remove button (clicking dispatches oas-remove; the component never removes itself — removal is a host decision) | `boolean` | — |
| `size` | Three size steps: default / sm (accepts the small alias) / xs, tightening padding and media per step | — | — |
| `state` | Upload state machine: idle / uploading / processing / error / done (default done; vocabulary matches oas-upload; uploading/processing reflect aria-busy) | `string` | `done` |

#### Events

| Event | Description |
| --- | --- |
| `oas-download` | Dispatched when the built-in download button is clicked, detail { name } |
| `oas-open` | Dispatched when the href card trigger is clicked, detail { href }; cancelable — host preventDefault also blocks the anchor default navigation |
| `oas-remove` | Dispatched when the built-in remove button is clicked, detail { name }; never self-removes |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Appends custom actions (after the built-in download/remove buttons) |
| `media` | Media slot (icon/thumbnail); any slotted content overrides the built-in default glyph |

### oas-attachment-group

#### Slots

| Name | Description |
| --- | --- |
| default | Attachment card sequence (oas-attachment or any cards; snap-scrolls with edge fade when overflowing horizontally) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-attachment-group-fade` | `24px` |
| `--oas-attachment-group-gap` | `var(--oas-space-2_5)` |

Parts: `::part(attachment)`, `::part(trigger)`, `::part(media)`, `::part(title)`, `::part(description)`, `::part(spinner)`, `::part(progress)`, `::part(actions)`, `::part(download)`, `::part(remove)`.
