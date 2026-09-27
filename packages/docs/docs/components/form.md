# Form 表单

原生 `<form>` 增强，支持按 `rules` 规则对内部字段做校验与提交。

> **跨 shadow 提交入口**：`oas-form` 在 shadow 内包原生 `<form>`，因此 light DOM 的按钮（含 `oas-button`）不具备原生 submit 语义。请在按钮点击等时机调用组件公开的 `submit()` 方法（如 `this.closest('oas-form').submit()`），它会委托内部 form 的 `requestSubmit()`，保留 submit 事件语义并触发相同的校验与 `oas-submit` / `oas-validate-fail` 派发——**不要**再穿透 `shadowRoot.querySelector('form')` 去调内部 form。

> 数据源是各字段的 `value` 属性（受控模式）。表单校验的字段范围为带 `name` 的 `oas-input` / `oas-textarea` / `oas-select` / `oas-auto-complete` / `oas-cascader` / `oas-tree-select` / `oas-input-number` / `oas-checkbox` / `oas-radio`（组容器不参与）。`oas-input` / `oas-textarea` / `oas-input-number` 输入时**不会自动写回 `value` 属性**，需在脚本中监听 `oas-input` / `oas-change` 事件同步；`oas-select` / `oas-cascader` / `oas-tree-select` 选中时自带回写。

## 功能展示

功能展示区只演示表单的字段收集与提交，不配置校验规则。

### 基础用法

<DemoBlock title="收集与提交">
  <oas-form id="form-basic" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-basic-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

不配置 `rules` 时提交不做任何校验，直接派发 `oas-submit`，`detail.values` 携带所有带 `name` 字段的收集结果。

### 多种控件组合

<DemoBlock title="多种控件组合">
  <oas-form id="form-full" style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名"></oas-input>
      <oas-select name="role" placeholder="选择角色" options='[{"label":"管理员","value":"admin"},{"label":"编辑","value":"editor"},{"label":"访客","value":"guest"}]'></oas-select>
      <oas-input-number name="age"></oas-input-number>
      <oas-textarea name="bio" rows="3" placeholder="个人简介（选填）"></oas-textarea>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 嵌套 name 路径：嵌套 values

> 字段 `name` 支持点路径语法：数字段是数组下标，其余段是对象键——`profile.city` 组装进 `{ profile: { city } }`，`users.0.name` 与 `users[0].name` 两种写法等价，组装进 `{ users: [{ name }] }`。提交时 `oas-submit` 的 `detail.values` 为嵌套结构；`rules` 的键用完整路径字符串（如 `"users.0.name"`）匹配；`initial-values` 按同样路径嵌套写入，`reset()` 回嵌套初始值。不含路径语法的普通名组装结果与既有行为完全一致。

<DemoBlock title="嵌套 name 路径提交">
  <oas-form id="form-nested" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名（扁平字段）"></oas-input>
      <oas-input name="profile.city" placeholder="城市（name 写作 profile.city）"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-nested-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

提交后 `values` 形如 `{"name":"张三","profile":{"city":"杭州"}}`——路径段即结构。

### 动态字段组 form-list

> `oas-form-list` 在表单内维护一组可增删的字段行：在组件内放一个 `<template>` 作为行模板，克隆出的行内字段 `name` 自动索引化，两种写法——模板里用 `{index}` 占位（`name="users.{index}.name"`），或给组件设 `name="users"` 并在模板里写裸 `name`（自动前缀为 `users.N.字段名`）。`min` / `max` 约束行数（不足 `min` 自动补行；调小 `min` 不会删已有行，非法 `max` 按无上限处理），每行带删除按钮，删除后剩余行自动重新编号、已填值随行保留。字段留在 light DOM，校验 / 提交 / `oas-values-change` 全部随主表；组件派发 `oas-add` / `oas-remove`（`detail: { index }`）。

