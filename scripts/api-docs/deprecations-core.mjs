/**
 * 废弃台账校验规则（纯函数）——供 `deprecations.mjs` CLI 与自测 `deprecations.test.mjs` 共用。
 *
 * 规则：
 * - removeIn 版本纪律：非空必须是高于当前版本的 major；
 * - 唯一豁免（单点例外）：`package-export` 面可携带 `minorException`（经用户批准、
 *   必填非空 reason）换取非 major 的 removeIn——仅限「默认入口等价别名」类的包导出
 *   路径移除；该豁免**不适用且永不适用**于任何组件 API 面（attribute/prop/event/
 *   method/css-var/export），普通 minor 移除一律拒绝；
 * - manifest 对账：非 '@' tag 的 alias，canonical 必须出现在对应组件的 API 清单里；
 * - 源码对账：normalizeLegacyAlias(primary, legacy) 调用必须登记（state ≠ removed）。
 */

/** 允许携带 minorException 的唯一面 */
export const MINOR_EXCEPTION_SURFACE = 'package-export'

/**
 * 单点例外判定：package-export 面 + 显式 minorException 对象（含非空 reason）。
 * 任何其他面（组件 API）携带 minorException 一律不算例外——checker 仍按 major 纪律拒绝。
 */
export function isApprovedMinorException(entry) {
  return (
    entry.surface === MINOR_EXCEPTION_SURFACE &&
    entry.minorException != null &&
    typeof entry.minorException === 'object' &&
    !Array.isArray(entry.minorException) &&
    typeof entry.minorException.reason === 'string' &&
    entry.minorException.reason.trim() !== ''
  )
}

/**
 * 汇总台账问题（不读写文件、不做 IO——CLI 负责装载 ledger/manifest/sourceCalls）。
 * 返回 string[]，空数组 = 通过。
 */
export function collectProblems({ entries = [], currentVersion, manifest = {}, sourceCalls = [] }) {
  const problems = []
  const ids = new Set()
  const currentMajor = Number(String(currentVersion).split('.')[0])

  for (const entry of entries) {
    if (ids.has(entry.id)) problems.push(`重复 id：${entry.id}`)
    ids.add(entry.id)

    // package-export 面形状：tag 是包名；legacy/canonical 必须落在该包路径下
    if (entry.surface === MINOR_EXCEPTION_SURFACE) {
      if (!String(entry.tag).startsWith('@')) {
        problems.push(`${entry.id} package-export 条目的 tag 必须是包名（当前 ${entry.tag}）`)
      }
      for (const field of ['legacy', 'canonical']) {
        if (entry[field] != null && !String(entry[field]).startsWith(`${entry.tag}/`)) {
          problems.push(`${entry.id} package-export ${field}=${entry[field]} 必须以 ${entry.tag}/ 开头`)
        }
      }
    }

    // 豁免泛化防护：minorException 仅限 package-export 面，且必须有非空理由
    if (entry.minorException != null && entry.surface !== MINOR_EXCEPTION_SURFACE) {
      problems.push(
        `${entry.id} minorException 仅限 ${MINOR_EXCEPTION_SURFACE} 面（${entry.surface} 不得豁免 minor 移除）`,
      )
    } else if (entry.minorException != null && !isApprovedMinorException(entry)) {
      problems.push(`${entry.id} minorException 必须是含非空 reason 的对象（经批准的例外须记录理由与批准方）`)
    }

    // 版本纪律：removeIn 只能是 null 或高于当前版本的 major；唯一豁免是
    // package-export 面经用户批准的单点例外（DEP-EXPORT-0001 先例）
    if (entry.removeIn != null) {
      const major = Number(String(entry.removeIn).split('.')[0])
      if (!Number.isFinite(major) || major <= currentMajor) {
        if (!isApprovedMinorException(entry)) {
          problems.push(
            `${entry.id} removeIn=${entry.removeIn} 必须是高于 ${currentVersion} 的 major` +
              `（非 major 移除仅限经用户批准的 ${MINOR_EXCEPTION_SURFACE} 单点例外，见台账 minorException）`,
          )
        }
      }
    }

    // 组件 API 面：manifest 对账（'@' 开头的包级条目无组件 manifest，跳过）
    if (entry.tag.startsWith('@')) continue
    const man = manifest[entry.tag]
    if (!man) {
      problems.push(`${entry.id} tag 不存在于 manifest：${entry.tag}`)
      continue
    }
    if (entry.state === 'removed' || !entry.canonical) continue
    const names =
      entry.surface === 'event'
        ? new Set(man.events.map((e) => e.name))
        : entry.surface === 'method'
          ? new Set((man.methods ?? []).map((m) => m.name))
          : new Set([...man.attrs.map((a) => a.name), ...man.props.map((p) => p.name)])
    if (!names.has(entry.canonical)) {
      problems.push(`${entry.id} canonical ${entry.canonical} 不在 ${entry.tag} 的 API 中`)
    }
  }

  // 源码 normalizeLegacyAlias 调用对账
  for (const call of sourceCalls) {
    const tags = Object.entries(manifest)
      .filter(([, man]) => man.sourceFile === call.file)
      .map(([tag]) => tag)
    const hit = entries.some(
      (entry) =>
        tags.includes(entry.tag) &&
        entry.legacy === call.legacy &&
        entry.canonical === call.canonical &&
        entry.state !== 'removed',
    )
    if (!hit) {
      problems.push(
        `未登记别名：${call.file} :: ${call.legacy} -> ${call.canonical}（tag: ${tags.join(', ') || '未知'}）`,
      )
    }
  }

  return problems
}
