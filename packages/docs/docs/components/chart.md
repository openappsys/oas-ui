# Chart 图表

自研 SVG 图表组件（零第三方图表引擎），支持折线 / 柱状 / 饼图 / 面积 / 环形 / 堆叠柱状 / 雷达 / 极坐标面积八型，外加系列级组合图与双轴。数据更新自动重绘，`prefers-reduced-motion` 时关闭动画。

## 折线图

<DemoBlock title="折线图（默认）">
  <div style="width: 100%">
    <oas-chart type="line" data='[{"label":"一月","value":10},{"label":"二月","value":20},{"label":"三月","value":15},{"label":"四月","value":28},{"label":"五月","value":22}]'></oas-chart>
  </div>
</DemoBlock>

默认 `type="line"`。数组数据 `[{label, value}]` 为单系列；悬停数据点可查看数值（原生 `<title>`）。

## 柱状图

<DemoBlock title="柱状图">
  <div style="width: 100%">
    <oas-chart type="bar" data='[{"label":"北京","value":86},{"label":"上海","value":92},{"label":"广州","value":65},{"label":"深圳","value":78}]'></oas-chart>
  </div>
</DemoBlock>

`type="bar"` 渲染分组柱状。

## 饼图

<DemoBlock title="饼图">
  <div style="width: 100%">
    <oas-chart type="pie" data='[{"label":"市场","value":40},{"label":"研发","value":35},{"label":"运营","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="pie"` 渲染扇区，tooltip 显示占比。

## 环形图

<DemoBlock title="环形图">
  <div style="width: 100%">
    <oas-chart type="donut" data='[{"label":"市场","value":40},{"label":"研发","value":35},{"label":"运营","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="donut"` 与饼图同数据格式，中间镂空成环带，tooltip 同样显示占比。

## 面积图

<DemoBlock title="面积图（smooth + 图例）">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="area"` 在折线基础上向基线填充半透明区域（多系列叠加时仍可读），支持 `options.smooth` 平滑曲线。

<DemoBlock title="面积图（渐变填充）">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true,"gradient":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

`options.gradient`（默认 false）开启后，面积填充从曲线处的系列色向基线垂直渐淡（顶部实色、底部透明），视觉重心聚焦数据线。

## 堆叠柱状图

<DemoBlock title="堆叠柱状图">
  <div style="width: 100%">
    <oas-chart type="stacked-bar" data='{"labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"线上","data":[120,132,101,134]},{"name":"门店","data":[90,95,110,102]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="stacked-bar"` 多系列自底向上堆叠为单柱，柱高 = 分类合计，y 轴刻度按合计值计算。

## 雷达图

<DemoBlock title="雷达图（radarShape + max 量程）">
  <div style="width: 100%">
    <oas-chart type="radar" options='{"max":100}' data='{"labels":["速度","稳定","续航","智能","安全"],"series":[{"name":"车型 A","data":[80,92,75,88,95]},{"name":"车型 B","data":[90,70,82,79,85]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="radar"` 的维度名复用 `labels`（与折线/柱状同一数据心智，零迁移成本）。`options.max` 设全局统一量程（缺省取全系列 max 走 nice 刻度）；`options.radarShape`（默认 `polygon` 同心多边形）设为 `circle` 换同心圆网格。悬停顶点显示「维度： 值」，图例/配色与其他图型一致。

## 极坐标面积图

<DemoBlock title="极坐标面积图（玫瑰图）">
  <div style="width: 100%">
    <oas-chart type="polar-area" data='[{"label":"东","value":11},{"label":"南","value":16},{"label":"西","value":7},{"label":"北","value":14}]'></oas-chart>
  </div>
</DemoBlock>

`type="polar-area"` 每分类等角扇区、半径编码数值（最大值满半径），同心参考圈提供径向量级读数。与饼图的「份额」心智不同，tooltip 显示原始数值而非占比。单系列取 `series[0]`（与饼图/环图同一数据格式）。

## 组合图

<DemoBlock title="组合图（柱 + 线系列级混排）">
  <div style="width: 100%">
    <oas-chart type="bar" data='{"labels":["一月","二月","三月","四月"],"series":[{"name":"销量","data":[120,132,101,134]},{"name":"增速","data":[5,12,8,15],"type":"line"}]}'></oas-chart>
  </div>
</DemoBlock>

组合图**不设独立 type 值**：顶层 `type` 作为缺省系列型，`series[].type`（`bar` / `line` / `area`）逐系列覆盖，缺省/非法值回退顶层型。共享同一分类轴，线/面积点对齐柱组中心（与纯折线的端点对齐不同）；绘制层序固定 bar → area → line；配色与图例按系列声明顺序。

## 双轴图

<DemoBlock title="双轴组合图（右轴 + alignTicks 刻度对齐）">
  <div style="width: 100%">
    <oas-chart type="bar" options='{"yAxis":[{"name":"销量"},{"name":"增速"}]}' data='{"labels":["一月","二月","三月","四月"],"series":[{"name":"销量","data":[120,132,101,134]},{"name":"增速","data":[5,12,8,15],"type":"line","yAxisIndex":1}]}'></oas-chart>
  </div>
</DemoBlock>

