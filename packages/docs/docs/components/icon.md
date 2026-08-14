# Icon 图标

原创线性图标集，按名渲染内联 SVG，tree-shakable。

## 用法

<DemoBlock title="常用图标">
  <oas-icon name="check"></oas-icon>
  <oas-icon name="close"></oas-icon>
  <oas-icon name="search" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="star" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="user"></oas-icon>
  <oas-icon name="heart" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="gear" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

## 尺寸与颜色

<DemoBlock title="尺寸与颜色">
  <oas-icon name="check" size="16"></oas-icon>
  <oas-icon name="check" size="24"></oas-icon>
  <oas-icon name="check" size="32"></oas-icon>
  <oas-icon name="check" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

## 无障碍名称

设置 `label` 后图标对屏幕阅读器暴露可读名称。

<DemoBlock title="带标签图标">
  <oas-icon name="info" label="提示信息" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="warning" label="警告" color="var(--oas-color-warning)"></oas-icon>
</DemoBlock>

## 旋转动画

`spin` 属性让图标无限旋转（适合 loading 场景）；`rotate` 按角度静态旋转；`flip` 镜像翻转（可与 `rotate` 叠加）。

<DemoBlock title="spin 旋转">
  <oas-icon name="loading" spin size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="gear" spin size="24"></oas-icon>
  <oas-icon name="refresh" spin size="24" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="rotate 角度旋转">
  <oas-icon name="arrow-right" rotate="45" size="24"></oas-icon>
  <oas-icon name="arrow-right" rotate="90" size="24"></oas-icon>
  <oas-icon name="arrow-right" rotate="135" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="arrow-right" rotate="180" size="24" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="flip 翻转">
  <oas-icon name="arrow-right" flip="x" size="24"></oas-icon>
  <oas-icon name="arrow-right" flip="y" size="24"></oas-icon>
  <oas-icon name="arrow-right" flip="both" size="24"></oas-icon>
  <oas-icon name="arrow-right" flip="x" rotate="45" size="24" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## 自定义图标

- `src`：远程/本地 SVG URL，fetch 加载内联渲染（颜色跟随 `color`/`currentColor`）
- slot：直接在标签内放内联 `<svg>`，优先级高于 `name`

<DemoBlock title="src 加载 SVG">
  <oas-icon src="/demo-icon.svg" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon src="/demo-icon.svg" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon src="/demo-icon.svg" size="32" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="slot 内联 SVG（优先于 name）">
  <oas-icon size="24" color="var(--oas-color-primary)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2 L12 22 M2 12 L22 12" />
    </svg>
  </oas-icon>
  <oas-icon size="24" color="var(--oas-color-danger)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 6 L12 18 L22 6" />
    </svg>
  </oas-icon>
</DemoBlock>

## 图标库注册

`registerIcon(name, svg)` 可注册自定义图标，之后直接用 `name` 引用（同名会覆盖内置图标）。

<DemoBlock title="registerIcon 注册自定义图标">
  <oas-icon name="custom-star" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="custom-heart" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="custom-star" spin size="24" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## 远程图标库

`registerIconLibrary(name, { resolver, mutator, spriteSheet })` 注册远程图标库：
`resolver` 把图标名解析为 SVG URL，组件按需 fetch 加载内联渲染（颜色跟随 `color`/`currentColor`）；
`mutator` 在内联后调整 SVG（如描边图标补 `stroke="currentColor"`）；
`spriteSheet` 模式渲染 `<use href="url#name">`，不内联整 SVG。

<DemoBlock title="CDN 图标库（Lucide via jsDelivr，mutator 补描边）" :script="cdnScript">
  <oas-icon library="lucide" name="heart" size="28" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon library="lucide" name="star" size="28" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon library="lucide" name="arrow-right" rotate="90" size="28" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

