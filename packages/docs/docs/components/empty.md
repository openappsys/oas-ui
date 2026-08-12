# Empty 空状态

空数据时的占位展示，支持自定义描述、自定义插画与尺寸、隐藏插画与操作区。

## 基础用法

<DemoBlock title="基础用法">
  <oas-empty></oas-empty>
</DemoBlock>

## 自定义描述

<DemoBlock title="自定义描述">
  <oas-empty description="暂无符合条件的记录"></oas-empty>
</DemoBlock>

## 自定义插画（图片 URL）

通过 `illustration` 属性传图片 URL，替换默认插画。

<DemoBlock title="图片 URL">
  <oas-empty description="暂无数据" illustration="https://picsum.photos/seed/oas-empty/120"></oas-empty>
</DemoBlock>

## 自定义插画（SVG 标记）

`illustration` 属性也支持内联 SVG/HTML 标记。

<DemoBlock title="SVG 标记">
  <oas-empty description="暂无数据" illustration="<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><rect x='20' y='28' width='80' height='56' rx='10' fill='var(--oas-color-border)' stroke='var(--oas-color-text-disabled)'/><circle cx='60' cy='86' r='16' fill='var(--oas-color-primary)' opacity='0.2'/><circle cx='60' cy='86' r='5' fill='var(--oas-color-primary)'/></svg>"></oas-empty>
</DemoBlock>

## 自定义插画（Slot）

通过 `slot="illustration"` 传入任意内容，优先级高于 `illustration` 属性。

<DemoBlock title="Slot 自定义插画">
  <oas-empty description="自定义插画内容">
    <svg slot="illustration" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="60" cy="60" r="42" fill="var(--oas-color-primary)" opacity="0.15"/><circle cx="60" cy="60" r="18" fill="none" stroke="var(--oas-color-primary)" stroke-width="4"/></svg>
  </oas-empty>
</DemoBlock>

## 自定义尺寸

通过 `image-size` 控制插画尺寸（数字，单位 px），配合自定义插画使用。

<DemoBlock title="自定义尺寸">
  <oas-empty description="放大插画" image-size="160" illustration="<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><circle cx='60' cy='60' r='44' fill='var(--oas-color-primary)' opacity='0.15'/><circle cx='60' cy='60' r='20' fill='none' stroke='var(--oas-color-primary)' stroke-width='4'/></svg>"></oas-empty>
</DemoBlock>

## 隐藏插画

<DemoBlock title="隐藏插画">
  <oas-empty description="暂无数据" hide-image></oas-empty>
</DemoBlock>

## 操作区

<DemoBlock title="操作区">
  <oas-empty description="还没有任何成员">
    <oas-button slot="action" size="small" type="primary">邀请成员</oas-button>
    <oas-button slot="action" size="small">刷新列表</oas-button>
  </oas-empty>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `description` | 描述文案 | — | — |
| `hide-image` | 隐藏插画 | — | — |
| `illustration` | 自定义插画：SVG/HTML 标记或图片 URL | — | — |
| `image-size` | 插画尺寸（px） | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `action` | 操作区，置于描述下方 |
| `illustration` | 自定义插画内容，优先级高于 `illustration` 属性 |
