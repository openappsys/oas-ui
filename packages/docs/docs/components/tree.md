# Tree 树

用于展示层级数据，支持选中、展开、多选、懒加载与节点拖拽。

## 基础用法

<DemoBlock title="层级树">
  <div style="width: 100%">
    <oas-tree data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B","children":[{"key":"b-1","label":"子节点 1"}]},{"key":"c","label":"节点 C"}]'></oas-tree>
  </div>
</DemoBlock>

点击展开按钮显示 / 收起子节点，点击节点文本选中该节点。

## 受控展开与选中

<DemoBlock title="初始展开与选中">
  <div style="width: 100%">
    <oas-tree expanded="a" selected="a-1" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

`expanded` 控制展开节点，`selected` 控制选中节点。

## 多选

<DemoBlock title="可多选（checkable）">
  <div style="width: 100%">
    <oas-tree checkable expanded="a" checked="a-1,b" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

## 禁用节点

<DemoBlock title="禁用节点">
  <div style="width: 100%">
    <oas-tree expanded="a" data='[{"key":"a","label":"可操作节点","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"只读节点","disabled":true}]},{"key":"b","label":"只读节点","disabled":true}]'></oas-tree>
  </div>
</DemoBlock>

## 懒加载

<DemoBlock title="懒加载（展开时异步回填子节点）">
  <div style="width: 100%">
    <oas-tree id="tree-lazy" lazy data='[{"key":"dir-a","label":"目录 A"},{"key":"dir-b","label":"目录 B","isLeaf":true},{"key":"file-1","label":"文件 1","isLeaf":true}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-status">点击「目录 A」前的展开箭头触发加载</span>
    </p>
  </div>
</DemoBlock>

设置 `lazy` 后，无 `children` 且未标记 `isLeaf` / `loaded` 的节点视为「未加载」：点击展开箭头派发 `oas-load`（`detail: { key }`）并调用 `load` 属性回调，由宿主回填子节点后重设 `data` 属性；加载期间展开箭头位置显示 loading 占位，回填完成后自动展开并收起占位。标记 `isLeaf: true` 的节点不显示展开箭头。

## 节点拖拽

<DemoBlock title="可拖拽（拖动换序 / 换父）">
  <div style="width: 100%">
    <oas-tree id="tree-dnd" draggable expanded="grp-1" data='[{"key":"grp-1","label":"分组 1","children":[{"key":"item-1","label":"条目 1"},{"key":"item-2","label":"条目 2"}]},{"key":"grp-2","label":"分组 2","children":[{"key":"item-3","label":"条目 3"}]}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-dnd-status">拖拽节点到目标行上 / 下 / 中部，分别插入其前 / 后 / 子</span>
    </p>
  </div>
</DemoBlock>

设置 `draggable` 后可拖拽节点换序或换父：拖到目标行上半区插入其前（before）、下半区插入其后（after）、中部且目标可展开时移入其下（inner），拖拽过程有插入线与高亮反馈；松手派发 `oas-node-drop`（`detail: { dragKey, dropKey, position }`），由宿主更新数据后重设 `data` 属性。拖到树空白处视为移入根（`dropKey` 为空字符串、`position: 'inner'`）。

## 大数据量（虚拟滚动）

<DemoBlock title="万级节点虚拟滚动">
  <div style="width: 100%">
    <oas-tree id="tree-virtual" height="360" row-height="32" expanded="n0"></oas-tree>
  </div>
</DemoBlock>

设置 `height` 开启虚拟化（搭配 `row-height` 定高）：树复用 `oas-virtual-list` 只渲染可见窗口内的节点，展开状态保存在 `expanded` 属性中，滚动与重渲染均不丢失。

## 自定义节点渲染

<DemoBlock title="自定义节点（图标 + 富文本）">
  <div style="width: 100%">
    <oas-tree id="tree-custom" expanded="proj-a" data='[{"key":"proj-a","label":"项目 A","children":[{"key":"task-1","label":"任务 1"},{"key":"task-2","label":"任务 2"},{"key":"task-3","label":"任务 3"}]},{"key":"proj-b","label":"项目 B","children":[{"key":"task-4","label":"任务 4"}]},{"key":"notes","label":"笔记"}]'>
      <template slot="toggle">
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M6 4 L10 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </template>
      <template slot="node">
        <style>
          .node-demo-glyph { width: 14px; height: 14px; color: var(--oas-color-primary); margin-right: var(--oas-space-1); vertical-align: -2px; }
          .node-demo-count { margin-left: var(--oas-space-2); font-size: var(--oas-font-size-xs); color: var(--oas-color-text-primary); background: var(--oas-color-bg-hover); border-radius: 999px; padding: 0 6px; }
          [data-node-label] { font-weight: 500; }
        </style>
        <svg class="node-demo-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <rect x="3" y="2.5" width="10" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/>
          <path d="M6 7.5 H10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span data-node-label></span>
        <span class="node-demo-count"></span>
      </template>
    </oas-tree>
  </div>
