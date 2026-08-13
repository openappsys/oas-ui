# Tree

Displays hierarchical data with support for selection, expansion, multi-select, lazy loading, and node drag-and-drop.

## Basic Usage

<DemoBlock title="Hierarchical tree">
  <div style="width: 100%">
    <oas-tree data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Child 2"}]},{"key":"b","label":"Node B","children":[{"key":"b-1","label":"Child 1"}]},{"key":"c","label":"Node C"}]'></oas-tree>
  </div>
</DemoBlock>

Click the expand arrow to show / hide child nodes; click a node label to select it.

## Controlled Expansion and Selection

<DemoBlock title="Initial expansion and selection">
  <div style="width: 100%">
    <oas-tree expanded="a" selected="a-1" data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Child 2"}]},{"key":"b","label":"Node B"}]'></oas-tree>
  </div>
</DemoBlock>

`expanded` controls the expanded nodes, `selected` controls the selected node.

## Multi-Select

<DemoBlock title="Checkable tree">
  <div style="width: 100%">
    <oas-tree checkable expanded="a" checked="a-1,b" data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Child 2"}]},{"key":"b","label":"Node B"}]'></oas-tree>
  </div>
</DemoBlock>

## Disabled Nodes

<DemoBlock title="Disabled nodes">
  <div style="width: 100%">
    <oas-tree expanded="a" data='[{"key":"a","label":"Interactive node","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Read-only node","disabled":true}]},{"key":"b","label":"Read-only node","disabled":true}]'></oas-tree>
  </div>
</DemoBlock>

## Lazy Loading

<DemoBlock title="Lazy loading (async child fill-in on expand)">
  <div style="width: 100%">
    <oas-tree id="tree-lazy" lazy data='[{"key":"dir-a","label":"Folder A"},{"key":"dir-b","label":"Folder B","isLeaf":true},{"key":"file-1","label":"File 1","isLeaf":true}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-status">Click the expand arrow before "Folder A" to trigger loading</span>
    </p>
  </div>
</DemoBlock>

With `lazy`, nodes without `children` and not marked `isLeaf` / `loaded` are considered "not loaded": clicking the expand arrow emits `oas-load` (`detail: { key }`) and calls the `load` callback, and the host refills the child nodes and resets the `data` attribute. During loading, a loading placeholder is shown in place of the expand arrow; after the fill-in completes, the node auto-expands and the placeholder is removed. Nodes marked `isLeaf: true` do not show an expand arrow.

## Node Drag and Drop

<DemoBlock title="Draggable (reorder / reparent)">
  <div style="width: 100%">
    <oas-tree id="tree-dnd" draggable expanded="grp-1" data='[{"key":"grp-1","label":"Group 1","children":[{"key":"item-1","label":"Item 1"},{"key":"item-2","label":"Item 2"}]},{"key":"grp-2","label":"Group 2","children":[{"key":"item-3","label":"Item 3"}]}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-dnd-status">Drag a node to the upper / lower / middle of a target row to insert before / after / inside it</span>
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

## Custom Node Rendering

<DemoBlock title="Custom nodes (icon + rich text)">
  <div style="width: 100%">
    <oas-tree id="tree-custom" expanded="proj-a" data='[{"key":"proj-a","label":"Project A","children":[{"key":"task-1","label":"Task 1"},{"key":"task-2","label":"Task 2"},{"key":"task-3","label":"Task 3"}]},{"key":"proj-b","label":"Project B","children":[{"key":"task-4","label":"Task 4"}]},{"key":"notes","label":"Notes"}]'>
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
        <svg class="node-demo-glyph" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <rect x="3" y="2.5" width="10" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/>
          <path d="M6 7.5 H10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span data-node-label style="min-width: 60px; display: inline-block"></span>
        <span class="node-demo-count" style="font-size: var(--oas-font-size-xs); padding: 0 6px; border-radius: 999px; background: var(--oas-color-bg-hover); color: var(--oas-color-text-primary); display: inline-block; margin-left: var(--oas-space-2)"></span>
      </template>
    </oas-tree>
  </div>
</DemoBlock>

Node content can be provided as a static skeleton via `template[slot="node"]` (the `[data-node-label]` node is bound to the node label automatically), and `template[slot="toggle"]` replaces the default expand arrow. After each node row renders, `oas-node-render` is emitted (`detail: { node, element }`); the host can listen and rewrite `element` into any icon / rich text. In this example the task-count badge is written by that event. Keyboard access and ARIA (`treeitem` / `aria-expanded` / `aria-level`) stay intact under custom rendering.

## Directory Mode (File Browser)

<DemoBlock title="Directory mode (file browser style)">
  <div style="width: 100%">
    <oas-tree id="tree-dir" directory expanded="src,assets" data='[{"key":"src","label":"src","children":[{"key":"components","label":"components","children":[{"key":"button.tsx","label":"button.tsx","isLeaf":true},{"key":"tree.tsx","label":"tree.tsx","isLeaf":true}]},{"key":"index.ts","label":"index.ts","isLeaf":true}]},{"key":"assets","label":"assets","children":[{"key":"logo.svg","label":"logo.svg","isLeaf":true}]},{"key":"package.json","label":"package.json","isLeaf":true},{"key":"README.md","label":"README.md","isLeaf":true}]'></oas-tree>
  </div>