<DemoBlock title="sprite 表（本地，<use> 引用）" :script="spriteScript">
  <oas-icon library="demo-sprite" name="sprite-star" size="28" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon library="demo-sprite" name="sprite-heart" size="28" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon library="demo-sprite" name="sprite-check" size="28" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="family 变体（本地 demo-set）" :script="familyScript">
  <oas-icon library="demo-set" name="star" size="28" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon library="demo-set" name="star" family="fill" size="28" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon library="demo-set" name="heart" size="28" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon library="demo-set" name="heart" family="fill" size="28" color="var(--oas-color-danger)"></oas-icon>
</DemoBlock>

<DemoBlock title="variant 变体（如粗细）" :script="variantScript">
  <oas-icon library="demo-weight" name="demo-icon" size="28" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon library="demo-weight" name="demo-icon" variant="bold" size="28" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## 动画预设

`animation` 属性提供一组开箱即用的动画（尊重 `prefers-reduced-motion`，系统减弱动态时自动停用）。

<DemoBlock title="动画预设">
  <oas-icon name="gear" animation="spin" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="gear" animation="spin-pulse" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="heart" animation="beat" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="heart" animation="beat-fade" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="star" animation="bounce" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="arrow-right" animation="shake" size="24"></oas-icon>
  <oas-icon name="refresh" animation="float" size="24" color="var(--oas-color-success)"></oas-icon>
  <oas-icon name="mail" animation="swing" size="24"></oas-icon>
  <oas-icon name="menu" animation="wag" size="24"></oas-icon>
  <oas-icon name="close" animation="buzz" size="24"></oas-icon>
  <oas-icon name="gear" animation="jello" size="24" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## 双色图标

`duotone` 把图标分层着色：`data-layer="primary"` / `data-layer="secondary"`（或前两个图形元素）分别用 `--oas-icon-primary-color` / `--oas-icon-secondary-color` 上色，透明度默认 primary 1 / secondary 0.4（变量可在宿主覆盖）。`swap-opacity` 交换两层透明度。内置图标为单色，主要配合自定义双层 SVG 使用。

<DemoBlock title="duotone 双色">
  <oas-icon duotone size="32" style="--oas-icon-primary-color: var(--oas-color-primary); --oas-icon-secondary-color: var(--oas-color-primary);">
    <svg viewBox="0 0 24 24">
      <path data-layer="secondary" d="M12 1.5 C6.2 1.5 1.5 6.2 1.5 12 C1.5 17.8 6.2 22.5 12 22.5 C17.8 22.5 22.5 17.8 22.5 12 C22.5 6.2 17.8 1.5 12 1.5 Z"/>
      <path data-layer="primary" d="M12 6.5 L13.6 9.8 L17.2 10.4 L14.7 12.9 L15.3 16.4 L12 14.7 L8.7 16.4 L9.3 12.9 L6.8 10.4 L10.4 9.8 Z"/>
    </svg>
  </oas-icon>
  <oas-icon duotone swap-opacity size="32" style="--oas-icon-primary-color: var(--oas-color-primary); --oas-icon-secondary-color: var(--oas-color-primary);">
    <svg viewBox="0 0 24 24">
      <path data-layer="secondary" d="M12 1.5 C6.2 1.5 1.5 6.2 1.5 12 C1.5 17.8 6.2 22.5 12 22.5 C17.8 22.5 22.5 17.8 22.5 12 C22.5 6.2 17.8 1.5 12 1.5 Z"/>
      <path data-layer="primary" d="M12 6.5 L13.6 9.8 L17.2 10.4 L14.7 12.9 L15.3 16.4 L12 14.7 L8.7 16.4 L9.3 12.9 L6.8 10.4 L10.4 9.8 Z"/>
    </svg>
  </oas-icon>
</DemoBlock>

## 占位框模式

`canvas` 控制图标占位框尺寸：`fixed`（1.25×1em）/ `auto`（自然宽 × 1em）/ `square`（1.25×1.25em）/ `roomy`（1.5×1.5em）；显式设置 `size` 优先。

