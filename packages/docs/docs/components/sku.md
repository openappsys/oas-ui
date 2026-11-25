---
description: "商品规格选择：specs + skus 数据契约、选中组合精确定位 sku、缺货选项置灰、部分选择时给出可选路径提示、数量步进（上限随库存）；内嵌面板与底部弹层两种承载共用同一份面板。"
---

# SKU 商品规格

商品规格选择：`specs` 描述规格组与选项，`skus` 描述组合对应的价格 / 库存 / 图片。全选后精确定位 sku 并展示价格；部分选择时逐项判断「沿该选项能否走到在库组合」，走不到的选项置灰并标「缺货」（可选路径提示）；数量步进上限跟随匹配 sku 的库存。两种承载共用同一份面板：宽屏内嵌面板，`layout="popup"`（或 ≤480px 自动）走底部弹层。

## 基础用法

`value` 为选中组合（JSON 对象），`quantity` 为数量；用户选择会回写这两个属性并派发 `oas-change`：

<DemoBlock title="规格选择 + 价格联动 + 事件反馈">
  <oas-sku
    id="sku-basic"
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M","L"]}]'
    skus='[{"id":"black-s","specs":{"color":"曜石黑","size":"S"},"price":299,"stock":5},{"id":"black-m","specs":{"color":"曜石黑","size":"M"},"price":319,"stock":0},{"id":"black-l","specs":{"color":"曜石黑","size":"L"},"price":339,"stock":2},{"id":"white-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":3},{"id":"white-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":1},{"id":"white-l","specs":{"color":"雾霭白","size":"L"},"price":349,"stock":0}]'
  ></oas-sku>
  <p id="sku-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    选择颜色与尺码查看价格与库存反馈。
  </p>
</DemoBlock>

## 缺货与可选路径

选中「曜石黑」后，M 码在该颜色下无库存 —— 置灰并标「缺货」；「雾霭白」的 M 码仍有 1 件，切到白色后即可选。全部组合无库存时所有选项置灰。

<DemoBlock title="路径提示">
  <oas-sku
    id="sku-path"
    value='{"color":"曜石黑"}'
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M"]}]'
    skus='[{"id":"black-s","specs":{"color":"曜石黑","size":"S"},"price":299,"stock":2},{"id":"black-m","specs":{"color":"曜石黑","size":"M"},"price":319,"stock":0},{"id":"white-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":0},{"id":"white-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":1}]'
  ></oas-sku>
</DemoBlock>

## 弹层形态（底部弹层）

`layout="popup"` 把**同一份面板**交给底部弹层承载（`oas-bottom-sheet`：下滑 / 点遮罩 / Esc 关闭，打开时焦点移入面板、Tab 在面板内循环）。`layout` 缺省时按视口自动切换：宽度 ≤480px 用弹层、宽屏内嵌；显式写死的值不被视口覆盖，视口越界变化即时重判（无需刷新）。

开合走 bottom-sheet 协议：`open` 为受控属性（宿主写 attribute / property 静默生效），关闭请求由承载件派发 `oas-close`（带 `reason`）后本组件自动收起；交互与命令式开合派发 `oas-open-change`：

<DemoBlock title="layout=popup + 触发按钮">
  <oas-sku
    id="sku-popup"
    layout="popup"
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M"]}]'
    skus='[{"id":"black-s","specs":{"color":"曜石黑","size":"S"},"price":299,"stock":5},{"id":"black-m","specs":{"color":"曜石黑","size":"M"},"price":319,"stock":0},{"id":"white-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":3},{"id":"white-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":1}]'
  ></oas-sku>
  <div style="display: flex; gap: var(--oas-space-2); align-items: center; margin: var(--oas-space-2) 0 0">
    <oas-button id="sku-popup-open" size="small">选择规格</oas-button>
    <span id="sku-popup-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">弹层未打开</span>
  </div>
</DemoBlock>

> 内嵌形态下 `openOverlay()` / `closeOverlay()` 只告警一次（不产生幽灵 open 态）；`open` 属性仅 popup 形态生效——内嵌形态下预置的 `open` 在切到 popup 形态（显式或窄屏自动）时会自动弹开。