双轴是坐标系配置不是图型：`options.yAxis` 数组第 2 项存在**且左右两侧均有 `series[].yAxisIndex` 绑定系列**时启用右轴（`name` 为轴名，渲染在轴顶；缺任一侧按单轴渲染，不渲染空轴），`series[].yAxisIndex`（`0` 左默认 / `1` 右）绑定归属；可与 line / bar / 组合图任意叠加。双轴时刻度强制对齐（alignTicks）：副轴以主轴档数为锚重算 nice 刻度，左右刻度线一一水平对齐，消除刻度错位误读——但两轴单位不同，同一条线上的左右读数**不可横比**。堆叠柱状/饼系/雷达类忽略 `yAxis`（单轴语义）。

## 多系列 + 图例

<DemoBlock title="多系列折线（smooth + 图例）">
  <div style="width: 100%">
    <oas-chart type="line" options='{"smooth":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

对象格式 `{labels, series:[{name, data}]}` 支持多系列；多系列时默认显示图例，`options.smooth` 开启平滑曲线。

## 空数据

<DemoBlock title="空数据占位">
  <div style="width: 100%">
    <oas-chart data='[]'></oas-chart>
  </div>
</DemoBlock>

无数据 / 非法 JSON 显示空态占位，不报错。

## 数据通道契约

`data` / `options` 双通道传值：

- **attribute 通道**：HTML 上写 JSON 字符串（如 `data='[{...}]'`），组件内部 `JSON.parse` 解析。
- **property 通道**：JS 直接赋对象/数组（`el.data = [{...}]`），免序列化；属性通道的解析在 setter 内完成，优先级高于 attribute。

**反射行为差异（读取数据的方式两组件不统一，请按下面约定）**：

- `oas-table` 的 `columns` / `data` setter 会把值**反射回 attribute**——property 赋值后 `getAttribute('columns')` / `getAttribute('data')` 可读回对应的 JSON 字符串（attribute 与 property 保持单一数据源同步）。
- `oas-chart` 的 `data`（及 `options`）setter **只写内部状态、不反射**——property 赋值后 attribute 仍是旧值/空值，**读取走 `el.data` property**（getter 返回最近一次赋值的解析结果），不要用 `getAttribute('data')` 回读。

> 例外：`oas-table` 的 `columns` 若含函数字段（`render` 等，JSON 序列化会丢），setter 走纯内存路径不反射——此类列的读取请走 `el.columns` property。

## API

### oas-chart

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 图表描述（缺省按类型走 locale） | — | — |
| `data` | 数据。数组单系列 `[{label, value}]` 或对象多系列 `{labels, series:[{name, data, type?, yAxisIndex?}]}`（系列级 `type` / `yAxisIndex` 用于组合图与双轴） | `unknown` | — |
| `options` | 配置：`smooth`（平滑）、`colors`（系列配色）、`showLegend`、`gradient`（面积图垂直渐变填充，默认 false）、`max`（radar 全局量程）、`radarShape`（radar 网格 `polygon`/`circle`，默认 polygon）、`yAxis`（双轴数组，第 2 项存在且两侧均有 yAxisIndex 绑定系列才启用双轴，缺侧按单轴） | `unknown` | — |
| `type` | 图表类型：`line` / `bar` / `pie` / `area` / `donut` / `stacked-bar` / `radar` / `polar-area`（组合图不设 type 值，用系列级 `series.type` 覆盖） | `ChartType` | `line` |

`data` / `options` 也支持 property 通道（JS 对象，优先级高于 attribute）。

### 边界

- 数据更新重绘 SVG（同 qrcode 模式），节点不重建
- 空/非法数据 → 空态占位
- 每个数据点带原生 `<title>` tooltip，零孤儿浮层
- 动画为纯 CSS（`@media (prefers-reduced-motion: no-preference)` 包裹），reduced-motion 下自动关闭，无 JS 计时器
- radar 维度量程为全局统一（`options.max` 或 nice 刻度），暂不支持逐维独立量程——需要时宿主可先自行归一化（如 0-100 分制）
- polar-area 值全为 0 时不渲染扇区（与饼图同口径）；半径量程为最大值满半径
- 组合图只允许 `bar` / `line` / `area` 三型互混（同一直角坐标系），其他类型值静默回退顶层型
- 系列级 `type` / `yAxisIndex` 只被直角坐标系图型（line / bar / area / 组合图）消费；`stacked-bar` / `pie` / `donut` / `radar` / `polar-area` 忽略系列级覆盖，一律按顶层 `type` 渲染
- 仅声明 `options.yAxis` 第 2 项而绑定未覆盖两侧（无右绑、或全部系列绑右致左轴空置）时按单轴渲染——不渲染 0 刻度假轴（未用轴名同免）
- y 轴刻度步长恒为整数（nice 上取整，最小步长 1）：小数量程（如 0~0.01、不足 4 段的量程）会退化为整步刻度、数据全部压底——小量程数据建议宿主先做单位换算（如 ×100 转百分比）
- 配色映射语义：饼系（pie / donut / polar-area）按**分类**上色，直角系（line / bar / area / stacked-bar / radar / 组合图）按**系列**上色；`options.colors` 按同序覆盖
- 图表 svg 内文字方向钉死 `direction: ltr`（坐标语义与书写方向正交）：宿主 `dir=rtl` 不翻转文字锚点、不镜像几何
