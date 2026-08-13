# ButtonGroup 按钮组

按钮组：将多个 `oas-button` 组合为一个选值组，相邻按钮圆角合并、hover 只亮当前项。

## 基本用法

<DemoBlock title="基础按钮组">
  <oas-button-group>
    <oas-button value="1">一月</oas-button>
    <oas-button value="2">二月</oas-button>
    <oas-button value="3">三月</oas-button>
  </oas-button-group>
</DemoBlock>

## 类型与尺寸透传

`type` / `size` 会统一透传给组内所有子按钮。`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档。

<DemoBlock title="类型与尺寸透传">
  <oas-button-group type="primary" size="large">
    <oas-button value="a">左</oas-button>
    <oas-button value="b">中</oas-button>
    <oas-button value="c">右</oas-button>
  </oas-button-group>
  <oas-button-group size="xs" style="margin-top: 8px">
    <oas-button value="a">超小</oas-button>
    <oas-button value="b">超小</oas-button>
    <oas-button value="c">超小</oas-button>
  </oas-button-group>
  <oas-button-group size="xl" style="margin-top: 8px">
    <oas-button value="a">超大</oas-button>
    <oas-button value="b">超大</oas-button>
    <oas-button value="c">超大</oas-button>
  </oas-button-group>
</DemoBlock>

## 单选

通过 `value` 声明当前选中项，点击派发 `oas-change`，detail 为 `{ value }`。

<DemoBlock title="单选选值组">
  <oas-button-group value="b" onoas-change="message.info('选中：' + event.detail.value)">
    <oas-button value="a">选项 A</oas-button>
    <oas-button value="b">选项 B</oas-button>
    <oas-button value="c">选项 C</oas-button>
  </oas-button-group>
</DemoBlock>

## 多选

加 `multiple` 开启多选，`value` 用逗号分隔多个选中值，点击派发 `oas-change`，detail 为 `{ value: [] }`。

<DemoBlock title="多选选值组">
  <oas-button-group multiple value="a,c">
    <oas-button value="a">标签 A</oas-button>
    <oas-button value="b">标签 B</oas-button>
    <oas-button value="c">标签 C</oas-button>
  </oas-button-group>
</DemoBlock>

## 可访问名称

`aria-label` 为按钮组容器设置可访问名称，屏幕阅读器将其朗读为一个可聚焦的按钮组；未设置时走内置 i18n「按钮组」。同页存在多个按钮组时，用名称区分它们。

<DemoBlock title="aria-label 可访问名称">
  <oas-button-group aria-label="视图切换" value="list">
    <oas-button value="list">列表视图</oas-button>
    <oas-button value="grid">网格视图</oas-button>
  </oas-button-group>
  <oas-button-group aria-label="结果导出" value="csv">
    <oas-button value="csv">导出 CSV</oas-button>
    <oas-button value="pdf">导出 PDF</oas-button>
  </oas-button-group>
</DemoBlock>

## 纵向

<DemoBlock title="纵向按钮组">
  <oas-button-group vertical>
    <oas-button value="up">置顶</oas-button>
    <oas-button value="mid">置中</oas-button>
    <oas-button value="down">置底</oas-button>
  </oas-button-group>
</DemoBlock>

## 禁用与混排

`disabled` 禁用整个组；组内无 `value` 属性的按钮为普通按钮，不参与选值。

<DemoBlock title="禁用与混排">
  <oas-button-group disabled>
    <oas-button value="1">已禁用</oas-button>
    <oas-button value="2">已禁用</oas-button>
  </oas-button-group>
  <oas-button-group>
    <oas-button value="save">保存</oas-button>
    <oas-button value="delete" type="danger">删除</oas-button>
    <oas-button>更多操作</oas-button>
  </oas-button-group>
</DemoBlock>

## Pill 胶囊形态

`pill` 让整个按钮组呈胶囊形态：首/尾按钮圆角使用 `--oas-radius-full`（999px），横向首左圆/尾右圆、纵向首上圆/尾下圆，中间按钮保持直角。

<DemoBlock title="Pill 胶囊形态">
  <oas-button-group pill value="a" onoas-change="message.info('选中：' + event.detail.value)">
    <oas-button value="a">选项 A</oas-button>
    <oas-button value="b">选项 B</oas-button>
    <oas-button value="c">选项 C</oas-button>
  </oas-button-group>
  <oas-button-group pill type="primary" style="margin-top: 8px">
    <oas-button value="prev">上一页</oas-button>
    <oas-button value="next">下一页</oas-button>
  </oas-button-group>
  <oas-button-group pill vertical style="margin-top: 8px">
    <oas-button value="up">置顶</oas-button>
    <oas-button value="mid">置中</oas-button>
    <oas-button value="down">置底</oas-button>
  </oas-button-group>
</DemoBlock>

## 分隔符

组内可放 `<oas-button-group-separator>` 渲染一条分隔线：横向组为 1px 竖线、纵向组为 1px 横线（方向随组朝向自动同步）。分隔符贴合相邻按钮、不参与圆角合并，建议放在按钮 / 嵌套组之间。

<DemoBlock title="分隔符">
  <oas-button-group>
    <oas-button value="copy">复制</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="cut">剪切</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="paste">粘贴</oas-button>
  </oas-button-group>
  <oas-button-group vertical style="margin-top: 8px">
    <oas-button value="top">置顶</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="middle">置中</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="bottom">置底</oas-button>
  </oas-button-group>
</DemoBlock>

## 嵌套组

`oas-button-group` 内可再嵌 `oas-button-group`，嵌套组作为整体一项参与贴合与圆角合并：外层把首/尾圆角经 `--oas-button-group-start-radius` / `--oas-button-group-end-radius` 穿透给嵌套组首尾按钮。嵌套组作为整体独立管理内部按钮（外层 `type` / `size` 不透传），外层 `disabled` 会整体禁用嵌套组。

<DemoBlock title="嵌套组">
  <oas-button-group>
    <oas-button-group>
      <oas-button value="undo">撤销</oas-button>
      <oas-button value="redo">重做</oas-button>
    </oas-button-group>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="save">保存</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button-group>
      <oas-button value="prev">上一页</oas-button>
      <oas-button value="next">下一页</oas-button>
    </oas-button-group>
  </oas-button-group>
</DemoBlock>

## 拆分按钮（Split Button）

button-group + `oas-dropdown split` 编排拆分按钮：主按钮触发 `oas-action`（执行主操作），箭头按钮展开下拉菜单（菜单选择走 `oas-select`）。

<DemoBlock title="拆分按钮（Split Button）">
  <oas-space size="small">
    <oas-dropdown split onoas-action="message.info('主按钮动作：保存')" onoas-select="message.info('选择：' + event.detail.value)" items='[{"label":"另存为","value":"save-as"},{"label":"导出 PDF","value":"pdf"},{"label":"删除","value":"delete","disabled":true}]'>
      <oas-button-group>
        <oas-button>保存</oas-button>
      </oas-button-group>
    </oas-dropdown>
    <oas-dropdown split onoas-action="message.info('主按钮动作：发布')" onoas-select="message.info('选择：' + event.detail.value)" items='[{"label":"定时发布","value":"scheduled"},{"label":"存草稿","value":"draft"}]'>
      <oas-button-group>
        <oas-button type="primary">发布</oas-button>
      </oas-button-group>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## 组合用法

按钮组与浮层、输入框等现有组件编排组合。

<DemoBlock title="按钮 + 浮层">
  <oas-space size="small">
    <oas-button-group>
      <oas-button value="edit">编辑</oas-button>
      <oas-button value="copy">复制</oas-button>
    </oas-button-group>
    <oas-dropdown items='[{"label":"粘贴为纯文本","value":"paste-text"},{"label":"粘贴为引用","value":"paste-quote"}]'>
      <oas-button>粘贴</oas-button>
    </oas-dropdown>
    <oas-popover title="格式说明" content="支持 Markdown 快捷语法，回车发送。">
      <oas-button>?</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="按钮 + 输入">
  <oas-space size="small">
    <oas-input placeholder="搜索关键词" style="width: 220px"></oas-input>
    <oas-button-group onoas-change="message.info('选中：' + event.detail.value)">
      <oas-button value="search">搜索</oas-button>
      <oas-button value="reset">重置</oas-button>
    </oas-button-group>
  </oas-space>
</DemoBlock>

<DemoBlock title="工具栏（多组组合）">
  <oas-flex gap="8px" align="center" style="padding: 8px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg)">
    <oas-button-group aria-label="文本格式">
      <oas-button value="bold">B</oas-button>
      <oas-button value="italic">I</oas-button>
      <oas-button value="underline">U</oas-button>
    </oas-button-group>
    <oas-button-group aria-label="对齐方式">
      <oas-button value="left">左对齐</oas-button>
      <oas-button value="center">居中</oas-button>
      <oas-button value="right">右对齐</oas-button>
    </oas-button-group>
    <oas-button-group aria-label="导出格式">
      <oas-button value="csv">CSV</oas-button>
      <oas-button value="pdf">PDF</oas-button>
    </oas-button-group>
  </oas-flex>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 组容器可访问名称（默认走 i18n「按钮组」） | — | — |
| `disabled` | 禁用整个组 | `boolean` | — |
| `multiple` | 多选模式 | `boolean` | — |
| `pill` | 胶囊形态：组整体首尾大圆角（`--oas-radius-full` / `999px`） | — | — |
| `size` | 透传给子按钮的尺寸 | `string` | — |
| `type` | 透传给子按钮的类型 | `string` | — |
| `value` | 选中值（单选为单值，多选用逗号分隔） | `string` | — |
| `vertical` | 纵向堆叠，圆角合并方向改为上下 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中变化。单选 `detail: { value }`；多选 `detail: { value: [] }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

> 说明：子按钮通过 `value` 属性声明其选值；不带 `value` 的子按钮是普通按钮，不参与选值、不派发 `oas-change`。选中态通过子按钮 `aria-pressed` 表达，可用 `oas-button[aria-pressed='true']` 自定义选中样式。
