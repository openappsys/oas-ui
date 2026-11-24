# oas-schema-form（JSON 声明式表单）

一份 `schema`（JSON Schema 子集）+ 可选 `uiSchema`（UI 注解层）声明式描述表单：运行时编译为渲染计划，
挂载到 form 族控件树。值管理 / 字段校验状态走 `oas-form` 内核；错误注入 / 数组级校验 / 联动求值 /
编译由本组件承载。

> V1b 范围（本批）：受限表达式轨 `when`（parser + evaluator + 8 函数 + `registerExprFunction`）、
> `registerSchemaWidget` 自定义 widget、受控 `values` + `setValues` + `dirty`。V1a 已有：编译层 +
> 渲染层 + 内核接线 + 迷你校验器 + `whenSchema` 轨 + 对象/数组渲染与增删 + 数组级校验 + 非受控 + SSR 登记。
> **V2 显式不做**（命中即 devWarn / 文档标注，不静默）：array-table 行内编辑表格、对象数组复制/排序、
> `convertValue` / `transform` 值变换钩子、远程数据源注解、表达式函数库扩充。

## 用法

```html
<oas-schema-form id="form"></oas-schema-form>
<script>
  const form = document.getElementById('form')
  form.schema = {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', title: '姓名', minLength: 2 },
      mail: { type: 'string', title: '邮箱', format: 'email' },
      plan: { type: 'string', title: '套餐', enum: ['basic', 'pro'] },
      users: {
        type: 'array',
        title: '成员',
        minItems: 1,
        items: { type: 'object', properties: { nick: { type: 'string', title: '昵称' } } },
      },
    },
  }
  form.uiSchema = {
    name: { layout: { span: 12 } },
    plan: {
      reactions: [
        {
          whenSchema: { schema: { const: 'pro' } },
          target: 'users',
          fulfill: { required: true },
        },
      ],
    },
  }
  form.initialValues = { name: '张三', users: [{ nick: 'A' }] }
  form.addEventListener('oas-submit', (e) => console.log(e.detail.values))
</script>
```

## 值契约（重要）

- `getValues()` 与 `oas-submit.detail.values` 遵循 **form 内核字符串语义**：叶子恒为字符串
  （`number` 出 `"42"`、`boolean` 出 `"true"`、数组出 JSON 串）。
- **求值与校验前**按 schema `type` 做只读投影归一（`"42"` → 42 参与比较/校验），提交值不变。
  类型保真输出（coerce / convertValue / transform）是 V2 能力。
- 联动 `visible: false` = 卸载：非数组字段从 DOM 移除（值不提交）；**数组行内字段保留键位**
  （空串而非删键，保证行间键形状一致）。
- **题型控件（oas-matrix / oas-rank）已纳入内置控件表**：两组件走 form 值收集链（FORM_CONTROLS），
  uiSchema 的数据通道已开——`options.rows`（数组 → JSON）给 matrix 子问题、`options.columns`
  （数组或 JSON 串，仅 matrix / 自定义 widget 接受）给矩阵列、`options.options`（数组 → JSON）给
  rank 可排序项；其余 `rows` 标量仍按 textarea 行数语义透传。

## 数据 schema 支持的 V1 关键字

`type` / `format`（`email` / `uri` / `date` / `date-time` / `time`）/ `enum` / `const` / `default` /
`required` / `minLength` / `maxLength` / `pattern` / `items` / `minItems` / `maxItems` / `uniqueItems` /
`properties` / `if`-`then`-`else`；`$ref` 仅本地（`#/$defs/*` 与 `#/definitions/*` 均收，编译期急切展开，
循环 `$ref` 编译期报错）。`required: ['a']`（父级数组）编译期转换为子字段 `required: true`。

## UI 注解层（裸键）

- `widget`：覆盖默认映射（仅内置控件表内合法，未知 → devWarn 回落默认）。
- `layout`：`span`（1-24，`layout=grid` 时生效）/ `type: 'group' | 'tabs'` + `tabs: [{ key, title, fields }]`。
- `options`：`placeholder` / `disabled` / `readonly` / `clearable` / `rows` / `columns` / `step` / `min` / `max` /
  `precision` / `format` / `size` / `maxlength` / `direction` / `searchable` / `multiple`（其余键 devWarn 忽略）。
  数据通道：`rows` / `columns` / `options` 传数组时按 JSON 透传（matrix / rank 题型数据，详见「值契约」）。
