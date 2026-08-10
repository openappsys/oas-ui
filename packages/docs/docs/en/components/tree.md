# Tree

Displays hierarchical data with support for selection, expansion, multi-select, lazy loading, and node drag-and-drop.

## Basic Usage

<DemoBlock title="Hierarchical tree">
  <div style="width: 100%">
    <oas-tree data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B","children":[{"key":"b-1","label":"子节点 1"}]},{"key":"c","label":"节点 C"}]'></oas-tree>
  </div>
</DemoBlock>

Click the expand arrow to show / hide child nodes; click a node label to select it.

## Controlled Expansion and Selection

<DemoBlock title="Initial expansion and selection">
  <div style="width: 100%">
    <oas-tree expanded="a" selected="a-1" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

`expanded` controls the expanded nodes, `selected` controls the selected node.

## Multi-Select

<DemoBlock title="Checkable tree">
  <div style="width: 100%">
    <oas-tree checkable expanded="a" checked="a-1,b" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

## Disabled Nodes

<DemoBlock title="Disabled nodes">
  <div style="width: 100%">
    <oas-tree expanded="a" data='[{"key":"a","label":"可操作节点","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"只读节点","disabled":true}]},{"key":"b","label":"只读节点","disabled":true}]'></oas-tree>
  </div>
</DemoBlock>

## Lazy Loading

<DemoBlock title="Lazy loading (async child fill-in on expand)">
  <div style="width: 100%">
    <oas-tree id="tree-lazy" lazy data='[{"key":"dir-a","label":"目录 A"},{"key":"dir-b","label":"目录 B","isLeaf":true},{"key":"file-1","label":"文件 1","isLeaf":true}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-status">点击「目录 A」前的展开箭头触发加载</span>
    </p>
  </div>
</DemoBlock>

With `lazy`, nodes without `children` and not marked `isLeaf` / `loaded` are considered "not loaded": clicking the expand arrow emits `oas-load` (`detail: { key }`) and calls the `load` callback, and the host refills the child nodes and resets the `data` attribute. During loading, a loading placeholder is shown in place of the expand arrow; after the fill-in completes, the node auto-expands and the placeholder is removed. Nodes marked `isLeaf: true` do not show an expand arrow.

## Node Drag and Drop

<DemoBlock title="Draggable (reorder / reparent)">
  <div style="width: 100%">
    <oas-tree id="tree-dnd" draggable expanded="grp-1" data='[{"key":"grp-1","label":"分组 1","children":[{"key":"item-1","label":"条目 1"},{"key":"item-2","label":"条目 2"}]},{"key":"grp-2","label":"分组 2","children":[{"key":"item-3","label":"条目 3"}]}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-dnd-status">拖拽节点到目标行上 / 下 / 中部，分别插入其前 / 后 / 子</span>
    </p>
  </div>
</DemoBlock>

With `draggable`, nodes can be dragged to reorder or reparent: dropping on the upper half of a target row inserts before it (`before`), the lower half inserts after it (`after`), and the middle (when the target is expandable) moves it inside (`inner`). An insertion line and highlight feedback are shown during the drag; on release, `oas-node-drop` is emitted (`detail: { dragKey, dropKey, position }`), and the host updates the data and resets the `data` attribute. Dropping on empty tree space moves the node to the root (`dropKey` empty string, `position: 'inner'`).

## Large Data Sets (Virtual Scroll)

<DemoBlock title="Virtual scroll with 10k nodes">
  <div style="width: 100%">
    <oas-tree id="tree-virtual" height="360" row-height="32" expanded="n0"></oas-tree>
  </div>
</DemoBlock>

Setting `height` enables virtualization (with a fixed `row-height`): the tree reuses `oas-virtual-list` to render only the nodes in the visible window. The expanded state is kept in the `expanded` attribute and survives scrolling and re-renders.

## Events

<DemoBlock title="Selection and check events">
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

| Attribute   | Description                                                                          | Type    | Default |
| ----------- | ------------------------------------------------------------------------------------ | ------- | ------- |
| `data`      | Node data `[{ key, label, children?, disabled?, isLeaf?, loaded? }]`, JSON string    | string  | `[]`    |
| `selected`  | Key of the selected node                                                             | string  | —       |
| `checked`   | Set of checked node keys (comma-separated)                                           | string  | —       |
| `expanded`  | Set of expanded node keys (comma-separated)                                          | string  | —       |
| `checkable` | Whether to show checkboxes                                                           | boolean | `false` |
| `lazy`      | Lazy loading: nodes without `children` and not marked `isLeaf` / `loaded` trigger loading on expand | boolean | `false` |
| `draggable` | Nodes can be dragged to reorder / reparent; drop shows insertion line / highlight; release emits `oas-node-drop` | boolean | `false` |
| `height`    | Virtual scroll viewport height (px); setting it enables virtualized rendering for large data | number  | —       |
| `row-height`| Fixed row height when virtualized (px)                                               | number  | `32`    |

> Node field notes: `isLeaf: true` marks an explicit leaf (no expand arrow under lazy loading); `loaded: true` marks a node as fully loaded (used with `children` to avoid triggering loading repeatedly).

| Attribute | Description                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| `load`    | Lazy loading callback `(payload: { key }) => void`, coexists with the `oas-load` event; the host refills child nodes and resets the `data` attribute |

| Event            | Description                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `oas-select`     | Node selected, `detail: { key, selected }`                                                      |
| `oas-check`      | Check state change, `detail: { key, checked }`                                                  |
| `oas-load`       | Lazy loading triggered, `detail: { key }`; the host refills `children` and resets the `data` attribute |
| `oas-node-drop`  | Node dropped, `detail: { dragKey, dropKey, position }`; `position` is `before` / `after` / `inner`; an empty-string `dropKey` means moved to the root |