<DemoBlock title="动态字段组 form-list">
  <oas-form id="form-list-demo" style="width: 420px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="家庭成员" help="添加几行成员，提交后组装进 values.members 数组">
        <oas-form-list id="form-list-demo-list" name="members" min="1" max="4"></oas-form-list>
      </oas-form-item>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-list-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

提交后 `values` 形如 `{"members":[{"name":"张三","role":"本人"},{"name":"李四","role":"家属"}]}`；行模板在原生 HTML 里直接写 `<template>` 即可，md/Vue 编译场景建议用 JS 构造 `HTMLTemplateElement` 注入（模板内容传透在模板编译下不稳）。

## 原生表单集成（form-associated）

全部表单类组件均为 **form-associated** 自定义元素（`formAssociated: true`）：可直接放进原生 `<form>`——`<label for>` 关联生效（点击 label 聚焦/激活控件、读屏朗读 label 文本），值经标准 `FormData` 收集（有 `name` 才提交），`form.reset()` 回初始值，`fieldset[disabled]` 联动禁用，`required` 接入原生校验链（`checkValidity()` / `:invalid` 伪类）。

<DemoBlock title="原生 form + label for + FormData + reset">
  <form id="form-native" style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3); align-items: flex-start">
    <label for="fn-name" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">姓名（点击本行 → 聚焦输入框）</label>
    <oas-input id="fn-name" name="username" value="初始值" style="width: 240px"></oas-input>
    <label for="fn-role" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">角色（点击本行 → 聚焦下拉）</label>
    <oas-select id="fn-role" name="role" options='[{"label":"管理员","value":"admin"},{"label":"访客","value":"guest"}]' style="width: 240px"></oas-select>
    <label for="fn-date" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">入职日期</label>
    <oas-date-picker id="fn-date" name="joined"></oas-date-picker>
    <span style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      <oas-checkbox id="fn-agree" name="agree" value="yes"></oas-checkbox>
      <label for="fn-agree" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">接受协议（点击本行 → 勾选）</label>
    </span>
    <span style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      <oas-switch id="fn-notify" name="notify"></oas-switch>
      <label for="fn-notify" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">邮件通知（点击本行 → 切换）</label>
    </span>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="fn-read" size="small" type="button">读取 FormData</oas-button>
      <oas-button id="fn-reset" size="small" type="button">form.reset()</oas-button>
    </div>
    <span id="fn-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </form>
</DemoBlock>

**支持清单（15 组件）**：input / textarea / input-number / checkbox / radio / switch / select / combobox / auto-complete / tree-select / mentions / date-picker / time-picker / upload。值语义按原生对齐：多选（select / tree-select / date-picker multiple）提交**同名多条**；date / time 范围模式提交 **`name-start` / `name-end`** 两条；upload 提交 File；勾选族未勾不提交。与 `oas-form` 的 `collectFields` 机制并行可用。

## 表单校验

校验区演示 `rules` 声明的校验规则与失败反馈。

> 校验规则：`{ required, message, minLength, maxLength, pattern, validator, validateTrigger }`（`validator` 为自定义校验函数，函数不可 JSON 序列化，走 `rules` property 通道；`validateTrigger` 字段级覆盖表级触发时机）。校验失败时字段被标记 `aria-invalid`（输入框红边），字段下方显示红字错误提示，并派发 `oas-validate-fail`。

### 必填与格式校验

<DemoBlock title="必填与格式校验">
  <oas-form id="form-validate" rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 长度校验

<DemoBlock title="minLength 校验">
  <oas-form id="form-length" rules='{"username":[{"required":true,"message":"请输入用户名"},{"minLength":3,"message":"至少 3 个字符"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名（至少 3 个字符）"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 禁用字段跳过校验

<DemoBlock title="禁用字段不参与校验">
  <oas-form id="form-skip" rules='{"title":[{"required":true,"message":"请输入标题"}],"locked":[{"required":true,"message":"该字段被禁用，应跳过"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="title" placeholder="标题"></oas-input>
      <oas-input name="locked" disabled value="禁止修改"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 提交与校验失败事件

<DemoBlock title="submit / validate-fail">
  <oas-form id="form-event" rules='{"nick":[{"required":true,"message":"请输入昵称"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="nick" placeholder="昵称"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

## 栅格表单布局

> `layout="grid"` 时 form 元素变为 24 列栅格，`oas-form-item` 按 `span` 占列（默认 24 即整行）；`gap` 控制栅格间距，`label-align` 控制标签位置（`left` / `right` / `top`，默认 `top`），`label-width` 设置 left/right 时标签列宽。校验失败的错误提示会收编进 `oas-form-item` 的错误位（`role="alert"`）。

### 两列栅格 + 校验

<DemoBlock title="两列栅格布局">
  <oas-form id="form-grid" layout="grid" gap="var(--oas-space-4)" style="width: 100%; max-width: 720px" rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}'>
    <oas-form-item label="姓名" span="12" required>
      <oas-input name="name" placeholder="请输入姓名"></oas-input>
    </oas-form-item>
    <oas-form-item label="邮箱" span="12" required>
      <oas-input name="email" placeholder="请输入邮箱"></oas-input>
    </oas-form-item>
    <oas-form-item label="个人简介" span="24">
      <oas-textarea name="bio" rows="3" placeholder="个人简介（选填）"></oas-textarea>
    </oas-form-item>
    <oas-form-item span="24">
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
      <span id="form-grid-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

### label-align 与 label-width

<DemoBlock title="label-align 切换">
  <oas-form id="form-align" layout="grid" label-align="left" label-width="96px" gap="var(--oas-space-4)" style="width: 100%; max-width: 720px" rules='{"username":[{"required":true,"message":"请输入用户名"}],"phone":[{"required":true,"message":"请输入手机号"},{"pattern":"^1\\d{10}$","message":"手机号格式不正确"}]}'>
    <oas-form-item label="用户名" span="12" required>
      <oas-input name="username" placeholder="请输入用户名"></oas-input>
    </oas-form-item>
    <oas-form-item label="手机号" span="12" required>
      <oas-input name="phone" placeholder="请输入手机号"></oas-input>
    </oas-form-item>
  </oas-form>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-4)">
    <oas-segmented id="form-align-switch" value="left" options='[{"label":"左对齐","value":"left"},{"label":"顶部","value":"top"},{"label":"右对齐","value":"right"}]'></oas-segmented>
    <span id="form-align-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

## 行内表单

> `inline` 时表单项水平排列：label 在控件左侧（宽度自适应）、控件自动宽度、项之间按 `gap` 留间距（默认 `var(--oas-space-4)`），容器放不下时自动换行。与 `layout` 并存且优先于 `layout`；此时 `label-align` 强制 `left`、`label-width` 自动。适合登录、搜索等紧凑工具栏场景。

### 行内登录表单

<DemoBlock title="行内登录表单">
  <oas-form id="form-inline-login" inline rules='{"username":[{"required":true,"message":"请输入用户名"}],"password":[{"required":true,"message":"请输入密码"}]}' style="width: 100%; max-width: 640px">
    <oas-form-item label="用户名" required>
      <oas-input name="username" placeholder="用户名" style="width: 180px"></oas-input>
    </oas-form-item>
    <oas-form-item label="密码" required>
      <oas-input name="password" type="password" placeholder="密码" style="width: 180px"></oas-input>
    </oas-form-item>
    <oas-form-item>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">登录</oas-button>
      <span id="form-inline-login-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

### 行内搜索表单

<DemoBlock title="行内搜索表单">
  <oas-form id="form-inline-search" inline rules='{"keyword":[{"required":true,"message":"请输入搜索关键词"}]}' style="width: 100%; max-width: 720px">
    <oas-form-item label="关键词" required>
      <oas-input name="keyword" placeholder="搜索关键词" style="width: 200px"></oas-input>
    </oas-form-item>
    <oas-form-item label="分类">
      <oas-select name="category" placeholder="全部分类" options='[{"label":"全部","value":"all"},{"label":"文档","value":"doc"},{"label":"组件","value":"component"}]' style="width: 140px"></oas-select>
    </oas-form-item>
    <oas-form-item>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">搜索</oas-button>
      <span id="form-inline-search-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