- `reactions`：联动注解（见下）。
- `keepValueOnHidden`：`visible:false` 时保留值（默认卸载清值）。
- 编译期校验 uiSchema 每个路径必须存在于数据 schema（数组用 `users[].name` 通配）；错字 devWarn。

## 数组：两种容器与行操作（V2 批 1）

对象数组默认走 `oas-form-list`；`uiSchema.widget: 'array-table'` 换成 `oas-array-table`（行内编辑表格）。
两种容器的**行模板都由本组件渲染**（`form-item` + `data-schema-key` + 行内字段名 + 行容器
`[data-oas-form-list-item]`），所以数组的 12 处 DOM 契约（路径索引 / 规则键重挂 / 联动具体路径 /
数组错误条 / 空态）零成本共用。

- **列定义（array-table）**：`items.properties` 声明顺序 + 列级注解 `width`（数字 px / 字符串轨道）/
  `align` / `hidden`；`hidden` 列保留单元格与值，只隐藏视觉。`width` / `align` / `hidden` 用在非表格节点
  上会 devWarn 忽略。**单元格不渲染自身标签**（列头承载；必填 `*` 上移列头），控件宽 `max-width: 100%`
  约束在单元格内。
- **列宽拖拽 / 列序重排（展示态）**：列头右侧 `role="separator"` 手柄可指针拖拽或键盘调宽（`←` / `→` 8px、
  `Shift` 24px、`Home` 回 `width` 初始值）；列头可拖拽换序（目标列显示插入位）。两者都是**内存展示态**：
  不改 `columns` 属性、不写回 uiSchema，字段名 / 值 / 校验不受影响（单元格用显式 `grid-column` 落位）。
- **跨行粘贴 TSV**：表格区粘贴 `\t` / 换行分隔文本，从当前单元格向右下填充（行不足补行）；超过 `maxItems`
  截断 + `aria-live` + 每实例一次 devWarn；隐藏列不参与、单值粘贴不接管；值走内核写入通道（类型校验由
  schema-form 承接）。事件 `oas-paste`（`detail: { startRow, startColumn, rows, columns, truncated, addedRows }`，
  `addedRows` = 本次补出的行数）。
- **行操作**：容器内建 复制 / 上移 / 下移 / 删除（`array-table` 另有表下列头内的追加按钮）。契约与
  容器同源（`form/shared/list-row-ops`）：值读写走内核通道（`oas-upload` 跳过）、操作后焦点按行位回归、
  `aria-live` 播报；事件 `oas-add` / `oas-remove` `{ index }` + `oas-duplicate` / `oas-move` `{ from, to }`。
  **不引入 `oas-change` 的 `op` 字段**（已发布契约）。
- **值同步**：行操作不派发 `oas-values-change`；本组件在 `oas-add/remove/duplicate/move/paste` 监听里刷新
  索引 / 规则 / 错误视觉 / 脏态 / 联动效果，受控模式下并把内核当前值当作新的 `appliedValues` 基线。
- **错误清理**：重编号后旧 name 的错误会错位，因此行变更时清「数组级 + 该数组字段级」错误视觉
  （注入错误走内核 `clearErrors`，规则错误在下次校验重算）。**纯值粘贴例外**：`addedRows === 0`
  （只在现有单元格填值）不清错误——行号未变，按内核「该字段值再次变化才清」契约保持错误视觉；
  补行粘贴与行操作同口径清除。
- **`min` 一物二用拆分**：容器 `rows` = 初始行数（本组件按数组长度下发），`min` = 删行下界（本组件
  不再下发，默认 0）。`minItems` 违规由数组级校验报错，不再锁住唯一行。
- **结构重建行数快照**：`schema` / `uiSchema` 变化触发的重建按重建前 DOM 行数恢复（超出初始长度的
  行空值填充）；`initialValues` 改写与 `reset()` 忽略快照（行数回宿主初始值 / 初始长度）。
  **深度上限**：行数同步/收敛各固定迭代 4 轮——4 层嵌套数组（每层套一层）恰好覆盖；第 5 层及更深的
  容器会渲染但首帧行数不保证补齐（当前实测形态：前 4 层 1 行、第 5 层 0 行，已由测试固化）。
- **受控缩容**：受控 `values` 变短时按值长度收敛行数（旧行为只增不减、宿主删行会留空行）。

## 值变换双钩子（V2 批 2）

两道钩子（裸键、注册名由宿主注册，**独立注册表**，不与表达式函数库同表）：

