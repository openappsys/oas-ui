# Result 结果页

操作结果反馈页。

## 基础用法

<div class="demo">
  <oas-result status="success" title="提交成功" description="您的订单已完成支付">
    <oas-button slot="extra" type="primary">返回首页</oas-button>
  </oas-result>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `status` | `success` / `error` / `warning` / `info` | `success` |
| `title` | 标题 | — |
| `description` | 描述 | — |

插槽：`extra`（操作区）。
