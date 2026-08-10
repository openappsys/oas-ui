# Component Overview

OAS-UI provides 114 framework-agnostic Web Components, organized into 7 groups by purpose. Click a component name to see its full documentation and examples.

## Basic

- [Button](/en/components/button) —— Basic button component, an enhanced native `<button>`.
- [Icon](/en/components/icon) —— An original linear icon set that renders inline SVGs by name; tree-shakable.
- [Tag](/en/components/tag) —— A small tag used for marking and categorization.
- [Badge](/en/components/badge) —— A numeric/status badge, typically used for message counts or new-content indicators.
- [Space](/en/components/space) —— A layout container with even horizontal/vertical spacing.
- [Divider](/en/components/divider) —— A horizontal/vertical divider that separates content.
- [Link](/en/components/link) —— A text link, an enhanced native `<a>`.
- [Typography](/en/components/typography) —— Typography components for text, titles, and paragraphs.
- [ButtonGroup](/en/components/button-group) —— Button group: combines multiple `oas-button` elements into a value-selection group; adjacent button corners merge and hover only highlights the current item.
- [Label](/en/components/label) —— A form label component. `for` points to the target control's id, and clicking focuses the control; supports a required asterisk and its position.
- [Kbd](/en/components/kbd) —— A keyboard shortcut display component. `keys` is split by spaces into multiple keycaps joined with `+`; non-interactive.
- [VisuallyHidden](/en/components/visually-hidden) —— A container that is visible to screen readers but visually hidden. Commonly used for assistive descriptions, form validation hints, and other accessibility scenarios.

## Form

- [Input](/en/components/input) —— An enhanced base input built on the native `<input>` element.
- [Textarea](/en/components/textarea) —— An enhanced native `<textarea>` supporting auto-height and resize.
- [Checkbox](/en/components/checkbox) —— An enhanced native `<input type="checkbox">` supporting indeterminate state and checkbox groups.
- [Radio](/en/components/radio) —— An enhanced native `<input type="radio">` supporting radio groups and controlled values.
- [Switch](/en/components/switch) —— A switch button with `role="switch"`.
- [Slider](/en/components/slider) —— A slider built on an enhanced native `<input type="range">`.
- [InputNumber](/en/components/input-number) —— An enhanced native `<input type="number">` with stepper buttons and range constraints.
- [Rate](/en/components/rate) —— A star rating supporting keyboard arrow-key adjustment; clicking the currently selected star clears the value by default.
- [Select](/en/components/select) —— A dropdown selector supporting single/multiple selection, groups, clearable, remote search, and custom creation, with full keyboard operation.
- [AutoComplete](/en/components/auto-complete) —— Type to get suggestions, with keyboard up/down selection, Enter to confirm, and Esc to close.
- [Combobox](/en/components/combobox) —— A filterable single-select combobox whose input is the control: **an always-visible editable input** shows the selected label, typing filters options in real time, and `value` takes `option.value` on selection.
- [Cascader](/en/components/cascader) —— Multi-level linked selection supporting submission at any level and path display.
- [TreeSelect](/en/components/tree-select) —— Tree-structure selection supporting parent-child cascaded multiple selection.
- [Mentions](/en/components/mentions) —— A mention input component that pops a suggestion overlay when typing `@`, suited for @member / @task scenarios.
- [DatePicker](/en/components/date-picker) —— A date picker supporting four types — single date, date range, month, and datetime — with keyboard operation and `Intl.DateTimeFormat` formatting.
- [TimePicker](/en/components/time-picker) —— A time picker with dropdown hour/minute/second columns; `↑`/`↓` adjusts, `Enter` confirms, `Esc` cancels, and stepping intervals are supported.
- [Calendar](/en/components/calendar) —— A calendar component with month/year modes, supporting selection, disabled dates, week numbers, and keyboard grid navigation; date descriptions use `Intl.DateTimeFormat` (locale-aware).
- [Upload](/en/components/upload) —— Click or drag to select files; displays the file list and upload progress.
- [Transfer](/en/components/transfer) —— Dual left/right panels with shuttle buttons in the middle, supporting search filtering and keyboard operation.
- [ColorPicker](/en/components/color-picker) —— Click the trigger swatch to open a color panel, supporting preset colors, HSV, and RGB input.
- [ToggleButton](/en/components/toggle-button) —— An `aria-pressed` two-state toggle button; the pressed state uses the primary color background.
- [ToggleGroup](/en/components/toggle-group) —— A mutually exclusive button group for single/multiple selection: single mode uses radio semantics, multiple mode uses checkbox semantics; keyboard arrow navigation and controlled `value`.
- [PinInput](/en/components/pin-input) —— A segmented code input supporting keyboard arrow navigation, Backspace fallback, and paste auto-distribution.
- [DynamicInput](/en/components/dynamic-input) —— Add/remove/edit for array fields; each row reuses the `oas-input` component, supporting both controlled and uncontrolled modes.
- [DynamicTags](/en/components/dynamic-tags) —— Type in the input and press Enter/comma to create tags; supports deduplication, a maximum limit, and keyboard deletion.
- [Editable](/en/components/editable) —— Click/Enter/Space enters edit mode; Enter submits, Esc cancels, and empty-value submission is non-destructive by default.
- [Form](/en/components/form) —— An enhanced native `<form>` supporting validation and submission of inner fields according to `rules`.