- `convert`（入向）：只在 `initialValues` 回填、受控 `values`、`setValues()` 三条写入通道上换算；
  键入交互 / 快照回填 / schema `default` 都不经过，空串不调用。
  **可返回 Promise**（V2 批 4）：落地前字段保持宿主原值——这是**已知的异步陈旧窗口**（界面短暂显示
  宿主原始值，落地后替换为换算值）；晚到结果按路径序号丢弃，用户编辑优先于在途换算，结构重建整批作废，
  失败只 devWarn 并保留宿主值。
- `transform`（出向）：`getValues()` 与 `oas-submit` / `oas-validate-fail` / `oas-values-change` 的载荷
  就地改写；内部脏态 / 快照 / 受控写基线走内核原始值。**空串 / 缺省同样不调用**（两钩子共用同一调用口径）。
  **只支持同步**——返回 Promise 按恒等处理并 devWarn 一次。
- 签名 `(value, fieldPath, wholeValues) => value`；仅叶子字段（容器上声明会告警忽略）；数组行用通配路径。
  抛错 / 未注册 → devWarn + 恒等回落。
- 注册：`registerSchemaConverter` / `registerSchemaTransformer`。

## 异步选项窄面（V2 批 2）

- `options.source = '<name>'` + `options.sourceDeps = ['<path>']`；宿主用
  `registerSchemaOptionSource(name, (values, path) => Promise<Option[]>)` 注册。
- 三通道优先级 `enum/const` > `options.options` > `options.source`（并存 devWarn 一次，高优先级胜出）。
- 竞态口径：字段路径级 seq 守卫 + 重建期间同名/同路径/同依赖值去重 + 卸载/重连丢弃（代次 + isConnected）。
- loading：`oas-select` 沿用 `loading`（带 `loading-text`）；`oas-radio-group` / `oas-checkbox-group`
  新增 `loading` 布尔属性（选项区 spinner，向后兼容增量）。
- 失败 / 空态：控件所在 form-item 内渲染 `part="options-status"`（错误文案 + `part="options-retry"` 重试按钮 /
  空态文案）；同一字段的组内默认空态文案让位给该状态块（单份提示），组独立使用时空态照常显示。
  `reloadOptions(path?)` 手动刷新（强制发起新请求，不复用进行中的请求）。
- 依赖重载：`onValuesChange`（键入路径）与受控 `values` / `setValues()` 两条**静默写**通道都按本次
  变更路径重载命中 `sourceDeps` 的字段（批量路径按字段去重，一次写入只起一次请求）。
- 默认映射落到纯文本输入时，声明 source 的字段自动改用 `oas-select`。
- SSR 首帧无选项按空态渲染（无骨架），客户端挂载后异步补齐。

## 表达式函数库（20 个）

原有 10（`iif` / `empty` / `len` / `sum` / `min` / `max` / `lower` / `upper` / `concat` / `contains`）+
V2 新增 10：`join` / `split` / `substring` / `replace` / `trim` / `round` / `abs` / `floor` / `ceil` /
`formatDate` / `dateAdd`（`formatDate` 冻结 token `yyyy MM dd HH mm ss`、本地时区、未知 token 原样 + devWarn；
`dateAdd` 单位 `day / hour / minute / month`（月加减月末钳制：1-31 → 2-28/29）；**不做 `now()`**）。
宿主函数与内置同名时**宿主优先 + devWarn**。

## 联动注解（双轨：`whenSchema` / `when`）

```json
{
  "country": {
    "reactions": [
      {
        "whenSchema": { "scope": "country", "schema": { "enum": ["US"] } },
        "target": ["province", "city"],
        "fulfill": { "visible": false, "required": false },
        "otherwise": { "visible": true }
      }
    ]
  }
}
```

- `reactions` 挂在**源字段**的 uiSchema 节点；条件路径恒为根路径，本字段用 `$self`（`scope` 缺省 = `$self`）。
- `fulfill` 词表 = `visible` / `disabled` / `required` / `value`；`value` 为**值联动**（V2 批 4 转正）：
  字符串按表达式编译（与 `when` 同一编译器与依赖图），数字 / 布尔 / `null` 直接作字面量写入 `target`；
  `otherwise.value` 提供不成立时的回落值（缺省保持当前值）。写入值参与 8 轮定点迭代（不收敛保留最后一轮 +
  devWarn）并驱动下游联动；只写可见目标（`visible:false` 的隐藏 / 卸载语义优先）。
  **`required` 同时参与校验**（字段规则与数组级 `required` 判据都合并联动效果）：`fulfill: { required: true }`
  会真拦截提交，不只是加星号/`aria-required`。
