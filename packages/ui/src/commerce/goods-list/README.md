# oas-goods-list 设计前必答

1. **取消路径**：无浮层、无异步计时；触底判定是「状态机 + 事件」——派发 `oas-load-more` 后进入待应答（`loadPending`），宿主置 `loading`（应答）或 `items` 变化才解除；宿主两者都不做则不再触发（防重复派发打爆宿主）。滚动 / 容器宽监听随断连经 `unbindLoadMoreListeners` 全量摘除（含待执行 rAF 句柄），重连恢复；rAF 句柄在摘除时取消，无孤儿回调。加载更多失败态（网络错误）不在本件内——`loading` 归宿主管，错误呈现走宿主既有反馈件。
2. **属性默认值/空态**：`layout` 缺省 `waterfall`，非法值回落并告警一次；`columns` 缺省 `auto`（容器宽断点：<640→2、<1024→3、其余 4；非法宽回落 2；固定数值 clamp 1–8，非法回落 auto）；`items` 缺省 / 非法 JSON → 空列表（空态），非法告警一次；缺 `title` 的条目被忽略（标题是卡片最小可识别单元）；`loading` / `no-more` 缺省关；`currency` 缺省走内嵌 `oas-price` 的 CNY 缺省；插槽卡与 `items` 同时给时**插槽优先**（items 忽略）。
3. **多步交互失败点**：瀑布流两阶段（测量容器测高 → 最短列放置）同帧完成，`offsetHeight` 不可用（未布局 / SSR / happy-dom）时纯函数退化为轮转均匀分布——**列表仍可用**，只是不精准均衡；列数重排（auto 跨断点）整体重建列，卡片无内部表单态可丢；触底失败点见第 1 条。
4. **破坏性选项**：无破坏性动作；重排 / 重建不删除宿主数据（插槽卡节点被搬进 shadow 列，引用与监听保留；`items` 由宿主持有）；图片加载失败回落占位（同 `src` 不反复重试）。
5. **键盘/ARIA**：卡片网格容器 `role="list"` + 内建卡 `role="listitem"`（列容器 `role="presentation"` 穿透不打断列表语义；加载区 / 空态 / 哨兵在 list 容器之外，非卡节点不进列表语义），组件 `aria-label` = i18n `goodsList.label`；内建卡可 Tab 聚焦、Enter 触发 `oas-item-click`，`aria-label` 取标题；图片 `alt` 取标题、缺失占位 `role="img"` + i18n 文案进 `aria-label`（无可见文字，与 product-card 同对比度口径）；加载更多区 `role="status"` + `aria-live="polite"` 活区（loading / 到底文案变化自动播报）；哨兵 `aria-hidden`。插槽卡搬进列后组件补 `role="listitem"`（宿主自带 role 不覆盖），可访问性其余部分由宿主卡自带。
6. **受控/非受控与宿主桥接**：`items` get+set 访问器（setter 容忍数组与 JSON 字符串并反射 attribute），Vue/React 按 property 赋值不丢数据；`loading` / `no-more` 走原生 attribute 存在性通道（宿主 `el.setAttribute('loading','')` / 移除，或框架布尔绑定）；插槽卡是宿主 light DOM 节点——搬进 shadow 列后节点引用仍有效（事件与属性保留），**捕获集清理靠「节点离开组件树」**：宿主持有引用逐张 `remove()` 旧卡 → 下一轮 slot 变化即从捕获集剔除并重排；捕获集签名取**节点身份序列**（WeakMap 分配 id，不是数量），等数量增删 / 换卡 / 纯追加都能重排。⚠️ 因搬运后宿主 light DOM 恒为空，`el.replaceChildren(新卡)` 与 `el.append(新卡)` 是同一操作序列，组件无法识别「整替换」意图——整替换须逐张移除旧卡引用后再追加；属性名避开 DOM 内建（`layout` / `columns` / `items` / `loading` / `no-more` / `currency` / `locale` / `precision` 均无 HTMLElement 原型成员冲突；`items` 为 get+set 遮蔽形态）。

## 数据契约

```html
<oas-goods-list
  layout="waterfall"
  columns="auto"
  items='[{"image":"/a.svg","title":"纯棉短袖","price":79,"originalPrice":99,"tags":["新品"]}]'
></oas-goods-list>
```

