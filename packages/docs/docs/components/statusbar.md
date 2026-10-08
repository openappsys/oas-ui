# StatusBar 状态栏

底部静默信息条：左右分段单元格 + 可点项 + 后台活动旋转指示 + 告警/进度语义色。与 `oas-footer`（内容页脚）的分工——statusbar 承载状态词汇（聚合计数、当前选中、同步态），footer 是语义化内容页脚。

## 基础用法

默认插槽放左段单元格（与整个工作区相关的聚合状态），`slot="end"` 放右段（次要/上下文项，自动推到远端，RTL 镜像）。数值单元格建议 `value` + `label` 组合（`value` 走表格数字体对齐）。全空单元格（`label` / `value` / `icon` / `spinning` 全缺）整体不渲染（宿主打 `data-empty` 并退场，无布局足迹，不留间隔位）。

<DemoBlock title="场景计数 + 选中 + 同步态">
  <div style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item label="场景" value="15"></oas-statusbar-item>
      <oas-statusbar-item label="素材" value="210"></oas-statusbar-item>
      <oas-statusbar-item label="已选" value="1"></oas-statusbar-item>
      <oas-statusbar-item label="IMG_4038.CR3"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="分支" value="main"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="UTF-8"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

## 可点单元格（button）

`button` 布尔属性把单元格渲染为原生 button（键盘可达），点击派发 `oas-item-click`（detail `{ value, label }`，可在容器或宿主上监听）。

<DemoBlock title="点击单元格触发命令">
  <div style="width: 100%">
    <oas-statusbar id="sb-click">
      <oas-statusbar-item button label="问题" value="3" status="info"></oas-statusbar-item>
      <oas-statusbar-item button label="同步" value="1m 前"></oas-statusbar-item>
      <oas-statusbar-item slot="end" button label="帮助"></oas-statusbar-item>
    </oas-statusbar>
  </div>
  <p id="sb-click-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点左段可点项，观察 oas-item-click 事件反馈。</p>
</DemoBlock>

## 语义色与后台活动（status / spinning）

`status` 语义档：`default` / `info` / `warning` / `error` / `progress`——warning/error 用底色醒目（仅特殊且必要场景慎用，状态栏惯例），info/progress 只着文字色；`spinning` 显示后台活动旋转指示（`prefers-reduced-motion` 停转）。

<DemoBlock title="状态语义档">
  <div style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item label="渲染中" spinning status="progress"></oas-statusbar-item>
      <oas-statusbar-item label="同步" status="info"></oas-statusbar-item>
      <oas-statusbar-item label="警告" value="2" status="warning"></oas-statusbar-item>
      <oas-statusbar-item label="离线" status="error"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="48 kHz"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

## 图标（icon）

`icon` 属性从内置图标注册表取图（`@oas-ui/icons`；未知名不渲染）。

<DemoBlock title="图标单元格">
  <div style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item icon="check" label="已保存"></oas-statusbar-item>
      <oas-statusbar-item icon="clock" label="自动备份" value="5 分钟前"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

## RTL

容器 `dir="rtl"` 下组件自动镜像：`data-rtl` 钩子 + 全逻辑属性布局，`end` 段推到书写方向远端。

<DemoBlock title="RTL 镜像">
  <div dir="rtl" style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item label="المشاهد" value="15"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="الفرع" value="main"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const bar = document.getElementById('sb-click')
  const out = document.getElementById('sb-click-out')
  bar?.addEventListener('oas-item-click', (e) => {
    out.textContent = `oas-item-click 已派发：label=${e.detail.label}，value=${e.detail.value || '（空）'}`
  })
})
</script>

## API

### oas-statusbar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 可访问名称（缺省走 i18n「状态栏」） | `string` | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 左段状态单元格（与整个工作区相关的聚合状态） |
| `end` | 右段状态单元格（次要/上下文项，自动推到书写方向远端） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-statusbar-bg` | `var(--oas-color-bg-elevated)` |
| `--oas-statusbar-height` | `24px` |
