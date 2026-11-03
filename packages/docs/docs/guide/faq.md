# 集成 FAQ

来自真实项目集成的常见问题与陷阱。

## 组合模式（React 迁移视角）

### React 里的 asChild / Slot / Portal 在你们这有对应物吗？

React 生态的 asChild / Slot / Portal 解决的是「库强加的包装元素要消除、内容要挂到别处」这类组件组合问题；Web Components 的组件模型不同，这些前提要么不存在、要么已有等价方案：

- **换根元素（asChild / Slot 的包装消除）**——WC 组件自身（host）就是 DOM 里的真实元素，外部布局与选择器天然直接作用于它，不存在「库强加的 wrapper」问题。需要组件渲染成别的语义元素（如把按钮变成链接）时，走**属性驱动换根**：`href` 存在时按钮 / 标签内部渲染为原生 `<a>`，键盘与禁用语义由组件维护（见 oas-button / oas-tag 文档）。
- **让任意元素当触发器**（React 里常见的 `Trigger asChild` 组合）——对应**默认插槽 + 触发器属性**：浮层组件把默认插槽的首个子元素当作触发元素（可放任意元素 / 组件），`trigger` 属性选择触发方式（`click` / `hover` / `contextmenu` 等）；面板内容走 `content` 属性或命名插槽（`title` / `header` / `content` / `footer` 等）。事件绑定与 ARIA 连接由组件内部完成，宿主无需关心。
- **把内容挂到 body 等容器**（Portal / Teleport）——对应 **`append-to` 体系**：tooltip / popover / modal / drawer 等浮层组件的 `append-to="body"` 把浮层移入目标容器，样式作用域与 z-index 上下文不破，移除时归位、无孤儿节点。

一句话：Web Components 下的组合三件套是「**属性驱动根元素 + 命名插槽 + append-to**」，覆盖 React 的 asChild / Slot / Portal 场景，迁移时无需在组件上寻找同名 API。

### React / Vue 里属性名和 DOM 原生 property 撞名怎么办？

给 custom element 传属性时，若属性名命中元素上**已有的 DOM property**，宿主会按 **property 写入**（`el[name] = value`）而不是 `setAttribute`——React 19 如此，Vue 的**绑定**写法（`:name`）在 custom element 上也走同一判定（源码 `key in el`；`spellcheck` / `draggable` / `translate` / `autocorrect` 除外，恒走 attribute）。

OAS-UI 组的处理：

- **`prefix` / `suffix` / `blur`**：`prefix` 撞只读的 `Element.prefix`、`blur`（oas-backdrop）撞方法 `HTMLElement.blur()`；`suffix` 无 DOM 对应，为对称与 property 通道一并处理。相关组件（input / input-number / statistic / countdown / tree-select / backdrop / mentions）用属性访问器**遮蔽**这些名字并映射到规范属性 **`prefix-text` / `suffix-text` / `blur` / `trigger`**（mentions 的 `prefix` 是 `trigger` 的遗留别名）——因此它们在 **attribute 与 property 两条通道都可用**：React 写 `prefix="¥"` / `blur="blur(8px)"`、Vue 静态/绑定写法、纯 HTML 均正常。`prefix-text` / `suffix-text` 是规范名，`prefix` / `suffix` 为兼容别名；`blur` 被遮蔽后该元素的**原生 `blur()` 方法被属性访问器取代**（backdrop 无实际影响）。TypeScript 下 `blur` 仍按继承的方法类型（因方法类型无法声明合并），需要以 property 赋值时请改走 attribute 或 `setAttribute`。
- **其它可写撞名属性**（`title`、`dir`、`role`、`hidden`、`draggable`、`spellcheck`、`autofocus`、`id` 等）是**可写** DOM property，React / Vue 按 property 写入会正常反射成属性。其中 `title` 有两层细节：`oas-modal` / `oas-drawer` 会**消费** title——渲染进标题栏后移除 attribute，因此**不会**触发浏览器原生 tooltip，DOM 里看不到残留是正常行为；不经组件消费 title 的普通元素，title attribute 会触发原生 tooltip。React 19 下 `title={...}` 的完整机制说明见[框架接入](/guide/frameworks)的「全局属性与 property 通道」节（2026-11-04 Chromium 实测口径）。
- 若你自行封装**自定义**组件，避免使用与 `Element` / `HTMLElement` **只读属性或方法**同名的属性名（如 `prefix`、`blur`），或同样用访问器遮蔽。

