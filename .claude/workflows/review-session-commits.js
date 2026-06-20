export const meta = {
  name: 'review-session-commits',
  description: 'Adversarially review this session\'s extension + dashboard commits',
  phases: [
    { title: 'Review', detail: 'three reviewers over commit groups' },
    { title: 'Verify', detail: 'two adversarial refuters per finding' },
  ],
}

const REPO = '/Users/adnane/Documents/Codex/2026-05-17/files-mentioned-by-the-user-cleanshot/job-hunt-cockpit'

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'file', 'severity', 'description'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          description: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const COMMON = `Repo: ${REPO}. Review ONLY for real, demonstrable bugs: broken references, contract mismatches between files, logic errors, regressions. NOT style, NOT hypotheticals, NOT "consider adding". Read the actual current files to confirm each suspicion before reporting. Report at most your 5 strongest findings.`

const DIMENSIONS = [
  {
    key: 'extension-core',
    prompt: `${COMMON}
Area: Chrome extension core (commits 6fa713b and c24b745). Run: git -C ${REPO} show 6fa713b -- extension/content.js extension/background.js extension/manifest.json | head -800, and git -C ${REPO} show c24b745. Then read the CURRENT extension/content.js, extension/background.js, extension/manifest.json.
Focus: (1) IS_TOP_FRAME gating — does any code path inject UI or respond wrongly in subframes? (2) message contract: AUTOFILL_FORM/AUTOFILL_FRAME/JH_BROADCAST_AUTOFILL/JH_RELAY_TOAST/SHOW_TOAST routed via background — any infinite relay loops, double-fill paths the 4s debounce misses, or messages sent to a tab that has no listener? (3) injectCvFileToInputs + findResumeFileInputs: correctness of the scoring/fallback, the base64 decode, the files assignment; does cvLabel exist in scope where cvVariantForFile is computed? (4) manifest all_frames + no default_popup: does background action.onClicked still work and does popup.js still get used anywhere? (5) The toolbar CSS restyle: any selectors referenced by JS (jh-no-form, jh-dragging) that the new CSS dropped?`,
  },
  {
    key: 'popup',
    prompt: `${COMMON}
Area: extension popup (commit 6fa713b popup files). Read CURRENT extension/popup.html, extension/popup.js, extension/popup.css fully.
Focus: (1) every DOM id referenced in popup.js exists in popup.html and vice versa; (2) the new simplifyStatus + status select values round-trip against server.mjs simplifyStatus (read that function); (3) Saved-status handling: does buildCurrentPayload/setForm/openTrackerView produce a record the server treats as saved-not-applied? (4) refreshServerStatus/setServerState/renderCvChip/refreshCvChips logic: any state where buttons stay wrongly disabled or chips show wrong state; (5) CV meta endpoint shape matches database.mjs sqlLoadCvMeta; (6) with no default_popup in manifest.json, is anything in popup.js now dead-but-harmful (e.g. does the popup ever open)? Note: removing default_popup was a deliberate user decision — do not report it as a bug itself.`,
  },
  {
    key: 'dashboard-server',
    prompt: `${COMMON}
Area: dashboard + server/db changes (commits 4a89656, 8f9f332, b759d17). Run git -C ${REPO} show --stat for each, then read the CURRENT src/components/Dashboard.jsx (components QuickAddForm, DashboardPulse, SidePanel stage-outcome block, RoleRow), src/lib/metrics.mjs (buildAttentionItems), database.mjs sqlSaveApplications/sqlLoadApplications, and server.mjs normalizeStagePassedAt + normalizeApplication stagePassedAt wiring + sanitizeAutofillMappings.
Focus: (1) database INSERT column list vs VALUES placeholder count vs stmt.run argument order — verify they align EXACTLY (count them); (2) stagePassedAt round-trip: Dashboard PUT sends full app object — can any code path drop stagePassedAt or oaCompletedAt (e.g. QuickAddForm payload, handleStatusChange, handleQuickStatusChange spreading)? (3) buildAttentionItems correctness incl. the new skip rule; (4) QuickAddForm: duplicate-submit, dedupe interaction with server POST, stageDateTimes it sends; (5) sanitizeAutofillMappings regex — false positives on legitimate values (e.g. a real google.com careers URL is acceptable to scrub, but would it scrub e.g. "googleplex" or normal sentences?); (6) the "/" shortcut and Esc interactions conflicting with existing handlers (StatusPicker Esc, SidePanel Esc, QuickAdd Esc all on window).`,
  },
]

phase('Review')
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (review, d) => {
    if (!review || !review.findings.length) return []
    return parallel(review.findings.map((f) => () =>
      parallel([1, 2].map((n) => () =>
        agent(
          `Repo: ${REPO}. A code reviewer claims this bug in area "${d.key}":\nTitle: ${f.title}\nFile: ${f.file}${f.line ? ` line ~${f.line}` : ''}\nSeverity: ${f.severity}\nClaim: ${f.description}\n\nYour job: try to REFUTE it. Read the actual file(s) and trace the exact code path. The claim is only real if the bug is demonstrable in the current code as written. If the claim is speculative, mitigated elsewhere, or based on a misreading, refuted=true. Default to refuted=true if uncertain.`,
          { label: `verify:${f.title.slice(0, 40)}`, phase: 'Verify', schema: VERDICT_SCHEMA }
        )
      )).then((votes) => ({
        ...f,
        area: d.key,
        confirmed: votes.filter(Boolean).filter((v) => !v.refuted).length >= 2,
        reasons: votes.filter(Boolean).map((v) => v.reason),
      }))
    ))
  }
)

const all = results.flat().filter(Boolean)
return {
  confirmed: all.filter((f) => f.confirmed),
  rejected: all.filter((f) => !f.confirmed).map(({ title, area }) => ({ title, area })),
}