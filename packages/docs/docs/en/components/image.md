# Image

Displays image resources, with an optional built-in preview feature.

## Basic Usage

<DemoBlock title="Basic image">
  <oas-image src="https://picsum.photos/seed/isui/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjN2Y5Y2Y1Jy8+PC9zdmc+" alt="Example image"></oas-image>
</DemoBlock>

## Fit Mode

<DemoBlock title="object-fit variants">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <div>
      <p class="image-cap">cover (crop to fill)</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-fit-cover/600/300" fit="cover" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZjVhOTdmJy8+PC9zdmc+" alt="cover"></oas-image>
    </div>
    <div>
      <p class="image-cap">contain (fit fully)</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-fit-contain/600/300" fit="contain" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjN2ZkMGE5Jy8+PC9zdmc+" alt="contain"></oas-image>
    </div>
  </div>
</DemoBlock>

Set `object-fit` via `fit`, then fix the image container size with `::part(image)` to achieve the crop effect.

<style>
.image-cap {
  margin: 0 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.fit-demo {
  width: 240px;
  height: 150px;
  display: block;
}
.fit-demo::part(image) {
  width: 100%;
  height: 100%;
}
.lazy-list {
  width: 100%;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
}
.album-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--oas-space-3);
}
.album-grid oas-image {
  display: block;
}
.album-grid oas-image::part(image) {
  width: 100%;
  height: 110px;
  object-fit: cover;
}
.group-wall {
  width: 100%;
}
.group-wall oas-image::part(image) {
  width: 160px;
  height: 100px;
  object-fit: cover;
}
</style>

## Placeholder and Fallback

<DemoBlock title="Loading placeholder">
  <oas-image src="https://picsum.photos/seed/isui-placeholder/600/300" placeholder fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZTU5YWQxJy8+PC9zdmc+" alt="Loading placeholder"></oas-image>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    With <code>placeholder</code>, a light-gray placeholder is shown until the image finishes loading, then it switches to the image.
  </p>
</DemoBlock>

<DemoBlock title="Load failure fallback">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">Default failure placeholder</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/missing.png" alt="Load failed"></oas-image>
    </div>
    <div>
      <p class="image-cap">Custom fallback image</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/missing.png" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjOGFiOGU2Jy8+PC9zdmc+" alt="Custom fallback"></oas-image>
    </div>
  </div>
</DemoBlock>

When the image fails to load, a "图片加载失败" placeholder is shown by default; the `fallback` attribute can specify a fallback image URL, and if the fallback also fails, it falls back to the placeholder text.

## Lazy Loading

<DemoBlock title="Lazy-loading long list (loads image by image while scrolling)">
  <p class="image-cap">With <code>lazy</code>, an image only starts loading when it enters the viewport; pair it with <code>placeholder</code> to show a "Loading" placeholder. Scroll down the list and watch the placeholder → loaded transition (images already in the viewport load immediately).</p>
  <div class="lazy-list" id="image-lazy-list">
    <oas-image lazy placeholder src="https://picsum.photos/seed/isui-lazy-static/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZjVjOTdmJy8+PC9zdmc+" alt="Lazy loading example"></oas-image>
  </div>
</DemoBlock>

## Preview

<DemoBlock title="Click to preview (built-in overlay)">
  <oas-image id="image-preview" src="https://picsum.photos/seed/isui-preview/600/300" preview fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYTlhZWY1Jy8+PC9zdmc+" alt="Preview image"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    Click the image to open a full-screen preview overlay: the toolbar supports zoom in / out, rotate, flip horizontal / vertical, and download; after zooming in you can drag to pan and use the wheel to zoom. Press Esc or click the mask to close. The close button is focused when opened, and focus is restored on close. Emits <code>oas-preview</code> (detail contains src).
  </p>
</DemoBlock>

When opened, the preview overlay is mounted to <code>document.body</code> (portal) so <code>position: fixed</code> keeps working even when the component sits inside a <code>transform</code>/<code>filter</code> ancestor. While portaled, <code>::part(preview-*)</code> cannot pierce from the host — customize via CSS variables instead.

## Gallery Preview

<DemoBlock title="Gallery preview (multi-image paging)">
  <oas-image id="image-gallery" preview src="https://picsum.photos/seed/isui-gallery-1/600/300" preview-src-list='["https://picsum.photos/seed/isui-gallery-1/1200/600","https://picsum.photos/seed/isui-gallery-2/1200/600","https://picsum.photos/seed/isui-gallery-3/1200/600","https://picsum.photos/seed/isui-gallery-4/1200/600"]' fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYzRiNWU1Jy8+PC9zdmc+" alt="Gallery"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    Set <code>preview-src-list</code> (a JSON array of URLs) to enter gallery mode: use the side arrows, the toolbar paging buttons, or ←→ keys to page through, with an "n/total" counter. If an image fails to load, a failure placeholder (reusing the <code>error</code> slot content) is shown instead of a blank stage.
  </p>
</DemoBlock>

<DemoBlock title="Infinite loop (infinite)">
  <oas-image id="image-gallery-infinite" preview infinite src="https://picsum.photos/seed/isui-loop-1/600/300" preview-src-list='["https://picsum.photos/seed/isui-loop-1/1200/600","https://picsum.photos/seed/isui-loop-2/1200/600","https://picsum.photos/seed/isui-loop-3/1200/600"]' fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjOTVjN2NlJy8+PC9zdmc+" alt="Looping gallery"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    With <code>infinite</code>, paging wraps around: "next" on the last image returns to the first, and "prev" on the first image jumps to the last.
  </p>
</DemoBlock>

## Thumbnail vs. Original

<DemoBlock title="preview-src (separate thumbnail and original)">
  <oas-image preview src="https://picsum.photos/seed/isui-thumb/240/150" preview-src="https://picsum.photos/seed/isui-thumb/1600/1000" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="Thumbnail and original"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    The list shows the <code>src</code> thumbnail, while the preview loads the high-resolution original from <code>preview-src</code> (the download link points to the original as well).
  </p>
</DemoBlock>

## Controlled Preview

<DemoBlock title="Controlled preview (preview-open + openPreview())">
  <div style="width: 100%; display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
    <oas-button id="image-controlled-open">Open preview</oas-button>
    <oas-image id="image-controlled" preview src="https://picsum.photos/seed/isui-controlled/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZDRhNWU4Jy8+PC9zdmc+" alt="Controlled preview"></oas-image>
    <span id="image-controlled-state" class="image-cap" style="margin: 0">State: preview closed</span>
  </div>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    The external button calls <code>openPreview()</code> to open; when <code>preview-open</code> is present it controls the open state — internal open/close (click / Esc / close button) reflects back to the attribute and emits <code>oas-preview-change</code> (detail <code>{ open }</code>), and adding/removing the attribute drives the overlay as well (two-way sync).
  </p>
</DemoBlock>

## Custom Toolbar

<DemoBlock title="Custom toolbar (slot=toolbar + oas-toolbar-render)">
  <oas-image id="image-custom-toolbar" preview src="https://picsum.photos/seed/isui-ct-1/600/300" preview-src-list='["https://picsum.photos/seed/isui-ct-1/1200/600","https://picsum.photos/seed/isui-ct-2/1200/600","https://picsum.photos/seed/isui-ct-3/1200/600"]' fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYTRjYWY4Jy8+PC9zdmc+" alt="Custom toolbar">
    <template slot="toolbar">
      <button type="button" data-cmd="zoom-out">Zoom out</button>
      <button type="button" data-cmd="zoom-in">Zoom in</button>
      <button type="button" data-cmd="rotate-left">Rotate left</button>
      <button type="button" data-cmd="rotate-right">Rotate right</button>
      <button type="button" data-cmd="prev">Prev</button>
      <button type="button" data-cmd="next">Next</button>
      <button type="button" data-cmd="download">Download</button>
      <button type="button" data-cmd="close">Close</button>
    </template>
  </oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    With a <code>template[slot="toolbar"]</code>, the template content is cloned into the preview overlay toolbar area, replacing the default button group (the original template stays in the light DOM; without a template the default toolbar remains). <code>oas-toolbar-render</code> is emitted on clone and on every open: use <code>element</code> (the toolbar container) and <code>actions</code> (the viewer commands) from the detail to wire custom buttons to viewer commands. The buttons above are wired — try them.
  </p>