## 事件

### 为什么事件都带 `oas-` 前缀？

组件派发的 `oas-` 事件在 core 层统一 `emit()` 时显式设置 `bubbles + composed`，会穿透 Shadow DOM 冒泡到 window（平台原生 `CustomEvent` 默认两者均为 `false`——穿透是本库显式约定，非平台默认）。无前缀的 `change` / `select` 会与原生事件（如文本选区 `select`）及宿主框架合成事件互相污染，排查困难。前缀让事件来源一目了然——**监听时写 `oas-change` 而不是 `change`**。

各组件派发的事件名与触发时机见组件文档的「事件」小节。

### `oas-input` 与 `oas-change` 的区别？

与原生语义一致：`oas-input` 在连续交互过程中派发（如滑块拖动中每帧），`oas-change` 在提交时派发（松手 / Enter / 失焦）。自动保存等低频场景监听 `oas-change`，避免拖动每像素触发一次。

### 受控状态怎么读？

受控组件（switch / radio-group / checkbox-group / slider / input-number 等）交互后会把最新值**写回宿主属性**：`el.getAttribute('value')` / `el.hasAttribute('checked')` 直接可读，与事件 `detail` 一致，无需自己缓存。

## 数据属性

### 数据属性的 property 通道接受 JSON 字符串吗？

接受。出于宿主框架兼容（Vue 会把自定义元素上的静态 attribute 直接写成 property），`tasks` / `data` / `resources` / `events` / `items` 等数组数据属性的 setter 在运行时同时接受数组与 JSON 字符串（由 `shared/json-array` 统一归一）。**公开类型仍是数组**（推荐 property 传数组、attribute 传 JSON 字符串）；非法 JSON / 非数组一般回落空值，不抛异常。

## 样式定制

### `::part()` 后面不能接属性选择器

CSS 规范限制：`::part()` 伪元素后**只能接伪类**（`:hover` / `:focus` 等），不能接属性选择器。写 `::part(item)[aria-expanded='true']` 会导致**整条规则被浏览器静默丢弃**——包括同规则里逗号分隔的其他合法选择器，且无任何报错。

```css
/* 正确 */
#menu::part(item):hover {
  /* ... */
}

/* 错误：整条规则失效（含逗号分隔的兄弟选择器一起被丢） */
#menu::part(item):hover,
#menu::part(item)[aria-expanded="true"] {
  /* ... */
}
```

按属性区分状态的替代方案：组件一般会把状态同步为 CSS class 或暴露对应 `::part()`，优先用这些；实在没有再在 JS 里操作 `shadowRoot`。

### `::part()` 无法穿透到 shadow 内部后代

`::part()` 只能选中组件显式暴露的 part 元素，**不能再选它的后代**（`::part(item) .check` 不生效）。要定制内部结构，找组件暴露的更深层 part，或用 CSS 自定义属性穿透（组件文档的「样式定制」小节列出可用变量）。

### 自定义 CSS 怎么跟随明暗主题？

引用主题变量即可：`background: var(--oas-color-bg)`、`color: var(--oas-color-text-primary)`。切换 `data-theme` 时组件库变量自动换值，你的样式引用了变量就自动跟随。变量清单见[设计 Token](./tokens)。

## 国际化（i18n）

### 翻译插值占位符怎么写？

`@oas-ui/i18n` 的翻译插值占位符是 **`{name}`**——单层花括号、**无前缀 `#`**。语言包模板里写 `{count}`，翻译时传 `t(key, { count })` 即完成替换，例如 `'pagination.total': '共 {total} 条'` + `t('pagination.total', { total: 42 })` → `共 42 条`。

> **`#{name}` 不是合法占位符**：`#` 不会被插值逻辑消费，`#{count}` 中的 `#` 会原样保留在输出文案里（替换后仍是 `#{42}`）。写语言包时不要沿用 `#{var}` 这类带 `#` 前缀的模板习惯。

