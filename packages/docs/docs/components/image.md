# Image 图片

## 基础用法

<div class="demo">
  <oas-image src="https://picsum.photos/seed/isui/600/300" alt="示例图"></oas-image>
</div>

## 可预览

<div class="demo">
  <oas-image src="https://picsum.photos/seed/preview/600/300" alt="可预览" preview></oas-image>
</div>

## API

| 属性 | 说明 |
|---|---|
| `src` | 图片地址 |
| `alt` | 替代文本 |
| `fit` | `object-fit` 值 |
| `preview` | 点击派发 `oas-preview`（`detail: { src }`），可自行接放大浮层 |
