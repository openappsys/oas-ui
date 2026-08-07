# Carousel 轮播

## 基础用法

<div class="demo">
  <oas-carousel>
    <div style="background: var(--oas-color-primary); color: #fff; height: 200px">第一屏</div>
    <div style="background: var(--oas-color-success, #52c41a); color: #fff; height: 200px">第二屏</div>
    <div style="background: var(--oas-color-warning, #faad14); color: #fff; height: 200px">第三屏</div>
  </oas-carousel>
</div>

## 自动播放

<div class="demo">
  <oas-carousel autoplay interval="2000">
    <div style="background: #333; color: #fff; height: 160px">自动 1</div>
    <div style="background: #666; color: #fff; height: 160px">自动 2</div>
  </oas-carousel>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `index` | 当前屏索引 | `0` |
| `autoplay` | 自动播放 | 关 |
| `interval` | 自动播放间隔 ms | `3000` |

| 事件 | 说明 |
|---|---|
| `oas-change` | `detail: { index }` |