### 自定义语言包/文案怎么注册？

`@oas-ui/i18n` 提供全局 locale registry：`registerLocale(locale)` 注册自定义语言包、`setLocale(name)` 全局切换；语言包结构对齐内置 `zh-CN`（key 全集类型化，缺 key 编译期报错）。`oas-config-provider` 支持就近注入（`locale` 属性），包裹内组件优先用注入的 locale 翻译内置文案，无需全局设置。

内置 16 种（另含 `pt` 兼容别名）：`zh-CN`（默认）/ `zh-Hant`（繁体）/ `en` / `ja` / `ko` / `de` / `fr` / `es` / `pt-BR` / `ru` / `ar` / `hi` / `th` / `uk` / `he` / `fa`（ar/he/fa 为 RTL）。语言代码按 BCP 47 归一：`pt` → `pt-BR`、`zh-TW` / `zh-HK` → `zh-Hant`、`zh-Hans` → `zh-CN`、`en_US` → `en` 等常见别名可直接传给 `setLocale` / `loadLocale` / `config-provider locale`。

内置 16 种之外的新语言：以 `zh-CN` 语言包的消息为模板 → `...zhCN.messages` 全量继承后逐 key 替换 → 把 `messages` 标注为 `Locale`（类型护栏：缺 key 编译期报错）→ RTL 语言标 `dir: 'rtl'` → `registerLocale` 注册 → `setLocale` 切换。**完整 step-by-step 示例见 `@oas-ui/i18n` 包 README「自定义语言包」节**。自定义包的按需分包走宿主自己的动态 `import()`（`loadLocale()` 内置包名之外需先 `registerLocale`）。

### 为什么只引入组件时 `getLocale().messages` 不是全集？

`@oas-ui/i18n` 的内置中文默认文案按**家族切片**分发：按需引入组件时只注册该组件所属家族的切片（如 `data` 链只带 data 族文案），因此 `getLocale().messages` 只包含**已加载的切片**，不是完整键全集。需要全集时用整包入口 `import '@oas-ui/i18n'`，或 `import zhCN from '@oas-ui/i18n/zh-CN'` 取整份语言包。组件 `t()` 未命中时回退显示 key 本身，开发环境会对每个未命中 key 输出一次去重告警（生产静默），可作为「漏切片 / 漏文案」的排查信号。

### 用 `link:` / workspace 引用 ui 时，`setLocale()` 为什么不生效？

宿主以 `link:`（或 pnpm workspace）引用 `@oas-ui/ui` 时，ui 内部的 `@oas-ui/i18n` 与宿主从 registry 直接依赖的 `@oas-ui/i18n` 可能是**两份模块实例**：对宿主那份调用 `setLocale()` 切不到 ui 组件使用的实例，内置文案会回落 raw key（如 `popconfirm.ok`）。

根因是 locale registry 与 core translator 钩子原先存在**模块级变量**里。现在两者都挂到 `globalThis` 的 `Symbol.for` 版本键上，同一进程内所有副本共享同一份 locale / translator 状态；因此 link 场景**不需要改 import**，原有 `import { setLocale } from '@oas-ui/i18n'` 直接生效。默认语言包的**家族切片**注册走同一机制：切片写入的默认文案对象同样挂在共享 state 上，多副本下各副本注册的切片汇入同一份文案，不会出现「写了没人读」的孤儿对象。

仍建议宿主构建去重，减少重复代码与包体（不是正确性必需）：

```ts
// Vite（含 Nuxt 的 vite 配置）
export default defineConfig({
  resolve: {
    dedupe: ["@oas-ui/i18n", "@oas-ui/core"],
  },
});
```

- pnpm 可用 `overrides` 固定 `@oas-ui/i18n` 版本，或让 link 目标与宿主共用同一副本；
- 去重后确认 `pnpm why @oas-ui/i18n` 只剩一份；
- `@oas-ui/core` 也建议一起去重（translator 钩子在 core 里）。

发布态（ui 与 i18n 为同版本 registry 包）通常只有一份实例，无需额外配置。

### 内置支持哪些语言？可以按需加载吗？