<DemoBlock title="canvas 占位框模式">
  <div style="display:flex; align-items:flex-end; gap: var(--oas-space-5); font-size: 32px; color: var(--oas-color-primary);">
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="fixed"></oas-icon>
      <span>fixed</span>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="auto"></oas-icon>
      <span>auto</span>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="square"></oas-icon>
      <span>square</span>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="roomy"></oas-icon>
      <span>roomy</span>
    </div>
  </div>
</DemoBlock>

## 透明度层级

`depth` 控制透明度层级（1=100% … 5=20%），常用于批量图标营造层次感。

<DemoBlock title="depth 透明度层级">
  <oas-icon name="star" depth="1" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="2" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="3" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="4" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="5" size="24" color="var(--oas-color-warning)"></oas-icon>
</DemoBlock>

## 按需引入

```ts
import { checkPath } from '@oas-ui/icons'
import { registerIcon } from '@oas-ui/ui'

registerIcon('my-icon', '<path d="..."/>')
```

## 图标一览

<DemoBlock title="全部图标（点击复制名称）">
  <div id="icon-gallery" style="width: 100%"></div>
</DemoBlock>

<style>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--oas-space-2);
  width: 100%;
}
.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-1);
  border-radius: var(--oas-radius-md);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.icon-cell:hover {
  background: var(--oas-color-bg-hover);
}
.icon-cell:hover oas-icon {
  color: var(--oas-color-primary);
}
.icon-cell .icon-name {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  user-select: none;
}
</style>