受控同步与事件监听（一个 `<script>` 块统一挂接）：

## 表单级能力

### 整表禁用

> `disabled` 属性对齐 config-provider 全局禁用语义：所有字段经字段自身的 form-associated 禁用通道并入生效（内层控件禁用、交互拦截），**不回写字段的 `disabled` 属性**（解除后字段完整恢复）；整表禁用时提交跳过全部校验。

<DemoBlock title="整表禁用">
  <oas-form id="form-disabled-all" rules='{"name":[{"required":true,"message":"请输入姓名"}]}' disabled style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" value="张三" placeholder="姓名"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交（禁用时跳过校验）</oas-button>
    </oas-space>
  </oas-form>
  <div style="display: inline-flex; align-items: center; gap: var(--oas-space-2); margin-left: var(--oas-space-4)">
    <oas-switch id="form-disabled-all-switch" checked></oas-switch>
    <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">禁用整表</span>
  </div>
  <span id="form-disabled-all-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

### 初始值与重置

> `initial-values` 挂载后写入对应字段（input 走 `value`、switch 走 `checked`、transfer/dynamic-input 走 `model-value`）；`reset()` 回到初始值并清除校验错误态，全程不派发事件（与原生表单 reset 基线语义一致）。也支持 `initialValues` property 通道（property 优先于 attribute）。

<DemoBlock title="initial-values 与 reset">
  <oas-form id="form-initial" initial-values='{"name":"张三","notify":true}' rules='{"name":[{"required":true,"message":"请输入姓名"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-switch name="notify"></oas-switch>
      <div style="display: flex; gap: var(--oas-space-2)">
        <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
        <oas-button onclick="this.closest('oas-form').reset()">重置</oas-button>
      </div>
    </oas-space>
  </oas-form>
  <span id="form-initial-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

### 自定义校验函数（validator）

> `validator` 在每条规则的既有校验之后执行，返回 `true` 通过、返回字符串为错误消息、返回 Promise 走异步校验。函数不可 JSON 序列化，通过 `rules` **property** 通道设置（脚本赋值 `form.rules = {...}`）。

<DemoBlock title="自定义校验函数">
  <oas-form id="form-validator" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名（试试 admin 或少于 6 个字符）"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-validator-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

### 校验触发时机（validate-trigger）

> `validate-trigger` 控制字段级即时校验时机：`change`（默认）/ `blur` / `input`；字段规则里的 `validateTrigger` 可覆盖表级。提交时始终全量校验。下方示例改为 `blur`：输入非法手机号后点击别处（失焦）即出现红字，改正后再失焦红字消失。

<DemoBlock title="失焦触发校验">
  <oas-form id="form-trigger" validate-trigger="blur" rules='{"phone":[{"pattern":"^1\\d{10}$","message":"手机号格式不正确"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="phone" placeholder="手机号（失焦时校验）"></oas-input>
    </oas-space>
  </oas-form>
  <span id="form-trigger-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

### 滚动定位到首个错误（scroll-to-first-error）

> 设置 `scroll-to-first-error` 后，提交校验失败时自动聚焦首个错误字段并平滑滚动进视口（系统开启「减少动态效果」时降级为瞬跳）。下方长表单可滚动，备注字段在最底部——点击提交观察容器自动滚下去。

