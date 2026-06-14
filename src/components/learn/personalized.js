// Personalized interview-prep concepts for Abdelkarim Adnane.
//
// Same shape as concepts.js — these render generically via ConceptPage.jsx.
// Every story and number here is traceable to a real CV bullet (backend +
// architect variants). Group is always "For You" so the Learn hub can surface
// them as a personalized section.
//
// Shape of a concept:
//   {
//     id, group, label, icon, title, tagline,
//     sections: [{ heading, body: [paragraph, ...], code?: { lang, source } }],
//     keyPoints: [string, ...],
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
    tagline: "A 90-second present-past-future arc built from your real Nexity track record, with one backend cut and one architect cut.",
    sections: [
      {
        heading: "How to use this page",
        body: [
          "Tell Me About Yourself is not your life story. It is a 60-90 second positioning statement that follows a present-past-future arc: where you are now, the path that got you here, and why this role is the obvious next step. You deliver it once, well-rehearsed, and let it set the frame for the whole conversation.",
          "Below are two variants tuned to your two CVs. Pick the one that matches the role you are interviewing for. Memorize the shape, not the exact words, so it still sounds like a person talking and not a recording.",
        ],
      },
      {
        heading: "Variant A — Backend engineer roles (~90 seconds)",
        body: [
          "Present: I am a Senior Tech Lead at Nexity, one of France's largest real-estate groups. I co-designed and own our core lead-capture API: a Python, AWS serverless, WAF-hardened public endpoint that serves more than 40 partner integrations including SeLoger, LeBonCoin, Bien'ici, Google, Meta, and TikTok. Day to day I am hands-on from infrastructure all the way to shipped code.",
          "Past: I have about seven years building backend, cloud, and platform systems. I started on the Nexity account through Capgemini, where I led their first microservices migration and was promoted from engineer to engineering lead. I then joined Nexity directly and was promoted to Tech Lead after my first year. Along the way I have done the deep backend work I enjoy most: I scaled a batch job from 15,000 to 50,000 items per run, a 233 percent increase, and cut wall-clock time 35 percent purely through PostgreSQL query tuning, indexing, and Spring Batch chunk sizing, with no vertical scale-up. On an earlier system I cut SQL query time 30 percent through query-plan analysis and indexing.",
          "Future: I am now based in Vancouver as a Canadian permanent resident, open to remote or relocation, and I am sitting my AWS Solutions Architect Associate exam on June 21st. I am looking for a senior backend role where I can keep owning systems end to end, and the work your team is doing on [specific to company] is exactly the kind of problem I want to go deep on.",
        ],
      },
      {
        heading: "Variant B — Cloud / Solutions Architect roles (~90 seconds)",
        body: [
          "Present: I am a Senior Tech Lead at Nexity, where I own the AWS serverless architecture for a business-critical lead-capture platform serving more than 40 partner integrations, plus our Data department's Azure DevOps CI/CD platform across 7 application codebases. My strength is system modernization and integration design, while staying hands-on with delivery.",
          "Past: Over about seven years I have designed and delivered backend, integration, and platform systems. At Capgemini on the Nexity account I led their first microservices migration: I split a monolith into two Spring Boot services plus a serverless partner-auth layer on AWS, and that work became the proof of concept that anchored a new modernization department. At Nexity I defined the integration model for partner ingestion, a shared schema with per-partner rules, deduplication, and routing, and I held Product Owner duties alongside the Tech Lead role for a year, so I am comfortable from stakeholder discovery through to architecture docs and code.",
          "Future: I am Vancouver-based as a Canadian PR, open to remote or relocation, and I sit my AWS Solutions Architect Associate exam on June 21st. I want a cloud or solutions-architecture role where I can own the design and still ship, which is why this role and your platform stood out to me.",
        ],
      },
      {
        heading: "Tailoring the forward hook",
        body: [
          "The last sentence is the only part you rewrite per company. Drop in one concrete, researched detail: a product they ship, a scale challenge they have talked about publicly, or a technology in their stack you have real experience with. Generic enthusiasm reads as filler; one specific hook reads as intent.",
        ],
      },
    ],
    keyPoints: [
      "Lead with the lead-capture API ownership — it is your single strongest, most concrete anchor.",
      "Always say the numbers out loud: 40+ integrations, 15,000 to 50,000 (+233%), 35% and 30% cuts.",
      "Name the promotions (engineer to lead at Capgemini, Tech Lead after year one at Nexity) — they signal trajectory without bragging.",
      "Close with Vancouver, PR, open to remote/relocation, and AWS SAA on June 21 — it answers logistics before they ask.",
      "Keep it to 90 seconds; rehearse the arc, not the script, so it sounds conversational.",
      "Rewrite only the final hook per company; leave the rest stable.",
    ],
  },

  // ── 2. STAR Story Bank ────────────────────────────────────────
  {
    id: "my-stories",
    group: "For You",
    label: "Story Bank",
    icon: "✦",
    title: "Your STAR Story Bank",
    tagline: "Eight real, quantified stories in Situation-Task-Action-Result form, each mapped to the Amazon Leadership Principles it proves.",
    sections: [
      {
        heading: "How to use the bank",
        body: [
          "Each story below is one CV achievement written in STAR form, in your own first-person voice, ending with the Leadership Principles it best demonstrates. In the room you do not recite the four labels; you tell it as a story and lean on the structure so you never forget the result. Always land the number.",
          "Prepare two or three of these cold so you can redeploy them under different question framings — a single story can answer ownership, dive deep, and deliver results depending on what you emphasize.",
        ],
      },
      {
        heading: "Story 1 — Scaling the batch job 233% with no new hardware",
        body: [
          "Situation: At Nexity a core batch process was straining as data volume grew, and the obvious fix everyone reaches for is to throw a bigger machine at it.",
          "Task: I needed to increase throughput substantially without a vertical scale-up, because more hardware is recurring cost and it hides the real bottleneck rather than fixing it.",
          "Action: I profiled where the run was actually spending its time, tuned the PostgreSQL queries, added the right indexes, and re-tuned the Spring Batch chunk sizing so the job committed in efficient batches instead of fighting the database.",
          "Result: Throughput went from 15,000 to 50,000 items per run, a 233 percent increase, and wall-clock time dropped 35 percent, all with the same hardware footprint.",
          "Leadership Principles: Dive Deep (I went into the query plans and chunk behavior instead of guessing), Frugality (more output, zero added infra cost), Deliver Results.",
        ],
      },
      {
        heading: "Story 2 — Keeping the public API up through attack surges",
        body: [
          "Situation: Our lead-capture API is a public, WAF-hardened endpoint that more than 40 partners depend on. On spike days it would absorb 1,000 to 10,000 attack attempts while baseline traffic of about 2,000 requests a day still had to flow.",
          "Task: I had to keep the endpoint available and clean under bot-traffic surges without the WAF accidentally blocking legitimate partners, which would break real integrations.",
          "Action: I supervised the WAF rule changes through the surges and actively hunted for false positives, tracing partner blocks back to specific rules and resolving them so genuine traffic from partners like SeLoger and LeBonCoin kept getting through.",
          "Result: The API stayed available through the surges, attacks were blocked, and partner integrations kept flowing without false-positive outages.",
          "Leadership Principles: Customer Obsession (partners are the customer, and a false-positive block hurts them directly), Ownership, Insist on the Highest Standards.",
        ],
      },
      {
        heading: "Story 3 — Rewriting the marketing app from .NET as the sole engineer",
        body: [
          "Situation: Nexity's marketing app was on .NET, slow to start at roughly 1.5 minutes, and serving about 80 active users across multiple departments.",
          "Task: I was the sole engineer on the rewrite, so I owned the architecture, the stack choice, and delivery end to end.",
          "Action: I re-architected it onto Spring Boot and React, chose the stack including migrating the front end from JavaScript to TypeScript for type safety, and shipped real features on top: URL tracking, ad-action tracking, and a lead-priority API.",
          "Result: Startup went from about 1.5 minutes to near-instant, and the rebuilt app kept serving its roughly 80 users across departments on a maintainable, typed codebase.",
          "Leadership Principles: Ownership (sole engineer, full stack-to-architecture responsibility), Invent and Simplify, Deliver Results.",
        ],
      },
      {
        heading: "Story 4 — Leading Nexity's first microservices migration",
        body: [
          "Situation: At Capgemini on the Nexity account, the core platform was a monolith, and the group had no proven path to break it apart.",
          "Task: I was asked to lead Nexity's first microservices migration and prove the approach could work.",
          "Action: I split the monolithic core into two Spring Boot services, a real-estate catalog and a partner platform, and added a serverless partner-auth layer on AWS using Lambda, API Gateway, and Secrets Manager.",
          "Result: The migration validated as the proof of concept that anchored a brand-new modernization department at the group, and it earned me the move from engineer to engineering lead.",
          "Leadership Principles: Think Big (it became the template for a whole department), Invent and Simplify, Ownership.",
        ],
      },
      {
        heading: "Story 5 — The Nexity carve-out under time pressure",
        body: [
          "Situation: Nexity sold off a part of the business, and the impacted applications had to be cloned and stood up independently for the acquiring company.",
          "Task: I led the carve-out, which meant getting working environments running for a separate organization while keeping cost sane.",
          "Action: I cloned the impacted applications, set up Azure DevOps and the runtimes, made the app-level fixes the split required, ran technical walkthroughs for the new owners, and right-sized the RDS instances to cut the monthly infrastructure bill.",
          "Result: The acquiring company got standing, working applications, with handover walkthroughs done and a lower monthly infrastructure cost than a lift-and-shift would have produced.",
          "Leadership Principles: Bias for Action (a carve-out has a hard deadline), Frugality (RDS right-sizing), Earn Trust (technical walkthroughs handing over to a new org).",
        ],
      },
      {
        heading: "Story 6 — Consolidating CI/CD across 7 codebases",
        body: [
          "Situation: My team owned 7 application codebases across multiple repositories, each carrying its own separate Azure DevOps pipeline templates that drifted apart over time.",
          "Task: I wanted any pipeline improvement or fix to propagate once instead of being copy-pasted into seven places.",
          "Action: I consolidated the separate per-project templates into one shared source so updates propagate centrally, and I optimized the pipeline steps to reduce run time.",
          "Result: The 7 codebases now share one CI/CD source of truth, so updates land everywhere at once, and pipeline runs are faster.",
          "Leadership Principles: Invent and Simplify (one source instead of seven), Insist on the Highest Standards, Ownership.",
        ],
      },
      {
        heading: "Story 7 — Cutting customer-record query time 30%",
        body: [
          "Situation: The group-wide customer record system, used across most Nexity applications and ingesting around 10,000 notifications a day via SQS plus 200,000 to 300,000 records per batch, had a user-facing latency bottleneck.",
          "Task: I needed to fix the latency users were feeling while also adding new business logic for internal consumers of the system.",
          "Action: I did query-plan analysis to find where the time was going and added the right indexes to address it directly, rather than caching around the symptom.",
          "Result: SQL query time dropped 30 percent and the user-facing latency bottleneck was resolved, on a system operating at real scale.",
          "Leadership Principles: Dive Deep (query-plan analysis), Customer Obsession (resolving a user-facing bottleneck), Deliver Results.",
        ],
      },
      {
        heading: "Story 8 — Passwordless federated identity for partners",
        body: [
          "Situation: Partner authentication into our platform was still password-based, which is weaker security and more support overhead.",
          "Task: I needed to move partners onto a stronger, modern authentication model without breaking their access.",
          "Action: I replaced password-based partner authentication with Azure ADFS passwordless federated identity, delivered through the serverless auth layer I had built on AWS.",
          "Result: Partners moved to federated, passwordless sign-in, removing shared-secret password handling from the integration path.",
          "Leadership Principles: Insist on the Highest Standards (security posture), Earn Trust, Learn and Be Curious.",
        ],
      },
    ],
    keyPoints: [
      "Failure / setback question: lead with the WAF false-positive surge story (Story 2) — judgment under live pressure.",
      "Conflict / pushback question: use the batch story (Story 1) where you resisted the 'just add hardware' default.",
      "Ambiguity / no playbook question: use the microservices migration (Story 4) or the carve-out (Story 5).",
      "Bias for Action / deadline question: lead with the carve-out (Story 5).",
      "Dive Deep / technical depth question: batch tuning (Story 1) or the 30% query-time cut (Story 7).",
      "Ownership / scope question: the solo .NET rewrite (Story 3) is your cleanest end-to-end ownership proof.",
    ],
  },

  // ── 3. Amazon LP Map ──────────────────────────────────────────
  {
    id: "my-amazon-lp",
    group: "For You",
    label: "Amazon LPs",
    icon: "▲",
    title: "Your Amazon LP Map",
    tagline: "Six Leadership Principles, each pre-loaded with the one story that proves it and the angle to take — for an Amazon or AWS loop.",
    sections: [
      {
        heading: "How an Amazon loop works",
        body: [
          "An Amazon interview loop is behavioral-heavy and explicitly graded against the Leadership Principles. Most questions are some version of \"tell me about a time when...\", and your interviewers compare notes against specific LPs afterward. Map your best stories to principles ahead of time so you are never improvising which example to reach for.",
          "Expect deep follow-ups. They will push past the headline result into what exactly you did, what the data showed, and what you would do differently. Know your numbers and your trade-offs cold. Every story referenced here is defined on your Story Bank page.",
        ],
      },
      {
        heading: "Ownership",
        body: [
          "Best proof: the solo .NET to Spring Boot/React rewrite (Story 3). Angle: I was the sole engineer and owned architecture, stack choice, the TypeScript migration, and the shipped features — there was nobody else to defer the decision to.",
          "Backup: owning the lead-capture API and the CI/CD platform across 7 codebases.",
        ],
      },
      {
        heading: "Dive Deep",
        body: [
          "Best proof: the batch tuning (Story 1) and the 30 percent customer-record query-time cut (Story 7). Angle: in both I went into query plans and chunk/index behavior instead of papering over the symptom with more hardware or caching.",
          "This is your strongest principle — expect them to keep drilling, and have the specific mechanism ready (which index, why chunk sizing mattered).",
        ],
      },
      {
        heading: "Customer Obsession",
        body: [
          "Best proof: resolving WAF false-positive partner blocks during attack surges (Story 2). Angle: the 40-plus partners are the customer, and a false-positive block is a self-inflicted outage for them, so keeping their traffic flowing while still blocking attacks was the whole job.",
          "Backup: the 30 percent query-time cut resolved a user-facing latency bottleneck (Story 7).",
        ],
      },
      {
        heading: "Invent and Simplify",
        body: [
          "Best proof: consolidating 7 per-project CI/CD templates into one shared source (Story 6). Angle: I turned seven drifting copies into a single source of truth so improvements propagate once.",
          "Backup: the microservices migration that became a reusable modernization template (Story 4).",
        ],
      },
      {
        heading: "Frugality",
        body: [
          "Best proof: scaling the batch 233 percent with no vertical scale-up (Story 1), and RDS right-sizing in the carve-out (Story 5). Angle: I delivered more throughput and a lower bill by fixing the system, not by buying capacity.",
        ],
      },
      {
        heading: "Think Big",
        body: [
          "Best proof: Nexity's first microservices migration (Story 4). Angle: it started as one POC and became the foundation that anchored a new modernization department — the impact outgrew the original task.",
        ],
      },
    ],
    keyPoints: [
      "Pre-assign one primary story per principle so you never stall picking an example.",
      "Dive Deep is your strength — know the exact mechanism (indexes, chunk sizing, query plans), not just the result.",
      "Memorize the numbers: +233%, 35%, 30%, 40+ partners, 1k-10k attacks, ~2,000 req/day, ~80 users, 7 codebases.",
      "For each story have a 'what I would do differently' ready — they will ask.",
      "Reuse stories across principles by changing what you emphasize, not by inventing new ones.",
      "Keep the result quantified and last — land the number, then stop talking.",
    ],
  },

  // ── 4. Study Focus ────────────────────────────────────────────
  {
    id: "my-focus",
    group: "For You",
    label: "Study Focus",
    icon: "◎",
    title: "Your Study Focus",
    tagline: "An opinionated, dated plan for what to drill in this app given your profile and the June 21 AWS SAA exam.",
    sections: [
      {
        heading: "The honest read on your profile",
        body: [
          "Your CV is already strong where most candidates are weak: real distributed, serverless, and event-driven systems (Lambda, API Gateway, SQS, SNS, EventBridge, DynamoDB), genuine production scale, and quantified wins you can defend. Your behavioral material is rich because you have actually owned things. So the goal is not to build skills from zero — it is to make your existing strengths legible and interview-ready, and to shore up the two areas that interviews test artificially: live coding and crisp design narration.",
          "Two hard dates anchor the plan: the AWS Solutions Architect Associate exam on June 21, 2026, and whatever interview loops you are in. The exam should not be crowded out by interview prep, so protect time for it.",
        ],
      },
      {
        heading: "System design — leverage, don't cram",
        body: [
          "This is where your experience converts directly into interview signal. Use the app's System Design surface to practice narrating designs you have actually built: the lead-capture ingestion pipeline (shared schema, per-partner rules, deduplication, fan-out to database, internal systems, and call center) is a textbook event-driven design question you can answer from memory. Practice drawing it and talking trade-offs out loud, because knowing it and explaining it under time pressure are different skills.",
          "Pair this with the Clean Architecture concept page so you can frame your microservices-migration story in standard vocabulary (boundaries, dependencies pointing inward) that interviewers expect.",
        ],
      },
      {
        heading: "LeetCode and DS&A — keep the blade sharp",
        body: [
          "You are strong on backend systems, but live algorithm coding is a separate, perishable skill that does not show up in day-to-day platform work. Use the app's LeetCode surface and Study Plans to drill the core patterns on a steady cadence rather than binge-cramming: arrays and hashing, two pointers, sliding window, binary search, trees with BFS/DFS, and graphs. Consistency beats volume here.",
          "Do not over-invest past competence. You are not interviewing as a new grad; you need to be fluent on mediums, not to grind hards. Spend the marginal hour on design and behavioral instead once your pattern recall is solid.",
        ],
      },
      {
        heading: "Behavioral / LP — already your edge, so finish it",
        body: [
          "Your Story Bank and Amazon LP Map pages are mostly done thinking — now make them muscle memory. Rehearse three or four stories out loud until the numbers are automatic and you can re-aim one story at different questions. This is the highest return per hour you have, because the raw material is genuinely strong and most candidates' is not.",
          "Use the SOLID Lab and the principle concept pages (DRY, KISS, and the rest) so that when an interviewer asks a design-judgment question, you can name the trade-off in their vocabulary instead of describing it informally.",
        ],
      },
      {
        heading: "AWS SAA — protect the exam",
        body: [
          "The exam is June 21. Until then, keep a steady, separate study lane for SAA breadth: the services beyond your daily set, the Well-Architected pillars, and the exam's scenario style. Your hands-on Lambda, API Gateway, SQS, SNS, DynamoDB, RDS, and WAF experience already covers a real chunk of the blueprint, so focus exam time on the gaps: networking depth, the storage and database service matrix, and cost and security scenarios. Do not let an interview crunch eat the week before June 21.",
        ],
      },
    ],
    keyPoints: [
      "Do this first: lock the AWS SAA study lane through June 21 — it is dated and non-negotiable.",
      "Second: rehearse 3-4 Story Bank stories out loud until the numbers are automatic (highest return per hour).",
      "Third: narrate the lead-capture pipeline as a System Design answer end to end, out loud, with trade-offs.",
      "Fourth: steady LeetCode pattern drilling via Study Plans — fluency on mediums, not grinding hards.",
      "Lean on existing strengths (serverless, event-driven, real scale); don't rebuild what your CV already proves.",
      "Use SOLID Lab, Clean Architecture, and the principle pages to put standard vocabulary on experience you already have.",
    ],
  },
];