## Feedback

- [Message](/en/components/message) —— Imperative global message notifications with support for types, custom duration, and manual dismissal.
- [Notification](/en/components/notification) —— Notification cards in the top-right corner, supporting title, description, duration, and type.
- [Toast](/en/components/toast) —— Imperative global toasts supporting success/error/warning/info/loading states, action buttons, and promise chains; auto-dismisses after 3 seconds by default.
- [Snackbar](/en/components/snackbar) —— A lightweight feedback bar that slides in from the bottom (or top). The `open` attribute is controlled; it can include an action button and dispatches `oas-close` after 4 seconds by default, leaving dismissal to the host.
- [Backdrop](/en/components/backdrop) —— A full-screen semi-transparent overlay with `transparent`/`blur` variants and body scroll locking; the node is automatically unmounted when `open=false`, leaving no orphan DOM.
- [Modal](/en/components/modal) —— A modal dialog for interrupting flows that require user confirmation or input.
- [Confirm](/en/components/confirm) —— Imperative confirmation dialog based on Promises, reusing `oas-modal` under the hood.
- [Drawer](/en/components/drawer) —— A panel that slides in from the side, often used for filters, details, and similar scenarios.
- [Popconfirm](/en/components/popconfirm) —— Shows a confirmation bubble next to the trigger element, commonly used before destructive actions like deletion.
- [Alert](/en/components/alert) —— An inline notice bar for success, info, warning, or error messages, with support for a custom title and a close button.
- [Progress](/en/components/progress) —— Shows task progress, supporting line and circle forms, status colors, and hidden text.
- [LoadingBar](/en/components/loading-bar) —— A global loading progress bar at the top of the page, driven by an imperative API.
- [Spin](/en/components/spin) —— A loading indicator that can be used standalone or wrap content with an overlaid mask.
- [Skeleton](/en/components/skeleton) —— A placeholder skeleton for loading states, supporting an avatar, title, multiple paragraph rows, and a shimmer animation.
- [Empty](/en/components/empty) —— A placeholder for empty data, supporting custom descriptions, custom illustrations with sizing, and hiding the illustration or action area.
- [Result](/en/components/result) —— A result feedback page supporting four states: success, error, warning, and info.

## Navigation & Overlays

- [Tooltip](/en/components/tooltip) —— A simple text prompt bubble triggered on hover or keyboard focus.
- [Popover](/en/components/popover) —— A click-triggered popup panel that can hold a title, body text and arbitrary custom content.
- [Menu](/en/components/menu) —— A standalone menu list with selection state and keyboard navigation.
- [Dropdown](/en/components/dropdown) —— A click-triggered menu that opens anchored to the trigger element.
- [ContextMenu](/en/components/context-menu) —— A right-click menu that opens at the mouse position within its wrapped region.
- [HoverCard](/en/components/hover-card) —— A preview card triggered on hover/focus with configurable delay.
- [Breadcrumb](/en/components/breadcrumb) —— Shows the page hierarchy path; the last item is the current page (not clickable).
- [Anchor](/en/components/anchor) —— Tracks the current section on scroll and highlights it automatically; clicking an anchor smooth-scrolls to the target.
- [BackTop](/en/components/back-top) —— A back-to-top button fixed to a corner of the viewport; clicking it smooth-scrolls back to the top of the page.
- [Tour](/en/components/tour) —— Step-by-step feature onboarding with a fullscreen overlay and target highlighting.
- [Command](/en/components/command) —— A command palette (⌘K / Ctrl+K) — search filtering, keyboard selection and Enter to execute. `open` is controlled: it can be set externally, and the global ⌘K shortcut or Esc closes it (closing fires `oas-select` / removes `open`).
- [Menubar](/en/components/menubar) —— A desktop-app-style top menu bar (File / Edit / View). Click or hover expands submenus (cascading popups), with arrow key support, `Alt` access keys and a focus trap.
- [NavigationMenu](/en/components/navigation-menu) —— A website-style multi-level navigation bar: hover / keyboard expands submenus (cascading popups); leaf items with `href` render as links.
- [Toolbar](/en/components/toolbar) —— A container for groups of tool buttons: `role="toolbar"` + `aria-label`, `Tab` enters and arrow keys move between buttons (roving tabindex — only the current item is focused).

