# OAS-UI Roadmap

版本遵循 SemVer。v1.0.0 为首个正式发布。每个版本 = 一个可独立交付/可试用的里程碑。

## 版本规划

| 版本        | 内容                                                                                                                                                                                                                                                       | 状态      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **v0.1.0**  | 工程骨架：monorepo（pnpm）+ Vite library 构建 + Vitest + Playwright 基础设施 + CI 脚本 + `OASElement` 基类 + theme token（light/dark）+ 首个组件 Button 全链路跑通（含视觉/无障碍基线）                                                                    | ✅ 已完成 |
| **v0.2.0**  | 地基组件：icon（SVG 集+按需）、tag、badge、space、divider、link、typography（text/title/paragraph）；文档站骨架（Vitepress + 组件 demo 页）；构建补课（d.ts 产出、多入口 exports、tree-shaking 验证）；`OASElement` 增量渲染重构                           | ✅ 已完成 |
| **v0.3.0**  | 表单组 I：input、textarea、checkbox、radio、switch、slider、input-number、rate —— 受控/非受控双模式 + 原生元素优先                                                                                                                                         | ✅ 已完成 |
| **v0.4.0**  | 表单组 II：select（单选/多选）、auto-complete、cascader、tree-select、form（声明式校验 + aria-invalid 注入）                                                                                                                                               | ✅ 已完成 |
| **v0.5.0**  | 反馈组：message、notification（命令式 API）、modal + confirm、drawer、popconfirm、alert、progress、loading-bar、spin、skeleton、empty、result；overlay 管理器 + z-index token                                                                              | ✅ 已完成 |
| **v0.6.0**  | 浮层基础设施：定位引擎 + 焦点陷阱 + tooltip、popover、dropdown、menu、breadcrumb、tour、anchor、back-top、contextmenu、hover-card                                                                                                                          | ✅ 已完成 |
| **v0.7.0**  | 导航与布局：tabs、pagination、steps、segmented、affix、splitter、flex、page-header、float-button、layout、grid                                                                                                                                             | ✅ 已完成 |
| **v0.8.0**  | 数据展示重头：table（排序/分页/空态/loading/多选）、tree、card、avatar、image、collapse、descriptions、timeline、list、carousel                                                                                                                            | ✅ 已完成 |
| **v0.9.0**  | 主题与可访问性收官：多主题（light/dark/高对比）+ 自定义主题文档 + 全组件 axe 无障碍审计 + React/Vue 双宿主 playground                                                                                                                                      | ✅ 已完成 |
| **v0.10.0** | 国际化：locale registry（`@oas-ui/i18n`，`setLocale()` 全局切换）+ 语言包 zh-CN/en（tree-shakable）+ 全组件内置文案改造为 locale key + locale-completeness 类型约束测试 + Intl.* 数字/日期格式化规矩 + RTL 逻辑 CSS 属性规矩（全量 RTL 视觉审计挪 v1.x） | ✅ 已完成 |
| **v0.11.0** | 框架级容器（自 v1.6 前移）：config-provider（全局注入 locale/size/theme，收编 v0.10 的 registry）+ app（消息上下文容器，与 config-provider 配套）                                                                                                          | ✅ 已完成 |
| **v1.0.0**  | 正式发布：npm 发布、文档站上线、CHANGELOG、贡献指南、SSR 边界策略文档                                                                                                                                                                                      | ✅ 已完成 |

> v1.0 核心集约 68 件，覆盖通用组件库高频部分；长尾按下列 v1.x 版本推进至 100% 覆盖（约 115~120 件）。

## v1.x 规划（组件长尾，目标 100% 覆盖）

| 版本 | 内容 | 状态 |
| --- | --- | --- |
| **v1.1** 基础补充 | button-group、label、kbd、visually-hidden；增强：flex→wrap/stack、grid→simple-grid、tag→chip | ✅ 已完成 |
| **v1.2** 日期时间族 | date-picker、time-picker、calendar、countdown、statistic | ✅ 已完成 |
| **v1.3** 表单增强 | upload、transfer、mentions、color-picker、toggle-button、**pin-input**、**dynamic-input**、**dynamic-tags**、**editable**；增强：input→addon、textarea→autosize | ✅ 已完成 |
| **v1.4** 数据增强 | virtual-list、table 固定列/虚拟滚动、tree 虚拟化、image-preview、qrcode、watermark、**ellipsis**；增强：progress→circle | ✅ 已完成 |
| **v1.5** 命令与导航增强 | command（命令面板）、menubar、navigation-menu、toolbar、scroll-area、toggle-group、speed-dial、**toast**、**snackbar**、**backdrop** | ✅ 已完成 |
| **v1.6** 内容与展示长尾 | chart、code、log、marquee、number-animation、gradient-text、equation、aspect-ratio、masonry、comment | ✅ 已完成 |
| **v1.7** 框架级容器长尾 | theme-editor、bottom-navigation、sidebar、**container**（config-provider/app 已前移 v0.11.0） | ✅ 已完成 |
| **v1.8** 收尾 | combobox（可过滤单选组合框，区别于 select/auto-complete 定位）+ 文档站中英双语与完善（英文参考页与 demo 英文化、本地搜索、组件总览、CHANGELOG 页、图标墙、API 表自动化） | ✅ 已完成 |
| **v1.9** SSR/DSD + 发布冲刺 | 第一阶段 ✅：ssr 渲染器 + Node-safe 入口 + 白名单试点。第二阶段 ✅：真水合、闪动治理、数据通道（table/tree/select）、白名单 13 tag、grid 栅格表单（oas-form-item）、CHANGELOG 回填、首载优化（22ms）。第三阶段 ✅：尺寸档位扩展（size 五档 xs~xl，button/tag/switch/space/spin + 非法值回落告警）。第四阶段 ✅：DSD 彻底落地——白名单 123/124 tag（五批全量推进）、嵌套组件递归序列化、CDN 单文件 bundle（gzip ~116KB）、ssr.md 摘实验转正。框架集成插件 ✅：`@oas-ui/nuxt`（Nuxt 3 module，isCustomElement + theme 注入 + SSR helper）+ `@oas-ui/next`（RSC OasComponent + OasRegistry 客户端注册引导），SSR 开箱即用。已发布：npm（OIDC Trusted Publishing）+ 文档站上线（自定义域名） | ✅ 已完成 |

