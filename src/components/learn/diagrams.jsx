import React from "react";

// Theme-aware SVG schematics for concept pages. Each diagram uses CSS classes
// (styled in index.css via --md-* tokens) so it tracks the app theme. They exist
// to break up wall-of-text pages with a visual anchor. Add one by writing a
// component here and mapping a concept id to it in DIAGRAMS_BY_CONCEPT.

// A straight arrow with a small triangular head at (x2,y2).
function Arrow({ x1, y1, x2, y2 }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${x2},${y2} ${x2 + h * Math.cos(a1)},${y2 + h * Math.sin(a1)} ${x2 + h * Math.cos(a2)},${y2 + h * Math.sin(a2)}`;
  return (
    <g className="dg-arrow">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={head} />
    </g>
  );
}

function Box({ x, y, w, h, label, sub, accent }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="9" className={accent ? "dg-box dg-box-accent" : "dg-box"} />
      <text x={x + w / 2} y={sub ? y + h / 2 - 2 : y + h / 2 + 4} className="dg-label" textAnchor="middle">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 13} className="dg-sub" textAnchor="middle">{sub}</text>}
    </g>
  );
}

const svgProps = (label) => ({
  className: "learn-dg",
  role: "img",
  "aria-label": label,
  preserveAspectRatio: "xMidYMid meet",
});

// Tell Me About Yourself: present → past → future → handoff, widths ∝ airtime.
function PitchArc() {
  return (
    <svg viewBox="0 0 600 122" {...svgProps("Pitch arc: present, past, future, handoff")}>
      <Box x={16} y={28} w={92} h={54} label="Present" sub="~15s" />
      <Box x={116} y={28} w={276} h={54} label="Past" sub="~45s" accent />
      <Box x={400} y={28} w={120} h={54} label="Future" sub="~20s" />
      <Box x={528} y={28} w={56} h={54} label="Hand-off" sub="~10s" />
      <Arrow x1={16} y1={100} x2={584} y2={100} />
      <text x={300} y={118} className="dg-sub" textAnchor="middle">most airtime on Past; rehearse the arc, not the script</text>
    </svg>
  );
}

// STAR-L: bar lengths show where airtime should go (Action + Result dominate).
function StarL() {
  const rows = [
    { label: "Situation", w: 88 },
    { label: "Task", w: 88 },
    { label: "Action", w: 440, accent: true },
    { label: "Result", w: 352, accent: true },
    { label: "Learning", w: 150 },
  ];
  return (
    <svg viewBox="0 0 560 178" {...svgProps("STAR-L: weight answers toward Action and Result")}>
      {rows.map((r, i) => {
        const y = 16 + i * 31;
        return (
          <g key={r.label}>
            <text x={84} y={y + 15} className="dg-label" textAnchor="end">{r.label}</text>
            <rect x={96} y={y} width={440} height={20} rx="6" className="dg-bar-track" />
            <rect x={96} y={y} width={r.w} height={20} rx="6" className={r.accent ? "dg-bar dg-bar-accent" : "dg-bar"} />
          </g>
        );
      })}
      <text x={96} y={172} className="dg-sub">~70% of airtime on Action + Result; close with the Learning</text>
    </svg>
  );
}

// The loop: recruiter → phone screen → onsite → debrief → offer.
function InterviewLoop() {
  return (
    <svg viewBox="0 0 664 120" {...svgProps("Interview loop stages")}>
      <Box x={12} y={26} w={104} h={50} label="Recruiter" sub="screen" />
      <Box x={140} y={26} w={104} h={50} label="Phone" sub="screen" />
      <Box x={268} y={20} w={150} h={62} label="Onsite loop" sub="coding · design · behavioral" accent />
      <Box x={442} y={26} w={96} h={50} label="Debrief" sub="bar raiser" />
      <Box x={562} y={26} w={90} h={50} label="Offer" />
      <Arrow x1={116} y1={51} x2={140} y2={51} />
      <Arrow x1={244} y1={51} x2={268} y2={51} />
      <Arrow x1={418} y1={51} x2={442} y2={51} />
      <Arrow x1={538} y1={51} x2={562} y2={51} />
      <text x={332} y={108} className="dg-sub" textAnchor="middle">each round is graded independently; the debrief weighs the whole signal</text>
    </svg>
  );
}

// Classic request flow: client → LB → service → cache / db / queue → worker.
function SystemDesignFlow() {
  return (
    <svg viewBox="0 0 720 196" {...svgProps("System design request flow")}>
      <Box x={16} y={78} w={92} h={46} label="Client" />
      <Box x={150} y={78} w={104} h={46} label="LB / API GW" />
      <Box x={296} y={78} w={114} h={46} label="Service" accent />
      <Box x={470} y={14} w={130} h={44} label="Cache" sub="hot reads" />
      <Box x={470} y={76} w={130} h={48} label="Database" sub="source of truth" />
      <Box x={470} y={140} w={130} h={44} label="Queue" sub="async work" />
      <Box x={630} y={140} w={80} h={44} label="Worker" />
      <Arrow x1={108} y1={101} x2={150} y2={101} />
      <Arrow x1={254} y1={101} x2={296} y2={101} />
      <Arrow x1={410} y1={92} x2={470} y2={42} />
      <Arrow x1={410} y1={101} x2={470} y2={100} />
      <Arrow x1={410} y1={110} x2={470} y2={160} />
      <Arrow x1={600} y1={162} x2={630} y2={162} />
    </svg>
  );
}

// Bias–variance: training error falls; validation error is U-shaped.
function BiasVariance() {
  return (
    <svg viewBox="0 0 440 232" {...svgProps("Bias-variance trade-off curve")}>
      {/* axes */}
      <line x1={44} y1={20} x2={44} y2={196} className="dg-axis" />
      <line x1={44} y1={196} x2={414} y2={196} className="dg-axis" />
      <text x={229} y={222} className="dg-sub" textAnchor="middle">model complexity →</text>
      <text x={16} y={108} className="dg-sub" textAnchor="middle" transform="rotate(-90 16 108)">error →</text>
      {/* training error: decreasing */}
      <path d="M60,70 C150,135 250,168 410,182" className="dg-curve dg-curve-muted" />
      <text x={372} y={176} className="dg-sub" textAnchor="end">training</text>
      {/* validation/total error: U-shaped */}
      <path d="M60,78 C150,170 210,156 240,150 C320,138 372,98 410,58" className="dg-curve dg-curve-accent" />
      <text x={392} y={66} className="dg-label" textAnchor="end">validation</text>
      {/* sweet spot */}
      <line x1={240} y1={36} x2={240} y2={196} className="dg-dash" />
      <text x={240} y={32} className="dg-label" textAnchor="middle">sweet spot</text>
      <text x={92} y={50} className="dg-sub" textAnchor="middle">underfit</text>
      <text x={392} y={196 - 6} className="dg-sub" textAnchor="end">overfit</text>
    </svg>
  );
}

// RAG: ingest (offline) builds the vector store; query (online) retrieves + generates.
function RagPipeline() {
  return (
    <svg viewBox="0 0 620 248" {...svgProps("RAG pipeline: ingestion and query paths")}>
      <text x={12} y={20} className="dg-head">Ingest (offline)</text>
      <Box x={12} y={32} w={92} h={44} label="Docs" />
      <Box x={132} y={32} w={92} h={44} label="Chunk" />
      <Box x={252} y={32} w={92} h={44} label="Embed" />
      <Box x={384} y={28} w={150} h={52} label="Vector store" sub="ANN index" accent />
      <Arrow x1={104} y1={54} x2={132} y2={54} />
      <Arrow x1={224} y1={54} x2={252} y2={54} />
      <Arrow x1={344} y1={54} x2={384} y2={54} />

      <text x={12} y={150} className="dg-head">Query (online)</text>
      <Box x={12} y={162} w={92} h={44} label="Query" />
      <Box x={132} y={162} w={92} h={44} label="Embed" />
      <Box x={252} y={162} w={104} h={44} label="Retrieve k" />
      <Box x={384} y={158} w={84} h={52} label="LLM" accent />
      <Box x={496} y={162} w={92} h={44} label="Answer" />
      <Arrow x1={104} y1={184} x2={132} y2={184} />
      <Arrow x1={224} y1={184} x2={252} y2={184} />
      <Arrow x1={356} y1={184} x2={384} y2={184} />
      <Arrow x1={468} y1={184} x2={496} y2={184} />
      {/* vector store feeds retrieval */}
      <Arrow x1={444} y1={80} x2={320} y2={162} />
      <text x={12} y={236} className="dg-sub">levers: chunking · hybrid search · re-rank · groundedness eval</text>
    </svg>
  );
}

// Terraform core loop: code reconciled against state and the real cloud.
function TerraformWorkflow() {
  return (
    <svg viewBox="0 0 668 188" {...svgProps("Terraform core workflow: write, init, plan, apply against state")}>
      <Box x={12} y={24} w={96} h={46} label="Write .tf" />
      <Box x={130} y={24} w={96} h={46} label="init" sub="providers+backend" />
      <Box x={248} y={24} w={96} h={46} label="plan" sub="the diff" accent />
      <Box x={366} y={24} w={96} h={46} label="apply" sub="make real" />
      <Box x={484} y={24} w={172} h={46} label="Cloud" sub="real resources" accent />
      <Arrow x1={108} y1={47} x2={130} y2={47} />
      <Arrow x1={226} y1={47} x2={248} y2={47} />
      <Arrow x1={344} y1={47} x2={366} y2={47} />
      <Arrow x1={462} y1={47} x2={484} y2={47} />
      <Box x={264} y={120} w={160} h={46} label="State" sub="what was built" accent />
      <Arrow x1={344} y1={120} x2={300} y2={70} />
      <Arrow x1={414} y1={70} x2={414} y2={120} />
      <text x={334} y={184} className="dg-sub" textAnchor="middle">plan diffs code vs state vs reality; apply reconciles; destroy tears it down</text>
    </svg>
  );
}

// Remote state backend with locking: two engineers, one shared source of truth.
function TerraformBackend() {
  return (
    <svg viewBox="0 0 560 172" {...svgProps("Remote state backend with locking")}>
      <Box x={12} y={16} w={96} h={44} label="Dev A" />
      <Box x={12} y={104} w={96} h={44} label="Dev B" />
      <Box x={150} y={58} w={120} h={48} label="terraform" accent />
      <Box x={320} y={16} w={184} h={48} label="S3 — tfstate" sub="versioned · encrypted" />
      <Box x={320} y={100} w={184} h={44} label="DynamoDB lock" sub="one apply at a time" />
      <Arrow x1={108} y1={38} x2={150} y2={72} />
      <Arrow x1={108} y1={126} x2={150} y2={92} />
      <Arrow x1={270} y1={72} x2={320} y2={42} />
      <Arrow x1={270} y1={88} x2={320} y2={120} />
    </svg>
  );
}

// Environment strategy: thin per-env roots over shared, pinned modules.
function TerraformEnvironments() {
  return (
    <svg viewBox="0 0 660 214" {...svgProps("Environment strategy: thin per-env roots over shared modules")}>
      <Box x={30} y={24} w={160} h={50} label="dev/" sub="tfvars · own state" />
      <Box x={250} y={24} w={160} h={50} label="staging/" sub="tfvars · own state" />
      <Box x={470} y={24} w={160} h={50} label="prod/" sub="own state · own acct" accent />
      <Box x={210} y={136} w={240} h={52} label="shared modules" sub="pinned versions" accent />
      <Arrow x1={300} y1={136} x2={120} y2={74} />
      <Arrow x1={330} y1={136} x2={330} y2={74} />
      <Arrow x1={360} y1={136} x2={550} y2={74} />
      <text x={330} y={208} className="dg-sub" textAnchor="middle">one thin root per env over the same pinned modules; promote versions dev → staging → prod</text>
    </svg>
  );
}

// Default secure VPC: public subnet (ALB + NAT) over private subnet (app + db).
function AwsVpc() {
  return (
    <svg viewBox="0 0 600 288" {...svgProps("VPC with public and private subnets")}>
      <Box x={228} y={8} w={130} h={36} label="Internet" />
      <Box x={238} y={56} w={110} h={36} label="Internet GW" accent />
      <text x={20} y={114} className="dg-head">Public subnet — route → IGW</text>
      <Box x={20} y={124} w={150} h={46} label="ALB" sub="internet-facing" accent />
      <Box x={196} y={124} w={150} h={46} label="NAT Gateway" sub="egress only" />
      <text x={20} y={198} className="dg-head">Private subnet — no inbound from internet</text>
      <Box x={20} y={208} w={150} h={46} label="App tier (ASG)" accent />
      <Box x={196} y={208} w={150} h={46} label="RDS (Multi-AZ)" />
      <Arrow x1={293} y1={44} x2={293} y2={56} />
      <Arrow x1={271} y1={92} x2={100} y2={124} />
      <Arrow x1={120} y1={208} x2={250} y2={170} />
      <Arrow x1={271} y1={124} x2={285} y2={92} />
    </svg>
  );
}

// The highly-available web-app reference architecture.
function AwsHaReference() {
  return (
    <svg viewBox="0 0 716 168" {...svgProps("Highly available web app reference architecture")}>
      <Box x={12} y={58} w={96} h={46} label="Route 53" sub="DNS" />
      <Box x={126} y={58} w={106} h={46} label="CloudFront" sub="CDN / edge" />
      <Box x={250} y={58} w={88} h={46} label="ALB" accent />
      <Box x={356} y={34} w={156} h={96} label="Auto Scaling Grp" sub="stateless · ≥2 AZs" accent />
      <Box x={544} y={26} w={160} h={44} label="RDS Multi-AZ" sub="sync standby" />
      <Box x={544} y={90} w={160} h={44} label="ElastiCache" sub="hot reads" />
      <Arrow x1={108} y1={81} x2={126} y2={81} />
      <Arrow x1={232} y1={81} x2={250} y2={81} />
      <Arrow x1={338} y1={81} x2={356} y2={81} />
      <Arrow x1={512} y1={64} x2={544} y2={48} />
      <Arrow x1={512} y1={98} x2={544} y2={112} />
      <text x={358} y={158} className="dg-sub" textAnchor="middle">stateless compute across AZs + managed multi-AZ data = default HA</text>
    </svg>
  );
}

// Disaster-recovery strategies on the cost vs recovery-time spectrum.
function AwsDrStrategies() {
  return (
    <svg viewBox="0 0 600 184" {...svgProps("Disaster recovery strategies by cost and recovery time")}>
      <Box x={12} y={44} w={132} h={56} label="Backup & Restore" sub="hours · $" />
      <Box x={156} y={44} w={132} h={56} label="Pilot Light" sub="10s of min · $$" />
      <Box x={300} y={44} w={132} h={56} label="Warm Standby" sub="minutes · $$$" />
      <Box x={444} y={44} w={144} h={56} label="Active-Active" sub="~zero · $$$$" accent />
      <Arrow x1={12} y1={128} x2={588} y2={128} />
      <text x={300} y={156} className="dg-sub" textAnchor="middle">cost ↑   recovery time ↓ — pick the cheapest that meets your RTO/RPO</text>
    </svg>
  );
}

// Regions, Availability Zones, and cross-region DR replication.
function AwsRegions() {
  return (
    <svg viewBox="0 0 640 168" {...svgProps("Regions, Availability Zones, and DR replication")}>
      <text x={16} y={20} className="dg-head">Region · eu-west-1</text>
      <Box x={16} y={30} w={128} h={54} label="AZ a" sub="independent DC" />
      <Box x={156} y={30} w={128} h={54} label="AZ b" sub="independent DC" accent />
      <Box x={296} y={30} w={128} h={54} label="AZ c" sub="independent DC" />
      <text x={470} y={20} className="dg-head">Region · us-east-1 (DR)</text>
      <Box x={470} y={30} w={154} h={54} label="AZs a/b/c" sub="standby" />
      <Arrow x1={424} y1={57} x2={470} y2={57} />
      <text x={447} y={50} className="dg-sub" textAnchor="middle">async</text>
      <text x={20} y={130} className="dg-sub">Multi-AZ = high availability within a region · Multi-Region = disaster recovery / global reach</text>
    </svg>
  );
}

const REGISTRY = {
  "pitch-arc": PitchArc,
  "star-l": StarL,
  "interview-loop": InterviewLoop,
  "system-design-flow": SystemDesignFlow,
  "bias-variance": BiasVariance,
  "rag-pipeline": RagPipeline,
  "tf-workflow": TerraformWorkflow,
  "tf-backend": TerraformBackend,
  "tf-environments": TerraformEnvironments,
  "aws-vpc": AwsVpc,
  "aws-ha": AwsHaReference,
  "aws-dr": AwsDrStrategies,
  "aws-regions": AwsRegions,
};

// Which diagram(s) render on which concept page, with a caption.
export const DIAGRAMS_BY_CONCEPT = {
  "my-pitch": [{ id: "pitch-arc", caption: "The 90-second arc — widths show where your time goes." }],
  "my-stories": [{ id: "star-l", caption: "STAR-L: keep setup short, spend your airtime on Action and Result." }],
  behavioral: [{ id: "star-l", caption: "STAR-L: setup short; Action and Result carry the answer." }],
  "amazon-lp": [{ id: "interview-loop", caption: "The LP loop — behavioral-heavy, with a bar raiser and a written debrief." }],
  "interview-tactics": [{ id: "interview-loop", caption: "Where each tactic applies across the loop." }],
  "toast-interview": [{ id: "interview-loop", caption: "A typical SWE loop shape." }],
  "autodesk-interview": [{ id: "interview-loop", caption: "A typical SWE loop shape." }],
  "treasure-data-interview": [{ id: "interview-loop", caption: "A typical SWE loop shape." }],
  "system-design-core": [{ id: "system-design-flow", caption: "The building blocks most designs assemble from." }],
  "ai-system-design": [{ id: "rag-pipeline", caption: "A RAG/LLM feature: ingestion offline, retrieval + generation online." }],
  "rag-vector-search": [{ id: "rag-pipeline", caption: "RAG end to end — the diagonal arrow is retrieval against the store at query time." }],
  "ml-fundamentals": [{ id: "bias-variance", caption: "The bias-variance trade-off: the gap between curves is overfitting." }],
  "terraform-foundations": [{ id: "tf-workflow", caption: "The core loop — code is reconciled against state and the real cloud. Read the plan; apply makes it real." }],
  "terraform-state": [{ id: "tf-backend", caption: "Team-grade remote state: S3 stores it (versioned, encrypted); DynamoDB locks it so two applies can't collide." }],
  "terraform-environments": [{ id: "tf-environments", caption: "Thin per-environment roots over shared, pinned modules — the layout most approaches converge on." }],
  "aws-saa-overview": [{ id: "aws-regions", caption: "Spread across AZs for HA within a region; replicate to another region for DR / global reach." }],
  "aws-networking": [{ id: "aws-vpc", caption: "The default secure VPC: public subnet holds the ALB + NAT, private subnet holds the app + database." }],
  "aws-resilience-cost": [
    { id: "aws-ha", caption: "The HA web-app reference architecture most 'design a resilient app' answers reduce to." },
    { id: "aws-dr", caption: "The four DR strategies on the cost vs recovery-time spectrum." },
  ],
};

export function Diagram({ id }) {
  const Cmp = REGISTRY[id];
  return Cmp ? <Cmp /> : null;
}
