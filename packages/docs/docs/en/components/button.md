# Button

Basic button component, an enhanced native `<button>`.

## Types

<DemoBlock title="Button types">
  <oas-button>默认按钮</oas-button>
  <oas-button type="primary">主要按钮</oas-button>
  <oas-button type="success">成功按钮</oas-button>
  <oas-button type="warning">警告按钮</oas-button>
  <oas-button type="danger">危险按钮</oas-button>
  <oas-button type="text">文字按钮</oas-button>
</DemoBlock>

## Sizes

<DemoBlock title="Three sizes">
  <oas-button size="small">小按钮</oas-button>
  <oas-button size="medium">中按钮</oas-button>
  <oas-button size="large">大按钮</oas-button>
</DemoBlock>

## Disabled & Loading

<DemoBlock title="Disabled and loading states">
  <oas-button disabled>禁用</oas-button>
  <oas-button type="primary" loading>加载中</oas-button>
  <oas-button type="success" loading>提交中</oas-button>
</DemoBlock>

## Events

<DemoBlock title="Click event">
  <oas-button type="primary" onoas-click="message.info('触发了 oas-click 事件')">点击我</oas-button>
</DemoBlock>

Clicking dispatches the `oas-click` CustomEvent (bubbles + composed); `detail.originalEvent` is the native MouseEvent.

## Icon buttons

`icon` renders an icon before the text (reusing the oas-icon icon set, `IconName`); the spacing between the icon and text follows `--oas-space-2`.

<DemoBlock title="Icon + text">
  <oas-button type="primary" icon="search">搜索</oas-button>
  <oas-button type="success" icon="download">下载</oas-button>
  <oas-button type="danger" icon="trash">删除</oas-button>
  <oas-button icon="plus">新建</oas-button>
</DemoBlock>

Without text, the button becomes an equal-width square and needs an `aria-label` for an accessible name; when not set explicitly, the icon name is used as a fallback (e.g. `icon="close"` → `aria-label="close"`). It is recommended to provide an explicit label.

<DemoBlock title="Icon-only buttons">
  <oas-button type="primary" icon="check" aria-label="确认"></oas-button>
  <oas-button icon="search" aria-label="搜索"></oas-button>
  <oas-button type="danger" icon="trash" aria-label="删除"></oas-button>
  <oas-button icon="heart" aria-label="收藏"></oas-button>
</DemoBlock>

## Block

`block` makes the button fill the full width of its parent container.

<DemoBlock title="Block buttons">
  <oas-button block type="primary">块级按钮</oas-button>
  <oas-button block type="success" icon="download">下载</oas-button>
</DemoBlock>

## Rounded

`round` applies a pill radius (`--oas-radius-full`, falling back to `999px` when the token is unavailable).

<DemoBlock title="Rounded buttons">
  <oas-button round type="primary" icon="check">完成</oas-button>
  <oas-button round icon="search" aria-label="搜索"></oas-button>
  <oas-button round type="danger">取消订阅</oas-button>
</DemoBlock>

## Ghost

`ghost` renders a transparent background with an outline; the outline and text are colored by `type` and darken on hover.

<DemoBlock title="Ghost buttons">
  <oas-button ghost>默认幽灵</oas-button>
  <oas-button ghost type="primary">主要幽灵</oas-button>
  <oas-button ghost type="success">成功幽灵</oas-button>
  <oas-button ghost type="warning">警告幽灵</oas-button>
  <oas-button ghost type="danger" icon="trash">危险幽灵</oas-button>
</DemoBlock>

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `type` | Type | `default` / `primary` / `success` / `warning` / `danger` / `text` | `default` |
| `size` | Size | `small` / `medium` / `large` | `medium` |
| `disabled` | Disabled | boolean | `false` |
| `loading` | Loading state | boolean | `false` |
| `icon` | Icon name (reusing the oas-icon icon set); without text it becomes an equal-width square and uses the icon name as the fallback label | `IconName` | — |
| `block` | Fill the full width of the parent container (block level) | boolean | `false` |
| `round` | Pill radius (`--oas-radius-full` / `999px`) | boolean | `false` |
| `ghost` | Ghost/outline style: transparent background + outline colored by `type`, darkens on hover | boolean | `false` |

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |
