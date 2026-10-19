/**
 * 生成发布用 theme/index.css（去掉源码注释；源码仍保留在 index.source.css）。
 *
 * 不引入 CSS minifier 依赖：只移除块注释，保留所有选择器/值/变量的原始语义。
 * 这样 `@oas-ui/theme`、CDN `/index.css` 等既有入口不变，消费者默认拿到的
 * 是更小的 CSS；维护者继续编辑 index.source.css。
 */
import { readFileSync, writeFileSync, watchFile } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = resolve(root, 'packages/theme/index.source.css')
const target = resolve(root, 'packages/theme/index.css')
const header =
  '/* Generated from index.source.css by scripts/theme/minify-css.mjs. Edit index.source.css, then run pnpm --filter @oas-ui/theme build. */\n'

function render() {
  const sourceCss = readFileSync(source, 'utf8')
  const css = sourceCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
  return `${header}${css}`
}

function generate(check = false) {
  const next = render()
  if (check) {
    const current = (() => {
      try {
        return readFileSync(target, 'utf8')
      } catch {
        return ''
      }
    })()
    if (current !== next) {
      console.error('[theme:min] index.css 与 index.source.css 不一致，请重新生成')
      process.exitCode = 1
    }
    return
  }
  writeFileSync(target, next)
  console.log(`[theme:min] wrote ${target} (${Buffer.byteLength(next)} bytes)`)
}

if (process.argv.includes('--check')) {
  generate(true)
} else {
  generate()
  if (process.argv.includes('--watch')) {
    watchFile(source, { interval: 250 }, () => {
      try {
        generate()
      } catch (error) {
        console.error('[theme:min] watch regenerate failed', error)
      }
    })
  }
}
