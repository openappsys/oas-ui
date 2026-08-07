# Divider 分割线

区隔内容的水平/垂直分割线。

## 水平

<DemoBlock title="基础分割线">
  <oas-divider></oas-divider>
</DemoBlock>

## 带内容

<DemoBlock title="内容位置">
  <oas-divider>文字</oas-divider>
  <oas-divider content-position="left">左对齐</oas-divider>
  <oas-divider content-position="right">右对齐</oas-divider>
</DemoBlock>

## 虚线

<DemoBlock title="虚线">
  <oas-divider dashed></oas-divider>
</DemoBlock>

## 垂直

<DemoBlock title="垂直分割线">
  <span>文本</span>
  <oas-divider direction="vertical"></oas-divider>
  <span>文本</span>
</DemoBlock>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `direction` | 方向 | `horizontal` / `vertical` | `horizontal` |
| `dashed` | 虚线 | boolean | `false` |
| `content-position` | 内容位置 | `left` / `center` / `right` | `center` |
