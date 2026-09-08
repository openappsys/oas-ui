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

## 组间距

叠距变量化：默认 `-8px` 重叠陈列，`spacing` 属性（数字 px）可正（并排留缝）可负（更深重叠）；也可直接覆盖 CSS 变量 `--oas-avatar-group-overlap`。成员头像带页面背景色描边，重叠时不互相透叠（暗色主题自动适配）。

<DemoBlock title="组间距 spacing">
  <oas-avatar-group spacing="4">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp1/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp2/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
  </oas-avatar-group>
  <oas-avatar-group spacing="-16">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp3/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp4/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

## 折叠成员弹层

设置 `max` 后，悬停、键盘聚焦或点击 `+N` 计数按钮，弹出浮层展示全部被折叠的成员头像；`Escape`、点击外部或焦点移出关闭。

<DemoBlock title="折叠成员弹层">
  <oas-avatar-group max="4">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ov1/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ov2/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
    <oas-avatar size="40">王</oas-avatar>
    <oas-avatar size="40">赵</oas-avatar>
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

## text 属性驱动

`text` 属性驱动文字渲染，且是**响应式**的：运行时修改 `text` 即时生效（attribute 变化触发重渲染）。多字时渲染全量文本并自动收缩字号到容器内（下限 10px，见「长名称自适应」）；单字与缺省回落宿主 `textContent` 首字符——那是连接时的一次性快照，之后改文本内容不会自动更新；需要动态切换文字请用 `text` 属性。

<DemoBlock title="text 属性驱动">
  <oas-avatar size="48" text="张"></oas-avatar>
  <oas-avatar size="48" text="王五"></oas-avatar>
</DemoBlock>

## 形态

`shape` 控制头像形态：`circle`（默认，正圆）/ `square`（直角方形）/ `round`（小圆角，走 radius token）。图片、占位与换头像遮罩的圆角一体跟随。

<DemoBlock title="形态 shape">
  <oas-avatar shape="circle" size="48" text="圆"></oas-avatar>
  <oas-avatar shape="square" size="48" text="方"></oas-avatar>
  <oas-avatar shape="round" size="48" text="圆角"></oas-avatar>
</DemoBlock>

## 尺寸档位

`size` 除数字 px 外支持枚举别名：`small`（24）/ `medium`（32）/ `large`（40），对齐全库尺寸梯度。

<DemoBlock title="尺寸档位（枚举别名）">
  <oas-avatar size="small" text="S"></oas-avatar>
  <oas-avatar size="medium" text="M"></oas-avatar>
  <oas-avatar size="large" text="L"></oas-avatar>
</DemoBlock>

## 长名称自适应

`text` 为多字（组织名、团队名等）时不再截断首字：渲染全量文本并按容器宽度收缩字号，收缩下限 10px 保证可读。

<DemoBlock title="长名称自适应">
  <oas-avatar size="32" text="开源组件实验室"></oas-avatar>
  <oas-avatar size="48" text="开源组件实验室"></oas-avatar>
  <oas-avatar size="64" text="开源组件实验室"></oas-avatar>
</DemoBlock>

## 背景色

`color` 走全库统一颜色协议：4 个语义色（`primary`/`success`/`warning`/`danger`）、11 个预设色板名（`blue`/`geekblue`/`volcano` 等）或任意 CSS 色值；文字色按底色亮度自动取黑/白保证对比度。也可直接覆盖 CSS 变量 `--oas-avatar-bg` / `--oas-avatar-on-color`。

<DemoBlock title="背景色 color">
  <oas-avatar color="blue" size="40" text="O"></oas-avatar>
  <oas-avatar color="volcano" size="40" text="张"></oas-avatar>
  <oas-avatar color="success" size="40" text="李"></oas-avatar>
  <oas-avatar color="#7c3aed" size="40" text="王"></oas-avatar>
</DemoBlock>

## 图片填充

`fit` 映射图片的 `object-fit`，默认 `cover`（裁切填满）；长图可用 `contain` 完整显示。

<DemoBlock title="图片填充 fit">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-fit/120/240" size="64" fit="cover" alt="cover 裁切填满"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-fit/120/240" size="64" fit="contain" alt="contain 完整显示"></oas-avatar>
</DemoBlock>

## 图标头像

`slot="icon"` 放置图标（`oas-icon` 或任意 svg/内容）：显式给出 icon 时不再截取首字符。

<DemoBlock title="图标头像">
  <oas-avatar size="48"><oas-icon slot="icon" name="user"></oas-icon></oas-avatar>
  <oas-avatar size="48" color="geekblue"><oas-icon slot="icon" name="organization"></oas-icon></oas-avatar>
</DemoBlock>

## 回退图

