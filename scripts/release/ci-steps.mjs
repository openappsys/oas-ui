/**
 * 从 GitHub Actions workflow（YAML 文本）解析指定 job 的 `run:` 步骤清单。
 *
 * 发布 rehearsal（scripts/release/rehearse.mjs）用它把 ci.yml 的 test job 变成
 * 本地门禁清单的单一真源：CI 步骤变更时本地重放自动跟随，清单永不失同步
 * （v2.6.5 事故：发布前漏跑 qa:audit:check，阈值超量在 CI 才暴露）。
 *
 * 解析范围（手写行解析，不引 YAML 库）：
 * - `- run: <单行命令>`
 * - `- run: |`（块标量：按缩进收集后续行，join 成一条命令）
 * - job 边界：从 `  <jobName>:` 行起，到下一个同级 key（两空格缩进 + 非空白）或文件尾
 *
 * fail closed：job 不存在 / 解析出 0 步 / 出现不支持的步骤写法（`- name:` + 缩进 `run:` 混写、
 * `- run: >` 折叠标量）都抛错——解析器与 workflow 格式失配绝不能被静默当成「少跑几步」或
 * 「0 步全过」（混写被静默忽略 = 门禁悄悄少跑，正是本模块要根除的清单失同步）。
 *
 * 边界说明：`- name:` + 缩进 `run:` 形式（ssr-fixtures / e2e job 在用）一旦出现在**被解析
 * 的 job 内**直接抛错（见 fail closed）；其他 job 用什么写法不影响本 job——相邻 job 的
 * 混入防护由 job 边界保证。
 */

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * @param {string} ciYamlText workflow 文件全文
 * @param {string} jobName 两级缩进的 job key（如 'test'）
 * @returns {string[]} 按出现顺序的 run 命令清单（多行块 join 为一条）
 */
export function parseJobRunSteps(ciYamlText, jobName) {
  if (typeof ciYamlText !== 'string' || ciYamlText.trim() === '') {
    throw new Error(`[ci-steps] workflow 文本为空，无法解析 job「${jobName}」——fail closed`)
  }
  const lines = ciYamlText.split(/\r?\n/)

  // job 起点：两空格缩进 + `<jobName>:`（行尾可为空或注释）
  const start = lines.findIndex((l) => new RegExp(`^  ${escapeRegExp(jobName)}:\\s*(#.*)?$`).test(l))
  if (start === -1) {
    throw new Error(
      `[ci-steps] workflow 中找不到 job「${jobName}」（期望「  ${jobName}:」两空格缩进行）——` +
        '解析器与 workflow 格式失配，fail closed',
    )
  }

  // job body：到下一个同级 key（`  <非空白>`）或文件尾
  const body = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^  \S/.test(lines[i])) break
    body.push(lines[i])
  }

  const steps = []
  for (let i = 0; i < body.length; i++) {
    // `- name:` 步骤（无论是否带缩进 run:）显式拒绝：静默忽略 = 门禁悄悄少跑几步；
    // 重放清单只认 `- run:` 单行 / `- run: |` 块标量两种形态
    if (/^\s*-\s+name:/.test(body[i])) {
      throw new Error(
        `[ci-steps] job「${jobName}」存在不支持的步骤写法（${body[i].trim()}）——` +
          '请改用 `- run: <命令>` 或 `- run: |`，或检修解析器（fail closed，不静默丢步）',
      )
    }
    const m = body[i].match(/^(\s*)-\s+run:\s*(.*)$/)
    if (!m) continue
    const runIndent = m[1].length
    const rest = m[2].trim()
    if (/^>[-+]?$/.test(rest)) {
      // 折叠标量按空格拼单行，与块标量的换行 join 执行语义不同——显式拒绝，不误拼
      throw new Error(
        `[ci-steps] job「${jobName}」使用了不支持的折叠标量「- run: ${rest}」——` +
          '请改用 `- run: <命令>` 或 `- run: |`（fail closed，不按块标量误拼）',
      )
    }
    if (/^[|][+-]?$/.test(rest)) {
      // 块标量：收集缩进大于 run 行的连续行；首个非空行的缩进定基准，缩进回退即块结束
      const block = []
      let baseIndent = null
      // 块内最后一个被消费的行索引（空行也算消费）：外层循环必须推进过它，
      // 否则块内容里的 `- run: ...` / `- name: ...` 会被当成新步骤再次命中
      //（前者同一命令重复执行，后者误触发写法抛错）
      let lastConsumed = i
      for (let j = i + 1; j < body.length; j++) {
        const l = body[j]
        if (!l.trim()) {
          block.push('')
          lastConsumed = j
          continue
        }
        const indent = l.match(/^\s*/)[0].length
        if (indent <= runIndent) break
        if (baseIndent === null) baseIndent = indent
        if (indent < baseIndent) break
        block.push(l.slice(baseIndent))
        lastConsumed = j
      }
      while (block.length > 0 && block[block.length - 1] === '') block.pop()
      const cmd = block.join('\n').trim()
      if (cmd !== '') steps.push(cmd)
      i = lastConsumed
    } else if (rest !== '') {
      steps.push(rest)
    }
  }

  if (steps.length === 0) {
    throw new Error(
      `[ci-steps] job「${jobName}」解析出 0 个 run: 步骤——解析器与 workflow 格式失配（空 job 也视为失配），fail closed`,
    )
  }
  return steps
}
