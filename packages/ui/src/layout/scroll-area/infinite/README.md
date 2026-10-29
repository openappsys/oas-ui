# @oas-ui/ui/layout/scroll-area/infinite

无限滚动 headless 控制器。不渲染 DOM、不注册自定义元素、不复制滚动引擎；消费 `oas-scroll-area` 或任意滚动根，由宿主负责数据与列表渲染。

```ts
import { createInfiniteScroll } from '@oas-ui/ui/layout/scroll-area/infinite'

const controller = createInfiniteScroll({
  root: scrollArea, // oas-scroll-area 宿主或普通滚动元素；也支持 () => Element | null
  direction: 'bottom', // bottom（默认）| top | both
  threshold: 120,
  keyAttribute: 'data-key', // top 加载保位用的稳定键；缺省 data-key，缺失回落 id
  async load({ edge, signal }) {
    const page = await fetchPage(edge, { signal })
    render(page.items)
    return { hasMore: page.hasMore }
  },
})

controller.attach()
// 卸载时
controller.destroy()
```

## API

| 成员 | 说明 |
| --- | --- |
| `attach(root?)` | 绑定/重绑滚动根，返回是否解析到 viewport。省略参数沿用构造参数；`null` 等价 detach |
| `detach()` | 解绑监听并中止在途请求，保留 complete/error 状态 |
| `update()` | 按当前几何评估双边缘；滚动/尺寸/内容变化已自动调用，宿主也可主动调用 |
| `load(edge?)` | 显式加载（忽略阈值/武装，仍遵守 loading/error/complete 锁）；resolve 是否实际成功 |
| `retry(edge?)` | 重试 error 边缘；省略时重试全部 error 边缘；任一成功 resolve true |
| `complete(edge?)` | 标记已到底（省略时双边缘），重复调用幂等 |
| `reset()` | 中止在途、清空 error/complete/loads 并重新武装（不自动加载） |
| `destroy()` | 中止全部请求、解绑监听、静默回 idle；此后所有命令 no-op |
| `state` | `{ top, bottom }` 状态快照：`{ status, error, loads }` |
| `direction` / `viewport` / `destroyed` | 生效方向 / 已解析视口 / 销毁态 |

## 行为约定

- 同一边缘在途去重，不同边缘可并发；`complete` 后不再自动加载，error 需显式 `retry()`。
- 到达边缘且处于武装态自动触发；离开边缘、内容增长或 `reset()` 后重新武装。只有加载带来内容高度增长才自动续载，空结果不会循环。
- `top` 加载前记录首个可见内容项的视口位置与稳定 key；结果落地后补偿 `scrollTop`。keyed 替换按 key 重查；`ResizeObserver` / 资源 `load` 继续处理异步撑高；程序补偿的 scroll 回声不释放锚点，读者真实滚动后接管。
- 默认把 `root` 的直接子元素当作列表项；若列表包在单一 wrapper / 头部 + 列表结构里，传 `content: () => listEl` 指向真正的列表容器，锚点才能落在可移动的条目上。
- `reverse: true` 等价 `direction: 'top'` + 初始滚到底。
- 无 DOM / SSR：`attach()` 返回 false、`update()` no-op、手动 `load()` 仍可用。`signal` 在 destroy/reset/complete 时中止，迟到结果按请求代际丢弃。
- 回调（`onLoadStart` / `onLoadEnd` / `onError` / `onStateChange` / `onComplete`）抛错会隔离为 dev 告警，不破坏状态机。