</DemoBlock>

节点内容可用 `template[slot="node"]` 提供静态骨架（`[data-node-label]` 节点自动绑定节点 label），`template[slot="toggle"]` 可替换默认展开箭头；每个节点行渲染后派发 `oas-node-render`（`detail: { node, element }`），宿主可监听改写 `element` 为任意图标 / 富文本。示例中任务数徽标即由该事件写入；键盘与 ARIA（`treeitem` / `aria-expanded` / `aria-level`）在自定义渲染下保持不变。

## 目录模式（文件浏览器）

<DemoBlock title="目录模式（文件浏览器样式）">
  <div style="width: 100%">
    <oas-tree id="tree-dir" directory expanded="src,assets" data='[{"key":"src","label":"src","children":[{"key":"components","label":"components","children":[{"key":"button.tsx","label":"button.tsx","isLeaf":true},{"key":"tree.tsx","label":"tree.tsx","isLeaf":true}]},{"key":"index.ts","label":"index.ts","isLeaf":true}]},{"key":"assets","label":"assets","children":[{"key":"logo.svg","label":"logo.svg","isLeaf":true}]},{"key":"package.json","label":"package.json","isLeaf":true},{"key":"README.md","label":"README.md","isLeaf":true}]'></oas-tree>
  </div>
</DemoBlock>

设置 `directory` 后按文件浏览器风格渲染：有 `children`（或懒加载下未加载）的节点显示文件夹图标，`isLeaf` / 无 `children` 的节点显示文件图标；文件夹按展开 / 收起切换图标，层级缩进与 hover 高亮行沿用行样式。

## 事件

