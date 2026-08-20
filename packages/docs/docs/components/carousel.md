# Carousel 轮播

用于在同一可视区域循环展示多屏内容，支持手动切换与自动播放。

## 基础用法

<DemoBlock title="基础轮播">
  <div style="width: 100%">
    <oas-carousel>
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 200px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 200px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 200px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

点击底部圆点可切换屏幕，默认不自动播放。

## 指定起始索引

<DemoBlock title="受控索引">
  <div style="width: 100%">
    <oas-carousel index="1">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

通过 `index` 指定当前屏（从 0 开始）。

## 自动播放

<DemoBlock title="自动播放">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">自动 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">自动 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">自动 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

设置 `autoplay` 开启自动播放，`interval` 控制间隔（毫秒）。

## 箭头形态

左右箭头支持三种显示形态，通过 `arrows` 属性控制：`always`（始终显示）/ `hover`（悬停显示，默认）/ `never`（不显示）。箭头点击切换上一屏 / 下一屏，首尾循环。

<DemoBlock title="始终显示（always）">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="悬停显示（hover）">
  <div style="width: 100%">
    <oas-carousel arrows="hover">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="不显示（never）">
  <div style="width: 100%">
    <oas-carousel arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

默认（未指定 `arrows`）即悬停显示形态：箭头默认隐藏，鼠标悬停或键盘聚焦轮播区域时平滑淡入。不指定 `arrows` 时等价于 `arrows="hover"`。

## 图片轮播

轮播项不局限于色块——放 `<img>` 或 SVG 即成图片 banner。

<DemoBlock title="图片 banner（SVG）">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#16a34a"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg1)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">夏日活动</text></svg>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg2)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">秋日上新</text></svg>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg3)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">冬日促销</text></svg>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="图片轮播（img + 自动播放）">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2500">
      <img src="https://picsum.photos/seed/isui-cv-1/800/260" alt="轮播图 1" style="width:100%; height:220px; object-fit: cover; display:block;">
      <img src="https://picsum.photos/seed/isui-cv-2/800/260" alt="轮播图 2" style="width:100%; height:220px; object-fit: cover; display:block;">
      <img src="https://picsum.photos/seed/isui-cv-3/800/260" alt="轮播图 3" style="width:100%; height:220px; object-fit: cover; display:block;">
    </oas-carousel>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="切换事件">
  <div style="width: 100%">
    <oas-carousel id="carousel-event">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">第三屏</div>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrows` | 箭头显示形态：`always`（始终显示）/ `hover`（悬停显示）/ `never`（不显示） | `string` | `hover` |
| `autoplay` | 是否自动播放 | `boolean` | — |
| `index` | 当前屏索引（从 0 起） | `string` | `0` |
| `interval` | 自动播放间隔（ms） | `string` | `3000` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 当前屏切换，`detail: { index }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### 部件（::part()）

| 部件                        | 说明                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `viewport` / `track`        | 视口与滑动轨道                                               |
| `dots` / `dot`              | 底部指示器容器与单个圆点                                     |
| `arrow-prev` / `arrow-next` | 左右切换箭头按钮，绝对定位于轮播两侧垂直居中，可单独定制样式 |
