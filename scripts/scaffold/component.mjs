#!/usr/bin/env node
/**
 * 新组件脚手架（spec 驱动）。
 *
 * 只生成骨架 + 注册入口；PRD/ROADMAP/CHANGELOG 与文档侧栏仍需人工确认。
 *
 * 用法：
 *   node scripts/scaffold/component.mjs --spec scripts/scaffold/specs/foo.json --dry-run
 *   node scripts/scaffold/component.mjs --spec scripts/scaffold/specs/foo.json
 *   node scripts/scaffold/component.mjs --spec scripts/scaffold/specs/foo.json --check
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const GROUPS = new Set([
  'basic',
  'layout',
  'form',
  'feedback',
  'navigation',
  'data',
  'conversation',
  'workbench',
  'framework',
])

export function normalizeSpec(input) {
  if (!input || typeof input !== 'object') throw new Error('spec 必须是对象')
  const name = String(input.name ?? '').trim()
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('name 必须是 kebab-case')
  const group = String(input.group ?? '').trim()
  if (!GROUPS.has(group)) throw new Error(`group 必须是 ${[...GROUPS].join('/')}`)
  const className = input.className ?? `OAS${name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())}`
  if (!/^OAS[A-Z][A-Za-z0-9]*$/.test(className)) throw new Error('className 必须形如 OASFooBar')
  const tag = input.tag ?? `oas-${name}`
  if (!/^oas-[a-z0-9-]+$/.test(tag)) throw new Error('tag 必须形如 oas-foo-bar')
  const zh = input.zh ?? {}
  const en = input.en ?? {}
  for (const [lang, value] of [
    ['zh', zh],
    ['en', en],
  ]) {
    if (!value.title || !value.summary) throw new Error(`${lang}.title / ${lang}.summary 必填`)
  }
  const attrs = Array.isArray(input.attrs) ? input.attrs : []
  const events = Array.isArray(input.events) ? input.events : []
  const slots = Array.isArray(input.slots) ? input.slots : []
  for (const attr of attrs) {
    if (!attr.name || !/^[a-z][a-z0-9-]*$/.test(attr.name)) throw new Error('attr.name 必须是 kebab-case')
    if (!attr.desc?.zh || !attr.desc?.en) throw new Error(`attr ${attr.name} 缺少 zh/en 说明`)
  }
  for (const event of events) {
    if (!event.name || !/^[a-z][a-z0-9-]*$/.test(event.name)) throw new Error('event.name 不需要 oas- 前缀')
    if (!event.desc?.zh || !event.desc?.en) throw new Error(`event ${event.name} 缺少 zh/en 说明`)
  }
  for (const slot of slots) {
    if (!slot.desc?.zh || !slot.desc?.en) throw new Error(`slot ${slot.name || '(default)'} 缺少 zh/en 说明`)
  }
  return {
    name,
    group,
    className,
    tag,
    ssr: input.ssr === true,
    overlay: input.overlay === true,
    zh,
    en,
    attrs,
    events,
    slots,
  }
}

function componentSource(spec) {
  const observed = spec.attrs.map((a) => `'${a.name}'`).join(', ')
  return `import { OASElement } from '@oas-ui/core'

/**
 * ${spec.zh.summary}
 *
 * @summary ${spec.zh.summary}
 */
export class ${spec.className} extends OASElement {
  static override get observedAttributes(): string[] {
    return [${observed}]
  }