| **v1.9.1** | 工程性能（v1.9 PATCH）：e2e 大文件并行化——demo-coverage 10.4min→38s、code 8.3min→45s、visual 6.9min→46s，chromium 全量 ~15min→4.1min（CI 3-shard 每 shard 17min→~5min）；消灭固定等待改自动等待；CI webServer 跳过重复 docs build。另含文档站 GA 统计、GA pageerror 修复、Cloudflare 部署命令修复（全量 `pnpm build`）、dark 断言竞态修复、`OAStour`→`OASTour` 类名规范化 | ✅ 已完成 |
| **v2.0** 能力补齐第一批 | P0：upload 照片墙（picture-card/picture）+ 拖拽 + oas-exceed/oas-preview；date-picker shortcuts/disabled-date/multiple；select 自定义渲染（oas-option-render/oas-tag-render）+ 虚拟滚动；form inline 行内布局；table 行内编辑 + 吸顶行；modal 全屏 + 命令式确认（loading）；card 封面/操作区/hoverable/clickable；badge 缎带 ribbon；avatar 徽标 + fallback；tree 自定义节点 + 目录模式；image 懒加载。P1：transfer 搜索/单向/虚拟滚动；notification 进度条/可滚动；slider 输入联动/自定义滑块/reverse/range；calendar 自定义单元格/月年模式切换；message 分组/更新；tabs 动态增删 + 图标；steps 点状/导航模式；breadcrumb 折叠/省略 | ✅ 已完成 |
| **v2.1** basic 族组件增强 | button 增强（variant 形态/color/wave/auto-insert-space/circle/icon-position/href/plain/target/autofocus/wrap）+ button-group（pill 胶囊/分隔符/嵌套组/拆分按钮）+ icon（spin/rotate/flip/图标库注册/动画预设/duotone）+ floating 箭头（tooltip/popover/dropdown arrow/arrow-point-at-center/auto-adjust-overflow）+ tag-group（标签组：单选/多选选值组）+ tag 增强（预设色板、dot/processing 状态点、avatar 适配、hit/strong/multiline）+ badge 增强（standalone 独立徽标、color 全模式、offset 偏移、status 状态点、size 小尺寸、attention 吸引动画、corner 四角定位、overlap 圆形内收、ribbon-form 形态体系、premium、ribbon-size/direction/anchor）+ table 增强（size 密度档位 small/medium/large，CSS 变量开口可覆盖）+ space 增强（separator 分隔符+自定义插槽、justify 分布、reverse 反向、size 数组、fill/fill-ratio 填满、响应式断点简写 direction/size、行内嵌入 demo）+ **oas-compact**（相邻表单控件贴边合并边框组件：vertical/disabled/block）+ 展示型组件字号继承（11 组件）+ 官网首页 v2（hero oas-table 标志性 demo + 3 场景卡 + HTML 代码速览 + 真实 perf 数据 + CTA 收尾）+ button demo 自定义色 WCAG AA 达标；**剩余：divider/link/typography/kbd/label/visually-hidden 六件逐个能力深挖** | 🚧 进行中 |

> 组件总数：v1.0 核心集约 68 件；v1.x 长尾推进至约 115~120 件，100% 覆盖。原 13 个未排期组件已全部分配：轻量基础组件（button-group/label/kbd/visually-hidden）提到最前的 v1.1（独立、无前置依赖、快速交付），其余按功能族归到 v1.3/v1.4/v1.5/v1.7，无遗漏。

## 版本号规则

- **MINOR（0.x.0）**：每个路线图功能块一个 MINOR 版本
- **PATCH（0.x.y）**：当前功能块内的 bug 修复
- 版本号同步位置：`package.json`（各包）+ 文档站侧栏版本号

## 质量门槛（每个版本发布前，对应 docs/engineering.md）

1. `pnpm test` 全绿（单测 + 行为测试）
2. `pnpm typecheck` 零错误
3. `pnpm build` 成功（含 d.ts 产出）
4. `pnpm test:e2e` Playwright 通过（交互 + 视觉基线 + axe 无障碍）
5. 该版本组件 demo 在文档站可用、React/Vue 宿主各一个页面跑通
6. PRD 版本段更新（含测试数）+ 本 ROADMAP 状态更新
7. 涉及 Shadow DOM 样式/组件的改动提交前必跑 `pnpm build`（vitest/jsdom 抓不到 scoped CSS 语法错误）

## 后续 backlog（按需立项）

- SSR / DSD：第一步（基类防御）与首版（SSR 渲染器 + 白名单试点）已落地；真水合、测量组件闪动治理、property-only 数据声明式通道、框架集成插件已并入 v1.9 第二阶段
- ~~表单布局（grid 栅格表单）~~ → 已并入 v1.9 第二阶段
- 组件 API 表格自动化：✅ 已完成（随 v1.8 落地；scan/harvest/gen + api:check 进 CI）
- 语言包扩展：v0.10.0 落地 zh-CN/en 后，按社区需求补 ja/ko/fr/de/es/ar 等
- 全量 RTL 视觉审计（v0.10.0 只立逻辑属性规矩）
