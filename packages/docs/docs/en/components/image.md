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
    Click the image to open a full-screen preview overlay: the toolbar supports zoom in / out, rotate, and download; press Esc or click the mask to close. The close button is focused when opened, and focus is restored on close. Emits <code>oas-preview</code> (detail contains src).
  </p>
</DemoBlock>

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
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `alt` | Alternative text | — | — |
| `fallback` | Fallback image URL to switch to on load failure; when not set, shows the "图片加载失败" placeholder | `string` | — |
| `fit` | `object-fit` value | `string` | — |
| `lazy` | Lazy load: the image starts loading only when it enters the viewport (IntersectionObserver); loads immediately when already in the viewport; falls back to eager loading when unsupported | `boolean` | — |
| `placeholder` | Show a light gray placeholder before the image finishes loading | `boolean` | — |
| `preview` | Enable built-in preview: click to zoom + zoom/rotate/download + Esc to close + focus trap | `boolean` | — |
| `src` | Image URL | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-preview` | Preview overlay opened, `detail: { src }`; closing the overlay does not emit an event |
