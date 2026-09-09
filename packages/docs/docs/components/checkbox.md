# Checkbox 复选框

原生 `<input type="checkbox">` 增强，支持半选、多选组、全选联动、数量限制与卡片形态。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space>
    <oas-checkbox checked>已勾选</oas-checkbox>
    <oas-checkbox>未勾选</oas-checkbox>
  </oas-space>
</DemoBlock>

## 尺寸

<DemoBlock title="三档尺寸（size）">
  <oas-space direction="column">
    <oas-checkbox size="small" checked>small（14px）</oas-checkbox>
    <oas-checkbox checked>medium（默认，16px）</oas-checkbox>
    <oas-checkbox size="large" checked>large（18px）</oas-checkbox>
  </oas-space>
</DemoBlock>

`size` 同时控制勾选框尺寸与字号；组上设置时统一下发子项，子项显式 `size` 优先。任意像素尺寸可覆写 CSS 变量 `--_box` 之外的宿主样式（或等待主题变量开口）。

## 半选状态

<DemoBlock title="半选（indeterminate）">
  <oas-checkbox indeterminate>半选状态</oas-checkbox>
</DemoBlock>

配合全选联动场景（见下方示例）使用，用于表达「部分选中」。半选仅是视觉状态，点击仍按两态切换（`aria-checked="mixed"` 同步）。

## 禁用

<DemoBlock title="禁用">
  <oas-space>
    <oas-checkbox disabled checked>已选且禁用</oas-checkbox>
    <oas-checkbox disabled>未选且禁用</oas-checkbox>
  </oas-space>
</DemoBlock>

## 只读

<DemoBlock title="只读（readonly）">
  <oas-space>
    <oas-checkbox readonly checked>只读且勾选</oas-checkbox>
    <oas-checkbox readonly>只读未勾选</oas-checkbox>
  </oas-space>
</DemoBlock>

`readonly` 与 `disabled` 的表单语义分立：可聚焦、可进 Tab 序、值照常提交，但点击（含 Space）不切换。

## 校验态

<DemoBlock title="校验态（status）">
  <oas-space direction="column">
    <oas-checkbox status="success" checked>校验通过</oas-checkbox>
    <oas-checkbox status="warning" checked>警告事项</oas-checkbox>
    <oas-checkbox status="error">必选项未勾选</oas-checkbox>
  </oas-space>
</DemoBlock>

`status="error"` 自动联动 `aria-invalid="true"`；卡片形态下校验色落在描边。

## 辅助文本与标签位置

<DemoBlock title="辅助文本（description）与标签位置（label-position）">
  <oas-space direction="column">
    <oas-checkbox checked description="我们将在结账前再次确认收货地址">保存收货地址</oas-checkbox>
    <oas-checkbox label-position="start" checked>标签在左侧（label-position="start"）</oas-checkbox>
  </oas-space>
</DemoBlock>

`description` 属性渲染为标签下方次要文本；也支持 `<span slot="description">` 分发富文本（优先于属性）。`label-position="start"` 把文本移到勾选框的起始侧（RTL 下自动镜像）。

## 自定义指示器

<DemoBlock title="自定义指示器（checked-icon / indeterminate-icon 插槽）">
  <oas-space>
    <oas-checkbox value="fav" checked>
      收藏
      <template slot="checked-icon"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14 C4 10.5 2 8.5 2 6 A3.2 3.2 0 0 1 8 4.4 A3.2 3.2 0 0 1 14 6 C14 8.5 12 10.5 8 14 Z" fill="var(--oas-color-danger)"/></svg></template>
    </oas-checkbox>
    <oas-checkbox>
      未自定义（原生对照）
    </oas-checkbox>
  </oas-space>
</DemoBlock>

插槽内容接管选中态图标（`template[slot]` 或直接放元素皆可）；未选态显示默认空心轮廓，宿主可用 `::part(box)` 覆写。`indeterminate-icon` 插槽自定义半选图标，与 `check-all` 联动搭配使用。

## 多选组

<DemoBlock title="多选组（checkbox-group）">
  <oas-checkbox-group value='["a"]'>
    <span slot="label">水果（可选多个）</span>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

组通过 `value`（JSON 数组）受控，子项 `value` 作为选项标识。组上可设置 `size` / `status` / `readonly` 统一下发子项。

## 按钮式多选（组合 oas-toggle-group）

checkbox 的「按钮形态」（如若干库的 `checkbox-button`）在本库由 **`oas-toggle-group` 多选模式**承载（按钮式多选组：`multiple` 每项独立切换、roving tabindex 键盘、满宽均分等），checkbox 本体保持标准框形态。二者分工同主流库：标准多选用 checkbox-group、按钮式多选用 toggle-group。

