# Avatar 头像

用于展示用户或对象头像，支持文字占位与图片两种形态。

## 基础用法

<DemoBlock title="文字头像">
  <oas-avatar>张</oas-avatar>
  <oas-avatar>李</oas-avatar>
  <oas-avatar>王</oas-avatar>
  <oas-avatar>赵</oas-avatar>
</DemoBlock>

文字头像取内容首字符渲染；无任何内容时显示 `?` 占位。

## 尺寸

<DemoBlock title="尺寸变体">
  <oas-avatar size="24">张</oas-avatar>
  <oas-avatar size="32">李</oas-avatar>
  <oas-avatar size="48">王</oas-avatar>
  <oas-avatar size="64">赵</oas-avatar>
  <oas-avatar size="80">钱</oas-avatar>
</DemoBlock>

## 图片头像

<DemoBlock title="图片头像">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-1/160" size="32" alt="头像一"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-2/160" size="48" alt="头像二"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-3/160" size="64" alt="头像三"></oas-avatar>
</DemoBlock>

## 空态兜底

<DemoBlock title="无内容兜底">
  <oas-avatar size="48"></oas-avatar>
  <oas-avatar size="48">多</oas-avatar>
</DemoBlock>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `src` | 图片地址，存在时渲染图片头像 | string | — |
| `size` | 头像尺寸（px） | string / number | `32` |
| `alt` | 图片替代文本 | string | `头像` |

> 说明：`alt` 在首次渲染时读取，未加入观察列表，动态修改需自行触发重渲染。
