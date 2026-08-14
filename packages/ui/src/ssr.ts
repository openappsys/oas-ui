/**
 * Node-safe SSR 入口 —— 仅 re-export 全部组件类，不执行任何 customElements.define。
 *
 * 与主入口（src/index.ts）的区别：
 * - 主入口含逐目录 define 副作用（import 即向全局 customElements 注册），是浏览器用法；
 *   顶层 `import '@oas-ui/i18n'` 会注入翻译器。
 * - 本入口只导出组件类（从各 oas-*.ts 类文件直接导出，不经过目录 index.ts），
 *   不触碰 DOM API、无任何副作用，可在 Node 环境直接 import，
 *   供高级用户在自有 DOM shim（如 @oas-ui/ssr）里自定义注册/实例化。
 *
 * 用法：
 *   import { OASButton } from '@oas-ui/ui/ssr'
 *   // 自建 DOM shim 时：
 *   customElements.define('oas-button', OASButton)
 *   const btn = document.createElement('oas-button')
 *
 * 组件属性/事件等的类型定义仍从主入口 `@oas-ui/ui` 获取（type-only import 无运行时副作用）。
 */

// ---------- basic ----------
export { OASButton } from './basic/button/oas-button.js'
export { OASIcon, registerIcon, registerIconLibrary } from './basic/icon/oas-icon.js'
export { OASTag } from './basic/tag/oas-tag.js'
export { OASBadge } from './basic/badge/oas-badge.js'
export { OASSpace } from './basic/space/oas-space.js'
export { OASDivider } from './basic/divider/oas-divider.js'
export { OASLink } from './basic/link/oas-link.js'
export { OASText, OASTitle, OASParagraph } from './basic/typography/oas-typography.js'
export { OASButtonGroup } from './basic/button-group/oas-button-group.js'
export { OASLabel } from './basic/label/oas-label.js'
export { OASKbd } from './basic/kbd/oas-kbd.js'
export { OASVisuallyHidden } from './basic/visually-hidden/oas-visually-hidden.js'

// ---------- form ----------
export { OASInput } from './form/input/oas-input.js'
export { OASTextarea } from './form/textarea/oas-textarea.js'
export { OASCheckbox } from './form/checkbox/oas-checkbox.js'
export { OASCheckboxGroup } from './form/checkbox/oas-checkbox-group.js'
export { OASRadio } from './form/radio/oas-radio.js'
export { OASRadioGroup } from './form/radio/oas-radio-group.js'
export { OASSwitch } from './form/switch/oas-switch.js'
export { OASSlider } from './form/slider/oas-slider.js'
export { OASInputNumber } from './form/input-number/oas-input-number.js'
export { OASRate } from './form/rate/oas-rate.js'
export { OASSelect } from './form/select/oas-select.js'
export { OASAutoComplete } from './form/auto-complete/oas-auto-complete.js'
export { OASCombobox } from './form/combobox/oas-combobox.js'
export { OASCascader } from './form/cascader/oas-cascader.js'
export { OASTreeSelect } from './form/tree-select/oas-tree-select.js'
export { OASMentions } from './form/mentions/oas-mentions.js'
export { OASForm } from './form/form/oas-form.js'
export { OASCalendar } from './form/calendar/oas-calendar.js'
export { OASDatePicker } from './form/date-picker/oas-date-picker.js'
export { OASTimePicker } from './form/time-picker/oas-time-picker.js'
export { OASUpload } from './form/upload/oas-upload.js'
export { OASTransfer } from './form/transfer/oas-transfer.js'
export { OASColorPicker } from './form/color-picker/oas-color-picker.js'
export { OASToggleButton } from './form/toggle-button/oas-toggle-button.js'
export { OASToggleGroup } from './form/toggle-group/oas-toggle-group.js'
export { OASPinInput } from './form/pin-input/oas-pin-input.js'
export { OASDynamicInput } from './form/dynamic-input/oas-dynamic-input.js'
export { OASDynamicTags } from './form/dynamic-tags/oas-dynamic-tags.js'
export { OASEditable } from './form/editable/oas-editable.js'

// ---------- feedback ----------
export { OASMessage } from './feedback/message/oas-message.js'
export { OASNotification } from './feedback/notification/oas-notification.js'
export { OASToast } from './feedback/toast/oas-toast.js'
export { OASSnackbar } from './feedback/snackbar/oas-snackbar.js'
export { OASBackdrop } from './feedback/backdrop/oas-backdrop.js'
export { OASModal } from './feedback/modal/oas-modal.js'
export { OASDrawer } from './feedback/drawer/oas-drawer.js'
export { OASPopconfirm } from './feedback/popconfirm/oas-popconfirm.js'
export { OASAlert } from './feedback/alert/oas-alert.js'
export { OASProgress } from './feedback/progress/oas-progress.js'
export { OASLoadingBar } from './feedback/loading-bar/oas-loading-bar.js'
export { OASSpin } from './feedback/spin/oas-spin.js'
export { OASSkeleton } from './feedback/skeleton/oas-skeleton.js'
export { OASEmpty } from './feedback/empty/oas-empty.js'
export { OASResult } from './feedback/result/oas-result.js'

