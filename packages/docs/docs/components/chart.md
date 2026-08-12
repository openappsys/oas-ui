# Chart 图表

自研 SVG 图表组件（零第三方图表引擎），支持折线 / 柱状 / 饼图 / 面积 / 环形 / 堆叠柱状六型，数据更新自动重绘，`prefers-reduced-motion` 时关闭动画。

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

## 堆叠柱状图

<DemoBlock title="堆叠柱状图">
  <div style="width: 100%">
    <oas-chart type="stacked-bar" data='{"labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"线上","data":[120,132,101,134]},{"name":"门店","data":[90,95,110,102]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="stacked-bar"` 多系列自底向上堆叠为单柱，柱高 = 分类合计，y 轴刻度按合计值计算。

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

## API

### 属性

| 属性         | 说明                                                                | 类型        | 默认值 |
| ------------ | ------------------------------------------------------------------- | ----------- | ------ |
| `aria-label` | 图表描述（缺省按类型走 locale）                                     | —           | —      |
| `data`       | 数据。数组单系列 `[{label, value}]` 或对象多系列 `{labels, series}` | `unknown`   | —      |
| `options`    | 配置：`smooth`（平滑）、`colors`（系列配色）、`showLegend`          | `unknown`   | —      |
| `type`       | 图表类型：`line` / `bar` / `pie` / `area` / `donut` / `stacked-bar` | `ChartType` | `line` |

`data` / `options` 也支持 property 通道（JS 对象，优先级高于 attribute）。

### 引擎选型（架构决策）

**自研 SVG 渲染，不引入第三方图表引擎**：

1. **零依赖核心卖点**：运行时零第三方依赖是组件库的核心约束；自研 SVG 不引入任何依赖。
2. **六型覆盖常见场景**：折线/柱状/饼图/面积/环形/堆叠柱状覆盖绝大多数后台/数据展示场景；复杂图表（散点、组合坐标系、复杂地图等）属后续增强，届时再评估引入引擎的取舍。
3. **样式与主题一致**：自研可完全用组件库 token 配色（含暗色变体），与库内视觉语言统一。
4. 动画为纯 CSS（`@media (prefers-reduced-motion: no-preference)` 包裹），reduced-motion 下自动关闭，无 JS 计时器、零泄漏。

### 边界

- 数据更新重绘 SVG（同 qrcode 模式），节点不重建
- 空/非法数据 → 空态占位
- 每个数据点带原生 `<title>` tooltip，零孤儿浮层
