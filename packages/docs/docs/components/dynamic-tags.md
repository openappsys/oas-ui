# DynamicTags 动态标签

常驻输入框 + 标签流形态：输入回车/分隔符提交生成标签，支持去重、校验、上限、失焦保存、排序、超量折叠与原位编辑。

## 基础用法

<DemoBlock title="默认去重">
  <oas-dynamic-tags model-value='["vue","react"]'></oas-dynamic-tags>
</DemoBlock>

`model-value` 为 JSON 数组属性；默认不允许重复标签。键盘：`Enter` / 分隔符提交；输入框为空时 `Backspace` 删除最后一个标签。

## 允许重复

<DemoBlock title="allow-duplicate">
  <oas-dynamic-tags allow-duplicate model-value='["a"]'></oas-dynamic-tags>
</DemoBlock>

## 分隔符与粘贴批量

<DemoBlock title="separator=;（分号提交）">
  <oas-dynamic-tags separator=";" placeholder="输入后按分号添加"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="粘贴逗号分隔文本批量建标签（默认开启）">
  <oas-dynamic-tags add-on-paste maxlength="10" placeholder="粘贴：a,b,c 试试"></oas-dynamic-tags>
</DemoBlock>

- `separator` 自定义提交分隔符（单字符，默认 `,`；空串 = 仅 Enter；`separator=" "` 即空格触发）
- `add-on-paste`（默认 `true`）：粘贴含分隔符的文本时按分隔符拆分批量建标签，逐项走查重/上限/格式校验；不含分隔符的粘贴保持原生插入
- `maxlength` 限制输入框长度

## 失焦保存（行为变更）

<DemoBlock title="save-on-blur 默认 true：失焦即保存">
  <oas-dynamic-tags placeholder="输入后直接点击页面空白处"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="save-on-blur=false：失焦丢弃（旧行为）">
  <oas-dynamic-tags save-on-blur="false" placeholder="失焦后残留文本被丢弃"></oas-dynamic-tags>
</DemoBlock>

> **行为变更（v2.5.0 起）**：`save-on-blur` 默认 `true`——输入框失焦时把残留文本提交为标签（对齐主流表单库的默认行为）。此前行为是失焦静默丢弃；需要旧行为显式设置 `save-on-blur="false"`。

## 排序

<DemoBlock title="sortable 拖拽 + 键盘重排">
  <oas-dynamic-tags sortable model-value='["标签一","标签二","标签三"]'></oas-dynamic-tags>
</DemoBlock>

`sortable` 开启双通道重排，重排派发 `oas-change`（`detail.trigger = "sort"`）：

- 拖拽：按住标签拖到目标位置
- 键盘：输入框为空时 `←` 聚焦末尾标签 / `→` 聚焦首个标签；标签上 `←` / `→` 遍历（两端回到输入框）；`Alt + ←` / `Alt + →` 与相邻标签交换

## 超量折叠

<DemoBlock title="max-tag-count=2 折叠为 +N">
  <oas-dynamic-tags max-tag-count="2" model-value='["苹果","香蕉","橙子","葡萄","西瓜"]'></oas-dynamic-tags>
</DemoBlock>

超出 `max-tag-count` 的标签折叠为 `+N` 计数标签，悬浮 `title` 展示隐藏标签列表；需要更强展示可组合 `oas-tooltip`（监听渲染后对 `.tag-overflow` 挂浮层）。

## 校验

<DemoBlock title="pattern 正则（仅数字）">
  <oas-dynamic-tags pattern="^\d+$" placeholder="仅允许纯数字标签"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="oas-before-add 可取消事件（禁词拦截）">
  <oas-dynamic-tags id="tags-veto" placeholder="试着添加 admin 或 root"></oas-dynamic-tags>
</DemoBlock>

- `pattern`：正则字符串，不匹配则拒绝添加并提示（复用查重提示通道：`aria-invalid` + 2s 提示文案）
- `oas-before-add`：可取消事件（`detail: { value }`），宿主 `preventDefault()` 拦截添加（同步校验；异步校验不支持）
- 校验顺序：上限 > 格式 > 重复 > `oas-before-add` 否决

## 编辑现有标签

<DemoBlock title="双击标签原位编辑">
  <oas-dynamic-tags id="tags-edit" model-value='["helo","world"]'></oas-dynamic-tags>
</DemoBlock>

双击标签（或 `sortable` 下标签聚焦后按 `Enter`）进入原位编辑：`Enter` 提交、`Esc` 取消、失焦按 `save-on-blur` 处理。提交走查重/格式校验，成功派发 `oas-edit`（`detail: { index, value, oldValue }`）与 `oas-change`（`trigger = "edit"`）；编辑为空值还原旧值。

## 自定义标签

<DemoBlock title="template[slot=tag] 自定义标签内容">
  <oas-dynamic-tags model-value='["前端","后端","测试"]'>
    <template slot="tag">
      <span>🔹 <span data-tag-label></span></span>
    </template>
  </oas-dynamic-tags>
</DemoBlock>

`template[slot="tag"]` 克隆到每个标签（`[data-tag-label]` 自动绑定标签文本，删除按钮保留组件侧）。`template[slot="prefix"]` / `template[slot="suffix"]` 克隆到标签容器首尾。

## 尺寸 / 校验态 / 只读 / 清空

<DemoBlock title="size 三档">
  <oas-dynamic-tags size="small" model-value='["small"]'></oas-dynamic-tags>
  <oas-dynamic-tags model-value='["medium（默认）"]'></oas-dynamic-tags>
  <oas-dynamic-tags size="large" model-value='["large"]'></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="status=error 校验红边">
  <oas-dynamic-tags status="error" model-value='["必填标签组"]'></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="readonly / clearable">
  <oas-dynamic-tags readonly model-value='["只读标签"]'></oas-dynamic-tags>
  <oas-dynamic-tags clearable model-value='["可一键清空"]'></oas-dynamic-tags>