- 内建简版卡字段：`image?`（缺失 / 加载失败 → 虚线占位）、`title`（必填，两行截断）、`price?` / `originalPrice?`（透传内嵌 `oas-price` 划线通道）、`tags?: string[]`（浅底小签）。
- 卡片位插槽（默认插槽）整体替换内建渲染：宿主放自己的 `oas-product-card` / 自定义卡，组件把插槽卡按序分配进列（瀑布流同样按测得高度均衡放置）；插槽卡增量追加走捕获集合并（已搬进列的旧卡保留，新卡入列），等数量增删按**节点身份签名**重排；单调用 `replaceChildren` 等价追加（见上「宿主桥接」条），整替换须逐张移除旧卡引用。
- 加载更多协议：哨兵进入视口（240px 提前量）→ 派 `oas-load-more` → 宿主置 `loading` + 追加 `items` → 移除 `loading`；`no-more` 置位后哨兵不再触发。
- 触底内核复用：判定 / 可见性守卫 / rAF 节流监听 / 加载区三态统一在 `shared/bottom-reach.ts`（与 order-list 共用；本件的解除信号源 = `items` attribute 签名，内容源 = 插槽卡 + items）。

## 预留能力面（包体分级：本体冻结在大众功能集）

以下为「重量级、可选、场景化」增强，**不在本体内联**；落地时走 L3 能力子路径
`commerce/goods-list/<能力>`（登记 `scripts/perf/lib/l3-registry.mjs` + `docs/perf-baseline.md` §4 独立预算档）：

- **分页协议**（`page` / `pageSize` / 服务端取数状态机与重试）。**已落地**——见下方「已落地：服务端分页协议」。
- **虚拟滚动**（万级商品窗口化渲染，复用 table 家族已验证的窗口内核）。
- **图片懒加载策略档**（原生 loading 之外的视口预取 / 占位过渡）。
- **列布局策略扩展**（等高网格 / 双列交错等非常规瀑布流）。

当前本体接口（attribute / event / slot）对上述能力保持开放：能力子路径以「消费 items / 监听 oas-load-more / 写 loading / no-more」的宿主组合实现，无需改本体 API。

### 已落地：服务端分页协议（`commerce/goods-list/paged`）

上表第 1 项已落地——**helper 型能力子路径**（headless cursor 状态机，按需显式
import；登记 `scripts/perf/lib/l3-registry.mjs` id `goodsListPaged`，独立预算档见
`docs/perf-baseline.md` §4）：

```js
import { createPagedSource } from '@oas-ui/ui/commerce/goods-list/paged'

const source = createPagedSource({
  load: ({ cursor, page }) => fetch(`/api/goods?cursor=${cursor ?? ''}&page=${page}`).then((r) => r.json()),
  getItems: (res) => res.data.list,        // 缺省读 res.items
  getCursor: (res) => res.data.nextCursor, // 缺省读 res.cursor；null = 没有更多
})

list.addEventListener('oas-load-more', async () => {
  if (source.pending) return                        // 防重（本体待应答 + 在途双保险）
  if (source.done) { list.setAttribute('no-more', ''); return }
  list.setAttribute('loading', '')                  // 应答触底（解除本体待应答 + spinner）
  try {
    await source.loadPage()                         // 首页 cursor=null，此后携带上一页尾 cursor
    list.items = source.items                       // 追加渲染
  } catch {
    // 失败呈现归宿主（toast 等）；cursor / page 未推进，可直接再调 loadPage 重试
  } finally {
    list.removeAttribute('loading')
    if (source.done) list.setAttribute('no-more', '')
  }
})

// 切筛选条件：reset() 清累计并自动加载首页；代际守卫——旧在途页 resolve 后被丢弃，
// 陈旧响应不污染新列表（不等旧请求、直接 reset 即可）
await source.reset()
list.items = source.items
list.removeAttribute('no-more')
```

接口面：`createPagedSource({ load, getItems?, getCursor? })` →
`{ reset(), loadPage(), cursor, page, done, pending, items, error }`——状态只读，
动作两个；`error` 落盘最近一次失败（重试成功后清 null），供宿主呈现。

#### 形态决策记录（helper vs 注册型）

**选 helper 型**。判据逐条核对：