<DemoBlock title="选中与勾选事件">
  <div style="width: 100%">
    <oas-tree id="tree-event" checkable expanded="a" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      选中：<span id="tree-select">—</span> · 勾选：<span id="tree-check">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tree = document.querySelector('#tree-event')
  tree?.addEventListener('oas-select', (e) => {
    document.querySelector('#tree-select').textContent = e.detail.key
  })
  tree?.addEventListener('oas-check', (e) => {
    const span = document.querySelector('#tree-check')
    span.textContent = span.textContent === '—' ? e.detail.key : `${span.textContent}、${e.detail.key}`
  })

  // 大数据量虚拟滚动 demo：5000 根节点，每 100 个带 20 个子节点
  const virtual = document.querySelector('#tree-virtual')
  if (virtual) {
    const nodes = Array.from({ length: 5000 }, (_, i) => ({
      key: `n${i}`,
      label: `节点 ${i}`,
      ...(i % 100 === 0
        ? {
            children: Array.from({ length: 20 }, (_, j) => ({
              key: `n${i}-${j}`,
              label: `子节点 ${i}-${j}`,
            })),
          }
        : {}),
    }))
    virtual.setAttribute('data', JSON.stringify(nodes))
  }

  // 自定义节点 demo：oas-node-render 写入子任务数徽标（element 为节点 label 容器）
  const custom = document.querySelector('#tree-custom')
  if (custom) {
    custom.addEventListener('oas-node-render', (e) => {
      const { node, element } = e.detail
      const badge = element.querySelector('.node-demo-count')
      const count = node.children?.length ?? 0
      if (badge) badge.textContent = count > 0 ? `${count} 项` : ''
    })
    // 监听挂载后强制重刷一次，保证初始渲染即带上徽标（upgrade 可能早于 onMounted）
    custom.setAttribute('data', custom.getAttribute('data'))
  }

  // 懒加载 demo：监听 oas-load，模拟异步回填子节点后重设 data
  const lazy = document.querySelector('#tree-lazy')
  if (lazy) {
    lazy.addEventListener('oas-load', (e) => {
      const { key } = e.detail
      const status = document.querySelector('#tree-lazy-status')
      status.textContent = `正在加载 ${key}…`
      setTimeout(() => {
        const nodes = JSON.parse(lazy.getAttribute('data'))
        const fill = (list) => {
          for (const n of list) {
            if (n.key === key) {
              n.children = [
                { key: `${key}-1`, label: `${key} 的子节点 1`, isLeaf: true },
                { key: `${key}-2`, label: `${key} 的子节点 2`, isLeaf: true },
              ]
              return true
            }
            if (n.children && fill(n.children)) return true
          }
          return false
        }
        fill(nodes)
        lazy.setAttribute('data', JSON.stringify(nodes))
        status.textContent = `${key} 加载完成，已回填 2 个子节点`
      }, 500)
    })
  }

  // 可拖拽 demo：按 oas-node-drop 结果重排数据后重设 data
  const dnd = document.querySelector('#tree-dnd')
  if (dnd) {
    dnd.addEventListener('oas-node-drop', (e) => {
      const { dragKey, dropKey, position } = e.detail
      const nodes = JSON.parse(dnd.getAttribute('data'))
      const locate = (list, key) => {
        for (let i = 0; i < list.length; i++) {
          if (list[i].key === key) return { list, index: i, node: list[i] }
          if (list[i].children) {
            const found = locate(list[i].children, key)
            if (found) return found
          }
        }
        return null
      }
      const drag = locate(nodes, dragKey)
      if (drag) {
        drag.list.splice(drag.index, 1)
        if (dropKey === '' && position === 'inner') {
          nodes.push(drag.node)
        } else {
          const target = locate(nodes, dropKey)
          if (target) {
            if (position === 'inner') {
              target.node.children = target.node.children || []
              target.node.children.push(drag.node)
            } else {
              const idx =
                target.list.indexOf(target.node) + (position === 'after' ? 1 : 0)
              target.list.splice(idx, 0, drag.node)
            }
          }
        }
        dnd.setAttribute('data', JSON.stringify(nodes))
      }
      document.querySelector('#tree-dnd-status').textContent =
        `拖动：${dragKey} → ${dropKey || '根'}（${position}）`
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `checkable` | 是否显示复选框 | `boolean` | — |
| `checked` | 勾选节点 key 集合（逗号分隔） | `string` | — |
| `data` | 节点数据 `[{ key, label, children?, disabled?, isLeaf?, loaded? }]`，JSON 字符串 | `TreeNode[] \| string` | `[]` |
| `directory` | 目录模式：有 `children`（或懒加载下未加载）的节点显示文件夹图标，`isLeaf` / 无 `children` 的节点显示文件图标，文件夹按展开 / 收起切换图标 | `boolean` | — |
| `draggable` | 节点可拖拽换序 / 换父，落点显示插入线 / 高亮，松手派发 `oas-node-drop` | `boolean` | — |
| `expanded` | 展开节点 key 集合（逗号分隔） | `string` | — |
| `height` | 虚拟滚动视口高度（px）；设置后开启大数据量虚拟化渲染 | `string` | `360` |
| `lazy` | 懒加载：无 `children` 且未标记 `isLeaf` / `loaded` 的节点，展开时触发加载 | `boolean` | — |
| `load` | 懒加载回调 `(payload: { key }) => void`，与 `oas-load` 事件并存；宿主回填子节点后重设 `data` 属性 | `(payload: { key: string }) => void` | — |
| `row-height` | 虚拟化时每行固定高度（px） | `string` | `32` |
| `selected` | 选中节点 key | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-check` | 勾选变化，`detail: { key, checked }` |
| `oas-load` | 懒加载触发，`detail: { key }`；宿主回填 `children` 后重设 `data` 属性 |
| `oas-node-drop` | 节点拖放，`detail: { dragKey, dropKey, position }`，`position` 为 `before` / `after` / `inner`；`dropKey` 为空字符串表示移入根 |
| `oas-node-render` | 每个渲染的节点行派发，`detail: { node, element }`（element 为节点 label 容器，宿主可改写为图标 / 富文本） |
| `oas-select` | 选中节点，`detail: { key, selected }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="node"]` | 节点行静态模板，克隆到每个节点 label 容器；`[data-node-label]` 节点自动绑定节点 label |
| `template[slot="toggle"]` | 展开按钮静态模板，克隆到每个可展开节点的展开按钮内（替换默认 › 图标） |

> 节点字段说明：`isLeaf: true` 表示显式叶子（懒加载下不显示展开箭头）；`loaded: true` 表示已加载完成（配合 `children` 使用，避免重复触发加载）。
