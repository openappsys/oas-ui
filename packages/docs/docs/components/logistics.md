---
description: "物流时间线：steps JSON 双通道（状态 / 时间 / 描述，最新在前惯例）+ 当前节点高亮（state 缺省按序推导）+ 折叠展开（只看最新 2 条）+ 复制单号 / 复制地址动作插槽；ol/li 时间线语义。"
---

# Logistics 物流时间线

节点时间线：`steps` JSON 双通道 `[{ state?, time?, desc?, title? }]`（**最新在前惯例**——首条为最新进展），`reverse` 属性翻转渲染方向（宿主数据为时间正序时用）；当前节点高亮（`state: 'done' | 'current' | 'pending'`，**缺省按序推导**——全部未声明时首条 current、其余 done；有显式声明时未声明条目按「首个未完成条目」分界：之前 done、之后 pending）；折叠（`collapsed` 只看最新 2 条 + 「展开全部 N 条」切换）；复制单号 / 复制地址等**动作插槽**（宿主给复制逻辑，组件提供槽位与按钮样式）。

## 基础时间线（缺省状态推导）

全部未声明 `state`：首条（最新进展）`current` 高亮 + `aria-current="step"`，其余 `done`。每条 `aria-label` 携带状态文本（不只靠颜色）：

<DemoBlock title="基础轨迹（最新在前，首条进行中）">
  <oas-logistics
    steps='[{"title":"包裹已签收","time":"11-24 18:20","desc":"签收人：本人"},{"title":"正在派送","time":"11-24 08:05","desc":"派送员：张师傅 138****0000"},{"title":"到达转运中心","time":"11-23 21:40"},{"title":"商家已发货","time":"11-22 12:00"}]'
  ></oas-logistics>
</DemoBlock>

## 显式状态与 reverse

全流程节点型数据：显式声明 `done` / `current` / `pending`，未声明条目按「首个未完成条目」分界推导；`reverse` 翻转渲染序（时间正序时间线，`aria-current` 跟随语义节点而非 DOM 位置）：

<DemoBlock title="显式状态 + reverse（时间正序）">
  <oas-logistics
    reverse
    steps='[{"title":"已下单","time":"11-20 10:00","state":"done"},{"title":"商家已发货","time":"11-21 09:30","state":"done"},{"title":"运输中","time":"11-23 21:40","state":"current"},{"title":"派送中","desc":"预计今天送达"},{"title":"已签收","desc":"收货地址：北京市朝阳区"}]'
  ></oas-logistics>
</DemoBlock>

## 折叠展开

`collapsed` 只显示最新 2 条 + 「展开全部 N 条」切换钮；点击组件回写 attribute 并派 `oas-toggle`（detail `{ collapsed }`，order-card 同名事件惯例）；steps ≤2 条不显示切换钮：

<DemoBlock title="折叠（只看最新 2 条）+ 切换反馈">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
  <oas-logistics id="lg-collapse" collapsed
    steps='[{"title":"包裹已签收","time":"11-24 18:20"},{"title":"正在派送","time":"11-24 08:05"},{"title":"到达转运中心","time":"11-23 21:40"},{"title":"商家已发货","time":"11-22 12:00"},{"title":"订单已创建","time":"11-21 10:00"}]'
  ></oas-logistics>
  <p id="lg-collapse-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点「展开全部 5 条」/「收起」观察 oas-toggle 反馈。
  </p>
  </div>
</DemoBlock>

## 动作插槽（复制单号 / 复制地址）

`actions` 插槽：复制逻辑归宿主（`navigator.clipboard` 自行调用），组件提供槽位容器与布局；插槽无内容时动作区整体隐藏：

<DemoBlock title="复制单号 / 复制地址动作位">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
  <oas-logistics id="lg-actions"
    steps='[{"title":"包裹已签收","time":"11-24 18:20","desc":"运单号 SF1380000221108"}]'
  >
    <oas-button slot="actions" size="small" data-demo-copy="单号">复制单号</oas-button>
    <oas-button slot="actions" size="small" data-demo-copy="地址">复制地址</oas-button>
  </oas-logistics>
  <p id="lg-actions-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点动作钮观察宿主复制反馈。
  </p>
  </div>