<DemoBlock title="滚动定位到首个错误">
  <div style="max-height: 220px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3); width: 360px">
    <oas-form id="form-scroll" scroll-to-first-error rules='{"remark":[{"required":true,"message":"请填写备注（表单最底部）"}]}'>
      <oas-space direction="vertical" style="width: 100%">
        <oas-input name="f1" placeholder="字段 1"></oas-input>
        <oas-input name="f2" placeholder="字段 2"></oas-input>
        <oas-input name="f3" placeholder="字段 3"></oas-input>
        <oas-input name="f4" placeholder="字段 4"></oas-input>
        <oas-input name="f5" placeholder="字段 5"></oas-input>
        <oas-input name="f6" placeholder="字段 6"></oas-input>
        <oas-input name="remark" placeholder="备注（必填，在最底部）"></oas-input>
      </oas-space>
    </oas-form>
  </div>
  <div style="margin-top: var(--oas-space-3)">
    <oas-button type="primary" onclick="document.getElementById('form-scroll').submit()">提交（滚动到首个错误）</oas-button>
  </div>
</DemoBlock>

### 值变化事件（oas-values-change）

> 任一字段值变化时派发 `oas-values-change`，`detail: { name, value, values }`（`values` 为全表当前值快照）。初始值写入与 `reset()` 属静默通道，不派发。

<DemoBlock title="oas-values-change">
  <oas-form id="form-values" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="a" placeholder="字段 A（输入试试）"></oas-input>
      <oas-input name="b" placeholder="字段 B（输入试试）"></oas-input>
    </oas-space>
  </oas-form>
  <span id="form-values-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

脚本接线（受控同步 + 各 demo 事件反馈）：

### 表级尺寸与标签冒号（size / colon）

> `size` 把表级尺寸档（`small` / `medium` / `large`）下发给表内字段控件，优先级：字段自身显式 `size` > 表级 `size` > config-provider 全局注入 > 默认档（表级与全局注入同存时表级生效）；`colon` 为表内所有 `oas-form-item` 的标签渲染冒号。点击下方按钮观察字段尺寸与冒号即时变化。

<DemoBlock title="表级 size + colon">
  <oas-form id="form-size-colon" size="large" colon style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="简介">
        <oas-textarea name="sc-bio" rows="2" placeholder="textarea 跟随表级尺寸"></oas-textarea>
      </oas-form-item>
      <oas-form-item label="选项">
        <oas-space direction="vertical" size="small">
          <oas-checkbox name="sc-a">勾选框跟随表级尺寸</oas-checkbox>
          <oas-checkbox name="sc-b" size="medium">自身 size=medium 优先（不随表级）</oas-checkbox>
        </oas-space>
      </oas-form-item>
    </oas-space>
  </oas-form>
  <span style="display: inline-flex; gap: var(--oas-space-2); margin-top: var(--oas-space-3)">
    <oas-button onclick="document.getElementById('form-size-colon').setAttribute('size','small')">切到 small</oas-button>
    <oas-button onclick="document.getElementById('form-size-colon').setAttribute('size','large')">切到 large</oas-button>
    <oas-button onclick="document.getElementById('form-size-colon').toggleAttribute('colon')">冒号开/关</oas-button>
  </span>
</DemoBlock>

### 帮助文案与状态图标（help / status-icon）

> `help` 在控件下方渲染常驻帮助文案，与校验错误独立并存；form-item 开启 `status-icon` 后，校验失败时在错误文本前显示 danger 状态图标（错误清除即隐藏）。

<DemoBlock title="help + status-icon">
  <oas-form id="form-help-icon" rules='{"mail":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}' style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="邮箱" help="用于接收登录验证码" status-icon>
        <oas-input name="mail" placeholder="留空或乱填后提交"></oas-input>
      </oas-form-item>
      <oas-button type="primary" onclick="document.getElementById('form-help-icon').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 自定义校验文案（validate-messages）

> `validateMessages`（property 通道，推荐）或 `validate-messages`（JSON 属性）按规则类型覆盖 locale 默认文案，模板支持 `${min}` / `${max}` / `${value}` 占位；`rule.message` 显式消息优先级最高。

