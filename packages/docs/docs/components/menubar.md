# Menubar 应用菜单栏

桌面应用式顶部菜单条（文件 / 编辑 / 视图），点击 / 悬停展开子菜单（级联浮出），支持方向键、`Alt` 访问键与焦点陷阱。

## 基础用法

<DemoBlock title="基础用法">
  <oas-menubar id="menubar-basic" onoas-select="menubarLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"},{"type":"divider"},{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]},{"label":"视图","value":"view","accessKey":"v","children":[{"label":"全屏","value":"fullscreen"},{"label":"缩放","value":"zoom","children":[{"label":"放大","value":"zoom-in"},{"label":"缩小","value":"zoom-out"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 禁用项与分组

子菜单内支持 `disabled`、`type: "divider"` 分隔线与 `type: "group"` 分组标题。

<DemoBlock title="禁用项与分组">
  <oas-menubar onoas-select="menubarLog2(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"type":"group","label":"最近","children":[{"label":"项目 A","value":"proj-a"},{"label":"项目 B","value":"proj-b"}]},{"type":"divider"},{"label":"保存","value":"save"},{"label":"另存为","value":"save-as","disabled":true}]}]'></oas-menubar>
  <oas-tag id="menubar-result-2" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控选中

`value` 属性受控（已列入 observedAttributes）：外部 `setAttribute('value', ...)` 即时生效，选中项（勾选/高亮）同步到对应叶子项；组件内部点击也会写回 `value`（非受控通道），宿主可监听 `oas-select` 自行接管。

<DemoBlock title="受控选中（value 属性）">
  <oas-space size="small">
    <oas-button size="small" onclick="mbSet('new')">选中「新建」</oas-button>
    <oas-button size="small" onclick="mbSet('undo')">选中「撤销」</oas-button>
    <oas-button size="small" onclick="mbSet('')">清除选中</oas-button>
    <oas-tag id="mb-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-value" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menubarLog = (e) => {
    const tag = document.getElementById('menubar-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menubarLog2 = (e) => {
    const tag = document.getElementById('menubar-result-2')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }

  const mb = document.getElementById('mb-value')
  const status = document.getElementById('mb-value-status')
  if (mb && status) {
    const sync = () => {
      status.textContent = `value: ${mb.getAttribute('value') || '-'}`
    }
    window.mbSet = (v) => {
      // value 在 observedAttributes 中：直接 setAttribute 即触发即时重渲染
      mb.setAttribute('value', v)
    }
    // 受控接管：菜单内点击组件已写回 value；宿主亦可监听 oas-select 自行决定
    mb.addEventListener('oas-select', (e) => mbSet(e.detail.value))
    sync()
    new MutationObserver(sync).observe(mb, { attributes: true, attributeFilter: ['value'] })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 顶级菜单项 JSON（含子菜单 children） | — | `[]` |
| `value` | 受控选中值（外部改即时同步勾选；内部选中自动写回） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 选择某项，`detail: { value }` |

`MenubarItem` 字段（继承 `MenuItem`）：

| 字段       | 说明                                                        | 类型     |
| ---------- | ----------------------------------------------------------- | -------- |
| `label`    | 菜单文字                                                    | `string` |
| `value`    | 选中值                                                      | `string` |
| `accessKey`| `Alt` 访问键（单字符）；缺省取 label 首个 ASCII 字母        | `string` |
| `disabled` | 禁用                                                        | `boolean`|
| `children` | 子菜单项（可继续嵌套，级联向右浮出）                        | `MenubarItem[]` |

键盘：顶级 `←`/`→` 切换、`↓`/`Enter` 打开子菜单、`Esc` 关闭；子菜单内 `↑`/`↓` 移动、`→` 进入级联、`←` 返回父级；`Home`/`End` 跳转。`Alt` 单独按下聚焦菜单栏，`Alt + 访问键` 打开对应顶级菜单。子菜单打开时 `Tab` 在子项间循环（焦点陷阱），`roving tabindex` 只保留当前顶级项可 Tab 到达。