## 数量步进与库存上限

数量上限 = 匹配 sku 的库存；加号到上限即禁用，输入超库存会被钳制。缺货组合下数量控件禁用：

<DemoBlock title="数量步进（库存 2）">
  <oas-sku
    id="sku-qty"
    value='{"color":"雾霭白","size":"M"}'
    quantity="1"
    specs='[{"key":"color","label":"颜色","values":["雾霭白"]},{"key":"size","label":"尺码","values":["M"]}]'
    skus='[{"id":"w-m","specs":{"color":"雾霭白","size":"M"},"price":329,"stock":2}]'
  ></oas-sku>
  <p id="sku-qty-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    加号加到库存上限后禁用。
  </p>
</DemoBlock>

## 币种与精度

面板内价格通过内嵌 `oas-price` 展示，`currency` / `locale` / `precision` 与价格组件同源：

<DemoBlock title="多币种 / 无小数位">
  <oas-sku
    value='{"color":"曜石黑","size":"M"}'
    currency="USD"
    locale="en-US"
    precision="0"
    specs='[{"key":"color","label":"Color","values":["曜石黑"]},{"key":"size","label":"Size","values":["M"]}]'
    skus='[{"id":"usd","specs":{"color":"曜石黑","size":"M"},"price":49.9,"stock":4}]'
  ></oas-sku>
</DemoBlock>

## 全禁用

`disabled` 让所有选项与数量控件不可用（金额与缺货提示仍可读），常用于下架或活动未开始：

<DemoBlock title="禁用态">
  <oas-sku
    disabled
    value='{"color":"雾霭白","size":"S"}'
    specs='[{"key":"color","label":"颜色","values":["曜石黑","雾霭白"]},{"key":"size","label":"尺码","values":["S","M"]}]'
    skus='[{"id":"w-s","specs":{"color":"雾霭白","size":"S"},"price":309,"stock":3}]'
  ></oas-sku>
</DemoBlock>

## 多规格组（服装类目）

真实服装类目常见 6 个售卖维度同屏（颜色 / 尺码 / 领型 / 袖型 / 披肩 / 材质）：组件按 `specs` 顺序逐组渲染，组合表只需收录实际售卖的热门组合（全笛卡尔积 288 条，这里 31 条）。选到组合表里不存在的搭配（如「V领 + 有披肩」）时，走不到在库组合的选项全部置灰标「缺货」，同组内改选仍可达的选项（如「圆领」）保持可选——部分选择的可行性引导把用户从死路里带出来。窄屏缺省会自动切弹层承载，这里显式固定 `layout="embedded"` 以便观察多组内嵌布局：

