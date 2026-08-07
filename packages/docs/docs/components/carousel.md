# Carousel 轮播

用于在同一可视区域循环展示多屏内容，支持手动切换与自动播放。

## 基础用法

<DemoBlock title="基础轮播">
  <div style="width: 100%">
    <oas-carousel>
      <div style="background: var(--oas-color-primary); color: #fff; height: 200px">第一屏</div>
      <div style="background: #1f2937; color: #fff; height: 200px">第二屏</div>
      <div style="background: #374151; color: #fff; height: 200px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

点击底部圆点可切换屏幕，默认不自动播放。

## 指定起始索引

<DemoBlock title="受控索引">
  <div style="width: 100%">
    <oas-carousel index="1">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">第一屏</div>
      <div style="background: #1f2937; color: #fff; height: 160px">第二屏</div>
      <div style="background: #4b5563; color: #fff; height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

通过 `index` 指定当前屏（从 0 开始）。

## 自动播放

<DemoBlock title="自动播放">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">自动 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">自动 2</div>
      <div style="background: #374151; color: #fff; height: 160px">自动 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

设置 `autoplay` 开启自动播放，`interval` 控制间隔（毫秒）。

## 事件

<DemoBlock title="切换事件">
  <div style="width: 100%">
    <oas-carousel id="carousel-event">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">第一屏</div>
      <div style="background: #1f2937; color: #fff; height: 160px">第二屏</div>
      <div style="background: #4b5563; color: #fff; height: 160px">第三屏</div>
    </oas-carousel>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      当前屏：<span id="carousel-current">1</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.querySelector('#carousel-event')?.addEventListener('oas-change', (e) => {
    document.querySelector('#carousel-current').textContent = String(e.detail.index + 1)
  })
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `index` | 当前屏索引（从 0 起） | string / number | `0` |
| `autoplay` | 是否自动播放 | boolean | `false` |
| `interval` | 自动播放间隔（ms） | string / number | `3000` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 当前屏切换，`detail: { index }` |
