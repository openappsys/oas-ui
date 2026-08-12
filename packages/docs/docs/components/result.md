# Result 结果页

操作结果反馈页，支持成功、失败、警告、信息四种状态。

## 基础用法

<DemoBlock title="基础用法">
  <oas-result status="success" title="提交成功" description="您的订单已完成支付"></oas-result>
</DemoBlock>

## 四种状态

<DemoBlock title="四种状态">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-result status="success" title="操作成功" description="处理已完成"></oas-result>
    <oas-result status="error" title="操作失败" description="处理过程中出现问题"></oas-result>
    <oas-result status="warning" title="存在警告" description="部分操作未能完成"></oas-result>
    <oas-result status="info" title="信息提示" description="这是一条说明信息"></oas-result>
  </oas-space>
</DemoBlock>

## 操作区

<DemoBlock title="操作区">
  <oas-result status="success" title="提交成功" description="您的订单已完成支付">
    <oas-button slot="extra" type="primary">返回首页</oas-button>
    <oas-button slot="extra">查看订单</oas-button>
  </oas-result>
</DemoBlock>

## API

### 属性

| 属性          | 说明     | 类型     | 默认值    |
| ------------- | -------- | -------- | --------- |
| `description` | 描述文案 | `string` | —         |
| `status`      | 结果状态 | `string` | `success` |
| `title`       | 标题文案 | `string` | —         |

### 插槽

| 名称    | 说明                 |
| ------- | -------------------- |
| `extra` | 操作区，置于描述下方 |