  private template(): string {
    return \`
      <style>
        :host { display: block; }
        :host([hidden]) { display: none !important; }
      </style>
      <div part="root"><slot></slot></div>
    \`
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
  }

  protected override update(): void {
    // 属性变化后的最小同步点；按组件语义补充，不要在这里做重 DOM 全量重建。
  }
}
`
}

function indexSource(spec) {
  return `import { ${spec.className} } from './oas-${spec.name}.js'

if (!customElements.get('${spec.tag}')) {
  customElements.define('${spec.tag}', ${spec.className})
}

export { ${spec.className} }
`
}

function unitTestSource(spec) {
  return `import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ${spec.className} } from './index.js'

describe('${spec.className}', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染宿主并暴露 shadow 骨架', () => {
    const el = new ${spec.className}()
    document.body.appendChild(el)
    expect(el.shadowRoot).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
  })
})
`
}

function qaSource(spec) {
  return `import { expect, test } from '@playwright/test'
import { up } from './helpers'

test('${spec.tag}：基础渲染与可访问性', async ({ page }) => {
  await page.goto('/components/${spec.name}.html', { waitUntil: 'domcontentloaded' })
  await up(page, '${spec.tag}')
  await expect(page.locator('${spec.tag}').first()).toBeVisible()
})
`
}

function docsSource(spec, lang) {
  const title = lang === 'zh' ? spec.zh.title : spec.en.title
  const summary = lang === 'zh' ? spec.zh.summary : spec.en.summary
  const api = spec.attrs.length
    ? [
        '| 属性 | 说明 | 类型 | 默认值 |',
        '| --- | --- | --- | --- |',
        ...spec.attrs.map(
          (a) => `| \`${a.name}\` | ${a.desc[lang]} | \`${a.type ?? 'string'}\` | ${a.default ?? '—'} |`,
        ),
      ].join('\n')
    : '| 属性 | 说明 | 类型 | 默认值 |\n| --- | --- | --- | --- |'
  return `# ${title}

${summary}

<DemoBlock title="${lang === 'zh' ? '基础用法' : 'Basic usage'}">
  <${spec.tag}>${lang === 'zh' ? '内容' : 'Content'}</${spec.tag}>
</DemoBlock>

## API

### ${spec.tag}

#### ${lang === 'zh' ? '属性' : 'Attributes'}

${api}
`
}

function patchIndex(spec, text) {
  const importLine = `import './${spec.group}/${spec.name}/index.js'`
  const exportLine = `export { ${spec.className} } from './${spec.group}/${spec.name}/oas-${spec.name}.js'`
  const lines = text.split('\n')
  if (!lines.includes(importLine)) {
    const lastImport = lines.map((l) => l.startsWith('import ')).lastIndexOf(true)
    lines.splice(lastImport + 1, 0, importLine)
  }
  if (!lines.includes(exportLine)) lines.push(exportLine)
  return lines.join('\n')
}

function patchFamily(spec, text) {
  const line = `import '../${spec.group}/${spec.name}/index.js'`
  return text.includes(line) ? text : `${text.trimEnd()}\n${line}\n`
}

function patchSsrExports(spec, text) {
  const line = `export { ${spec.className} } from './${spec.group}/${spec.name}/oas-${spec.name}.js'`
  return text.includes(line) ? text : `${text.trimEnd()}\n${line}\n`
}

function patchNotSsr(spec, text) {
  const entry = `  { tag: '${spec.tag}', reason: 'pending', note: '脚手架生成，待评估 SSR' },`
  if (text.includes(`'${spec.tag}'`)) return text
  return text.replace(/\n\]\n\nexport const NOT_SSR_TAGS/, `\n${entry}\n]\n\nexport const NOT_SSR_TAGS`)
}

function patchWhitelist(spec, text) {
  if (text.includes(`'${spec.tag}'`)) return text
  return text.replace(/(\] as const)/, `  '${spec.tag}',\n$1`)
}

function patchTagEntry(spec, text) {
  if (text.includes(`'${spec.tag}':`)) return text
  const tagLoaded = text.indexOf('const tagLoaded')
  const tagEntry = text.indexOf('const TAG_ENTRY')
  if (tagLoaded < 0 || tagEntry < 0 || tagLoaded < tagEntry) {
    throw new Error('TAG_ENTRY 补丁失败：未找到 TAG_ENTRY / const tagLoaded 锚点')
  }
  // 在 TAG_ENTRY 之后、tagLoaded 之前的最后一个对象闭合 } 前插入，避免跨段匹配到 LOCALES。
  const close = text.lastIndexOf('\n}', tagLoaded)
  if (close < tagEntry) throw new Error('TAG_ENTRY 补丁失败：未找到对象闭合')
  return `${text.slice(0, close)}\n  '${spec.tag}': '@oas-ui/ui/${spec.group}/${spec.name}',${text.slice(close)}`
}

