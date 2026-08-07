# Divider 分割线

区隔内容的水平/垂直分割线。

## 水平

<div class="demo">
  <oas-divider></oas-divider>
</div>

## 带内容

<div class="demo">
  <oas-divider>文字</oas-divider>
  <oas-divider content-position="left">左对齐</oas-divider>
  <oas-divider content-position="right">右对齐</oas-divider>
</div>

## 虚线

<div class="demo">
  <oas-divider dashed></oas-divider>
</div>

## 垂直

<div class="demo">
  文本
  <oas-divider direction="vertical"></oas-divider>
  文本
</div>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `direction` | 方向 | `horizontal` / `vertical` | `horizontal` |
| `dashed` | 虚线 | boolean | `false` |
| `content-position` | 内容位置 | `left` / `center` / `right` | `center` |
