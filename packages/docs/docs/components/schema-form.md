---
description: 一份 JSON schema + uiSchema 声明式描述表单：运行时编译为渲染计划并挂载到 form 族控件树，值管理/字段校验收编到 form 内核，错误注入、数组级校验、联动求值由组件承载。
---

# SchemaForm 声明式表单

一份 `schema`（JSON Schema 子集）+ 可选 `uiSchema`（UI 注解层）声明式描述表单：运行时编译为渲染计划，
挂载到 form 族控件树。值管理 / 字段校验状态走 `oas-form` 内核，**错误注入 / 数组级校验 / 联动求值 / 编译**
由本组件承载。

> **值契约（先读）**：`getValues()` 与 `oas-submit.detail.values` 遵循 form 内核字符串语义——叶子恒为
> 字符串（`number` 出 `"42"`、`boolean` 出 `"true"`、数组出 JSON 串）。求值与校验前组件按 schema `type`
> 做只读投影归一（`"42"` → 42 参与比较/校验），**提交值不变**；类型保真输出为后续版本能力。

> 边界：V1 只做「JSON 声明式编译 + 渲染 + 校验 + 联动（`whenSchema` 单轨）+ 数组增删」；表达式轨、
> 受控 `values` / `setValues`、自定义 widget 注册、array-table 行内编辑表格在后续版本（命中即开发期告警，
> 不静默失效）。分步 / 问卷编排请用 `oas-questionnaire` 组合。

## 基础用法

`schema` / `uiSchema` / `initialValues` 三个对象均支持 **property + JSON attribute 双通道**
（host 框架里直接赋对象即可；静态页可用 `schema='{...}'`）。字段标签取 `title`、说明取 `description`；
`required`（父级数组）编译期转成子字段必填。

<DemoBlock title="基础表单：输入 / 数字 / 开关 / 枚举 / 邮箱">
  <oas-schema-form id="sf-basic" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-basic-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-basic-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-basic-validate">validate()</oas-button>
    <oas-button id="sf-basic-values">getValues()</oas-button>
    <oas-button id="sf-basic-reset">reset()</oas-button>
  </oas-space>
</DemoBlock>

## 联动（whenSchema）

`reactions` 挂在**源字段**的 uiSchema 节点上；`whenSchema` 的条件即一段 JSON Schema 校验，`scope` 缺省 = 本字段（`$self`）。
`fulfill` 封闭词表：`visible` / `disabled` / `required`；`otherwise` 缺省回到静态注解值。
`visible: false` 是**卸载**（值不提交、不参与校验）；数组行内字段卸载保留键位（空串）。依赖图定向刷新——
只有条件依赖的字段变化才会重算视觉。

<DemoBlock title="按国家隐藏/必填字段，按套餐锁定输入">
  <oas-schema-form id="sf-react" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-react-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 数组与嵌套

对象数组走 `oas-form-list`：初始数组长度驱动建行（`initialValues.users` 有 1 行就渲染 1 行）、
增删走既有行交互、行内字段按行号重绑。数组级校验（`minItems` / `maxItems` / `uniqueItems` / 必填）
由本组件自跑，错误经 `setErrors` 注入数组路径，渲染在列表下方 `part="array-error"`（`role="alert"`）。

<DemoBlock title="对象数组：初始行 / 增删 / minItems 错误条">
  <oas-schema-form id="sf-array" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-array-reset">reset()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="嵌套数组：外层 users，内层 matrix（逐层命名 users.N.matrix.M.label）">
  <oas-schema-form id="sf-nested" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-nested-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-nested-values">getValues()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="空数组 + minItems：提交即触发数组级错误条（part=array-error）">
  <oas-schema-form id="sf-array-required" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-required-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-required-submit" type="primary">submit()</oas-button>
  </oas-space>
</DemoBlock>

## 布局：栅格 / 分组 / 标签页

`layout.span`（1-24）在 `layout="grid"` 下占列；`layout.type="group"` 把对象节点渲染为分组容器；
`layout.type="tabs"` + `tabs: [{ key, title, fields }]` 渲染标签页（`role=tablist`，方向键 / Home / End 切页）。
未列入任何标签页的字段并入首个标签页并开发期告警（不静默丢字段）。

<DemoBlock title="分组 + 标签页 + 栅格占列">
  <oas-schema-form id="sf-layout" layout="grid" style="width: 100%; max-width: 760px"></oas-schema-form>
</DemoBlock>

## 错误注入（服务端校验）

