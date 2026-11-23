# oas-schema-form（JSON 声明式表单）

一份 `schema`（JSON Schema 子集）+ 可选 `uiSchema`（UI 注解层）声明式描述表单：运行时编译为渲染计划，
挂载到 form 族控件树。值管理 / 字段校验状态走 `oas-form` 内核；错误注入 / 数组级校验 / 联动求值 /
编译由本组件承载。

> V1a 范围（可独立交付）：编译层 + 渲染层 + 内核接线 + 迷你校验器 + `whenSchema` 单轨联动 +
> 对象/数组渲染与增删 + 数组级校验 + 非受控 + SSR 登记。
> **V1b / V2 显式不做**（命中即 devWarn / 文档标注，不静默）：`when` 表达式轨、受控 `values` +
> `setValues`、`registerSchemaWidget` 自定义组件、array-table、值变换钩子。

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

## 数据 schema 支持的 V1 关键字

`type` / `format`（`email` / `uri` / `date` / `date-time` / `time`）/ `enum` / `const` / `default` /
`required` / `minLength` / `maxLength` / `pattern` / `items` / `minItems` / `maxItems` / `uniqueItems` /
`properties` / `if`-`then`-`else`；`$ref` 仅本地（`#/$defs/*` 与 `#/definitions/*` 均收，编译期急切展开，
循环 `$ref` 编译期报错）。`required: ['a']`（父级数组）编译期转换为子字段 `required: true`。

## UI 注解层（裸键）

- `widget`：覆盖默认映射（仅内置控件表内合法，未知 → devWarn 回落默认）。
- `layout`：`span`（1-24，`layout=grid` 时生效）/ `type: 'group' | 'tabs'` + `tabs: [{ key, title, fields }]`。
- `options`：`placeholder` / `disabled` / `readonly` / `clearable` / `rows` / `step` / `min` / `max` /
  `precision` / `format` / `size` / `maxlength` / `direction` / `searchable` / `multiple`（其余键 devWarn 忽略）。
- `reactions`：联动注解（见下）。
- `keepValueOnHidden`：`visible:false` 时保留值（默认卸载清值）。
- 编译期校验 uiSchema 每个路径必须存在于数据 schema（数组用 `users[].name` 通配）；错字 devWarn。

## 联动注解（V1a 单轨）

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
- `fulfill` 词表 V1 = `visible` / `disabled` / `required`；`value` 保留键（V1 未实现，编译期 devWarn）。
  **`required` 同时参与校验**（字段规则与数组级 `required` 判据都合并联动效果）：`fulfill: { required: true }`
  会真拦截提交，不只是加星号/`aria-required`。
- `otherwise` 缺省 = 回到静态注解值；跨 reactions 写同一目标同一属性后者胜 + devWarn。
- 数组通配：`users[].name`（依赖图按通配重绑，行重编号后仍命中）。
- 循环依赖守卫：定点迭代 ≤ 8 轮，不收敛 devWarn 保留最后一轮。

## 方法 / 事件

方法：`submit()` / `validate()` / `getValues()` / `reset()` / `setErrors(list)` / `clearErrors(paths?)`
（`setValues` 为 V1b，V1a 调即 devWarn）。事件由内层 `oas-form` 派发并 composed 冒泡穿出：
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
   非受控 = `initialValues` 一次性基线（schema `default` 兜底合并，宿主优先）。受控 `values` /
   `setValues` 为 V1b（显式 devWarn）。三属性均为 property + JSON attribute 双通道：attribute 在
   property 之后变化即失效（防 attr/prop 漂移，同 form 内核口径），对象直接赋值不写 attribute（防止
   Vue 下把对象序列化进 DOM）。

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
- **未实现（显式）**：`when` 表达式轨、`setValues`、`registerSchemaWidget`、array-table、远程 `$ref`、
  值变换钩子、`visible` 的「卸载期间保留键」以外的可配置策略（当前只有 keepValueOnHidden）。
