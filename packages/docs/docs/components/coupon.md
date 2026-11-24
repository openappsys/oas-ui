---
description: "优惠券组件：券面卡片（面额 / 使用门槛 / 有效期 / 状态语义色）+ 领取与选择列表弹层；已过期、已使用、未达门槛等不可用态完整覆盖，选择派发 oas-select。"
---

# Coupon 优惠券

两种形态共用一份券面渲染：

- **券面卡片**（默认）：面额、使用门槛、有效期、状态语义色；
- **选择弹层**（`list` 在场）：触发按钮 + 底部弹层列表，可用券可选，过期 / 已使用 / 未达门槛券禁用，选中派发 `oas-select` 并关闭。

## 券面卡片

`amount` 为面额，`threshold` 为使用门槛（0 或缺省 = 无门槛），`start` / `end` 为有效期（也可用 `validity` 文本完全接管展示）：

<DemoBlock title="可用券">
  <oas-coupon amount="30" threshold="199" start="2026-01-01" end="2026-02-28"></oas-coupon>
  <oas-coupon amount="10" threshold="0" validity="长期有效" style="margin-top: var(--oas-space-2)"></oas-coupon>
</DemoBlock>

## 状态语义

`status="expired|used"` 走弱化底 + 禁用文字；`status="unavailable"` 配 `reason` 说明未达门槛等原因：

<DemoBlock title="已过期 / 已使用 / 未达门槛">
  <oas-coupon amount="20" threshold="99" status="expired"></oas-coupon>
  <oas-coupon amount="20" threshold="99" status="used" style="margin-top: var(--oas-space-2)"></oas-coupon>
  <oas-coupon amount="50" threshold="299" status="unavailable" reason="未满 299 元可用" style="margin-top: var(--oas-space-2)"></oas-coupon>
</DemoBlock>

## 币种、券标识与选中标记

`currency` / `locale` 决定面额与日期的格式化；`code` 是券标识，随 `oas-select` 的 detail 回传便于宿主对账；`selected` 只是选中态标记（由外层组合排版使用，不参与选择逻辑）：

<DemoBlock title="多币种 + 券标识 + 选中态">
  <oas-coupon amount="20" threshold="199" currency="USD" locale="en-US" code="usd-20"></oas-coupon>
  <oas-coupon
    amount="15"
    validity="长期有效"
    selected
    code="local-15"
    style="margin-top: var(--oas-space-2)"
  ></oas-coupon>
</DemoBlock>

## 选择弹层

`list` 传券列表 JSON；点击触发按钮打开底部弹层（`role="dialog"` + 焦点移入 + Esc / 遮罩关闭），可用券选中后派发 `oas-select` 并关闭。已选券会在触发按钮上显示面额；`trigger-text` 覆盖触发按钮文案（未选券时显示）：

> 弹层接入浮层层叠协议：打开即锁定页面滚动（跨组件引用计数，最后一个浮层关闭时精确恢复宿主原值），Esc 交给共享层栈按「后开者先关」排定——与 `oas-modal` / `oas-drawer` 同开时一次 Esc 只关最上层。弹层宿主被摘挂再挂回时，打开态会重新持锁。

<DemoBlock title="选择优惠券 + 事件反馈">
  <oas-coupon
    id="cp-select"
    list='[{"code":"a","amount":30,"threshold":199,"start":"2026-01-01","end":"2026-02-28"},{"code":"b","amount":10,"threshold":0,"validity":"长期有效"},{"code":"c","amount":50,"threshold":299,"status":"unavailable","reason":"未满 299 元可用"},{"code":"d","amount":20,"status":"expired"}]'
  ></oas-coupon>
  <oas-coupon
    id="cp-trigger-text"
    trigger-text="我的优惠券"
    list='[{"code":"e","amount":5,"threshold":0,"validity":"长期有效"}]'
    style="margin-top: var(--oas-space-2)"
  ></oas-coupon>
  <p id="cp-select-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点击触发按钮选择优惠券。
  </p>
</DemoBlock>

## 命令式开合与清空选择

`open` 是受控属性（宿主写 attribute / property 静默生效），`openOverlay()` / `closeOverlay()` 是命令式开合（派发 `oas-open-change`）；`clearSelection()` 清空已选券（静默，供宿主重置选择状态）。

<DemoBlock title="openOverlay() / closeOverlay() / clearSelection()">
  <oas-coupon
    id="cp-api"
    list='[{"code":"x","amount":15,"threshold":0,"validity":"长期有效"}]'
  ></oas-coupon>
  <div style="margin-top: var(--oas-space-2); display: flex; gap: var(--oas-space-2)">
    <oas-button id="cp-open" size="small">打开弹层</oas-button>
    <oas-button id="cp-clear" size="small">清空选择</oas-button>
  </div>
</DemoBlock>

## API

### oas-coupon

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `amount` | 券面额（数字，卡片模式必填） | — | — |
| `code` | 券标识（事件 detail 回传） | — | — |
| `currency` | ISO 4217 币种，默认 `CNY` | `string` | `CNY` |
| `end` | 有效期结束（`YYYY-MM-DD`） | — | — |
| `list` | 选择列表 JSON 数组 `[{ code, amount, threshold?, start?, end?, validity?, status?, reason? }]`；在场时切换为弹层形态 | `CouponData[] \| string` | — |
| `locale` | 金额与日期格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `open` | 弹层开合（受控：宿主写 attribute / property 静默生效；用户交互与 `openOverlay()` / `closeOverlay()` 改变开合时派发 `oas-open-change`） | `boolean \| string` | — |
| `reason` | 不可用原因文案（`status="unavailable"` 时展示） | — | — |
| `selected` | 选中态标记（供外层组合排版） | `boolean` | — |
| `start` | 有效期开始（`YYYY-MM-DD`） | — | — |
| `status` | 状态：`available`（默认）/ `expired` / `used` / `unavailable`（未达门槛等） | `string` | `available` |
| `threshold` | 使用门槛（数字，0 或缺省 = 无门槛） | — | — |
| `trigger-text` | 触发按钮文案（缺省 i18n `coupon.select`；已选券时显示所选面额） | — | — |
| `validity` | 有效期文案覆盖（如「长期有效」），优先于 start/end 格式化结果 | — | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `openOverlay` | `openOverlay(): void` | 命令式打开弹层（已打开则忽略），派发 `oas-open-change` |
| `closeOverlay` | `closeOverlay(): void` | 命令式关闭弹层（已关闭则忽略），派发 `oas-open-change` |
| `clearSelection` | `clearSelection(): void` | 清空已选券与触发按钮上的面额（静默，不派发事件） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | 交互或命令式开合时派发，detail `{ open }`（受控属性写入不派发） |
| `oas-select` | 选中可用券时派发，detail `{ code, coupon }`，随后关闭弹层 |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-coupon').then(() => {
    const out = document.getElementById('cp-select-out')
    document.getElementById('cp-select')?.addEventListener('oas-select', (e) => {
      out.textContent = 'oas-select：券 ' + e.detail.code + '，面额 ' + e.detail.coupon.amount
    })
    const api = document.getElementById('cp-api')
    document.getElementById('cp-open')?.addEventListener('click', () => {
      api?.openOverlay()
    })
    document.getElementById('cp-clear')?.addEventListener('click', () => {
      api?.clearSelection()
      out.textContent = 'clearSelection：已清空选择'
    })
    api?.addEventListener('oas-open-change', (e) => {
      out.textContent = 'oas-open-change：open=' + e.detail.open
    })
  })
})
</script>