- `otherwise` 缺省 = 回到静态注解值；跨 reactions 写同一目标同一属性后者胜 + devWarn。
- 数组通配：`users[].name`（依赖图按通配重绑，行重编号后仍命中）。
- 循环依赖守卫：定点迭代 ≤ 8 轮，不收敛 devWarn 保留最后一轮。

### `when` 受限表达式轨（V1b）

同一 `reactions` 条目可用 `when: string` 代替 `whenSchema`（二选一，同时提供即 devWarn 并忽略）：

```json
{
  "plan": {
    "reactions": [
      {
        "when": "$self != 'free' && {seats} >= 5",
        "target": "invoice",
        "fulfill": { "visible": true },
        "otherwise": { "visible": false }
      }
    ]
  }
}
```

- 值：`{path}` 占位（点号 + `[i]`，通配 `[]`）/ 字符串 / 数字 / `true/false/null` / `$self`。
  通配路径在表达式里读成匹配值数组（`sum({items[].price})`、`len({users[].name})`）。
- 比较 `== != > >= < <=`：两侧同为数字按数值，其余按字符串（写死，避开 `"9" > "100"`）。
- 逻辑 `&& || !` + 括号；算术 `+ - * / %` 仅数值（字符串不隐式转数，`'1' + 2` 得 `NaN`
  （运行时），`NaN` 参与比较恒为假）；成员 `in` / `contains(c, x)`。
- 函数库 9 个：`iif(c, a, b)`（**惰性**：未命中的分支不求值）/ `empty(x)` / `len(x)` / `sum(arr)` /
  `min(...nums)` / `max(...nums)` / `lower(s)` / `upper(s)` / `concat(...strings)`。
- `concat(...strings)` 是字符串拼接的唯一形态（`+` 只做数值加法）：参数 ≥ 1，非字符串参数按字符串
  宽容转换（数字 / 布尔转字面量，`null` / `undefined` 为空串），不报错。
- `sum(x)` 对非数组宽容处理：单值按一项累加，非数值项按 0 计（`sum('abc')` → 0），不抛错。
- 排除项一律**编译期报错**：赋值 / 语句 / 循环 / 箭头函数 / 模板串 / 正则字面量 / 属性访问链。
  语法错 / 未知字段 / 未知函数只让**该条** reaction 降级（devWarn），其余联动照常。
- 宿主函数：`registerExprFunction(name, fn)`（注册需在设置 schema 之前）。用到宿主函数的 reaction
  依赖面不可静态提取 → **全量重算**；其余表达式仍走依赖图定向刷新。
- 两轨表达力不同，**不宣传等价**：需要 JSON Schema 语义（enum/format/if-then-else）用 `whenSchema`。
- 体积：parser + evaluator 单文件按需链，实测 gzip 2.90 KB（独立预算档 3.4 KB；设计稿 2.5 KB 目标
  未达，见下「已知差距」）。

## 受控 `values` / `setValues` / `dirty`

- 非受控 = `initialValues` 一次性基线（schema `default` 兜底，宿主值优先）。
- 受控 = property `values`（对象 / attribute JSON 双通道）：挂载时作为基线，之后**按叶子路径 diff 写**
  （不重建 DOM、不打断焦点）；值树在**恰为已渲染字段名**的节点整值下发——数组值字段（`array of enum`
  → 单控件 `oas-checkbox-group`）宿主写 `{ tags: ['a', 'b'] }` 即整写，对象数组容器键照常下钻到行字段；
  宿主删除的键 → 对应字段清空；数组按长度补行（`min` 只增，删行仍走 form-list 交互）。
- 宿主写**不派发** `oas-values-change`（程序化写与 initial-values 同口径，防回环）；用户交互照常派发。
- `setValues(patch)` 是同一写通道的方法形态（走内核 `oas-form.setValues` → 控件 writer 注册表）。
- `dirty` = 当前扁平值与挂载基线比较（组件自持 `pristineSnapshot`，内核之外明确的一小块）。
- `values` 与 `initialValues` 同时提供时 `values` 优先。

## 自定义 widget（`registerSchemaWidget`）

```js
import { registerSchemaWidget } from '@oas-ui/ui/form/schema-form'
registerSchemaWidget('score', 'x-score-input', {
  reader: (el) => el.getAttribute('value') ?? '',
  writer: (el, value) => el.setAttribute('value', value),
})
```

