# ButtonGroup

Button group: combines multiple `oas-button` elements into a value-selection group; adjacent button corners merge and hover only highlights the current item.

## Basic usage

<DemoBlock title="Basic button group">
  <oas-button-group>
    <oas-button value="1">一月</oas-button>
    <oas-button value="2">二月</oas-button>
    <oas-button value="3">三月</oas-button>
  </oas-button-group>
</DemoBlock>

## Type & size passthrough

`type` / `size` are passed through uniformly to all child buttons in the group.

<DemoBlock title="Type & size passthrough">
  <oas-button-group type="primary" size="large">
    <oas-button value="a">左</oas-button>
    <oas-button value="b">中</oas-button>
    <oas-button value="c">右</oas-button>
  </oas-button-group>
</DemoBlock>

## Single select

Declare the current selection with `value`; clicking dispatches `oas-change` with `detail: { value }`.

<DemoBlock title="Single-select group">
  <oas-button-group value="b" onoas-change="message.info('选中：' + event.detail.value)">
    <oas-button value="a">选项 A</oas-button>
    <oas-button value="b">选项 B</oas-button>
    <oas-button value="c">选项 C</oas-button>
  </oas-button-group>
</DemoBlock>

## Multiple select

Add `multiple` to enable multi-select; `value` uses comma-separated selected values. Clicking dispatches `oas-change` with `detail: { value: [] }`.

<DemoBlock title="Multi-select group">
  <oas-button-group multiple value="a,c">
    <oas-button value="a">标签 A</oas-button>
    <oas-button value="b">标签 B</oas-button>
    <oas-button value="c">标签 C</oas-button>
  </oas-button-group>
</DemoBlock>

## Accessible name

`aria-label` gives the button group container an accessible name, letting screen readers announce it as a single focusable group; when unset, the built-in i18n label "button group" is used. When multiple groups exist on a page, use names to distinguish them.

<DemoBlock title="aria-label accessible name">
  <oas-button-group aria-label="视图切换" value="list">
    <oas-button value="list">列表视图</oas-button>
    <oas-button value="grid">网格视图</oas-button>
  </oas-button-group>
  <oas-button-group aria-label="结果导出" value="csv">
    <oas-button value="csv">导出 CSV</oas-button>
    <oas-button value="pdf">导出 PDF</oas-button>
  </oas-button-group>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical button group">
  <oas-button-group vertical>
    <oas-button value="up">置顶</oas-button>
    <oas-button value="mid">置中</oas-button>
    <oas-button value="down">置底</oas-button>
  </oas-button-group>
</DemoBlock>

## Disabled & mixed

`disabled` disables the whole group; buttons without a `value` attribute act as regular buttons and don't participate in selection.

<DemoBlock title="Disabled & mixed">
  <oas-button-group disabled>
    <oas-button value="1">已禁用</oas-button>
    <oas-button value="2">已禁用</oas-button>
  </oas-button-group>
  <oas-button-group>
    <oas-button value="save">保存</oas-button>
    <oas-button value="delete" type="danger">删除</oas-button>
    <oas-button>更多操作</oas-button>
  </oas-button-group>
</DemoBlock>

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `type` | Type passed to child buttons | `default` / `primary` / … | Unset |
| `size` | Size passed to child buttons | `small` / `medium` / `large` | Unset |
| `vertical` | Stack vertically, merging corners top/bottom | boolean | `false` |
| `value` | Selected value (single value in single-select, comma-separated in multi-select) | string | `''` |
| `multiple` | Multi-select mode | boolean | `false` |
| `disabled` | Disable the whole group | boolean | `false` |
| `aria-label` | Group container accessible name (defaults to the built-in i18n label) | string | Built-in |

| Event | Description |
| --- | --- |
| `oas-change` | Selection changed. Single-select `detail: { value }`; multi-select `detail: { value: [] }` |

> Note: child buttons declare their selectable value via the `value` attribute; children without `value` are regular buttons and don't participate in selection or dispatch `oas-change`. The selected state is expressed through the child button's `aria-pressed`; use `oas-button[aria-pressed='true']` to customize the selected style.