`setErrors([{ path, message, severity? }])` 注入服务端错误：路径经 `parseNamePath` 归一
（`users[0].name` 与 `users.0.name` 等价），**注入错误优先于规则错误，直到该字段值再次变化**。
`severity: 'warning'` 只提示不阻断（`role="status"`，不置 `aria-invalid`）；同路径 error 在场时 error 独占显示。

<DemoBlock title="setErrors / clearErrors / warning 双态">
  <oas-schema-form id="sf-errors" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-errors-server">注入服务端错误</oas-button>
    <oas-button id="sf-errors-warning">注入 warning</oas-button>
    <oas-button id="sf-errors-clear">clearErrors()</oas-button>
    <oas-button id="sf-errors-validate">validate()</oas-button>
  </oas-space>
  <span id="sf-errors-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 与 Questionnaire 组合

本组件实现 duck-typed 契约（`getValues()` / `validate()` + 派发 `oas-values-change`），可直接作为
`oas-questionnaire` 的步骤内容——整份问卷纯 JSON 驱动，问卷只管步骤导航与跨步汇总。

<DemoBlock title="问卷每步内嵌 schema-form">
  <oas-questionnaire id="sf-questionnaire" style="width: 100%; max-width: 560px" steps='[{"key":"base","title":"基本信息"},{"key":"extra","title":"补充信息"},{"key":"done","title":"完成"}]'>
    <oas-schema-form slot="step-base" style="width: 100%"></oas-schema-form>
    <oas-schema-form slot="step-extra" style="width: 100%"></oas-schema-form>
    <div slot="step-done" style="color: var(--oas-color-text-secondary)">确认无误后点击「完成」提交整份问卷。</div>
  </oas-questionnaire>
  <span id="sf-questionnaire-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 空态与容错

`schema` 缺失/非法、根节点不是 object、零字段都会给出占位文案（非空白渲染），编译错误原因写在占位元素
`title` 上便于排查；空数组有「暂无条目」占位。`uiSchema` 路径必须存在于数据 schema（数组用
`users[].name` 通配），错字开发期告警。

<DemoBlock title="空态（无 schema / schema 非法 / 零字段）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-schema-form id="sf-empty-none" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
    <oas-schema-form id="sf-empty-bad" schema='{bad json' style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
    <oas-schema-form id="sf-empty-fields" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../.vitepress/theme/when-defined'