</DemoBlock>

The detail of <code>oas-toolbar-render</code> is <code>{ element, actions }</code>: <code>element</code> is the cloned toolbar container (bind button events on it; re-binding is idempotent); the <code>actions</code> command set is listed below (<code>prev</code>/<code>next</code> work in gallery mode and are no-ops in single-image mode):

| Command | Description |
| --- | --- |
| `zoomIn` / `zoomOut` | Zoom in / out one step (same transform state machine as the wheel and default buttons) |
| `rotateLeft` / `rotateRight` | Rotate 90° counter-clockwise / clockwise |
| `flipX` / `flipY` | Flip horizontally / vertically |
| `download` | Trigger a download of the current preview image |
| `close` | Close the preview overlay (equivalent to Esc / mask click) |
| `prev` / `next` | Previous / next gallery image (respects the `infinite` boundary, same as default paging) |

Host wiring example:

```js
el.addEventListener('oas-toolbar-render', (e) => {
  const { element, actions } = e.detail
  element.querySelector('#my-zoom-in').onclick = actions.zoomIn
})
```

The shared preview of <code>oas-image-group</code> supports this as well: place a <code>template[slot="toolbar"]</code> directly inside the group and it is forwarded to the shared overlay. Custom toolbar buttons receive token-based base styles (readable in light/dark) and participate in the Tab focus trap.

## Load Events

<DemoBlock title="Load events (oas-load / oas-error)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">Load success → oas-load</p>
      <oas-image id="image-events-ok" class="fit-demo" src="https://picsum.photos/seed/isui-events-ok/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZWViNmZmJy8+PC9zdmc+" alt="Event demo (success)"></oas-image>
    </div>
    <div>
      <p class="image-cap">Load failure → oas-error</p>
      <oas-image id="image-events-bad" class="fit-demo" src="https://invalid.example.com/events-missing.png" alt="Event demo (failure)"></oas-image>
    </div>
  </div>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    The main image emits <code>oas-load</code> on success and <code>oas-error</code> on final failure (both details contain <code>src</code>); during a <code>fallback</code> retry no <code>oas-error</code> is emitted — it fires only when the fallback also fails (detail.src is the fallback URL).
  </p>
</DemoBlock>

## Custom Placeholder and Error Slots

<DemoBlock title="Custom placeholder / error slots">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">slot="placeholder"</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-slot-ph/600/300" placeholder>
        <template slot="placeholder"><span style="color: var(--oas-color-primary)">Custom loading placeholder…</span></template>
      </oas-image>
    </div>
    <div>
      <p class="image-cap">slot="error"</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/slot-missing.png" alt="Custom error slot">
        <template slot="error"><span style="color: var(--oas-color-danger)">Custom error content (icons/buttons allowed)</span></template>
      </oas-image>
    </div>
  </div>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    <code>template[slot="placeholder"]</code> / <code>template[slot="error"]</code> (or any element carrying the same <code>slot</code> attribute) is cloned into the corresponding placeholder area, taking precedence over the built-in text; a failed image inside a gallery preview reuses the <code>error</code> slot content as well.
  </p>
</DemoBlock>

## Flip