function patchDescriptions(spec, data, lang) {
  const tag = spec.tag
  const current = data[tag] ?? { attrs: {}, events: {}, slots: {} }
  for (const attr of spec.attrs) current.attrs[attr.name] = attr.desc[lang]
  for (const event of spec.events) current.events[`oas-${event.name}`] = event.desc[lang]
  for (const slot of spec.slots) current.slots[slot.name || ''] = slot.desc[lang]
  data[tag] = current
  return data
}

export function plan(specInput) {
  const spec = normalizeSpec(specInput)
  const dir = `packages/ui/src/${spec.group}/${spec.name}`
  const files = [
    { path: `${dir}/index.ts`, content: indexSource(spec) },
    { path: `${dir}/oas-${spec.name}.ts`, content: componentSource(spec) },
    { path: `${dir}/oas-${spec.name}.test.ts`, content: unitTestSource(spec) },
    { path: `packages/ui/qa-regression/${spec.name}.spec.ts`, content: qaSource(spec) },
    { path: `packages/docs/docs/components/${spec.name}.md`, content: docsSource(spec, 'zh') },
    { path: `packages/docs/docs/en/components/${spec.name}.md`, content: docsSource(spec, 'en') },
  ]
  const patches = [
    { path: 'packages/ui/src/index.ts', fn: (text) => patchIndex(spec, text) },
    { path: `packages/ui/src/families/${spec.group}.ts`, fn: (text) => patchFamily(spec, text) },
    { path: 'packages/ui/src/ssr.ts', fn: (text) => patchSsrExports(spec, text) },
  ]
  if (spec.ssr) {
    patches.push({ path: 'packages/ssr/src/index.ts', fn: (text) => patchTagEntry(spec, patchWhitelist(spec, text)) })
  } else {
    patches.push({ path: 'packages/ssr/src/not-ssr.ts', fn: (text) => patchNotSsr(spec, text) })
  }
  return { spec, files, patches }
}

function applyPlan(planResult, { force = false } = {}) {
  const existing = planResult.files.filter((f) => existsSync(join(ROOT, f.path)))
  if (existing.length && !force) {
    throw new Error(`目标已存在：${existing.map((f) => f.path).join(', ')}（用 --force 覆盖）`)
  }
  for (const file of planResult.files) writeFileSync(join(ROOT, file.path), file.content)
  for (const patch of planResult.patches) {
    const path = join(ROOT, patch.path)
    if (!existsSync(path)) throw new Error(`待补丁文件不存在：${patch.path}`)
    writeFileSync(path, patch.fn(readFileSync(path, 'utf8')))
  }
  const enPath = join(ROOT, 'docs/api-descriptions.en.json')
  const zhPath = join(ROOT, 'docs/api-descriptions.zh.json')
  writeFileSync(
    enPath,
    `${JSON.stringify(patchDescriptions(planResult.spec, JSON.parse(readFileSync(enPath, 'utf8')), 'en'), null, 2)}\n`,
  )
  writeFileSync(
    zhPath,
    `${JSON.stringify(patchDescriptions(planResult.spec, JSON.parse(readFileSync(zhPath, 'utf8')), 'zh'), null, 2)}\n`,
  )
}

function main() {
  const args = process.argv.slice(2)
  const specPath = args[args.indexOf('--spec') + 1]
  if (!specPath) {
    console.error('用法：node scripts/scaffold/component.mjs --spec <spec.json> [--dry-run] [--check] [--force]')
    process.exit(2)
  }
  const spec = JSON.parse(readFileSync(resolve(ROOT, specPath), 'utf8'))
  const result = plan(spec)
  if (args.includes('--check')) {
    console.log(`[scaffold] spec 合法：${result.spec.tag}（${result.spec.group}）`)
    return
  }
  if (args.includes('--dry-run')) {
    console.log(`[scaffold] 将创建 ${result.files.length} 个文件：`)
    for (const file of result.files) console.log(`  + ${file.path}`)
    console.log('[scaffold] 将修改：')
    for (const patch of result.patches) console.log(`  ~ ${patch.path}`)
    console.log('[scaffold] dry-run，未写入')
    return
  }
  applyPlan(result, { force: args.includes('--force') })
  console.log(
    `[scaffold] 已生成 ${result.spec.tag}；请补 PRD/ROADMAP/CHANGELOG、侧栏与真实交互，再跑 pnpm api:scan && pnpm api:gen`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
