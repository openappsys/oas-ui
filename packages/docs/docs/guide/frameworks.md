# 框架接入（React、Vue 等）

> OAS-UI 是 Web Components 组件库，**不需要官方 wrapper 也能直接用**。本页说明各框架的原生用法、常见坑和可选集成，不引入新的组件封装层。
>
> 已验证的接入路径包括 React、Vue、Svelte、Angular、Astro、Next.js、Nuxt 等；未列出的框架按原生 Web Components 使用即可。

## 先选路径

| 场景 | 推荐做法 |
| --- | --- |
| React 19 | 原生 `<oas-*>`，事件用 `on` + 全小写事件名（`onoas-submit`） |
| React 17/18，或需要 camelCase 事件 | 把仓库内 `@oas-ui/react` 的两个 hook vendor 进项目（约 100 行，官方不发布 npm 包，见下） |
| Vue 3 | 配置 `compilerOptions.isCustomElement`，模板里直接写 `<oas-*>`，`@oas-*` 绑事件 |
| Svelte 5 | 事件属性 `onoas-click={...}`（**大小写敏感**，kebab-case 原名保留）；Svelte 4 用 `on:oas-click`（legacy） |
| Angular | `schemas: [CUSTOM_ELEMENTS_SCHEMA]`；事件 `(oas-click)`、属性 `[options]` 模板直绑 |
| Astro | 零特殊处理：HTML 里直接写，页面 `<script>` 注册即可（群岛按各框架小节） |
| 其他（SolidJS 等） | 无需特殊处理，注册后直接使用；互操作细节待真实消费场景再补专节 |
| Next.js App Router | 用 `@oas-ui/next` 的 RSC/DSD 集成（见 [SSR 边界策略](/guide/ssr)） |
| Nuxt 3 | 用 `@oas-ui/nuxt` module（自动 `isCustomElement` + theme CSS + SSR helper） |

## 注册组件

```ts
import '@oas-ui/theme'
import '@oas-ui/ui' // 全量注册
```

按需注册：

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

## React

### 事件

React 19 对 Custom Elements 只把「`on` + 全小写字面量」映射为监听器：

```tsx
<oas-button type="primary" onoas-submit={(e) => console.log(e.detail)}>
  提交
</oas-button>
```

`onOasSubmit` 这种 camelCase 写法**不会**自动映射到 `oas-submit`，不要依赖它。

React 17/18 需要手动 `addEventListener`。仓库 `packages/react` 里有现成的 `useOasEvent` / `useOasEvents` 参考实现（两个 hook 约 100 行，MIT/Apache-2.0 双许可）——**官方不发布该 npm 包，也不计划提供任何框架 wrapper / 桥接包**（评估结论：React 对 Custom Elements 的原生支持在变好，桥接层属于正在收窄的互操作缺口，不值得养成官方依赖）。需要 camelCase 事件写法时，把这两个 hook 复制进自己项目即可：

```tsx
import { useRef } from 'react'
import { useOasEvent } from '@oas-ui/react'

const ref = useRef<HTMLElement | null>(null)
useOasEvent(ref, 'oas-submit', (detail) => console.log(detail))
```

### 复杂数据与布尔属性

- 简单字符串/数字：直接写 JSX 属性即可。
- 数组/对象：优先用 `ref` 赋 property，避免把 `[object Object]` 写进 attribute：

```tsx
const tableRef = useRef<HTMLElement & { columns?: unknown; data?: unknown }>(null)

useEffect(() => {
  if (!tableRef.current) return
  tableRef.current.columns = columns
  tableRef.current.data = rows
}, [columns, rows])

return <oas-table ref={tableRef} />
```

- 布尔属性用 presence 语义：`<oas-ellipsis expanded>` 展开；需要关闭时移除属性或显式 `expanded={false}`（按组件文档）。
- TypeScript 若直接使用 `oas-*` 标签，需要补充 `JSX.IntrinsicElements`；示例见 `@oas-ui/react` 的 README。

### 全局属性与 property 通道（`title` 的实测行为）

React 19 对 Custom Element 上**已存在的 property 名**（`title` / `dir` / `lang` 等）按 property 赋值（`el.title = v`）而非 `setAttribute`。其中 `title` 是 HTMLElement 的**反射型** property——赋值会同步反射成同名 attribute，组件的 attribute 通道照常被触发。

实测结论（Chromium 验证，2026-11-04）：**`oas-modal` / `oas-drawer` 两个通道都正常收到 `title`，React 里直接 `<oas-modal title="…">` 即可，无需任何绕过写法**。一个容易误会的细节：这两个组件会**消费** title——渲染进内部标题栏后**移除 attribute**（避免浏览器原生 tooltip 干扰），所以你在 DOM 里看不到 title 属性残留是正常行为，不是没生效；判断依据是标题栏渲染结果。

```tsx
// 直接写即可（property → 反射 attribute → 组件消费）
<oas-modal title="详情" />
```

真正需要留意的三种场景：

- **验证方式**：判 title 是否生效看标题栏渲染，不要以 attribute 是否残留为准（消费型组件会移除它）。
- **自行封装自定义组件**时：避免与 `Element` / `HTMLElement` 的**只读属性或方法**撞名（如 `prefix` 撞只读 `Element.prefix`、`blur` 撞方法），必要时用属性访问器遮蔽——库内 `prefix` / `suffix` / `blur` 的规范化处理见 [集成 FAQ](/guide/faq) 的撞名一节。
- **不消费 title 的普通元素**：title 落在 attribute 上会触发浏览器原生 tooltip（这在任何框架下都一样）。