<DemoBlock title="validate-messages">
  <oas-form id="form-vmessages" rules='{"user":[{"required":true},{"minLength":6}]}' validate-messages='{"required":"用户名不能为空","minLength":"至少 ${min} 字符"}' style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="用户名" status-icon>
        <oas-input name="user" placeholder="留空或少于 6 字提交"></oas-input>
      </oas-form-item>
      <oas-button type="primary" onclick="document.getElementById('form-vmessages').submit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 受控同步：把文本类字段的输入写回 value 属性
  for (const id of ['form-basic', 'form-full', 'form-validate', 'form-length', 'form-skip', 'form-event', 'form-grid', 'form-align', 'form-inline-login', 'form-inline-search', 'form-size-colon', 'form-help-icon', 'form-vmessages']) {
    const form = document.getElementById(id)
    if (!form) continue
    for (const el of form.querySelectorAll('oas-input, oas-textarea')) {
      const name = el.getAttribute('name')
      if (!name) continue
      el.addEventListener('oas-input', (e) => el.setAttribute('value', e.detail.value))
    }
    for (const el of form.querySelectorAll('oas-input-number')) {
      el.addEventListener('oas-change', (e) => el.setAttribute('value', String(e.detail.value)))
    }
  }

  // 功能展示：基础用法收集结果
  const basicOut = document.getElementById('form-basic-output')
  document.getElementById('form-basic')?.addEventListener('oas-submit', (e) => {
    basicOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 嵌套 name 路径：提交结果回显（嵌套 JSON 结构）
  const nestedOut = document.getElementById('form-nested-output')
  document.getElementById('form-nested')?.addEventListener('oas-submit', (e) => {
    nestedOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 动态字段组（form-list）：行模板经 JS 注入（md/Vue 模板编译对 <template> 内容传透不稳，
  // 原生 HTML 可直接写 <template>）；行内字段值同步由 oas-form 内建 oas-input 监听覆盖，
  // 无需逐元素接线
  const formListDemo = document.getElementById('form-list-demo-list')
  if (formListDemo) {
    const tpl = document.createElement('template')
    tpl.innerHTML =
      '<oas-input name="name" placeholder="姓名" style="width: 150px"></oas-input>' +
      '<oas-input name="role" placeholder="关系" style="width: 110px"></oas-input>'
    formListDemo.appendChild(tpl)
  }
  const listOut = document.getElementById('form-list-output')
  const formListForm = document.getElementById('form-list-demo')
  formListForm?.addEventListener('oas-submit', (e) => {
    listOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  formListForm?.addEventListener('oas-remove', (e) => {
    listOut.textContent = `oas-remove：已删除第 ${e.detail.index + 1} 行（剩余行已重新编号）`
  })

  // 原生表单集成：FormData 读取 + reset
  const nativeForm = document.getElementById('form-native')
  const fnOut = document.getElementById('fn-output')
  document.getElementById('fn-read')?.addEventListener('click', () => {
    if (!nativeForm) return
    const fd = new FormData(nativeForm)
    const text = [...fd.entries()]
      .map(([k, v]) => `${k}=${v instanceof File ? v.name : v}`)
      .join('；')
    fnOut.textContent = text ? `FormData: ${text}` : 'FormData:（当前无可提交项）'
  })
  document.getElementById('fn-reset')?.addEventListener('click', () => {
    nativeForm?.reset()
    if (fnOut) fnOut.textContent = 'form.reset() 已执行（回到各字段默认值）'
  })

  // 校验区：事件演示
  const out = document.getElementById('form-output')
  const formEvent = document.getElementById('form-event')
  formEvent?.addEventListener('oas-submit', (e) => {
    out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  formEvent?.addEventListener('oas-validate-fail', (e) => {
    out.textContent = `oas-validate-fail: ${JSON.stringify(e.detail.errors)}`
  })

  // 栅格表单：提交结果回显（校验失败的错误文本已收编进 form-item 错误位）
  const gridOut = document.getElementById('form-grid-output')
  document.getElementById('form-grid')?.addEventListener('oas-submit', (e) => {
    gridOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 栅格表单：label-align 切换（可见反馈：标签位置即时变化）
  const alignOut = document.getElementById('form-align-output')
  document.getElementById('form-align-switch')?.addEventListener('oas-change', (e) => {
    const v = e.detail.value
    document.getElementById('form-align')?.setAttribute('label-align', v)
    alignOut.textContent = `label-align: ${v}`
  })

  // 行内登录：提交结果回显（校验失败的错误文本收编进 form-item 错误位，显示在控件下方）
  const loginOut = document.getElementById('form-inline-login-output')
  document.getElementById('form-inline-login')?.addEventListener('oas-submit', (e) => {
    loginOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 行内搜索：提交结果回显
  const searchOut = document.getElementById('form-inline-search-output')
  document.getElementById('form-inline-search')?.addEventListener('oas-submit', (e) => {
    searchOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 整表禁用：开关切换 disabled 属性（字段灰化/恢复、禁用时提交跳过校验）
  const disabledForm = document.getElementById('form-disabled-all')
  const disabledSwitch = document.getElementById('form-disabled-all-switch')
  const disabledOut = document.getElementById('form-disabled-all-output')
  disabledForm?.addEventListener('oas-submit', (e) => {
    disabledOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  disabledSwitch?.addEventListener('oas-change', () => {
    const on = disabledSwitch.hasAttribute('checked')
    disabledForm.toggleAttribute('disabled', on)
    disabledOut.textContent = on ? '已禁用整表（字段灰化，提交跳过校验）' : '已恢复整表（字段恢复可用）'
  })

  // 初始值与重置：提交/失败/重置结果回显
  const initialOut = document.getElementById('form-initial-output')
  document.getElementById('form-initial')?.addEventListener('oas-submit', (e) => {
    initialOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  document.getElementById('form-initial')?.addEventListener('oas-validate-fail', (e) => {
    initialOut.textContent = `oas-validate-fail: ${JSON.stringify(e.detail.errors)}（点重置恢复初始值并清错误）`
  })
  document.getElementById('form-initial')?.addEventListener('click', (e) => {
    if (e.target?.textContent?.includes('重置')) initialOut.textContent = 'reset() 已执行（回初始值，不派发事件）'
  })

  // 自定义校验函数：validator 走 rules property 通道（函数不可 JSON 序列化）
  const validatorForm = document.getElementById('form-validator')
  if (validatorForm) {
    validatorForm.rules = {
      username: [
        { required: true, message: '请输入用户名' },
        {
          validator: (v) => {
            if (v === 'admin') return '用户名已被保留（自定义校验）'
            if (v.length < 6) return '至少 6 个字符（自定义校验）'
            return true
          },
        },
      ],
    }
  }
  const validatorOut = document.getElementById('form-validator-output')
  validatorForm?.addEventListener('oas-submit', (e) => {
    validatorOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  validatorForm?.addEventListener('oas-validate-fail', (e) => {
    validatorOut.textContent = `oas-validate-fail: ${JSON.stringify(e.detail.errors)}`
  })

  // 校验触发时机：blur 触发即时校验（反馈为错误红字显隐）
  const triggerForm = document.getElementById('form-trigger')
  const triggerOut = document.getElementById('form-trigger-output')
  triggerForm?.addEventListener('oas-blur', () => {
    const phone = triggerForm.querySelector('oas-input[name="phone"]')
    const invalid = phone?.hasAttribute('aria-invalid')
    triggerOut.textContent = invalid ? '失焦校验：格式不正确（见红字）' : '失焦校验：通过'
  })

  // 值变化事件：回显最近一次变化与全表快照
  const valuesOut = document.getElementById('form-values-output')
  document.getElementById('form-values')?.addEventListener('oas-values-change', (e) => {
    const { name, value, values } = e.detail
    valuesOut.textContent = `最近变化：${name} = ${value || '（空）'}；全表：${JSON.stringify(values)}`
  })
  // 自定义校验文案（validate-messages property 通道，覆盖 locale 默认）
  const vmForm = document.getElementById('form-vmessages')
  if (vmForm) {
    vmForm.validateMessages = {
      required: '用户名不能为空',
      minLength: '用户名至少 ${min} 个字符',
    }
  }
})
</script>

## API

### 方法

| 方法 | 说明 |
| --- | --- |
| `submit()` | 公开提交入口：委托内部 form 的 `requestSubmit()`（保留 submit 事件与 submitter 语义），经校验后派发 `oas-submit` / `oas-validate-fail`。跨 shadow 边界时 light DOM 按钮无原生提交语义，统一用此方法（如 `this.closest('oas-form').submit()`） |

### oas-form

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `colon` | 表内所有 form-item 标签渲染冒号（CSS ::after，不进 DOM 文本） | — | — |
| `disabled` | 整表禁用：字段经 form-associated 禁用通道并入生效（不回写字段 disabled 属性，防自锁）；禁用时提交跳过全部校验 | `boolean` | — |
| `gap` | 间距（grid 模式栅格间距；inline 模式项间距），token 值如 `var(--oas-space-4)`；grid 默认 `0`，inline 默认 `var(--oas-space-4)` | `string` | `0` |
| `initial-values` | 表单初始值 JSON（property `initialValues` 优先）：挂载后写入对应字段；`reset()` 回到初始值 | `Record<string, unknown> \| string` | — |
| `inline` | 行内布局：表单项水平排列（label 在控件左侧、控件自动宽度、可换行），项间距取 `gap`（默认 `var(--oas-space-4)`）；与 `layout` 并存且优先于 `layout`；此时 `label-align` 强制 `left`、`label-width` 自动 | `boolean` | — |
| `label-align` | 标签对齐：`left` / `right` / `top`（grid 模式默认 `top`；inline 模式强制 `left`） | `string` | `top` |
| `label-width` | `label-align` 为 left/right 时的标签列宽（inline 模式自动，不生效） | — | — |
| `layout` | 布局模式：`vertical`（默认，竖排）/ `grid`（24 列栅格）；非枚举值回退 `vertical`；存在 `inline` 属性时优先 | `string` | `vertical` |
| `rules` | 校验规则 JSON：`{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` | `Rules \| string` | — |
| `scroll-to-first-error` | 校验失败后聚焦首个错误字段并平滑滚动进视口（prefers-reduced-motion 时瞬跳） | `boolean` | — |
| `size` | 表级尺寸档：经 data-form-size 通道下发表内全部字段（字段自身显式 size 优先，form-associated 字段动态跟随） | — | — |
| `validate-messages` | 按规则类型覆盖 locale 默认校验文案（property/JSON 双通道，支持 ${min}/${max}/${value} 插值，default 兜底） | `ValidateMessages \| string` | — |
| `validate-trigger` | 字段级即时校验触发时机：`change`（默认）/ `blur` / `input`；规则 `validateTrigger` 可逐字段覆盖；提交始终全量校验 | `string` | `change` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-submit` | 校验通过，`detail: { values }` |
| `oas-validate-fail` | 校验失败，`detail: { errors, values }` |
| `oas-values-change` | 任一字段值变化时派发，`detail: { name, value, values }`（values 为全表快照；initial-values 写入与 reset() 静默） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 表单内容（`oas-form-item` 等） |

### oas-form-item

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `help` | 控件下方常驻帮助文案，与校验错误独立并存 | `string` | — |
| `label` | 标签文本（缺省不渲染标签行） | `string` | — |
| `name` | 字段名（透传校验关联） | — | — |
| `required` | 必填星号（仅视觉标记，校验规则仍由 form 的 `rules` 驱动） | `boolean` | — |
| `span` | 24 栅格占列数（仅 form `layout="grid"` 生效；非 1-24 整数按 24） | `string` | `24` |
| `status-icon` | 校验失败时在错误文本前显示 danger 状态图标（修正后隐藏） | `boolean` | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 字段控件 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-form-label-width` | `96px` |

校验失败时失败字段被标记 `aria-invalid`；可通过 `form.getErrors()` 获取错误信息。被 `oas-form-item` 包裹的字段，错误文本写入 form-item 的错误位（`role="alert"`）。