内置 16 种（另含 `pt` 兼容别名）：`zh-CN`（默认）/ `zh-Hant`（繁体）/ `en` / `ja` / `ko` / `de` / `fr` / `es` / `pt-BR` / `ru` / `ar` / `hi` / `th` / `uk` / `he` / `fa`（ar/he/fa 为 RTL）。主入口只带 `zh-CN`，其余**按需加载**，不会进首屏：

```ts
import { loadLocale, setLocale } from "@oas-ui/i18n";
await loadLocale("ja"); // 动态 import('@oas-ui/i18n/ja')，独立 chunk
setLocale("ja");
```

语言代码按 BCP 47 归一，常见别名可直接使用：`pt` → `pt-BR`、`zh-TW` / `zh-HK` → `zh-Hant`、`zh-Hans` → `zh-CN`、`en_US` → `en`；带扩展段的标签会剥离扩展后回退基础语言（`en-US-u-ca-gregory` → `en`），私有段（`en-XA` / `en-x-foo`）不剥离。

也可静态按需引入（tree-shaking，只有用到的语言包进产物）：

```ts
import ja from "@oas-ui/i18n/ja";
setLocale(ja);
```

日期与数字格式化走原生 `Intl`（`Intl.DateTimeFormat` / `Intl.NumberFormat`），这些语言无需额外翻译即可正确显示；`first-day-of-week` 缺省值也按 locale 推导（欧陆/中文周一起始，日/韩/英/阿周日起始）。

### RTL 方向语言怎么处理？

`ar` / `he` / `fa` 语言包标注 `dir: 'rtl'`，切到这些语言后浮层定位自动镜像（select / combobox / auto-complete / tree-select / date-picker / time-picker / mentions 等）；也可用 `oas-config-provider direction="rtl"` 显式或局部开启，组件按「config-provider > 祖先 `dir` > `document.dir` > 当前 locale」解析方向。

## 主题

### 切暗色后页面 body 还是白的？

body 不在组件 Shadow DOM 里，不会被自动染色。给 body 显式引用变量：

```css
body {
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
```

## Web Components 取舍问答

以下是选型评估时最常见的几个问题。每条都是本库在立项时就明确过的取舍，附对应文档。

### RSC / Next.js 里怎么用？

`useEffect` 动态注册是 Custom Elements 在 RSC 下的标准做法（React 侧无原生自定义元素水合）。但 SSR 链路不止这一条：本库支持 DSD 快照直出 + 真水合（shadow 复用零闪动），Nuxt/Next 均有集成与 e2e 覆盖，详见[服务端渲染](/guide/ssr)。

### 没有框架 wrapper，React 里写事件会不会麻烦？

不做框架 wrapper 是明确决策：React 19 起对 CE 原生支持已收窄互操作缺口，wrapper 只会增加一层运行时与维护面。本库提供参考级 `useOasEvent`（vendor 进项目即可），事件类型经 api-manifest 提供，详见[框架接入](/guide/frameworks)。

### 复杂应用的共享状态怎么办？

组件库不做应用级状态管理——这是刻意划的边界（同「不做路由/数据请求」）。宿主自有 store + `oas-*` 事件是标准答案；库内跨组件协调另有 config-provider 等 provider 模式，不裸奔 DOM 事件。

### Shadow DOM 里样式调不动怎么办？

样式隔离是设计决策，换来的是零样式污染与可预测的级联。定制三层开口：CSS 变量（token，覆盖绝大多数换肤/微调）→ `::part`（内部结构定制）→ slot 替换（内容结构接管）。详见[主题与自定义](/guide/theming)与[设计 Token](/guide/tokens)。

### 表单怎么接原生协议 / 第三方校验库？

本库走 form-associated 原生协议：label for 关联、FormData 收集、reset、required 校验链全部走原生，外部 `<form>` 直接可收数据。与 Formik 等库的适配成本属于「任何非原生控件」的通用边界，并非 Web Components 特有。

### 按需引入多个组件，体积会不会叠加冗余？

不会。去重靠 ES module 图 + bundler，与有无框架运行时无关；基类与公共 helper 均为单模块共享。且体积不是口头承诺：CI 有 perf:size 预算逐版本不退化，每个入口按需审计（全量天花板 + 按需绝对值两层）。