<DemoBlock title="Flip (flipX / flipY)">
  <oas-image preview src="https://picsum.photos/seed/isui-flip/900/500" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc5MDAnIGhlaWdodD0nNTAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZjBjNWE4Jy8+PC9zdmc+" alt="Flippable image"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    The toolbar provides "Flip horizontal" and "Flip vertical", composed into the same transform state machine as zoom, rotate, and pan — they compose without interfering with each other.
  </p>
</DemoBlock>

## Drag to Pan and Wheel to Zoom

<DemoBlock title="Drag to pan + wheel to zoom (large images)">
  <oas-image preview src="https://picsum.photos/seed/isui-pan/1800/1100" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxODAwJyBoZWlnaHQ9JzExMDAnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyM5ZGMzZTYnLz48L3N2Zz4=" alt="Large image pan and zoom"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    After zooming in, press and drag on the preview image to pan (clamped to the visible bounds). Scroll the wheel inside the preview area to zoom (page scrolling is blocked). Zoom step and limits can be overridden with CSS variables (see the table below).
  </p>
</DemoBlock>

## Photo Wall Composition

<DemoBlock title="Photo wall (each image enters the same gallery)">
  <p class="image-cap">A grid of thumbnails: clicking any one opens the shared gallery starting from that image (opening index matches the thumbnail src against the list).</p>
  <div class="album-grid" id="image-album">
    <oas-image preview src="https://picsum.photos/seed/isui-album-1/800/500" preview-src-list='["https://picsum.photos/seed/isui-album-1/800/500","https://picsum.photos/seed/isui-album-2/800/500","https://picsum.photos/seed/isui-album-3/800/500","https://picsum.photos/seed/isui-album-4/800/500","https://picsum.photos/seed/isui-album-5/800/500","https://picsum.photos/seed/isui-album-6/800/500"]' alt="Album image"></oas-image>
  </div>
</DemoBlock>

## Image Group (oas-image-group)

<DemoBlock title="Image group (declarative photo wall → shared preview)">
  <p class="image-cap">Put multiple <code>oas-image</code> elements inside <code>oas-image-group</code> and the container collects them into a shared gallery: clicking any image opens the preview from that image, and the side arrows / keyboard ←→ page through the whole set (n/total counter). A child's own <code>preview</code> click is taken over by the container as the shared gallery — no per-image <code>preview-src-list</code> needed.</p>
  <oas-image-group id="image-group-demo" class="group-wall">
    <oas-image src="https://picsum.photos/seed/isui-group-1/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="Gallery image 1"></oas-image>
    <oas-image src="https://picsum.photos/seed/isui-group-2/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="Gallery image 2"></oas-image>
    <oas-image src="https://picsum.photos/seed/isui-group-3/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="Gallery image 3"></oas-image>
    <oas-image src="https://picsum.photos/seed/isui-group-4/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="Gallery image 4"></oas-image>
  </oas-image-group>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    Dynamically adding/removing children (or changing their <code>src</code>) syncs the gallery automatically; <code>current</code> optionally controls the current index — when present, clicks open at <code>current</code> and internal paging reflects back to the attribute; when absent, the attribute is not created and only <code>oas-change</code> is emitted (<code>detail: { current, prev }</code>, see the message feedback above); <code>infinite</code> is passed through to the shared preview.
  </p>
</DemoBlock>

Relation to `preview-src-list`: `preview-src-list` fits a data-array-driven single-entry gallery (one thumbnail representing the set); `oas-image-group` fits a declarative photo wall — every child image is naturally a gallery member, adding it to the DOM adds it to the set. Both share the same preview overlay capabilities (zoom/rotate/flip/download/Esc/mask/focus trap); children can still use `preview-src` for a dedicated preview URL, or `preview-src-list` to expand one child into multiple gallery entries. The group lays out as a wrapping flex row; the gap is customizable via the CSS variable <code>--oas-image-group-gap</code>.

