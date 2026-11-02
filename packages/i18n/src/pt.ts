/**
 * 兼容别名入口：`import pt from '@oas-ui/i18n/pt'`。
 * 历史 `pt` 文案实际为巴西葡语，现 canonical 名称是 `pt-BR`；
 * 该入口继续可用并指向同一语言包（`pt` / `pt-BR` 两种写法都解析到 `pt-BR`）。
 */
export { ptBR as pt, ptBR as default } from './pt-BR.js'
