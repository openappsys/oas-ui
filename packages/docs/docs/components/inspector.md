# Inspector 属性检视面板

右侧（可左）属性编辑面板：tab 条 + 可折叠分节 + 标签/控件行。设计工具右侧栏语义（`role="complementary"`）——与 `oas-sidebar`（导航菜单）的分工：inspector 是上下文属性编辑，sidebar 是 items/选中/嵌套导航。

## 基础用法

容器放 `slot="tabs"`（tab 条）与默认插槽（分节）；`oas-inspector-tabs` 的 `items` 走 JSON 声明式通道，`value` 属性即状态；分节用 `oas-inspector-section`，属性行用 `oas-inspector-row`。

<DemoBlock title="tab 条 + 分节 + 属性行">
  <oas-inspector style="height: 360px">
    <oas-inspector-tabs slot="tabs" items='[{"label":"摘要","value":"summary"},{"label":"文件","value":"file"}]' value="summary"></oas-inspector-tabs>
    <oas-inspector-section heading="变换" name="transform" collapsible default-open>
      <oas-inspector-row label="位置 X" value="128 px"></oas-inspector-row>
      <oas-inspector-row label="位置 Y" value="256 px"></oas-inspector-row>
      <oas-inspector-row label="旋转" value="15°"></oas-inspector-row>
    </oas-inspector-section>
    <oas-inspector-section heading="外观" name="appearance" collapsible default-open>
      <oas-inspector-row label="不透明度"><oas-slider value="80"></oas-slider></oas-inspector-row>
      <oas-inspector-row label="混合模式" value="正常"></oas-inspector-row>
    </oas-inspector-section>
    <oas-inspector-section heading="导出" name="export" collapsible>
      <oas-inspector-row label="格式" value="PNG"></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
</DemoBlock>

## tab 条（oas-inspector-tabs）

点击/方向键切换（roving tabindex + Home/End，RTL 镜像），派发 `oas-change`（detail `{ value }`）；`value` 属性即状态（组件切换后反射，宿主可监听协调）。

<DemoBlock title="tab 切换反馈">
  <oas-inspector id="insp-tabs" style="height: 200px">
    <oas-inspector-tabs id="insp-tabs-bar" slot="tabs" items='[{"label":"摘要","value":"summary"},{"label":"文件","value":"file"},{"label":"标记点","value":"marks"}]' value="summary"></oas-inspector-tabs>
    <oas-inspector-row label="色彩空间" value="Rec. 709"></oas-inspector-row>
  </oas-inspector>
  <p id="insp-tabs-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点 tab 或用方向键切换，观察 oas-change 反馈。</p>
</DemoBlock>

## 分节折叠（oas-inspector-section）

`collapsible` 启用折叠（`aria-expanded` 同步），`open` 属性即状态（点击切换并反射），`default-open` 初始展开；点击派发 `oas-toggle`（detail `{ name, open }`）；`slot="extra"` 放标题行末端操作（与折叠点击解耦）。

<DemoBlock title="折叠切换反馈">
  <oas-inspector id="insp-fold" style="height: 240px">
    <oas-inspector-section heading="排版" name="typography" collapsible>
      <oas-inspector-row label="字号" value="16 px"></oas-inspector-row>
      <oas-inspector-row label="行高" value="1.6"></oas-inspector-row>
    </oas-inspector-section>
    <oas-inspector-section heading="描边" name="stroke" collapsible>
      <oas-inspector-row label="宽度" value="2 px"></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
  <p id="insp-fold-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点分节标题折叠/展开，观察 oas-toggle 反馈（name + open）。</p>
</DemoBlock>

## 行形态：键值 / 控件 / 混合值 / 行级复位

`oas-inspector-row` 双形态：无默认插槽内容为**键值行**（`value` 表格数字体），有插槽内容为**控件行**（50/50 分栏，表单件由宿主放入）；`mixed` 显示多选混合态（内置文案）；`reset` 显示行级复位钮，点击派发 `oas-row-reset`。

<DemoBlock title="行形态全集">
  <oas-inspector style="height: 260px">
    <oas-inspector-section heading="摄像机" collapsible default-open>
      <oas-inspector-row label="帧率" value="25 fps"></oas-inspector-row>
      <oas-inspector-row label="分辨率" value="3840 × 2160"></oas-inspector-row>
      <oas-inspector-row label="曝光" value="-0.5" reset></oas-inspector-row>
      <oas-inspector-row label="增益（多选）" mixed></oas-inspector-row>
      <oas-inspector-row label="白平衡"><oas-slider value="5600"></oas-slider></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
</DemoBlock>

