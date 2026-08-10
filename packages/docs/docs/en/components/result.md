# Result

A result feedback page supporting four states: success, error, warning, and info.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-result status="success" title="提交成功" description="您的订单已完成支付"></oas-result>
</DemoBlock>

## Four states

<DemoBlock title="Four states">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-result status="success" title="操作成功" description="处理已完成"></oas-result>
    <oas-result status="error" title="操作失败" description="处理过程中出现问题"></oas-result>
    <oas-result status="warning" title="存在警告" description="部分操作未能完成"></oas-result>
    <oas-result status="info" title="信息提示" description="这是一条说明信息"></oas-result>
  </oas-space>
</DemoBlock>

## Action area

<DemoBlock title="Action area">
  <oas-result status="success" title="提交成功" description="您的订单已完成支付">
    <oas-button slot="extra" type="primary">返回首页</oas-button>
    <oas-button slot="extra">查看订单</oas-button>
  </oas-result>
</DemoBlock>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `status` | Result status | `success` / `error` / `warning` / `info` | `success` |
| `title` | Title text | `string` | — |
| `description` | Description text | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| `extra` | Action area, placed below the description |