</DemoBlock>

With `directory`, the tree renders in a file-browser style: nodes with `children` (or not yet loaded under lazy) show a folder icon, nodes with `isLeaf` / no `children` show a file icon; the folder icon switches between collapsed / expanded, and the depth-based indent and hover row highlight follow the row styles.

## Events

<DemoBlock title="Selection and check events">
  <div style="width: 100%">
    <oas-tree id="tree-event" checkable expanded="a" data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"}]},{"key":"b","label":"Node B"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Selected: <span id="tree-select">—</span> · Checked: <span id="tree-check">—</span>
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
    span.textContent = span.textContent === '—' ? e.detail.key : `${span.textContent}, ${e.detail.key}`
  })

  // Virtual scroll demo: 5000 root nodes, every 100th has 20 children
  const virtual = document.querySelector('#tree-virtual')
  if (virtual) {
    const nodes = Array.from({ length: 5000 }, (_, i) => ({
      key: `n${i}`,
      label: `Node ${i}`,
      ...(i % 100 === 0
        ? {
            children: Array.from({ length: 20 }, (_, j) => ({
              key: `n${i}-${j}`,
              label: `Child ${i}-${j}`,
            })),
          }
        : {}),
    }))
    virtual.setAttribute('data', JSON.stringify(nodes))
  }

  // Custom node demo: oas-node-render writes the task-count badge (element is the node label container)
  const custom = document.querySelector('#tree-custom')
  if (custom) {
    custom.addEventListener('oas-node-render', (e) => {
      const { node, element } = e.detail
      const badge = element.querySelector('.node-demo-count')
      const count = node.children?.length ?? 0
      if (badge) badge.textContent = count > 0 ? `${count} items` : ''
    })
    // Force one refresh after attaching the listener so the initial render carries badges
    custom.setAttribute('data', custom.getAttribute('data'))
  }

  // Lazy loading demo: listen to oas-load, simulate async child backfill, then reset data
  const lazy = document.querySelector('#tree-lazy')
  if (lazy) {
    lazy.addEventListener('oas-load', (e) => {
      const { key } = e.detail
      const status = document.querySelector('#tree-lazy-status')
      status.textContent = `Loading ${key}…`
      setTimeout(() => {
        const nodes = JSON.parse(lazy.getAttribute('data'))
        const fill = (list) => {
          for (const n of list) {
            if (n.key === key) {
              n.children = [
                { key: `${key}-1`, label: `Child 1 of ${key}`, isLeaf: true },
                { key: `${key}-2`, label: `Child 2 of ${key}`, isLeaf: true },
              ]
              return true
            }
            if (n.children && fill(n.children)) return true
          }
          return false
        }
        fill(nodes)
        lazy.setAttribute('data', JSON.stringify(nodes))
        status.textContent = `${key} loaded, 2 children backfilled`
      }, 500)
    })
  }

  // Drag demo: reorder data by the oas-node-drop result, then reset data
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
        `Dropped: ${dragKey} → ${dropKey || 'root'} (${position})`
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `checkable` | Whether to show checkboxes | `boolean` | — |
| `checked` | Set of checked node keys (comma-separated) | `string` | — |
| `data` | Node data `[{ key, label, children?, disabled?, isLeaf?, loaded? }]`, JSON string | `TreeNode[] \| string` | `[]` |
| `directory` | Directory mode: nodes with `children` (or not yet loaded under lazy) show a folder icon, nodes with `isLeaf` / no `children` show a file icon; the folder icon switches on expand / collapse | `boolean` | — |
| `draggable` | Nodes can be dragged to reorder / reparent; drop shows insertion line / highlight; release emits `oas-node-drop` | `boolean` | — |
| `expanded` | Set of expanded node keys (comma-separated) | `string` | — |
| `height` | Virtual scroll viewport height (px); setting it enables virtualized rendering for large data | `string` | `360` |
| `lazy` | Lazy loading: nodes without `children` and not marked `isLeaf` / `loaded` trigger loading on expand | `boolean` | — |
| `load` | Lazy loading callback `(payload: { key }) => void`, coexists with the `oas-load` event; the host refills child nodes and resets the `data` attribute | `(payload: { key: string }) => void` | — |
| `row-height` | Fixed row height when virtualized (px) | `string` | `32` |
| `selected` | Key of the selected node | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-check` | Check state change, `detail: { key, checked }` |
| `oas-load` | Lazy loading triggered, `detail: { key }`; the host refills `children` and resets the `data` attribute |
| `oas-node-drop` | Node dropped, `detail: { dragKey, dropKey, position }`; `position` is `before` / `after` / `inner`; an empty-string `dropKey` means moved to the root |
| `oas-node-render` | Dispatched for each rendered node row, `detail: { node, element }` (element is the node label container; the host can rewrite it into icon / rich text) |
| `oas-select` | Node selected, `detail: { key, selected }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="node"]` | Static row template cloned into each node label container; the `[data-node-label]` node is bound to the node label automatically |
| `template[slot="toggle"]` | Static expand button template cloned into each expandable node's toggle button (replaces the default › icon) |

> Node field notes: `isLeaf: true` marks an explicit leaf (no expand arrow under lazy loading); `loaded: true` marks a node as fully loaded (used with `children` to avoid triggering loading repeatedly).
