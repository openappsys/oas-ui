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

## 分组、计数与「不使用优惠券」出口

列表弹层按可用 / 不可用分组渲染（标题走 i18n，空组不渲染）；`show-count` 让分组标题带计数胶囊。列表顶部固定「不使用优惠券」出口：点击派发 `oas-clear`，随后派发**空选** `oas-select`（单选 detail `{ code: '', coupon: null }`），并关闭弹层——宿主两个事件都能收到，按需取用：

<DemoBlock title="分组 + 计数 + 出口">
  <oas-coupon
    id="cp-group"
    show-count
    list='[{"code":"g1","amount":30,"threshold":199},{"code":"g2","amount":10},{"code":"g3","amount":50,"status":"unavailable","reason":"未满 299 元可用"},{"code":"g4","amount":20,"status":"expired"}]'
  ></oas-coupon>
  <p id="cp-group-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    打开弹层查看分组；点「不使用优惠券」查看 oas-clear 反馈。
  </p>
</DemoBlock>

## 多选 multiple

`multiple` 让选项变成 checkbox：每次勾选 / 取消都派发 `oas-select`（detail 为数组 `{ codes, coupons }`），弹层**不自动关闭**（由宿主决定何时收起）；触发按钮显示已选张数。缺省单选不变（radio + 选中即关）：

<DemoBlock title="多选券叠加">
  <oas-coupon
    id="cp-multi"
    multiple
    list='[{"code":"m1","amount":10},{"code":"m2","amount":20,"threshold":99},{"code":"m3","amount":5,"status":"expired"}]'
  ></oas-coupon>
  <p id="cp-multi-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    打开弹层勾选多张，每次勾选查看数组 detail。
  </p>
</DemoBlock>

## 多选叠加规则（max-select / 互斥组）

多选模式下可叠加两条组合规则（都会在 `oas-select` 之外给出明确反馈）：

- `max-select`：已选张数上限（正整数；`0` / 非法 = 不限并告警一次）。到达上限后再勾选**不生效**——勾选态回滚、已选集合不变，派发 `oas-select-invalid`（`detail: { reason: 'max-select', limit, code, codes, coupons }`）。触发按钮显示 `已选 n/m 张`。
- **互斥组**：列表条目写 `exclusiveGroup`，同组券互斥——选中一张会自动取消同组其他已选券（自动解决的组合不阻塞，被取消的 code 随 `oas-select` 的 `removed` 字段回传）。不同组与无组券可并存。
- 两条规则叠加时按**换选后的净张数**判定：同组换选先淘汰同组其他券，不额外占名额（已满 2 张时换选同组另一张不会触发拒绝）。
- 单选模式天然互斥，忽略 `max-select` 与 `exclusiveGroup`。

<DemoBlock title="max-select=2 + 互斥组（store 组只能留一张）">
  <oas-coupon
    id="cp-combo"
    multiple
    max-select="2"
    list='[{"code":"s1","amount":30,"exclusiveGroup":"store"},{"code":"s2","amount":20,"exclusiveGroup":"store"},{"code":"p1","amount":10,"exclusiveGroup":"platform"},{"code":"f1","amount":5}]'
  ></oas-coupon>
  <div style="margin-top: var(--oas-space-2); display: flex; gap: var(--oas-space-2)">
    <oas-button id="cp-combo-open" size="small">打开弹层</oas-button>
  </div>
  <p
    id="cp-combo-out"
    style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"
  >
    勾选观察：上限拒绝派发 oas-select-invalid，换选同组券时 removed 回传被取消的券。
  </p>
</DemoBlock>

## 命令式开合与清空选择

`open` 是受控属性（宿主写 attribute / property 静默生效），`openOverlay()` / `closeOverlay()` 是命令式开合（派发 `oas-open-change`）；`clearSelection()` 清空已选券（静默，供宿主重置选择状态）。`z-index` 数值叠加在 `--oas-z-index-base` 之上（缺省沿用 `--oas-z-modal` 层叠阶梯，与 modal / drawer 同形态），下方 demo 给 1300。

