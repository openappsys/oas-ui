# Steps

A step indicator that guides users through a task, with four states (wait / process / finish / error), vertical layout and clickable navigation.

## Basic usage

<DemoBlock title="In progress">
  <oas-steps current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## Finished state

<DemoBlock title="All finished">
  <oas-steps current="3" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## Initial step

<DemoBlock title="Initial waiting">
  <oas-steps current="0" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"第三步"}]'></oas-steps>
</DemoBlock>

## Four states

Set the state explicitly per step via the `status` field: `wait` waiting (secondary color + number), `process` in progress (primary color + number), `finish` done (success color + ✓), `error` error (danger color + ✕).

<DemoBlock title="wait / process / finish / error">
  <oas-steps steps='[{"title":"等待中","description":"尚未开始","status":"wait"},{"title":"进行中","description":"正在处理","status":"process"},{"title":"已完成","description":"处理成功","status":"finish"},{"title":"出错","description":"处理失败","status":"error"}]'></oas-steps>
</DemoBlock>

## Clickable switching

With `clickable` enabled, step items are clickable to jump (the whole item is clickable and keyboard-reachable via Enter/Space); clicking fires `oas-change` (detail is `{ index }`) and switches the current step.

<DemoBlock title="Click a step to switch the current step">
  <oas-steps clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## Without description

<DemoBlock title="Titles only">
  <oas-steps current="1" steps='[{"title":"注册"},{"title":"实名认证"},{"title":"开通完成"}]'></oas-steps>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical direction">
  <div style="width: 260px">
    <oas-steps direction="vertical" current="1" steps='[{"title":"填写资料","description":"基本信息与联系方式"},{"title":"上传证件","description":"身份证正反面"},{"title":"审核通过","description":"等待管理员审核"}]'></oas-steps>
  </div>
</DemoBlock>

## API

| Property    | Description                                              | Default                 |
| ----------- | -------------------------------------------------------- | ----------------------- |
| `steps`     | `[{ title, description?, status? }]` JSON string         | `[]`                    |
| `current`   | Current step index (0-based)                             | `0`                     |
| `direction` | Direction                                                | `horizontal` / `vertical` |
| `clickable` | Steps are clickable to jump (boolean; enabled when present) | off                    |

State rules: an explicit `status` (`wait` / `process` / `finish` / `error`) takes priority; otherwise it is derived from `current` — index `< current` is `finish` (✓), `=== current` is `process`, and the rest are `wait`.

| Event        | Description                                  | detail        |
| ------------ | -------------------------------------------- | ------------- |
| `oas-change` | Fired when a clickable step is clicked (including keyboard triggers) | `{ index }` (0-based) |