- schema 里只写**注册名**（`uiSchema.widget: 'score'`）；注册需在设置 schema 之前。
- 内部无条件调 `registerFormControl`（form 内核值收集的唯一扩展口）——不调用则值永远收集不到，因此本
  实现不留给调用方自行注册。
- **硬约束：非自定义元素 widget（Vue / React 组件、原生标签）无法参与值收集**。tag 不含连字符时注册即
  devWarn 并拒绝（内核按元素 tag 匹配读值通道）。
- 注销函数会同时撤销内核登记，恢复该 tag 未注册状态。

## 方法 / 事件

方法：`submit()` / `validate()` / `getValues()` / `setValues(patch)` / `setErrors(list)` /
`clearErrors(paths?)` / `reset()`；只读 `dirty`。事件由内层 `oas-form` 派发并 composed 冒泡穿出：
`oas-submit` / `oas-validate-fail` / `oas-values-change`。与 `oas-questionnaire` 组合：本组件实现
duck-typed 契约（`getValues()` / `validate()` + 派发 `oas-values-change`），可直接作为步骤内容。

## 设计前必答 6 问（落地记录）

1. **每个操作的取消路径 / 孤儿产物**
   结构重建先快照值再回填；数组行增删由 form-list 自身处理；卸载字段用注释占位保留文档序，
   复显时插回原位。所有监听（值变化 / 数组增删）经 `onCleanup` 摘除，断开重连由基类
   `onReconnect()` 钩子调幂等 `bind()` 重挂（处理器是稳定引用，不叠双份）；`disconnectedCallback`
   清空编译缓存、效果表与节点索引；重连由基类 `update()` 重建。
2. **每个属性的默认值 / 空态**
   `schema` / `uiSchema` / `initialValues` 三通道默认空；空 schema、根非 object、零字段均渲染
   占位文案（非空白），编译错误额外把原因写入 `title`；空数组有「暂无条目」占位。
3. **多步交互的失败点 / 加载禁用态**
   提交 = 内核字段校验 → 数组级校验并注入 → 内核提交派发事件（PRD 冻结时序：先内核、后数组级；
   数组级错误在最终提交前注入，事件载荷仍是「字段错误 ∪ 数组级错误」）；任一步失败走
   `oas-validate-fail`（含数组路径错误）；数组级错误渲染在 form-list 下方 `part="array-error"`
   （role=alert）；`disabled` 级联：容器 → 子树控件 + form-list 增删按钮。
4. **破坏性选项默认非破坏**
   `visible:false` 默认清值（PRD 写死），数组行内保留键位；`uniqueItems` 等只校验不改值。
5. **键盘可达 / ARIA**
   标签页容器 `role=tablist/tab/tabpanel`，方向键 + Home/End 切页，`aria-selected` / `tabIndex` 同步；
   分组容器为语义化 div；字段标签来自 `title`（form-item label）、说明来自 `description`（help）；
   联动 `required` 同步到 form-item 与控件 `aria-required`；warning 走 form-item `role=status`。
6. **受控 / 非受控 + 宿主框架桥接**
   非受控 = `initialValues` 一次性基线（schema `default` 兜底合并，宿主优先）。受控 `values` 按叶子
   diff 写、宿主写不派发事件（防回环）、`dirty` 自持 pristine 快照（不宣称全走内核）。四属性（schema /
   uiSchema / initialValues / values）均为 property + JSON attribute 双通道：attribute 在 property
   之后变化即失效（防 attr/prop 漂移，同 form 内核口径），对象直接赋值不写 attribute（防止 Vue 下把
   对象序列化进 DOM）。

## 决策记录（设计稿未覆盖 / 与实现冲突处）

- **嵌套数组 list 名用裸相对名，而非设计稿示例的 `matrix.{index}`**：form-list 的索引化规则是
  「模板名含 `{index}` → 只替换不前缀；否则加 `本 list 名.{index}.` 前缀」。若嵌套 list 自身写成
  `matrix.{index}`，外层替换后得到 `matrix.0`，会丢掉父级前缀（实测字段名变 `matrix.0.0.label`，
  缺少 `users.0.`）。取裸名 `matrix` 后外层前缀得到 `users.0.matrix`，内层行再拼 `users.0.matrix.0.label`，
  逐层成立且仍满足「内层模板字段裸名、禁止写 `{index}`」。