<DemoBlock title="openOverlay() / closeOverlay() / clearSelection()">
  <oas-coupon
    id="cp-api"
    list='[{"code":"x","amount":15,"threshold":0,"validity":"长期有效"}]'
    z-index="1300"
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
| `multiple` | 多选模式：选项变 checkbox，每次勾选/取消派发数组 detail `{ codes, coupons }` 且弹层不自动关闭；缺省单选不变 | `boolean` | — |
| `open` | 弹层开合（受控：宿主写 attribute / property 静默生效；用户交互与 `openOverlay()` / `closeOverlay()` 改变开合时派发 `oas-open-change`） | `boolean \| string` | — |
| `reason` | 不可用原因文案（`status="unavailable"` 时展示） | — | — |
| `selected` | 选中态标记（供外层组合排版） | `boolean` | — |
| `show-count` | 可用 / 不可用分组标题带计数胶囊 | `boolean` | — |
| `start` | 有效期开始（`YYYY-MM-DD`） | — | — |
| `status` | 状态：`available`（默认）/ `expired` / `used` / `unavailable`（未达门槛等） | `string` | `available` |
| `threshold` | 使用门槛（数字，0 或缺省 = 无门槛） | — | — |
| `trigger-text` | 触发按钮文案（缺省 i18n `coupon.select`；已选券时显示所选面额） | — | — |
| `validity` | 有效期文案覆盖（如「长期有效」），优先于 start/end 格式化结果 | — | — |
| `z-index` | 浮层层级（数值叠加在 `--oas-z-index-base` 之上；缺省沿用 `--oas-z-modal` 层叠阶梯，与 modal / drawer 同形态） | — | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `openOverlay` | `openOverlay(): void` | 命令式打开弹层（已打开则忽略），派发 `oas-open-change` |
| `closeOverlay` | `closeOverlay(): void` | 命令式关闭弹层（已关闭则忽略），派发 `oas-open-change` |
| `clearSelection` | `clearSelection(): void` | 清空已选券与触发按钮上的面额（静默，不派发事件） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-clear` | 点击「不使用优惠券」出口派发（紧随其后是空选 oas-select，两个事件成对） |
| `oas-open-change` | 交互或命令式开合时派发，detail `{ open }`（受控属性写入不派发） |
| `oas-select` | 选中可用券时派发。单选（默认）detail `{ code, coupon }` 并随后关闭弹层；multiple 模式 detail `{ codes, coupons }`（数组，弹层不关）；「不使用优惠券」出口派发空选——单选 `{ code: 空串, coupon: null }` / 多选 `{ codes: [], coupons: [] }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-coupon').then(() => {
    const out = document.getElementById('cp-select-out')
    document.getElementById('cp-select')?.addEventListener('oas-select', (e) => {
      // 「不使用优惠券」出口派发空选：coupon 为 null，须守卫（类型已拓宽为 CouponSelectDetail.coupon: CouponData | null）
      const coupon = e.detail.coupon
      out.textContent = coupon
        ? 'oas-select：券 ' + e.detail.code + '，面额 ' + coupon.amount
        : 'oas-select 空选：{ code: \'\', coupon: null }'
    })
    const group = document.getElementById('cp-group')
    const groupOut = document.getElementById('cp-group-out')
    group?.addEventListener('oas-clear', () => {
      groupOut.textContent = 'oas-clear：不使用优惠券（随后收到空选 oas-select）'
    })
    group?.addEventListener('oas-select', (e) => {
      if (!e.detail.code) groupOut.textContent = 'oas-select 空选：{ code: \'\', coupon: null }'
    })
    const multi = document.getElementById('cp-multi')
    const multiOut = document.getElementById('cp-multi-out')
    multi?.addEventListener('oas-select', (e) => {
      multiOut.textContent = 'oas-select 数组：[' + e.detail.codes.join(', ') + ']'
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
    // 多选叠加规则：上限拒绝 / 互斥替换的可见反馈
    const combo = document.getElementById('cp-combo')
    const comboOut = document.getElementById('cp-combo-out')
    document.getElementById('cp-combo-open')?.addEventListener('click', () => {
      combo?.openOverlay()
    })
    combo?.addEventListener('oas-select', (e) => {
      const removed = e.detail.removed ?? []
      comboOut.textContent =
        'oas-select：已选 [' + e.detail.codes.join(', ') + ']' + (removed.length ? '；互斥取消 ' + removed.join(', ') : '')
    })
    combo?.addEventListener('oas-select-invalid', (e) => {
      comboOut.textContent = 'oas-select-invalid：超过 max-select=' + e.detail.limit + '，券 ' + e.detail.code + ' 未被选中'
    })
  })
})
</script>
