---
description: "列表页筛选栏：排序项（综合 / 销量 / 价格升降）+ 条件面板（下拉 / 半屏抽屉两形态，多组单选 / 多选条件）+ 已选条件回显 chips（逐项撤销 / 一键重置）+ conditions JSON 双通道与 oas-change。"
---

# Filter 筛选栏

电商列表页的筛选闭环：排序项常显在栏上（综合 / 销量 / 价格，价格支持升降切换），条件面板承载多组筛选条件（单选组 / 多选组），已选条件在面板下方回显成 chips——逐项可撤销，一键可重置。值契约是 `conditions` JSON 双通道：非受控下用户交互后组件自动回写（开箱即用），受控宿主监听 `oas-change` 接管即可。面板分**下拉贴底**与**半屏抽屉**两形态，窄屏建议抽屉。

## 基础用法

`groups` 声明条件组（`multiple: true` 为多选组，否则单选组）；点排序项、选条件、撤 chip 都派发 `oas-change`（detail 含当前排序、各组选中值与汇总摘要文本，摘要可直接喂 `aria-live` 播报）：

<DemoBlock title="排序 + 条件组 + 已选回显">

<oas-filter id="filter-basic"></oas-filter>
<p id="filter-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
  点排序项 / 展开面板选条件 / 点 chip 撤销，观察 oas-change 反馈。
</p>
<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-filter').then(() => {
    const el = document.getElementById('filter-basic')!
    el.setAttribute('groups', JSON.stringify([
      { key: 'brand', label: '品牌', multiple: true, options: [
        { value: 'a', label: '品牌A' }, { value: 'b', label: '品牌B' }, { value: 'c', label: '品牌C' },
      ] }),
      { key: 'color', label: '颜色', options: [
        { value: 'red', label: '红色' }, { value: 'blue', label: '蓝色' },
      ] },
    ]))
    const out = document.getElementById('filter-basic-out')!
    el.addEventListener('oas-change', (e) => {
      const d = (e as CustomEvent).detail
      out.textContent = `oas-change：sort=${d.sort}${d.order ? `（${d.order === 'asc' ? '升序' : '降序'}）` : ''}，summary=${d.summary || '（无已选条件）'}`
    })
    el.addEventListener('oas-open-change', (e) => {
      out.textContent = `oas-open-change：${(e as CustomEvent).detail.open ? '面板已展开' : '面板已收起'}`
    })
  })
})
</script>

</DemoBlock>

## 排序项配置

`sorts` 可整体替换缺省三件套；`toggled: true` 的排序项支持升降 toggle——首次点击降序、再点升序（电商「价格↓」惯例），方向会进 `oas-change` 的 `order` 与 summary：

<DemoBlock title="自定义排序项 + 价格升降">
  <oas-filter
    sorts='[{"key":"new","label":"最新"},{"key":"hot","label":"热度","toggled":true},{"key":"price","label":"价格","toggled":true}]'
  ></oas-filter>
</DemoBlock>

## 多组条件面板

单选组点已选项 = 取消（回到「不限」）；多选组任意勾选；`disabled` 选项置灰不可点。已选条件以 chips 回显，`aria-label` 为「移除 条件名」，可 Tab 聚焦后回车撤销；末尾「重置」一键清空（含排序回缺省）：

<DemoBlock title="单选组 + 多选组 + disabled 选项">
  <oas-filter
    groups='[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"},{"value":"c","label":"品牌C"},{"value":"d","label":"品牌D（缺货）","disabled":true}]},{"key":"color","label":"颜色","options":[{"value":"red","label":"红色"},{"value":"blue","label":"蓝色"},{"value":"black","label":"黑色"}]},{"key":"size","label":"尺码","options":[{"value":"s","label":"S"},{"value":"m","label":"M"},{"value":"l","label":"L"}]}]'
  ></oas-filter>
</DemoBlock>

## 抽屉形态

