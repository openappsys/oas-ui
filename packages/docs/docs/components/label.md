# Label 标签

表单标签组件，`for` 指向目标控件 id，点击代理聚焦目标控件；支持必填星号与星号位置。

## 基本用法

<DemoBlock title="基础标签">
  <oas-label for="demo-input">姓名</oas-label>
  <oas-input id="demo-input" placeholder="请输入姓名"></oas-input>
</DemoBlock>

## 必填星号

`required` 追加 `*` 标记；`position` 控制星号位于文本前（`before`）或后（`after`，默认）。

<DemoBlock title="必填星号">
  <oas-label for="demo-required" required>邮箱</oas-label>
  <oas-input id="demo-required" placeholder="请输入邮箱"></oas-input>
</DemoBlock>

<DemoBlock title="星号前置">
  <oas-label for="demo-before" required position="before">手机号</oas-label>
  <oas-input id="demo-before" placeholder="请输入手机号"></oas-input>
</DemoBlock>

## 纯文本标签

不设置 `for` 时仅渲染文本，点击无焦点代理；长文本自动换行不溢出。

<DemoBlock title="纯文本与长文本">
  <oas-label>无 for 的纯文本标签</oas-label>
  <oas-label>这是一段特别长的标签文案，用于演示长文本自动换行不溢出容器边界的效果，请保持耐心阅读。</oas-label>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `for` | 目标控件 id，点击代理 `getElementById(for).focus()` | `string` | — |
| `position` | 星号相对文本的位置 | `string` | `after` |
| `required` | 追加必填 `*` 标记（`aria-hidden`） | `boolean` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

> 说明：`for` 同时同步到原生 `<label>` 的 `for` 属性；点击行为为手动代理，可跨 Shadow DOM 聚焦目标控件。