<DemoBlock title="按钮式多选（toggle-group 组合）">
  <oas-toggle-group multiple value='["a"]'>
    <oas-toggle-item value="a">苹果</oas-toggle-item>
    <oas-toggle-item value="b">香蕉</oas-toggle-item>
    <oas-toggle-item value="c">橙子</oas-toggle-item>
  </oas-toggle-group>
</DemoBlock>

## 组横排

<DemoBlock title="组横排（direction）">
  <oas-checkbox-group direction="horizontal" value='["a"]'>
    <span slot="label">横排多选</span>
    <oas-checkbox value="a">苹果</oas-checkbox>
    <oas-checkbox value="b">香蕉</oas-checkbox>
    <oas-checkbox value="c">橙子</oas-checkbox>
    <oas-checkbox value="d">葡萄</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

默认 `direction="vertical"` 纵向堆叠；`horizontal` 横向排布并自动换行。

## 数据驱动

<DemoBlock title="options 数据通道">
  <oas-checkbox-group
    value='["wechat"]'
    options='[{"label":"微信通知","value":"wechat","description":"即时推送消息"},{"label":"邮件通知","value":"email","description":"每日汇总一封"},{"label":"短信通知","value":"sms","disabled":true,"description":"运营商通道维护中"}]'
  >
    <span slot="label">通知方式</span>
  </oas-checkbox-group>
</DemoBlock>

`options` JSON 属性与子元素声明式双通道并存：`options` 显式时数据驱动优先（渲染进组件内部，声明式子项让位）。字段：`label` / `value` / `disabled` / `description` / `checkAll`。

## 数量限制

<DemoBlock title="数量限制（max / min）">
  <div>
    <oas-checkbox-group id="cbg-max" value='["a"]' max="2">
      <span slot="label">最多选 2 项（达上限后未选项置灰）</span>
      <oas-checkbox value="a">苹果</oas-checkbox>
      <oas-checkbox value="b">香蕉</oas-checkbox>
      <oas-checkbox value="c">橙子</oas-checkbox>
    </oas-checkbox-group>
    <oas-checkbox-group id="cbg-min" value='["a"]' min="1" style="margin-top: var(--oas-space-4)">
      <span slot="label">至少保留 1 项（已选项不可取消）</span>
      <oas-checkbox value="a">苹果</oas-checkbox>
      <oas-checkbox value="b">香蕉</oas-checkbox>
      <oas-checkbox value="c">橙子</oas-checkbox>
    </oas-checkbox-group>
    <div id="cbg-limit-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2); min-height: 20px"></div>
  </div>
</DemoBlock>

`max` 达上限时未选项拦截并派发 `oas-exceed-limit`（`detail: { value, max }`）；`min` 达下限时已选项拦截取消。已选项始终可取消（max）/未选项始终可选（min），限制是对称单向的。

## 全选 / 半选联动

<DemoBlock title="全选联动（check-all）">
  <oas-checkbox-group id="cbg-all" value='["a"]'>
    <span slot="label">权限勾选</span>
    <oas-checkbox check-all>全选</oas-checkbox>
    <oas-checkbox value="a">查看</oas-checkbox>
    <oas-checkbox value="b">编辑</oas-checkbox>
    <oas-checkbox value="c" disabled>删除（禁用项不参与联动）</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

子项标记 `check-all` 后组内自动联动：点击全选 ↔ 子项全勾/全不选，子项变化实时回写全选项的勾选/半选态。全选项不参与组 `value`，禁用子项跳过；与 `max` 组合时全选截断到上限并呈半选。无需宿主手写联动脚本。

## 卡片形态

<DemoBlock title="卡片形态（variant=card）">
  <oas-checkbox-group value='["pro"]' direction="horizontal">
    <span slot="label">选择套餐</span>
    <oas-checkbox variant="card" value="basic" description="适合个人与 3 人以下小团队">
      <strong>基础版</strong>
      <div style="font-size: var(--oas-font-size-lg); margin-top: 2px">¥ 29 <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">/月</span></div>
    </oas-checkbox>
    <oas-checkbox variant="card" value="pro" description="不限成员数与项目数">
      <strong>专业版</strong>
      <div style="font-size: var(--oas-font-size-lg); margin-top: 2px">¥ 99 <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">/月</span></div>
    </oas-checkbox>
    <oas-checkbox variant="card" value="ent" description="专属支持与定制集成" disabled>
      <strong>企业版</strong>
      <div style="font-size: var(--oas-font-size-lg); margin-top: 2px">联系销售</div>
    </oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

`variant="card"` 切换为卡片皮肤：整块可点、选中描边着色、hover 反馈；默认插槽放标题/价格等富内容，`description` 作副文本。卡片项可入组（组 value 照常驱动），也可单独使用。

## 事件

<DemoBlock title="事件（oas-change / oas-focus / oas-blur）">
  <oas-space>
    <oas-checkbox-group id="cbg-event" value='["a"]'>
      <oas-checkbox value="a">苹果</oas-checkbox>
      <oas-checkbox value="b">香蕉</oas-checkbox>
      <oas-checkbox value="c">橙子</oas-checkbox>
    </oas-checkbox-group>
    <span id="cbg-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
  </oas-space>