## Vue 3

Vue 模板可以直接写 Custom Elements，关键只有一处编译配置：

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('oas-'),
        },
      },
    }),
  ],
}
```

```vue
<oas-button type="primary" @oas-click="onClick">按钮</oas-button>
```

- 事件：`@oas-*` 直接绑定。
- 复杂数据：`:columns="columns"`、`:data="rows"` 会走 property；静态 attribute 写 JSON 字符串也可以。
- `v-model` **不是**原生支持：Custom Elements 不遵循 `modelValue / update:modelValue`。用 `:value` + `@oas-change` 手动同步，或在业务侧封装一个局部组件。

Nuxt 3 直接用 module，不需要手写上面的 `isCustomElement`：

```ts
export default defineNuxtConfig({
  modules: ['@oas-ui/nuxt'],
})
```

## Svelte

Svelte 5 用**事件属性**（event attributes）监听，且**大小写敏感**——`onoas-click` 按原名监听 `oas-click`（kebab-case 保留；写成 `onoasclick` 会监听另一个事件 `oasclick`，收不到组件派发）：

```svelte
<oas-button type="primary" onoas-click={(e) => console.log(e.detail)}>保存</oas-button>
```

- Svelte 4 的 `on:oas-click` 指令仍可用，但 Svelte 5 已列为 legacy，新代码用事件属性写法。
- 复杂数据（数组/对象）：属性表达式会被字符串化写进 attribute，用 `bind:this` 取到元素后在 `$effect` 里赋 property：

```svelte
<script>
  let el = $state(null)
  $effect(() => {
    if (el) el.columns = columns
  })
</script>

<oas-table bind:this={el} />
```

- `bind:value` **不会**与组件同步：Svelte 的绑定靠 `input` / `change` 事件回写，组件派发的是 `oas-change`——用 `onoas-change` 手动同步（与 Vue 的 `v-model` 限制同口径）。

## Angular

关键一处配置——standalone 组件（Angular 17+ 默认）或 NgModule 的 `schemas` 加 `CUSTOM_ELEMENTS_SCHEMA`，模板即可直接写 `<oas-*>`：

```ts
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core'

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<oas-button type="primary" (oas-click)="onClick($event)">保存</oas-button>`,
})
export class AppComponent {
  onClick(e: Event) {
    console.log((e as CustomEvent).detail)
  }
}
```

- 事件：`(oas-click)="handler($event)"` 模板绑定原生可用（`$event` 即 CustomEvent，`.detail` 取数据）。
- 数据绑定：`[options]="rows"` 优先写 DOM property（存在时），对象/数组直接绑，无需序列化。
- `ngModel` 不适用（无 ControlValueAccessor 桥接）：用 `[value]` + `(oas-change)` 手动同步。

## Astro

Astro 是 HTML 优先的 MPA / 群岛架构，**零特殊处理**：`.astro` 文件里直接写 `<oas-*>`，页面 `<script>` 里注册组件（Astro 打包脚本且默认全页只执行一次）：

```astro
<oas-button type="primary">保存</oas-button>

<script>
  import '@oas-ui/theme'
  import '@oas-ui/ui/basic/button'
</script>
```

群岛（islands）里的交互组件按各自框架的小节接法处理（React 岛看 React 节，Vue 岛看 Vue 节）。SolidJS 等其他框架同样无需特殊处理，注册后直接使用。

## SSR / DSD

- Nuxt：`@oas-ui/nuxt`。
- Next.js：`@oas-ui/next`。
- 其他 SSR：见 [SSR 边界策略](/guide/ssr)；客户端注册、DSD 水合和 `isCustomElement` 的时序都在该页说明。

## 常见坑

1. **事件名必须带 `oas-` 前缀**：组件派发 `oas-change` / `oas-submit`，监听 `change` / `submit` 收不到。
2. **属性 vs property**：数组/对象优先 property；纯字符串/数字可用 attribute。
3. **布尔空串**：Vue 静态 `<oas-ellipsis expanded>` 会写 `''`，组件按 presence 语义视为开启；不要用 `expanded="false"` 这种字符串关闭，按组件文档移除属性或写 `false`。
4. **SSR 先注册再水合**：不要在未升级元素上写 property；需要等待 `customElements.whenDefined('oas-*')` 或使用框架集成包。
5. **`::part()` 不能链伪类**：`::part(item):hover` 无效，用 `::part(item)` + 组件内部状态属性。
6. **全局属性与 property 通道**：React 对 `title` 等原生 property 名走 property 赋值，但 `title` 是反射型 property（赋值同步成 attribute），`oas-modal` / `oas-drawer` 双通道都正常收到并**消费**（渲染后移除 attribute，DOM 里看不到残留是正常行为）——见上文 [全局属性与 property 通道](#全局属性与-property-通道title-的实测行为) 节。

## 相关页面

- [快速开始](/guide/getting-started)
- [SSR 边界策略](/guide/ssr)
- [集成 FAQ](/guide/faq)
- [服务端窗口取数](/guide/windowed-data)
