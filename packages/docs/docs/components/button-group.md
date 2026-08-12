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

## API

### 属性

| 属性         | 说明                                      | 类型      | 默认值 |
| ------------ | ----------------------------------------- | --------- | ------ |
| `aria-label` | 组容器可访问名称（默认走 i18n「按钮组」） | —         | —      |
| `disabled`   | 禁用整个组                                | `boolean` | —      |
| `multiple`   | 多选模式                                  | `boolean` | —      |
| `size`       | 透传给子按钮的尺寸                        | `string`  | —      |
| `type`       | 透传给子按钮的类型                        | `string`  | —      |
| `value`      | 选中值（单选为单值，多选用逗号分隔）      | `string`  | —      |
| `vertical`   | 纵向堆叠，圆角合并方向改为上下            | —         | —      |

### 事件

| 事件         | 说明                                                             |
| ------------ | ---------------------------------------------------------------- |
| `oas-change` | 选中变化。单选 `detail: { value }`；多选 `detail: { value: [] }` |

### 插槽

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |

> 说明：子按钮通过 `value` 属性声明其选值；不带 `value` 的子按钮是普通按钮，不参与选值、不派发 `oas-change`。选中态通过子按钮 `aria-pressed` 表达，可用 `oas-button[aria-pressed='true']` 自定义选中样式。
