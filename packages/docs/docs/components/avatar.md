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

## 徽标角标

`badge` 在头像右上角叠加徽标（文本或布尔）；布尔形式（无值）显示小圆点；`badge-dot` 强制圆点变体；`badge-color` 切换彩色；`badge-placement` 可将角标放到右下角。

<DemoBlock title="文字徽标">
  <oas-avatar size="48" badge="99+">张</oas-avatar>
  <oas-avatar size="48" badge="VIP" badge-color="primary">李</oas-avatar>
  <oas-avatar size="48" badge="8" badge-color="success">王</oas-avatar>
  <oas-avatar size="48" badge="3" badge-color="warning">赵</oas-avatar>
</DemoBlock>

<DemoBlock title="圆点徽标">
  <oas-avatar size="48" badge-dot>钱</oas-avatar>
  <oas-avatar size="48" badge-dot badge-color="success">孙</oas-avatar>
  <oas-avatar size="48" badge-dot badge-color="warning">周</oas-avatar>
</DemoBlock>

<DemoBlock title="位置与图片头像">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-b1/160" size="48" alt="头像四" badge="7"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-b2/160" size="48" alt="头像五" badge="5" badge-placement="bottom-right"></oas-avatar>
</DemoBlock>

## 加载失败回退

图片加载失败时自动回退到占位：优先 `fallback` 命名插槽内容，其次内容首字符，最后 `?`。

<DemoBlock title="失败回退到首字符">
  <oas-avatar src="https://invalid.example.com/missing.png" size="48" alt="加载失败">张</oas-avatar>
  <oas-avatar src="https://invalid.example.com/missing.png" size="48" alt="加载失败"></oas-avatar>
</DemoBlock>

<DemoBlock title="自定义 fallback 插槽">
  <oas-avatar src="https://invalid.example.com/missing.png" size="48" alt="加载失败">
    <span slot="fallback" style="font-size: 20px; font-weight: 600">!</span>
  </oas-avatar>
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
| `badge` | 头像右上角叠加的徽标文本；布尔形式（无值）显示小圆点 | `string` | — |
| `badge-color` | 徽标颜色：`primary`/`success`/`warning`/`danger` | `string` | `danger` |
| `badge-dot` | 小圆点徽标变体（不显示文本） | `boolean` | — |
| `badge-placement` | 徽标位置：`top-right`（默认）/`bottom-right` | `string` | `top-right` |
| `size` | 头像尺寸（px） | `string` | `32` |
| `src` | 图片地址，存在时渲染图片头像 | `string` | — |

| 名称 | 说明 |
| --- | --- |
| `fallback` | 图片加载失败（或头像无内容）时的自定义占位内容 |

### oas-avatar-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `max` | 最大展示头像数，超出显示 `+N` 计数圆点 | `string` | — |
| `size` | 统一头像尺寸（px），计数圆点同步适配 | `string` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
