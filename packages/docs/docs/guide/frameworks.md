# 框架接入（React / Vue / Next / Nuxt）

> OAS-UI 是 Web Components 组件库，**不需要官方 wrapper 也能直接用**。本页只说明各框架的原生用法、常见坑和可选集成，不引入新的组件封装层。

## 先选路径

| 场景 | 推荐做法 |
| --- | --- |
| React 19 | 原生 `<oas-*>`，事件用 `on` + 全小写事件名（`onoas-submit`） |
| React 17/18，或需要 camelCase 事件/TS 提示 | 用仓库内 `@oas-ui/react` 的 `useOasEvent` / `useOasEvents`（未发布 npm，monorepo 内使用） |
| Vue 3 | 配置 `compilerOptions.isCustomElement`，模板里直接写 `<oas-*>`，`@oas-*` 绑事件 |
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

React 17/18 需要手动 `addEventListener`，可用 `@oas-ui/react`（仓库内包，未发布 npm）：

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

## 相关页面

- [快速开始](/guide/getting-started)
- [SSR 边界策略](/guide/ssr)
- [集成 FAQ](/guide/faq)
- [服务端窗口取数](/guide/windowed-data)
