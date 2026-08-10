# Steps 步骤条

引导用户按流程完成任务的步骤指示器，支持等待 / 进行中 / 完成 / 错误四种状态、纵向排布与可点击跳转。

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

## 四种状态

通过每步的 `status` 字段显式指定状态：`wait` 等待（次要色 + 序号）、`process` 进行中（主色 + 序号）、`finish` 完成（成功色 + ✓）、`error` 错误（危险色 + ✕）。

<DemoBlock title="wait / process / finish / error">
  <oas-steps steps='[{"title":"等待中","description":"尚未开始","status":"wait"},{"title":"进行中","description":"正在处理","status":"process"},{"title":"已完成","description":"处理成功","status":"finish"},{"title":"出错","description":"处理失败","status":"error"}]'></oas-steps>
</DemoBlock>

## 可点击切换

`clickable` 开启后步骤项可点击跳转（整项可点，Enter/Space 键盘可达），点击派发 `oas-change`（detail 为 `{ index }`）并切换当前步。

<DemoBlock title="点击步骤切换当前步">
  <oas-steps clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clickable` | 步骤可点击跳转（布尔，存在即开启） | `boolean` | — |
| `current` | 当前步骤索引（0 起） | `string` | `0` |
| `direction` | 方向 | `string` | `horizontal` |
| `steps` | `[{ title, description?, status? }]` JSON 字符串 | `StepItem[] \| string` | `[]` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 点击可点击步骤时触发（含键盘触发）；`detail: { index }`（0 起） |

状态规则：显式 `status`（`wait` / `process` / `finish` / `error`）优先；未指定时按 `current` 推导——索引 `< current` 为 `finish`（✓），`=== current` 为 `process`，其余为 `wait`。
