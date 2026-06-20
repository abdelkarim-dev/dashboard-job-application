export const meta = {
  name: 'review-claire-yesno-changes',
  description: 'Adversarially review the v1.4.5 extension changes (Yes/No button autofill + auto Applied?->Fill) for regressions and bugs',
  phases: [
    { title: 'Review', detail: 'parallel lenses over the changed code' },
    { title: 'Verify', detail: 'adversarially confirm each finding against the real code' },
  ],
}

const FILE = '/Users/adnane/Documents/Codex/2026-05-17/files-mentioned-by-the-user-cleanshot/job-hunt-cockpit/extension/content.js'

const CONTEXT = `
You are reviewing recent changes in ${FILE} (a ~6900-line Chrome extension content script). DO NOT read the whole file; grep for the named functions and read only those regions.

The changes (v1.4.5) added support for Ashby-style Yes/No questions that render as a HIDDEN <input type=checkbox> backed by visible <button>Yes/No</button> toggles (selected button gets class "_active_..."), plus an auto-open flow. Key changed/added functions to inspect:
- New button-choice block (grep): isButtonChoiceOptionEl, buttonOptionSelected, getButtonChoiceOptions, isHiddenBackingField, isButtonChoiceGroup, getButtonChoiceGroupContainer, buttonChoiceGroupAnswered, getButtonChoiceQuestionText, buttonChoiceGroupLooksLikeQuestion, pickButtonChoiceOption, clickButtonChoiceOption, setButtonChoiceValue, collectButtonChoiceGroups.
- Modified: applyAiValueToField (isChoiceInput branch now resolves a backing button group first; new text-fallback guard), buildAiFieldDescriptor (prefers button-group options), isFieldAlreadyAnswered (checks backing group for choice inputs), getAutofillFieldLabel (button-group question text), autofillWebFormLocked (collectButtonChoiceGroups added to Phase-2 unmatchedFields with dedup), injectWebCopilot (prefillBtn/companyBtn NO LONGER appended; new runAutoOpenFlow assigned to module var runCopilotAutoOpen), the TOGGLE_TOOLBAR message handler (calls runCopilotAutoOpen?.()), renderCompanyPanel (new {onFillAnyway} option), module vars runCopilotAutoOpen/copilotAutoRanForUrl.

Ground truth already verified live: the C++ checkbox resolves to its Yes/No group, clicking "No" works, and real visible radio groups (Rate/Gender/Race/Veteran/Compensation) are NOT misclassified (getButtonChoiceGroupContainer returns null for them). So do NOT re-report those as broken — focus on OTHER bugs/regressions.
`

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          functionOrRegion: { type: 'string' },
          lineHint: { type: 'string' },
          explanation: { type: 'string' },
          concreteScenario: { type: 'string', description: 'A specific DOM/form/usage scenario that triggers the bug' },
          suggestedFix: { type: 'string' },
        },
        required: ['title', 'severity', 'functionOrRegion', 'explanation', 'concreteScenario', 'suggestedFix'],
      },
    },
  },
  required: ['findings'],
}

const LENSES = [
  {
    key: 'regression',
    prompt: `${CONTEXT}

LENS: REGRESSION to existing autofill. The new getButtonChoiceGroupContainer/isButtonChoiceGroup are now called from applyAiValueToField (every choice input), isFieldAlreadyAnswered (every choice input), buildAiFieldDescriptor (every non-select field), and getAutofillFieldLabel. Hunt for any way these break or change behavior for EXISTING control types: native radios, native checkboxes, native selects, ARIA comboboxes (react-select/Greenhouse/Rippling), split phone, location lookups, plain text fields. Specifically: could a normal text input or a real radio now wrongly resolve to a "button group" and get a button clicked or get wrong Gemma options? Could isFieldAlreadyAnswered now return wrong results for native radios/checkboxes? Could getAutofillFieldLabel change labels for native choice inputs? Are there exceptions thrown on inputs without the methods assumed? Report concrete regressions only.`,
  },
  {
    key: 'buttonlogic',
    prompt: `${CONTEXT}

LENS: BUTTON-CHOICE CORRECTNESS. Scrutinize the new helpers for logic bugs/edge cases: isButtonChoiceGroup's isHiddenBackingField check (offsetParent/size based — could a legit visible Yes/No control be rejected? could a nav/tab strip be accepted?), getButtonChoiceGroupContainer's 6-level climb + closest('fieldset,[role=group],[role=radiogroup]') (could it grab the wrong/too-large container?), pickButtonChoiceOption ordering, clickButtonChoiceOption (does it actually trigger React? does the aria mirroring cause issues?), buttonOptionSelected's token split (does it correctly detect "_active_1svni_57"? any false positives like "interactive"/"reactive"? note "interactive" splits to ["interactive"] which != "active", but verify), collectButtonChoiceGroups discovery + dedup against unmatchedFields, buttonChoiceGroupLooksLikeQuestion gating. Report concrete bugs.`,
  },
  {
    key: 'autoflow',
    prompt: `${CONTEXT}

LENS: AUTO-OPEN FLOW. Review runAutoOpenFlow and its wiring. Check: (1) the TOGGLE_TOOLBAR handler calls runCopilotAutoOpen?.() in BOTH the already-injected show-branch and the fresh-inject branch, but NOT on hide — verify. (2) once-per-URL guard copilotAutoRanForUrl — does reopening on the same URL behave sensibly? does an SPA URL change re-arm it? (3) prefillBtn and companyBtn are created but NOT appended — verify nothing else that runs (updatePrefillButtonState in a MutationObserver, the companyBtn click handler, companySearchForm, the menu-close forEach) throws or misbehaves due to detached buttons. (4) runAutoOpenFlow uses apiProxy (throws on failure) wrapped in try/catch -> null -> shows error and does NOT autofill; is that the intended branch vs auto-filling? (5) the matches filter (sourceUrl OR company) and normalizeUrl/normalizeName — any bug? (6) does autofill run even on non-application pages when toolbar opened? is that acceptable or a problem? Report concrete issues.`,
  },
  {
    key: 'integration',
    prompt: `${CONTEXT}

LENS: INTEGRATION / EXCEPTIONS / PERF. Look for: exceptions on unusual DOM (null parents, SVG className not a string, getBoundingClientRect missing), infinite loops, the discovery dedup "unmatchedFields.some(f => group.contains(f))" correctness, whether collectButtonChoiceGroups could be very slow (querySelectorAllDeep over whole document for fieldset/[role=group]/[role=radiogroup] then isButtonChoiceGroup on each), the renderCompanyPanel {onFillAnyway} button + replaceChildren, whether markFieldFilled/wasFieldFilled work for container (div) elements pushed into unmatchedFields, and whether a button-group container passed to applyAiValueToField's early knownProfileFieldKind/getUnsafeAiValueReason calls behaves. Report concrete issues.`,
  },
]

phase('Review')
const reviews = await pipeline(
  LENSES,
  (lens) => agent(lens.prompt, { label: `review:${lens.key}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'Explore' }),
  (review, lens) => {
    const findings = (review?.findings || []).filter((f) => f && (f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium'))
    return parallel(findings.map((f) => () =>
      agent(
        `${CONTEXT}\n\nAdversarially VERIFY this claimed bug by reading the actual code in ${FILE}. Default to verdict isReal=false unless you can point to the exact lines that make it true and a concrete triggering scenario. Be skeptical — many claims are wrong.\n\nCLAIM (${lens.key}): ${JSON.stringify(f)}`,
        { label: `verify:${lens.key}:${(f.title || '').slice(0, 30)}`, phase: 'Verify', schema: {
          type: 'object', additionalProperties: false,
          properties: {
            isReal: { type: 'boolean' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            reasoning: { type: 'string' },
            exactLocation: { type: 'string' },
            fix: { type: 'string' },
          },
          required: ['isReal', 'reasoning', 'fix'],
        } }
      ).then((v) => ({ ...f, verdict: v }))
    ))
  }
)

const confirmed = reviews.flat().filter(Boolean).filter((f) => f.verdict?.isReal)
return {
  totalRaw: reviews.flat().filter(Boolean).length,
  confirmedCount: confirmed.length,
  confirmed: confirmed.map((f) => ({ title: f.title, severity: f.verdict?.severity || f.severity, location: f.verdict?.exactLocation || f.functionOrRegion, why: f.verdict?.reasoning, fix: f.verdict?.fix })),
}