<script setup>
import { onMounted } from 'vue'
// 「查看代码」用的完整注册代码（script prop）：让使用者一眼看到 registerIconLibrary 怎么写
const cdnScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('lucide', {
  resolver: (name) => \`https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/\${name}.svg\`,
  mutator: (svg) => {
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
  },
})`
const spriteScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('demo-sprite', {
  resolver: () => '/demo-sprite.svg',
  spriteSheet: true,
})`
const familyScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('demo-set', {
  resolver: (name, family = 'outline') => \`/demo-set/\${family}/\${name}.svg\`,
})`
const variantScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('demo-weight', {
  resolver: (name, family, variant) =>
    variant === 'bold' ? '/demo-icon-bold.svg' : \`/\${name}.svg\`,
})`

onMounted(async () => {
  const [{ iconNames }, ui] = await Promise.all([
    import('@oas-ui/icons'),
    import('@oas-ui/ui'),
  ])
  // registerIcon 注册自定义图标；注册后重设 name 触发刷新
  ui.registerIcon(
    'custom-star',
    '<path d="M8 1.2 L10.1 5.6 L14.9 6.3 L11.4 9.6 L12.3 14.4 L8 12 L3.7 14.4 L4.6 9.6 L1.1 6.3 L5.9 5.6 Z" fill="currentColor"/>',
  )
  ui.registerIcon(
    'custom-heart',
    '<path d="M8 14.2 C7.6 13.8 4.5 11.1 2.6 8.8 C1.1 7 0.8 5.4 1.6 4.1 C2.5 2.7 4.2 2.5 5.6 3.3 C6.4 3.8 7.3 4.9 8 6 C8.7 4.9 9.6 3.8 10.4 3.3 C11.8 2.5 13.5 2.7 14.4 4.1 C15.2 5.4 14.9 7 13.4 8.8 C11.5 11.1 8.4 13.8 8 14.2 Z" fill="currentColor"/>',
  )
  // registerIconLibrary 注册远程图标库（resolver 按需解析 SVG URL）
  ui.registerIconLibrary('lucide', {
    resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`,
    mutator: (svg) => {
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      svg.setAttribute('stroke-width', '2')
      svg.setAttribute('stroke-linecap', 'round')
      svg.setAttribute('stroke-linejoin', 'round')
    },
  })
  ui.registerIconLibrary('demo-sprite', {
    resolver: () => '/demo-sprite.svg',
    spriteSheet: true,
  })
  ui.registerIconLibrary('demo-set', {
    resolver: (name, family = 'outline') => `/demo-set/${family}/${name}.svg`,
  })
  ui.registerIconLibrary('demo-weight', {
    resolver: (name, family, variant) =>
      variant === 'bold' ? '/demo-icon-bold.svg' : `/${name}.svg`,
  })
  for (const el of document.querySelectorAll('oas-icon[name="custom-star"], oas-icon[name="custom-heart"]')) {
    const name = el.getAttribute('name')
    if (!name) continue
    el.removeAttribute('name')
    el.setAttribute('name', name)
  }
  // 注册库之后重设 library 触发更新
  for (const el of document.querySelectorAll('oas-icon[library]')) {
    const lib = el.getAttribute('library')
    if (!lib) continue
    el.removeAttribute('library')
    el.setAttribute('library', lib)
  }
  const gallery = document.querySelector('#icon-gallery')
  if (!gallery) return
  const grid = document.createElement('div')
  grid.className = 'icon-grid'
  for (const name of iconNames) {
    const cell = document.createElement('div')
    cell.className = 'icon-cell'
    cell.title = `点击复制 ${name}`
    const icon = document.createElement('oas-icon')
    icon.setAttribute('name', name)
    icon.setAttribute('size', '22')
    const label = document.createElement('span')
    label.className = 'icon-name'
    label.textContent = name
    cell.append(icon, label)
    cell.addEventListener('click', async () => {
      await navigator.clipboard.writeText(name)
      ui.message.success(`已复制 ${name}`)
    })
    grid.appendChild(cell)
  }
  gallery.appendChild(grid)
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `animation` | 动画预设：`spin` / `spin-pulse` / `spin-reverse` / `spin-snap` / `beat` / `fade` / `beat-fade` / `bounce` / `shake` / `swing` / `wag` / `buzz` / `float` / `jello`（尊重 prefers-reduced-motion） | `string` | — |
| `canvas` | 占位框模式：`fixed`（默认 1.25×1em）/ `auto`（自然宽 × 1em）/ `square`（1.25×1.25em）/ `roomy`（1.5×1.5em） | `string` | — |
| `color` | 颜色（CSS 色值） | `string` | — |
| `depth` | 透明度层级：`1`（100%）~ `5`（20%），用于批量图标营造层次感 | `string` | — |
| `duotone` | 双色图标：分层着色（`--oas-icon-primary-color` / `--oas-icon-secondary-color` + 透明度），主要配合自定义双层 SVG | `boolean` | — |
| `family` | 图标族（传给库 resolver 的 family 参数，如描边/实心） | `string` | — |
| `flip` | 翻转：镜像（`x` / `y` / `both` 轴），可与 `rotate` 组合 | `string` | — |
| `label` | 可读名称；设置后 `role="img"` | `string` | — |
| `library` | 远程图标库名（`registerIconLibrary` 注册的库），优先于 `name` 内置注册表 | `string` | — |
| `name` | 图标名（kebab-case） | `IconName` | — |
| `rotate` | 角度旋转：任意角度（`rotate="45"` 度数） | `string` | — |
| `size` | 尺寸（px 或 em） | `string` | — |
| `spin` | 旋转动画：无限旋转（loading 场景） | `boolean` | — |
| `src` | 自定义图标地址：远程/本地 SVG URL，fetch 加载内联渲染（颜色跟随 `color` / `currentColor`） | `string` | — |
| `swap-opacity` | 交换双色图标的 primary / secondary 透明度 | `boolean` | — |
| `variant` | 图标变体（传给库 resolver 的 variant 参数，如粗细） | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

图标名一览：`alert-circle` `arrow-down` `arrow-left` `arrow-right` `arrow-up` `calendar` `check-circle` `check` `chevron-down` `chevron-left` `chevron-right` `chevron-up` `clock` `close-circle` `close` `copy` `download` `edit` `error` `external-link` `eye` `filter` `gear` `heart` `info` `loading` `lock` `mail` `menu` `minus` `more-vertical` `more` `plus` `refresh` `search` `sort` `star-filled` `star` `trash` `upload` `user` `warning`。
