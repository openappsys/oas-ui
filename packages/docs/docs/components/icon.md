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

## 按需引入

```ts
import { checkPath } from '@oas-ui/icons'
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
onMounted(async () => {
  const [{ iconNames }, { message }] = await Promise.all([
    import('@oas-ui/icons'),
    import('@oas-ui/ui'),
  ])
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
      message.success(`已复制 ${name}`)
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
| `color` | 颜色（CSS 色值） | `string` | — |
| `label` | 可读名称；设置后 `role="img"` | `string` | — |
| `name` | 图标名（kebab-case） | `IconName` | — |
| `size` | 尺寸（px 或 em） | `string` | — |

图标名一览：`alert-circle` `arrow-down` `arrow-left` `arrow-right` `arrow-up` `calendar` `check-circle` `check` `chevron-down` `chevron-left` `chevron-right` `chevron-up` `clock` `close-circle` `close` `copy` `download` `edit` `error` `external-link` `eye` `filter` `gear` `heart` `info` `loading` `lock` `mail` `menu` `minus` `more-vertical` `more` `plus` `refresh` `search` `sort` `star-filled` `star` `trash` `upload` `user` `warning`。