<DemoBlock title="多规格组（服装类目）">
  <oas-sku
    id="sku-multi"
    layout="embedded"
    specs='[{"key":"color","label":"颜色","values":["黑","白","米"]},{"key":"size","label":"尺码","values":["S","M","L","XL"]},{"key":"collar","label":"领型","values":["圆领","V领","翻领"]},{"key":"sleeve","label":"袖型","values":["长袖","短袖"]},{"key":"shawl","label":"披肩","values":["无","有"]},{"key":"material","label":"材质","values":["棉","聚酯"]}]'
    skus='[{"specs":{"color":"黑","size":"S","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":12},{"specs":{"color":"黑","size":"M","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":7},{"specs":{"color":"黑","size":"L","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":5},{"specs":{"color":"黑","size":"XL","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":0},{"specs":{"color":"白","size":"S","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":8},{"specs":{"color":"白","size":"M","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":6},{"specs":{"color":"白","size":"L","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":4},{"specs":{"color":"白","size":"XL","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":199,"stock":0},{"specs":{"color":"米","size":"M","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":209,"stock":3},{"specs":{"color":"米","size":"L","collar":"圆领","sleeve":"长袖","shawl":"无","material":"棉"},"price":209,"stock":2},{"specs":{"color":"黑","size":"M","collar":"圆领","sleeve":"长袖","shawl":"无","material":"聚酯"},"price":159,"stock":1},{"specs":{"color":"黑","size":"M","collar":"圆领","sleeve":"短袖","shawl":"无","material":"棉"},"price":129,"stock":9},{"specs":{"color":"黑","size":"L","collar":"圆领","sleeve":"短袖","shawl":"无","material":"棉"},"price":129,"stock":6},{"specs":{"color":"黑","size":"XL","collar":"圆领","sleeve":"短袖","shawl":"无","material":"棉"},"price":129,"stock":3},{"specs":{"color":"白","size":"S","collar":"圆领","sleeve":"短袖","shawl":"无","material":"棉"},"price":129,"stock":7},{"specs":{"color":"白","size":"M","collar":"圆领","sleeve":"短袖","shawl":"无","material":"棉"},"price":129,"stock":5},{"specs":{"color":"黑","size":"M","collar":"V领","sleeve":"短袖","shawl":"无","material":"棉"},"price":139,"stock":4},{"specs":{"color":"黑","size":"L","collar":"V领","sleeve":"短袖","shawl":"无","material":"棉"},"price":139,"stock":3},{"specs":{"color":"黑","size":"S","collar":"V领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":119,"stock":2},{"specs":{"color":"白","size":"M","collar":"V领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":119,"stock":1},{"specs":{"color":"黑","size":"M","collar":"翻领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":169,"stock":5},{"specs":{"color":"黑","size":"L","collar":"翻领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":169,"stock":4},{"specs":{"color":"黑","size":"XL","collar":"翻领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":169,"stock":2},{"specs":{"color":"白","size":"M","collar":"翻领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":169,"stock":3},{"specs":{"color":"白","size":"L","collar":"翻领","sleeve":"短袖","shawl":"无","material":"聚酯"},"price":169,"stock":0},{"specs":{"color":"米","size":"L","collar":"翻领","sleeve":"长袖","shawl":"无","material":"棉"},"price":219,"stock":1},{"specs":{"color":"黑","size":"M","collar":"圆领","sleeve":"长袖","shawl":"有","material":"棉"},"price":259,"stock":3},{"specs":{"color":"黑","size":"L","collar":"圆领","sleeve":"长袖","shawl":"有","material":"棉"},"price":259,"stock":2},{"specs":{"color":"米","size":"M","collar":"圆领","sleeve":"长袖","shawl":"有","material":"棉"},"price":269,"stock":1},{"specs":{"color":"白","size":"L","collar":"圆领","sleeve":"长袖","shawl":"有","material":"棉"},"price":259,"stock":0},{"specs":{"color":"黑","size":"L","collar":"翻领","sleeve":"长袖","shawl":"无","material":"聚酯"},"price":189,"stock":0}]'
  ></oas-sku>
  <p id="sku-multi-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    选择规格查看组合联动反馈。
  </p>
</DemoBlock>

## 售卖维度 vs 描述属性

