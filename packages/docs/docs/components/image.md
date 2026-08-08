# Image 图片

用于展示图片资源，支持可选预览能力。

## 基础用法

<DemoBlock title="基础图片">
  <oas-image src="https://picsum.photos/seed/isui/600/300" alt="示例图"></oas-image>
</DemoBlock>

## 适应方式

<DemoBlock title="object-fit 变体">
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

通过 `fit` 设置 `object-fit`，再配合 `::part(image)` 固定图片容器尺寸实现裁切效果。

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

## 占位与兜底

<DemoBlock title="加载占位">
  <oas-image src="https://picsum.photos/seed/isui-placeholder/600/300" placeholder alt="加载占位"></oas-image>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    设置 <code>placeholder</code> 后，图片加载完成前显示浅灰占位；加载完成后自动切换为图片。
  </p>
</DemoBlock>

<DemoBlock title="加载失败兜底">
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

图片加载失败时默认显示「图片加载失败」占位；提供 `fallback` 属性可指定兜底图片地址，兜底图也失败时回退到占位文案。

## 可预览

<DemoBlock title="点击预览">
  <oas-image id="image-preview" src="https://picsum.photos/seed/isui-preview/600/300" preview alt="可预览"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    点击图片触发 <code>oas-preview</code>，可自行接入放大浮层（此处仅输出到控制台）。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.querySelector('#image-preview')?.addEventListener('oas-preview', (e) => {
    console.log('oas-preview', e.detail.src)
  })
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `src` | 图片地址 | string | — |
| `alt` | 替代文本 | string | `图片` |
| `fit` | `object-fit` 值 | string | — |
| `preview` | 开启预览，点击图片派发 `oas-preview` | boolean | `false` |
| `placeholder` | 加载完成前显示浅灰占位 | boolean | `false` |
| `fallback` | 加载失败时切换的兜底图地址；未设置则显示「图片加载失败」占位 | string | — |

| 事件 | 说明 |
|---|---|
| `oas-preview` | 点击图片，`detail: { src }`，预览浮层由调用方实现 |