1. **状态机状态全在闭包内**（cursor / page / done / pending / epoch），无生命周期
   钩子、无 DOM 依赖（SSR 安全：无 window / document 引用）、不读组件内部——对接
   全走本体公开协议（`oas-load-more` 事件 + `items` / `loading` / `no-more`
   attribute），真实浏览器复核后的待应答契约正是宿主侧胶水所需的全公开面。
2. **注册型无意义**：本体无「属性触发面」可挂（分页协议是宿主取数编排，不是组件
   内能力——分页的可见面 loading / no-more 本体已有）；先例同
   `layout/scroll-area/infinite` 的 headless 控制器（helper 型 L3 的既定形态）。
3. **与本体对接契约：paged 不改本体**——宿主侧胶水（上方完整闭环）是唯一接法，
   本体 API 零变化；helper 无 attribute / 无类成员（collision-guard 不适用）。
4. **family-deps**：状态机不 import 任何组件（含 goods-list 本体——`GoodsItem`
   等类型宿主自定义泛型承载），同族子路径无跨族边，不触发跨族门禁（核实过）。

#### 三账表

| 账 | 数字 | 说明 |
| --- | --- | --- |
| 按需链档 | 实测 **0.6 KB gz / 1 文件**，预算 **2 KB**（×1.15 取整，余量留状态机演进） | 单文件零依赖——headless 状态机比 scroll-area/infinite（4.1 KB，含滚动监听与 DOM 锚定）轻一个量级：无 DOM 无监听，纯状态编排 |
| CDN 族包增量 | **0**（helper 不进 commerce 族包） | `familyInclusionViolations` 断言把关 |
| 消费者共载概率 | 高（商品列表页几乎必带 goods-list 本体 22.7 KB 链；paged 与其共载） | +0.6 KB 换 cursor 状态机全套（防重 / 错误恢复 / 代际守卫 reset），按需付费合理 |

#### 设计前必答（helper 面）

1. **取消路径**：唯一异步动作是 load（宿主的请求）；**代际守卫**（epoch 计数）是
   取消路径的核心——reset 递增代际，旧在途请求 resolve 后结果丢弃（不等宿主实现
   AbortController 也能保证陈旧页不污染新列表）；宿主可用自有 signal 加固，非依赖项。
2. **属性默认值/空态**：getItems 缺省读 `page.items`（非数组 → 空页推进，响应形状
   异常不污染累计）；getCursor 缺省读 `page.cursor`（null / undefined / 非串 = 没有
   更多）；首页 cursor=null 天然成立（宿主不必特判首页）。
3. **多步交互失败点**：load 抛错 → error 落盘、cursor / page 不动、pending 复位
   （重试 = 再调 loadPage，同一 cursor）；在途防重（loadPage / reset 共用通道，
   重复调用返回同一 Promise，load 只调一次）；done 后 loadPage 零请求直接 resolve。
   失败呈现归宿主（helper 无 UI），error 状态可读。
4. **破坏性选项**：reset 是唯一的清空动作，语义 = 「回到第一页」（列表页切筛选的
   标准操作，非数据删除——items 累计是 helper 内部视图态，宿主数据源不受影响）。
5. **键盘/ARIA**：零 UI；加载态 / 到底态的可访问呈现由本体承担（`role="status"` +
   `aria-live` 活区，本体既有）。
6. **受控/非受控与宿主桥接**：宿主驱动（headless 语义）——状态只读，动作只有
   reset / loadPage；`items` 只读累计，宿主 `list.items = source.items` 单向同步
   （Vue demo 同款写法可通——数组 property 赋值走本体 setter 反射 attribute）；
   泛型 `TItem` / `TPage` 由宿主类型承载，helper 不 import 本体类型（零耦合）。

#### 状态机单测全枚举（15 组）

首页（cursor=null / page=0）· cursor 传递 · 尾页 done + 零请求 · 在途防重（同一
Promise）· 错误恢复（cursor/page 不动 + 同 cursor 重试 + error 清空）· reset 清态
+ 自动首页 · reset 代际守卫（陈旧页丢弃）· reset 后 done 复位 · reset 在途复用 ·
getItems / getCursor 自定义适配 · 缺省适配 · 非法响应形状（空页推进）· 接口面快照。
