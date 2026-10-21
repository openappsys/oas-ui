# SSR 覆盖矩阵

> 生成物：`pnpm ssr:matrix`。禁止手改；改数据源后重新生成。

- 组件：209
- SSR 白名单：162
- 有意不 SSR：47

| tag | 族 | 源目录 | SSR | 原因 | 父件 | entry | template | hydrate | 单测 | DSD e2e | 文档 zh/en |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `oas-button` | basic | `basic/button` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/button` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-icon` | basic | `basic/icon` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/icon` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tag` | basic | `basic/tag` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/tag` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tag-group` | basic | `basic/tag` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/tag` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-badge` | basic | `basic/badge` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/badge` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-space` | basic | `basic/space` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/space` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-compact` | basic | `basic/space` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/space` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-divider` | basic | `basic/divider` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/divider` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-link` | basic | `basic/link` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/link` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-text` | basic | `basic/typography` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/typography` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-title` | basic | `basic/typography` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/typography` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-paragraph` | basic | `basic/typography` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/typography` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-button-group` | basic | `basic/button-group` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/button-group` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-button-group-separator` | basic | `basic/button-group` | ⛔ 不 SSR | subcomponent | oas-button-group | — | ✅ | ✅ | — | — | —/— |
| `oas-label` | basic | `basic/label` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/label` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-kbd` | basic | `basic/kbd` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/kbd` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-visually-hidden` | basic | `basic/visually-hidden` | ✅ 白名单 | — | — | `@oas-ui/ui/basic/visually-hidden` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-scroll-area` | layout | `layout/scroll-area` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/scroll-area` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-flex` | layout | `layout/flex` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/flex` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-splitter` | layout | `layout/splitter` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/splitter` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-layout` | layout | `layout/layout` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/layout` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-header` | layout | `layout/layout` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/layout` | ✅ | ✅ | — | ✅ | —/— |
| `oas-sider` | layout | `layout/layout` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/layout` | ✅ | ✅ | — | ✅ | —/— |
| `oas-content` | layout | `layout/layout` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/layout` | ✅ | ✅ | — | ✅ | —/— |
| `oas-footer` | layout | `layout/layout` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/layout` | ✅ | ✅ | — | ✅ | —/— |
| `oas-grid` | layout | `layout/grid` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/grid` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-grid-item` | layout | `layout/grid` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/grid` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-sidebar` | layout | `layout/sidebar` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/sidebar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-sidebar-item` | layout | `layout/sidebar` | ⛔ 不 SSR | subcomponent | oas-sidebar | — | — | — | — | — | —/— |
| `oas-sidebar-divider` | layout | `layout/sidebar` | ⛔ 不 SSR | subcomponent | oas-sidebar | — | — | — | — | — | —/— |
| `oas-container` | layout | `layout/container` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/container` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-aspect-ratio` | layout | `layout/aspect-ratio` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/aspect-ratio` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-masonry` | layout | `layout/masonry` | ✅ 白名单 | — | — | `@oas-ui/ui/layout/masonry` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-titlebar` | workbench | `workbench/titlebar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/titlebar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-traffic-lights` | workbench | `workbench/titlebar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/titlebar` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-statusbar` | workbench | `workbench/statusbar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/statusbar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-statusbar-item` | workbench | `workbench/statusbar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/statusbar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-inspector` | workbench | `workbench/inspector` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/inspector` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-inspector-tabs` | workbench | `workbench/inspector` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/inspector` | ✅ | ✅ | — | ✅ | —/— |
| `oas-inspector-section` | workbench | `workbench/inspector` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/inspector` | ✅ | ✅ | — | ✅ | —/— |
| `oas-inspector-row` | workbench | `workbench/inspector` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/inspector` | ✅ | ✅ | — | ✅ | —/— |
| `oas-action-bar` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-action-bar-button` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-action-bar-well` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-statistic-well` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-task-progress-well` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-transport-well` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-music-well` | workbench | `workbench/action-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/workbench/action-bar` | ✅ | ✅ | — | ✅ | —/— |
| `oas-input` | form | `form/input` | ✅ 白名单 | — | — | `@oas-ui/ui/form/input` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-textarea` | form | `form/textarea` | ✅ 白名单 | — | — | `@oas-ui/ui/form/textarea` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-checkbox` | form | `form/checkbox` | ✅ 白名单 | — | — | `@oas-ui/ui/form/checkbox` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-checkbox-group` | form | `form/checkbox` | ✅ 白名单 | — | — | `@oas-ui/ui/form/checkbox` | ✅ | ✅ | — | ✅ | —/— |
| `oas-radio` | form | `form/radio` | ✅ 白名单 | — | — | `@oas-ui/ui/form/radio` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-radio-group` | form | `form/radio` | ✅ 白名单 | — | — | `@oas-ui/ui/form/radio` | ✅ | ✅ | — | ✅ | —/— |
| `oas-switch` | form | `form/switch` | ✅ 白名单 | — | — | `@oas-ui/ui/form/switch` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-picker` | form | `form/picker` | ⛔ 不 SSR | pending | — | — | — | ✅ | ✅ | — | ✅/✅ |
| `oas-slider` | form | `form/slider` | ✅ 白名单 | — | — | `@oas-ui/ui/form/slider` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-knob` | form | `form/knob` | ✅ 白名单 | — | — | `@oas-ui/ui/form/knob` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-input-number` | form | `form/input-number` | ✅ 白名单 | — | — | `@oas-ui/ui/form/input-number` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-rate` | form | `form/rate` | ✅ 白名单 | — | — | `@oas-ui/ui/form/rate` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-select` | form | `form/select` | ✅ 白名单 | — | — | `@oas-ui/ui/form/select` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-option` | form | `form/select` | ⛔ 不 SSR | subcomponent | oas-select | — | — | — | — | — | —/— |
| `oas-auto-complete` | form | `form/auto-complete` | ✅ 白名单 | — | — | `@oas-ui/ui/form/auto-complete` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-combobox` | form | `form/combobox` | ✅ 白名单 | — | — | `@oas-ui/ui/form/combobox` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-cascader` | form | `form/cascader` | ✅ 白名单 | — | — | `@oas-ui/ui/form/cascader` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tree-select` | form | `form/tree-select` | ✅ 白名单 | — | — | `@oas-ui/ui/form/tree-select` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-mentions` | form | `form/mentions` | ✅ 白名单 | — | — | `@oas-ui/ui/form/mentions` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-form` | form | `form/form` | ✅ 白名单 | — | — | `@oas-ui/ui/form/form` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-form-item` | form | `form/form-item` | ✅ 白名单 | — | — | `@oas-ui/ui/form/form-item` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-form-list` | form | `form/form-list` | ✅ 白名单 | — | — | `@oas-ui/ui/form/form-list` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-questionnaire` | form | `form/questionnaire` | ✅ 白名单 | — | — | `@oas-ui/ui/form/questionnaire` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-calendar` | form | `form/calendar` | ✅ 白名单 | — | — | `@oas-ui/ui/form/calendar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-date-picker` | form | `form/date-picker` | ✅ 白名单 | — | — | `@oas-ui/ui/form/date-picker` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-time-picker` | form | `form/time-picker` | ✅ 白名单 | — | — | `@oas-ui/ui/form/time-picker` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-upload` | form | `form/upload` | ✅ 白名单 | — | — | `@oas-ui/ui/form/upload` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-transfer` | form | `form/transfer` | ✅ 白名单 | — | — | `@oas-ui/ui/form/transfer` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-color-picker` | form | `form/color-picker` | ✅ 白名单 | — | — | `@oas-ui/ui/form/color-picker` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-toggle-button` | form | `form/toggle-button` | ✅ 白名单 | — | — | `@oas-ui/ui/form/toggle-button` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-toggle-group` | form | `form/toggle-group` | ✅ 白名单 | — | — | `@oas-ui/ui/form/toggle-group` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-toggle-item` | form | `form/toggle-group` | ⛔ 不 SSR | subcomponent | oas-toggle-group | — | — | — | — | — | —/— |
| `oas-pin-input` | form | `form/pin-input` | ✅ 白名单 | — | — | `@oas-ui/ui/form/pin-input` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-dynamic-input` | form | `form/dynamic-input` | ✅ 白名单 | — | — | `@oas-ui/ui/form/dynamic-input` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-dynamic-tags` | form | `form/dynamic-tags` | ✅ 白名单 | — | — | `@oas-ui/ui/form/dynamic-tags` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-editable` | form | `form/editable` | ✅ 白名单 | — | — | `@oas-ui/ui/form/editable` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-segmented` | form | `form/segmented` | ✅ 白名单 | — | — | `@oas-ui/ui/form/segmented` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-swatch` | form | `form/swatch` | ⛔ 不 SSR | pending | — | — | ✅ | ✅ | ✅ | — | ✅/✅ |
| `oas-swatch-group` | form | `form/swatch` | ⛔ 不 SSR | subcomponent | oas-swatch | — | ✅ | ✅ | — | — | —/— |
| `oas-message` | feedback | `feedback/message` | ⛔ 不 SSR | imperative | — | — | — | — | — | — | ✅/✅ |
| `oas-notification` | feedback | `feedback/notification` | ⛔ 不 SSR | imperative | — | — | — | — | — | — | ✅/✅ |
| `oas-toast` | feedback | `feedback/toast` | ⛔ 不 SSR | imperative | — | — | — | — | — | — | ✅/✅ |
| `oas-snackbar` | feedback | `feedback/snackbar` | ⛔ 不 SSR | imperative | — | — | — | — | ✅ | — | ✅/✅ |
| `oas-backdrop` | feedback | `feedback/backdrop` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/backdrop` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-modal` | feedback | `feedback/modal` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/modal` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-drawer` | feedback | `feedback/drawer` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/drawer` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-bottom-sheet` | feedback | `feedback/bottom-sheet` | ⛔ 不 SSR | client-only | — | — | ✅ | ✅ | ✅ | — | ✅/✅ |
| `oas-popconfirm` | feedback | `feedback/popconfirm` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/popconfirm` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-alert` | feedback | `feedback/alert` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/alert` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-notice-bar` | feedback | `feedback/notice-bar` | ⛔ 不 SSR | pending | — | — | ✅ | ✅ | ✅ | — | ✅/✅ |
| `oas-pull-refresh` | feedback | `feedback/pull-refresh` | ⛔ 不 SSR | pending | — | — | ✅ | ✅ | ✅ | — | ✅/✅ |
| `oas-progress` | feedback | `feedback/progress` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/progress` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-loading-bar` | feedback | `feedback/loading-bar` | ⛔ 不 SSR | imperative | — | — | — | — | — | — | ✅/✅ |
| `oas-spin` | feedback | `feedback/spin` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/spin` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-skeleton` | feedback | `feedback/skeleton` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/skeleton` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-skeleton-item` | feedback | `feedback/skeleton` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/skeleton` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-empty` | feedback | `feedback/empty` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/empty` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-result` | feedback | `feedback/result` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/result` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tooltip` | feedback | `feedback/tooltip` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/tooltip` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-popover` | feedback | `feedback/popover` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/popover` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-hover-card` | feedback | `feedback/hover-card` | ✅ 白名单 | — | — | `@oas-ui/ui/feedback/hover-card` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-menu` | navigation | `navigation/menu` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/menu` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-menu-item` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-menu | — | — | — | — | — | —/— |
| `oas-menu-group` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-menu | — | — | — | — | — | —/— |
| `oas-menu-divider` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-menu | — | — | — | — | — | —/— |
| `oas-dropdown` | navigation | `navigation/dropdown` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/dropdown` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-dropdown-item` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-dropdown | — | — | — | — | — | —/— |
| `oas-dropdown-group` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-dropdown | — | — | — | — | — | —/— |
| `oas-dropdown-divider` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-dropdown | — | — | — | — | — | —/— |
| `oas-context-menu` | navigation | `navigation/contextmenu` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/contextmenu` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-context-menu-item` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-context-menu | — | — | — | — | — | —/— |
| `oas-context-menu-group` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-context-menu | — | — | — | — | — | —/— |
| `oas-context-menu-divider` | navigation | `navigation/menu` | ⛔ 不 SSR | subcomponent | oas-context-menu | — | — | — | — | — | —/— |
| `oas-command` | navigation | `navigation/command` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/command` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-command-item` | navigation | `navigation/command` | ⛔ 不 SSR | subcomponent | oas-command | — | — | — | — | — | —/— |
| `oas-menubar` | navigation | `navigation/menubar` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/menubar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-menubar-item` | navigation | `navigation/menubar` | ⛔ 不 SSR | subcomponent | oas-menubar | — | — | — | — | — | —/— |
| `oas-menubar-group` | navigation | `navigation/menubar` | ⛔ 不 SSR | subcomponent | oas-menubar | — | — | — | — | — | —/— |
| `oas-menubar-divider` | navigation | `navigation/menubar` | ⛔ 不 SSR | subcomponent | oas-menubar | — | — | — | — | — | —/— |
| `oas-navigation-menu` | navigation | `navigation/navigation-menu` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/navigation-menu` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-navigation-menu-item` | navigation | `navigation/navigation-menu` | ⛔ 不 SSR | subcomponent | oas-navigation-menu | — | — | — | — | — | —/— |
| `oas-navigation-menu-group` | navigation | `navigation/navigation-menu` | ⛔ 不 SSR | subcomponent | oas-navigation-menu | — | — | — | — | — | —/— |
| `oas-toolbar` | navigation | `navigation/toolbar` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/toolbar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-toolbar-toggle` | navigation | `navigation/toolbar` | ⛔ 不 SSR | subcomponent | oas-toolbar | — | ✅ | ✅ | — | — | —/— |
| `oas-toolbar-toggle-item` | navigation | `navigation/toolbar` | ⛔ 不 SSR | subcomponent | oas-toolbar-toggle | — | — | — | — | — | —/— |
| `oas-toolbar-separator` | navigation | `navigation/toolbar` | ⛔ 不 SSR | subcomponent | oas-toolbar | — | ✅ | ✅ | — | — | —/— |
| `oas-toolbar-input` | navigation | `navigation/toolbar` | ⛔ 不 SSR | subcomponent | oas-toolbar | — | ✅ | ✅ | — | — | —/— |
| `oas-scope-bar` | navigation | `navigation/toolbar` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/toolbar` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-app-bar` | navigation | `navigation/app-bar` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/app-bar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-speed-dial` | navigation | `navigation/speed-dial` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/speed-dial` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-breadcrumb` | navigation | `navigation/breadcrumb` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/breadcrumb` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-breadcrumb-item` | navigation | `navigation/breadcrumb` | ⛔ 不 SSR | subcomponent | oas-breadcrumb | — | — | — | — | — | —/— |
| `oas-breadcrumb-separator` | navigation | `navigation/breadcrumb` | ⛔ 不 SSR | subcomponent | oas-breadcrumb | — | — | — | — | — | —/— |
| `oas-back-top` | navigation | `navigation/back-top` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/back-top` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-anchor` | navigation | `navigation/anchor` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/anchor` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-anchor-target` | navigation | `navigation/anchor` | ⛔ 不 SSR | subcomponent | oas-anchor | — | ✅ | ✅ | ✅ | — | —/— |
| `oas-anchor-item` | navigation | `navigation/anchor` | ⛔ 不 SSR | subcomponent | oas-anchor | — | — | — | — | — | —/— |
| `oas-tour` | navigation | `navigation/tour` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/tour` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-bottom-navigation` | navigation | `navigation/bottom-navigation` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/bottom-navigation` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-bottom-navigation-item` | navigation | `navigation/bottom-navigation` | ⛔ 不 SSR | subcomponent | oas-bottom-navigation | — | — | — | — | — | —/— |
| `oas-index-bar` | navigation | `navigation/index-bar` | ⛔ 不 SSR | pending | — | — | ✅ | ✅ | ✅ | — | ✅/✅ |
| `oas-stepper` | navigation | `navigation/stepper` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/stepper` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-stepper-panel` | navigation | `navigation/stepper` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/stepper` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-steps` | navigation | `navigation/steps` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/steps` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-pagination` | navigation | `navigation/pagination` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/pagination` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tabs` | navigation | `navigation/tabs` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/tabs` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tab-panel` | navigation | `navigation/tabs` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/tabs` | ✅ | ✅ | — | ✅ | —/— |
| `oas-affix` | navigation | `navigation/affix` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/affix` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-page-header` | navigation | `navigation/page-header` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/page-header` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-float-button` | navigation | `navigation/float-button` | ✅ 白名单 | — | — | `@oas-ui/ui/navigation/float-button` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-card` | data | `data/card` | ✅ 白名单 | — | — | `@oas-ui/ui/data/card` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-avatar` | data | `data/avatar` | ✅ 白名单 | — | — | `@oas-ui/ui/data/avatar` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-avatar-group` | data | `data/avatar-group` | ✅ 白名单 | — | — | `@oas-ui/ui/data/avatar-group` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-image` | data | `data/image` | ✅ 白名单 | — | — | `@oas-ui/ui/data/image` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-image-group` | data | `data/image-group` | ⛔ 不 SSR | pending | — | — | ✅ | ✅ | ✅ | — | —/— |
| `oas-qrcode` | data | `data/qrcode` | ✅ 白名单 | — | — | `@oas-ui/ui/data/qrcode` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-barcode` | data | `data/barcode` | ✅ 白名单 | — | — | `@oas-ui/ui/data/barcode` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-watermark` | data | `data/watermark` | ✅ 白名单 | — | — | `@oas-ui/ui/data/watermark` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-collapse` | data | `data/collapse` | ✅ 白名单 | — | — | `@oas-ui/ui/data/collapse` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-collapse-item` | data | `data/collapse` | ✅ 白名单 | — | — | `@oas-ui/ui/data/collapse` | ✅ | ✅ | — | ✅ | —/— |
| `oas-collapsible` | data | `data/collapsible` | ✅ 白名单 | — | — | `@oas-ui/ui/data/collapsible` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-descriptions` | data | `data/descriptions` | ✅ 白名单 | — | — | `@oas-ui/ui/data/descriptions` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-descriptions-item` | data | `data/descriptions` | ✅ 白名单 | — | — | `@oas-ui/ui/data/descriptions` | ✅ | ✅ | — | ✅ | —/— |
| `oas-timeline` | data | `data/timeline` | ✅ 白名单 | — | — | `@oas-ui/ui/data/timeline` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-timeline-item` | data | `data/timeline` | ✅ 白名单 | — | — | `@oas-ui/ui/data/timeline` | ✅ | ✅ | — | ✅ | —/— |
| `oas-list` | data | `data/list` | ✅ 白名单 | — | — | `@oas-ui/ui/data/list` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-list-item` | data | `data/list` | ✅ 白名单 | — | — | `@oas-ui/ui/data/list` | ✅ | ✅ | — | ✅ | —/— |
| `oas-kanban` | data | `data/kanban` | ✅ 白名单 | — | — | `@oas-ui/ui/data/kanban` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-scheduler` | data | `data/scheduler` | ✅ 白名单 | — | — | `@oas-ui/ui/data/scheduler` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-gantt` | data | `data/gantt` | ✅ 白名单 | — | — | `@oas-ui/ui/data/gantt` | — | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-resource` | data | `data/resource` | ✅ 白名单 | — | — | `@oas-ui/ui/data/resource` | — | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-carousel` | data | `data/carousel` | ✅ 白名单 | — | — | `@oas-ui/ui/data/carousel` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-tree` | data | `data/tree` | ✅ 白名单 | — | — | `@oas-ui/ui/data/tree` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-table` | data | `data/table` | ✅ 白名单 | — | — | `@oas-ui/ui/data/table` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-table-column` | data | `data/table` | ⛔ 不 SSR | subcomponent | oas-table | — | — | — | — | — | —/— |
| `oas-virtual-list` | data | `data/virtual-list` | ✅ 白名单 | — | — | `@oas-ui/ui/data/virtual-list` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-countdown` | data | `data/countdown` | ✅ 白名单 | — | — | `@oas-ui/ui/data/countdown` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-statistic` | data | `data/statistic` | ✅ 白名单 | — | — | `@oas-ui/ui/data/statistic` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-ellipsis` | data | `data/ellipsis` | ✅ 白名单 | — | — | `@oas-ui/ui/data/ellipsis` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-marquee` | data | `data/marquee` | ✅ 白名单 | — | — | `@oas-ui/ui/data/marquee` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-number-animation` | data | `data/number-animation` | ✅ 白名单 | — | — | `@oas-ui/ui/data/number-animation` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-gradient-text` | data | `data/gradient-text` | ✅ 白名单 | — | — | `@oas-ui/ui/data/gradient-text` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-chart` | data | `data/chart` | ✅ 白名单 | — | — | `@oas-ui/ui/data/chart` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-code` | data | `data/code` | ✅ 白名单 | — | — | `@oas-ui/ui/data/code` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-equation` | data | `data/equation` | ✅ 白名单 | — | — | `@oas-ui/ui/data/equation` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-log` | data | `data/log` | ✅ 白名单 | — | — | `@oas-ui/ui/data/log` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-comment` | data | `data/comment` | ✅ 白名单 | — | — | `@oas-ui/ui/data/comment` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-highlight` | data | `data/highlight` | ✅ 白名单 | — | — | `@oas-ui/ui/data/highlight` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-swipe-cell` | data | `data/swipe-cell` | ⛔ 不 SSR | pending | — | — | ✅ | ✅ | ✅ | — | ✅/✅ |
| `oas-bubble` | conversation | `conversation/bubble` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/bubble` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-attachment` | conversation | `conversation/attachment` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/attachment` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-attachment-group` | conversation | `conversation/attachment` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/attachment` | ✅ | ✅ | ✅ | ✅ | —/— |
| `oas-message-scroller` | conversation | `conversation/message-scroller` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/message-scroller` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-marker` | conversation | `conversation/marker` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/marker` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-message-row` | conversation | `conversation/message-row` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/message-row` | ✅ | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-message-actions` | conversation | `conversation/message-actions` | ⛔ 不 SSR | conversation-pending | — | — | — | ✅ | ✅ | — | ✅/✅ |
| `oas-tool-call` | conversation | `conversation/tool-call` | ⛔ 不 SSR | conversation-pending | — | — | — | ✅ | ✅ | — | ✅/✅ |
| `oas-prompt-input` | conversation | `conversation/prompt-input` | ✅ 白名单 | — | — | `@oas-ui/ui/conversation/prompt-input` | — | ✅ | ✅ | ✅ | ✅/✅ |
| `oas-config-provider` | framework | `framework/config-provider` | ✅ 白名单 | — | — | `@oas-ui/ui/framework/config-provider` | ✅ | ✅ | — | ✅ | ✅/✅ |
| `oas-app` | framework | `framework/app` | ✅ 白名单 | — | — | `@oas-ui/ui/framework/app` | ✅ | ✅ | — | ✅ | ✅/✅ |
| `oas-theme-editor` | framework | `framework/theme-editor` | ⛔ 不 SSR | dev-tool | — | — | — | — | ✅ | — | ✅/✅ |