`panel="drawer"` 切半屏抽屉（底部滑入 + 遮罩），窄屏（移动端）建议用抽屉；遮罩点击、「完成」按钮、Esc 三路关闭，关闭后焦点回触发器。缺省 `panel="dropdown"` 为贴底下拉，点面板外自动收起：

<DemoBlock title="drawer 半屏抽屉">
  <oas-filter
    panel="drawer"
    groups='[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"}]},{"key":"color","label":"颜色","options":[{"value":"red","label":"红色"},{"value":"blue","label":"蓝色"}]}]'
  ></oas-filter>
</DemoBlock>

## 受控用法

宿主写 `conditions`（或 property 通道 `el.conditions = {...}`）直接同步视图（chips 回显、排序选中态、徽标计数），**不派发** `oas-change`；组件在用户交互后回写 `conditions` attribute——受控宿主监听 `oas-change` 改写即可接管。`open` 同款双通道（预置展开不派发 `oas-open-change`）：

<DemoBlock title="预置条件 + 宿主重置">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-filter
      id="filter-controlled"
      conditions='{"sort":"price","order":"desc","groups":{"brand":["a","b"]}}'
      groups='[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"}]}]'
    ></oas-filter>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="filter-clear" size="small">清空条件（宿主侧）</oas-button>
      <span id="filter-controlled-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

## 预置展开与预置条件

`open` 属性让面板预置展开（宿主直写，不派发 `oas-open-change`）；与 `conditions` 组合即为「记住用户上次筛选」的回显形态：

<DemoBlock title="预置展开 + 预置条件（open attribute）">
  <div style="width: 100%">
    <oas-filter
      open
      conditions='{"groups":{"brand":["a"],"color":["red"]}}'
      groups='[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"}]},{"key":"color","label":"颜色","options":[{"value":"red","label":"红色"},{"value":"blue","label":"蓝色"}]}]'
    ></oas-filter>
    <div style="height: 240px" aria-hidden="true"></div>
  </div>
</DemoBlock>

## 组合商品列表

与 `oas-goods-list` 组成列表页闭环：筛选变化回填列表数据（本 demo 用静态数据模拟过滤）：

<DemoBlock title="filter + goods-list 列表页配方">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-filter
      id="filter-combo"
      groups='[{"key":"kind","label":"品类","multiple":true,"options":[{"value":"clothes","label":"服饰"},{"value":"shoes","label":"鞋靴"},{"value":"bag","label":"箱包"}]}]'
    ></oas-filter>
    <oas-goods-list id="goods-combo" columns="3"></oas-goods-list>
  </div>
  <script setup lang="ts">
  import { onMounted } from 'vue'
  onMounted(() => {
    Promise.all([
      customElements.whenDefined('oas-filter'),
      customElements.whenDefined('oas-goods-list'),
    ]).then(() => {
      const filter = document.getElementById('filter-combo')!
      const list = document.getElementById('goods-combo')!
      const catalog = [
        { title: '纯棉短袖T恤', kind: 'clothes', price: 79 },
        { title: '轻便帆布鞋', kind: 'shoes', price: 129 },
        { title: '通勤单肩包', kind: 'bag', price: 199 },
        { title: '针织开衫', kind: 'clothes', price: 149 },
        { title: '跑步运动鞋', kind: 'shoes', price: 259 },
        { title: '防水登山包', kind: 'bag', price: 329 },
      ]
      const render = () => {
        const kinds = filter.conditions.groups?.kind ?? []
        const rows = kinds.length > 0 ? catalog.filter((it) => kinds.includes(it.kind)) : catalog
        list.items = rows.map(({ title, price }) => ({ title, price }))
      }
      render()
      filter.addEventListener('oas-change', render)
    })
  })
  </script>
</DemoBlock>

## 键盘与无障碍

