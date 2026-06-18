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
];
