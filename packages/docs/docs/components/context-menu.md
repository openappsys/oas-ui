# ContextMenu 右键菜单

在包裹区域内右键弹出菜单，菜单定位在鼠标位置。

## 基础用法

<DemoBlock title="右键触发">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键查看菜单</div>
  </oas-context-menu>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"删除","value":"delete","disabled":true}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键查看（删除不可用）</div>
  </oas-context-menu>
</DemoBlock>

## 多级子菜单

<DemoBlock title="多级子菜单">
  <oas-context-menu items='[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"},{"label":"项目","value":"new-project","children":[{"label":"Git 仓库","value":"repo"},{"label":"空白","value":"blank"}]}]},{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"浏览…","value":"browse"}]},{"label":"删除","value":"delete"}]'>
    <div style="width: 260px; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键查看多级子菜单</div>
  </oas-context-menu>
</DemoBlock>

带 `children` 的菜单项 hover / 点击展开级联子菜单，选中叶子项后自动收回并关闭。

## 选择事件

<DemoBlock title="选择事件">
  <oas-context-menu id="cm-event" onoas-select="cmLog(event)" items='[{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键</div>
  </oas-context-menu>
  <oas-tag id="cm-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 编程式定位与受控 open

<DemoBlock title="show(x, y) / close()">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
    <oas-button size="small" onclick="cmShow($event)">在 (140, 120) 打开</oas-button>
    <oas-button size="small" onclick="cmClose($event)">关闭</oas-button>
    <oas-tag id="cm-open-state" type="info">未打开</oas-tag>
  </div>
  <oas-context-menu id="cm-programmatic" items='[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 100px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">此区域右键打开，或点上方按钮以任意坐标打开</div>
  </oas-context-menu>
</DemoBlock>

`show(x, y)` 可在任意坐标弹菜单（表格行 / 画布 / 选区右键等脱离宿主元素的场景），`close()` 编程式关闭；`open` 属性受控开关，开合状态经 `oas-open-change` 事件感知。

## 长按触发（移动端）

移动端没有右键，长按（默认 500ms）即触发菜单；`long-press-delay` 可调时长（毫秒）。桌面浏览器可用 DevTools 设备模拟验证。

<DemoBlock title="长按触发">
  <oas-context-menu long-press-delay="400" items='[{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">移动端长按此区域打开菜单</div>
  </oas-context-menu>
</DemoBlock>

## 滚动关闭

菜单为 fixed 定位，打开后滚动页面或内部滚动区域默认自动关闭（避免与内容脱节）；`close-on-scroll="false"` 可关闭该行为。

<DemoBlock title="滚动关闭">
  <oas-context-menu id="cm-scroll" items='[{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 100px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键打开菜单后滚动下方区域，菜单即关闭</div>
  </oas-context-menu>
  <oas-context-menu id="cm-scroll-keep" close-on-scroll="false" items='[{"label":"刷新","value":"refresh"}]'>
    <div style="width: 260px; height: 60px; margin-top: var(--oas-space-3); border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键我：close-on-scroll="false" 滚动不关闭</div>
  </oas-context-menu>
  <div style="width: 260px; height: 120px; overflow: auto; margin-top: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
    <div style="height: 320px; padding: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">滚动内容……（菜单打开后在此滚动即自动关闭）</div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.cmLog = (e) => {
    const tag = document.getElementById('cm-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  // 编程式定位 + 受控 open：按钮 stopPropagation 防止事件冒泡触发外部点击关闭
  const cm = document.getElementById('cm-programmatic')
  const stateTag = document.getElementById('cm-open-state')
  cm.addEventListener('oas-open-change', (e) => {
    if (stateTag) stateTag.textContent = e.detail.open ? '已打开' : '已关闭'
  })
  window.cmShow = (e) => {
    e?.stopPropagation()
    cm.show(140, 120)
  }
  window.cmClose = (e) => {
    e?.stopPropagation()
    cm.close()
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `close-on-scroll` | 页面滚动时关闭菜单（默认 true） | `string` | `true` |
| `items` | 菜单项 JSON | `string` | `[]` |
| `long-press-delay` | 移动端长按触发时长毫秒数（默认 500） | `string` | `500` |
| `open` | 受控展开态（外部可写） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | 菜单开合变化，`detail: { open: boolean }` |
| `oas-select` | 选择某项，`detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

鼠标位置弹出，Esc / 外部点击 / 选择后自动关闭；`role="menu"` + `menuitem`。
