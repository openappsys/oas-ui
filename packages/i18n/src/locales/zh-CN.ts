/**
 * 中文（简体）语言包 —— locale key 全集基准（单一事实源）。
 *
 * 命名规范：`{component}.{语义}`，如 empty.noData / modal.ok / pagination.prev。
 * 新增组件内置文案必须先在此补 key（en 包同步补齐，completeness 测试兜底）。
 */
export const zhCN = {
  // modal（对话框）
  'modal.close': '关闭',
  'modal.ok': '确定',
  'modal.cancel': '取消',
  // confirm（命令式确认弹窗）
  'confirm.ok': '确定',
  'confirm.cancel': '取消',
  // empty（空态占位）
  'empty.noData': '暂无数据',
  // alert（警告提示）
  'alert.close': '关闭',
  // drawer（抽屉）
  'drawer.close': '关闭',
  'drawer.ok': '确定',
  'drawer.cancel': '取消',
  // message（全局消息）
  'message.close': '关闭',
  // notification（通知提醒）
  'notification.close': '关闭',
  'notification.region': '通知',
  // popconfirm（气泡确认）
  'popconfirm.ok': '确定',
  'popconfirm.cancel': '取消',
  // select（选择器）
  'select.search': '搜索选项',
  'select.placeholder': '请选择',
  'select.empty': '暂无数据',
  'select.noMatch': '无匹配选项',
  'select.remove': '移除 {label}',
  // cascader（级联选择）
  'cascader.placeholder': '请选择',
  // tree-select（树选择）
  'treeSelect.placeholder': '请选择',
  'treeSelect.empty': '暂无数据',
  'treeSelect.join': '、',
  'treeSelect.andMore': '等 {count} 项',
  // auto-complete（自动完成）
  'autoComplete.noMatch': '无匹配结果',
  // input（输入框）
  'input.clear': '清除',
  'input.defaultLabel': '输入框',
  // input-number（数字输入框）
  'inputNumber.increase': '增加',
  'inputNumber.decrease': '减少',
  'inputNumber.defaultLabel': '数字输入框',
  // rate（评分）
  'rate.rate': '评分',
  // form（表单校验）
  'form.validationFailed': '校验未通过',
  // tour（漫游引导）
  'tour.skip': '跳过',
  'tour.prev': '上一步',
  'tour.next': '下一步',
  'tour.finish': '完成',
  // anchor（锚点导航）
  'anchor.nav': '锚点导航',
  // breadcrumb（面包屑）
  'breadcrumb.nav': '面包屑',
  // back-top（回到顶部）
  'backTop.backToTop': '回到顶部',
  // page-header（页头）
  'pageHeader.back': '返回',
  // splitter（分割面板）
  'splitter.adjust': '调整面板宽度',
  // layout（布局容器）
  'layout.sider': '侧边栏',
  // float-button（悬浮按钮）
  'floatButton.action': '悬浮操作',
  // pagination（分页）
  'pagination.nav': '分页',
  'pagination.prev': '上一页',
  'pagination.next': '下一页',
  'pagination.page': '第 {page} 页',
  // table（表格）
  'table.selectAll': '全选',
  'table.loading': '加载中…',
  'table.empty': '暂无数据',
  'table.selectRow': '选择行 {key}',
  // list（列表）
  'list.empty': '暂无数据',
  // tree（树形控件）
  'tree.expand': '展开/收起',
  'tree.select': '选择 {label}',
  // timeline（时间轴）
  'timeline.pending': '敬请期待',
  // carousel（轮播）
  'carousel.prev': '上一屏',
  'carousel.next': '下一屏',
  'carousel.dot': '第 {index} 张',
  // image（图片）
  'image.loading': '加载中…',
  'image.loadFailed': '图片加载失败',
  'image.defaultAlt': '图片',
  // avatar（头像）
  'avatar.defaultAlt': '头像',
  // typography（排版）
  'typography.copy': '复制',
  // tag（标签）
  'tag.close': '关闭',
  // button-group（按钮组）
  'buttonGroup.group': '按钮组',
  // loading（加载态，通用兜底）
  'loading.loading': '加载中…',
} as const