onMounted(() => {
  // ---- 基础表单 ----
  onUpgraded(document.getElementById('sf-basic'), () => {
    const basic = document.getElementById('sf-basic')
    basic.schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', title: '姓名', minLength: 2 },
        age: { type: 'integer', title: '年龄' },
        vip: { type: 'boolean', title: '会员' },
        plan: { type: 'string', title: '套餐', enum: ['basic', 'pro', 'team'] },
        mail: { type: 'string', title: '邮箱', format: 'email' },
      },
    }
    basic.initialValues = { vip: true, plan: 'basic' }
    const out = document.getElementById('sf-basic-output')
    basic.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit：${JSON.stringify(e.detail.values)}`
    })
    basic.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail：${Object.values(e.detail.errors).join('；')}`
    })
    document.getElementById('sf-basic-submit')?.addEventListener('click', () => basic.submit())
    document.getElementById('sf-basic-validate')?.addEventListener('click', async () => {
      out.textContent = `validate() → ${(await basic.validate()) ? '通过' : '未通过'}`
    })
    document.getElementById('sf-basic-values')?.addEventListener('click', () => {
      out.textContent = `getValues()：${JSON.stringify(basic.getValues())}`
    })
    document.getElementById('sf-basic-reset')?.addEventListener('click', () => {
      basic.reset()
      out.textContent = 'reset()：已回初始值'
    })
  })

  // ---- 联动 ----
  onUpgraded(document.getElementById('sf-react'), () => {
    const react = document.getElementById('sf-react')
    react.schema = {
      type: 'object',
      required: ['plan'],
      properties: {
        plan: { type: 'string', title: '套餐', enum: ['free', 'pro'] },
        country: { type: 'string', title: '国家', enum: ['CN', 'US'] },
        province: { type: 'string', title: '省份（CN 必填）' },
        state: { type: 'string', title: '州（US 可见）' },
        note: { type: 'string', title: '备注（Pro 解锁）' },
      },
    }
    react.initialValues = { plan: 'free', country: 'CN' }
    react.uiSchema = {
      country: {
        reactions: [
          { whenSchema: { schema: { const: 'CN' } }, target: 'province', fulfill: { required: true } },
          { whenSchema: { schema: { const: 'CN' } }, target: 'state', fulfill: { visible: false } },
          { whenSchema: { schema: { const: 'US' } }, target: 'state', fulfill: { required: true } },
          { whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: false } },
        ],
      },
      plan: {
        reactions: [
          { whenSchema: { schema: { const: 'free' } }, target: 'note', fulfill: { disabled: true } },
        ],
      },
    }
    const out = document.getElementById('sf-react-output')
    react.addEventListener('oas-values-change', (e) => {
      out.textContent = `当前值：${JSON.stringify(e.detail.values)}`
    })
  })

  // ---- 数组 ----
  onUpgraded(document.getElementById('sf-array'), () => {
    const array = document.getElementById('sf-array')
    array.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: '成员',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['nick'],
            properties: {
              nick: { type: 'string', title: '昵称' },
              mail: { type: 'string', title: '邮箱', format: 'email' },
            },
          },
        },
      },
    }
    array.initialValues = { users: [{ nick: '张三' }] }
    const out = document.getElementById('sf-array-output')
    array.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit：${JSON.stringify(e.detail.values)}`
    })
    array.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail：${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('；')}`
    })
    document.getElementById('sf-array-submit')?.addEventListener('click', () => array.submit())
    document.getElementById('sf-array-reset')?.addEventListener('click', () => {
      array.reset()
      out.textContent = 'reset()：已回初始行'
    })
  })

  // ---- 嵌套数组 ----
  onUpgraded(document.getElementById('sf-nested'), () => {
    const nested = document.getElementById('sf-nested')
    nested.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: '成员',
          items: {
            type: 'object',
            properties: {
              nick: { type: 'string', title: '昵称' },
              matrix: {
                type: 'array',
                title: '标签组',
                items: { type: 'object', properties: { label: { type: 'string', title: '标签' } } },
              },
            },
          },
        },
      },
    }
    nested.initialValues = { users: [{ nick: '张三', matrix: [{ label: 'A' }, { label: 'B' }] }] }
    const out = document.getElementById('sf-nested-output')
    document.getElementById('sf-nested-values')?.addEventListener('click', () => {
      out.textContent = `getValues()：${JSON.stringify(nested.getValues())}`
    })
  })

  // ---- 空数组 + minItems ----
  onUpgraded(document.getElementById('sf-array-required'), () => {
    const arrayRequired = document.getElementById('sf-array-required')
    arrayRequired.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: '成员（至少 1 位）',
          minItems: 1,
          items: {
            type: 'object',
            required: ['nick'],
            properties: { nick: { type: 'string', title: '昵称' } },
          },
        },
      },
    }
    const out = document.getElementById('sf-array-required-output')
    arrayRequired.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail：${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('；')}`
    })
    arrayRequired.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit：${JSON.stringify(e.detail.values)}`
    })
    document.getElementById('sf-array-required-submit')?.addEventListener('click', () => arrayRequired.submit())
  })

  // ---- 布局 ----
  onUpgraded(document.getElementById('sf-layout'), () => {
    const layout = document.getElementById('sf-layout')
    layout.schema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          title: '账号资料',
          properties: {
            nickname: { type: 'string', title: '昵称' },
            mail: { type: 'string', title: '邮箱', format: 'email' },
            phone: { type: 'string', title: '电话' },
          },
        },
        advanced: {
          type: 'object',
          title: '高级设置',
          properties: {
            region: { type: 'string', title: '区域', enum: ['cn', 'us', 'eu'] },
            quota: { type: 'integer', title: '配额' },
            remark: { type: 'string', title: '备注' },
          },
        },
      },
    }
    layout.uiSchema = {
      profile: { layout: { span: 12, type: 'group', title: '账号资料' } },
      advanced: {
        layout: {
          span: 12,
          type: 'tabs',
          title: '高级设置',
          tabs: [
            { key: 'region', title: '区域', fields: ['region'] },
            { key: 'quota', title: '配额', fields: ['quota', 'remark'] },
          ],
        },
      },
      'profile.nickname': { layout: { span: 12 } },
      'profile.phone': { layout: { span: 12 } },
    }
  })

  // ---- 错误注入 ----
  onUpgraded(document.getElementById('sf-errors'), () => {
    const errors = document.getElementById('sf-errors')
    errors.schema = {
      type: 'object',
      properties: {
        account: { type: 'string', title: '账号' },
        mail: { type: 'string', title: '邮箱', format: 'email' },
      },
    }
    errors.initialValues = { account: 'alice', mail: 'alice@example.com' }
    const out = document.getElementById('sf-errors-output')
    document.getElementById('sf-errors-server')?.addEventListener('click', () => {
      errors.setErrors([
        { path: 'account', message: '服务端：该账号已被占用' },
        { path: 'mail', message: '服务端：该邮箱已注册' },
      ])
      out.textContent = '已注入 2 条服务端错误（改值后自动回落到规则错误）'
    })
    document.getElementById('sf-errors-warning')?.addEventListener('click', () => {
      errors.setErrors([{ path: 'mail', message: '建议使用企业邮箱', severity: 'warning' }])
      out.textContent = '已注入 warning：仅提示、不阻断 validate()'
    })
    document.getElementById('sf-errors-clear')?.addEventListener('click', () => {
      errors.clearErrors()
      out.textContent = 'clearErrors()：注入错误已清除'
    })
    document.getElementById('sf-errors-validate')?.addEventListener('click', async () => {
      out.textContent = `validate() → ${(await errors.validate()) ? '通过' : '未通过（看红字）'}`
    })
  })

  // ---- questionnaire 组合 ----
  onUpgraded(document.getElementById('sf-questionnaire'), () => {
    const q = document.getElementById('sf-questionnaire')
    const [base, extra] = q.querySelectorAll('oas-schema-form')
    base.schema = {
      type: 'object',
      required: ['nickname'],
      properties: {
        nickname: { type: 'string', title: '昵称', minLength: 2 },
        mail: { type: 'string', title: '邮箱', format: 'email' },
      },
    }
    extra.schema = {
      type: 'object',
      properties: {
        role: { type: 'string', title: '角色', enum: ['dev', 'ops', 'pm'] },
        tags: { type: 'array', title: '技能标签', items: { enum: ['css', 'js', 'docs'] } },
      },
    }
    const out = document.getElementById('sf-questionnaire-output')
    q.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit：${JSON.stringify(e.detail.values)}`
    })
  })

  // ---- 空态 ----
  onUpgraded(document.getElementById('sf-empty-fields'), () => {
    const emptyFields = document.getElementById('sf-empty-fields')
    emptyFields.schema = { type: 'object', properties: {} }
  })
})
</script>

## API

### oas-schema-form

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 整表禁用（经内核表单链路下发到字段与数组增删按钮）。 | — | — |
| `initial-values` | 非受控一次性基线（嵌套对象）。与 schema `default` 深合并，宿主值优先；初始数组长度驱动建行。 | `Record<string, unknown> \| string` | — |
| `label-align` | 透传给内层 oas-form 的标签对齐（top / left / right）。 | — | — |
| `label-width` | 透传给内层 oas-form 的标签宽度。 | — | — |
| `layout` | 透传给内层 oas-form 的布局（`grid` 时字段按 `layout.span` 占列）。 | — | — |
| `schema` | 数据 schema（JSON Schema 子集）。property（对象，推荐）与 attribute（JSON 字符串）双通道；attribute 在 property 之后变化即失效（防 attr/prop 漂移）。 | `unknown` | — |
| `size` | 透传给内层 oas-form 的尺寸档位。 | — | — |
| `ui-schema` | UI 注解层（裸键：`widget` / `layout` / `options` / `reactions` / `keepValueOnHidden`）。属性双通道；编译期校验每个路径必须存在于数据 schema。 | `unknown` | — |
| `validate-trigger` | 透传给内层 oas-form 的字段校验触发时机（input / change / blur）。 | — | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `submit` | `submit(): void` | 提交：先联动求值、再数组级校验并注入错误，最后委托内核提交（oas-submit / oas-validate-fail 由内核派发并穿出）。 |
| `validate` | `validate(): Promise<boolean>` | 校验：联动求值 → 数组级校验 → 内核字段校验（错误并集），返回是否全部通过。 |
| `getValues` | `getValues(): Record<string, unknown>` | 全表当前值（form 内核字符串语义：叶子恒为字符串，数组出 JSON 串）。 |
| `setValues` | `setValues(patch: Record<string, unknown>): void` | 受控写通道为 V1b 能力；V1a 调即 devWarn，不静默失效。 |
| `setErrors` | `setErrors(list: FormError[]): void` | 注入错误（服务端校验结果）；路径归一与优先级语义由 form 内核承载。 |
| `clearErrors` | `clearErrors(paths?: string[]): void` | 清除注入错误（省略 paths = 清全部）；受影响字段回落规则错误。 |
| `reset` | `reset(): void` | 重置：回初始值、清错误、数组行数回初始长度（不派发事件）。 |
