# Label

A form label component. `for` points to the target control's id, and clicking focuses the control; supports a required asterisk and its position.

## Basic usage

<DemoBlock title="Basic label">
  <oas-label for="demo-input">姓名</oas-label>
  <oas-input id="demo-input" placeholder="请输入姓名"></oas-input>
</DemoBlock>

## Required asterisk

`required` appends a `*` marker; `position` places the asterisk before (`before`) or after (`after`, default) the text.

<DemoBlock title="Required asterisk">
  <oas-label for="demo-required" required>邮箱</oas-label>
  <oas-input id="demo-required" placeholder="请输入邮箱"></oas-input>
</DemoBlock>

<DemoBlock title="Asterisk before">
  <oas-label for="demo-before" required position="before">手机号</oas-label>
  <oas-input id="demo-before" placeholder="请输入手机号"></oas-input>
</DemoBlock>

## Plain text label

Without `for`, only text is rendered and clicks don't forward focus; long text wraps instead of overflowing.

<DemoBlock title="Plain text & long text">
  <oas-label>无 for 的纯文本标签</oas-label>
  <oas-label>这是一段特别长的标签文案，用于演示长文本自动换行不溢出容器边界的效果，请保持耐心阅读。</oas-label>
</DemoBlock>

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `for` | Target control id; click forwards to `getElementById(for).focus()` | string | `''` |
| `required` | Append a required `*` marker (`aria-hidden`) | boolean | `false` |
| `position` | Position of the asterisk relative to the text | `before` / `after` | `after` |

> Note: `for` is also synced to the native `<label>` `for` attribute; the click behavior is manually forwarded and can focus the target control across Shadow DOM.
