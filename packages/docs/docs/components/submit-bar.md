---
description: "结算栏组件：底部吸底栏，左侧扩展区 + 合计金额（内嵌价格组件格式化）+ 主操作按钮，覆盖加载 / 禁用 / 危险三态。"
---

# SubmitBar 结算栏

页面或区块底部的结算栏：左侧扩展区（默认插槽，可放协议勾选、备注入口等）+ 合计金额 + 主操作按钮。合计金额内嵌 `oas-price` 渲染，币种 / 千分位 / 小数位与价格组件同源；按钮覆盖加载、禁用、危险三态。

## 基础用法

`total` 为合计金额，`action-text` 为主按钮文本；点击主按钮派发 `oas-submit`（`detail` 携带 `total` 与 `currency`）。

<DemoBlock title="合计 + 主按钮 + 事件反馈">
  <oas-submit-bar id="sb-basic" total="1299" action-text="提交订单"></oas-submit-bar>
  <p id="sb-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点击主按钮查看 oas-submit 反馈。
  </p>
</DemoBlock>

## 扩展内容

默认插槽渲染在合计左侧，适合放协议勾选、优惠说明等；无内容时自动收窄，不挤压金额。

<DemoBlock title="协议勾选">
  <oas-submit-bar id="sb-slot" total="2688" label="应付" action-text="去支付">
    <label style="display: inline-flex; align-items: center; gap: var(--oas-space-1)">
      <input type="checkbox" id="sb-agree"> 我已阅读并同意服务协议
    </label>
  </oas-submit-bar>
</DemoBlock>

## 币种与精度

合计金额的格式化与 `oas-price` 同源：`currency` 换币种、`locale` 决定符号位置与分组、「`precision`」决定小数位。

<DemoBlock title="多币种 / 无小数位">
  <oas-submit-bar id="sb-usd" total="99.5" currency="USD" locale="en-US" action-text="Pay"></oas-submit-bar>
  <oas-submit-bar
    id="sb-precision"
    total="1299.6"
    precision="0"
    action-text="提交订单"
    style="margin-top: var(--oas-space-2)"
  ></oas-submit-bar>
</DemoBlock>

## 加载 / 禁用 / 危险

`loading` 时按钮禁用并显示 spinner、`aria-busy="true"`；`disabled` 保留视觉但不可触发；`danger` 让主按钮走危险色。

<DemoBlock title="状态矩阵">
  <oas-submit-bar id="sb-loading" total="99" action-text="提交中" loading></oas-submit-bar>
  <oas-submit-bar id="sb-disabled" total="99" action-text="不可提交" disabled></oas-submit-bar>
  <oas-submit-bar id="sb-danger" total="99" action-text="删除订单" danger></oas-submit-bar>
</DemoBlock>

## 提示行

`tip` 在主行上方渲染一条提示（运费 / 发票等高频位），`tip-icon` 传已注册的图标名（未注册时开发态告警一次且不渲染图标，文案照常可读）：

<DemoBlock title="运费提示">
  <oas-submit-bar
    id="sb-tip"
    total="86"
    action-text="去结算"
    tip="运费 8 元，满 99 元免运费"
    tip-icon="info"
  ></oas-submit-bar>
  <oas-submit-bar
    total="129"
    action-text="去结算"
    tip="该商品支持开具电子发票"
    style="margin-top: var(--oas-space-2)"
  ></oas-submit-bar>
</DemoBlock>

## 底部安全区与占位

栏体底部内边距走 `max(间距, env(safe-area-inset-bottom))`（刘海屏 / 手势条自动避让）。栏体缺省 `position: sticky`（文档流内自带占位）；宿主用 CSS 覆写为 `fixed` 时开启 `placeholder`，组件会渲染一块与栏体等高的占位块防止页尾内容被遮挡：

<DemoBlock title="占位块（fixed 布局防遮挡）">
  <oas-submit-bar placeholder total="66" action-text="结算"></oas-submit-bar>
  <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    placeholder 在场时组件尾部渲染等高占位块（demo 中 sticky 布局下仅为演示开关）。
  </p>
</DemoBlock>

## 状态切换

宿主可通过写属性切换加载态；组件在加载态不派发 `oas-submit`。

<DemoBlock title="命令式切换 loading">
  <oas-submit-bar id="sb-toggle" total="399" action-text="立即支付"></oas-submit-bar>
  <oas-button id="sb-toggle-btn" size="small" style="margin-top: var(--oas-space-2)">切换 loading</oas-button>
</DemoBlock>

## API

### oas-submit-bar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `action-text` | 主按钮文本；缺省不渲染按钮（仅合计 + 扩展区，可作通用底栏） | — | — |
| `currency` | ISO 4217 币种，默认 `CNY` | `string` | `CNY` |
| `danger` | 主按钮采用危险色（删除 / 取消类主操作） | `boolean` | — |
| `disabled` | 禁用按钮（兼容 config-provider 注入禁用） | `boolean` | — |
| `label` | 合计标签，缺省走 i18n `submitBar.total` | — | — |
| `loading` | 加载中：按钮禁用 + spinner + `aria-busy`，不派发事件 | `boolean` | — |
| `locale` | 金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `placeholder` | 占位开关：渲染与栏体等高的占位块（宿主把栏体覆写为 fixed 定位时防止页尾内容被遮挡；sticky 布局无需开启） | `boolean` | — |
| `precision` | 金额小数位，默认 2 | `string` | `2` |
| `tip` | 提示行文案（运费 / 发票等高频提示，显示在主行上方） | — | — |
| `tip-icon` | 提示行图标名（图标注册表查表，自定义注册优先）；未注册时开发态告警一次且不渲染图标，文案照常可读 | — | — |
| `total` | 合计金额（数字字符串）；缺省不渲染金额 | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-submit` | 主按钮点击派发（非 loading / disabled），detail `{ total, currency }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 合计左侧扩展内容（协议勾选、备注入口等） |
| `total` | 覆盖默认金额展示（自定义价格排版） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-submit-bar-height` | `var(--oas-control-height-xl, 48px)` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-submit-bar').then(() => {
    const out = document.getElementById('sb-basic-out')
    const emit = (id, el) => {
      document.getElementById(id)?.addEventListener('oas-submit', (e) => {
        out.textContent = 'oas-submit：合计 ' + e.detail.total + ' ' + e.detail.currency
      })
    }
    emit('sb-basic')
    const toggle = document.getElementById('sb-toggle')
    const btn = document.getElementById('sb-toggle-btn')
    btn?.addEventListener('click', () => {
      const loading = toggle.hasAttribute('loading')
      if (loading) toggle.removeAttribute('loading')
      else toggle.setAttribute('loading', '')
      btn.textContent = loading ? '切换 loading' : '恢复可用'
    })
  })
})
</script>