## Navigation & Layout

- [Tabs](/en/components/tabs) —— Tab-based content switching with arrow-key navigation; inactive panels are hidden via the `hidden` attribute. Use `oas-tabs` together with `oas-tab-panel`.
- [BottomNavigation](/en/components/bottom-navigation) —— A mobile bottom navigation bar: `role="tablist"` with each item `role="tab"` + synced `aria-selected`; arrow keys move focus (roving tabindex), Enter/Space selects; the active item uses the primary color plus an icon, with a thin top divider.
- [Pagination](/en/components/pagination) —— Data pagination navigation with page-number ellipsis, prev/next flipping, configurable sibling page count, total display, page-size switching and quick jump.
- [Steps](/en/components/steps) —— A step indicator that guides users through a task, with four states (wait / process / finish / error), vertical layout and clickable navigation.
- [Segmented](/en/components/segmented) —— A single-select linear segmented control for light filtering / view switching, `role="radiogroup"`, with per-item disabling.
- [Affix](/en/components/affix) —— Pins content to the top of the viewport; it becomes fixed once the page scrolls past a given offset. Commonly used for fixed table action bars, toolbars, etc.
- [Splitter](/en/components/splitter) —— A split component that resizes the left/right panel widths, adjustable via mouse drag or arrow keys.
- [ScrollArea](/en/components/scroll-area) —— A container that wraps content and takes over the scrollbar appearance: a thin custom scrollbar that thickens on hover; with `auto-hide` it is only shown while scrolling or hovering, and scroll events are throttled.
- [Flex](/en/components/flex) —— A layout container based on CSS Flexbox; attributes control direction, main/cross-axis alignment, gap and wrapping.
- [PageHeader](/en/components/page-header) —— A page header information area with title, subtitle, back button and a right-side action area. Commonly used at the top of detail and edit pages.
- [FloatButton](/en/components/float-button) —— A circular action button fixed to the bottom-right corner of the page by default, for quick actions like "New" and "Feedback"; supports a badge and a custom icon.
- [SpeedDial](/en/components/speed-dial) —— A floating main button that expands a list of sub-actions, commonly used for quick actions like "New/Share"; `aria-expanded` stays in sync, clicking outside / Esc collapses it, with no orphan popups.
- [Layout](/en/components/layout) —— A classic page skeleton of header + sider + content + footer, used with semantic child components.
- [Sidebar](/en/components/sidebar) —— A collapsible side bar: on desktop, `collapsed` narrows it to an icon strip; on mobile (narrower than `mobile-breakpoint`, default 768px) it automatically becomes an overlay drawer with a backdrop. Clicking outside, the close button or Esc collapses it.
- [Container](/en/components/container) —— A fixed-width, centered container: `size` maps to `--oas-container-*` width tokens, `margin-inline: auto` centers it (logical property, RTL-compliant automatically), and `max-width: min(100%, token)` prevents overflow on narrow screens.
- [Grid](/en/components/grid) —— A 24-column grid layout system. Pair it with `oas-grid-item` to divide column widths, with support for gap, offset and a custom total column count; setting `columns` switches to an auto equal-width layout (simple-grid).

## Data Display