- **form-list 新增可选 `add-text` / `remove-text`**：PRD 要求增删钮可访问名走 `schemaForm.addItem` /
  `schemaForm.removeItem`，而 form-list 原文案固定为 `dynamicInput.add/remove`。以可选属性注入文案
  （缺省行为不变，向后兼容），不改既有 i18n key。
- **数组级错误条**：每个数组容器一个 `part="array-error"`；嵌套数组的错误按外层行号定位到具体行的
  错误条（非全局单条）。
- **schema `default` 作为 initialValues 兜底**：宿主值优先；未声明的数组不出默认值（行数仍由宿主
  initialValues 驱动）。
- **`uniqueItems` 比较**走深比较（投影值递归比，键序无关）；`maxItems` 等只校验不阻断行添加
  （form-list 的 `max` 仅在 schema `maxItems` 存在时同步？V1a 未同步，添加后再报错，避免吞掉用户操作）。
- **不支持根级 uiSchema 注解**（决策）：uiSchema 的书写面是「点号 + 方括号」路径，根路径 `''` 经
  `parseDslPath` 判为非法（保留键段/空路径一律拒绝），没有合法写法可以命中根节点；因此编译层不读
  根注解（原 `uiAt(ctx, '')` 收集是死代码，已删除）。用户写 `''` 会在 uiSchema 编译告警里得到
  「路径非法」，reactions 必须挂在具名字段上——避免造第二套根路径语法（与 PRD「唯一用户可见语法」冲突）。
- **tabs 的未列出字段**并入首个标签页 + devWarn（不静默丢字段）；`tabs` 为空则退化为分组容器。
- **根节点必须是 object**（表单根即字段集合），否则编译错误空态。
- **结构重建的「初始值 vs 快照」优先级**：仅当 `initialValues` 通道本次发生变化（attribute 原文或
  property 写入次数变了）时，初始值才覆盖快照里的用户编辑；schema / uiSchema 变化触发的重建一律
  「快照胜过初始值」——否则加一个无关字段就把用户已改的带初值字段回压成初始值（回归实测）。
- **`$ref` 深度上限只计引用链**：`MAX_DEPTH` 只累加 `$ref` 展开层数，普通 `properties` / `items`
  嵌套不计数（旧实现每次递归 +1，深层普通嵌套会被误判成「疑似循环引用」）。
- **`keepValueOnHidden`** 支持（注解键）：保留值仅隐藏，适合需要回显的历史数据。
- **编译告警统一出口**：`compileSchema` 内的告警先入数组、返回前一次性投递 `onWarn`（去重保序）。
  此前部分告警（未知 widget / options 未知键等）只入数组不投递，devWarn 看不到——V1b 自定义 widget
  与表达式轨的诊断依赖该出口，顺手修正。
- **表达式模块单文件入口**：实现与公开子路径入口同文件（`expr/index.ts`），组件经
  `compiler/expr.ts` 转发。这样 L3 独立预算链只有一个文件（不因 re-export 折叠丢链），也让
  宿主按需 import 拿到与组件完全相同的实现。
- **表达式路径校验本地化**：为守住体积预算，`expr` 不引 `path.js`，本地实现与 `parseDslPath`
  同判据的占位校验（含 `{index}`/`[]` 归一与保留键段拒绝）。**`expr.test.ts` 用 15 条语料对照
  `parseDslPath` 守住口径**，防两处分叉。
- **受控 `values` 的数组边界**：只按长度补行（`min` 增量），不删行；宿主缩短数组时多余行的值保留到
  form-list 交互删除为止（文档明示，不静默）。
- **已知差距（显式）**：表达式 parser + evaluator 实测 gzip 2.90 KB，未达设计稿 2.5 KB 目标
  （按实测上浮定档 3.4 KB）。剩余差距主要来自完整中文诊断文案与仓库「逐文件 gzip 上界 + 未压缩
  dist」口径；进一步压缩需把诊断降级为 ASCII 错误码（在调用层拼装）或收窄通配读值，等定夺。
- **未实现（显式）**：array-table 行内编辑表格、对象数组复制/排序、`convertValue` / `transform`
  值变换、远程数据源注解、表达式函数库扩充（V2）。

## 定版前评审记档（不修项）

- **C 域评审 minor 2 / 3 / 5 / 6 本批不修**：定版前修复批只消化必修项（子路径入口漏注册 / 联动清值
  二次传播 / 快照回填走 writer 通道），四项 minor 按用户决策留档待后续批次处理（编号沿用全域 review
  报告，其余 minor 已在本批顺手修掉：`collectDefaults` 保留键过滤、快照回填选择器转义）。