</DemoBlock>

- `readonly`：标签保留、输入框与移除按钮隐藏（与 disabled 的表单语义分立）
- `clearable`：有值且可交互时显示清空按钮，点击派发 `oas-clear` 与 `oas-change`（`trigger = "clear"`）

## 输入法（IME）防护

输入法组合态（`isComposing`）下按 `Enter` / 分隔符（选词确认）不会误建标签；组合结束后再按 `Enter` 正常提交。中文输入法可放心使用。

## 何时改用 Select 多选

需要「从建议列表选择 + 自由输入」时，用 `oas-select` 的 `multiple + searchable + allow-create` 组合（内建建议下拉、高亮、多选 chips），不要在 DynamicTags 上自造下拉：

<DemoBlock title="Select multiple + searchable + allow-create（对照）">
  <oas-select multiple searchable allow-create placeholder="输入或选择，回车创建" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

取舍：纯自由输入的短 token 集合（收件人、关键词）用 DynamicTags；有候选集合并允许补充新值用 Select 多选。

## max 上限

<DemoBlock title="max=3">
  <oas-dynamic-tags max="3" model-value='["a","b"]'></oas-dynamic-tags>
</DemoBlock>

达到 `max` 后输入框自动禁用，删除标签后恢复可输入。

## 占位符与禁用

<DemoBlock title="placeholder">
  <oas-dynamic-tags placeholder="输入后按回车添加"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="disabled">
  <oas-dynamic-tags disabled model-value='["vue"]'></oas-dynamic-tags>
</DemoBlock>

## 事件

<DemoBlock title="添加/删除/编辑/清空/排序事件">
  <oas-dynamic-tags id="tags-event" model-value='["a"]'></oas-dynamic-tags>
  <span id="tags-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

`oas-change` 的 `detail: { value, trigger }`，`trigger ∈ add | remove | clear | sort | edit`（向后兼容：`value` 字段不变）；另有 `oas-add` / `oas-remove`（`detail: { value }`）、`oas-edit`（`detail: { index, value, oldValue }`）、`oas-clear`、`oas-before-add`（可取消）、`oas-focus` / `oas-blur`：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const veto = document.getElementById('tags-veto')
  veto?.addEventListener('oas-before-add', (e) => {
    if (['admin', 'root'].includes(e.detail.value)) e.preventDefault()
  })
  const el = document.getElementById('tags-event')
  const out = document.getElementById('tags-output')
  el?.addEventListener('oas-add', (e) => { out.textContent = `oas-add: ${e.detail.value}` })
  el?.addEventListener('oas-remove', (e) => { out.textContent = `oas-remove: ${e.detail.value}` })
  el?.addEventListener('oas-edit', (e) => { out.textContent = `oas-edit: ${e.detail.oldValue} → ${e.detail.value}` })
  el?.addEventListener('oas-clear', () => { out.textContent = 'oas-clear' })
  el?.addEventListener('oas-change', (e) => { out.textContent = `oas-change(${e.detail.trigger}): ${JSON.stringify(e.detail.value)}` })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `add-on-paste` | 粘贴时按分隔符拆分批量建标签（默认 true） | `string` | `true` |
| `allow-duplicate` | 允许重复标签 | `boolean` | — |
| `clearable` | 清空按钮（一键清全部标签） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `max` | 标签数量上限 | `string` | — |
| `max-tag-count` | 超量折叠：超出收进 `+N`（title 悬浮列隐藏标签） | `string` | — |
| `maxlength` | 单标签最大长度 | `string` | — |
| `model-value` | 标签数组（property 或 JSON） | `string[]` | `[]` |
| `pattern` | 新标签格式正则（不匹配提示并拒建） | `string` | — |
| `placeholder` | 输入框占位符 | `string` | — |
| `readonly` | 只读（输入框/移除按钮隐藏，标签仅展示） | `boolean` | — |
| `save-on-blur` | 失焦保存残留文本为标签（**默认 true，行为变更**：旧版失焦静默丢弃；要旧行为显式 `"false"`） | `string` | `true` |
| `separator` | 分隔符（输入即建标签；默认 `,`；空串=仅 Enter 建） | `string` | `,` |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `sortable` | 标签排序：拖拽 + 键盘 Alt+←/→ 相邻交换 | `boolean` | — |
| `status` | 校验态：`error` / `warning` / `success` | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-add` | 新增标签，`detail: { value }` |
| `oas-before-add` | 建标签前派发（可取消，preventDefault 拦截；上限/格式/重复校验先于它），`detail: { value }` |
| `oas-blur` | 输入框失焦时派发 |
| `oas-change` | 增删后派发，`detail: { value }` |
| `oas-clear` | 清空时派发，`detail: {}` |
| `oas-edit` | 编辑标签提交，`detail: { index, value, oldValue }`（双击或聚焦 Enter 进编辑） |
| `oas-focus` | 输入框聚焦时派发 |
| `oas-remove` | 删除标签，`detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="prefix"]` | 前缀内容插槽 |
| `template[slot="suffix"]` | 后缀内容插槽 |
| `template[slot="tag"]` | 自定义标签（`[data-tag-label]` 绑定；删除按钮组件侧） |

键盘：`Enter` / `,` 提交；输入框为空时 `Backspace` 删除最后一个标签。

ARIA：容器 `role="list"`、标签 `role="listitem"`，删除按钮可聚焦并带 `aria-label`；重复提交时输入框标记 `aria-invalid` 并给出提示。