`fallback` 属性提供回退图 URL：主图加载失败时先切回退图重试一次，再失败才进入文字回退链。每次失败派发 `oas-error` 事件（`detail.src` 为失败的 URL），宿主可埋点或自定义回退。

<DemoBlock title="回退图 fallback">
  <oas-avatar src="https://invalid.example.com/primary.png" fallback="https://picsum.photos/seed/isui-avatar-fb/160" size="48" alt="回退图"></oas-avatar>
  <oas-avatar src="https://invalid.example.com/primary.png" fallback="https://invalid.example.com/backup.png" size="48" alt="两级都失败">张</oas-avatar>
</DemoBlock>

## 换头像入口

放入任意 `slot="trigger"` 节点即开启换头像入口：悬停或键盘聚焦头像时显形遮罩（空节点显示默认相机图标，有内容则作为遮罩内容），点击派发 `oas-trigger` 事件，上传逻辑由宿主自理。

<DemoBlock title="换头像入口">
  <div id="avatar-trigger-demo" style="display: flex; gap: 16px">
    <oas-avatar size="64" text="张"><span slot="trigger"></span></oas-avatar>
    <oas-avatar size="64" text="李"><span slot="trigger">更换</span></oas-avatar>
    <oas-avatar size="64" src="https://picsum.photos/seed/isui-avatar-tr/160" alt="头像"><span slot="trigger"></span></oas-avatar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 setter（事件监听绑定必须晚于自定义元素定义）
  customElements.whenDefined('oas-avatar').then(async () => {
    const { message } = await import('@oas-ui/ui')
    window.message = message
    document.querySelectorAll('#avatar-trigger-demo oas-avatar').forEach((el) => {
      el.addEventListener('oas-trigger', () => {
        window.message?.info('触发了更换头像，上传逻辑由宿主实现')
      })
    })
  })
})
</script>

## 状态点组合

在线状态等场景不内置状态点：用 `oas-badge` 包裹头像组合实现（`dot` + `color` 语义色），位置与颜色由 badge 侧控制。

<DemoBlock title="状态点外置组合（oas-badge 包裹）">
  <oas-badge dot color="success"><oas-avatar size="40">林</oas-avatar></oas-badge>
  <oas-badge dot color="warning"><oas-avatar size="40">陈</oas-avatar></oas-badge>
  <oas-badge dot><oas-avatar size="40">赵</oas-avatar></oas-badge>
</DemoBlock>

## 姓名悬浮提示

逐头像展示姓名等说明时，用 `oas-tooltip` 包裹组合（hover / 键盘聚焦均可达）。

<DemoBlock title="姓名悬浮提示（oas-tooltip 组合）">
  <oas-tooltip content="林晓雨" placement="top"><oas-avatar size="40">林</oas-avatar></oas-tooltip>
  <oas-tooltip content="陈以宁" placement="top"><oas-avatar size="40" src="https://picsum.photos/seed/isui-avatar-tt1/160" alt="陈以宁"></oas-avatar></oas-tooltip>
  <oas-tooltip content="赵启铭" placement="top"><oas-avatar size="40" color="geekblue">赵</oas-avatar></oas-tooltip>
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
| `color` | 文字头像背景色：语义色 / 预设名 / 任意色值（文字对比色自动选取） | `string` | — |
| `fallback` | 回退图 URL：主图加载失败时切换（再失败走文字/插槽回退链） | `string` | — |
| `fit` | 图片 object-fit（默认 `cover`） | `string` | — |
| `shape` | 形状：`circle`（默认圆形）/ `square`（直角）/ `round`（圆角） | — | — |
| `size` | 尺寸：数字 px 或枚举别名 `small`(24) / `medium`(32) / `large`(40) | `string` | `32` |
| `src` | 图片地址，存在时渲染图片头像 | `string` | — |
| `text` | 文字内容：单字渲染首字符；多字渲染全量并自动收缩字号适配容器 | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-error` | 图片加载失败派发（主图与回退图各一次），`detail: { src }` |
| `oas-trigger` | 换头像入口（trigger 遮罩）点击；上传交互宿主自理，`detail: { source: this }` |

| 名称 | 说明 |
| --- | --- |
| `fallback` | 图片加载失败（或头像无内容）时的自定义占位内容 |
| `icon` | 图标头像（显式图标内容，不做首字符截取） |
| `trigger` | 换头像入口遮罩自定义内容（hover/聚焦显形；缺省为内建相机图标） |

### oas-avatar-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `max` | 最大展示头像数，超出显示 `+N` 计数圆点 | `string` | — |
| `size` | 统一头像尺寸（px），计数圆点同步适配 | `string` | — |
| `spacing` | 成员间距（px，可为负 = 叠放；覆盖 `--oas-avatar-group-overlap` 变量） | `string` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
