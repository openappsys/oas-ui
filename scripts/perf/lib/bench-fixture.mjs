/**
 * 真实浏览器性能基线的固定 fixture（CSR / DSD 共用同一组组件与属性）。
 *
 * 口径：只反映「注册 + 首屏渲染」成本，不做交互动画；CSR 与 DSD 的宿主标签、属性、
 * light DOM 文案完全一致，差异只在 DSD 版本的首屏由服务端快照直出。
 */
import { join } from 'node:path'

export const ROOT = join(import.meta.dirname, '../../..')
export const THEME_CSS_PATH = join(ROOT, 'packages/theme/index.css')

const TABLE_COLUMNS = JSON.stringify([
  { key: 'id', title: 'ID' },
  { key: 'name', title: 'Component' },
  { key: 'status', title: 'Status' },
])

const TABLE_ROWS = JSON.stringify(
  Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `oas-component-${index + 1}`,
    status: index % 3 === 0 ? 'ready' : index % 3 === 1 ? 'review' : 'draft',
  })),
)

export const HOSTS = [
  { tag: 'oas-empty', attrs: {} },
  { tag: 'oas-tag', attrs: { type: 'success' }, slot: 'Shipped' },
  { tag: 'oas-button', attrs: { type: 'primary' }, slot: 'Submit' },
  {
    tag: 'oas-alert',
    attrs: { type: 'info', title: 'Performance baseline' },
    slot: 'Measured from navigation start in a production build.',
  },
  { tag: 'oas-progress', attrs: { percent: '62', 'show-text': 'true' } },
  { tag: 'oas-avatar', attrs: { size: '40' }, slot: 'OA' },
  { tag: 'oas-switch', attrs: { checked: 'true' } },
  { tag: 'oas-input', attrs: { placeholder: 'Search components', value: 'table' } },
  {
    tag: 'oas-tool-call',
    attrs: {
      name: 'search_docs',
      summary: 'Search the API reference',
      status: 'success',
      args: '{"query":"oas-ui"}',
      result: '{"hits":3}',
      open: '',
    },
  },
  { tag: 'oas-select', attrs: { options: JSON.stringify([{ label: 'Alpha', value: 'a' }]) } },
  { tag: 'oas-table', attrs: { columns: TABLE_COLUMNS, data: TABLE_ROWS, bordered: 'true' } },
  { tag: 'oas-card', attrs: {}, slot: '<strong>Card</strong> content stays in light DOM.' },
]

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** CSR 版的 light DOM 标记（与 DSD 快照同宿主/属性/文案，只是没有 shadow 内容） */
export function lightMarkup() {
  return HOSTS.map(({ tag, attrs, slot }) => {
    const attributes = Object.entries(attrs ?? {})
      .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
      .join('')
    return `<${tag}${attributes}>${slot ?? ''}</${tag}>`
  }).join('\n')
}