## 斑马底与顶对齐（striped / align-top）

`striped` 给行加斑马底（值走 `--oas-inspector-row-striped-bg`，未设时回退 `--oas-color-bg-hover`，主题感知）；`align-top` 让标签与控件顶部对齐，适配高控件行（如多行文本）。

<DemoBlock title="striped + align-top">
  <oas-inspector style="height: 220px">
    <oas-inspector-section heading="对齐与斑马" collapsible default-open>
      <oas-inspector-row label="普通行" value="居中"></oas-inspector-row>
      <oas-inspector-row label="斑马行" value="带底纹" striped></oas-inspector-row>
      <oas-inspector-row label="摘要（顶对齐）" align-top><oas-textarea rows="3" placeholder="多行备注"></oas-textarea></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
</DemoBlock>

## 空态（empty）

`empty` 布尔属性切换无选中态：默认插槽隐藏、`slot="empty"` 显示（缺省内置文案「未选中对象」）。

<DemoBlock title="无选中空态">
  <div style="display: flex; gap: var(--oas-space-3); align-items: stretch">
    <oas-inspector empty style="height: 160px"></oas-inspector>
    <oas-inspector empty style="height: 160px">
      <div slot="empty">先在画布中选中一个图层</div>
    </oas-inspector>
  </div>
</DemoBlock>

## 密度档（density）与栏位方向（side）、RTL

`density="compact"` 收紧行高/间距（24px 行高档，token 通道下发子件）；`side="left"` 切换分隔线方向语义钩子（定位仍由宿主布局决定）；容器 `dir="rtl"` 下自动镜像。

<DemoBlock title="default / compact / side=left 对照">
  <div style="display: flex; gap: var(--oas-space-3); align-items: stretch">
    <oas-inspector style="height: 180px">
      <oas-inspector-section heading="默认密度" collapsible default-open>
        <oas-inspector-row label="位置" value="128, 256"></oas-inspector-row>
        <oas-inspector-row label="缩放" value="100%"></oas-inspector-row>
      </oas-inspector-section>
    </oas-inspector>
    <oas-inspector density="compact" style="height: 180px">
      <oas-inspector-section heading="紧凑密度" collapsible default-open>
        <oas-inspector-row label="位置" value="128, 256"></oas-inspector-row>
        <oas-inspector-row label="缩放" value="100%"></oas-inspector-row>
      </oas-inspector-section>
    </oas-inspector>
    <oas-inspector side="left" style="height: 180px">
      <oas-inspector-section heading="左栏（side=left）" collapsible default-open>
        <oas-inspector-row label="分隔线在右缘（inline-end）" value="—"></oas-inspector-row>
      </oas-inspector-section>
    </oas-inspector>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tabsBar = document.getElementById('insp-tabs-bar')
  const tabsOut = document.getElementById('insp-tabs-out')
  tabsBar?.addEventListener('oas-change', (e) => {
    tabsOut.textContent = `oas-change 已派发：value=${e.detail.value}（value 属性已反射）`
  })
  const fold = document.getElementById('insp-fold')
  const foldOut = document.getElementById('insp-fold-out')
  fold?.addEventListener('oas-toggle', (e) => {
    foldOut.textContent = `oas-toggle 已派发：name=${e.detail.name}，open=${e.detail.open}`
  })
})
</script>

## API

### oas-inspector

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active-tab` | 当前 tab（配合 oas-inspector-tabs 使用；属性即状态） | — | — |
| `density` | 密度档：default（默认，行高 28px）/ compact（行高 24px、间距收窄，token 通道下发子件）；非法值回落 default 并告警一次 | `string` | `default` |
| `empty` | 无选中态：默认插槽隐藏、empty 插槽（缺省内置文案「未选中对象」）显示 | `boolean` | — |
| `label` | 可访问名称（缺省走 i18n「属性面板」） | `string` | — |
| `side` | 栏位方向：right（默认）/ left（仅分隔线方向语义钩子，定位由宿主布局决定）；非法值回落 right 并告警一次 | `string` | `right` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 分节 / 内容区（oas-inspector-section 等） |
| `empty` | 无选中态内容（覆盖内置文案） |
| `footer` | 底部区 |
| `header` | 顶部区 |
| `tabs` | tab 条通道（oas-inspector-tabs） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-inspector-bg` | `color-mix(in srgb, var(--oas-color-text-primary) 3%, var(--oas-color-bg))` |
| `--oas-inspector-gap` | `var(--oas-space-2)` |
| `--oas-inspector-width` | `280px` |

<style>
.vp-doc .demo-block oas-inspector {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
</style>