`specs` 只收**售卖维度**——影响 SKU 组合拆分与库存核算的属性（颜色 / 尺码 / 领型 / 袖型 / 披肩有无），判据是「不同规格组合的价格或库存是否可能不同」。**描述属性不要进 `specs`**：产地、品牌、成分含量这类全组合共享的信息，同一商品不因规格而变，塞进 `specs` 只会让组合表按其选项数倍增——3 组各 3 选项已是 27 条组合起步，再加一个 2 选项的非售卖维度就是 54 条 `skus` 条目，但价格与库存完全相同（纯数据膨胀，无业务语义）。描述属性的推荐去处是宿主的商品详情区（组件外展示），组合表保持只含「真实可买、价格或库存可能不同」的组合；不必凑满笛卡尔积，未收录的组合自动按不可达置灰引导。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-sku').then(() => {
    const out = document.getElementById('sku-basic-out')
    document.getElementById('sku-basic')?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || '未选全'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      out.textContent = 'oas-change：' + combo + ' × ' + d.quantity + '，单价 ' + price
    })
    const qtyOut = document.getElementById('sku-qty-out')
    document.getElementById('sku-qty')?.addEventListener('oas-change', (e) => {
      qtyOut.textContent = '数量：' + e.detail.quantity + '（' + e.detail.change + '）'
    })

    // 弹层形态：命令式打开；oas-close 由承载件透传（组件已自行收起，这里只做观测 / 埋点）
    const popup = document.getElementById('sku-popup')
    const popupOut = document.getElementById('sku-popup-out')
    document.getElementById('sku-popup-open')?.addEventListener('click', () => popup?.openOverlay())
    popup?.addEventListener('oas-open-change', (e) => {
      popupOut.textContent = e.detail.open ? '弹层已打开（Esc / 点遮罩 / 下滑关闭）' : '弹层已关闭'
    })
    popup?.addEventListener('oas-close', (e) => {
      popupOut.textContent = '关闭原因：' + e.detail.reason
    })
    popup?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || '未选全'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      popupOut.textContent = '弹层内选择：' + combo + ' × ' + d.quantity + '，单价 ' + price
    })

    // 多规格组（服装类目）：组合联动反馈——6 组全选精确定位，部分选择展示可行性引导
    const multiOut = document.getElementById('sku-multi-out')
    document.getElementById('sku-multi')?.addEventListener('oas-change', (e) => {
      const d = e.detail
      const combo = Object.keys(d.value || {}).map((k) => d.value[k]).join(' / ') || '未选全'
      const price = d.sku && d.sku.price != null ? d.sku.price : '—'
      multiOut.textContent = 'oas-change：' + combo + ' × ' + d.quantity + '，单价 ' + price
    })
  })
})
</script>

## API

### oas-sku

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `currency` | ISO 4217 币种，默认 `CNY` | `string` | `CNY` |
| `disabled` | 全禁用（兼容 config-provider 注入禁用） | `boolean` | — |
| `layout` | 承载形态：`embedded`（内嵌面板）/ `popup`（底部弹层，走 bottom-sheet 协议）；缺省按视口自动（≤480px 弹层）；非法值告警回落 embedded | — | — |
| `locale` | 价格格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN` | — | — |
| `open` | 弹层开合（受控：宿主写 attribute / property 静默生效；仅 popup 形态生效）。交互与 `openOverlay()` / `closeOverlay()` 改变时派发 `oas-open-change`；popup（弹层打开态）切回 embedded 时组件同步回写 false 并派发一次（承载弹层已隐藏，open 不残留悬空真值）。内嵌形态下写入的 `open` 作为待生效意图保留（不派发事件），切回 popup 时自动弹开 | `boolean \| string` | — |
| `precision` | 价格小数位，默认 2 | — | — |
| `quantity` | 数量（默认 1；上限 = 匹配 sku 库存） | `number \| string` | — |
| `skus` | SKU JSON 数组 `[{ id?, specs: { [key]: value }, price?, stock?, image?, imageAlt? }]` | `SkuItem[] \| string` | — |
| `specs` | 规格组 JSON 数组 `[{ key, label?, values: (string \| { value, label? })[] }]` | `SkuSpecGroup[] \| string` | — |
| `value` | 选中组合 JSON 对象 `{ [specKey]: value }`（受控；用户选择回写） | `Record<string, string> \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `open` | 弹层开合（受控：读写即反射 `open` attribute，静默不派发事件；仅 popup 形态生效） | `boolean \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `openOverlay` | `openOverlay(): void` | 命令式打开弹层（幂等；派发 `oas-open-change`；非 popup 形态只告警一次） |
| `closeOverlay` | `closeOverlay(): void` | 命令式关闭弹层（幂等；派发 `oas-open-change`；非 popup 形态只告警一次） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 规格或数量变化派发，detail `{ value, quantity, sku, change: 'spec' \| 'quantity' }`（sku 为完整匹配对象或 null） |
| `oas-close` | 承载件 **透传** 的关闭请求（下滑 / 遮罩 / Esc），`detail: { reason }`；组件收到后已自行收起，宿主无需再处理（监听仅用于观测 / 联动） |
| `oas-open-change` | 弹层开合变化（交互 / 命令式 / 形态切换收口），`detail: { open }`；受控属性写入不派发 |