</DemoBlock>

单项派发 `oas-change`（`detail: { checked, value }`）、`oas-focus` / `oas-blur`；组派发 `oas-change`（`detail: { value: string[] }`）与组级 `oas-focus` / `oas-blur`（子项间转移不误报）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const group = document.getElementById('cbg-event')
  const out = document.getElementById('cbg-output')
  group?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })
  group?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus（组获得焦点）'
  })
  group?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur（组失去焦点）'
  })

  const maxGroup = document.getElementById('cbg-max')
  const minGroup = document.getElementById('cbg-min')
  const limitOut = document.getElementById('cbg-limit-out')
  maxGroup?.addEventListener('oas-exceed-limit', (e) => {
    limitOut.textContent = `oas-exceed-limit: 已达上限 ${e.detail.max}，"${e.detail.value}" 不可再选`
  })
  minGroup?.addEventListener('oas-change', () => {
    limitOut.textContent = ''
  })
  maxGroup?.addEventListener('oas-change', () => {
    limitOut.textContent = ''
  })
})
</script>

## API

### oas-checkbox

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `check-all` | 组内全选标记：勾选 ↔ 子项全选/清空联动，子项变化实时回写勾选/半选态；该项不参与组 value（跨组件属性，由 oas-checkbox-group 读取） | — | — |
| `checked` | 是否选中 | `boolean` | — |
| `description` | 辅助文本：渲染为标签下方次要说明；`slot="description"` 分发富文本时优先 | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `indeterminate` | 半选状态（仅视觉，点击仍按两态切换；aria-checked 同步 mixed） | `boolean` | — |
| `label-position` | 标签位置：`end`（默认，框左文右）/ `start`（文左框右；RTL 下自动镜像） | — | — |
| `readonly` | 只读：可聚焦可进 Tab 序、值照常提交，但点击（含 Space）不切换（与 disabled 表单语义分立） | `boolean` | — |
| `size` | 尺寸档：`small`（14px）/ `medium`（默认 16px）/ `large`（18px），勾选框与字号联动；组级设置统一下发子项，单项显式优先 | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`（勾选框着色；error 联动宿主 aria-invalid） | `string` | — |
| `value` | 选项标识 | `string` | — |
| `variant` | 形态：`default`（默认）/ `card`（卡片：整块可点、选中描边着色、hover 反馈） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 勾选框失去焦点 |
| `oas-change` | 勾选变化，`detail: { checked, value }` |
| `oas-focus` | 勾选框获得焦点 |
| `oas-limit-blocked` | 组数量限制拦截信号（组转发为 oas-exceed-limit；单项独立使用时无此拦截） |

| 名称 | 说明 |
| --- | --- |
| 默认 | 标签内容（可放富文本/链接） |
| `checked-icon` | 自定义选中指示器（template[slot] 或直接元素；未选态回落默认空心轮廓） |
| `description` | 辅助文本分发通道（优先于 description 属性） |
| `indeterminate-icon` | 自定义半选指示器（与 check-all 联动搭配） |

### oas-checkbox-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `direction` | 布局方向：`vertical`（默认纵向）/ `horizontal`（横向排布自动换行） | `string` | `vertical` |
| `disabled` | 禁用整组（下发子项，不覆盖子项自身显式 disabled） | `boolean` | — |
| `max` | 选中数量上限：达上限后未选项置灰拦截并派发 oas-exceed-limit，已选项仍可取消 | — | — |
| `min` | 选中数量下限：达下限后已选项拦截取消，未选项不受影响 | — | — |
| `options` | 数据通道：JSON `[{ label, value, disabled?, description?, checkAll? }]`，显式设置时数据驱动优先于子元素声明式 | `CheckboxOption[] \| string` | — |
| `readonly` | 只读（下发子项）：可聚焦不切换 | `boolean` | — |
| `size` | 尺寸档（下发子项）：`small` / `medium`（默认）/ `large` | `string` | — |
| `status` | 校验态（下发子项）：`error` / `warning` / `success` | `string` | — |
| `value` | 组值（JSON 字符串数组，选中项的 value 集合） | `string` | `[]` |

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 焦点离开组时派发 |
| `oas-change` | 组值变化，`detail: { value: string[] }`（含全选联动与数量限制内的变化） |
| `oas-exceed-limit` | 达 max 上限后的越界勾选尝试，`detail: { value, max }` |
| `oas-focus` | 组内任一子项获得焦点（子项间转移不误报） |

| 名称 | 说明 |
| --- | --- |
| 默认 | 声明式子项通道（`<oas-checkbox>` 子元素；options 显式时让位） |
| `label` | 组标题（渲染进 legend） |
