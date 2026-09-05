# Empty 空状态

空数据时的占位展示，支持标题、富内容描述、图标型媒体、两套内置插画、尺寸档位、横向布局与容器变体。

## 基础用法

<DemoBlock title="基础用法">
  <oas-empty></oas-empty>
</DemoBlock>

## 标题 + 描述

通过 `title` 属性（渲染进可见标题区，读取后即从宿主移除，不残留原生悬浮提示；清空传空串）与 `description` 属性组合展示。

<DemoBlock title="标题 + 描述">
  <oas-empty title="还没有数据" description="调整筛选条件后再试一次"></oas-empty>
</DemoBlock>

标题层支持富内容：`slot="title"` 有内容时覆盖属性文案（可组合徽标、链接等任意内容）。

<DemoBlock title="标题富内容（slot=title）">
  <oas-empty description="该分组暂无成员，邀请后会自动出现在这里">
    <span slot="title">还没有成员 <oas-tag size="small">团队</oas-tag></span>
  </oas-empty>
</DemoBlock>

## 描述

描述文案支持 `description` 属性，也支持把富内容放进默认插槽（有内容时覆盖属性文案），适合展示换行说明或操作指引。

<DemoBlock title="描述属性">
  <oas-empty description="暂无符合条件的记录"></oas-empty>
</DemoBlock>

<DemoBlock title="描述富内容（默认插槽）">
  <oas-empty title="同步失败">
    <span>网络波动导致同步中断，<oas-link href="#">查看帮助</oas-link> 或稍后重试。</span>
  </oas-empty>
</DemoBlock>

## 尺寸档位

`size` 提供 small / medium / large 三档（默认 medium），联动插画尺寸与文字档位；`image-size` 保留为数值精调，优先级高于档位联动。

<DemoBlock title="尺寸档位">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty title="紧凑" size="small"></oas-empty>
    <oas-empty title="默认" size="medium"></oas-empty>
    <oas-empty title="宽松" size="large"></oas-empty>
    <oas-empty title="精调 72" image-size="72"></oas-empty>
  </oas-space>
</DemoBlock>

## 自定义插画（图片 URL / SVG 标记 / Slot）

`illustration` 属性支持图片 URL 与内联 SVG/HTML 标记；`slot="illustration"` 可传入任意内容，优先级最高。

<DemoBlock title="图片 URL">
  <oas-empty title="暂无数据" illustration="https://picsum.photos/seed/oas-empty/120"></oas-empty>
</DemoBlock>

<DemoBlock title="SVG 标记">
  <oas-empty title="暂无数据" illustration="<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><rect x='20' y='28' width='80' height='56' rx='10' fill='var(--oas-color-border)' stroke='var(--oas-color-text-disabled)'/><circle cx='60' cy='86' r='16' fill='var(--oas-color-primary)' opacity='0.2'/><circle cx='60' cy='86' r='5' fill='var(--oas-color-primary)'/></svg>"></oas-empty>
</DemoBlock>

<DemoBlock title="Slot 自定义插画">
  <oas-empty title="自定义插画内容">
    <svg slot="illustration" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="60" cy="60" r="42" fill="var(--oas-color-primary)" opacity="0.15"/><circle cx="60" cy="60" r="18" fill="none" stroke="var(--oas-color-primary)" stroke-width="4"/></svg>
  </oas-empty>
</DemoBlock>

## 第二套简约插画

`illustration="simple"` 切换内置简约插画（原创轻量构图）。

<DemoBlock title="简约插画">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty title="默认插画"></oas-empty>
    <oas-empty title="简约插画" illustration="simple"></oas-empty>
  </oas-space>
</DemoBlock>

## 图标型媒体

`icon` 属性传入图标名（@oas-ui/icons registry），进入圆形底色指示器形态，与插画形态互斥；图标颜色走 CSS 变量 `--oas-empty-icon-color`（默认文字次级色，宿主可覆盖）。

<DemoBlock title="图标型媒体">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty title="搜索无结果" description="换个关键词再试试" icon="search"></oas-empty>
    <oas-empty title="无权限访问" description="联系管理员开通后重试" icon="lock"></oas-empty>
  </oas-space>
</DemoBlock>

<DemoBlock title="图标型媒体（自定义颜色）">
  <oas-empty title="收件箱已清空" description="有新消息时会出现在这里" icon="mail" style="--oas-empty-icon-color: var(--oas-color-primary)"></oas-empty>
</DemoBlock>

## 横向布局

`align="start"` 或 `align="end"` 切换横向布局（图左文右 / 图右文左），适合宽容器或表单列内场景；默认 `center` 纵向居中。RTL 下自动镜像。

<DemoBlock title="横向布局">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-empty align="start" title="还没有进行中的项目" description="创建第一个项目，开始组织你的工作"></oas-empty>
    <oas-empty align="end" title="暂无搜索结果" description="尝试更短的关键词或清除筛选" illustration="simple"></oas-empty>
  </oas-space>
</DemoBlock>

## 容器变体

`variant` 提供 outlined（描边容器）与 filled（底色容器），无该属性时为空态默认的裸布局。

<DemoBlock title="容器变体">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty variant="outlined" title="描边容器" description="空态区域以边框划出范围"></oas-empty>
    <oas-empty variant="filled" title="底色容器" description="空态区域以底色突出"></oas-empty>
  </oas-space>
</DemoBlock>

## 隐藏插画

`hide-image` 隐藏插画区域，仅保留文字与操作区。

<DemoBlock title="隐藏插画">
  <oas-empty title="暂无数据" description="此处不展示插画" hide-image></oas-empty>
</DemoBlock>

## 操作区

默认插槽后的 `slot="action"` 放置操作按钮。

<DemoBlock title="操作区">
  <oas-empty title="还没有任何成员" description="邀请成员加入后即可开始协作">
    <oas-button slot="action" size="small" type="primary">邀请成员</oas-button>
    <oas-button slot="action" size="small">刷新列表</oas-button>
  </oas-empty>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 布局对齐：`center`（默认，纵向居中）/ `start` / `end`（横向图左文右 / 图右文左） | `string` | `center` |
| `description` | 描述文案 | — | — |
| `hide-image` | 隐藏插画 | — | — |
| `icon` | 图标名（复用 oas-icon 图标集）：图标型媒体（图标 + 圆形浅底指示器），与插画形态互斥 | — | — |
| `illustration` | 自定义插画：SVG/HTML 标记或图片 URL | — | — |
| `image-size` | 插画尺寸（px） | — | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large`：联动媒体尺寸与字号，与 `image-size` 正交 | `string` | `medium` |
| `title` | 标题（显示于描述上方；渲染进可见标题区后从宿主移除——原生 title 吸收约定；富内容用 title 插槽） | `string` | — |
| `variant` | 容器变体：`outlined`（描边）/ `filled`（底色），缺省无容器 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 描述富内容插槽，有内容时覆盖 description 属性与内置文案 |
| `action` | 操作区，置于描述下方 |
| `illustration` | 自定义插画内容，优先级高于 `illustration` 属性 |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |
