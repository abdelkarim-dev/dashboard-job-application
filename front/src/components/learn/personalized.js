// "Pitch & Plan" — get-started interview-prep concepts.
//
// Same shape as concepts.js — these render generically via ConceptPage.jsx.
// These two pages are general, reusable templates: a "Tell Me About Yourself"
// pitch builder and an opinionated study-priority plan. Personal specifics are
// written as [bracketed placeholders] you fill in with your own projects and
// numbers; nothing here is tied to one person or company.
//
// Shape of a concept:
//   {
//     id, group, label, icon, title, tagline,
//     sections: [{ heading, body: [paragraph, ...], code?: { lang, source } }],
//     keyPoints: [string, ...],
//     checklist?: [string, ...],   // interactive, persisted; renders in the right rail
//     quiz?: [{ q, options: [string, ...], answer: index, explain }],
//   }

export const PERSONALIZED_CONCEPTS = [
  // ── 1. Your Pitch ─────────────────────────────────────────────
  {
    id: "my-pitch",
    group: "Pitch & Plan",
    label: "Your Pitch",
    icon: "★",
    title: "Your \"Tell Me About Yourself\"",
    tagline: "One company-agnostic 60–90 second pitch: open with who you are, go deep on one flagship project, sweep the rest, say what you want next. Swap only the flagship and the closing hook per role.",
    sections: [
      {
        heading: "The shape: go deep on one thing",
        body: [
          "Tell Me About Yourself is the single most-reused asset in your loop — recruiters, hiring managers, and most onsite rounds open with it, and a tight answer frames everything after. It is a 60 to 90 second positioning statement, not your life story.",
          "Memorize the shape, not the exact words: one line on who you are, then one flagship project in real detail, then the rest swept quickly, then what you want next. Do not list everything. Go deep on one thing and let the follow-up questions pull the rest — that is what makes it sound like a person talking instead of a resume read aloud.",
          "Mapped to the classic arc: Present (~15s) who you are, framed for the role. Past (~45s) one flagship in depth, then a quick sweep of two or three more wins, each with a number. Future (~20s) what you want next and why this company. Handoff (~10s) a soft invitation so it does not dangle — \"happy to go deeper on any of that, what is most useful for you?\" Rehearse it aloud until it is under 100 seconds without notes, then stop; over-rehearsed reads as robotic.",
        ],
      },
      {
        heading: "Recruiter level, not engineer level",
        body: [
          "The recruiter screen comes first and it gates everything, and the recruiter is almost always non-technical — many first hiring-manager calls are too. Name the technologies so the keywords land (your core languages, frameworks, and cloud), but never explain their internals. The test for every sentence: would a smart non-engineer follow it and be able to repeat it to the hiring manager?",
          "Say \"a public API that takes in data from dozens of outside partners and stays up under constant bot traffic,\" not \"a WAF-hardened serverless endpoint with idempotent ingestion.\" Same fact, plain words. Naming WAF rules, chunk sizing, or message-bus internals to a non-technical listener does not land as competence; it lands as noise. Go one layer deeper only when they ask a follow-up — let them pull you in.",
          "Read the room live: if they ask how something works, go deeper; if they nod and move on, stay at the outcome level. Lead with what changed for the business — faster, more reliable, bigger scale, lower cost, a team you grew — and reach for the mechanism only if asked. The two variants below cover the same ground at two altitudes: the plain one keeps the headline wins for screens; the technical one adds the exact numbers and names the stack for engineers.",
        ],
        callout: { kind: "tip", title: "The repeatability test", text: "If your recruiter can't repeat your flagship story to the hiring manager in one sentence, it was too technical. Rewrite it in plain words until they can." },
      },
      {
        heading: "Base pitch — recruiter / non-technical (~75s, plain language)",
        card: true,
        tag: "Say this on screens",
        body: [
          "Present: I'm a [seniority] [your role — e.g. backend / platform engineer] with about [N] years of experience. Right now I'm [your current role and context — describe the kind of company, not its name].",
          "Flagship: Most of my work centers on [your flagship project, in plain words] — [what it does and who relies on it], and a big part of my job is [the hard part: keeping it reliable, secure, or fast under load]. I've [your role on it — owned it / led it] for [a while], hands-on from [the scope — e.g. infrastructure all the way to shipped code].",
          "Sweep: Beyond that I've owned a few things end to end — [win #1 in plain words, with a number], [win #2, with a number], and [win #3]. I've also [a leadership or growth note — e.g. mentored new engineers / led a small team].",
          "Future + handoff: What I'm looking for now is [the role you want — e.g. a permanent senior or staff role at a product company] where I can [what you want to own long-term] — which is exactly why this role caught my eye. Happy to go deeper on any of that — what would be most useful for you?",
        ],
      },
      {
        heading: "Technical variant — engineers / tech leads (names the stack)",
        card: true,
        tag: "When the room is technical",
        body: [
          "Present: I'm a [seniority] [your role], about [N] years building [your domains — e.g. backend, cloud, platform] systems, hands-on from architecture to shipped code.",
          "Flagship: I [designed / co-designed / own] [your flagship — a technical one-liner that names the stack and the hard constraint, e.g. \"a public API on [cloud] serving [N] partner integrations under constant bot traffic, where the job is staying available without false-positive blocks\"].",
          "Sweep: I [win #1 — before→after numbers and the mechanism, e.g. \"scaled a batch job from X to Y (+Z%) and cut wall-clock time N% through tuning\"]; [win #2 — what you built and the result]; [win #3]; and [win #4]. I've been [promotions / scope growth — e.g. promoted to tech lead twice].",
          "Future + handoff: I want [the role you want — e.g. a permanent senior or staff backend role where I own systems end to end]. The work your team is doing on [one researched detail] is exactly what I want to go deep on. Happy to go deeper on any of those — what's most useful for you?",
        ],
      },
      {
        heading: "Choosing your flagship: swap one, keep the shape",
        body: [
          "This is the only real tailoring you do, and it is why one pitch covers every company: the opening line, the sweep, and the close stay fixed; you swap which project becomes the flagship to match what the role emphasizes. Pick one — leading with three is the same as leading with none.",
          "Choose your strongest project as the default flagship — usually the one where reliability, scale, and ownership read as senior everywhere. Reach for a different lead only when the role clearly centers on something else.",
        ],
        table: {
          headers: ["If the role emphasizes…", "Lead with this flagship", "The one-line (recruiter level)"],
          rows: [
            ["Reliability · throughput · scale", "Your most reliable / highest-scale system", "[A system many users or partners depend on that stays up under load — plus a throughput or scale win with a number.]"],
            ["Platform · developer enablement · tooling", "Your platform / tooling / CI-CD work", "[How you made other engineers faster — a shared pipeline, tooling, or infrastructure that paid off across teams.]"],
            ["AI · data · realtime", "Your AI / data / realtime project", "[An AI, data, or realtime system you built — what it does, grounded in one concrete result.]"],
            ["Full-stack · product depth", "Your end-to-end product build", "[A product you built across backend and front end — the user-facing outcome, with a before/after.]"],
          ],
        },
      },
      {
        heading: "Framing a transition or gap",
        body: [
          "If your story includes a transition — a contract wrapping up, a layoff, a career break, a pivot between roles — frame it as a deliberate choice, not a gap. State plainly what you were doing, then what you are intentionally moving toward and why. The shape matters more than the specifics: deliberate, forward-looking, no apology.",
          "Keep it confident, never defensive and never critical of a past employer or client. A simple template: \"[what you were doing] is wrapping up, and I'm choosing to move into [the role you want] where I can [what you want to own].\" Save the fuller \"why are you leaving\" answer — and anything situational like relocation — for the recruiter screen, where there is room for it.",
        ],
      },
      {
        heading: "The forward hook: one researched detail",
        body: [
          "The Future sentence is the only part you fully rewrite per company. Drop in one concrete, researched detail: a product they ship, a scale challenge they have discussed publicly, or a technology in their stack you have real experience with. Generic enthusiasm reads as filler; one specific hook reads as intent.",
          "Do the 20 minutes of homework before each screen and write that single hook sentence down. It is what makes a company-agnostic pitch feel tailored without rewriting any of the rest.",
        ],
      },
    ],
    keyPoints: [
      "Go deep on ONE flagship; sweep the rest. Don't list everything — let follow-ups pull the detail.",
      "Recruiter level, not engineer level: name the tech, never explain internals. The 'can they repeat it?' test.",
      "Arc: present (15s) → flagship + sweep (45s) → future (20s) → handoff (10s). Under 100 seconds.",
      "One pitch, every company: swap only the flagship and the closing hook; keep the shape fixed.",
      "Default flagship = your strongest project, the one where reliability + scale read as senior everywhere.",
      "Numbers beat adjectives: lead with quantified wins — throughput, latency, scale, cost — over generic claims.",
      "Name your promotions and scope increases to signal trajectory, not just one employer.",
      "End with a handoff question; frame any career transition as a deliberate choice.",
    ],
    checklist: [
      "Plain-language recruiter pitch rehearsed aloud, under 100 seconds, zero jargon",
      "Technical variant rehearsed for engineer rooms",
      "Default flagship automatic; two or three alternates ready to swap in",
      "Can pick the right flagship from a job description in under a minute",
      "One researched forward-hook sentence written for the next screen",
      "Transition / gap framing crisp and non-defensive",
      "Your key numbers automatic (throughput, latency, scale, cost)",
    ],
  },

  // ── 2. Study Focus ────────────────────────────────────────────
  {
    id: "my-focus",
    group: "Pitch & Plan",
    label: "Study Focus",
    icon: "◎",
    title: "Your Study Focus",
    tagline: "An opinionated priority order for interview prep: what to work on first, why, and how to spend your reps for the highest return.",
    sections: [
      {
        heading: "Priority order (highest expected value first)",
        body: [
          "1. Recruiter screen prep (Your Pitch + Recruiter Screen). Cheapest to prep, and it gates everything else. The nearest screen is the highest priority; tailor the pitch to that company first.",
          "2. Behavioral (Story Bank + leadership principles). Reused in every round at every company, so it has the highest leverage. If you have owned real work your raw material is strong; the work is making it muscle memory and drawing on stories from across your whole career, not one employer.",
          "3. System Design. Staff and senior rounds weight this heavily, and any role centered on realtime or scale will lean on it. Pick two or three systems you have actually built as case studies and practice narrating each as a five-minute deep dive.",
        ],
      },
      {
        heading: "Priority order (continued)",
        body: [
          "4. Coding (LeetCode patterns). Necessary, but do not over-index. For staff/senior the bar is clean, correct, and communicated, not competitive-programming speed. Drill patterns and recognition, not raw problem count.",
          "5. SOLID / Clean Architecture. Likely if a round is a code-review or refactor exercise. Medium priority unless a specific round flags it.",
          "6. Your differentiator (the thing you have built that most candidates haven't — an AI/RAG system, a hard scaling win, a platform). Not a gate, but high return in \"tell me about a system\" moments. Prep enough to present it crisply and field follow-ups two layers deep.",
        ],
      },
      {
        heading: "Going two layers deep on your differentiator",
        body: [
          "\"Two layers deep\" means: for whatever system is your differentiator, prepare the three hardest follow-ups an interviewer will push on, and answer them cold. For an AI/RAG pipeline, for example, those are — one, chunking strategy trade-offs: your chunk size and why, fixed vs semantic vs hierarchical, and how you measured the impact on retrieval quality. Two, fine-tune vs RAG vs prompt: the decision rule (RAG for knowledge, fine-tune for behavior, prompt first) plus a concrete call you actually made. Three, groundedness and evaluation: how you tested for hallucination, what eval set or LLM-as-judge you used, and a real number. The same drill applies to any deep system — know its three hardest follow-ups cold.",
          "Rehearse narrating your system as an async, event-driven design with explicit cost and latency choices, not just \"a tool I built\" — that framing reads as a Staff-level architectural decision. The RAG & Vector Search and AI System Design pages under Knowledge are source material; the Production & Operability page covers the cost and eval-in-prod angle.",
        ],
      },
      {
        heading: "The honest read",
        body: [
          "Most experienced engineers are stronger than their interview performance suggests. If you have owned real systems — distributed, event-driven, at genuine scale — you have rich material; the gap is usually that it is not yet legible or interview-ready. The same is true of behavioral answers: they are rich when you have actually owned things, across several roles rather than one.",
          "So the goal is rarely to build skills from zero. It is to make existing strengths legible and interview-ready, to broaden your behavioral answers across your whole career rather than one project, and to shore up the two things interviews test artificially: live coding and crisp design narration.",
        ],
      },
      {
        heading: "Cadence: bias toward active reps",
        body: [
          "A structured plan can quietly become a way to avoid the harder, vaguer work, which is mock interviews and talking out loud. Bias toward active reps: one spoken mock per day beats three hours of silent reading. Rehearse stories aloud until the numbers are automatic, and narrate at least one system design out loud per session.",
          "Use the SOLID Lab and Clean Architecture pages so you can name design trade-offs in the interviewer's vocabulary, and do a focused 20 minutes of company research before each screen to tailor your stories and your forward hook to that specific role.",
        ],
      },
    ],
    keyPoints: [
      "Order: recruiter screen → behavioral → system design → coding → SOLID/Clean Arch → your differentiator.",
      "Tailor the pitch to the nearest screen first; it gates everything.",
      "Behavioral is highest-leverage: make it muscle memory and draw on your whole career, not one employer.",
      "System design: narrate two or three systems you've built as 5-min deep dives.",
      "LeetCode: drill pattern recognition, not problem count; the bar is clean + communicated.",
      "Your differentiator is not a gate — prep it to present, not to pass a filter.",
      "One spoken mock per day beats three hours of silent reading.",
    ],
    checklist: [
      "Pitch tailored to the nearest recruiter screen",
      "3-4 stories rehearsed aloud until numbers are automatic",
      "System-design framework memorized; 3 case studies ready as deep dives",
      "LeetCode: can name the pattern from a prompt in 60 seconds",
      "SOLID + Clean Architecture: can identify violations and refactor live",
      "Differentiator walkthrough crisp; can answer the three hardest follow-ups cold",
    ],
  },
];
