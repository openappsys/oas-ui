# Link

A text link, an enhanced native `<a>`.

## Types

<DemoBlock title="Link types">
  <oas-link href="#">默认链接</oas-link>
  <oas-link href="#" type="primary">主要链接</oas-link>
  <oas-link href="#" type="success">成功链接</oas-link>
  <oas-link href="#" type="warning">警告链接</oas-link>
  <oas-link href="#" type="danger">危险链接</oas-link>
</DemoBlock>

## Underline

<DemoBlock title="Underline control">
  <oas-link href="#">有下划线</oas-link>
  <oas-link href="#" underline="false">无下划线</oas-link>
</DemoBlock>

## Disabled & new window

<DemoBlock title="Disabled & target">
  <oas-link href="#" disabled>禁用链接</oas-link>
  <oas-link href="https://example.com" target="_blank" type="primary">新窗口打开</oas-link>
</DemoBlock>

## Events

<DemoBlock title="Click event">
  <oas-link href="#" type="primary" onoas-click="message.info('触发了 oas-click 事件')">点击链接</oas-link>
</DemoBlock>

Clicking dispatches the `oas-click` CustomEvent; `detail.originalEvent` is the native MouseEvent.

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `href` | Link URL | string | — |
| `type` | Type | `default` / `primary` / `success` / `warning` / `danger` | `default` |
| `underline` | Underline | boolean | `true` |
| `disabled` | Disabled | boolean | `false` |
| `target` | Open behavior | string | — |

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |
