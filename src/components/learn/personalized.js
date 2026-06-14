// Personalized interview-prep concepts for Abdelkarim Adnane.
//
// Same shape as concepts.js — these render generically via ConceptPage.jsx.
// Every story and number here is traceable to a real CV bullet / the profile
// background in the DB, across all three employers (Nexity, Orange Business
// Services, Capgemini), not just Nexity. Group is always "For You" so the Learn
// hub surfaces them as a personalized section.
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
  // ── 1. Tell Me About Yourself ─────────────────────────────────
  {
    id: "my-pitch",
    group: "For You",
    label: "Your Pitch",
    icon: "★",
    title: "Your \"Tell Me About Yourself\"",
    tagline: "A 90-second present-past-future-handoff arc built from your real track record, with a tailored variant for each active loop: Toast, Autodesk, Treasure Data.",
    sections: [
      {
        heading: "The structure: present, past, future, handoff",
        body: [
          "Tell Me About Yourself is the single most-reused asset in your loop. Recruiters, hiring managers, and most onsite rounds open with it, and a tight answer sets the frame for everything after. It is a 60 to 90 second positioning statement, not your life story.",
          "Present (about 15 seconds): who you are right now, in one line, framed for the role. Lead with the thing closest to the job. Past (about 45 seconds): two or three proof points, each with scope and a number, picked to match the role. A highlight reel, not a resume readthrough. Future (about 20 seconds): why you are here, why this company, why now. Handoff (about 10 seconds): end with a soft invitation so it does not dangle, for example \"happy to go deeper on any of those, what is most useful for you?\"",
          "Tailor only the Present line and the Past proof points per company; keep the shape stable. Rehearse the arc out loud until it is under 100 seconds without notes, then stop. Over-rehearsed reads as robotic.",
        ],
      },
      {
        heading: "Match your audience: recruiter vs engineer",
        body: [
          "Who is in the room changes the words, not the structure. The recruiter screen comes first and it gates everything, and the recruiter is almost always non-technical; many first hiring-manager calls are light on tech too. With them, lead with impact, scale, ownership, and outcomes in plain language, and let them pull you into detail. With a non-technical listener, naming AWS services, WAF rules, or Spring Batch chunk sizing does not land as competence; it lands as noise.",
          "Save the technical depth for engineers and tech leads. The role-specific variants further down (Toast, Autodesk, Treasure Data) are written for a technical interviewer, so they name the stack on purpose. Use the recruiter variant below for screens and non-technical calls, then step up the jargon as soon as the person across from you starts asking how things work.",
          "Read the cues live. If they ask follow-ups about the technology, go deeper; if they nod and move on, stay at the outcome level. A simple rule: say what changed for the business first (faster, more reliable, bigger scale, lower cost, a team I grew), and only reach for the mechanism if they ask how.",
        ],
      },
      {
        heading: "Recruiter / non-technical variant (~60-75 seconds, plain language)",
        card: true,
        tag: "Recruiter",
        body: [
          "Present: I am a senior software engineer and team lead with about seven years of experience. Right now I own a business-critical system for one of France's largest real-estate groups: it is how all of their incoming customer leads come in.",
          "Past: That system connects more than 40 outside partners, including names like Google, Meta, and the big property websites, and my job is to keep it reliable and secure even when it is under attack. I have also led projects end to end: I rebuilt a slow internal app so it starts instantly instead of taking about a minute and a half, I made a nightly data process handle more than three times the volume without buying any new hardware, and I have been promoted into team-lead roles twice, where I brought on new engineers and set how the team works.",
          "Future: I am based in Vancouver, a Canadian permanent resident, open to remote or relocation, and I am looking for a senior role where I can keep owning important systems and helping a team do its best work. What your team is building is exactly the kind of work I want to do next. Happy to go into any of that in more detail, what would be most useful?",
          "Notice what is not here: no AWS service names, no acronyms, no chunk sizing. Same achievements as the technical variants, told as business outcomes (reliable, secure, faster, larger scale, people I grew) so a non-technical recruiter or manager hears value, not vocabulary.",
        ],
      },
      {
        heading: "Default variant (technical interviewer, any senior backend / platform role)",
        card: true,
        tag: "Default · technical",
        body: [
          "Present: I am a senior backend engineer and tech lead with about seven years building production backend, cloud, and platform systems. Day to day I am hands-on from architecture to shipped code, and I currently own a business-critical public API on AWS serverless.",
          "Past: I co-designed and own Nexity's lead-capture API, a WAF-hardened public endpoint serving 40+ partner integrations including SeLoger, LeBonCoin, Google, Meta, and TikTok. I scaled a batch job from 15,000 to 50,000 items per run, a 233 percent increase, and cut wall-clock time 35 percent purely through PostgreSQL tuning, indexing, and Spring Batch chunk sizing, with no new hardware. I have been promoted into a tech-lead role twice, at Capgemini and again at Orange, so I have led teams as well as systems.",
          "Future: I am Vancouver-based, a Canadian PR, open to remote or relocation, and I want a senior role where I can keep owning systems end to end. The work your team is doing on [specific to company] is exactly the kind of problem I want to go deep on. Happy to go deeper on any of those, what is most useful for you?",
        ],
      },
      {
        heading: "Toast variant (Staff SWE, payments / restaurant scale)",
        card: true,
        tag: "Toast",
        body: [
          "Toast runs a payments-and-operations platform where reliability and throughput are the whole game, so lead with the public-API reliability story and the throughput win.",
          "Present: I am a senior backend engineer and tech lead. For the last few years I have owned a business-critical public API on AWS serverless and the event-driven systems behind it.",
          "Past: My lead-capture API is a public, WAF-hardened endpoint that 40+ partners depend on; on spike days the cloud team's WAF absorbs 1,000 to 10,000 attack attempts while baseline partner traffic keeps flowing, and a big part of my job is keeping that surface available without false-positive blocks. I scaled a batch system from 15,000 to 50,000 items per run, plus 233 percent, and cut runtime 35 percent with no new hardware. I have also delivered under hard deadlines, including a business carve-out where I stood up the impacted applications for the acquiring company. Future: I want to go deeper on platform and reliability at a product company operating at real scale, which is why Toast stood out.",
        ],
      },
      {
        heading: "Autodesk variant (Senior SWE, product depth + full-stack)",
        card: true,
        tag: "Autodesk",
        body: [
          "Autodesk builds long-lived product software, so lead with end-to-end product ownership and your full-stack range.",
          "Present: I am a senior backend engineer and tech lead, hands-on from architecture to shipped code, and comfortable full-stack with React and TypeScript on top of a Java and Python backend.",
          "Past: I rewrote a marketing application from .NET to Spring Boot and React as the sole engineer; I owned the architecture and stack choice, migrated the front end to TypeScript for type safety, and shipped real features on top including URL tracking, ad-action tracking, and a lead-priority API, taking startup from about 1.5 minutes to near-instant. I also own the Data department's Azure DevOps CI/CD platform across 7 codebases, which is developer-productivity work at platform scale. Future: I want product depth at a company whose software engineers and designers rely on every day, which is why this role stood out.",
        ],
      },
      {
        heading: "Treasure Data variant (Staff Fullstack, realtime / data platform)",
        card: true,
        tag: "Treasure Data",
        body: [
          "Treasure Data is a customer-data platform built on large-scale, realtime data movement, so lead with event-driven ingestion and data processing at scale.",
          "Present: I am a senior backend engineer and tech lead who builds event-driven, serverless data systems on AWS, end to end.",
          "Past: I co-designed an ingestion platform for our lead-capture API: a unified schema with per-partner rules, deduplication, and fan-out routing to the database, internal systems, and the call center across 40+ integrations. I evolved a group-wide customer-record system that ingests around 10,000 notifications a day over SQS and 200,000 to 300,000 records per batch, and cut its SQL query time 30 percent through query-plan analysis and indexing to unblock a user-facing latency requirement. I also scaled a batch pipeline 233 percent with no new hardware. Future: I want to work on a realtime data platform at scale, which is the core of what Treasure Data does.",
        ],
      },
      {
        heading: "Framing your situation (consulting to full-time)",
        body: [
          "You operate through your own consulting vehicle, NOVACODE LABS, and ran a long embedded engagement as tech lead at Nexity; that engagement is concluding around the end of June. Frame this as a deliberate choice, not a gap: you ran a multi-year embedded engagement and are now intentionally moving into a full-time IC or architecture role where you can own outcomes long-term.",
          "Keep it confident and forward-looking, never defensive and never critical of the client. The honest one-liner is: the engagement is wrapping up and I am choosing to move from consulting into a permanent senior role where I can go deeper on platform and architecture.",
        ],
      },
      {
        heading: "Tailoring the forward hook",
        body: [
          "The Future sentence is the only part you fully rewrite per company. Drop in one concrete, researched detail: a product they ship, a scale challenge they have discussed publicly, or a technology in their stack you have real experience with. Generic enthusiasm reads as filler; one specific hook reads as intent. See the Companies pages for Toast, Autodesk, and Treasure Data specifics.",
        ],
      },
    ],
    keyPoints: [
      "Match the audience: recruiters and many first calls are non-technical — lead with outcomes in plain language, save the stack for engineers.",
      "Arc: present (15s) → past (45s) → future (20s) → handoff (10s). Under 100 seconds.",
      "Tailor only the Present line and Past proof points; keep the shape stable.",
      "Numbers beat adjectives: 40+ integrations, 15k→50k (+233%), 35% and 30% cuts, 7 codebases.",
      "Toast = reliability + throughput; Autodesk = product depth + full-stack; Treasure Data = realtime data at scale.",
      "Name both tech-lead promotions (Capgemini, Orange) to signal trajectory, not just Nexity.",
      "End with a handoff question, and frame the consulting-to-FTE move as a deliberate choice.",
    ],
    checklist: [
      "Recruiter / non-technical variant rehearsed (outcomes, zero jargon)",
      "Default technical variant rehearsed out loud, under 100 seconds",
      "Toast variant ready (reliability + throughput lead)",
      "Autodesk variant ready (product depth + full-stack lead)",
      "Treasure Data variant ready (realtime / data-platform lead)",
      "Forward hook rewritten per company with one researched detail",
      "Consulting-to-FTE framing crisp and non-defensive",
    ],
  },

  // ── 2. STAR-L Story Bank ──────────────────────────────────────
  {
    id: "my-stories",
    group: "For You",
    label: "Story Bank",
    icon: "✦",
    title: "Your STAR-L Story Bank",
    tagline: "Thirteen real, quantified stories across Nexity, Orange, and Capgemini in STAR-L form, each mapped to the archetype it answers and the Leadership Principles it proves.",
    sections: [
      {
        heading: "How to use the bank (and why STAR-L)",
        body: [
          "Each story below is one real achievement in STAR-L form: Situation, Task, Action, Result, and Learning. The Learning beat is the upgrade that separates Senior from Staff. Anyone can describe what they did; showing what you would do differently or the principle you extracted signals judgment and growth. Always close with it, and always land the number in the Result.",
          "These deliberately span all three employers, not just Nexity, because interviewers probe for range and because a single-company answer reads narrow. You have Nexity (platform, scale, reliability), Orange (team leadership), and Capgemini (migration, data systems, security, compliance) to draw from. Prepare three or four cold so you can re-aim one story at different question framings.",
          "In the room you do not recite the four labels; you tell it as a story and lean on the structure so you never forget the result. Spend about 70 percent of airtime on Action, and say \"I\", not \"we\". Interviewers screen out people who hide behind the team.",
        ],
      },
      {
        heading: "The eight archetypes (every common question maps here)",
        body: [
          "1. Technical leadership / drove a decision. 2. Influence without authority. 3. Conflict or disagreement. 4. Failure or mistake. 5. Ambiguity with no playbook. 6. Delivered under pressure / tight deadline. 7. Mentorship / grew someone. 8. Scope or impact beyond your immediate task.",
          "Below, each story is tagged with the archetype(s) it serves so you can pattern-match live. Note the one gap you must close yourself: a real, owned failure story (archetype 4). It is covered last, with candidate angles, because you should write the truthful version rather than borrow one.",
        ],
      },
      {
        heading: "Story 1 — Scaling the batch job 233% with no new hardware (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: A core Nexity batch process was straining as data volume grew, and the default fix everyone reaches for is a bigger machine.",
          "Task: Increase throughput substantially without a vertical scale-up, because added hardware is recurring cost and hides the real bottleneck.",
          "Action: I profiled where the run actually spent its time, tuned the PostgreSQL queries, added the right indexes, and re-tuned the Spring Batch chunk sizing so the job committed in efficient batches instead of fighting the database.",
          "Result: Throughput went from 15,000 to 50,000 items per run, a 233 percent increase, and wall-clock time dropped 35 percent, on the same hardware.",
          "Learning: The instinct to scale up is usually a way to avoid measuring; the cheapest 30 percent is almost always in the query plan. I now profile before I provision.",
          "Archetypes: Dive Deep, conflict-with-the-default. Leadership Principles: Dive Deep, Frugality, Deliver Results.",
        ],
      },
      {
        heading: "Story 2 — Keeping the public API up through attack surges (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: Our lead-capture API is a public, WAF-hardened endpoint 40+ partners depend on. On spike days it absorbs 1,000 to 10,000 attack attempts while baseline traffic of about 2,000 requests a day still has to flow.",
          "Task: Keep the endpoint available and clean under bot surges without the WAF blocking legitimate partners, which would break real integrations.",
          "Action: I supervised the WAF rule changes through the surges and actively hunted false positives, tracing partner blocks back to specific rules and resolving them so genuine traffic from partners like SeLoger and LeBonCoin kept getting through.",
          "Result: The API stayed available through the surges, attacks were blocked, and partner integrations kept flowing without false-positive outages.",
          "Learning: On a public surface the false positive is as dangerous as the attack, because it is a self-inflicted outage for the customer. I weight rules toward catching false positives fast, not just blocking aggressively.",
          "Archetypes: pressure, customer-facing judgment. Leadership Principles: Customer Obsession, Ownership, Insist on the Highest Standards.",
        ],
      },
      {
        heading: "Story 3 — Solo rewrite of the marketing app from .NET (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: Nexity's marketing app was on .NET, slow to start at roughly 1.5 minutes, and serving about 80 active users across departments.",
          "Task: I was the sole engineer on the rewrite, so I owned architecture, stack choice, and delivery end to end.",
          "Action: I re-architected onto Spring Boot and React, chose the stack including migrating the front end from JavaScript to TypeScript for type safety, and shipped real features on top: URL tracking, ad-action tracking, and a lead-priority API.",
          "Result: Startup went from about 1.5 minutes to near-instant, and the rebuilt app kept serving its roughly 80 users on a maintainable, typed codebase.",
          "Learning: Being the only engineer forced me to make the architecture legible enough that someone else could pick it up; that discipline made the codebase better than if I had optimized only for myself.",
          "Archetypes: end-to-end ownership, technical leadership. Leadership Principles: Ownership, Invent and Simplify, Deliver Results.",
        ],
      },
      {
        heading: "Story 4 — Leading Nexity's first microservices migration (Capgemini)",
        card: true,
        tag: "Capgemini",
        body: [
          "Situation: At Capgemini on the Nexity account, the core platform was a monolith and the group had no proven path to break it apart.",
          "Task: I was asked to lead Nexity's first microservices migration and prove the approach could work.",
          "Action: I split the monolithic core into two Spring Boot services, a real-estate catalog and a partner platform, and added a serverless partner-auth layer on AWS using Lambda, API Gateway, and Secrets Manager.",
          "Result: The migration validated as the proof of concept that anchored a brand-new modernization department at the group, and it earned me the move from engineer to engineering lead.",
          "Learning: A migration sells itself only if the first slice is small enough to ship and visible enough to point at. Picking the right first boundary mattered more than the technology.",
          "Archetypes: drove a decision, ambiguity, leadership. Leadership Principles: Think Big, Invent and Simplify, Ownership.",
        ],
      },
      {
        heading: "Story 5 — The Nexity carve-out under deadline (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: Nexity sold off part of the business, and the impacted applications had to be cloned and stood up independently for the acquiring company.",
          "Task: Lead the carve-out: get working environments running for a separate organization, on a hard deadline, while keeping cost sane.",
          "Action: I cloned the impacted applications, set up Azure DevOps and the runtimes, made the app-level fixes the split required, ran technical walkthroughs for the new owners, and right-sized the RDS instances by deleting out-of-scope data and authoring porting scripts to migrate to a smaller instance.",
          "Result: The acquiring company got standing, working applications with handover walkthroughs complete, at a lower monthly infrastructure cost than a lift-and-shift would have produced.",
          "Learning: A carve-out is as much a trust handover as a technical one; the walkthroughs were what actually de-risked it for the new owners.",
          "Archetypes: pressure / deadline, ambiguity. Leadership Principles: Bias for Action, Frugality, Earn Trust.",
        ],
      },
      {
        heading: "Story 6 — Consolidating CI/CD across 7 codebases (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: My team owned 7 application codebases across multiple repositories, each carrying its own Azure DevOps pipeline templates that drifted apart over time.",
          "Task: Make any pipeline improvement or fix propagate once instead of being copy-pasted into seven places.",
          "Action: I consolidated the separate per-project templates into one shared source so updates propagate centrally, and I optimized the pipeline steps to cut run time.",
          "Result: The 7 codebases now share one CI/CD source of truth, updates land everywhere at once, and pipeline runs are faster.",
          "Learning: Seven drifting copies is an organizational problem disguised as a technical one; the win was less the shared template than getting the team to route changes through it.",
          "Archetypes: beyond scope, simplify. Leadership Principles: Invent and Simplify, Insist on the Highest Standards, Ownership.",
        ],
      },
      {
        heading: "Story 7 — Cutting customer-record query time 30% (Capgemini)",
        card: true,
        tag: "Capgemini",
        body: [
          "Situation: The group-wide customer record system, used across most Nexity applications and ingesting around 10,000 notifications a day via SQS plus 200,000 to 300,000 records per batch, had a user-facing latency bottleneck.",
          "Task: Fix the latency users felt while also adding new business logic for internal consumers.",
          "Action: I did query-plan analysis to find where time was going and added the right indexes to address it directly, rather than caching around the symptom.",
          "Result: SQL query time dropped 30 percent and the user-facing bottleneck was resolved, on a system operating at real scale.",
          "Learning: Caching is tempting but it hides the cost and adds an invalidation problem; fixing the index removed the latency without new failure modes.",
          "Archetypes: dive deep, customer-facing. Leadership Principles: Dive Deep, Customer Obsession, Deliver Results.",
        ],
      },
      {
        heading: "Story 8 — Passwordless federated identity for partners (Capgemini)",
        card: true,
        tag: "Capgemini",
        body: [
          "Situation: Partner authentication into our platform was still password-based, which is weaker security and more support overhead.",
          "Task: Move partners onto a stronger, modern authentication model without breaking their access.",
          "Action: I replaced password-based partner authentication with Azure ADFS passwordless federated identity, delivered through the serverless auth layer I had built on AWS.",
          "Result: Partners moved to federated, passwordless sign-in, removing shared-secret password handling from the integration path.",
          "Learning: Security migrations live or die on the cutover plan for existing users; the design work was easy compared to sequencing partners over without an outage.",
          "Archetypes: security, learn-and-adopt. Leadership Principles: Insist on the Highest Standards, Earn Trust, Learn and Be Curious.",
        ],
      },
      {
        heading: "Story 9 — Leading the Orange Teaming rebuild (Orange Business Services)",
        card: true,
        tag: "Orange",
        body: [
          "Situation: At Orange Business Services I was promoted to tech lead on the rebuild of Orange Teaming, Orange's phone-services sales interface, with a brand-new team and a France-based team that owned the prior generations.",
          "Task: Stand up a new team and ship the next generation while coordinating with the existing France-based owners on specs and releases.",
          "Action: I onboarded two frontend developers and the lead tester, set the pull-request and code-review standards for the new team, and shipped new Angular pages on the product's evolution while aligning feature specs and release timing with the France team.",
          "Result: The new team delivered the next-generation pages with a code-review discipline in place from day one, with releases coordinated across two geographies.",
          "Learning: Setting the review bar before the team grows is far cheaper than retrofitting it later; the standards I set early were what kept quality steady as we added people.",
          "Archetypes: mentorship, influence without authority, technical leadership. Leadership Principles: Hire and Develop the Best, Earn Trust, Ownership.",
        ],
      },
      {
        heading: "Story 10 — Building the GDPR compliance application (Capgemini)",
        card: true,
        tag: "Capgemini",
        body: [
          "Situation: The legal team needed to act on GDPR requests against the group-wide customer record system, but there was no tooling, so it was manual and risky.",
          "Task: Give the legal team a safe, self-serve way to find and remove a third party's data across the system.",
          "Action: I built a GDPR compliance application on top of the customer record system with third-party search and bulk-anonymization workflows, so legal could locate records and anonymize them in bulk without engineering doing one-off scripts.",
          "Result: Legal got a repeatable compliance tool, and bulk-anonymization became a controlled workflow instead of an ad-hoc, error-prone manual task.",
          "Learning: The internal customer (legal) had a real, recurring pain that engineering treated as a side request; treating them as a first-class user turned a chore into a product.",
          "Archetypes: beyond scope, customer obsession (internal customer). Leadership Principles: Customer Obsession, Ownership, Dive Deep.",
        ],
      },
      {
        heading: "Story 11 — Automating batch-integration reporting (Capgemini)",
        card: true,
        tag: "Capgemini",
        body: [
          "Situation: Third-party batch integrations (imports and exports) on the customer record system were monitored by manually reading logs, which was slow and easy to get wrong.",
          "Task: Replace manual log review with something that surfaced integration status reliably.",
          "Action: I shipped a daily reporting system on the customer record system that auto-analyzes the third-party batch integrations and generates status reports, removing the manual log-reading step.",
          "Result: The reporting was adopted across operations, replacing manual review with a daily automated status report.",
          "Learning: The highest-leverage work was not asked for; I noticed the team burning time on log review and built the thing that made it unnecessary. Looking one step past the ticket is where outsized impact lives.",
          "Archetypes: beyond scope, proactivity. Leadership Principles: Invent and Simplify, Bias for Action, Ownership.",
        ],
      },
      {
        heading: "Story 12 — Building the Bedrock RAG pipeline (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: There was a need to answer questions from internal/partner content that a plain model could not, because the knowledge was proprietary and changed over time. (Fill in the exact use case and corpus you built it for.)",
          "Task: Ground an LLM in our own data so answers were accurate and current, without retraining a model.",
          "Action: I built a Retrieval-Augmented Generation pipeline on Amazon Bedrock: ingestion with a chunking strategy, an embedding model, a vector store, retrieval at query time, prompt construction within the context window, and generation, with attention to guardrails and cost/latency. (State your concrete choices: chunk size and why, which embedding model, which vector store, semantic vs hybrid retrieval, and how you evaluated quality.)",
          "Result: The system answered from our data instead of guessing. (Insert your real metric or outcome here: a quality/groundedness number, latency, cost per query, or adoption. Always land a number.)",
          "Learning: Retrieval quality, especially chunking, dominated the outcome far more than the model choice; the eval loop was what let me see that.",
          "Archetypes: ambiguity, learn-and-adopt, your AI differentiator. Leadership Principles: Learn and Be Curious, Invent and Simplify, Dive Deep.",
        ],
      },
      {
        heading: "Story 13 — Covering dual Tech Lead and Product Owner (Nexity)",
        card: true,
        tag: "Nexity",
        body: [
          "Situation: During a maternity-leave gap, the Product / Application Owner role on top of my Tech Lead duties needed coverage for about a year.",
          "Task: Hold both seats: keep delivery moving as tech lead while owning feature discovery, sizing, scoping, and roadmap with business stakeholders.",
          "Action: I ran feature discovery directly with business stakeholders, sized and scoped the work, and integrated it into the delivery roadmap, then led the engineering delivery of the same work.",
          "Result: The product kept moving through the gap with one person owning the line from stakeholder discovery to shipped feature, for a full year.",
          "Learning: Sitting on both sides taught me how much delivery friction comes from a fuzzy hand-off between product and engineering; owning both made the trade-offs explicit and faster.",
          "Archetypes: ownership beyond role, influence, leadership. Leadership Principles: Ownership, Earn Trust, Deliver Results.",
        ],
      },
      {
        heading: "Archetype 4 — Your failure story (write this one yourself)",
        card: true,
        tag: "Write this",
        body: [
          "You need one real, owned failure with a concrete Learning, and you should write the truthful version rather than borrow one, because interviewers drill into it. Refusing to name a real failure, or offering a humblebrag like \"I work too hard\", reads as low self-awareness and is a common rejection reason. The structure is the same STAR-L, but the Action is what you did to contain and fix it, and the Learning is the durable change you made.",
          "Candidate angles from your real work, pick the one that is genuinely true: a WAF rule you tuned that blocked a real partner before you caught it (what was the detection gap, what did you change so it would not recur); a migration or carve-out estimate that slipped (what did you misjudge, how did you re-plan and communicate); a design or stack decision you would now reverse (what did you learn that changed your judgment); or an incident on the customer-record or lead-capture system where your fix was incomplete the first time.",
          "Write it out in full STAR-L, quantify the impact and the recovery, and rehearse it cold. The recovery and the Learning are what you are actually being scored on, not the absence of failure.",
        ],
      },
    ],
    keyPoints: [
      "Span all three employers: Nexity (scale/reliability), Orange (team leadership), Capgemini (migration/data/security/compliance).",
      "STAR-L: always close with the Learning beat; it is the Senior-to-Staff differentiator.",
      "Spend ~70% on Action, say 'I' not 'we', and land the number in the Result.",
      "Failure question: lead with judgment under live pressure (Story 2) or write your own owned failure (archetype 4).",
      "Leadership / mentorship: Orange Teaming (Story 9) and dual TL/PO (Story 13) — not just backend wins.",
      "Beyond-scope / proactivity: GDPR app (10), reporting automation (11), CI/CD consolidation (6).",
      "AI differentiator: the Bedrock RAG pipeline (12) — insert your real choices and numbers.",
      "Reuse stories across questions by changing emphasis, not by inventing new ones.",
    ],
    checklist: [
      "All eight archetypes have at least one story",
      "A real, owned failure story written in full STAR-L and rehearsed",
      "Nexity, Orange, and Capgemini all represented (not Nexity-only)",
      "Story 12 (RAG) filled with your real corpus, choices, and a number",
      "3-4 stories rehearsed out loud, cold, with numbers automatic",
      "Each story tagged to the questions and LPs it answers",
    ],
  },

  // ── 3. Amazon LP Map ──────────────────────────────────────────
  {
    id: "my-amazon-lp",
    group: "For You",
    label: "Amazon LPs",
    icon: "▲",
    title: "Your Amazon LP Map",
    tagline: "Each high-priority Leadership Principle pre-loaded with your single best story and the angle to take — for an Amazon or AWS loop, or any LP-style behavioral round.",
    sections: [
      {
        heading: "How an Amazon loop works",
        body: [
          "An Amazon interview loop is behavioral-heavy and explicitly graded against the Leadership Principles. Most questions are some version of \"tell me about a time when...\", a bar raiser sits in the loop, and interviewers write a debrief that maps your answers to specific LP behaviors. Vague answers score low even when the outcome was good, so name the action explicitly.",
          "Expect deep follow-ups: what exactly you did, what the data showed, what others thought, and what you would do differently. Know your numbers and trade-offs cold. Every story referenced here is defined on your Story Bank page. The full, verified principle list is on the Amazon Leadership Principles page under Interview.",
        ],
      },
      {
        heading: "Customer Obsession",
        body: [
          "Best proof: resolving WAF false-positive partner blocks during attack surges (Story 2). Angle: the 40+ partners are the customer, and a false-positive block is a self-inflicted outage for them, so keeping their traffic flowing while still blocking attacks was the whole job.",
          "Backups: the GDPR app built for the legal team as a first-class internal customer (Story 10), and the 30 percent query-time cut that resolved a user-facing latency bottleneck (Story 7).",
        ],
      },
      {
        heading: "Ownership",
        body: [
          "Best proof: the solo .NET to Spring Boot/React rewrite (Story 3); I was the only engineer and owned architecture, stack, the TypeScript migration, and shipped features. Angle: there was nobody to defer the decision to.",
          "Backup: covering dual Tech Lead and Product Owner for a year (Story 13) and owning the lead-capture API and the CI/CD platform across 7 codebases.",
        ],
      },
      {
        heading: "Dive Deep",
        body: [
          "Best proof: batch tuning (Story 1) and the 30 percent customer-record query-time cut (Story 7). Angle: in both I went into query plans and chunk/index behavior instead of papering over the symptom with hardware or caching.",
          "This is your strongest principle; expect them to keep drilling, so have the mechanism ready (which index, why chunk sizing mattered).",
        ],
      },
      {
        heading: "Invent and Simplify",
        body: [
          "Best proof: consolidating 7 per-project CI/CD templates into one shared source (Story 6). Angle: I turned seven drifting copies into a single source of truth so improvements propagate once.",
          "Backups: the reporting automation that replaced manual log review (Story 11) and the microservices migration that became a reusable modernization template (Story 4).",
        ],
      },
      {
        heading: "Hire and Develop the Best",
        body: [
          "Best proof: the Orange Teaming rebuild (Story 9). Angle: I was promoted to tech lead, onboarded two frontend developers and the lead tester, and set the pull-request and code-review standards for a brand-new team.",
          "This is your cleanest people-leadership story; use it whenever the question is about growing a team or raising others' work, not just shipping your own.",
        ],
      },
      {
        heading: "Bias for Action / Frugality",
        body: [
          "Bias for Action: the carve-out under a hard deadline (Story 5). Frugality: scaling the batch 233 percent with no vertical scale-up (Story 1) and right-sizing the carve-out's RDS (Story 5). Angle: I delivered more throughput and a lower bill by fixing the system, not by buying capacity.",
        ],
      },
      {
        heading: "Think Big / Learn and Be Curious",
        body: [
          "Think Big: Nexity's first microservices migration (Story 4), which started as one POC and became the foundation for a new modernization department. Learn and Be Curious: the Bedrock RAG pipeline (Story 12) and the move to passwordless federated identity (Story 8), both of which were new ground you took on and shipped.",
        ],
      },
    ],
    keyPoints: [
      "Pre-assign one primary story per principle so you never stall picking an example.",
      "Dive Deep is your strength — know the exact mechanism, not just the result.",
      "Hire and Develop / leadership = Orange Teaming (Story 9); don't default to backend wins.",
      "Memorize the numbers: +233%, 35%, 30%, 40+ partners, 1k-10k attacks, ~2,000 req/day, ~80 users, 7 codebases.",
      "Have a 'what I would do differently' ready for each story — they will ask.",
      "For Disagree and Commit, show both halves: the pushback and the commitment after.",
      "Reuse stories across principles by changing emphasis; keep the result quantified and last.",
    ],
    checklist: [
      "One primary story assigned per high-priority LP",
      "A leadership story (Orange Teaming) ready, separate from backend wins",
      "A real failure / disagreement story ready with both halves",
      "'What I'd do differently' prepared for each story",
      "Key numbers memorized cold",
    ],
  },

  // ── 4. Study Focus ────────────────────────────────────────────
  {
    id: "my-focus",
    group: "For You",
    label: "Study Focus",
    icon: "◎",
    title: "Your Study Focus",
    tagline: "An opinionated, dated plan for the current loop cluster: Toast, Autodesk, and Treasure Data, plus the AWS SAA exam.",
    sections: [
      {
        heading: "Priority order (highest expected value first)",
        body: [
          "1. Recruiter screen prep (Your Pitch + Recurring Questions). Cheapest to prep, and it gates everything else. The nearest screen is the highest priority; tailor the pitch to that company first.",
          "2. Behavioral (Story Bank + LPs). Reused in every round at every company, so it has the highest leverage. Your raw material is strong; the work is making it muscle memory and broadening past Nexity-only answers.",
          "3. System Design. Staff and senior rounds weight this heavily, and Treasure Data (realtime) and Toast (scale) will lean on it. Your three case studies (the public API, the SQS/Lambda/DynamoDB batch system, and the Bedrock RAG pipeline) are a head start; practice narrating each as a five-minute deep dive.",
        ],
      },
      {
        heading: "Priority order (continued)",
        body: [
          "4. Coding (LeetCode patterns). Necessary, but do not over-index. For staff/senior the bar is clean, correct, and communicated, not competitive-programming speed. Drill patterns and recognition, not raw problem count.",
          "5. SOLID / Clean Architecture. Likely if a round is a code-review or refactor exercise, a format you have seen before. Medium priority unless a specific round flags it.",
          "6. AWS AI / Bedrock / RAG. Your differentiator, not a gate. Prep enough to present the RAG pipeline crisply and field follow-ups two layers deep. High return in \"tell me about a system\" moments and for AI-adjacent roles.",
        ],
      },
      {
        heading: "The honest read on your profile",
        body: [
          "Your CV is strong where most candidates are weak: real distributed, serverless, and event-driven systems (Lambda, API Gateway, SQS, SNS, EventBridge, DynamoDB, Bedrock), genuine production scale, and quantified wins you can defend. Your behavioral material is rich because you have actually owned things, across three companies, not one.",
          "So the goal is not to build skills from zero. It is to make existing strengths legible and interview-ready, to broaden your behavioral answers off Nexity-only, and to shore up the two things interviews test artificially: live coding and crisp design narration.",
        ],
      },
      {
        heading: "Cadence: bias toward active reps",
        body: [
          "A structured plan can quietly become a way to avoid the harder, vaguer work, which is mock interviews and talking out loud. Bias toward active reps: one spoken mock per day beats three hours of silent reading. Rehearse stories aloud until the numbers are automatic, and narrate at least one system design out loud per session.",
          "Use the Companies pages (Toast, Autodesk, Treasure Data) to tailor stories per loop, and the SOLID Lab and Clean Architecture pages so you can name design trade-offs in the interviewer's vocabulary.",
        ],
      },
      {
        heading: "AWS SAA — protect a lane, don't let it crowd the loops",
        body: [
          "Your SAA exam is on June 21, 2026, which is close. Keep a small, separate study lane for it, but the active loops come first while they are live. Your hands-on Lambda, API Gateway, SQS, SNS, DynamoDB, RDS, and WAF experience already covers a real chunk of the blueprint, so spend exam time on the gaps: networking depth, the storage and database service matrix, and cost and security scenarios. If a loop crunch and the exam genuinely collide, decide deliberately which to move rather than half-doing both.",
        ],
      },
    ],
    keyPoints: [
      "Order: recruiter screen → behavioral → system design → coding → SOLID/Clean Arch → AWS AI.",
      "Tailor the pitch to the nearest screen first; it gates everything.",
      "Behavioral is highest-leverage: make it muscle memory and broaden off Nexity-only.",
      "System design: narrate the public API, the batch system, and the RAG pipeline as 5-min deep dives.",
      "LeetCode: drill pattern recognition, not problem count; the bar is clean + communicated.",
      "RAG/Bedrock is your differentiator, not a gate — prep it to present, not to pass a filter.",
      "One spoken mock per day beats three hours of silent reading.",
      "SAA (June 21) gets a protected lane but yields to live loops.",
    ],
    checklist: [
      "Pitch tailored to the nearest recruiter screen",
      "3-4 stories rehearsed aloud until numbers are automatic",
      "System-design framework memorized; 3 case studies ready as deep dives",
      "LeetCode: can name the pattern from a prompt in 60 seconds",
      "SOLID + Clean Architecture: can identify violations and refactor live",
      "RAG/Bedrock walkthrough crisp; can answer fine-tune-vs-RAG and eval follow-ups",
      "AWS SAA lane scheduled without crowding live loops",
    ],
  },
];
