# OAS-UI 设计规范（UI-SPEC）

> 本文档定义组件库统一的视觉语言与交互规范，所有组件必须遵循。状态：初稿，随 v0.1 骨架落地同步校准。

## 1. 设计 token 体系

### 1.1 Token 分层

```
语义 token（组件用，如 --oas-color-primary）
  ↑ 映射
基础 token（主题可换，如 --oas-blue-500）
  ↑ 定义
原始变量（每主题的色板/字阶/间距刻度）
```

规则：**组件样式只允许引用语义 token**，禁止硬编码色值/字号/间距；主题通过替换基础 token 实现换肤。

### 1.2 主色（light / dark）

| 语义 token                   | light            | dark             | 用途               |
| ---------------------------- | ---------------- | ---------------- | ------------------ |
| `--oas-color-primary`        | `#0b6cff`        | `#4d9fff`        | 主行动、选中、焦点 |
| `--oas-color-primary-hover`  | `#1f7dff`        | `#63a8ff`        | primary hover      |
| `--oas-color-primary-active` | `#0a5bd6`        | `#3a8ceb`        | primary active     |
| `--oas-color-success`        | `#16a34a`        | `#4ade80`        | 成功               |
| `--oas-color-warning`        | `#d97706`        | `#fbbf24`        | 警告               |
| `--oas-color-danger`         | `#dc2626`        | `#f87171`        | 危险/删除          |
| `--oas-color-text-primary`   | `#18181b`        | `#fafafa`        | 主文字             |
| `--oas-color-text-secondary` | `#71717a`        | `#a1a1aa`        | 次级文字           |
| `--oas-color-text-disabled`  | `#a1a1aa`        | `#71717a`        | 禁用文字           |
| `--oas-color-border`         | `#e4e4e7`        | `#3f3f46`        | 描边/分割线        |
| `--oas-color-bg`             | `#ffffff`        | `#18181b`        | 组件底             |
| `--oas-color-bg-hover`       | `#f4f4f5`        | `#27272a`        | hover 底           |
| `--oas-color-bg-disabled`    | `#f4f4f5`        | `#27272a`        | 禁用底             |
| `--oas-color-overlay`        | `rgba(0,0,0,.5)` | `rgba(0,0,0,.6)` | 遮罩               |

### 1.3 字号阶梯

| token                | 值     | 用途                           |
| -------------------- | ------ | ------------------------------ |
| `--oas-font-size-xs` | `12px` | 辅助/徽标                      |
| `--oas-font-size-sm` | `13px` | 次级正文                       |
| `--oas-font-size-md` | `14px` | **基准字号**（按钮/输入/标签） |
| `--oas-font-size-lg` | `16px` | 强调                           |
| `--oas-font-size-xl` | `20px` | 标题                           |

### 1.4 间距刻度（4px 基准）

`--oas-space-1: 4px` `--oas-space-2: 8px` `--oas-space-3: 12px` `--oas-space-4: 16px` `--oas-space-5: 24px` `--oas-space-6: 32px`

### 1.5 圆角

| token             | 值     | 用途                      |
| ----------------- | ------ | ------------------------- |
| `--oas-radius-sm` | `4px`  | 控件内元素                |
| `--oas-radius-md` | `6px`  | **控件默认**（按钮/输入） |
| `--oas-radius-lg` | `10px` | 卡片/弹窗                 |

### 1.6 动效

| token                   | 值                        | 用途         |
| ----------------------- | ------------------------- | ------------ |
| `--oas-transition-fast` | `120ms`                   | hover/active |
| `--oas-transition-base` | `180ms`                   | 状态切换     |
| `--oas-ease-out`        | `cubic-bezier(.2,0,.2,1)` | 出场         |
| `--oas-ease-in-out`     | `cubic-bezier(.4,0,.2,1)` | 过渡         |

规则：动效尊重 `prefers-reduced-motion`（全局媒体查询关闭过渡）。

## 2. 组件规范

### 2.1 尺寸统一

| 尺寸   | 高度   | 适用          |
| ------ | ------ | ------------- |
| xs     | `20px` | 极紧凑/工具栏 |
| small  | `24px` | 紧凑场景      |
| medium | `32px` | **默认**      |
| large  | `40px` | 主操作        |
| xl     | `48px` | 大屏/触摸目标 |

按钮最小宽 `56px`（防过窄，xs 档放宽至 `44px`）；输入控件同一尺寸必须同高（`--oas-control-height-{xs,sm,md,lg,xl}`）。space 间距档位对应：xs=`4px`、small=`8px`、medium=`12px`、large=`24px`、xl=`32px`。

### 2.2 命名与 DOM 约定

- 自定义元素标签：`<oas-*>`（如 `oas-button`）
- 自定义事件：`oas-*` 前缀 + 动词（`oas-click` `oas-change` `oas-clear`），`detail` 携带数据，`bubbles: true, composed: true`
- 暴露样式点：组件根元素 `::part(host)`，交互元素 `::part(button)` / `::part(input)` 等；语义部件名全部小写连字符
- 属性命名：kebab-case（HTML 属性 `type` `size` `disabled` `loading`），对齐主流组件库用户心智

### 2.3 状态一致性

每个交互组件必须显式处理这些状态，样式与 aria 同步：

| 状态                   | 要求                                                        |
| ---------------------- | ----------------------------------------------------------- |
| disabled               | 不可聚焦、不可点、`aria-disabled`、视觉降饱和（opacity .6） |
| loading                | 显示内置 spinner、禁止重复触发、替换/保留 aria 标签         |
| hover                  | 有 hover 反馈（非 touch 端）                                |
| active / focus-visible | focus-visible 必须有可见焦点环（`--oas-focus-ring`）        |
| empty（数据类）        | 统一 Empty 占位                                             |

## 3. 交互与无障碍基线

- 键盘可达：Tab 进、方向键/Enter/Space 操作、Esc 关闭浮层（焦点返回触发元素）
- 焦点环：`focus-visible` 样式（1px ring + 偏移），不得移除 outline 而不给替代
- ARIA：动态状态同步（`aria-expanded` `aria-checked` `aria-selected` `aria-busy`）；错误消息 `aria-describedby` 关联
- 表单原生优先：能用 `<input>/<select>/<button>` 不用 div 模拟；自定义控件补 `role` 与键盘
- 文案：组件内置文案（空态"暂无数据"、分页"共 X 条"、confirm"确定/取消"等）一律走 locale registry（`@oas-ui/i18n`），**禁止在组件里硬编码文案**；locale key 全集有类型约束，漏翻译编译期/测试期报错（locale-completeness 测试）
- 格式化：数字/日期一律走 `Intl.*`（NumberFormat / DateTimeFormat），不手写格式化逻辑
- RTL：布局相关样式一律用逻辑 CSS 属性（`margin-inline-start` / `padding-inline-end` / `inset-inline-*`），禁用物理方向属性（`margin-left` 等）；组件在 `dir="rtl"` 下必须视觉正确
- 覆盖：组件级文案可通过属性或 slot 覆盖 locale 默认值

## 4. 暗色与主题

- 所有颜色必须同时有 light/dark 值；新增组件必须验证双主题
- 主题切换通过 `data-theme="dark"` 在根元素切换，组件无需感知（只读 CSS 变量）
- 自定义主题：宿主覆盖 `--oas-color-*` 基础 token 即可，文档站出覆盖指南

## 5. 验收（UI 层面）

每个组件合并前：

- [ ] 单测覆盖状态矩阵（含 disabled/loading/empty）
- [ ] Playwright 视觉基线（light + dark 截图对比）
- [ ] axe 扫描零严重违规
- [ ] 键盘流回归（表格见 engineering.md）
