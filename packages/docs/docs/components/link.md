# Link 链接

原生 `<a>` 增强的文字链接。

## 类型

<DemoBlock title="链接类型">
  <oas-link href="#">默认链接</oas-link>
  <oas-link href="#" type="primary">主要链接</oas-link>
  <oas-link href="#" type="success">成功链接</oas-link>
  <oas-link href="#" type="warning">警告链接</oas-link>
  <oas-link href="#" type="danger">危险链接</oas-link>
</DemoBlock>

## 下划线

<DemoBlock title="下划线控制">
  <oas-link href="#">有下划线</oas-link>
  <oas-link href="#" underline="false">无下划线</oas-link>
</DemoBlock>

## 禁用与新窗口

<DemoBlock title="禁用与 target">
  <oas-link href="#" disabled>禁用链接</oas-link>
  <oas-link href="https://example.com" target="_blank" type="primary">新窗口打开</oas-link>
</DemoBlock>

## 事件

<DemoBlock title="点击事件">
  <oas-link href="#" type="primary" onoas-click="message.info('触发了 oas-click 事件')">点击链接</oas-link>
</DemoBlock>

点击派发 `oas-click` CustomEvent，`detail.originalEvent` 为原生 MouseEvent。

## API

### 属性

| 属性        | 说明     | 类型       | 默认值    |
| ----------- | -------- | ---------- | --------- |
| `disabled`  | 禁用     | `boolean`  | —         |
| `href`      | 链接地址 | `string`   | —         |
| `target`    | 打开方式 | `string`   | —         |
| `type`      | 类型     | `LinkType` | `default` |
| `underline` | 下划线   | `string`   | `true`    |

### 事件

| 事件        | 说明                              |
| ----------- | --------------------------------- |
| `oas-click` | 点击，`detail: { originalEvent }` |

### 插槽

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |
