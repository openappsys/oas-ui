# Tree

Displays hierarchical data with support for expand / collapse, selection, cascading checks, multi-select by click, search filtering, lazy loading, keyboard operation, and node drag-and-drop.

> **⚠️ Breaking change (v2.5): `expanded` / `checked` changed from comma-separated strings to JSON string arrays.**
> The old form `expanded="a,b"` / `checked="a-1,b"` no longer works — migrate to `expanded='["a","b"]'` / `checked='["a-1","b"]'`.
> Why: keys containing commas broke comma-string parsing; JSON arrays unify the shape with `oas-tree-select`'s `expanded` / `value`. If your keys may contain commas, rebuild the attribute using the array form when upgrading.

## Basic Usage

<DemoBlock title="Hierarchical tree">
  <div style="width: 100%">
    <oas-tree data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Child 2"}]},{"key":"b","label":"Node B","children":[{"key":"b-1","label":"Child 1"}]},{"key":"c","label":"Node C"}]'></oas-tree>
  </div>
</DemoBlock>

Click the expand arrow to show / hide child nodes; click a node label to select it. The tree is fully keyboard operable (↑/↓ move focus, → expand, ← collapse, Home/End, Space toggles a checkbox, Enter activates).

## Controlled Expansion and Selection

<DemoBlock title="Initial expansion and selection">
  <div style="width: 100%">
    <oas-tree expanded='["a"]' selected="a-1" data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Child 2"}]},{"key":"b","label":"Node B"}]'></oas-tree>
  </div>
</DemoBlock>

`expanded` is a JSON string array (e.g. `'["a","b"]'`), `selected` is the selected node key. It composes with `default-expand-all` (expand everything on first render; an explicit `expanded` wins), `auto-expand-parent` (automatically fill in ancestors when a deep key is injected externally), and `expand-trigger="node"` (clicking a node also expands / collapses it).

## Checkboxes (Cascading)

<DemoBlock title="Cascading checks (parent selects all, half state shown)">
  <div style="width: 100%">
    <oas-tree id="tree-check" checkable check-strategy="all" expanded='["grp"]' data='[{"key":"grp","label":"R&D team","children":[{"key":"fe","label":"Frontend","children":[{"key":"a-1","label":"Member A"},{"key":"a-2","label":"Member B"}]},{"key":"be","label":"Backend","children":[{"key":"b-1","label":"Member C"},{"key":"b-2","label":"Member D"}]}]},{"key":"ops","label":"Ops"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Checked set (<code>checked</code> attribute, JSON array): <span id="tree-check-value" style="font-family: ui-monospace, monospace">—</span>
    </p>
  </div>
</DemoBlock>

With `checkable` the model is **cascading** (same semantics as `oas-tree-select`): checking a parent checks all its checkable children; when every child of a parent becomes checked the parent converges to checked; partial children show the parent checkbox in half state (`indeterminate`).

- `check-strategy`: `all` (default, parents + children all in the value) / `parent` (collapse fully-checked children into their parent) / `child` (leaves only);
- `check-strictly`: decouple parent/child — no cascading, no half state;
- Data can mark `disableCheckbox: true` to disable a single node's checkbox (skipped by the cascade); use the component-level `disabled` attribute to disable all interaction.

<DemoBlock title="Non-cascading checks (check-strictly) & default expand">
  <div style="width: 100%">
    <oas-tree checkable check-strictly default-expand-all auto-expand-parent data='[{"key":"x","label":"Parent X (no cascading)","children":[{"key":"x-1","label":"Child 1"},{"key":"x-2","label":"Child 2"}]},{"key":"y","label":"Parent Y"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <code>check-strictly</code> disables cascading; <code>default-expand-all</code> expands everything initially; <code>auto-expand-parent</code> auto-expands ancestors on selection.
    </p>
  </div>
</DemoBlock>

<DemoBlock title="Empty state (empty text & empty slot)">
  <div style="width: 100%">
    <oas-tree empty="The tree is empty"></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      The <code>empty</code> attribute customizes the empty text; rich content can go in <code>template[slot="empty"]</code>.
    </p>
  </div>
</DemoBlock>

## Multi-Select by Click

<DemoBlock title="Multi-select (multiple, click again to deselect)">
  <div style="width: 100%">
    <oas-tree multiple selected='["a-1","c"]' data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"},{"key":"a-2","label":"Child 2"}]},{"key":"b","label":"Node B","disabled":true},{"key":"c","label":"Node C"}]'></oas-tree>
  </div>
</DemoBlock>

With `multiple`, `selected` becomes a JSON string array and clicking a label appends / removes its key (click again to deselect). Checkboxes (`checkable`) and click-selection (`multiple` / `selected`) are two independent models and can be combined.

## Expansion Behaviour

<DemoBlock title="Accordion + tree lines + expand on node click">
  <div style="width: 100%">
    <oas-tree accordion expand-trigger="node" tree-lines data='[{"key":"g1","label":"Category 1","children":[{"key":"g1-1","label":"Item 1"}]},{"key":"g2","label":"Category 2","children":[{"key":"g2-1","label":"Item 2"}]},{"key":"g3","label":"Category 3","children":[{"key":"g3-1","label":"Item 3"}]}]'></oas-tree>
  </div>
</DemoBlock>

- `accordion`: expanding a node collapses its siblings at the same level (mutually exclusive);
- `tree-lines`: renders ancestor indent guides (attribute name matches `oas-tree-select`);
- `expand-trigger="node"`: clicking the node text also expands / collapses (default `"toggle"` only reacts to the arrow);
- `auto-expand-parent`: when the host sets `expanded` to a deep key (`setAttribute('expanded', '["deep-key"]')`), the component automatically fills in the ancestors.

## Search Filtering

<DemoBlock title="In-tree filtering (keeps matched branches; optional highlight)">
  <div style="width: 100%">
    <oas-input id="tree-filter-input" placeholder="Type to filter (e.g. React)" style="width: 100%; margin-bottom: var(--oas-space-2)"></oas-input>
    <oas-tree id="tree-filter" filter-highlight data='[{"key":"fe","label":"Frontend","children":[{"key":"fe-react","label":"React team","children":[{"key":"r1","label":"Member R"}]},{"key":"fe-vue","label":"Vue team"}]},{"key":"be","label":"Backend","children":[{"key":"be-node","label":"Node team"}]}]'></oas-tree>
  </div>
</DemoBlock>

`filter` is the search term (attribute-driven; the host places the search box itself, here wired to an `oas-input`). Matches keep all their ancestors (path context) and the whole matched subtree, independent of the expanded state; no match shows the empty state. `filter-highlight` wraps matched slices of the default label text in `<mark>`. Use the `filterNode(label, node)` property for custom matching (default: case-insensitive label containment).

## Field Mapping

<DemoBlock title="Field aliases (field-names)">
  <div style="width: 100%">
    <oas-tree field-names='{"key":"id","label":"name","children":"subs","disabled":"off"}' expanded='["dept"]' data='[{"id":"dept","name":"Department","subs":[{"id":"alice","name":"Alice"},{"id":"bob","name":"Bob","off":true}]}]'></oas-tree>
  </div>
</DemoBlock>

Use `field-names` (a JSON object mapping the keys `key`/`label`/`children`/`disabled`/`isLeaf`/`loaded` to your data field names) when your data shape differs — normalization happens once at the data entry and shares the same field machinery as `oas-tree-select`.

## Disabled States

<DemoBlock title="Node-level disabled / selectable / disableCheckbox">
  <div style="width: 100%">
    <oas-tree expanded='["p"]' data='[{"key":"p","label":"Permission","children":[{"key":"read","label":"Read only","disabled":true},{"key":"write","label":"Write","disableCheckbox":true},{"key":"no-sel","label":"Not selectable","selectable":false}]}]'></oas-tree>
  </div>
</DemoBlock>

- Node `disabled: true`: the whole row is inert (no click / expand / check);
- Node `selectable: false`: excluded from click and keyboard selection, while checkboxes and expansion still work;
- Node `disableCheckbox: true`: the checkbox is disabled and skipped by the cascade;
- Component-level `disabled`: disables all interaction on the whole tree (read-only tree).

## Imperative Methods and Scrolling

<DemoBlock title="Expand all / collapse all / locate a node">
  <div style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-2); margin-bottom: var(--oas-space-2)">
      <oas-button id="tree-cmd-expand-all" size="small">Expand all</oas-button>
      <oas-button id="tree-cmd-collapse-all" size="small">Collapse all</oas-button>
      <oas-button id="tree-cmd-scroll" size="small">Scroll to "Child 58"</oas-button>
    </div>
    <oas-tree id="tree-cmd" height="200" row-height="32" data='[]'></oas-tree>
  </div>
</DemoBlock>

Imperative methods (data stays host-controlled; the methods only recompute the expansion set / scroll position):

- `expandAll()` / `collapseAll()`: expand / collapse every node;
- `expand(keys: string[])` / `collapse(keys: string[])`: expand / collapse the given keys;
- `scrollTo(key, { expand?: boolean })`: scroll the node into view (expands the ancestor chain by default; pass `expand: false` to leave the expanded state untouched).

## Lazy Loading

<DemoBlock title="Lazy loading (async child fill-in on expand)">
  <div style="width: 100%">
    <oas-tree id="tree-lazy" lazy data='[{"key":"dir-a","label":"Folder A"},{"key":"dir-b","label":"Folder B","isLeaf":true},{"key":"file-1","label":"File 1","isLeaf":true}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-status">Click the expand arrow before "Folder A" to trigger loading</span>
    </p>
  </div>
</DemoBlock>

<DemoBlock title="Lazy load failure retry (oas-load-error)">
  <div style="width: 100%">
    <oas-tree id="tree-lazy-fail" lazy data='[{"key":"ok","label":"Succeeds"},{"key":"fail","label":"Fails first (click twice for retry)"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-fail-status">Click "Fails first"'s expand arrow to see the error event and retry</span>
    </p>
  </div>
</DemoBlock>

With `lazy`, nodes without `children` and not marked `isLeaf` / `loaded` are considered "not loaded": clicking the expand arrow emits `oas-load` (`detail: { key }`) and calls the `load` callback; the host refills the child nodes and resets the `data` attribute. During loading, a loading placeholder is shown in place of the expand arrow (replaceable via `template[slot="toggle-loading"]`); after the fill-in completes, the node auto-expands and the placeholder is removed. When the `load` callback returns a Promise that rejects, the component clears the loading state, rolls the expansion back, and emits `oas-load-error` (`detail: { key, error }`) — the node is clickable again to retry. Nodes marked `isLeaf: true` do not show an expand arrow.

## Node Drag and Drop

<DemoBlock title="Draggable (reorder / reparent)">
  <div style="width: 100%">
    <oas-tree id="tree-dnd" draggable expanded='["grp-1"]' data='[{"key":"grp-1","label":"Group 1","children":[{"key":"item-1","label":"Item 1"},{"key":"item-2","label":"Item 2"}]},{"key":"grp-2","label":"Group 2","children":[{"key":"item-3","label":"Item 3"}]}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-dnd-status">Drag a node to the upper / lower / middle of a target row to insert before / after / inside it</span>
    </p>
  </div>
</DemoBlock>

With `draggable`, nodes can be dragged to reorder or reparent: dropping on the upper half of a target row inserts before it (`before`), the lower half inserts after it (`after`), and the middle (when the target is expandable) moves it inside (`inner`). An insertion line and highlight feedback are shown during the drag; on release, `oas-node-drop` is emitted (`detail: { dragKey, dropKey, position }`) and the host updates the data and resets the `data` attribute. Dropping on empty tree space moves the node to the root (`dropKey` empty string, `position: 'inner'`).

Guard the drop targets with the property callbacks (rejected during the drag — no insertion line feedback):

```js
tree.allowDrop = ({ dragKey, dropKey, position }) => dropKey !== 'grp-1' // disallow dropping into this node
tree.allowDrag = (node) => node.key !== 'item-1' // this node cannot be dragged
```

## Large Data Sets (Virtual Scroll)

<DemoBlock title="Virtual scroll with 10k nodes">
  <div style="width: 100%">
    <oas-tree id="tree-virtual" height="360" row-height="32" expanded='["n0"]'></oas-tree>
  </div>
</DemoBlock>

Setting `height` enables virtualization (with a fixed `row-height`): the tree reuses `oas-virtual-list` to render only the nodes in the visible window. The expanded state is kept in the `expanded` attribute and survives scrolling and re-renders; keyboard navigation and `scrollTo()` keep the window in sync.

## Custom Node Rendering

<DemoBlock title="Custom nodes (icon + rich text)">
  <div style="width: 100%">
    <oas-tree id="tree-custom" expanded='["proj-a"]' data='[{"key":"proj-a","label":"Project A","children":[{"key":"task-1","label":"Task 1"},{"key":"task-2","label":"Task 2"},{"key":"task-3","label":"Task 3"}]},{"key":"proj-b","label":"Project B","children":[{"key":"task-4","label":"Task 4"}]},{"key":"notes","label":"Notes"}]'>
      <template slot="toggle">
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M6 4 L10 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </template>
      <template slot="node">
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

<style>
  /* demo node custom-render styles: slot content lives in light DOM with unique class names,
     placed at file top level so Vue does not drop style tags inside DemoBlock templates */
  .node-demo-glyph { width: 14px; height: 14px; color: var(--oas-color-primary); margin-right: var(--oas-space-1); vertical-align: -2px; }
  .node-demo-count { margin-left: var(--oas-space-2); font-size: var(--oas-font-size-xs); color: var(--oas-color-text-primary); background: var(--oas-color-bg-hover); border-radius: 999px; padding: 0 6px; }
  .node-demo-glyph + [data-node-label] { font-weight: 500; }
</style>

## Directory Mode (File Browser)

<DemoBlock title="Directory mode (file browser style)">
  <div style="width: 100%">
    <oas-tree id="tree-dir" directory tree-lines expanded='["src","assets"]' data='[{"key":"src","label":"src","children":[{"key":"components","label":"components","children":[{"key":"button.tsx","label":"button.tsx","isLeaf":true},{"key":"tree.tsx","label":"tree.tsx","isLeaf":true}]},{"key":"index.ts","label":"index.ts","isLeaf":true}]},{"key":"assets","label":"assets","children":[{"key":"logo.svg","label":"logo.svg","isLeaf":true}]},{"key":"package.json","label":"package.json","isLeaf":true},{"key":"README.md","label":"README.md","isLeaf":true}]'></oas-tree>
  </div>
</DemoBlock>

With `directory`, the tree renders in a file-browser style: nodes with `children` (or not yet loaded under lazy) show a folder icon, nodes with `isLeaf` / no `children` show a file icon; the folder icon switches between collapsed / expanded, and the depth-based indent and hover row highlight follow the row styles. Combine with `tree-lines` to show ancestor guide lines.

## Events

<DemoBlock title="Selection and check events">
  <div style="width: 100%">
    <oas-tree id="tree-event" checkable expanded='["a"]' data='[{"key":"a","label":"Node A","children":[{"key":"a-1","label":"Child 1"}]},{"key":"b","label":"Node B"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Selected: <span id="tree-select">—</span> · Checked: <span id="tree-check">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined guards against pre-upgrade expando shadowing the load property
  customElements.whenDefined('oas-tree').then(() => {
    const failTree = document.querySelector('#tree-lazy-fail')
    if (!failTree) return
    let retried = false
    failTree.load = ({ key }) => {
      if (key === 'fail' && !retried) {
        retried = true
        return Promise.reject(new Error('Network timeout'))
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          const nodes = JSON.parse(failTree.getAttribute('data'))
          for (const n of nodes) {
            if (n.key === key) n.children = [{ key: `${key}-1`, label: `${key} child`, isLeaf: true }]
          }
          failTree.setAttribute('data', JSON.stringify(nodes))
          document.querySelector('#tree-lazy-fail-status').textContent = `${key} loaded`
          resolve()
        }, 300)
      })
    }
    failTree.addEventListener('oas-load-error', (e) => {
      document.querySelector('#tree-lazy-fail-status').textContent =
        `Load failed: ${e.detail.error} (click again to retry)`
    })
  })
  const tree = document.querySelector('#tree-event')
  tree?.addEventListener('oas-select', (e) => {
    document.querySelector('#tree-select').textContent = e.detail.key
  })
  tree?.addEventListener('oas-check', (e) => {
    const span = document.querySelector('#tree-check')
    span.textContent = span.textContent === '—' ? e.detail.key : `${span.textContent}, ${e.detail.key}`
  })

  // Cascading-check demo: reflect the checked attribute after each oas-check
  const checkTree = document.querySelector('#tree-check')
  if (checkTree) {
    checkTree.addEventListener('oas-check', () => {
      document.querySelector('#tree-check-value').textContent = checkTree.getAttribute('checked')
    })
  }

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

  // Filter demo: drive the filter attribute from the search input
  const filterInput = document.querySelector('#tree-filter-input')
  const filterTree = document.querySelector('#tree-filter')
  filterInput?.addEventListener('input', (e) => {
    filterTree?.setAttribute('filter', e.target.value)
  })

  // Imperative demo: 500-node tree + buttons driving expandAll / collapseAll / scrollTo
  const cmd = document.querySelector('#tree-cmd')
  if (cmd) {
    const group = Array.from({ length: 10 }, (_, g) => ({
      key: `group-${g}`,
      label: `Group ${g}`,
      children: Array.from({ length: 50 }, (_, i) => ({
        key: `g${g}-n${i}`,
        label: `Child ${g * 50 + i}`,
        isLeaf: true,
      })),
    }))
    cmd.setAttribute('data', JSON.stringify(group))
    document.querySelector('#tree-cmd-expand-all')?.addEventListener('click', () => cmd.expandAll())
    document.querySelector('#tree-cmd-collapse-all')?.addEventListener('click', () => cmd.collapseAll())
    document.querySelector('#tree-cmd-scroll')?.addEventListener('click', () => {
      cmd.collapseAll()
      cmd.scrollTo('g1-n8') // expands the ancestor chain then scrolls (g1-n8 is "Child 58")
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accordion` | Accordion (only one sibling branch open at a time) | `boolean` | — |
| `auto-expand-parent` | Auto-expand parents when a child is checked | `boolean` | — |
| `check-strategy` | Check export strategy: `all` (default) / `parent` / `child` (with checkable cascading) | `string` | `all` |
| `check-strictly` | Decouple parent/child checking | `boolean` | — |
| `checkable` | Whether to show checkboxes | `boolean` | — |
| `checked` | Set of checked node keys (comma-separated) | `string` | — |
| `data` | Node data `[{ key, label, children?, disabled?, isLeaf?, loaded? }]`, JSON string | `TreeNode[] \| string` | `[]` |
| `default-expand-all` | Expand all nodes by default (applies when the expanded attribute is absent) | `boolean` | — |
| `directory` | Directory mode: nodes with `children` (or not yet loaded under lazy) show a folder icon, nodes with `isLeaf` / no `children` show a file icon; the folder icon switches on expand / collapse | `boolean` | — |
| `disabled` | Whole-tree disabled (select/check/expand/drag all inert, browsing kept) | `boolean` | — |
| `draggable` | Nodes can be dragged to reorder / reparent; drop shows insertion line / highlight; release emits `oas-node-drop` | `boolean` | — |
| `empty` | Empty-state text (when no data; no-match uses the locale no-match text) | `string` | — |
| `expand-trigger` | Node expansion trigger: `toggle` (default, arrow only) / `node` (clicking the node row) | `string` | `toggle` |
| `expanded` | Set of expanded node keys (comma-separated) | `string` | — |
| `field-names` | Field-alias JSON (e.g. `{"label":"name","value":"id","children":"subs"}`; data is not copy-mapped — node-render receives your original objects) | `string` | — |
| `filter` | In-tree search filter (keyword input; pair with filter-highlight and el.filterNode) | `string` | — |
| `filter-highlight` | Highlight matched fragments (mark tag) | `boolean` | — |
| `height` | Virtual scroll viewport height (px); setting it enables virtualized rendering for large data | `string` | — |
| `lazy` | Lazy loading: nodes without `children` and not marked `isLeaf` / `loaded` trigger loading on expand | `boolean` | — |
| `load` | Lazy loading callback `(payload: { key }) => void`, coexists with the `oas-load` event; the host refills child nodes and resets the `data` attribute | `(payload: { key: string }) => void \| Promise<unknown>` | — |
| `multiple` | Click multi-select (Ctrl/⌘-click; selected set is a JSON array) | `boolean` | — |
| `row-height` | Fixed row height when virtualized (px) | `string` | — |
| `selected` | Key of the selected node | `string` | — |
| `tree-lines` | Tree indentation guide lines | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-check` | Check state change, `detail: { key, checked }` |
| `oas-load` | Lazy loading triggered, `detail: { key }`; the host refills `children` and resets the `data` attribute |
| `oas-load-error` | Lazy load failed, `detail: { key, error }` where `error` is the error message string (loading clears, clickable to retry) |
| `oas-node-drop` | Node dropped, `detail: { dragKey, dropKey, position }`; `position` is `before` / `after` / `inner`; an empty-string `dropKey` means moved to the root |
| `oas-node-render` | Dispatched for each rendered node row, `detail: { node, element }` (element is the node label container; the host can rewrite it into icon / rich text) |
| `oas-select` | Node selected, `detail: { key, selected }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="empty"]` | Custom empty-state content |
| `template[slot="node"]` | Static row template cloned into each node label container; the `[data-node-label]` node is bound to the node label automatically |
| `template[slot="toggle"]` | Static expand button template cloned into each expandable node's toggle button (replaces the default › icon) |
| `template[slot="toggle-loading"]` | Lazy-expanding indicator (replaces the spinner) |

> Node field notes: `isLeaf: true` marks an explicit leaf (no expand arrow under lazy loading); `loaded: true` marks a node as fully loaded (used with `children` to avoid triggering loading repeatedly).
