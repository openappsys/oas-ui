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

## 状态

`error` 校验失败红字；`disabled` 静态灰化（纯视觉，不拦事件——关联控件自己管 disabled）；`colon` 文本后冒号。

<DemoBlock title="状态">
  <oas-label error>校验失败的标签</oas-label>
  <oas-label disabled>禁用的标签</oas-label>
  <oas-label colon>带冒号的标签</oas-label>
  <oas-label required colon>必填 + 冒号</oas-label>
</DemoBlock>

## 提示（tooltip）

`tooltip` 在文本后渲染提示图标按钮，悬停出浮层（复用 `oas-tooltip`，组件内不做浮层）。

<DemoBlock title="提示图标">
  <oas-label tooltip="用户名需 3-20 字符">用户名</oas-label>
</DemoBlock>

## 颜色

`color` 支持 11 个预设色名（明暗主题自动适配）或任意 CSS 色值（直接生效，优先于预设与默认）。文字走达标 token：

<DemoBlock title="预设色板">
  <oas-label color="red">红色标签</oas-label>
  <oas-label color="green">绿色标签</oas-label>
  <oas-label color="blue">蓝色标签</oas-label>
</DemoBlock>

<DemoBlock title="自定义色值">
  <oas-label color="#0e7490">青碧色标签</oas-label>
</DemoBlock>

## 布局对齐与换行（宿主 CSS 等价做法）

文字对齐/换行这类布局样式不需要组件属性，宿主一行 CSS 即得：

<DemoBlock title="对齐与换行（宿主 CSS）">
  <oas-label style="text-align: right; display: block;">右对齐标签</oas-label>
  <oas-label style="white-space: nowrap;">不换行标签</oas-label>
</DemoBlock>

必填标记形态（星号 + 位置）由 `required` + `position` 覆盖；Field 组合（label + 错误提示 + 描述）由 `oas-form-item` 承载。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `colon` | — | `boolean` | — |
| `color` | — | `string` | — |
| `disabled` | — | `boolean` | — |
| `error` | — | `boolean` | — |
| `for` | 目标控件 id，点击代理 `getElementById(for).focus()` | `string` | — |
| `position` | 星号相对文本的位置 | `string` | `after` |
| `required` | 追加必填 `*` 标记（`aria-hidden`） | `boolean` | — |
| `tooltip` | — | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

> 说明：`for` 同时同步到原生 `<label>` 的 `for` 属性；点击行为为手动代理，可跨 Shadow DOM 聚焦目标控件。双击不选中文本（与主流行为一致）。
