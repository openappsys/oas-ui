# Empty 空状态

空数据时的占位展示，支持自定义描述、隐藏插画与操作区。

## 基础用法

<DemoBlock title="基础用法">
  <oas-empty></oas-empty>
</DemoBlock>

## 自定义描述

<DemoBlock title="自定义描述">
  <oas-empty description="暂无符合条件的记录"></oas-empty>
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
|---|---|---|---|
| `description` | 描述文案 | `string` | `暂无数据` |
| `hide-image` | 隐藏内置插画 | `boolean` | `false` |

### 插槽

| 名称 | 说明 |
|---|---|
| `action` | 操作区，置于描述下方 |
