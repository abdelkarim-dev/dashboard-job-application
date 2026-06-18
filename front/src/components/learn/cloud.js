// Cloud & infrastructure reading track for the Learn hub.
//
// Hand-authored (not generated): an AWS track aimed at the interview decisions
// an ex-AWS interviewer probes (plus Solutions Architect – Associate context).
// Same concept shape as concepts.js (sections / keyPoints / checklist / quiz),
// rendered generically by ConceptPage.jsx. Adding a page is just adding an
// entry here.
//
// Code blocks are JS template literals; any `${...}` interpolation must be
// written as `\${...}` so the JS parser doesn't try to evaluate it.

// The Terraform track was removed (June 2026): not referenced in the active
// interview-prep sources, so it was out of scope. Recover from git if needed.

// ── AWS (Solutions Architect – Associate) ─────────────────────────
const AWS_CONCEPTS = [
  {
    id: "aws-interview-decisions",
    group: "AWS (SAA)",
    label: "Interview Decisions",
    icon: "🧭",
    title: "AWS Interview Decisions — One Decision + One Tradeoff per Category",
    tagline:
      "The spoken-interview layer for an ex-AWS interviewer: not every service, just a sensible choice and its tradeoff for each major category — plus the golden rule and the Well-Architected lens.",
    sections: [
      {
        heading: "The frame for this whole round",
        card: true,
        tag: "Read first",
        body: [
          "You will not be asked to know every AWS service. You will be asked to make sensible choices and explain the tradeoffs. So for each major category, carry one decision and one tradeoff in your head — that is what senior sounds like. The schematics below are that map: compute, messaging, and DynamoDB partitioning at a glance.",
          "Keep the golden rule running underneath everything: never give a flat no. If they ask about a service you have not run in production, bridge — 'I haven't run that in production, but here is the problem it solves and when I'd reach for it.' With an ex-AWS interviewer, that single habit is the difference between a dead end and a good conversation.",
        ],
        callout: {
          kind: "key",
          title: "The bridge sentence (rehearse it until automatic)",
          text: "“I haven't used that exact feature in production, but conceptually here's how it works and here's when I'd reach for it.” Every gap becomes a demonstration of how you think instead of a stop.",
        },
      },
      {
        heading: "Compute — the decision",
        body: [
          "The three ways to run code on AWS are EC2, Lambda, and containers; the skill is knowing when to reach for each. EC2 is a virtual server you control fully, OS and all — reach for it when you need that control or you're running something long-lived that doesn't fit the other two. Lambda is functions that run on demand, no servers to manage, billed only while they run — reach for it when work is event-driven, spiky, or short-lived. Containers (ECS with Fargate, or EKS for Kubernetes) give you portable long-running services without babysitting servers; Fargate is the key phrase — serverless containers, hand it the container and it runs it.",
          "The clean heuristic to say out loud: if it's event-driven and short, Lambda; if it's a long-running service and I want portability without managing servers, containers on Fargate; if I need full control of the machine, EC2. The tradeoff to name for Lambda is the cold start — the delay on the first invocation or after idle, because AWS spins up a fresh environment and initializes your code. The named fixes are provisioned concurrency (keep environments pre-warmed; you pay to keep them warm) and SnapStart (restore from a snapshot of the initialized function — started as a Java feature). Beyond those: keep the package small, lazy-load heavy dependencies, don't over-stuff init. Reserved concurrency caps or guarantees how many copies run at once.",
        ],
      },
      {
        heading: "Databases — the decision",
        body: [
          "The first fork is relational vs NoSQL. Relational is for structured data with complex queries, joins, and transactions where consistency matters: on AWS that's RDS (managed MySQL/Postgres/etc.) or Aurora (AWS's cloud-native engine, MySQL/Postgres-compatible but built for more performance and availability). The phrase to carry: Aurora when I want relational plus more scale and resilience, RDS when I want straightforward managed relational.",
          "NoSQL here means DynamoDB — for well-understood access patterns that must scale enormously with fast key-based lookups. You design the table around how you'll read it, not around a tidy data model. The deep-dive answer is partition-key design and write sharding to avoid hot partitions, and Global Secondary Indexes for alternate access patterns (see the partitioning schematic). For resilience, name two distinct things: read replicas spread read traffic and are eventually consistent (for scale); Multi-AZ keeps a standby in another AZ for automatic failover (for survival). Replicas are for scale, Multi-AZ is for survival — naming both shows you separate the concerns.",
        ],
        callout: {
          kind: "tip",
          title: "The senior one-liner on consistency",
          text: "Default to eventual consistency for most things (it scales better and is simpler), but insist on strong consistency for anything involving money or inventory, where being wrong for even a second is unacceptable.",
        },
      },
      {
        heading: "S3 — cost and lockdown",
        body: [
          "Cost: storage classes plus lifecycle policies. Standard for hot data, Standard-IA for rarely touched, Glacier and Deep Archive for cold archives, Intelligent-Tiering when access is unpredictable (it auto-moves objects between tiers). Lifecycle policies age data into cheaper tiers or delete it on a schedule — and a good one also clears incomplete multipart uploads that quietly cost money. Remember cost = storage + requests + data transfer out, so a CDN in front cuts the transfer bill.",
          "Security: Block Public Access, least-privilege policies, and encryption. Block Public Access is the master off switch for internet exposure and should be on by default. Grant the minimum with bucket and IAM policies — never a wildcard. Encrypt at rest (S3 does it by default; use KMS keys when you need to control and audit them). Share one file temporarily with a pre-signed URL (a link that expires) instead of making the bucket public, and reach S3 over the private network with a VPC endpoint. If you remember three words: Block Public Access, least privilege, pre-signed URLs.",
        ],
      },
      {
        heading: "Networking — the parts that come up",
        body: [
          "A VPC is your own private network inside AWS. Inside it are subnets; the key split is public (can reach the internet) vs private (cannot directly). Put servers in private subnets and only expose what must be public. A security group is a stateful firewall on a resource — allow traffic in and the response is automatically allowed back out. A network ACL is its stateless cousin at the subnet level — you must allow both directions explicitly. In practice you do almost all your work with security groups.",
          "A NAT gateway lets private-subnet resources reach out to the internet (for updates) without being reachable from it. A VPC endpoint reaches AWS services like S3 privately, keeping traffic off the public internet. CloudFront is AWS's CDN, caching content close to users for speed and lower transfer cost.",
        ],
      },
      {
        heading: "Decoupling and messaging — match the verb",
        body: [
          "When a question involves spikes, background work, or connecting services, knowing which service is which is the signal. SQS is a queue: drop work on it, consumers pull it off — smooths spikes and moves slow work to the background. SNS is publish/subscribe: fan one message out to many subscribers at once. EventBridge is an event bus that routes events between services by rules — good for event-driven architectures. Kinesis is streaming: an ordered, replayable river of records for real-time analytics and high-volume pipelines.",
          "The short version to say: SQS to hand off work, SNS to broadcast, EventBridge to route events, Kinesis to stream. This maps directly onto your lead-ingestion platform (event-driven, dedup, routing).",
        ],
      },
      {
        heading: "Identity, security, observability",
        body: [
          "Identity: the key distinction is IAM roles vs users. A user is a human with long-lived credentials. A role is an identity assumed temporarily — and it's what your services and applications should use, because the credentials are short-lived and rotated automatically. The senior phrase: applications get roles, not access keys, and everything follows least privilege. KMS manages encryption keys; Secrets Manager stores credentials like DB passwords so they're never hardcoded.",
          "Observability: CloudWatch is the home for metrics, logs, and alarms; X-Ray traces a request as it moves across services so you can find where the latency lives. If they ask how you'd know your system is healthy, those two are the answer.",
        ],
      },
      {
        heading: "The senior framing that ties it together",
        body: [
          "If you want one move that reads as architect-level, reason in terms of the AWS Well-Architected Framework — AWS's own checklist of six pillars: operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability. You don't recite them; you use them as a lens — 'that handles reliability, and on the cost pillar I'd add lifecycle policies.' Speaking in those terms tells an ex-AWS interviewer you think the way they were trained to think.",
        ],
        defs: [
          { term: "Operational excellence", def: "Run and monitor systems; improve processes. (Automation, runbooks, observability.)" },
          { term: "Security", def: "Protect data and systems. (Least privilege, encryption, Block Public Access.)" },
          { term: "Reliability", def: "Recover from failure, scale to demand. (Multi-AZ, ASG, health checks.)" },
          { term: "Performance efficiency", def: "Use resources efficiently as demand changes. (Right-sizing, caching, the right service.)" },
          { term: "Cost optimization", def: "Avoid unneeded spend. (Savings Plans/Spot, storage classes, lifecycle, CDN.)" },
          { term: "Sustainability", def: "Minimize the environmental impact of the workload. (Efficient regions, managed/serverless.)" },
        ],
      },
    ],
    keyPoints: [
      "Compute: event-driven & short → Lambda; long-running & portable → Fargate; full machine control → EC2. Lambda tradeoff = cold start (fix: provisioned concurrency / SnapStart).",
      "Databases: Aurora = relational + scale/resilience; RDS = straightforward managed relational; DynamoDB = huge scale + key lookups, design around access patterns. Read replicas = scale; Multi-AZ = survival.",
      "Consistency: default eventual; insist on strong for money/inventory.",
      "S3 cost = storage classes + lifecycle (clear incomplete multipart uploads); transfer out is part of the bill, so put a CDN in front.",
      "S3 lockdown = Block Public Access + least privilege + encryption; pre-signed URL for one temporary file; VPC endpoint for private access.",
      "Messaging: SQS to hand off, SNS to broadcast, EventBridge to route, Kinesis to stream.",
      "Identity: applications get roles (short-lived), not access keys; Secrets Manager for passwords, KMS for keys.",
      "Observability: CloudWatch (metrics/logs/alarms) + X-Ray (request tracing).",
      "Golden rule: never a flat no — bridge to the problem it solves and when you'd reach for it. Reason in Well-Architected pillars.",
    ],
    checklist: [
      "Can give the compute decision (Lambda/Fargate/EC2) with the cold-start tradeoff and its two fixes",
      "Can separate read replicas (scale) from Multi-AZ (survival) in one sentence",
      "Can explain the DynamoDB hot-partition trap and the write-sharding fix",
      "Can give the S3 cost answer (storage classes + lifecycle) and the lockdown answer (Block Public Access, least privilege, pre-signed URLs)",
      "Can match SQS/SNS/EventBridge/Kinesis to their verbs instantly",
      "Can say why applications use roles, not access keys",
      "Can use the Well-Architected pillars as a lens, not a recitation",
      "Can deliver the bridge sentence without hesitating when asked about an unfamiliar service",
    ],
    quiz: [
      {
        q: "A spiky, event-driven task runs for a few seconds at a time. Which compute, and what's the tradeoff to name?",
        options: [
          "EC2 — and mention right-sizing",
          "Lambda — and mention cold starts (fix: provisioned concurrency / SnapStart)",
          "Fargate — and mention Kubernetes",
          "Dedicated Hosts — and mention licensing",
        ],
        answer: 1,
        explain:
          "Event-driven and short → Lambda. The senior move is to volunteer the tradeoff: cold starts, fixed with provisioned concurrency or SnapStart.",
      },
      {
        q: "A DynamoDB table throttles because almost every write uses the partition key status=ACTIVE. The fix?",
        options: [
          "Add a read replica",
          "Switch to strong consistency",
          "Use a high-cardinality key or append a sharding suffix (e.g. ACTIVE#n)",
          "Enable Multi-AZ",
        ],
        answer: 2,
        explain:
          "That's a hot partition — one partition key takes all the traffic. Spread it with a high-cardinality key or write sharding. Replicas/Multi-AZ are about scale/survival, not key skew.",
      },
      {
        q: "You must give a partner temporary access to download one S3 object without making the bucket public. Best tool?",
        options: ["Disable Block Public Access", "A pre-signed URL", "A wildcard bucket policy", "A public CloudFront distribution"],
        answer: 1,
        explain:
          "A pre-signed URL grants time-limited access to a single object and then expires — no need to open the bucket.",
      },
      {
        q: "An application needs to call AWS APIs. How should it authenticate?",
        options: [
          "Long-lived access keys baked into the app",
          "An IAM role it assumes (short-lived, auto-rotated credentials)",
          "The root account credentials",
          "A shared IAM user for the whole fleet",
        ],
        answer: 1,
        explain:
          "Applications get roles, not access keys. Role credentials are short-lived and rotated automatically — least privilege by default.",
      },
      {
        q: "You need to broadcast one event to several independent subscribers at once. Which service?",
        options: ["SQS", "SNS", "Kinesis", "A larger EC2 instance"],
        answer: 1,
        explain:
          "SNS is publish/subscribe — fan one message out to many subscribers. SQS is a point-to-point queue; Kinesis is for ordered streaming.",
      },
    ],
  },

  {
    id: "aws-saa-overview",
    group: "AWS (SAA)",
    label: "SAA Exam & Well-Architected",
    icon: "☁",
    title: "AWS Solutions Architect – Associate: The Map",
    tagline:
      "What the SAA-C03 exam tests, the Well-Architected Framework it's built on, AWS global infrastructure, the shared responsibility model, and how to read exam questions.",
    sections: [
      {
        heading: "What the exam actually is",
        body: [
          "The AWS Certified Solutions Architect – Associate (exam code SAA-C03) tests whether you can design solutions on AWS that are secure, resilient, high-performing, and cost-optimized. It is 65 questions in 130 minutes, scored 100–1000, and you pass at 720. Questions are multiple-choice (one right answer) or multiple-response (pick two or three). About 15 of the 65 are unscored trial questions — you won't know which, so answer them all.",
          "It is not a trivia test of memorized limits. The dominant question shape is a scenario: 'A company needs X with constraint Y — which solution best meets the requirement?' Several answers will technically work; you pick the one that best fits the qualifier (most cost-effective, least operational overhead, highest availability, real-time). Learning to read that qualifier is half the exam.",
        ],
        table: {
          headers: ["Domain", "Weight", "In one line"],
          rows: [
            ["1. Design Secure Architectures", "30%", "IAM, encryption, network isolation, least privilege"],
            ["2. Design Resilient Architectures", "26%", "Multi-AZ, decoupling, fault tolerance, DR"],
            ["3. Design High-Performing Architectures", "24%", "Right service for the workload, scaling, caching"],
            ["4. Design Cost-Optimized Architectures", "20%", "Right-sizing, purchasing models, storage tiers"],
          ],
        },
      },
      {
        heading: "The Well-Architected Framework: the lens behind every question",
        body: [
          "AWS's Well-Architected Framework defines six pillars, and the exam is essentially these pillars turned into scenarios. Operational Excellence (run and monitor systems, automate change). Security (protect data and systems, least privilege, defense in depth). Reliability (recover from failure, scale to meet demand). Performance Efficiency (use the right resources and adapt as needs change). Cost Optimization (avoid unnecessary cost, pick the right pricing model). Sustainability (minimize environmental impact — the newest pillar).",
          "When two answers both work, the 'best' one is the one that better satisfies the pillar the question is emphasizing. 'Least operational overhead' → managed/serverless (the Operational Excellence + Cost lens). 'Must survive an AZ failure' → Multi-AZ (Reliability). 'Sensitive data at rest' → encryption with KMS (Security).",
        ],
        callout: {
          kind: "tip",
          title: "Map the qualifier to a pillar",
          text: "Underline the qualifier in every question. 'Cost-effective' → Cost. 'Highly available / fault tolerant' → Reliability. 'Least operational effort' → managed/serverless. 'Fastest / lowest latency' → Performance. The qualifier usually eliminates two answers immediately.",
        },
      },
      {
        heading: "Global infrastructure: Regions, AZs, edge",
        body: [
          "A Region is a separate geographic area (eu-west-1, us-east-1) — your data and services are isolated per region unless you explicitly replicate. You choose a region for latency to users, data-residency/compliance, service availability, and price (regions differ in cost).",
          "An Availability Zone (AZ) is one or more discrete data centers within a region, with independent power, cooling, and networking, connected to sibling AZs by low-latency links. Each region has at least three AZs. The core HA pattern on AWS is 'spread across multiple AZs' — an AZ can fail, a well-designed system survives it. Multi-Region is for disaster recovery and global latency, not everyday HA.",
          "Edge locations (and Regional Edge Caches) are the CloudFront/Route 53 points of presence near users — hundreds of them, far more than there are regions — used to cache content and terminate connections close to the user. Local Zones, Wavelength, and Outposts extend AWS into metros, 5G networks, and on-prem respectively.",
        ],
        callout: {
          kind: "key",
          title: "AZ vs Region rule of thumb",
          text: "High availability within a region = spread across multiple AZs. Disaster recovery / global reach = multiple regions. Most exam HA answers are 'use multiple AZs'; reach for multi-region only when the scenario says 'region outage' or 'global users'.",
        },
      },
      {
        heading: "The shared responsibility model",
        body: [
          "AWS secures the cloud; you secure what you put in the cloud. AWS is responsible for security OF the cloud — the physical data centers, hardware, the hypervisor, and the managed-service software (e.g. patching the RDS engine, the S3 service itself). You are responsible for security IN the cloud — your IAM configuration, security groups, encryption choices, OS patching on EC2, and your data.",
          "The line moves with how managed the service is. On EC2 you patch the guest OS; on RDS AWS patches the engine but you still manage users, encryption, and network access; on Lambda/S3 AWS handles even more, but IAM permissions and data classification are always yours. Exam traps often hinge on 'whose job is this' — encryption keys, OS patches, IAM, and bucket policies are always the customer's.",
        ],
      },
      {
        heading: "How to study (and how to read a question)",
        body: [
          "Study by service category mapped to the domains — that's exactly how the rest of this AWS track is organized: IAM & security, compute, storage, networking, databases, then resilience/decoupling/cost. For each service, learn what problem it solves, when to pick it over alternatives, and its one or two distinctive exam facts (S3 storage classes, RDS Multi-AZ vs read replica, ALB vs NLB).",
          "Question technique: read the last sentence first (it states what's being asked and the qualifier), eliminate clearly wrong answers, then choose among survivors by the qualifier. Watch for distractor patterns: an answer that's more expensive/more operational than needed, a service that's close but wrong (Firehose vs Kinesis Data Streams, NLB vs ALB), or a security anti-pattern (hard-coded keys, public buckets). Use AWS's official sample questions and the exam guide as your source of truth, and do timed practice tests until you're consistently above the pass mark.",
        ],
        steps: [
          "Learn services by domain category (security → compute → storage → network → data → resilience/cost).",
          "For each service: the problem it solves, when to choose it, its 1–2 distinctive facts.",
          "Read each question's qualifier (cost / HA / latency / least-ops) and map it to a pillar.",
          "Eliminate the over-built and the security-anti-pattern answers first.",
          "Drill timed practice exams; review every wrong answer until you know WHY it's wrong.",
        ],
      },
    ],
    keyPoints: [
      "SAA-C03: 65 questions, 130 min, pass at 720/1000; ~15 unscored. Four domains: Secure 30%, Resilient 26%, Performing 24%, Cost 20%.",
      "Well-Architected = 6 pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.",
      "The exam is scenario-based: several answers 'work', the qualifier (cost / HA / latency / least-ops) picks the best one.",
      "Region = isolated geo; AZ = independent DC within a region (≥3 per region). HA = multi-AZ; DR/global = multi-region.",
      "Edge locations (CloudFront/Route 53) are many more than regions; for caching content near users.",
      "Shared responsibility: AWS secures OF the cloud (hardware, managed-service software); you secure IN the cloud (IAM, data, encryption, OS on EC2).",
      "Read the qualifier, eliminate over-built and anti-pattern answers, then choose by pillar.",
    ],
    checklist: [
      "Memorized the four domains and their weights",
      "Can name all six Well-Architected pillars and what each emphasizes",
      "Can explain AZ vs Region and when to use multi-AZ vs multi-region",
      "Can state the shared responsibility split for EC2 vs RDS vs S3/Lambda",
      "Practiced mapping a question's qualifier to a pillar to eliminate answers",
      "Took at least one timed full-length practice exam above 72%",
    ],
    quiz: [
      {
        q: "A question says: 'The solution must remain available if a single data center fails, at the lowest cost.' The best design direction is…",
        options: [
          "Deploy to multiple Regions with active-active replication",
          "Deploy across multiple Availability Zones within one Region",
          "Use a single large instance with extra EBS volumes",
          "Add CloudFront in front of one instance",
        ],
        answer: 1,
        explain:
          "An AZ is an independent data center; spreading across AZs survives a DC failure cheaply. Multi-region is for region outages/global reach and costs more.",
      },
      {
        q: "Under the shared responsibility model, who is responsible for patching the guest OS on an EC2 instance?",
        options: ["AWS", "The customer", "Neither — EC2 has no OS", "AWS for the first 90 days"],
        answer: 1,
        explain:
          "On EC2 (IaaS) the customer patches the guest OS. AWS handles the hardware and hypervisor (security OF the cloud).",
      },
      {
        q: "Two answers both satisfy the requirement, but the question stresses 'least operational overhead.' You should prefer…",
        options: [
          "The self-managed solution on EC2 you can fully control",
          "The managed / serverless option that removes undifferentiated heavy lifting",
          "Whichever is cheapest regardless of operations",
          "The one using the most services",
        ],
        answer: 1,
        explain:
          "'Least operational overhead' points to managed/serverless services (RDS, Lambda, Fargate, DynamoDB) that offload patching, scaling, and HA to AWS.",
      },
    ],
  },

  {
    id: "aws-iam-security",
    group: "AWS (SAA)",
    label: "Identity & Security",
    icon: "🔐",
    title: "IAM, Encryption & the Security Domain",
    tagline:
      "The biggest exam domain (30%): IAM users/roles/policies and how policies are evaluated, Organizations & SCPs, KMS encryption, and the security services you must recognize.",
    sections: [
      {
        heading: "IAM building blocks",
        body: [
          "IAM (Identity and Access Management) is global (not per-region) and free. Its four nouns: a user is a person or app with long-term credentials; a group is a bucket of users you attach policies to (groups can't be nested and aren't 'principals'); a role is a set of permissions with no long-term credentials that any trusted principal can assume to get temporary credentials; a policy is the JSON document that grants or denies permissions.",
          "Roles are the heart of good AWS security and a heavy exam theme. An EC2 instance gets permissions via an instance profile (a role), not by storing access keys on disk. Lambda runs with an execution role. Cross-account access, federation (SSO, web identity), and service-to-service access all work by assuming roles via STS, which hands back short-lived credentials. The recurring right answer to 'how should this app/instance get AWS permissions?' is 'an IAM role', and the recurring wrong answer is 'embed access keys'.",
        ],
        code: {
          lang: "json",
          source: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::claire-assets-prod/*",
      "Condition": {
        "Bool": { "aws:SecureTransport": "true" }
      }
    }
  ]
}`,
        },
      },
      {
        heading: "Policy types and how evaluation works",
        body: [
          "Identity-based policies attach to a user/group/role ('what can this identity do'). Resource-based policies attach to a resource ('who can touch this'), like an S3 bucket policy or an SQS queue policy — these have a Principal. Other types you should recognize: permissions boundaries (a ceiling on what an identity-based policy can grant), and Service Control Policies (SCPs) at the Organizations level (org-wide guardrails).",
          "The evaluation rule you must know cold: access is denied by default; an explicit Deny anywhere always wins; otherwise an explicit Allow is needed from some applicable policy, and an SCP must also permit the action. So the order of precedence is: explicit Deny > (SCP boundary) > explicit Allow > implicit (default) Deny. If nothing explicitly allows it, it's denied.",
        ],
        callout: {
          kind: "key",
          title: "The one rule to memorize",
          text: "Default = deny. Explicit deny always beats explicit allow. You need an explicit allow AND no explicit deny AND (if in an Org) the SCP must allow it. SCPs and permission boundaries only LIMIT — they never grant.",
        },
      },
      {
        heading: "Organizations, SCPs, and account strategy",
        body: [
          "AWS Organizations groups many accounts under one management account, with consolidated billing (volume discounts pooled across accounts) and Organizational Units (OUs) for structure. The recommended pattern is multi-account: separate prod, dev, and security/logging accounts so a blast radius and permissions are isolated by account boundary — the strongest isolation AWS offers.",
          "Service Control Policies (SCPs) are org-wide guardrails attached to OUs or accounts. They define the maximum permissions available in those accounts but grant nothing on their own — you still need IAM allows inside the account. Classic SCP uses: deny use of regions you don't operate in, deny disabling CloudTrail, deny leaving the org. IAM Identity Center (formerly AWS SSO) is the modern way to give humans federated, role-based access across all accounts.",
        ],
      },
      {
        heading: "Encryption and KMS",
        body: [
          "Encryption in transit is TLS; encryption at rest is the exam's focus, and KMS (Key Management Service) is the center of it. KMS manages encryption keys (KMS keys, formerly CMKs) and integrates with almost every service — S3, EBS, RDS, DynamoDB, Secrets Manager. AWS-managed keys are automatic and free-ish; customer-managed keys give you control over rotation, key policies (who can use the key), and auditability, which compliance scenarios want.",
          "Know envelope encryption: KMS encrypts a data key, the data key encrypts your data; the service stores the encrypted data key alongside the ciphertext. KMS keys never leave KMS (FIPS-validated HSMs). Customer-managed keys support automatic annual rotation. For very high compliance you can use CloudHSM (single-tenant dedicated HSM). For HTTPS certs, ACM (Certificate Manager) issues and auto-renews TLS certificates for free on ALB/CloudFront.",
        ],
        table: {
          headers: ["Need", "Service"],
          rows: [
            ["Manage encryption keys, encrypt at rest", "KMS"],
            ["Dedicated single-tenant HSM (compliance)", "CloudHSM"],
            ["Store + auto-rotate DB credentials/API keys", "Secrets Manager"],
            ["Cheap config/params (with optional SecureString)", "SSM Parameter Store"],
            ["Free auto-renewing TLS certs for ALB/CloudFront", "ACM"],
          ],
        },
      },
      {
        heading: "Security services to recognize",
        body: [
          "The exam expects you to map a security need to the right service. Detective: GuardDuty (intelligent threat detection from logs), Inspector (automated vulnerability scans of EC2/ECR/Lambda), Macie (finds sensitive data/PII in S3), Security Hub (aggregates findings), CloudTrail (records every API call — the audit log), Config (tracks resource configuration and compliance over time).",
          "Protective: WAF (layer-7 web ACL rules on ALB/CloudFront/API Gateway — SQL injection, rate limiting), Shield (DDoS protection; Standard free, Advanced paid), Firewall Manager (manages WAF/Shield rules org-wide), Secrets Manager (rotating secrets). Know the difference between CloudTrail (who did what, API audit) and CloudWatch (metrics, logs, alarms — performance/operations) — they're frequently confused.",
        ],
        callout: {
          kind: "tip",
          title: "CloudTrail vs CloudWatch vs Config",
          text: "CloudTrail = who called which API and when (audit/forensics). CloudWatch = metrics, logs, alarms (operations/performance). Config = what does my resource configuration look like and is it compliant over time. Different questions, different answers.",
        },
      },
    ],
    keyPoints: [
      "IAM is global and free. User = identity with long-term creds; group = users + policies; role = assumable temp permissions; policy = JSON of allow/deny.",
      "Always use roles for EC2/Lambda/cross-account/federation (via STS) — never embed long-lived access keys.",
      "Identity-based vs resource-based policies; SCPs and permission boundaries only LIMIT, never grant.",
      "Evaluation: default deny; explicit Deny always wins; need an explicit Allow and (in an Org) an SCP that permits it.",
      "Organizations = many accounts, consolidated billing, OUs; multi-account is the strongest isolation; SCPs are org guardrails.",
      "KMS manages keys for at-rest encryption (envelope encryption); customer-managed keys add control + annual rotation; CloudHSM for single-tenant.",
      "Secrets Manager (rotating secrets) vs Parameter Store (cheap config); ACM (free TLS certs).",
      "Recognize: GuardDuty/Inspector/Macie/Security Hub (detect), CloudTrail (audit), Config (compliance), WAF/Shield (protect).",
    ],
    checklist: [
      "Can explain user vs group vs role vs policy and when to use a role",
      "Know the policy evaluation order (explicit deny > allow > implicit deny) cold",
      "Can describe an SCP and that it limits but never grants",
      "Can explain envelope encryption and customer-managed vs AWS-managed KMS keys",
      "Can pick Secrets Manager vs Parameter Store for a given need",
      "Can distinguish CloudTrail vs CloudWatch vs Config, and GuardDuty vs Inspector vs Macie",
    ],
    quiz: [
      {
        q: "An application on EC2 needs to read from an S3 bucket. The most secure way to grant access is…",
        options: [
          "Store IAM access keys in a config file on the instance",
          "Attach an IAM role (instance profile) to the EC2 instance with least-privilege S3 permissions",
          "Make the bucket public",
          "Put the access keys in an environment variable baked into the AMI",
        ],
        answer: 1,
        explain:
          "An instance role provides temporary, automatically-rotated credentials via STS — no long-lived keys to leak. This is the canonical right answer.",
      },
      {
        q: "An identity-based policy allows an action, but an SCP on the account does not permit it. The result is…",
        options: [
          "Allowed — identity policies override SCPs",
          "Denied — the SCP sets the maximum and doesn't permit it, so the allow has no effect",
          "Allowed only in us-east-1",
          "It depends on the time of day",
        ],
        answer: 1,
        explain:
          "SCPs cap the permissions available in an account. If the SCP doesn't allow the action, no identity policy can grant it.",
      },
      {
        q: "You need to record every AWS API call for a security audit. Which service?",
        options: ["CloudWatch", "CloudTrail", "Config", "GuardDuty"],
        answer: 1,
        explain:
          "CloudTrail logs API calls (who did what, when) — the audit/forensics trail. CloudWatch is metrics/logs; Config tracks configuration compliance.",
      },
    ],
  },

  {
    id: "aws-compute",
    group: "AWS (SAA)",
    label: "Compute",
    icon: "🖥",
    title: "Compute — EC2, Auto Scaling, Load Balancers, Serverless & Containers",
    tagline:
      "EC2 purchasing models (the cost questions live here), Auto Scaling, the three load balancers, Lambda, and the container trio (ECS/EKS/Fargate).",
    sections: [
      {
        heading: "EC2 instances and families",
        body: [
          "EC2 is resizable virtual machines. Instance types are grouped into families by what they optimize: general purpose (T3/T4g burstable, M-series balanced), compute optimized (C-series — CPU-heavy, batch, gaming), memory optimized (R/X — in-memory DBs, caches, analytics), storage optimized (I/D — high local IOPS), and accelerated computing (P/G — GPUs for ML/graphics). The exam tests matching a workload to a family: 'high-performance in-memory database' → memory optimized; 'batch CPU processing' → compute optimized.",
          "Placement groups control how instances are physically placed: cluster (packed in one AZ for lowest latency/highest throughput — HPC), spread (each on distinct hardware, max 7 per AZ, for critical instances that must not share a failure), and partition (grouped into isolated partitions for large distributed systems like HDFS/Kafka).",
        ],
      },
      {
        heading: "EC2 purchasing models — where the cost questions live",
        body: [
          "This is the single richest vein of cost questions. On-Demand: pay per second, no commitment, most expensive per hour — for spiky or short-term workloads. Reserved Instances (RI): commit to a specific instance type for 1 or 3 years for up to ~72% off — for steady, predictable baseline load. Savings Plans: commit to a $/hour spend for 1 or 3 years (Compute Savings Plans are the most flexible across instance family, region, and even Lambda/Fargate) — the modern, flexible way to get RI-level discounts.",
          "Spot Instances: bid on spare capacity for up to ~90% off, but AWS can reclaim them with a 2-minute warning — for fault-tolerant, interruptible, stateless work (batch, CI, big-data, rendering). Dedicated Hosts/Instances: physical isolation for licensing or compliance, most expensive. The exam pattern: steady 24/7 baseline → Reserved/Savings Plan; unpredictable spikes on top → On-Demand; interruption-tolerant batch → Spot; bring-your-own-license / compliance → Dedicated.",
        ],
        table: {
          headers: ["Model", "Discount", "Commitment", "Best for"],
          rows: [
            ["On-Demand", "Baseline (0%)", "None", "Spiky / short-lived / dev"],
            ["Savings Plans", "up to ~72%", "1 or 3 yr $/hr", "Steady spend, flexible (incl. Lambda/Fargate)"],
            ["Reserved Instances", "up to ~72%", "1 or 3 yr instance", "Steady predictable workloads"],
            ["Spot", "up to ~90%", "None (reclaimable)", "Fault-tolerant, interruptible batch"],
            ["Dedicated Host", "Highest cost", "Optional", "Licensing / compliance isolation"],
          ],
        },
        callout: {
          kind: "tip",
          title: "The cost-optimization combo",
          text: "A common 'best' answer: cover the steady baseline with a Savings Plan / Reserved Instances, handle bursts with On-Demand, and run interruptible batch on Spot. Mixing models is usually cheaper than one model for everything.",
        },
      },
      {
        heading: "Auto Scaling Groups",
        body: [
          "An Auto Scaling Group (ASG) keeps a fleet between a minimum and maximum size at a desired capacity, replaces unhealthy instances, and spreads them across AZs — the foundation of both elasticity and self-healing. It launches instances from a launch template.",
          "Scaling policies: target tracking (keep a metric like average CPU at 50% — the simplest and most recommended), step scaling (add/remove N instances at metric thresholds), scheduled scaling (scale up before a known peak), and predictive scaling (ML forecasts demand). ASGs integrate with load balancers so new instances are registered automatically and traffic only goes to healthy ones. Combine an ASG across multiple AZs behind a load balancer and you have the canonical highly-available, elastic web tier.",
        ],
      },
      {
        heading: "Elastic Load Balancing: ALB vs NLB vs GWLB",
        body: [
          "Load balancers distribute traffic and are central to HA. Application Load Balancer (ALB) operates at layer 7 (HTTP/HTTPS): host- and path-based routing, routing to target groups (EC2, IP, Lambda, containers), WebSockets, and native auth — the default for web apps and microservices. Network Load Balancer (NLB) operates at layer 4 (TCP/UDP/TLS): ultra-low latency, millions of requests per second, a static IP per AZ (and Elastic IP support) — for extreme performance, non-HTTP protocols, or when you need a fixed IP.",
          "Gateway Load Balancer (GWLB) operates at layer 3 to deploy and scale third-party virtual appliances (firewalls, IDS/IPS) transparently in the traffic path. (The Classic Load Balancer is legacy — avoid in new designs.) Cross-zone load balancing evens traffic across AZs; it's on by default for ALB and off by default for NLB.",
        ],
        callout: {
          kind: "key",
          title: "Pick the LB fast",
          text: "HTTP/HTTPS, path/host routing, microservices → ALB (L7). TCP/UDP, extreme throughput, low latency, static/Elastic IP → NLB (L4). Inline third-party security appliances → GWLB (L3).",
        },
      },
      {
        heading: "Serverless and containers",
        body: [
          "Lambda runs code without managing servers: event-driven, pay per invocation and duration, auto-scaling to thousands of concurrent executions, up to 15 minutes per execution and up to 10 GB memory. It's the 'least operational overhead' answer for event processing, lightweight APIs (behind API Gateway), and glue between services. Watch the limits: long-running or stateful workloads don't fit Lambda — that's a container or EC2.",
          "Containers: ECS is AWS's container orchestrator; EKS is managed Kubernetes (pick it when you need the Kubernetes ecosystem/portability). Both can run on two launch types: EC2 (you manage the instances, cheaper at scale, more control) or Fargate (serverless containers — no servers to manage, the 'least operational overhead' container answer). ECR is the container registry. The decision tree: simple AWS-native containers without server management → ECS on Fargate; need Kubernetes → EKS; lots of steady container load and want max control/cost → ECS/EKS on EC2.",
        ],
        table: {
          headers: ["Workload", "Best fit"],
          rows: [
            ["Event-driven, short, spiky, least ops", "Lambda"],
            ["Containers, no server management", "ECS on Fargate"],
            ["Need Kubernetes / portability", "EKS"],
            ["Steady heavy containers, max control/cost", "ECS/EKS on EC2"],
            ["Full OS control / legacy / specific kernel", "EC2"],
          ],
        },
      },
    ],
    keyPoints: [
      "Instance families: general (T/M), compute (C), memory (R/X), storage (I/D), accelerated/GPU (P/G) — match the family to the workload.",
      "Purchasing: On-Demand (spiky), Savings Plans/Reserved (steady baseline, up to ~72% off), Spot (interruptible, up to ~90% off), Dedicated (licensing/compliance).",
      "Cost combo: baseline on Savings Plans/RI + bursts On-Demand + batch on Spot.",
      "ASG: min/desired/max across AZs, self-heals, scales (target tracking is the go-to); pair with an ELB for HA + elasticity.",
      "ALB = L7 HTTP routing (microservices); NLB = L4 TCP/UDP, static IP, ultra-low latency; GWLB = L3 inline appliances.",
      "Lambda = serverless, event-driven, ≤15 min, least ops — but not for long-running/stateful work.",
      "Containers: ECS on Fargate (no servers), EKS (Kubernetes), ECS/EKS on EC2 (control/cost). ECR = registry.",
    ],
    checklist: [
      "Can match a workload to an instance family (memory/compute/storage/GPU)",
      "Can choose a purchasing model for steady vs spiky vs interruptible workloads",
      "Can describe an ASG (min/desired/max, target tracking) and how it self-heals across AZs",
      "Can pick ALB vs NLB vs GWLB from a scenario in seconds",
      "Know Lambda's limits (15 min, event-driven) and when it's the wrong choice",
      "Can choose between Lambda, Fargate, EKS, and EC2 for a container/compute need",
    ],
    quiz: [
      {
        q: "A batch image-processing job is fault-tolerant and can restart any failed task. The most cost-effective compute is…",
        options: [
          "On-Demand instances",
          "Reserved Instances",
          "Spot Instances",
          "Dedicated Hosts",
        ],
        answer: 2,
        explain:
          "Spot offers up to ~90% off for interruptible, restartable workloads — exactly fault-tolerant batch. The 2-minute reclaim warning is acceptable here.",
      },
      {
        q: "A microservices app needs path-based routing (/api → one service, /img → another) over HTTPS. Which load balancer?",
        options: [
          "Network Load Balancer",
          "Application Load Balancer",
          "Gateway Load Balancer",
          "Classic Load Balancer",
        ],
        answer: 1,
        explain:
          "Path/host-based HTTP routing is a layer-7 feature → ALB. NLB is L4 (no path routing); GWLB is for inline appliances.",
      },
      {
        q: "A team wants to run containers with the least operational overhead — no servers to patch or scale. Best fit?",
        options: [
          "ECS on EC2",
          "EKS on EC2",
          "ECS (or EKS) on Fargate",
          "Containers on a single large EC2 instance",
        ],
        answer: 2,
        explain:
          "Fargate runs containers serverlessly — no instances to manage. It's the 'least operational overhead' container answer.",
      },
    ],
  },

  {
    id: "aws-storage",
    group: "AWS (SAA)",
    label: "Storage",
    icon: "🪣",
    title: "Storage — S3, EBS, EFS & the Rest",
    tagline:
      "S3 (the most-tested service: storage classes, lifecycle, versioning, encryption, replication), block storage (EBS), shared file storage (EFS/FSx), and data transfer.",
    sections: [
      {
        heading: "S3 fundamentals",
        body: [
          "S3 is object storage: you store objects (files up to 5 TB) in globally-named buckets, accessed over HTTP APIs — not a filesystem and not a block device. It's designed for 11 nines of durability (99.999999999%) by replicating across multiple AZs automatically, and it scales effectively without limit. Use it for backups, data lakes, static website assets, logs, and as the integration point for almost every analytics service.",
          "Security: buckets are private by default and Block Public Access is on by default. Access is controlled by IAM policies, bucket policies (resource-based), and (legacy) ACLs which are now disabled by default. Encryption at rest is on by default (SSE-S3); you can choose SSE-KMS (customer-controlled keys, auditable) or SSE-C (you supply the key). Presigned URLs grant temporary access to a specific object without making it public. Object Lock provides WORM (write-once-read-many) for compliance/retention.",
        ],
        callout: {
          kind: "warn",
          title: "The classic exam trap: public buckets",
          text: "If a scenario hints at a data leak or 'accidentally public' bucket, the answer involves Block Public Access, bucket policies, and least privilege — never 'make it public' or 'use ACLs'. For private downloads use presigned URLs or CloudFront with OAC.",
        },
      },
      {
        heading: "S3 storage classes — match access pattern to class",
        body: [
          "S3's storage classes trade retrieval speed and cost; choosing the right one (often via lifecycle rules) is a core cost question. S3 Standard: frequent access, highest storage cost, no retrieval fee. S3 Intelligent-Tiering: automatically moves objects between tiers based on access — the right default when access patterns are unknown or changing (small monitoring fee, no retrieval fees). S3 Standard-IA (infrequent access): cheaper storage, retrieval fee, still multi-AZ — for backups accessed occasionally. S3 One Zone-IA: like Standard-IA but stored in a single AZ (cheaper, less durable) — for re-creatable data.",
          "Glacier tiers are for archival: Glacier Instant Retrieval (archive needing millisecond access, e.g. medical images), Glacier Flexible Retrieval (minutes-to-hours retrieval, cheap), and Glacier Deep Archive (lowest cost of all, 12-hour retrieval, for long-term compliance archives). Lifecycle policies automate the transitions: 'Standard for 30 days → Standard-IA for 90 days → Glacier Deep Archive after a year → expire after 7 years.'",
        ],
        table: {
          headers: ["Class", "Use when", "Trade-off"],
          rows: [
            ["Standard", "Frequent access", "Highest storage cost"],
            ["Intelligent-Tiering", "Unknown/changing access", "Small monitoring fee, auto-optimizes"],
            ["Standard-IA", "Infrequent, multi-AZ", "Retrieval fee"],
            ["One Zone-IA", "Infrequent, re-creatable", "Single AZ (less durable)"],
            ["Glacier Instant", "Archive, ms retrieval", "Higher retrieval cost"],
            ["Glacier Flexible", "Archive, mins–hrs", "Slow retrieval"],
            ["Glacier Deep Archive", "Long-term compliance", "Cheapest; ~12h retrieval"],
          ],
        },
      },
      {
        heading: "Versioning, lifecycle, replication",
        body: [
          "Versioning keeps every version of an object so you can recover from deletes and overwrites (a delete just adds a delete marker). It's a prerequisite for replication and pairs with MFA Delete for extra protection of critical data. Lifecycle rules then manage cost over an object's life — transition between classes and expire old versions automatically.",
          "Replication copies objects to another bucket: Cross-Region Replication (CRR) for disaster recovery, lower-latency global access, or compliance; Same-Region Replication (SRR) for log aggregation or prod→test copies. Replication requires versioning on both buckets and is asynchronous. For moving large existing datasets in fast, S3 Transfer Acceleration uses CloudFront edge locations; for uploading large files reliably, use multipart upload.",
        ],
      },
      {
        heading: "Block storage: EBS and instance store",
        body: [
          "EBS (Elastic Block Store) is network-attached block storage for a single EC2 instance — like a virtual hard disk. It lives in one AZ (a volume can only attach to an instance in the same AZ), persists independently of the instance, and is backed up via snapshots to S3 (snapshots are how you move a volume to another AZ/region). Volume types: gp3/gp2 (general-purpose SSD — the default; gp3 lets you provision IOPS/throughput independently), io1/io2 (provisioned IOPS SSD for high-performance databases; io2 Block Express for the most demanding), st1 (throughput-optimized HDD for big sequential workloads like log processing), and sc1 (cold HDD, cheapest, infrequent access).",
          "Instance store is physically-attached ephemeral disk: very fast, but data is lost when the instance stops or terminates — only for caches, scratch, or buffers you can lose. EBS encryption (via KMS) is transparent and encrypts data at rest, snapshots, and in-transit between volume and instance.",
        ],
        callout: {
          kind: "key",
          title: "EBS is single-AZ, single-instance (mostly)",
          text: "EBS attaches to one instance in one AZ. Need it in another AZ? Snapshot → restore there. Need shared access from many instances? That's not EBS — use EFS. (io1/io2 Multi-Attach is a narrow exception for clustered apps.)",
        },
      },
      {
        heading: "Shared file storage: EFS and FSx",
        body: [
          "EFS (Elastic File System) is a managed NFS filesystem that many EC2 instances (and Lambda/containers) across multiple AZs can mount simultaneously — it grows and shrinks automatically and is the answer when the scenario needs shared POSIX file storage across instances. It's Linux-only. It has lifecycle management to move infrequently-accessed files to a cheaper IA class.",
          "FSx provides managed third-party/specialized filesystems: FSx for Windows File Server (SMB/Active Directory for Windows workloads), FSx for Lustre (high-performance computing, ML, big data — integrates with S3), plus NetApp ONTAP and OpenZFS. Decision shortcut: shared Linux files → EFS; Windows/SMB shares → FSx for Windows; HPC scratch → FSx for Lustre; single-instance block disk → EBS; object/API access → S3.",
        ],
      },
      {
        heading: "Moving data into AWS",
        body: [
          "For migrations, recognize the tools. AWS DataSync automates online transfer from on-prem (NFS/SMB) to S3/EFS/FSx. Storage Gateway bridges on-prem and AWS storage (File Gateway presents S3 as NFS/SMB; Volume Gateway for block; Tape Gateway replaces physical tape). The Snow Family ships physical devices for offline transfer when the network is too slow or expensive: Snowcone (small/edge), Snowball Edge (tens of TB, with compute). Direct Connect gives a dedicated private network link for ongoing high-bandwidth, consistent-latency transfer.",
          "The exam pattern: a few TB over a decent link → DataSync; petabytes or a poor link → Snowball; ongoing hybrid file access → Storage Gateway; permanent high-throughput private connectivity → Direct Connect.",
        ],
      },
    ],
    keyPoints: [
      "S3 = object storage, 11 nines durability (multi-AZ), private + encrypted by default; control access via IAM/bucket policies, not public/ACLs.",
      "Storage classes trade cost vs retrieval: Standard, Intelligent-Tiering (unknown access), Standard-IA, One Zone-IA, Glacier Instant/Flexible/Deep Archive.",
      "Lifecycle rules automate class transitions + expiration; Intelligent-Tiering auto-optimizes when access is unpredictable.",
      "Versioning protects against deletes/overwrites and is required for replication; CRR (cross-region DR), SRR (same-region).",
      "EBS = single-AZ block disk for one instance (snapshot to move across AZ/region); gp3 default, io1/io2 for high IOPS, st1/sc1 HDD.",
      "Instance store = ephemeral fast disk (lost on stop/terminate).",
      "EFS = shared multi-AZ NFS for many Linux instances; FSx = Windows/Lustre/specialized; pick by protocol + sharing need.",
      "Data transfer: DataSync (online), Snow Family (offline bulk), Storage Gateway (hybrid), Direct Connect (dedicated ongoing).",
    ],
    checklist: [
      "Can pick an S3 storage class from an access pattern (and design a lifecycle policy)",
      "Know S3 is private/encrypted by default and how to serve private content (presigned URL / CloudFront OAC)",
      "Can explain versioning + CRR/SRR and that replication needs versioning",
      "Can choose an EBS volume type and explain it's single-AZ (snapshot to move)",
      "Can choose EBS vs instance store vs EFS vs FSx vs S3 for a storage need",
      "Can pick DataSync vs Snowball vs Storage Gateway vs Direct Connect for a migration",
    ],
    quiz: [
      {
        q: "Backups are accessed a few times a year, must be retrievable within milliseconds, and durability across AZs matters. Best S3 class?",
        options: [
          "S3 Standard",
          "S3 Glacier Deep Archive",
          "S3 Standard-IA (or Glacier Instant Retrieval)",
          "S3 One Zone-IA",
        ],
        answer: 2,
        explain:
          "Infrequent but instant, multi-AZ → Standard-IA (or Glacier Instant Retrieval for archival ms access). Deep Archive is too slow; One Zone-IA sacrifices multi-AZ durability.",
      },
      {
        q: "Multiple EC2 instances across two AZs need to read and write the same set of files concurrently. Which storage?",
        options: [
          "An EBS volume attached to each instance",
          "EFS (shared NFS across AZs)",
          "Instance store",
          "Separate S3 buckets per instance",
        ],
        answer: 1,
        explain:
          "EFS is a shared, multi-AZ NFS filesystem many instances can mount at once. EBS is single-AZ/single-instance; instance store is ephemeral and local.",
      },
      {
        q: "You must transfer 80 TB to S3 but the site has a slow internet link. Best approach?",
        options: [
          "Upload directly over the internet",
          "Use AWS DataSync over the existing link",
          "Order an AWS Snowball Edge device",
          "Enable S3 Transfer Acceleration and upload",
        ],
        answer: 2,
        explain:
          "Tens of TB over a slow link is the Snowball use case — ship the data physically. DataSync/Transfer Acceleration still depend on the slow link.",
      },
    ],
  },

  {
    id: "aws-networking",
    group: "AWS (SAA)",
    label: "Networking & VPC",
    icon: "🌐",
    title: "Networking — VPC, Connectivity, Route 53 & CloudFront",
    tagline:
      "The VPC building blocks (subnets, gateways, security groups vs NACLs), how to connect VPCs and on-prem, DNS routing policies, and the CDN.",
    sections: [
      {
        heading: "VPC anatomy",
        body: [
          "A VPC (Virtual Private Cloud) is your isolated private network in a region, defined by a CIDR block (e.g. 10.0.0.0/16). You carve it into subnets, each living in one AZ. A subnet is 'public' if its route table sends 0.0.0.0/0 to an Internet Gateway; otherwise it's private. The standard secure design: public subnets hold only internet-facing things (load balancers, NAT), private subnets hold your app and database tiers.",
          "Key components: the Internet Gateway (IGW) gives a VPC internet access; a route table decides where traffic goes; a NAT Gateway (managed, in a public subnet, per-AZ for HA) lets instances in private subnets make outbound internet connections (e.g. to download patches) without being reachable from the internet. A NAT instance is the old self-managed alternative — prefer NAT Gateway. An Egress-Only Internet Gateway is the IPv6 equivalent of NAT.",
        ],
        callout: {
          kind: "key",
          title: "Public vs private subnet",
          text: "Public subnet = route to an Internet Gateway (put LBs/bastion/NAT here). Private subnet = no direct inbound from internet; outbound via a NAT Gateway (put app + DB here). This tiered layout is the default 'secure architecture' answer.",
        },
      },
      {
        heading: "Security Groups vs Network ACLs",
        body: [
          "Both filter traffic, and the exam loves the distinction. A Security Group is a stateful firewall at the instance/ENI level: it has allow rules only (no deny), and because it's stateful, return traffic for an allowed inbound request is automatically permitted. You reference security groups by id (even another SG), which is how you say 'the app tier may talk to the DB tier'.",
          "A Network ACL (NACL) is a stateless firewall at the subnet level: it has both allow and deny rules, evaluated in numbered order, and because it's stateless you must explicitly allow both directions (including ephemeral return ports). Use SGs as your primary control (allow exactly what's needed); use NACLs for coarse subnet-level deny rules (e.g. block a malicious IP range). Default deny applies to SGs; the default NACL allows all.",
        ],
        table: {
          headers: ["", "Security Group", "Network ACL"],
          rows: [
            ["Level", "Instance / ENI", "Subnet"],
            ["State", "Stateful (return auto-allowed)", "Stateless (allow both ways)"],
            ["Rules", "Allow only", "Allow and Deny"],
            ["Evaluation", "All rules", "In number order, first match wins"],
            ["Typical use", "Primary, fine-grained allow", "Coarse subnet deny (block IPs)"],
          ],
        },
      },
      {
        heading: "Connecting VPCs and on-prem",
        body: [
          "VPC Peering connects two VPCs privately, but it's non-transitive (A↔B and B↔C does not give A↔C) and doesn't scale to many VPCs. Transit Gateway is the hub-and-spoke router that connects hundreds of VPCs and on-prem connections through one place — the answer when 'many VPCs need to interconnect at scale'.",
          "VPC Endpoints let resources reach AWS services privately without traversing the internet: a Gateway Endpoint (free, route-table based) is only for S3 and DynamoDB; an Interface Endpoint (powered by PrivateLink, an ENI with a private IP, hourly + data cost) is for most other services and for exposing your own service privately to other VPCs.",
          "To on-prem: Site-to-Site VPN runs an encrypted IPsec tunnel over the public internet — quick and cheap but variable latency. Direct Connect is a dedicated physical private link — consistent low latency and high bandwidth, but takes time to provision; combine with a VPN for an encrypted, resilient hybrid link.",
        ],
        callout: {
          kind: "tip",
          title: "Private access to S3 from a private subnet",
          text: "Don't route S3 traffic through a NAT Gateway — use a Gateway VPC Endpoint for S3 (it's free and keeps traffic on the AWS network). Gateway endpoints exist only for S3 and DynamoDB; everything else uses Interface (PrivateLink) endpoints.",
        },
      },
      {
        heading: "Route 53: DNS and routing policies",
        body: [
          "Route 53 is AWS's DNS and a major exam topic for its routing policies. Simple (one record, no health check). Weighted (split traffic by percentage — canary/blue-green). Latency-based (send users to the region with lowest latency). Failover (active-passive: route to a secondary when the primary's health check fails — core DR pattern). Geolocation (route by the user's location, e.g. for compliance/localization). Geoproximity (route by geographic distance, with a bias to shift load). Multivalue answer (return several healthy records for simple client-side load balancing).",
          "Alias records are an AWS extension that points a record (even the zone apex like example.com) at an AWS resource (ALB, CloudFront, S3 website) for free, and they auto-track the resource's IP — unlike a CNAME, which can't be used at the apex and isn't free. Route 53 health checks drive failover.",
        ],
        table: {
          headers: ["Goal", "Routing policy"],
          rows: [
            ["Canary / blue-green split", "Weighted"],
            ["Lowest latency per user", "Latency-based"],
            ["Active-passive DR failover", "Failover (+ health checks)"],
            ["Compliance / localized content", "Geolocation"],
            ["Shift load across regions by distance", "Geoproximity"],
            ["Return multiple healthy endpoints", "Multivalue answer"],
          ],
        },
      },
      {
        heading: "CloudFront and edge",
        body: [
          "CloudFront is the CDN: it caches content at hundreds of edge locations close to users, cutting latency and offloading your origin (S3, an ALB, or any HTTP server). It also terminates TLS at the edge, integrates with WAF and Shield for security, and serves private content via signed URLs/cookies. For an S3 origin, use Origin Access Control (OAC) so the bucket stays private and only CloudFront can read it.",
          "Don't confuse CloudFront (content caching/delivery, pull-based) with Global Accelerator (uses the AWS backbone and anycast IPs to speed up and fail over TCP/UDP traffic to regional endpoints — for non-cacheable, latency-sensitive apps and fast regional failover). CloudFront = cache static/dynamic web content near users; Global Accelerator = accelerate and fail over whole applications at the network layer.",
        ],
      },
    ],
    keyPoints: [
      "VPC = isolated regional network (CIDR) split into per-AZ subnets; public subnet routes to an IGW, private subnet egresses via a NAT Gateway.",
      "Tiered design: LBs/bastion/NAT in public subnets, app + DB in private subnets — the default secure architecture.",
      "Security Group = stateful, instance-level, allow-only; NACL = stateless, subnet-level, allow + deny (coarse blocks).",
      "VPC Peering is non-transitive and small-scale; Transit Gateway is the hub for many VPCs/on-prem.",
      "VPC Endpoints keep AWS traffic private: Gateway (free, S3 + DynamoDB only) vs Interface/PrivateLink (most services, ENI + cost).",
      "On-prem: Site-to-Site VPN (IPsec over internet, quick) vs Direct Connect (dedicated, consistent, high-bandwidth).",
      "Route 53 policies: weighted, latency, failover, geolocation, geoproximity, multivalue; Alias points apex records at AWS resources free.",
      "CloudFront = CDN caching near users (S3 origin via OAC); Global Accelerator = backbone/anycast acceleration + failover for whole apps.",
    ],
    checklist: [
      "Can design a VPC with public/private subnets, IGW, and NAT Gateway across AZs",
      "Can explain Security Group (stateful) vs NACL (stateless) and when to use each",
      "Know when to use VPC Peering vs Transit Gateway",
      "Can choose Gateway vs Interface VPC endpoints (and use a Gateway endpoint for S3)",
      "Can pick a Route 53 routing policy from a scenario",
      "Can distinguish CloudFront from Global Accelerator",
    ],
    quiz: [
      {
        q: "An instance in a private subnet must download OS patches from the internet but must NOT be reachable from the internet. What enables this?",
        options: [
          "Attach an Internet Gateway route to the subnet",
          "A NAT Gateway in a public subnet, with the private subnet's route table pointing 0.0.0.0/0 to it",
          "An Elastic IP on the instance",
          "A VPC peering connection",
        ],
        answer: 1,
        explain:
          "A NAT Gateway gives private-subnet instances outbound internet access while blocking inbound — the standard pattern for patching private servers.",
      },
      {
        q: "You need return traffic handled automatically and rules that only ALLOW specific access between app and DB tiers. Which control?",
        options: [
          "Network ACL",
          "Security Group",
          "Route table",
          "Internet Gateway",
        ],
        answer: 1,
        explain:
          "Security Groups are stateful (return traffic auto-allowed) and allow-only; you can reference one SG from another to permit app→DB. NACLs are stateless and subnet-level.",
      },
      {
        q: "A global app needs users sent to the AWS region that gives them the lowest latency. Which Route 53 routing policy?",
        options: ["Weighted", "Geolocation", "Latency-based", "Simple"],
        answer: 2,
        explain:
          "Latency-based routing sends each user to the region with the lowest measured latency. Geolocation routes by where the user is, not by latency.",
      },
    ],
  },

  {
    id: "aws-databases",
    group: "AWS (SAA)",
    label: "Databases",
    icon: "🗃",
    title: "Databases — RDS, Aurora, DynamoDB, Caching & Analytics",
    tagline:
      "Picking the right database is a core skill: relational (RDS/Aurora) with Multi-AZ vs read replicas, NoSQL (DynamoDB), caching (ElastiCache), and the warehouse (Redshift).",
    sections: [
      {
        heading: "RDS: managed relational databases",
        body: [
          "RDS runs managed relational engines — MySQL, PostgreSQL, MariaDB, Oracle, SQL Server — handling provisioning, patching, backups, and recovery so you don't. Pick RDS when the data is relational and you need SQL, joins, and transactions (ACID) without operating the database yourself. Automated backups give point-in-time recovery; manual snapshots are user-triggered and retained until deleted. Encryption at rest is via KMS, and it must generally be enabled at creation (you encrypt an existing DB by restoring an encrypted snapshot).",
          "The two scaling/availability features are constantly confused and constantly tested: Multi-AZ is for high availability — a synchronous standby replica in another AZ that AWS fails over to automatically on failure; it does NOT serve reads. Read Replicas are for read scaling — asynchronous copies (same region or cross-region) that offload read traffic and can be promoted to standalone DBs. Need automatic failover/HA → Multi-AZ. Need to handle more read load → Read Replicas. Many designs use both.",
        ],
        callout: {
          kind: "key",
          title: "Multi-AZ vs Read Replica",
          text: "Multi-AZ = availability (synchronous standby, auto-failover, NOT readable). Read Replica = performance (async, serves reads, can be cross-region, promotable). If the question says 'survive an AZ failure' → Multi-AZ; if it says 'reduce read load on the primary' → Read Replicas.",
        },
      },
      {
        heading: "Aurora: AWS's cloud-native relational engine",
        body: [
          "Aurora is AWS's own MySQL- and PostgreSQL-compatible engine, built for the cloud: it claims up to 5× MySQL / 3× PostgreSQL throughput, and stores data as 6 copies across 3 AZs with self-healing storage that auto-grows to 128 TB. It supports up to 15 low-latency read replicas with automatic failover, and exposes a writer endpoint and a reader endpoint (which load-balances across replicas).",
          "Aurora Serverless v2 auto-scales capacity up and down for variable or unpredictable workloads, billing for what you use — great when load is spiky or you don't want to size instances. Aurora Global Database replicates to other regions with typically sub-second lag for low-latency global reads and fast cross-region disaster recovery. Choose Aurora over plain RDS when you want higher performance, stronger built-in HA, or these cloud-native features and you're on MySQL/PostgreSQL.",
        ],
      },
      {
        heading: "DynamoDB: serverless NoSQL",
        body: [
          "DynamoDB is a fully-managed, serverless, key-value and document NoSQL database with single-digit-millisecond latency at any scale — no servers, no patching, automatic multi-AZ replication. Reach for it when you need massive scale, predictable low latency, a flexible schema, and access by key (user sessions, shopping carts, IoT, gaming, high-traffic metadata). It's the 'serverless database' and 'least operational overhead at scale' answer.",
          "Know the capacity modes: on-demand (pay per request, auto-scales instantly — for spiky/unknown traffic) vs provisioned (set read/write capacity units, cheaper for steady predictable load, with auto scaling available). DAX is an in-memory cache that drops read latency to microseconds. Global Tables give multi-region, active-active replication. DynamoDB Streams emit a change log (great for triggering Lambda). Other features: TTL for auto-expiring items, point-in-time recovery. Data modeling is via partition key (+ optional sort key) and secondary indexes (LSI/GSI).",
        ],
        table: {
          headers: ["Need", "Database"],
          rows: [
            ["Relational, SQL, managed", "RDS"],
            ["Relational + high perf / built-in HA / global", "Aurora"],
            ["Key-value/document, massive scale, serverless", "DynamoDB"],
            ["Microsecond reads in front of a DB", "ElastiCache / DAX"],
            ["Analytics / OLAP data warehouse", "Redshift"],
            ["Graph relationships", "Neptune"],
          ],
        },
      },
      {
        heading: "Caching with ElastiCache",
        body: [
          "ElastiCache is managed in-memory caching to take read load off a database and cut latency to sub-millisecond. Two engines: Redis (rich data structures, persistence, replication, Multi-AZ failover, pub/sub, sorted sets — for leaderboards, sessions, anything needing durability/HA) and Memcached (simple, multi-threaded, easily scaled out, no persistence — for a plain, large, ephemeral cache). If a scenario needs HA, persistence, or advanced data types → Redis; if it needs the simplest possible scalable cache → Memcached.",
          "Caching strategies worth knowing: lazy loading (cache on read miss — only requested data is cached, but a miss is slower and data can go stale) and write-through (write to cache on every DB write — cache always fresh, but writes are slower and you cache data that may never be read). A TTL bounds staleness. Common exam cue: 'reduce read latency / offload the database for repeated reads' → ElastiCache (or DAX specifically for DynamoDB).",
        ],
      },
      {
        heading: "Analytics and purpose-built databases",
        body: [
          "Redshift is the data warehouse: a columnar, massively-parallel (MPP) database for OLAP — complex analytical queries over terabytes/petabytes — not for transactional (OLTP) workloads. The cue is 'analytics', 'business intelligence', 'data warehouse', 'complex queries over large historical data'. Redshift Spectrum queries data directly in S3.",
          "AWS pushes 'purpose-built databases' — match the data shape to the engine: Neptune (graph — social networks, fraud, recommendations), DocumentDB (MongoDB-compatible document), ElastiCache/MemoryDB (in-memory), Keyspaces (Cassandra-compatible wide-column), Timestream (time-series/IoT), QLDB (immutable ledger). You don't need deep expertise in each for SAA, but you should recognize which problem each solves so you can eliminate wrong answers.",
        ],
        callout: {
          kind: "tip",
          title: "OLTP vs OLAP",
          text: "OLTP (many small transactions — orders, users) → RDS/Aurora/DynamoDB. OLAP (few huge analytical queries — reporting, BI) → Redshift. If a question mentions 'data warehouse' or 'analytics over historical data', it's Redshift, not RDS.",
        },
      },
    ],
    keyPoints: [
      "RDS = managed relational (MySQL/Postgres/MariaDB/Oracle/SQL Server); use for SQL, joins, ACID without ops.",
      "Multi-AZ = HA (synchronous standby, auto-failover, NOT readable); Read Replicas = read scaling (async, promotable, can be cross-region).",
      "Aurora = AWS-native MySQL/Postgres: 6 copies/3 AZs, up to 15 replicas, writer/reader endpoints, Serverless v2, Global Database.",
      "DynamoDB = serverless NoSQL key-value, single-digit-ms at scale; on-demand vs provisioned; DAX (µs cache), Global Tables, Streams, TTL.",
      "ElastiCache = in-memory cache: Redis (persistence/HA/data structures) vs Memcached (simple, scalable, ephemeral); DAX for DynamoDB.",
      "Redshift = columnar MPP data warehouse for OLAP/analytics — not OLTP.",
      "Purpose-built DBs: Neptune (graph), DocumentDB (Mongo), Keyspaces (Cassandra), Timestream (time-series), QLDB (ledger).",
    ],
    checklist: [
      "Can state Multi-AZ vs Read Replica from memory and pick the right one",
      "Can explain when Aurora beats plain RDS",
      "Can recognize a DynamoDB use case and choose on-demand vs provisioned capacity",
      "Can choose Redis vs Memcached for a caching scenario",
      "Can distinguish OLTP (RDS/Aurora/DynamoDB) from OLAP (Redshift)",
      "Can map a data shape (graph/document/time-series/ledger) to a purpose-built DB",
    ],
    quiz: [
      {
        q: "An RDS database must automatically fail over to another AZ with no manual intervention if its AZ goes down. What do you enable?",
        options: [
          "A Read Replica in another AZ",
          "Multi-AZ deployment (synchronous standby)",
          "DynamoDB Global Tables",
          "Cross-region snapshots",
        ],
        answer: 1,
        explain:
          "Multi-AZ keeps a synchronous standby in another AZ and fails over automatically. Read Replicas are async and for read scaling, not automatic HA failover.",
      },
      {
        q: "An app needs single-digit-millisecond key-value access at massive, unpredictable scale with no servers to manage. Best database?",
        options: ["RDS MySQL", "Redshift", "DynamoDB (on-demand)", "ElastiCache Memcached"],
        answer: 2,
        explain:
          "DynamoDB is serverless NoSQL with consistent low latency at any scale; on-demand mode handles unpredictable traffic without capacity planning.",
      },
      {
        q: "A team needs complex analytical queries (BI reporting) over petabytes of historical sales data. Which service?",
        options: ["Aurora", "DynamoDB", "Amazon Redshift", "RDS PostgreSQL"],
        answer: 2,
        explain:
          "Redshift is the columnar MPP data warehouse built for OLAP/analytics over huge datasets. RDS/Aurora are OLTP; DynamoDB is key-value.",
      },
    ],
  },

  {
    id: "aws-resilience-cost",
    group: "AWS (SAA)",
    label: "Resilience, Decoupling & Cost",
    icon: "💸",
    title: "Resilience, Decoupling & Cost Optimization",
    tagline:
      "The patterns that win the resilient + cost domains: decoupling with SQS/SNS/Kinesis, designing for failure, DR strategies and RTO/RPO, and the cost-optimization toolkit.",
    sections: [
      {
        heading: "Decoupling: SQS, SNS, EventBridge, Kinesis",
        body: [
          "Tightly-coupled synchronous calls fail together; decoupling with a queue or topic lets components fail and scale independently — a core resilience theme. SQS is a managed message queue (a producer drops messages, consumers poll and process): it absorbs spikes, smooths load, and lets you scale consumers separately. Standard queues are high-throughput with at-least-once delivery and best-effort ordering; FIFO queues give exactly-once processing and strict ordering at lower throughput. Visibility timeout hides a message while it's processed; a dead-letter queue (DLQ) captures messages that repeatedly fail.",
          "SNS is pub/sub: publish once to a topic, fan out to many subscribers (SQS queues, Lambda, HTTP, email/SMS) — the answer for 'notify multiple systems of an event'. The classic fan-out pattern is SNS → multiple SQS queues. EventBridge is the event bus for event-driven architectures: routes events by rules, integrates with SaaS sources, and runs scheduled (cron) jobs. Kinesis is for streaming/real-time data: Data Streams for real-time processing with ordering and replay (sharded), Data Firehose for near-real-time delivery to S3/Redshift/OpenSearch (no replay, fully managed). Cue: 'decouple/buffer work' → SQS; 'fan out to many' → SNS; 'event routing/scheduling' → EventBridge; 'real-time streaming analytics' → Kinesis.",
        ],
        table: {
          headers: ["Need", "Service"],
          rows: [
            ["Decouple producer/consumer, buffer spikes", "SQS"],
            ["One event → many subscribers (fan-out)", "SNS"],
            ["Event routing, SaaS events, cron schedules", "EventBridge"],
            ["Real-time stream, ordering + replay", "Kinesis Data Streams"],
            ["Near-real-time load to S3/Redshift", "Kinesis Data Firehose"],
            ["Strict order + no duplicates", "SQS FIFO"],
          ],
        },
      },
      {
        heading: "Designing for failure",
        body: [
          "AWS's mantra is 'everything fails all the time — design for it.' The building blocks: spread across multiple AZs (and regions for DR), put stateless app tiers behind a load balancer in an Auto Scaling Group so failed instances are replaced automatically, push state out of the compute tier (into RDS/DynamoDB/S3/ElastiCache) so any instance can serve any request, and decouple with queues so a slow or down component doesn't cascade.",
          "Add the resilience kit you'd discuss anywhere: health checks (ELB/Route 53) to route around failures, retries with exponential backoff and jitter, idempotency so retries are safe, and graceful degradation (serve cached/reduced functionality rather than erroring). The exam reads 'highly available' as multi-AZ + ASG + managed services, and 'fault tolerant' as 'keeps working through a component failure with no data loss'.",
        ],
        callout: {
          kind: "key",
          title: "The HA web-app reference architecture",
          text: "Route 53 → CloudFront → ALB → Auto Scaling Group of stateless instances across ≥2 AZs → RDS Multi-AZ (or DynamoDB) → ElastiCache. Stateless compute + managed multi-AZ data + decoupling is the answer to most 'design a highly available app' questions.",
        },
      },
      {
        heading: "Disaster recovery: RTO, RPO, and the four strategies",
        body: [
          "Two metrics frame every DR question. RTO (Recovery Time Objective) is how long you can be down — time to recover. RPO (Recovery Point Objective) is how much data you can afford to lose — the age of the last usable backup. Lower RTO/RPO costs more.",
          "The four DR strategies trade cost against RTO/RPO. Backup & Restore: cheapest, highest RTO/RPO — restore from backups/snapshots after disaster (hours). Pilot Light: a minimal core (e.g. the database replicating) always on; scale up the rest on failover (tens of minutes). Warm Standby: a scaled-down but fully functional copy always running; scale it up on failover (minutes). Multi-Site Active-Active: full production running in multiple regions serving traffic simultaneously — near-zero RTO/RPO, highest cost. Match the strategy to the stated RTO/RPO and budget.",
        ],
        table: {
          headers: ["Strategy", "RTO/RPO", "Cost", "Idea"],
          rows: [
            ["Backup & Restore", "Hours (high)", "$", "Restore from backups after disaster"],
            ["Pilot Light", "10s of min", "$$", "Core (DB) live; spin up the rest"],
            ["Warm Standby", "Minutes", "$$$", "Scaled-down full copy always on"],
            ["Multi-Site Active-Active", "~Zero", "$$$$", "Full prod in multiple regions"],
          ],
        },
      },
      {
        heading: "The cost-optimization toolkit",
        body: [
          "Cost is 20% of the exam and shows up inside the other domains. The levers: right-size (match instance/volume size to actual use; Compute Optimizer recommends), use the right purchasing model (Savings Plans/Reserved for steady load, Spot for interruptible, On-Demand for spiky), scale elastically (ASG/serverless so you pay only for what you use), pick the right storage class (S3 lifecycle/Intelligent-Tiering, the right EBS type), and prefer managed/serverless to cut operational cost. Watch data transfer — egress to the internet and cross-AZ/region traffic are commonly-forgotten costs; keep traffic in-region and use VPC endpoints/CloudFront to reduce it.",
          "The cost-management services to recognize: Cost Explorer (visualize and analyze spend and trends), AWS Budgets (set thresholds and get alerted before you overshoot), Cost and Usage Report (the granular billing data), Trusted Advisor (checks for idle/under-utilized resources and savings), Compute Optimizer (right-sizing recommendations), and consolidated billing via Organizations (pool volume discounts across accounts). Cue mapping: 'alert when spend exceeds X' → Budgets; 'analyze where the money goes' → Cost Explorer; 'find idle resources' → Trusted Advisor/Compute Optimizer.",
        ],
        callout: {
          kind: "tip",
          title: "Forgotten cost: data transfer",
          text: "Inbound data is usually free; outbound to the internet and cross-AZ/region transfer cost money. NAT Gateway data processing adds up too. Keeping traffic in-region, using Gateway endpoints for S3, and CloudFront for egress are real cost wins.",
        },
      },
    ],
    keyPoints: [
      "Decouple to survive failure: SQS (buffer/queue, Standard vs FIFO, DLQ, visibility timeout), SNS (fan-out pub/sub), EventBridge (event routing + cron), Kinesis (real-time streaming, Streams=replay vs Firehose=delivery).",
      "Design for failure: multi-AZ, stateless compute in an ASG behind a load balancer, state in managed data stores, health checks + retries/backoff + idempotency + graceful degradation.",
      "HA reference: Route 53 → CloudFront → ALB → ASG (≥2 AZs) → RDS Multi-AZ/DynamoDB → ElastiCache.",
      "RTO = downtime tolerated; RPO = data loss tolerated; lower = more expensive.",
      "DR strategies by cost/RTO: Backup & Restore < Pilot Light < Warm Standby < Multi-Site Active-Active.",
      "Cost levers: right-size, right purchasing model, elastic scaling, right storage class, managed/serverless, and minimize data-transfer/egress.",
      "Cost tools: Budgets (alerts), Cost Explorer (analysis), Trusted Advisor/Compute Optimizer (find savings), consolidated billing (pool discounts).",
    ],
    checklist: [
      "Can pick SQS vs SNS vs EventBridge vs Kinesis from a scenario",
      "Can explain SQS Standard vs FIFO and what a DLQ/visibility timeout do",
      "Can sketch the multi-AZ, stateless, auto-scaled HA reference architecture",
      "Can define RTO vs RPO and order the four DR strategies by cost/recovery",
      "Can list the main cost-optimization levers including data-transfer pitfalls",
      "Can map Budgets / Cost Explorer / Trusted Advisor / Compute Optimizer to their jobs",
    ],
    quiz: [
      {
        q: "A web app's checkout calls a slow downstream service synchronously, and spikes cause failures. The best decoupling fix is…",
        options: [
          "Add more EC2 instances and retry synchronously",
          "Place an SQS queue between the app and the downstream so it can absorb spikes and consumers scale independently",
          "Move everything to one larger instance",
          "Use SNS to email the user on failure",
        ],
        answer: 1,
        explain:
          "SQS decouples producer from consumer, buffers spikes, and lets you scale consumers separately — the components no longer fail together.",
      },
      {
        q: "A company needs an RPO of a few seconds and an RTO of about a minute, and accepts higher cost. Which DR strategy fits best?",
        options: [
          "Backup & Restore",
          "Pilot Light",
          "Warm Standby",
          "Multi-region active-active is the only option",
        ],
        answer: 2,
        explain:
          "Warm Standby keeps a scaled-down full copy running for minute-scale RTO and very low RPO. Backup & Restore/Pilot Light are too slow; active-active is more than required (and costlier).",
      },
      {
        q: "Finance wants an alert when monthly spend is forecast to exceed a threshold. Which service?",
        options: ["Cost Explorer", "AWS Budgets", "Trusted Advisor", "CloudWatch"],
        answer: 1,
        explain:
          "AWS Budgets sets spend/usage thresholds and sends alerts (including on forecasts). Cost Explorer analyzes spend; it doesn't alert on thresholds.",
      },
    ],
  },
  {
    id: "aws-service-picker",
    group: "AWS (SAA)",
    label: "Service Picker & Traps",
    icon: "🎯",
    title: "AWS Service Picker — Exam Cram Sheet",
    tagline:
      "The exam tests trade-off judgment in scenarios, not definitions. This is the rapid 'which service?' table, the cost-optimization patterns, and the recurring confusions that decide questions — the sheet to glance at last.",
    sections: [
      {
        heading: "How to read a scenario question",
        body: [
          "Most SAA questions read: 'A company needs X with constraint Y — which is MOST cost-effective / MOST resilient / LEAST operational overhead?' Several options technically work; you pick the best fit for the qualifier. So read the qualifier first — it tells you which Well-Architected pillar to optimize for, and usually eliminates two answers immediately. Then eliminate the over-built answer and the security anti-pattern (hard-coded keys, public buckets), and choose the best of what's left.",
          "Your hands-on AWS experience is a real head start here — trust the instinct, then verify it against the framework's vocabulary. The rest of this sheet is pure recall: the service-by-cue table, the cost levers, and the half-dozen pairs the exam loves to confuse.",
        ],
        callout: {
          kind: "tip",
          title: "Qualifier → pillar",
          text: "'Cost-effective' → Cost. 'Highly available / fault tolerant' → Reliability. 'Least operational effort' → managed/serverless. 'Fastest / lowest latency' → Performance. 'Encrypt / least privilege / audit' → Security.",
        },
      },
      {
        heading: "The rapid 'which service?' table",
        body: [
          "Train the cue → service reflex. When a scenario uses one of these phrases, the answer is usually the paired service.",
        ],
        table: {
          headers: ["Scenario cue", "Service"],
          rows: [
            ["Decouple components / buffer work", "SQS"],
            ["Fan-out one message to many consumers", "SNS"],
            ["Real-time streaming data", "Kinesis"],
            ["Shared file system across many instances", "EFS"],
            ["One instance's disk", "EBS"],
            ["Object storage / static site / backups", "S3"],
            ["Cheapest archival storage", "S3 Glacier Deep Archive"],
            ["Relational DB, high availability", "RDS Multi-AZ"],
            ["Relational DB, scale reads", "RDS Read Replicas"],
            ["NoSQL at huge scale, serverless", "DynamoDB"],
            ["Cache to reduce DB load", "ElastiCache (DAX for DynamoDB)"],
            ["Data warehouse / analytics", "Redshift"],
            ["Run containers without managing servers", "Fargate"],
            ["Deploy app without managing infra", "Elastic Beanstalk"],
            ["Private instances need outbound internet", "NAT Gateway"],
            ["Route by URL path", "ALB"],
            ["Extreme performance / static IP LB", "NLB"],
            ["Encrypt at rest with managed keys", "KMS"],
            ["Rotate database credentials automatically", "Secrets Manager"],
            ["Block SQL injection / web attacks", "WAF"],
            ["DDoS protection", "Shield"],
            ["Audit who did what (API calls)", "CloudTrail"],
            ["Monitor performance / alarm on a metric", "CloudWatch"],
            ["Give an app temporary AWS access", "IAM Role"],
            ["Interruptible batch, cheapest compute", "EC2 Spot"],
            ["Steady 24/7 workload, save money", "Reserved Instances / Savings Plans"],
            ["Coordinate a multi-step workflow", "Step Functions"],
            ["Forecast/alert on monthly spend", "AWS Budgets"],
          ],
        },
      },
      {
        heading: "Cost-optimization patterns (20% of the exam)",
        body: [
          "The cost domain is mostly about matching the workload to the right pricing model and tiering data down as it goes cold.",
        ],
        defs: [
          { term: "Right purchasing model", def: "Spot for interruptible/fault-tolerant batch (up to ~90% off), Reserved Instances / Savings Plans for steady 24/7 load (1–3 yr commit), On-Demand for spiky/unpredictable. Matching workload to model is the most common cost question." },
          { term: "S3 lifecycle + storage classes", def: "Auto-transition cold objects Standard → Standard-IA → Glacier/Deep Archive over time. Intelligent-Tiering when access patterns are unknown or changing." },
          { term: "Auto Scaling", def: "Scale in when idle so you stop paying for unused capacity — a cost win as much as a resilience one." },
          { term: "Serverless (Lambda / Fargate)", def: "Pay only for what you use — ideal for variable or low-traffic workloads with no always-on baseline." },
          { term: "Right-sizing", def: "Don't over-provision EC2/RDS; pick the smallest instance that meets the need, and revisit with Compute Optimizer / Trusted Advisor." },
          { term: "Managed over self-managed", def: "Managed services usually beat self-managed on total cost once you count operational overhead (patching, scaling, HA)." },
        ],
      },
      {
        heading: "The recurring traps (memorize these pairs)",
        body: [
          "A handful of look-alike pairs decide a disproportionate share of questions. Know the one-line distinction for each cold.",
        ],
        defs: [
          { term: "Multi-AZ vs Read Replica", def: "Multi-AZ = high availability (synchronous standby, automatic failover) — a resilience answer. Read Replicas = read scaling (asynchronous, can be cross-region) — a performance answer. Don't mix them up." },
          { term: "Security Group vs NACL", def: "Security Group = instance-level, stateful (return traffic auto-allowed), allow rules only. NACL = subnet-level, stateless (must allow both directions), allow + deny rules." },
          { term: "CloudWatch vs CloudTrail", def: "CloudWatch = performance (metrics, logs, alarms). CloudTrail = audit (who made which API call). 'Who did what' → CloudTrail; 'alarm on a threshold' → CloudWatch." },
          { term: "SQS vs SNS", def: "SQS = queue, one consumer processes then deletes (decouple/buffer). SNS = pub/sub, one message fanned out to many subscribers (notify many). The SNS → SQS fan-out is a classic combo." },
          { term: "IAM Role vs access keys", def: "Prefer roles (temporary, auto-rotated credentials assumed by services/users) over long-lived access keys — roles are the recurring 'right answer' for giving an app AWS access." },
          { term: "IGW vs NAT Gateway", def: "Internet Gateway = lets a public subnet reach the internet (inbound + outbound). NAT Gateway = lets private-subnet instances reach the internet outbound only, staying unreachable from outside." },
          { term: "Secrets Manager vs SSM Parameter Store", def: "Secrets Manager = stores and auto-rotates secrets (DB creds, API keys). Parameter Store = cheaper config/secret storage with no built-in rotation. 'Automatic rotation' → Secrets Manager." },
        ],
      },
    ],
    keyPoints: [
      "Read the qualifier first (MOST cost-effective / resilient / LEAST ops) — it picks the pillar and usually kills two answers.",
      "Eliminate the over-built answer and the security anti-pattern, then choose the best survivor.",
      "Cue → service: decouple → SQS, fan-out → SNS, streaming → Kinesis, shared FS → EFS, archive → Glacier Deep Archive.",
      "Cost: Spot (interruptible), Reserved/Savings Plans (steady), On-Demand (spiky); lifecycle data to colder S3 tiers.",
      "Trap pairs: Multi-AZ (HA) vs Read Replica (perf); SG (stateful/instance) vs NACL (stateless/subnet); CloudWatch (perf) vs CloudTrail (audit); SQS (queue) vs SNS (pub/sub); roles > access keys; IGW (internet) vs NAT (private outbound).",
      "Practice exams are the highest-ROI prep — study WHY each wrong answer is wrong until you're consistently ~85%+.",
    ],
    checklist: [
      "Can answer the whole cue → service table from memory",
      "Can state Multi-AZ vs Read Replica without hesitating",
      "Can state SG vs NACL and CloudWatch vs CloudTrail cold",
      "Can match each workload (interruptible / steady / spiky) to its pricing model",
      "Know SNS → SQS fan-out and IGW vs NAT scenarios",
      "Consistently scoring ~85%+ on timed practice exams",
    ],
    quiz: [
      {
        q: "Private-subnet instances must download OS patches from the internet but never be reachable from it. Which service?",
        options: ["Internet Gateway attached to the subnet", "NAT Gateway in a public subnet", "A public IP on each instance", "VPC peering"],
        answer: 1,
        explain: "A NAT Gateway gives private instances outbound-only internet access; an IGW would also make them reachable inbound.",
      },
      {
        q: "An app must survive an Availability Zone failure of its relational database with automatic failover. Choose…",
        options: ["RDS Read Replicas", "RDS Multi-AZ", "A larger single instance", "DynamoDB Global Tables"],
        answer: 1,
        explain: "Multi-AZ is the high-availability answer (synchronous standby + automatic failover). Read Replicas scale reads, they're not for failover.",
      },
      {
        q: "You need an audit trail of who made which change in the account. Which service?",
        options: ["CloudWatch", "CloudTrail", "Config", "X-Ray"],
        answer: 1,
        explain: "CloudTrail logs API calls (who did what) for audit/governance. CloudWatch is for performance metrics and alarms.",
      },
    ],
  },
];

export const CLOUD_CONCEPTS = [...AWS_CONCEPTS];