### Preview Zoom CSS Variables

| CSS Variable | Default | Description |
| --- | --- | --- |
| `--oas-image-zoom-step` | `0.5` | Zoom in/out step (shared by toolbar buttons and the wheel) |
| `--oas-image-zoom-min` | `0.5` | Zoom lower bound |
| `--oas-image-zoom-max` | `3` | Zoom upper bound |

Override them on the host element or at the theme level, e.g. `style="--oas-image-zoom-max: 5"`.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // Lazy-loading long list: each image loads only when it enters the viewport
  const list = document.querySelector('#image-lazy-list')
  if (list) {
    for (let i = 1; i <= 12; i++) {
      const el = document.createElement('oas-image')
      el.setAttribute('lazy', '')
      el.setAttribute('placeholder', '')
      el.setAttribute('src', `https://picsum.photos/seed/isui-lazy-${i}/600/300`)
      el.setAttribute('fallback', "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjNzJjN2QwJy8+PC9zdmc+")
      el.setAttribute('alt', `Lazy image ${i}`)
      list.appendChild(el)
    }
  }

  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.querySelector('#image-preview')?.addEventListener('oas-preview', (e) => {
    message.success(`Preview opened: ${e.detail.src}`)
    console.log('oas-preview', e.detail.src)
  })

  // Everything below touches oas-image properties/methods — wait until the
  // element is upgraded (pre-upgrade expando assignment would shadow setters)
  await customElements.whenDefined('oas-image')

  // Controlled preview: external button opens via openPreview(); closing (Esc/close button) reflects back
  // to the preview-open attribute (hasAttribute read-back proves the reflection) + oas-preview-change echoes state
  const controlled = document.querySelector('#image-controlled')
  const controlledState = document.querySelector('#image-controlled-state')
  document.querySelector('#image-controlled-open')?.addEventListener('click', () => {
    controlled?.openPreview()
  })
  controlled?.addEventListener('oas-preview-change', (e) => {
    const open = controlled.hasAttribute('preview-open')
    if (controlledState) {
      controlledState.textContent = `State: preview ${open ? 'open' : 'closed'}`
    }
    message.success(`oas-preview-change: ${e.detail.open}`)
  })

  // Image group: visible feedback on page change (oas-change current/prev)
  document.querySelector('#image-group-demo')?.addEventListener('oas-change', (e) => {
    message.success(`oas-change: current=${e.detail.current}, prev=${e.detail.prev}`)
  })

  // Custom toolbar: wire oas-toolbar-render command channel
  // (fired on clone and on every open; re-binding is idempotent)
  const customToolbar = document.querySelector('#image-custom-toolbar')
  customToolbar?.addEventListener('oas-toolbar-render', (e) => {
    const { element, actions } = e.detail
    const CMD = {
      'zoom-in': actions.zoomIn,
      'zoom-out': actions.zoomOut,
      'rotate-left': actions.rotateLeft,
      'rotate-right': actions.rotateRight,
      prev: actions.prev,
      next: actions.next,
      download: actions.download,
      close: actions.close,
    }
    for (const btn of element.querySelectorAll('[data-cmd]')) {
      btn.onclick = CMD[btn.getAttribute('data-cmd')]
    }
  })

  // Load event demos
  document.querySelector('#image-events-ok')?.addEventListener('oas-load', (e) => {
    message.success(`oas-load: ${e.detail.src}`)
  })
  document.querySelector('#image-events-bad')?.addEventListener('oas-error', (e) => {
    message.error(`oas-error: ${e.detail.src}`)
  })

  // Photo wall: grid of thumbnails sharing one gallery; clicking any image
  // opens the gallery starting from that image
  const ALBUM = [
    'https://picsum.photos/seed/isui-album-1/800/500',
    'https://picsum.photos/seed/isui-album-2/800/500',
    'https://picsum.photos/seed/isui-album-3/800/500',
    'https://picsum.photos/seed/isui-album-4/800/500',
    'https://picsum.photos/seed/isui-album-5/800/500',
    'https://picsum.photos/seed/isui-album-6/800/500',
  ]
  const album = document.querySelector('#image-album')
  if (album) {
    // First image is declared statically (DemoBlock code visibility); the rest are data-driven
    for (const url of ALBUM.slice(1)) {
      const el = document.createElement('oas-image')
      el.setAttribute('preview', '')
      el.setAttribute('src', url)
      el.setAttribute('preview-src-list', JSON.stringify(ALBUM))
      el.setAttribute('alt', 'Album image')
      album.appendChild(el)
    }
  }
})
</script>