- [Table](/en/components/table) —— Displays structured data in a row-and-column grid with sorting, row selection, multi-select, and a loading state. It can be wired together with a pagination component.
- [Tree](/en/components/tree) —— Displays hierarchical data with support for selection, expansion, multi-select, lazy loading, and node drag-and-drop.
- [VirtualList](/en/components/virtual-list) —— Renders large data lists into the viewport window: only visible items (plus a top/bottom buffer) are rendered, with head/tail padding placeholders to support the scroll height, and scroll events throttled via rAF. It is a generic rendering primitive reused by table / tree.
- [Card](/en/components/card) —— An information container that groups a set of related content.
- [Avatar](/en/components/avatar) —— Displays a user or object avatar, supporting both text-placeholder and image forms.
- [Image](/en/components/image) —— Displays image resources, with an optional built-in preview feature.
- [QRCode](/en/components/qrcode) —— A QR code component based on a **pure TypeScript, zero-dependency encoder** (built in-house) that outputs inline SVG and is scannable and downloadable.
- [Watermark](/en/components/watermark) —— A container-level watermark layer that sits on top of the content without intercepting any interaction, suitable for preventing sensitive information from leaking.
- [Collapse](/en/components/collapse) —— Stows content in collapsible panels to keep the focus on key information.
- [Descriptions](/en/components/descriptions) —— Displays read-only information in groups, suitable for detail page scenarios.
- [Timeline](/en/components/timeline) —— Displays a series of event nodes in chronological order.
- [List](/en/components/list) —— Displays a collection of related items, capable of carrying a title, description, and extra actions.
- [Carousel](/en/components/carousel) —— Cycles through multiple screens of content in the same viewport, with manual switching and autoplay support.
- [Statistic](/en/components/statistic) —— Displays statistical values with `Intl.NumberFormat` thousands separators and precision (locale-aware), supporting prefix/suffix and a skeleton loading placeholder.
- [Countdown](/en/components/countdown) —— A countdown component that refreshes in real time, supports day/hour/minute/second formatting templates, emits `oas-finish` when reaching zero, and automatically cleans up its timer on disconnect.
- [Ellipsis](/en/components/ellipsis) —— Automatically truncates long text with single-line / multi-line clipping; on overflow it shows the full text in a tooltip on hover, and it can also expand / collapse.
- [Chart](/en/components/chart) —— A self-developed SVG chart component (no third-party chart engine) supporting line / bar / pie / area / donut / stacked-bar. Data updates redraw automatically, and animations are disabled under `prefers-reduced-motion`.
- [Code](/en/components/code) —— A code block component (self-developed regex token highlighting, no third-party highlighting engine) supporting basic coloring for common languages, line numbers, and a copy button.
- [Equation](/en/components/equation) —— A math formula component (self-developed simplified LaTeX subset, zero third-party formula engine) covering common high-school / university formulas: superscripts/subscripts, fractions, square roots, summation/integration (with limits), Greek letters, and common operators.
- [Log](/en/components/log) —— A monospace log display container that supports incremental appending and "stick-to-bottom" auto-scrolling, suitable for consoles / build output scenarios.
- [Masonry](/en/components/masonry) —— A masonry layout container based on CSS columns; child items are automatically distributed across columns without being split.
- [Comment](/en/components/comment) —— A purely presentational comment block container that assembles the author avatar, name, time, content, and actions via slots; nested child comments are automatically indented.
- [Marquee](/en/components/marquee) —— A purely presentational component that scrolls long content horizontally in a loop; content cycles seamlessly via a slot. Supports pause on hover and static fallback under `prefers-reduced-motion`. No events.
- [NumberAnimation](/en/components/number-animation) —— An animation component that eases a number from its current value to the target value, stops at the target and emits `oas-finish`; under `prefers-reduced-motion` it jumps straight to the target, and disconnecting cancels the rAF without leaks.
- [GradientText](/en/components/gradient-text) —— A purely presentational component that fills text with a gradient color, implemented with `background-clip: text`; it defaults to a two-color theme-token gradient and supports arbitrary color-stop arrays and directions. No events.
- [AspectRatio](/en/components/aspect-ratio) —— A purely presentational component that locks a container's size to a specified aspect ratio: 100% width with height derived from the ratio, content filling the area and cropped to the ratio; with no children it still occupies space at the ratio. No events.

## Framework Containers

- [ConfigProvider](/en/components/config-provider) —— The injection entry point for global configuration, centrally managing `locale` / `size` / `theme` for the wrapped subtree. Component resolution order: own attribute > config-provider > global default.
- [App](/en/components/app) —— The host container for imperative APIs such as message / notification / loadingBar. When an app container exists, messages mount inside it (instead of `document.body`); works well with config-provider.
- [ThemeEditor](/en/components/theme-editor) —— Edit `--oas-*` theme tokens in real time: color tokens use a color picker, numeric tokens use a number input (displayed without the unit, written back with the original unit). Edits are written to host CSS variables immediately, so the subtree previews them live. By default, tokens are grouped into colors / font sizes / spacing / radius / control heights.
