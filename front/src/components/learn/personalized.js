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
          "The recruiter screen comes first and it gates everything, and the recruiter is almost always non-technical — many first hiring-manager calls are too. Name the technologies so the keywords land (Java, Spring, AWS, Bedrock), but never explain their internals. The test for every sentence: would a smart non-engineer follow it and be able to repeat it to the hiring manager?",
          "Say \"a public API on AWS that takes in leads from 40+ partners and stays up under constant bot traffic,\" not \"a WAF-hardened serverless endpoint with idempotent ingestion.\" Same fact, plain words. Naming WAF rules, chunk sizing, or EventBridge to a non-technical listener does not land as competence; it lands as noise. Go one layer deeper only when they ask a follow-up — let them pull you in.",
          "Read the room live: if they ask how something works, go deeper; if they nod and move on, stay at the outcome level. Lead with what changed for the business — faster, more reliable, bigger scale, lower cost, a team you grew — and reach for the mechanism only if asked. The two variants below cover the same ground at two altitudes: the plain one keeps the headline wins for screens; the technical one adds the exact numbers and names the stack for engineers.",
        ],
        callout: { kind: "tip", title: "The repeatability test", text: "If your recruiter can't repeat your flagship story to the hiring manager in one sentence, it was too technical. Rewrite it in plain words until they can." },
      },
      {
        heading: "Base pitch — recruiter / non-technical (~75s, plain language)",
        card: true,
        tag: "Say this on screens",
        body: [
          "Present: I'm a senior backend and platform engineer with about seven years of experience. Right now I'm a tech lead running my own small consultancy, embedded long-term with one of France's largest real-estate groups.",
          "Flagship: Most of my work centers on a public system that takes in customer leads — it pulls them in from more than 40 outside partners, names like Google, Meta, and the big property websites, and a big part of my job is keeping it reliable and secure even when it's under constant bot traffic. I've been the tech lead on it for a few years, hands-on from the infrastructure all the way to the shipped code.",
          "Sweep: Beyond that I've owned a few things end to end — I rebuilt a slow internal app so it starts almost instantly instead of taking about a minute and a half, I made a data process handle more than three times the volume with no new hardware, and I built our internal AI assistant over our own knowledge base. I've also been promoted into team-lead roles twice along the way, where I brought on and mentored new engineers.",
          "Future + handoff: What I'm looking for now is a permanent senior or staff role at a product company where I can own systems long-term and keep working across both infrastructure and code — which is exactly why this role caught my eye. Happy to go deeper on any of that — what would be most useful for you?",
        ],
      },
      {
        heading: "Technical variant — engineers / tech leads (names the stack)",
        card: true,
        tag: "When the room is technical",
        body: [
          "Present: I'm a senior backend engineer and tech lead, about seven years building production backend, cloud, and platform systems, hands-on from architecture to shipped code.",
          "Flagship: I co-designed and own a WAF-hardened public lead-capture API on AWS serverless, serving 40+ partner integrations — SeLoger, LeBonCoin, Google, Meta, TikTok — under constant bot traffic, where the job is staying available without false-positive blocks on real partners.",
          "Sweep: I scaled a batch job from 15,000 to 50,000 items per run (+233%) and cut wall-clock time 35% through PostgreSQL tuning and Spring Batch chunk sizing with no new hardware; rewrote a .NET marketing app to Spring Boot and React solo; built a Retrieval-Augmented Generation pipeline on AWS Bedrock; and consolidated CI/CD across 7 codebases. I've been promoted to tech lead twice, at Capgemini and again at Orange.",
          "Future + handoff: I want a permanent senior or staff backend role where I own systems end to end. The work your team is doing on [one researched detail] is exactly what I want to go deep on. Happy to go deeper on any of those — what's most useful for you?",
        ],
      },
      {
        heading: "Choosing your flagship: swap one, keep the shape",
        body: [
          "This is the only real tailoring you do, and it is why one pitch covers every company: the opening line, the sweep, and the close stay fixed; you swap which project becomes the flagship to match what the role emphasizes. Pick one — leading with three is the same as leading with none.",
          "The public lead-capture API is your default flagship because reliability, scale, and ownership read as senior everywhere. Reach for a different lead only when the role clearly centers on something else.",
        ],
        table: {
          headers: ["If the role emphasizes…", "Lead with this flagship", "The one-line (recruiter level)"],
          rows: [
            ["Reliability · throughput · scale", "The public lead-capture API", "A public system 40+ partners depend on that stays up under constant attack — and I scaled our batch processing roughly 3× with no new hardware."],
            ["Platform · developer enablement · tooling", "CI/CD consolidation + the carve-out", "I got seven codebases shipping from one shared pipeline so fixes land everywhere at once, and I stood up a whole set of applications for the company that acquired part of our business."],
            ["AI · data · realtime", "The Bedrock RAG pipeline", "I built an internal AI assistant — a retrieval system grounded in our own knowledge base — on Amazon Bedrock."],
            ["Full-stack · product depth", "The .NET → Spring Boot + React rewrite", "I rebuilt a slow internal product end to end, owning both the backend and the front end, and took startup from about 90 seconds to near-instant."],
          ],
        },
      },
      {
        heading: "Framing the consulting-to-full-time move",
        body: [
          "You operate through your own consulting vehicle, NOVACODE LABS, and ran a long embedded engagement as tech lead; that engagement is concluding around the end of June. Frame it as a deliberate choice, not a gap: you ran a multi-year embedded engagement and are now intentionally moving into a permanent senior or staff role where you can own outcomes long-term.",
          "Keep it confident and forward-looking, never defensive and never critical of the client. The honest one-liner: the engagement is wrapping up and I'm choosing to move from consulting into a permanent senior role where I can go deeper on platform and architecture. The fuller \"why are you leaving\" answer — relocation and Vancouver — lives on the Recruiter Screen page.",
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
      "Default flagship = the public lead-capture API (reliability + scale read everywhere).",
      "Numbers beat adjectives: 40+ integrations, 15k→50k (+233%), 35% faster, 7 codebases, ~90s→instant.",
      "Name both tech-lead promotions (Capgemini, Orange) to signal trajectory, not just one client.",
      "End with a handoff question; frame the consulting-to-FTE move as a deliberate choice.",
    ],
    checklist: [
      "Plain-language recruiter pitch rehearsed aloud, under 100 seconds, zero jargon",
      "Technical variant rehearsed for engineer rooms",
      "Default flagship (the API) automatic; the other three flagships ready to swap in",
      "Can pick the right flagship from a job description in under a minute",
      "One researched forward-hook sentence written for the next screen",
      "Consulting-to-FTE framing crisp and non-defensive",
      "Numbers automatic: +233%, 35%, 40+, 7 codebases",
    ],
  },

  // ── 2. Recruiter Screen Playbook ──────────────────────────────
  {
    id: "my-recruiter-screen",
    group: "For You",
    label: "Recruiter Screen",
    icon: "📞",
    title: "Your Recruiter-Screen Playbook",
    tagline: "Every recruiter-screen question with a ready answer — why this company, why you're leaving, comp, work auth, logistics, the three questions to ask, and the curveballs — written once, generic for any company.",
    sections: [
      {
        heading: "What a recruiter screen actually is",
        body: [
          "The recruiter screen is the first gate, and it is not technical. There is no LeetCode, no system design, no live coding — those come later. The recruiter is checking that you can talk about your work clearly, that your story is coherent, that comp and logistics line up, and that you actually know who they are. Keep this page open in front of you on the call; it is allowed and it is exactly what it is for.",
          "One base pitch covers every company. Only two things change per call: which flagship project you lead with (see Your Pitch) and the \"why this company\" answer. Everything else here — why you're leaving, comp, work authorization, availability, your questions — is the same script every time, so make it automatic once and stop re-deciding it on the call.",
        ],
        callout: { kind: "tip", title: "You're prepping the right round", text: "No LeetCode, no system design, no live coding happens on a recruiter screen. If you're grinding algorithms the night before, you're prepping the wrong round — rehearse this page out loud instead." },
      },
      {
        heading: "1 · Tell me about yourself",
        body: [
          "This opens almost every screen. The full treatment — the 60–90 second arc, the recruiter-level plain-language version, the technical version, and how to pick your flagship — is on the Your Pitch page. The one rule to carry into the room: go deep on one flagship, sweep the rest, stay at the outcome level, and let the recruiter pull you into detail.",
        ],
      },
      {
        heading: "2 · Why this company / why this role",
        card: true,
        tag: "Method, not a script",
        body: [
          "Recruiters screen hard for whether you actually know them, so this is the one answer you research fresh each time. The shape is two beats: one sentence on what the company does and the kind of engineering that implies, then one or two specific hooks that tie their world to your real experience.",
          "Hook to whatever they emphasize, using what you genuinely have: if the role wants AI in the product or the dev lifecycle, lead with your production RAG system on Bedrock — real, not a buzzword. If it's full-stack, point to the .NET-to-Spring rewrite where you owned both the backend and the front end. If it's high-throughput, platform, or scale, point to the public API serving 40+ partners under constant load, or the CI/CD consolidation across seven codebases.",
          "Template: \"You're [what they do], which means [the kind of systems that implies] — that's exactly the work I've done with [your matching flagship]. Two things drew me in: [specific hook #1 tied to your experience], and [specific hook #2].\" Generic enthusiasm reads as filler; one specific, researched hook reads as intent.",
        ],
      },
      {
        heading: "3 · Why are you leaving / why now",
        card: true,
        tag: "Script",
        body: [
          "The true core: continuing your engagement would have required relocating back to France (and moving to a hybrid setup), and you've built your life in Vancouver and you're staying. You weren't discarded — you had a path and chose Vancouver over it. Lead with that, measured and brief.",
          "Remote role (you can include the hybrid piece): \"Continuing with my current engagement would have meant relocating back to France and moving to a hybrid setup, and I've built my life in Vancouver and I'm committed to staying here, ideally remote. So that chapter is closing, and I'm focused on a permanent role with a company set up the way this one is.\"",
          "Hybrid role (lead with relocation ONLY — never argue against their own model): \"Continuing with my current engagement would have meant relocating back to France, and I've built my life in Vancouver and I'm staying. So that chapter is closing, and I'm focused on a permanent role based here, which is a big part of the appeal.\"",
          "If they probe \"so they wanted to keep you?\": \"The only way to continue would have meant moving back to France and a setup that didn't fit my life here, so it wasn't a real fit on either side. It pushed me toward something I wanted anyway — a permanent product role, based in Vancouver.\" If they probe \"was it performance?\": \"No, nothing to do with my work. It came down to location and setup, and I'm choosing Vancouver.\"",
        ],
        callout: { kind: "warn", title: "Keep it clean", text: "Never use the word \"forced.\" Never criticize the client. Don't claim you walked away from a great offer — you'd have to defend it. Rest on what plainly happened: France plus hybrid didn't fit, you're staying in Vancouver. Keep all politics and frustration out of your voice." },
      },
      {
        heading: "4 · Compensation",
        card: true,
        tag: "Script",
        body: [
          "The rule: clarify currency first, give a range tied to the level, then ask their band. Say the number with zero hesitation — hesitation costs you more than the number itself.",
          "Script: \"Before I give a number, can I quickly check whether this role is US-remote and paid in USD, or Canadian? … Based on senior and staff roles in Vancouver, I'm targeting around [your number] base, and I'm flexible on the total package. Do you have a budgeted range for the role?\"",
          "Set the number to the specific req, not a habit: a Staff req supports a higher base than a Senior one, so don't quote a Staff number into a Senior role or anchor low into a Staff one. Check the posted range if there is one and aim upper-middle, not the ceiling. USD versus CAD moves the whole figure, which is why you clarify currency before you commit. If they give a range as base, confirm whether RSUs are separate.",
        ],
        callout: { kind: "tip", title: "If pushed for a single number first", text: "Ask them for the role's budgeted band before you answer. Never anchor low out of nerves — and your current rate is a consultant day rate that doesn't map to a salary, so don't let an old number set the new one." },
      },
      {
        heading: "5 · Work authorization",
        body: [
          "One line, said as an advantage, not a hedge: \"I'm a Canadian permanent resident, fully authorized to work with no sponsorship needed, now or in the future.\"",
        ],
      },
      {
        heading: "6 · Availability & logistics",
        card: true,
        tag: "Script",
        body: [
          "Start timeline: \"My current contract wraps at the end of June, so I could start shortly after, with a couple of weeks to close things out cleanly.\"",
          "Match the location answer to the role's setup. Remote: \"I'm based in Vancouver and fully comfortable working remotely; if there's occasional office or travel, that's fine too.\" Hybrid (you're local): \"I'm in Vancouver — Yaletown — so the hybrid cadence is genuinely easy for me. Happy to be in-office on whatever schedule the team runs.\" Being local de-risks a hybrid hire on their side, so say it plainly.",
        ],
      },
      {
        heading: "7 · A light behavioral, if it comes",
        body: [
          "Some recruiters toss in one behavioral prompt. Have two STAR stories ready at about two minutes each: scaling the batch job from 15,000 to 50,000 items per run with no new hardware, and the solo .NET-to-Spring-Boot rewrite that took startup from ~90 seconds to near-instant. Keep the carve-out as a backup leadership story.",
          "Tell them as Situation, Task, Action, Result — short setup, most of the airtime on what you did, and land the number at the end. The full STAR-L versions of all of these, plus your failure story, are on the Story Bank page; this is just the recruiter-level, two-minute cut.",
        ],
      },
      {
        heading: "8 · The three questions you always ask",
        body: [
          "Having no questions reads as low interest, and these three also pull the intel you need for the next round. Always ask all three.",
        ],
        steps: [
          "What does the full interview process look like from here, and the rough timeline to a decision?",
          "What does the next technical stage involve specifically — the format, what language I'd code in, and whether AI tools are allowed?",
          "What does success look like in this role over the first 6 to 12 months? (or: what is the team working on right now?)",
        ],
        callout: { kind: "tip", title: "Tailor one add-on", text: "Add one company-specific question: confirm remote vs office expectations, where the team sits, the hybrid cadence, the squad structure, or how much of the role is backend versus full-stack. It proves you're thinking about the actual job." },
      },
      {
        heading: "9 · The curveballs (the easy ones that trip people)",
        body: [
          "These are predictable, not hard — being caught flat on an easy one is what hurts. Short answers, all true to your situation.",
        ],
        table: {
          headers: ["If they ask…", "Your answer (short)"],
          rows: [
            ["Walk me through your resume", "A chronological version of the pitch: Capgemini and Orange early (where you were promoted to tech lead), then the long engagement as tech lead where you owned the lead-capture API, the rewrite, the AI assistant, and the CI/CD platform. 60–90s — hit the arc, not a list."],
            ["What are you looking for?", "\"A permanent role at a product company where I own backend systems long-term and work across both infrastructure and application code. I've been consulting for years and want to plant roots somewhere I can build for the long run.\""],
            ["What's your current comp?", "\"I've been contracting, so it's a day rate that doesn't translate cleanly to a salary. For a permanent role I'm targeting around [your number] base.\" Never let an old number anchor the new one."],
            ["What are your strengths?", "Two, each with a proof: end-to-end ownership (own the API from the infra up) and turning messy systems into clean ones (the .NET→Spring rewrite, CI/CD across seven codebases)."],
            ["What's a weakness?", "\"I've spent several years deep in one long engagement, so I'm deliberately broadening right now — sharpening my interview and system-design reps and my exposure to other stacks.\" Pre-empts the one-client concern."],
            ["How do you use AI?", "\"I built a production RAG system on AWS Bedrock over a knowledge base, so I've worked hands-on with retrieval and model integration. Day to day I use AI assistants for scaffolding, tests, and refactoring, with a quality bar on the output.\" Don't overclaim training or fine-tuning."],
            ["Are you interviewing elsewhere?", "\"Yes, I'm in process with a couple of other companies, but this role is a strong fit.\" Don't name them — it signals demand without pressuring."],
            ["Why should we hire you?", "Three sentences: seven years in backend and platform; you own systems end to end including the infra, not just the code; your stack — Java, Spring, AWS serverless, plus the AI work — maps directly to the role."],
            ["When can you start?", "\"My engagement wraps at the end of June, so shortly after, with a couple of weeks to close out cleanly.\""],
          ],
        },
      },
      {
        heading: "Cheat card — keep this visible on the call",
        card: true,
        tag: "Cheat card",
        body: [
          "Pitch spine: senior backend/platform engineer, 7 yrs, tech lead → one flagship that fits the role (the API for reliability/scale · CI/CD + carve-out for platform · RAG + ingestion for AI/data · the rewrite for full-stack) → sweep the rest → want a permanent senior/staff backend role at a product company.",
          "Why leaving: continuing meant relocating to France (+ hybrid); you're staying in Vancouver. Remote roles: you can add the remote/hybrid piece. Hybrid roles: relocation reason ONLY. Never say \"forced,\" never criticize the client.",
          "Salary: clarify currency first, give a number tied to the req's level (Staff > Senior), aim upper-middle of the posted range, ask their band, confirm whether RSUs are separate.",
          "Work auth: Canadian PR, no sponsorship needed. Start: shortly after the end of June.",
          "Always ask 3: (1) process + timeline, (2) next technical stage format + language + AI tools allowed, (3) what success looks like.",
          "Tone: clear, warm, no rambling. Go deep on one thing, ask for the next-stage details, and you've won the call.",
        ],
      },
    ],
    keyPoints: [
      "The recruiter screen is a non-technical gate — clarity, coherence, comp, logistics, and do-you-know-us. No coding.",
      "One base pitch; only the flagship and the 'why this company' answer change per call.",
      "Why leaving = relocation to France, staying in Vancouver. Hybrid roles: relocation reason only. Never 'forced.'",
      "Comp: clarify currency → number tied to the req's level → ask their band. Say it without hesitation.",
      "Work auth is an advantage: Canadian PR, no sponsorship, now or ever.",
      "Always ask three questions and tailor one to the company. No questions reads as no interest.",
      "Have two 2-minute STAR stories ready (batch scaling, .NET rewrite); full versions on Story Bank.",
      "Pre-write the curveballs — current comp, weakness, interviewing elsewhere — so none catch you flat.",
    ],
    checklist: [
      "Pitch rehearsed (see Your Pitch); right flagship picked for this company",
      "'Why this company' researched and written for the next screen",
      "'Why leaving' rehearsed in both the remote and the hybrid version",
      "Comp number set to the req's level; currency question ready",
      "Work-authorization line automatic",
      "Availability + location answer matched to the role's setup",
      "Three questions ready, plus one company-specific add-on",
      "Curveball answers (current comp, weakness, elsewhere, AI) rehearsed",
      "Two 2-minute STAR stories ready for a light behavioral",
    ],
  },

  // ── 3. STAR-L Story Bank ──────────────────────────────────────
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
          "Worked example of the shape (copy the structure, fill it with what actually happened to you, do not claim these specifics): Situation, a partner integration was silently dropping a class of leads. Task, find the cause and stop the loss. Action, I traced it to a WAF rule I had tightened during an attack surge that also matched a legitimate partner pattern; I rolled it back, added a targeted exception, then added a per-partner synthetic canary request so any future false-positive pages us in minutes. Result, leads flowed again and detection time for that failure mode dropped from days to minutes. Learning, at Staff level the durable fix was the detection gap and the process, not the single rule, so I now require a per-partner canary before any WAF tightening. Notice the Learning is about a system and a process, which is the Staff signal, not just personal craft.",
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

  // ── 4. Amazon LP Map ──────────────────────────────────────────
  {
    id: "my-amazon-lp",
    group: "For You",
    label: "Your LP Map",
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
      {
        heading: "The two newer LPs (2021): Earth's Best Employer, Success and Scale",
        body: [
          "Strive to be Earth's Best Employer: map the Orange Teaming rebuild (Story 9). Angle: I onboarded two frontend developers and the lead tester and set the code-review and PR standards for a brand-new team, so I was building people and a healthy engineering culture, not only shipping. Developing others and raising the bar is the evidence this principle looks for.",
          "Success and Scale Bring Broad Responsibility: use the Bedrock RAG pipeline (Story 12) or the public lead-capture API. Angle: at scale the second-order effects are your responsibility too, so I built guardrails and a groundedness check into the RAG system, and on the public API I treated false-positive partner blocks as harm to prevent, not just attacks to stop. These two come up more for senior and leadership loops, so keep one ready for each.",
        ],
      },
    ],
    keyPoints: [
      "Pre-assign one primary story per principle so you never stall picking an example.",
      "Newer LPs: Earth's Best Employer = Orange Teaming (Story 9); Success and Scale = RAG guardrails / API harm-prevention.",
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

  // ── 5. Study Focus ────────────────────────────────────────────
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
          "1. Recruiter screen prep (Your Pitch + Recruiter Screen). Cheapest to prep, and it gates everything else. The nearest screen is the highest priority; tailor the pitch to that company first.",
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
        heading: "RAG / LLM in production: the follow-up stack",
        body: [
          "\"Two layers deep\" on your Bedrock RAG pipeline means three specific follow-ups you should answer cold. One, chunking strategy trade-offs: your chunk size and why, fixed vs semantic vs hierarchical, and how you measured the impact on retrieval quality. Two, fine-tune vs RAG vs prompt: the decision rule (RAG for knowledge, fine-tune for behavior, prompt first) plus a concrete call you actually made. Three, groundedness and evaluation: how you tested for hallucination, what eval set or LLM-as-judge you used, and a real number.",
          "Treasure Data is moving AI-native (the Treasure AI direction) and Autodesk ships AI features across its suite, so rehearse narrating the pipeline as an async, event-driven system with explicit cost and latency choices, not just \"a tool I built.\" That framing reads as a Staff-level architectural decision. The RAG & Vector Search and AI System Design pages under Knowledge are your source material; the Production & Operability page covers the cost and eval-in-prod angle.",
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

  // ── Companies · Zapier — Staff Engineer, Backend (Revenue Zone) ─
  {
    id: "co-zapier",
    group: "Companies",
    label: "Zapier",
    icon: "⚡",
    title: "Zapier — Staff Engineer, Backend (Revenue Zone)",
    tagline: "Prep pack + Ezra screen guide. Own the monetization platform — billing, subscriptions, payments, pricing, entitlements, checkout. Your highest-ceiling, lower-probability shot of the four: a real domain stretch. Run it hard, don't crown it.",
    sections: [
      {
        heading: "Snapshot — the honest read",
        body: [
          "The role: own the technical vision and long-term architecture for Zapier's monetization platform — billing, subscriptions, payments, pricing, entitlements, checkout. Finance-grade, correctness-critical, with heavy cross-team scope across Product, Engineering, Finance, and Sales.",
          "Where it ranks among your four: top-tier, tied with Toast on the two things you care most about — fully remote plus a high base. But it's your biggest fit stretch, because billing and payments is a genuine domain gap and it's the role's second stated requirement. That lowers your odds, especially at the technical stages, and it's a step behind your three live screens.",
          "The play: best target stays Toast; highest-probability stays Autodesk; Zapier is your highest-ceiling, lower-probability play. Run it hard, don't crown it — let real offers decide.",
        ],
        table: {
          headers: ["Dimension", "The read"],
          rows: [
            ["Comp (Canada)", "Base CA$210.7K–316.1K, plus private illiquid equity and a variable, non-guaranteed bonus. Policy reserves the upper half for proven-at-Zapier impact, so a realistic external new-hire base is ~210–263, not 316."],
            ["Remote", "Fully remote, Americas. No visa sponsorship, but your Canadian PR covers you. Works from Vancouver."],
            ["Scope", "Billing, subscriptions, payments, pricing, entitlements, checkout — correctness-critical revenue infrastructure, broad cross-team."],
            ["Fit", "Strong on platform / API / performance; genuine gap on the billing domain. Highest ceiling, lower probability."],
          ],
        },
        callout: { kind: "warn", title: "Don't crown it on base alone", text: "Tied with Toast on remote + base, but Zapier's equity is private and illiquid and the bonus isn't guaranteed — so base is effectively the whole package. Toast's RSUs are liquid public stock. Keep Toast, Autodesk, and Treasure warm; let real offers decide." },
      },
      {
        heading: "The Ezra screen — logistics, locked",
        card: true,
        tag: "Locked logistics",
        body: [
          "Ezra is Zapier's AI-led recruiter screen: a ~25-minute video conversation in English, on your own schedule, due within 7 business days of the email. A human recruiter reviews the result and replies within 7 business days — the AI does not decide.",
          "It covers your experience, how you work, and how you use AI today, with follow-ups generated from your answers. In content it's a recruiter screen, so your normal screen prep applies: pitch, why-leaving, why-Zapier, comp.",
          "There's an opt-out for a non-AI alternative. Don't take it — Zapier is AI-first and values AI fluency, so declining their AI screen is a small negative signal, and a human reviews the result anyway.",
        ],
        callout: { kind: "warn", title: "One-time link — you cannot pause or restart", text: "The link works once. It can't be paused, saved, or restarted; even if you don't finish, it will not reopen. Block 30 quiet, uninterrupted minutes with a working camera and mic and good lighting before you click it." },
      },
      {
        heading: "How to win the Ezra screen",
        body: [
          "Treat it as a real conversation, out loud — no talking over it. You can take a beat to think, or ask it to rephrase a question; you just can't stop and resume the session.",
          "Answer with substance. It follows up on vague answers, so give it something concrete every time — a number, a name, a specific decision.",
        ],
        steps: [
          "Block 30 quiet minutes; test camera, mic, and lighting before you open the one-time link.",
          "Run your normal screen script: pitch → why leaving → why Zapier → comp.",
          "Lead the AI question with specifics (see your AI-fluency story) — it's the highest-leverage answer here.",
          "Take a beat before answering; ask it to rephrase if needed. Never rush or talk over it.",
          "Do it after this week's live screens, when you can give it a clean, unrushed 25 minutes.",
        ],
      },
      {
        heading: "The AI rules — collaborator, not creator",
        card: true,
        tag: "Zapier's stated bar",
        body: [
          "Zapier's official guidance: use AI as your collaborator, not your creator, and be transparent about what it contributed. They want to see how you use AI thoughtfully, not how well you can hide it.",
          "Preparing with AI is encouraged — use Claude to rehearse your stories, pressure-test answers, and run a mock Ezra. That's exactly the collaborator they want.",
          "During the live call, speak as yourself. Don't run a hidden tool feeding you answers in real time — that's 'creator' plus 'hiding it,' the two things they screen against, and Ezra has cheat detection. AI fluency is tested by being ASKED about it, not by using it live.",
        ],
        callout: { kind: "tip", title: "The line that wins", text: "AI handles boilerplate, tests, and exploration. Anything correctness-critical — the actual business logic — gets human verification. For billing and revenue, that line is non-negotiable. Saying this is the screen." },
      },
      {
        heading: "Your AI-fluency story — the #1 prep",
        card: true,
        tag: "Say this",
        body: [
          "This is the single most important answer to prepare for Ezra. Zapier's instructions say strong candidates come ready with specific workflows they've built, how their approach evolved, and the impact — and the JD's stated bar is knowing the difference between automating boilerplate and trusting AI with revenue logic.",
          "\"I use AI as a regular part of my workflow, in two main ways. First, as a build accelerator: I use AI coding assistants for scaffolding, generating tests, and refactoring across large codebases, which speeds up the mechanical work. Second, I've shipped AI into production — I built our first internal chatbot, a retrieval pipeline on AWS Bedrock over a knowledge base, where I owned the retrieval, the model integration, and the guardrails.\"",
          "\"Where my approach has evolved is in judgment about when not to trust it. I draw a clear line now: AI handles boilerplate, tests, and exploration, but anything correctness-critical — the actual business logic — gets human verification and review. For a domain like billing and revenue, that line is non-negotiable. I'd happily let AI scaffold a pricing service or generate test cases, but I would not trust it to author revenue logic unchecked. Automating the mechanical parts while keeping a human on the parts where a mistake costs money is exactly how I'd want a team in this space to work.\"",
        ],
      },
      {
        heading: "Your pitch for Zapier",
        card: true,
        tag: "Tell me about yourself",
        body: [
          "Lead with the multi-consumer API and performance work — it matches their 'About You' bullets — then AI fluency, then leadership. Do not claim billing experience.",
          "\"I'm a senior backend and platform engineer with about seven years of experience, currently a tech lead working through my own consultancy, embedded long-term with Nexity, one of France's largest real-estate groups.\"",
          "\"The thread most relevant to this role is API and platform work. I co-designed and own a public API on AWS that serves over 40 partner integrations, internal systems, and user-facing products at the same time, and a big part of the job has been evolving it as we add partners without breaking the existing integrations. I've also driven real performance work on it — scaling our batch processing from 15,000 to 50,000 items per run and cutting wall-clock time by a third through query tuning, indexing, and caching rather than more hardware.\"",
          "\"On the AI side, I built our first internal chatbot, a retrieval pipeline on Bedrock, and I use AI coding tools daily, so AI-first development is how I already work. I've also led across teams, mentored engineers, and worked directly with stakeholders, including a full rewrite of a marketing app from .NET to Spring Boot where I owned the architecture and the stakeholder relationship.\"",
          "\"What I'm looking for now is a permanent Staff role at a product company where I can own a platform's technical direction long-term — which is exactly what this Revenue Zone role is.\"",
        ],
      },
      {
        heading: "Why Zapier / why this role",
        card: true,
        tag: "Script",
        body: [
          "\"Zapier is a profitable, remote-first company with a strong engineering reputation, and this role is the technical anchor for the entire monetization platform — billing, pricing, entitlements, checkout — which is real ownership of correctness-critical infrastructure.\"",
          "\"Three things draw me. It's deep API and platform work serving multiple consumers, which is what I do today. It's an AI-first company, and I've built production AI and use AI tooling daily, so that's native to how I work. And it's fully remote, which fits where I'm building my life in Vancouver.\"",
          "\"I'll be honest that billing is a domain I'd be ramping into, but the platform, API-evolution, and performance problems underneath it are exactly the ones I've been solving.\"",
        ],
      },
      {
        heading: "Salary strategy — recalibrated",
        card: true,
        tag: "Numbers",
        body: [
          "The band is CA$210.7K–316.1K base, but their comp text reserves the upper half for proven-at-Zapier impact — so 316 is not a realistic external new-hire number. This corrects the higher anchor from the earlier general analysis.",
          "Put all your leverage on base. Equity is private and illiquid, the bonus is variable and not guaranteed, so base is effectively your whole comp.",
        ],
        steps: [
          "Confirm currency is CAD (the posting lists it).",
          "Anchor near the top of the realistic half — around CA$255–265K base.",
          "Expect to land roughly CA$230–250K; the billing-domain gap may pull it toward the lower end.",
          "Floor at your true effective contractor annual — don't let it go below that.",
        ],
        callout: { kind: "warn", title: "Don't crown this over a Toast offer on base alone", text: "Toast's RSUs are liquid public stock, so a slightly lower Toast base plus real equity can beat a higher Zapier base. Let real offers decide." },
      },
      {
        heading: "The domain gap — and how to handle it",
        body: [
          "The role's second requirement is deep billing, payments, and monetization domain experience: metered billing, pricing models, entitlements, revenue recognition, enterprise complexity. You don't have it. Don't fake it.",
          "It doesn't matter at Ezra — that screen is about experience, working style, and AI fluency. It matters at the technical and system-design stages, which will be billing-flavored. If you advance, the single highest-leverage prep is a usage-metered billing system design — that's also the thing that moves you from the bottom toward the top of the band, and it doubles as Toast prep.",
        ],
        callout: { kind: "tip", title: "Honest framing if asked", text: "\"I haven't worked in billing specifically, but I've built and evolved correctness-critical, multi-consumer platform APIs at scale, and done the performance and data-modeling work underneath them. I ramp fast on a domain when the systems problems are familiar — and here they are.\"" },
      },
      {
        heading: "Process caveat + where it sits this week",
        card: true,
        tag: "Logistics",
        body: [
          "Process caveat: Zapier has closed roles mid-process before — including telling a candidate they'd already hired while a take-home was still in progress. Pin down the timeline in writing, and keep Toast, Autodesk, and Treasure warm regardless.",
          "Where it sits this week: you have 7 business days from the email, so Ezra doesn't collide with Toast (Tue), Autodesk (Wed), or Treasure (Thu). Do it over the weekend or early next week, after the live screens, when you can give it a clean, unrushed 25 minutes. It's a fourth shot at no cost to this week's load.",
        ],
      },
    ],
    keyPoints: [
      "Highest ceiling of your four, lower probability — billing is a real domain gap and the role's 2nd requirement. Run it hard, don't crown it.",
      "Ezra = ~25-min AI video screen, ONE-TIME link (no pause/restart). Block 30 quiet minutes; a human reviews the result.",
      "Don't opt out of the AI screen — Zapier is AI-first; declining is a small negative signal and a human reviews it anyway.",
      "AI rule: collaborator, not creator. Prep WITH AI; speak as yourself live (cheat detection). Fluency is tested by being asked.",
      "Your #1 prep is the AI-fluency story: build-accelerator + production Bedrock RAG + the line about not trusting AI with revenue logic.",
      "Pitch leads with the multi-consumer API + performance (15k→50k items, wall-clock cut a third). Never claim billing experience.",
      "Comp: 316 is NOT realistic for an external hire; anchor CA$255–265K base, expect ~230–250K. Leverage on base — equity is illiquid, bonus not guaranteed.",
      "Domain gap doesn't matter at Ezra; it bites at the technical stages. Best advancing-prep = a usage-metered billing system design (doubles as Toast prep).",
      "Pin the timeline in writing — Zapier has closed roles mid-process. Run Ezra after this week's live screens.",
    ],
    checklist: [
      "AI-fluency story rehearsed aloud: two workflows (build-accelerator + production Bedrock RAG) + the don't-trust-AI-with-revenue line",
      "Pitch tuned for Zapier: lead with the multi-consumer API + performance numbers; no billing claim",
      "'Why Zapier' written: anchor of the monetization platform + AI-first + remote/Vancouver, with the honest billing caveat",
      "'Why leaving' and comp answers ready (see Recruiter Screen)",
      "Comp number set: anchor CA$255–265K base, floor at true contractor annual, currency confirmed CAD",
      "Domain-gap framing rehearsed — honest, not faked",
      "30 quiet minutes blocked with working camera / mic / lighting before the one-time link",
      "Did NOT opt out of the AI screen",
      "Timeline pinned in writing; Toast / Autodesk / Treasure kept warm",
      "If advancing: usage-metered billing system design drilled (doubles as Toast prep)",
    ],
    quiz: [
      {
        q: "What's true about the Ezra screen link?",
        options: ["It can be paused and resumed within 7 days", "It works once — no pause, save, or restart", "It reopens automatically if you don't finish"],
        answer: 1,
        explain: "It's a one-time link. Block 30 uninterrupted minutes and treat it as a single clean take — even if you don't finish, it won't reopen.",
      },
      {
        q: "Should you opt out of the AI screen for the non-AI alternative?",
        options: ["Yes — it removes the risk", "No — Zapier is AI-first; declining is a small negative signal and a human reviews it anyway"],
        answer: 1,
        explain: "Zapier values AI fluency, and a human recruiter reviews the Ezra result regardless — little upside, real downside to opting out.",
      },
      {
        q: "Given the CA$210.7K–316.1K band, what's a realistic external new-hire base?",
        options: ["~316K — anchor the ceiling", "~210–263K — the upper half is reserved for proven-at-Zapier impact", "Below 210K to stay safe"],
        answer: 1,
        explain: "Their policy reserves the upper half for internal proven impact. Anchor ~255–265K, expect ~230–250K, and put leverage on base since equity is illiquid and the bonus isn't guaranteed.",
      },
      {
        q: "How should you handle the billing-domain gap?",
        options: ["Claim adjacent billing experience to seem credible", "Don't fake it — frame it as fast ramp on familiar systems problems, and drill a usage-metered billing system design if you advance"],
        answer: 1,
        explain: "Don't fake domain depth. It doesn't matter at Ezra; at the technical stages a usage-metered billing design is the highest-leverage prep — and it doubles as Toast prep.",
      },
    ],
  },
];