## API

### oas-image

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `alt` | Alternative text | — | — |
| `fallback` | Fallback image URL to switch to on load failure; when not set, shows the "图片加载失败" placeholder | `string` | — |
| `fit` | `object-fit` value | `string` | — |
| `infinite` | Loop around the first/last gallery image | `boolean` | — |
| `lazy` | Lazy load: the image starts loading only when it enters the viewport (IntersectionObserver); loads immediately when already in the viewport; falls back to eager loading when unsupported | `boolean` | — |
| `placeholder` | Show a light gray placeholder before the image finishes loading | `boolean` | — |
| `preview` | Enable built-in preview: click to zoom + zoom/rotate/download + Esc to close + focus trap | `boolean` | — |
| `preview-open` | Controlled preview open state (controlled when present, two-way with `oas-preview-change`; see also `openPreview()`) | `boolean` | — |
| `preview-src` | Original image URL for preview (thumbnail/original separation; falls back to `src`) | `string` | — |
| `preview-src-list` | Gallery preview: JSON array of URLs; prev/next paging + counter + keyboard ←→ after opening | `string` | — |
| `src` | Image URL | `string` | — |

| Event | Description |
| --- | --- |
| `oas-error` | Image failed finally (fallback chain exhausted), `detail: { src }` |
| `oas-load` | Image loaded successfully, `detail: { src }` |
| `oas-preview` | Preview overlay opened, `detail: { src }`; closing the overlay does not emit an event |
| `oas-preview-change` | Preview open state changed, `detail: { open }` |
| `oas-preview-nav` | Gallery page change/jump, `detail: { index, src }`; lets the oas-image-group container take over the index |
| `oas-toolbar-render` | Custom toolbar render notification (fired on clone and on every preview open; host re-binding is idempotent), detail { element, actions }: element is the cloned toolbar container, actions is the viewer command set |

| Name | Description |
| --- | --- |
| `template[slot="error"]` | Custom error placeholder content (shared by the main image and gallery preview failures) |
| `template[slot="placeholder"]` | Custom loading placeholder content (gray block + text by default) |
| `template[slot="toolbar"]` | Custom preview toolbar content: cloned into the overlay toolbar area, replacing the default button group (defaults remain when absent). Emits oas-toolbar-render on clone and on every open (detail { element, actions }); action commands: zoomIn/zoomOut/rotateLeft/rotateRight/flipX/flipY/download/close/prev/next (prev/next are no-ops in single-image mode) |

### oas-image-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `current` | Current gallery index (optional controlled): when present, clicks open at `current`, internal paging reflects back to the attribute, and external changes drive the preview jump; when absent the attribute is not created and only `oas-change` is emitted | — | — |
| `infinite` | Loop paging around the first/last image (passed through to the shared preview host) | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-change` | Gallery page changed, `detail: { current, prev }` |
| `oas-preview` | Shared preview overlay opened, `detail: { src }` (src is the current image URL) |

| Name | Description |
| --- | --- |
| default | — |
| `template[slot="toolbar"]` | Forwarded to the shared preview host: customizes the shared preview overlay toolbar (clone replaces the default button group + oas-toolbar-render command channel, same as oas-image) |
