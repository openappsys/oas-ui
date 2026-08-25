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

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-context-menu-item>` / `<oas-context-menu-group>` / `<oas-context-menu-divider>` 子元素声明式书写菜单（`items` 属性**显式设置时优先**，未设置时解析子元素收敛到同一渲染路径）。默认插槽文本为 label，属性对齐 `items` 字段：`value` / `disabled` / `loading` / `icon` / `kind` / `danger` / `href` / `target` / `rel`；`<oas-context-menu-item>` 内直接嵌套子元素即递归为子菜单，`<oas-context-menu-group>` 的 `label` 属性为组标题（`value` 可作 radio 组 id），组内子元素平铺同层。子元素增删、属性与文本变化会自动重渲染（MutationObserver）。

<DemoBlock title="子元素声明式（分组 / 分隔线 / 嵌套 / danger / href）">
  <oas-context-menu id="cm-decl" onoas-select="cmDeclLog(event)">
    <div style="width: 260px; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键查看声明式菜单</div>
    <oas-context-menu-group label="剪贴板">
      <oas-context-menu-item value="copy">复制</oas-context-menu-item>
      <oas-context-menu-item value="paste">粘贴</oas-context-menu-item>
    </oas-context-menu-group>
    <oas-context-menu-divider></oas-context-menu-divider>
    <oas-context-menu-item value="new">新建
      <oas-context-menu-item value="new-file">文件</oas-context-menu-item>
      <oas-context-menu-item value="new-folder">文件夹</oas-context-menu-item>
    </oas-context-menu-item>
    <oas-context-menu-item value="docs" href="/components/" target="_blank" rel="noopener">组件文档</oas-context-menu-item>
    <oas-context-menu-divider></oas-context-menu-divider>
    <oas-context-menu-item value="delete" danger>删除</oas-context-menu-item>
  </oas-context-menu>
  <oas-tag id="cm-decl-result" type="info">尚未选择</oas-tag>
</DemoBlock>

<DemoBlock title="动态增删（MutationObserver 自动刷新）">
  <oas-space size="small" style="margin-bottom: 8px">
    <oas-button size="small" onclick="cmDeclAdd()">追加一项</oas-button>
  </oas-space>
  <oas-context-menu id="cm-decl-dyn">
    <div style="width: 260px; height: 100px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键我，点上方按钮追加一项</div>
    <oas-context-menu-item value="copy">复制</oas-context-menu-item>
    <oas-context-menu-item value="paste">粘贴</oas-context-menu-item>
  </oas-context-menu>
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

  // 子元素声明式通道：选中回显 + 运行时追加一项（MutationObserver 自动重渲染）
  window.cmDeclLog = (e) => {
    const tag = document.getElementById('cm-decl-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}（子元素声明式通道）`
  }
  const declDyn = document.getElementById('cm-decl-dyn')
  if (declDyn) {
    window.cmDeclAdd = () => {
      const n = declDyn.querySelectorAll('oas-context-menu-item').length
      const item = document.createElement('oas-context-menu-item')
      item.setAttribute('value', `extra-${n}`)
      item.textContent = `动态项 ${n}`
      declDyn.appendChild(item)
    }
  }
})
</script>

## API

### oas-context-menu

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `close-on-scroll` | 页面滚动时关闭菜单（默认 true） | `string` | `true` |
| `items` | 菜单项 JSON | `string` | `[]` |
| `long-press-delay` | 移动端长按触发时长毫秒数（默认 500） | `string` | `500` |
| `open` | 受控展开态（外部可写） | `boolean` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | 菜单开合变化，`detail: { open: boolean }` |
| `oas-select` | 选择某项，`detail: { value }` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-context-menu-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `danger` | 破坏性项：红色语义（删除/退出等危险操作） | — | — |
| `disabled` | 禁用该项 | — | — |
| `href` | 链接地址：有 href 时渲染为原生 `<a>`（真实跳转 + 照常派发 `oas-select`） | — | — |
| `icon` | 前置图标（`@oas-ui/icons` 注册表图标名） | — | — |
| `kind` | 叶子项语义：`radio`（默认，可勾选）/ `action`（动作项，无勾选态、不写回 value）/ `checkbox`（多选勾选，value 数组勾选集） | — | — |
| `loading` | 加载中：渲染 spinner、禁点，由数据驱动恢复 | — | — |
| `rel` | 链接 rel（配合 href） | — | — |
| `target` | 链接 target（配合 href） | — | — |
| `value` | 选中值（子元素声明式通道的数据载体字段） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 右键菜单项 label 内容（默认插槽文本）；直接子元素 `<oas-context-menu-item>` 递归为子菜单 children |

### oas-context-menu-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 分组标题（组标题小字、次要色、不可点） | — | — |
| `value` | radio 组 id（组内点选只更新该组选中值） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 组内菜单项：子元素 `<oas-context-menu-item>` 平铺同层 |

### oas-context-menu-divider

| 名称 | 说明 |
| --- | --- |
| 默认 | 分隔线数据载体（无属性，宿主解析为 `type: "divider"`） |

鼠标位置弹出，Esc / 外部点击 / 选择后自动关闭；`role="menu"` + `menuitem`。
