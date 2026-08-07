# Steps 步骤条

引导用户按流程完成任务的步骤指示器，支持完成 / 进行中 / 等待三种状态与纵向排布。

## 基础用法

<DemoBlock title="进行中">
  <oas-steps current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 完成态

<DemoBlock title="全部完成">
  <oas-steps current="3" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## 初始步骤

<DemoBlock title="初始等待">
  <oas-steps current="0" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"第三步"}]'></oas-steps>
</DemoBlock>

## 无描述

<DemoBlock title="仅标题">
  <oas-steps current="1" steps='[{"title":"注册"},{"title":"实名认证"},{"title":"开通完成"}]'></oas-steps>
</DemoBlock>

## 纵向

<DemoBlock title="纵向方向">
  <div style="width: 260px">
    <oas-steps direction="vertical" current="1" steps='[{"title":"填写资料","description":"基本信息与联系方式"},{"title":"上传证件","description":"身份证正反面"},{"title":"审核通过","description":"等待管理员审核"}]'></oas-steps>
  </div>
</DemoBlock>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `steps` | `[{ title, description? }]` JSON 字符串 | `[]` |
| `current` | 当前步骤索引（0 起） | `0` |
| `direction` | 方向 | `horizontal` / `vertical` |

状态规则：`索引 < current` 为完成（✓），`=== current` 为进行中，其余为等待。无事件。