- 排序行与单选组为 `radiogroup` 语义（方向键在组内移动焦点），多选组为 `group` + `checkbox` 语义；Tab 可达每个选项。
- 触发器 `aria-haspopup` / `aria-expanded` / `aria-controls`，已选计数进可访问名；开面板自动聚焦首个条件，Esc 关闭并焦点回触发器。
- chips 为可聚焦按钮，`aria-label` =「移除 条件名」；汇总摘要渲染进 `aria-live="polite"` 活区。
- 下拉形态点面板外收起；抽屉形态遮罩 / 「完成」/ Esc 关闭。RTL 下布局走逻辑属性自动镜像。

## 自定义样式须知

`::part(bar)` 为两端布局（排序行在行首、触发器在行尾）；`::part(panel)` 下拉形态绝对定位于栏底、抽屉形态 `position: fixed` 贴底（`data-form` 属性区分）；`::part(chips)` 为 flex wrap 行。选项选中态底色是主色 10% `color-mix`，覆写选中样式时注意保持与 token 的联动。

## API

### oas-filter

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `conditions` | 当前值 JSON `{ sort?, order?, groups? }`（`order` 仅 toggled 排序项有意义：`asc` / `desc`；`groups` 为 `组key: [值…]`，单选组 ≤1 项）。用户交互后组件回写并派发 oas-change；宿主写入只同步视图不派发 | `FilterConditions \| string` | — |
| `groups` | 条件组配置 JSON 数组 `[{ key, label, multiple?, options: [{ value, label, disabled? }] }]`；缺 `options` 或非法条目被忽略，非法 JSON 告警一次按空处理（无可筛组时触发器隐藏） | `FilterGroup[] \| string` | — |
| `open` | 面板展开态：用户 / `setOpen()` 开合回写并派发 oas-open-change；宿主直写只同步视图不派发 | `boolean` | — |
| `panel` | 面板形态：`dropdown`（缺省，贴底下拉，点面板外收起）/ `drawer`（半屏抽屉 + 遮罩，窄屏建议）；非法值回落 dropdown 并告警一次 | — | — |
| `sorts` | 排序项配置 JSON 数组 `[{ key, label, toggled? }]`；缺省三件套（综合 / 销量 / 价格，价格 toggled），非法 JSON 告警一次回落缺省；`toggled` 项首次点击降序、再点升序 | `FilterSortOption[] \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `conditions` | 当前值：get+set 双通道（对象或 JSON 字符串），写即反射 `conditions` attribute（受控写入不派发 oas-change） | `FilterConditions \| string` | — |
| `groups` | 条件组配置：get+set 双通道（数组或 JSON 字符串），写即反射 `groups` attribute | `FilterGroup[] \| string` | — |
| `open` | 面板展开态：get+set 双通道（布尔），写即反射 `open` attribute（静默；`setOpen()` 才派发事件） | `boolean` | — |
| `sorts` | 排序项配置：get+set 双通道（数组或 JSON 字符串），写即反射 `sorts` attribute | `FilterSortOption[] \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `setOpen` | `setOpen(open: boolean): void` | 编程式开合（等价用户交互）：回写 `open` attribute + 派发 oas-open-change + 焦点管理（开面板聚焦首个条件、关闭回触发器） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 排序 / 选条件 / 撤 chip / 重置后派发，`detail: { sort, order, groups, summary }`（summary 为汇总摘要文本，供宿主 aria-live 播报）；宿主写 `conditions` attribute 不派发 |
| `oas-open-change` | 用户 / `setOpen()` 开合面板后派发，`detail: { open }`；宿主写 `open` attribute 不派发 |

<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-filter').then(() => {
    // 受控 demo：预置条件 + 宿主清空
    const ctl = document.getElementById('filter-controlled')!
    const out = document.getElementById('filter-controlled-out')!
    out.textContent = '当前 conditions：' + (ctl.getAttribute('conditions') ?? '（空）')
    ctl.addEventListener('oas-change', () => {
      out.textContent = '当前 conditions：' + (ctl.getAttribute('conditions') ?? '（空）')
    })
    document.getElementById('filter-clear')?.addEventListener('click', () => {
      ctl.conditions = {}
    })
  })
})
</script>
