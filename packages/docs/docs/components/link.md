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
  <oas-link href="#" type="primary" onclick="console.log('link clicked')">点击链接（控制台）</oas-link>
</DemoBlock>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `href` | 链接地址 | string | — |
| `type` | 类型 | `default` / `primary` / `success` / `warning` / `danger` | `default` |
| `underline` | 下划线 | boolean | `true` |
| `disabled` | 禁用 | boolean | `false` |
| `target` | 打开方式 | string | — |

| 事件 | 说明 |
|---|---|
| `oas-click` | 点击，`detail: { originalEvent }` |
