/**
 * 行内「交互宿主」排除清单（单一事实来源）。
 *
 * table 三种行级手势统一引用本常量，语义一致：落在清单内交互宿主上的点击/双击
 * 不连带行级手势——①行点击不切换选中/不派发 oas-row-click/不触发 update() 重建
 * body（否则点单元格内嵌浮层触发重建，会把刚打开的浮层销毁成默认关闭）；
 * ②可编辑表格双击不进编辑（把内嵌控件的连点误判为「双击编辑」会误入编辑态）。
 * oas-table.ts 与 oas-table-edit.ts（L3 能力包，独立按需入口）共用本模块。
 *
 * 常量放独立叶子模块而非从 oas-table.ts 导出：编辑能力包（data/table/edit 子路径）
 * 与其宿主核心（data/table）保持「能力包 → 共享叶子 → 宿主核心」的依赖方向——编辑
 * 能力目前只以 `import type` 引用 oas-table.ts，若为常量做值导入会把整棵核心模块
 * （OASElement/虚拟滚动等）拖进能力包按需代码路径，破坏能力包的可裁剪独立入口设计；
 * 能力注册表（oas-table-capability.ts）已是同类共享叶子先例，本模块沿用。
 *
 * 清单构成：
 * - 原生控件：button / a / input / select / textarea（键盘可达、自带交互语义）
 * - 通用启发兜底：[role]——命中一切带 role 的 ARIA 交互宿主（结构化弹层内部区域等）
 * - 组件库交互组件点名：自定义组件宿主自身常无 role（如 oas-button），shadow 内部点击
 *   重定向到宿主后靠点名命中；漏点会「行点击 + 控件点击」双重响应（历史缺陷）
 * - 业务逃生口：[data-oas-row-click-ignore]——行内自定义交互内容（图表、迷你挂件等）
 *   在容器上标注即可豁免行点击/行编辑，不必等库发版扩展本清单
 *
 * ⚠️ 维护纪律：库内新增交互型组件（可被放进表格单元格/行内的表单控件、行内动作触发器、
 * 选择器、编辑类组件）必须同步追加到本清单；纯展示型组件（oas-tag / oas-progress /
 * oas-avatar 等徽章、进度、头像类）不消费指针事件，禁止加——加了会误伤「点击内容
 * 区域进编辑/选行」的合法行级手势。
 */
export const ROW_INTERACTIVE_EXCLUSION = [
  // 原生交互控件
  'button',
  'a',
  'input',
  'select',
  'textarea',
  // ARIA 交互宿主通用兜底（带 role 的元素）
  '[role]',
  // OAS-UI 交互组件点名（宿主无 role，须逐一点名）
  'oas-button',
  'oas-popconfirm',
  'oas-link',
  'oas-input',
  'oas-textarea',
  'oas-select',
  'oas-checkbox',
  'oas-radio',
  'oas-switch',
  'oas-slider',
  'oas-rate',
  'oas-input-number',
  'oas-pin-input',
  'oas-cascader',
  'oas-combobox',
  'oas-auto-complete',
  'oas-mentions',
  'oas-tree-select',
  'oas-date-picker',
  'oas-time-picker',
  'oas-color-picker',
  'oas-upload',
  'oas-editable',
  'oas-toggle-button',
  'oas-toggle-group',
  'oas-segmented',
  'oas-dynamic-input',
  'oas-dynamic-tags',
  'oas-pagination',
  'oas-dropdown',
  // 业务逃生口：自定义交互内容容器标注即豁免
  '[data-oas-row-click-ignore]',
].join(', ')
