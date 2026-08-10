# Image

Displays image resources, with an optional built-in preview feature.

## Basic Usage

<DemoBlock title="Basic image">
  <oas-image src="https://picsum.photos/seed/isui/600/300" alt="示例图"></oas-image>
</DemoBlock>

## Fit Mode

<DemoBlock title="object-fit variants">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <div>
      <p class="image-cap">cover（裁切填充）</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-fit-cover/600/300" fit="cover" alt="cover"></oas-image>
    </div>
    <div>
      <p class="image-cap">contain（完整显示）</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-fit-contain/600/300" fit="contain" alt="contain"></oas-image>
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
</style>

## Placeholder and Fallback

<DemoBlock title="Loading placeholder">
  <oas-image src="https://picsum.photos/seed/isui-placeholder/600/300" placeholder alt="加载占位"></oas-image>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    设置 <code>placeholder</code> 后，图片加载完成前显示浅灰占位；加载完成后自动切换为图片。
  </p>
</DemoBlock>

<DemoBlock title="Load failure fallback">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">默认失败占位</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/missing.png" alt="加载失败"></oas-image>
    </div>
    <div>
      <p class="image-cap">自定义兜底图</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/missing.png" fallback="https://picsum.photos/seed/isui-fallback/600/300" alt="自定义兜底"></oas-image>
    </div>
  </div>
</DemoBlock>

When the image fails to load, a "图片加载失败" placeholder is shown by default; the `fallback` attribute can specify a fallback image URL, and if the fallback also fails, it falls back to the placeholder text.

## Preview

<DemoBlock title="Click to preview (built-in overlay)">
  <oas-image id="image-preview" src="https://picsum.photos/seed/isui-preview/600/300" preview alt="可预览图片"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    点击图片打开全屏预览浮层：工具栏支持放大/缩小/旋转/下载，Esc 或点击遮罩关闭；打开时聚焦关闭按钮，关闭后还原焦点。派发 <code>oas-preview</code> 事件（detail 含 src）。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.querySelector('#image-preview')?.addEventListener('oas-preview', (e) => {
    message.success(`打开预览：${e.detail.src}`)
    console.log('oas-preview', e.detail.src)
  })
})
</script>

## API

| Attribute      | Description                                                          | Type    | Default |
| ------------- | -------------------------------------------------------------------- | ------- | ------- |
| `src`         | Image URL                                                            | string  | —       |
| `alt`         | Alternative text                                                     | string  | `图片`  |
| `fit`         | `object-fit` value                                                   | string  | —       |
| `preview`     | Enable built-in preview: click to zoom + zoom/rotate/download + Esc to close + focus trap | boolean | `false` |
| `placeholder` | Show a light gray placeholder before the image finishes loading      | boolean | `false` |
| `fallback`    | Fallback image URL to switch to on load failure; when not set, shows the "图片加载失败" placeholder | string  | —       |

| Event          | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `oas-preview` | Preview overlay opened, `detail: { src }`; closing the overlay does not emit an event |
