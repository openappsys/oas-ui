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
.lazy-list {
  width: 100%;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
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

## 懒加载

<DemoBlock title="懒加载长列表（滚动逐图加载）">
  <p class="image-cap">设置 <code>lazy</code> 后图片进入视口才发起加载；配合 <code>placeholder</code> 展示「加载中」占位。向下滚动列表，观察占位 → 加载的过渡（视口内图片立即加载）。</p>
  <div class="lazy-list" id="image-lazy-list">
    <oas-image lazy placeholder src="https://picsum.photos/seed/isui-lazy-static/600/300" alt="懒加载示例图"></oas-image>
  </div>
</DemoBlock>

## 预览

<DemoBlock title="点击预览（内置浮层）">
  <oas-image id="image-preview" src="https://picsum.photos/seed/isui-preview/600/300" preview alt="可预览图片"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    点击图片打开全屏预览浮层：工具栏支持放大/缩小/旋转/下载，Esc 或点击遮罩关闭；打开时聚焦关闭按钮，关闭后还原焦点。派发 <code>oas-preview</code> 事件（detail 含 src）。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // 懒加载长列表：逐图进入视口才加载
  const list = document.querySelector('#image-lazy-list')
  if (list) {
    for (let i = 1; i <= 12; i++) {
      const el = document.createElement('oas-image')
      el.setAttribute('lazy', '')
      el.setAttribute('placeholder', '')
      el.setAttribute('src', `https://picsum.photos/seed/isui-lazy-${i}/600/300`)
      el.setAttribute('alt', `懒加载图片 ${i}`)
      list.appendChild(el)
    }
  }

  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.querySelector('#image-preview')?.addEventListener('oas-preview', (e) => {
    message.success(`打开预览：${e.detail.src}`)
    console.log('oas-preview', e.detail.src)
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `alt` | 替代文本 | — | — |
| `fallback` | 加载失败时切换的兜底图地址；未设置则显示「图片加载失败」占位 | `string` | — |
| `fit` | `object-fit` 值 | `string` | — |
| `lazy` | 懒加载：图片进入视口才发起加载（IntersectionObserver）；已位于视口内立即加载；环境不支持时退化为立即加载 | `boolean` | — |
| `placeholder` | 加载完成前显示浅灰占位 | `boolean` | — |
| `preview` | 开启内置预览：点击放大 + 缩放/旋转/下载 + Esc 关闭 + 焦点陷阱 | `boolean` | — |
| `src` | 图片地址 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-preview` | 打开预览浮层，`detail: { src }`；浮层关闭不派发事件 |
