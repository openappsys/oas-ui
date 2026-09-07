# Radio 单选框

原生 `<input type="radio">` 增强，支持单选组键盘导航（radiogroup 模式）、数据驱动与卡片形态。

## 基础用法

<DemoBlock title="基础用法">
  <oas-radio name="demo-basic" checked>选项一</oas-radio>
  <oas-radio name="demo-basic">选项二</oas-radio>
</DemoBlock>

同名 `name` 的 radio 互斥（组件跨 Shadow DOM 同步）；无 name 时各自独立，互斥请用同名或 `oas-radio-group`。

## 尺寸

<DemoBlock title="三档尺寸（size）">
  <oas-space direction="column">
    <oas-radio size="small" name="demo-size" checked>small（14px）</oas-radio>
    <oas-radio name="demo-size" checked>medium（默认，16px）</oas-radio>
    <oas-radio size="large" name="demo-size" checked>large（18px）</oas-radio>
  </oas-space>
</DemoBlock>

`size` 同时控制圆点尺寸与字号；组上设置时统一下发子项，子项显式 `size` 优先。

## 单选组（键盘可达）

<DemoBlock title="单选组（radio-group）">
  <oas-radio-group value="wechat">
    <span slot="label">选择支付方式</span>
    <oas-radio value="wechat">微信支付</oas-radio>
    <oas-radio value="alipay">支付宝</oas-radio>
    <oas-radio value="card">银行卡</oas-radio>
  </oas-radio-group>
</DemoBlock>

组通过 `value` 受控，子项 `value` 作为选项标识；组会统一管理单选互斥。

组遵循 WAI-ARIA radiogroup 键盘模式：**Tab 一次进入组（停在选中项，无选中时停首项）**，`↑` `↓` `←` `→` 移动即选中（循环回绕、跳过禁用项），`Home` / `End` 跳首末可用项。原生 input 各藏于 Shadow DOM，浏览器同名方向键分组跨 Shadow 失效，组件在 host 层补齐了 roving tabindex 与方向键处理。

## 单个禁用

<DemoBlock title="单个 disabled">
  <oas-radio name="radio-item-disabled" checked>可选</oas-radio>
  <oas-radio name="radio-item-disabled" disabled>已禁用</oas-radio>
  <oas-radio name="radio-item-disabled" disabled checked>禁用且选中</oas-radio>
</DemoBlock>

单项 `disabled` 只禁该项：不可点击、不可聚焦（原生 disabled 语义），组内其余项不受影响；整组禁用走 `oas-radio-group` 的 `disabled`（见下）。

## 禁用

<DemoBlock title="禁用">
  <oas-radio-group disabled value="a">
    <oas-radio value="a">已选且禁用</oas-radio>
    <oas-radio value="b">禁用</oas-radio>
    <oas-radio value="c">禁用</oas-radio>
  </oas-radio-group>
</DemoBlock>

## 只读

<DemoBlock title="只读（readonly）">
  <oas-radio-group value="a" readonly>
    <span slot="label">只读组（可聚焦、方向键不切换）</span>
    <oas-radio value="a">选项 A</oas-radio>
    <oas-radio value="b">选项 B</oas-radio>
    <oas-radio value="c">选项 C</oas-radio>
  </oas-radio-group>
</DemoBlock>

`readonly` 与 `disabled` 的表单语义分立：可聚焦、可进 Tab 序、值照常提交，但点击（含 Space）与方向键均不切换。单项也可单独设置。

## 校验态

<DemoBlock title="校验态（status，支持单项级）">
  <oas-space direction="column">
    <oas-radio-group value="a" status="error">
      <span slot="label">请选择配送方式（必填）</span>
      <oas-radio value="a">同城闪送</oas-radio>
      <oas-radio value="b">标准快递</oas-radio>
    </oas-radio-group>
    <oas-space>
      <oas-radio status="success" name="radio-status" checked>单项 success</oas-radio>
      <oas-radio status="warning" name="radio-status">单项 warning</oas-radio>
      <oas-radio status="error" name="radio-status">单项 error</oas-radio>
    </oas-space>
  </oas-space>
</DemoBlock>

组级 `status` 下发全部子项；单项显式 `status` 优先于组下发。`status="error"` 自动联动 `aria-invalid="true"`；卡片形态下校验色落在描边。

## 辅助文本与标签位置

<DemoBlock title="辅助文本（description）与标签位置（label-position）">
  <oas-space direction="column">
    <oas-radio-group value="stand">
      <oas-radio value="stand" description="预计 30 分钟内送达，按距离计费">同城闪送</oas-radio>
      <oas-radio value="expr" description="次日送达，全国可达">标准快递</oas-radio>
      <oas-radio value="pick" description="到门店自取，免运费">门店自取</oas-radio>
    </oas-radio-group>
    <oas-radio label-position="start" name="radio-lp" checked>标签在左侧（label-position="start"）</oas-radio>
  </oas-space>
</DemoBlock>

`description` 属性渲染为标签下方次要文本（选项级副文本）；也支持 `<span slot="description">` 分发富文本（优先于属性）。`label-position="start"` 把文本移到圆点的起始侧（RTL 下自动镜像）。

## 自定义指示器

<DemoBlock title="自定义指示器（checked-icon 插槽）">
  <oas-space>
    <oas-radio name="radio-icon" value="like" checked>
      点赞
      <template slot="checked-icon"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 7 L7 7 L7 2 L9 2 L9 7 L14 7 L14 9 L9 9 L9 14 L7 14 L7 9 L2 9 Z" fill="var(--oas-color-primary)"/></svg></template>
    </oas-radio>
    <oas-radio name="radio-icon" value="plain">未自定义（原生对照）</oas-radio>
  </oas-space>
</DemoBlock>