// ---------- floating ----------
export { OAStooltip } from './floating/tooltip/oas-tooltip.js'
export { OASPopover } from './floating/popover/oas-popover.js'
export { OASMenu } from './floating/menu/oas-menu.js'
export { OASDropdown } from './floating/dropdown/oas-dropdown.js'
export { OASContextMenu } from './floating/contextmenu/oas-context-menu.js'
export { OASHoverCard } from './floating/hover-card/oas-hover-card.js'
export { OASCommand } from './floating/command/oas-command.js'
export { OASMenubar } from './floating/menubar/oas-menubar.js'
export { OASNavigationMenu } from './floating/navigation-menu/oas-navigation-menu.js'
export { OASToolbar } from './floating/toolbar/oas-toolbar.js'
export { OASConfigProvider } from './floating/config-provider/oas-config-provider.js'
export { OASApp } from './floating/app/oas-app.js'
export { OASScrollArea } from './floating/scroll-area/oas-scroll-area.js'
export { OASSpeedDial } from './floating/speed-dial/oas-speed-dial.js'
export { OASThemeEditor } from './floating/theme-editor/oas-theme-editor.js'

// ---------- navigation ----------
export { OASBreadcrumb } from './navigation/breadcrumb/oas-breadcrumb.js'
export { OASBackTop } from './navigation/back-top/oas-back-top.js'
export { OASAnchor } from './navigation/anchor/oas-anchor.js'
export { OASTour } from './navigation/tour/oas-tour.js'
export { OASBottomNavigation } from './navigation/bottom-navigation/oas-bottom-navigation.js'

// ---------- layout ----------
export { OASSegmented } from './layout/segmented/oas-segmented.js'
export { OASFlex } from './layout/flex/oas-flex.js'
export { OASSteps } from './layout/steps/oas-steps.js'
export { OASPagination } from './layout/pagination/oas-pagination.js'
export { OASTabs } from './layout/tabs/oas-tabs.js'
export { OASTabPanel } from './layout/tabs/oas-tab-panel.js'
export { OASAffix } from './layout/affix/oas-affix.js'
export { OASSplitter } from './layout/splitter/oas-splitter.js'
export { OASPageHeader } from './layout/page-header/oas-page-header.js'
export { OASFloatButton } from './layout/float-button/oas-float-button.js'
export { OASLayout } from './layout/layout/oas-layout.js'
export { OASHeader } from './layout/layout/oas-header.js'
export { OASSider } from './layout/layout/oas-sider.js'
export { OASContent } from './layout/layout/oas-content.js'
export { OASFooter } from './layout/layout/oas-footer.js'
export { OASGrid } from './layout/grid/oas-grid.js'
export { OASGridItem } from './layout/grid/oas-grid-item.js'
export { OASSidebar } from './layout/sidebar/oas-sidebar.js'
export { OASContainer } from './layout/container/oas-container.js'

// ---------- data ----------
export { OASCard } from './data/card/oas-card.js'
export { OASAvatar } from './data/avatar/oas-avatar.js'
export { OASAvatarGroup } from './data/avatar-group/oas-avatar-group.js'
export { OASImage } from './data/image/oas-image.js'
export { OASQRCode } from './data/qrcode/oas-qrcode.js'
export { OASWatermark } from './data/watermark/oas-watermark.js'
export { OASCollapse } from './data/collapse/oas-collapse.js'
export { OASCollapseItem } from './data/collapse/oas-collapse-item.js'
export { OASDescriptions } from './data/descriptions/oas-descriptions.js'
export { OASDescriptionsItem } from './data/descriptions/oas-descriptions-item.js'
export { OASTimeline } from './data/timeline/oas-timeline.js'
export { OASTimelineItem } from './data/timeline/oas-timeline-item.js'
export { OASList } from './data/list/oas-list.js'
export { OASListItem } from './data/list/oas-list-item.js'
export { OASCarousel } from './data/carousel/oas-carousel.js'
export { OASTree } from './data/tree/oas-tree.js'
export { OASTable } from './data/table/oas-table.js'
export { OASVirtualList } from './data/virtual-list/oas-virtual-list.js'
export { OASCountdown } from './data/countdown/oas-countdown.js'
export { OASStatistic } from './data/statistic/oas-statistic.js'
export { OASEllipsis } from './data/ellipsis/oas-ellipsis.js'
export { OASMarquee } from './data/marquee/oas-marquee.js'
export { OASNumberAnimation } from './data/number-animation/oas-number-animation.js'
export { OASGradientText } from './data/gradient-text/oas-gradient-text.js'
export { OASAspectRatio } from './data/aspect-ratio/oas-aspect-ratio.js'
export { OASChart } from './data/chart/oas-chart.js'
export { OASCode } from './data/code/oas-code.js'
export { OASEquation } from './data/equation/oas-equation.js'
export { OASLog } from './data/log/oas-log.js'
export { OASMasonry } from './data/masonry/oas-masonry.js'
export { OASComment } from './data/comment/oas-comment.js'
