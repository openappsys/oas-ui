#!/usr/bin/env node
/**
 * 在独立 Node 进程里生成 DSD 性能页。
 *
 * 独立进程的原因：`@oas-ui/ssr` 首次渲染会把 happy-dom 的 window/document 安装到 globalThis，
 * 与 Playwright 客户端同进程会让后者的环境探测产生歧义；子进程用完即退，互不影响。
 *
 * 用法：node render-dsd-bench.mjs <outFile> <rootDir>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { HOSTS, THEME_CSS_PATH } from './bench-fixture.mjs'

const [outFile, rootDir] = process.argv.slice(2)
if (!outFile || !rootDir) {
  console.error('[perf:browser] render-dsd-bench 需要 <outFile> <rootDir>')
  process.exit(1)
}

const { renderToString } = await import(pathToFileURL(join(rootDir, 'packages/ssr/dist/index.js')).href)
const themeCss = readFileSync(THEME_CSS_PATH, 'utf8')

const blocks = []
for (const host of HOSTS) {
  blocks.push(await renderToString(host.tag, host.attrs ?? {}, host.slot ?? ''))
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OAS-UI DSD performance fixture</title>
<style>${themeCss}</style>
<style>
  body { margin: 0; padding: 24px; background: var(--oas-color-bg-hover); color: var(--oas-color-text-primary); font-family: system-ui, sans-serif; }
  #root { display: flex; flex-direction: column; gap: 12px; max-width: 860px; margin: 0 auto; }
</style>
</head>
<body>
<div id="root" data-bench="dsd">
${blocks.join('\n')}
</div>
<script type="module" src="/dsd.js"></script>
</body>
</html>`

writeFileSync(outFile, html, 'utf8')
console.log(`[perf:browser] DSD page written: ${outFile}`)