插槽内容接管选中态图标（`template[slot]` 或直接放元素皆可）；未选态显示默认空心圆轮廓，宿主可用 `::part(box)` 覆写。

## 组横排

<DemoBlock title="组横排（direction）">
  <oas-radio-group direction="horizontal" value="male">
    <span slot="label">性别</span>
    <oas-radio value="male">男</oas-radio>
    <oas-radio value="female">女</oas-radio>
    <oas-radio value="secret">保密</oas-radio>
  </oas-radio-group>
</DemoBlock>

默认 `direction="vertical"` 纵向堆叠；`horizontal` 横向排布并自动换行。

## 数据驱动

<DemoBlock title="options 数据通道">
  <oas-radio-group
    value="stand"
    options='[{"label":"同城闪送","value":"stand","description":"预计 30 分钟内送达"},{"label":"标准快递","value":"expr","description":"次日送达，全国可达"},{"label":"冷链专线","value":"cold","disabled":true,"description":"地区暂未开通"}]'
  >
    <span slot="label">配送方式</span>
  </oas-radio-group>
</DemoBlock>

`options` JSON 属性与子元素声明式双通道并存：`options` 显式时数据驱动优先（渲染进组件内部，声明式子项让位）。字段：`label` / `value` / `disabled` / `description`。数据驱动的子项同样参与键盘导航。

## 卡片形态

<DemoBlock title="卡片形态（variant=card）">
  <oas-radio-group value="card" direction="horizontal">
    <span slot="label">支付方式</span>
    <oas-radio variant="card" value="wallet" description="余额 ¥ 128.50">
      <strong>钱包支付</strong>
    </oas-radio>
    <oas-radio variant="card" value="card" description="支持各银行借记卡 / 信用卡">
      <strong>银行卡支付</strong>
    </oas-radio>
    <oas-radio variant="card" value="cod" description="部分商品不支持货到付款" disabled>
      <strong>货到付款</strong>
    </oas-radio>
  </oas-radio-group>
</DemoBlock>

`variant="card"` 切换为卡片皮肤：整块可点、选中描边着色、hover 反馈；默认插槽放标题等富内容，`description` 作副文本。卡片项可入组（组 value 照常驱动、键盘导航照常工作），也可单独使用。

## 事件

<DemoBlock title="事件（oas-change / oas-focus / oas-blur）">
  <oas-space>
    <oas-radio-group id="radio-event" value="a">
      <oas-radio value="a">选项 A</oas-radio>
      <oas-radio value="b">选项 B</oas-radio>
      <oas-radio value="c">选项 C</oas-radio>
    </oas-radio-group>
    <span id="radio-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
  </oas-space>
</DemoBlock>

单项派发 `oas-change`（`detail: { checked, value }`）、`oas-focus` / `oas-blur`；组派发 `oas-change`（`detail: { value }`，点击与方向键选中都会触发）与组级 `oas-focus` / `oas-blur`（子项间转移不误报）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const group = document.getElementById('radio-event')
  const out = document.getElementById('radio-output')
  group?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  group?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus（组获得焦点）'
  })
  group?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur（组失去焦点）'
  })
})
</script>

## API

### oas-radio

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `checked` | 是否选中 | `boolean` | — |
| `description` | 辅助文本：渲染为标签下方次要说明；`slot="description"` 分发富文本时优先 | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `label-position` | 标签位置：`end`（默认，框左文右）/ `start`（文左框右；RTL 下自动镜像） | — | — |
| `name` | 原生分组名（跨 Shadow DOM 同名互斥；组内自动分配唯一 name） | `string` | — |
| `readonly` | 只读：可聚焦可进 Tab 序、值照常提交，但点击（含 Space）与方向键均不切换 | `boolean` | — |
| `size` | 尺寸档：`small`（14px）/ `medium`（默认 16px）/ `large`（18px），圆点与字号联动；组级设置统向下发子项，单项显式优先 | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`（圆点着色；error 联动宿主 aria-invalid） | `string` | — |
| `value` | 选项标识 | `string` | — |
| `variant` | 形态：`default`（默认）/ `card`（卡片：整块可点、选中描边着色、hover 反馈） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 单选框失去焦点 |
| `oas-change` | 选中变化，`detail: { checked, value }` |
| `oas-focus` | 单选框获得焦点 |

| 名称 | 说明 |
| --- | --- |
| 默认 | 标签内容（可放富文本/链接） |
| `checked-icon` | 自定义选中指示器（template[slot] 或直接元素；未选态回落默认空心圆轮廓） |
| `description` | 辅助文本分发通道（优先于 description 属性） |

### oas-radio-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `direction` | 布局方向：`vertical`（默认纵向）/ `horizontal`（横向排布自动换行） | `string` | `vertical` |
| `disabled` | 禁用整组（下发子项，不覆盖子项自身显式 disabled） | `boolean` | — |
| `options` | 数据通道：JSON `[{ label, value, disabled?, description? }]`，显式设置时数据驱动优先于子元素声明式 | `RadioOption[] \| string` | — |
| `readonly` | 只读（下发子项）：可聚焦、方向键不切换 | `boolean` | — |
| `size` | 尺寸档（下发子项）：`small` / `medium`（默认）/ `large` | `string` | — |
| `status` | 校验态（下发子项）：`error` / `warning` / `success`；单项显式 status 优先 | `string` | — |
| `value` | 组值（选中项的 value） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 焦点离开组时派发 |
| `oas-change` | 组值变化，`detail: { value }`（点击与方向键选中都触发） |
| `oas-focus` | 组内任一子项获得焦点（子项间转移不误报） |

| 名称 | 说明 |
| --- | --- |
| 默认 | 声明式子项通道（`<oas-radio>` 子元素；options 显式时让位） |
| `label` | 组标题（渲染进 legend） |
