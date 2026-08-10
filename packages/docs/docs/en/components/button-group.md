# ButtonGroup

Button group: combines multiple `oas-button` elements into a value-selection group; adjacent button corners merge and hover only highlights the current item.

## Basic usage

<DemoBlock title="Basic button group">
  <oas-button-group>
    <oas-button value="1">January</oas-button>
    <oas-button value="2">February</oas-button>
    <oas-button value="3">March</oas-button>
  </oas-button-group>
</DemoBlock>

## Type & size passthrough

`type` / `size` are passed through uniformly to all child buttons in the group.

<DemoBlock title="Type & size passthrough">
  <oas-button-group type="primary" size="large">
    <oas-button value="a">Left</oas-button>
    <oas-button value="b">Middle</oas-button>
    <oas-button value="c">Right</oas-button>
  </oas-button-group>
</DemoBlock>

## Single select

Declare the current selection with `value`; clicking dispatches `oas-change` with `detail: { value }`.

<DemoBlock title="Single-select group">
  <oas-button-group value="b" onoas-change="message.info('Selected: ' + event.detail.value)">
    <oas-button value="a">Option A</oas-button>
    <oas-button value="b">Option B</oas-button>
    <oas-button value="c">Option C</oas-button>
  </oas-button-group>
</DemoBlock>

## Multiple select

Add `multiple` to enable multi-select; `value` uses comma-separated selected values. Clicking dispatches `oas-change` with `detail: { value: [] }`.

<DemoBlock title="Multi-select group">
  <oas-button-group multiple value="a,c">
    <oas-button value="a">Tag A</oas-button>
    <oas-button value="b">Tag B</oas-button>
    <oas-button value="c">Tag C</oas-button>
  </oas-button-group>
</DemoBlock>

## Accessible name

`aria-label` gives the button group container an accessible name, letting screen readers announce it as a single focusable group; when unset, the built-in i18n label "button group" is used. When multiple groups exist on a page, use names to distinguish them.

<DemoBlock title="aria-label accessible name">
  <oas-button-group aria-label="View switch" value="list">
    <oas-button value="list">List view</oas-button>
    <oas-button value="grid">Grid view</oas-button>
  </oas-button-group>
  <oas-button-group aria-label="Export results" value="csv">
    <oas-button value="csv">Export CSV</oas-button>
    <oas-button value="pdf">Export PDF</oas-button>
  </oas-button-group>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical button group">
  <oas-button-group vertical>
    <oas-button value="up">Top</oas-button>
    <oas-button value="mid">Middle</oas-button>
    <oas-button value="down">Bottom</oas-button>
  </oas-button-group>
</DemoBlock>

## Disabled & mixed

`disabled` disables the whole group; buttons without a `value` attribute act as regular buttons and don't participate in selection.

<DemoBlock title="Disabled & mixed">
  <oas-button-group disabled>
    <oas-button value="1">Disabled</oas-button>
    <oas-button value="2">Disabled</oas-button>
  </oas-button-group>
  <oas-button-group>
    <oas-button value="save">Save</oas-button>
    <oas-button value="delete" type="danger">Delete</oas-button>
    <oas-button>More actions</oas-button>
  </oas-button-group>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Group container accessible name (defaults to the built-in i18n label) | — | — |
| `disabled` | Disable the whole group | — | — |
| `multiple` | Multi-select mode | — | — |
| `size` | Size passed to child buttons | — | — |
| `type` | Type passed to child buttons | — | — |
| `value` | Selected value (single value in single-select, comma-separated in multi-select) | — | — |
| `vertical` | Stack vertically, merging corners top/bottom | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection changed. Single-select `detail: { value }`; multi-select `detail: { value: [] }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

> Note: child buttons declare their selectable value via the `value` attribute; children without `value` are regular buttons and don't participate in selection or dispatch `oas-change`. The selected state is expressed through the child button's `aria-pressed`; use `oas-button[aria-pressed='true']` to customize the selected style.