</DemoBlock>

## 键盘与无障碍

- 时间线为 `ol > li` 合法组合（ol 天然 list 语义 + `aria-label`「物流跟踪」；**切换钮 / 动作区 / 空态都在 ol 之外**——非条目节点不进列表语义）。
- 当前节点 `aria-current="step"`；每个 li 的 `aria-label` 携带状态文本（已完成 / 进行中 / 待完成）与 title / time / desc 全内容——**节点状态不只靠颜色**（视觉上 current 点径更大 + 标题加重）。
- 切换钮可见文本即状态（「展开全部 N 条」/「收起」）；动作区 `role="group"` + `aria-label`「相关操作」。
- `steps` 为空 / 非法 JSON 时渲染空态「暂无物流信息」（非法告警一次按空处理）。
- RTL 下连接线与布局走逻辑属性自动镜像；颜色全走 token（暗色自动跟随）。

## 自定义样式须知

`::part(timeline)` 为 `ol` 时间线容器；条目 `::part(item)` 内含 `::part(dot)` 状态点（`data-state="done|current|pending"` 定向）与 `::part(title)` / `::part(time)` / `::part(desc)`；连接线画在 item 的 `::before` 上。改状态点配色对 `[data-state] .dot` 或 `::part(dot)` 配合宿主侧 `[data-state]` 属性选择器覆写即可。

<script setup lang="ts">
import { onMounted } from 'vue'

// demo 脚本约定（勿改位置）：① 必须是**页面级** script setup——写进 DemoBlock 内部时 VitePress 不会抽取，
// 会被原样输出成页面正文（Cannot use import statement / hydration mismatch，demo 全灭）；
// ② 放在 `## API` 之前：该章节是 api:gen 生成区，业务脚本不得落在生成区内。
onMounted(() => {
  customElements.whenDefined('oas-logistics').then(() => {
    // —— 折叠切换反馈 ——
    const collapse = document.getElementById('lg-collapse')!
    const collapseOut = document.getElementById('lg-collapse-out')!
    collapse.addEventListener('oas-toggle', (e) => {
      const d = (e as CustomEvent).detail
      collapseOut.textContent = d.collapsed ? 'oas-toggle：已收起（只看最新 2 条）' : 'oas-toggle：已展开全部'
    })

    // —— 动作插槽：宿主复制逻辑 ——
    const actions = document.getElementById('lg-actions')!
    const actionsOut = document.getElementById('lg-actions-out')!
    actions.querySelectorAll('[data-demo-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = (btn as HTMLElement).dataset.demoCopy
        const text = kind === '单号' ? 'SF1380000221108' : '北京市朝阳区xx路xx号'
        void navigator.clipboard?.writeText(text).catch(() => {})
        actionsOut.textContent = `已复制${kind}：${text}（宿主持有复制逻辑，组件只提供槽位）`
      })
    })
  })
})
</script>

## API

### oas-logistics

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapsed` | 折叠态：只看最新 2 条（steps ≤2 条时切换钮隐藏）；用户点击切换时组件回写 attribute 并派发 oas-toggle | `boolean` | — |
| `reverse` | 翻转渲染序（宿主数据为时间正序时用；aria-current 跟随语义节点而非 DOM 位置） | `boolean` | — |
| `steps` | 物流节点 JSON 数组 `[{ state?, time?, desc?, title? }]`（最新在前惯例；缺 title 且缺 desc 的条目忽略；非法 JSON 告警一次按空处理渲染空态） | `LogisticsStep[] \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapsed` | 折叠态：get+set 双通道（布尔），写即反射 `collapsed` attribute（宿主直写静默，用户点击才派发） | `boolean` | — |
| `steps` | 物流节点数据：get+set 双通道（数组或 JSON 字符串），写即反射 `steps` attribute | `LogisticsStep[] \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-toggle` | 用户点展开 / 收起切换后派发，`detail: { collapsed }`（切换后的状态）；宿主写 `collapsed` attribute 不派发 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 动作区（复制单号 / 复制地址等——复制逻辑与按钮可访问名归宿主，组件提供槽位与布局；无内容时动作区整体隐藏） |
