/** 手工 Methods 页面清单（gen 跳过生成方法与 check-manual-pages 对账共用） */
export const MANUAL_METHODS_PAGE_FILES = ['avatar.md', 'collapse.md', 'form.md', 'image.md', 'toolbar.md']

export const MANUAL_METHODS_PAGES = MANUAL_METHODS_PAGE_FILES.flatMap((file) => [
  `components/${file}`,
  `en/components/${file}`,
])
