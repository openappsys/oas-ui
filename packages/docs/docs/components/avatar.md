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

## 头像组

<DemoBlock title="头像组">
  <oas-avatar-group>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g1/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g2/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

多个 `oas-avatar` 由 `oas-avatar-group` 包裹后按顺序向左重叠陈列。

<DemoBlock title="最大展示数">
  <oas-avatar-group max="3">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g3/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g4/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
    <oas-avatar size="40">王</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

设置 `max` 后超出部分隐藏，末尾显示 `+N` 计数圆点。

## 统一尺寸

`size` 统一组内所有头像尺寸（px），无需逐个设置；配合 `max` 时，`+N` 计数圆点同步适配尺寸。

<DemoBlock title="统一尺寸 size">
  <oas-avatar-group size="48">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga1/160" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga2/160" alt="成员二"></oas-avatar>
    <oas-avatar>张</oas-avatar>
    <oas-avatar>李</oas-avatar>
  </oas-avatar-group>
  <oas-avatar-group size="24" max="3">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga3/160" alt="成员一"></oas-avatar>
    <oas-avatar>张</oas-avatar>
    <oas-avatar>李</oas-avatar>
    <oas-avatar>王</oas-avatar>
    <oas-avatar>赵</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

## 空态兜底

<DemoBlock title="无内容兜底">
  <oas-avatar size="48"></oas-avatar>
  <oas-avatar size="48">多</oas-avatar>
</DemoBlock>

## API

### oas-avatar

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `alt` | 图片替代文本 | — | — |
| `size` | 头像尺寸（px） | — | `32` |
| `src` | 图片地址，存在时渲染图片头像 | — | — |

### oas-avatar-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `max` | 最大展示头像数，超出显示 `+N` 计数圆点 | — | — |
| `size` | 统一头像尺寸（px），计数圆点同步适配 | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

> 说明：`alt` 在首次渲染时读取，未加入观察列表，动态修改需自行触发重渲染。
