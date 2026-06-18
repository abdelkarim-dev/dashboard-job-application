import React from "react";

// Theme-aware SVG schematics for concept pages. Each diagram uses CSS classes
// (styled in index.css via --md-* tokens) so it tracks the app theme. They exist
// to break up wall-of-text pages with a visual anchor. Add one by writing a
// component here and mapping a concept id to it in DIAGRAMS_BY_CONCEPT.

// --- animation helpers -------------------------------------------------------
// Each animatable element carries a `--i` custom property; the CSS stagger reads
// it to offset its entrance. Connectors additionally get an animated flowing
// dash. All of it is disabled under prefers-reduced-motion (see index.css).
const iv = (i) => (i == null ? undefined : { "--i": i });

// A straight arrow with a small triangular head at (x2,y2). `i` drives the
// staggered reveal; the line also carries an animated "flow" dash.
function Arrow({ x1, y1, x2, y2, i, muted }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${x2},${y2} ${x2 + h * Math.cos(a1)},${y2 + h * Math.sin(a1)} ${x2 + h * Math.cos(a2)},${y2 + h * Math.sin(a2)}`;
  return (
    <g className={muted ? "dg-arrow dg-arrow-muted" : "dg-arrow"} style={iv(i)}>
      <line className="dg-flow" x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={head} />
    </g>
  );
}

// An L-shaped (elbow) connector: goes from (x1,y1) to (x2,y2) bending at a
// right angle, so connectors stay in clean horizontal/vertical lanes instead of
// cutting diagonally across labels. `dir` = "hv" (horizontal then vertical) or
// "vh" (vertical then horizontal). Arrowhead points along the final segment.
function Elbow({ x1, y1, x2, y2, dir = "hv", i, muted }) {
  const bx = dir === "hv" ? x2 : x1; // bend point
  const by = dir === "hv" ? y1 : y2;
  // The arrowhead points along the FINAL segment (bend → end).
  const angle = Math.atan2(y2 - by, x2 - bx);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${x2},${y2} ${x2 + h * Math.cos(a1)},${y2 + h * Math.sin(a1)} ${x2 + h * Math.cos(a2)},${y2 + h * Math.sin(a2)}`;
  return (
    <g className={muted ? "dg-arrow dg-arrow-muted" : "dg-arrow"} style={iv(i)}>
      <path className="dg-flow" d={`M${x1},${y1} L${bx},${by} L${x2},${y2}`} fill="none" />
      <polygon points={head} />
    </g>
  );
}

// A multi-segment orthogonal connector through an explicit list of points
// [[x,y],...]. Keeps connectors in reserved lanes (right-angle bends only).
// Arrowhead points along the last segment.
function Pipe({ points, i, muted }) {
  const d = points.map((p, k) => `${k === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const [px, py] = points[points.length - 1];
  const [qx, qy] = points[points.length - 2];
  const angle = Math.atan2(py - qy, px - qx);
  const h = 6.5;
  const a1 = angle + Math.PI * 0.84;
  const a2 = angle - Math.PI * 0.84;
  const head = `${px},${py} ${px + h * Math.cos(a1)},${py + h * Math.sin(a1)} ${px + h * Math.cos(a2)},${py + h * Math.sin(a2)}`;
  return (
    <g className={muted ? "dg-arrow dg-arrow-muted" : "dg-arrow"} style={iv(i)}>
      <path className="dg-flow" d={d} fill="none" />
      <polygon points={head} />
    </g>
  );
}

function Box({ x, y, w, h, label, sub, accent, i }) {
  return (
    <g className="dg-node" style={iv(i)}>
      <rect x={x} y={y} width={w} height={h} rx="9" className={accent ? "dg-box dg-box-accent" : "dg-box"} />
      <text x={x + w / 2} y={sub ? y + h / 2 - 2 : y + h / 2 + 4} className="dg-label" textAnchor="middle">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 13} className="dg-sub" textAnchor="middle">{sub}</text>}
    </g>
  );
}

// A container that groups nodes: a rounded rect with a subtle stroke/fill and a
// label that sits in the container's top padding (never overlapping inner
// content — callers reserve ~26px of top padding for it). `tone` picks an
// accent: "public", "private", "region", or default (neutral).
function Group({ x, y, w, h, label, tone, i }) {
  return (
    <g className="dg-group" style={iv(i)}>
      <rect x={x} y={y} width={w} height={h} rx="13" className={`dg-grouprect${tone ? " dg-group-" + tone : ""}`} />
      {label && (
        <text x={x + 14} y={y + 17} className="dg-grouplabel" textAnchor="start">{label}</text>
      )}
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
      <Box x={16} y={28} w={92} h={54} label="Present" sub="~15s" i={0} />
      <Box x={116} y={28} w={276} h={54} label="Past" sub="~45s" accent i={1} />
      <Box x={400} y={28} w={120} h={54} label="Future" sub="~20s" i={2} />
      <Box x={528} y={28} w={56} h={54} label="Hand-off" sub="~10s" i={3} />
      <Arrow x1={16} y1={100} x2={584} y2={100} i={4} />
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
          <g key={r.label} className="dg-node" style={{ "--i": i }}>
            <text x={84} y={y + 15} className="dg-label" textAnchor="end">{r.label}</text>
            <rect x={96} y={y} width={440} height={20} rx="6" className="dg-bar-track" />
            <rect x={96} y={y} width={r.w} height={20} rx="6" className={r.accent ? "dg-bar dg-bar-accent dg-bar-grow" : "dg-bar dg-bar-grow"} />
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
      <Box x={12} y={26} w={104} h={50} label="Recruiter" sub="screen" i={0} />
      <Box x={140} y={26} w={104} h={50} label="Phone" sub="screen" i={1} />
      <Box x={268} y={20} w={150} h={62} label="Onsite loop" sub="coding · design · behavioral" accent i={2} />
      <Box x={442} y={26} w={96} h={50} label="Debrief" sub="bar raiser" i={3} />
      <Box x={562} y={26} w={90} h={50} label="Offer" i={4} />
      <Arrow x1={116} y1={51} x2={140} y2={51} i={5} />
      <Arrow x1={244} y1={51} x2={268} y2={51} i={6} />
      <Arrow x1={418} y1={51} x2={442} y2={51} i={7} />
      <Arrow x1={538} y1={51} x2={562} y2={51} i={8} />
      <text x={332} y={108} className="dg-sub" textAnchor="middle">each round is graded independently; the debrief weighs the whole signal</text>
    </svg>
  );
}

// The five-step interview framework: clarify → estimate → high-level → deep
// dive → bottlenecks. Equal cards on one row with an arrow between each.
function SystemDesignFramework() {
  const steps = [
    { label: "Clarify", sub: "requirements" },
    { label: "Estimate", sub: "scale / load" },
    { label: "High-level", sub: "boxes + arrows", accent: true },
    { label: "Deep dive", sub: "1–2 parts" },
    { label: "Bottlenecks", sub: "& trade-offs" },
  ];
  const w = 128;
  const gap = 14;
  const y = 30;
  const h = 54;
  const xAt = (k) => 12 + k * (w + gap);
  return (
    <svg viewBox="0 0 720 116" {...svgProps("The five-step system design framework")}>
      {steps.map((s, k) => (
        <Box key={s.label} x={xAt(k)} y={y} w={w} h={h} label={s.label} sub={s.sub} accent={s.accent} i={k} />
      ))}
      {steps.slice(1).map((_, k) => (
        <Arrow key={k} x1={xAt(k) + w} y1={y + h / 2} x2={xAt(k + 1)} y2={y + h / 2} i={k + 5} />
      ))}
      <text x={360} y={104} className="dg-sub" textAnchor="middle">drive every question through these five steps — the framework is what stops you freezing</text>
    </svg>
  );
}

// Classic request flow: client → LB → service → cache / db / queue → worker.
function SystemDesignFlow() {
  return (
    <svg viewBox="0 0 720 196" {...svgProps("System design request flow")}>
      <Box x={16} y={78} w={92} h={46} label="Client" i={0} />
      <Box x={150} y={78} w={104} h={46} label="LB / API GW" i={1} />
      <Box x={296} y={78} w={114} h={46} label="Service" accent i={2} />
      <Box x={470} y={14} w={130} h={44} label="Cache" sub="hot reads" i={3} />
      <Box x={470} y={76} w={130} h={48} label="Database" sub="source of truth" i={4} />
      <Box x={470} y={140} w={130} h={44} label="Queue" sub="async work" i={5} />
      <Box x={630} y={140} w={80} h={44} label="Worker" i={6} />
      <Arrow x1={108} y1={101} x2={150} y2={101} i={7} />
      <Arrow x1={254} y1={101} x2={296} y2={101} i={8} />
      <Elbow x1={410} y1={92} x2={470} y2={36} dir="hv" i={9} />
      <Arrow x1={410} y1={101} x2={470} y2={100} i={10} />
      <Elbow x1={410} y1={110} x2={470} y2={162} dir="hv" i={11} />
      <Arrow x1={600} y1={162} x2={630} y2={162} i={12} />
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
      <Box x={12} y={32} w={92} h={44} label="Docs" i={0} />
      <Box x={132} y={32} w={92} h={44} label="Chunk" i={1} />
      <Box x={252} y={32} w={92} h={44} label="Embed" i={2} />
      <Box x={384} y={28} w={150} h={52} label="Vector store" sub="ANN index" accent i={3} />
      <Arrow x1={104} y1={54} x2={132} y2={54} i={4} />
      <Arrow x1={224} y1={54} x2={252} y2={54} i={5} />
      <Arrow x1={344} y1={54} x2={384} y2={54} i={6} />

      <text x={12} y={150} className="dg-head">Query (online)</text>
      <Box x={12} y={162} w={92} h={44} label="Query" i={7} />
      <Box x={132} y={162} w={92} h={44} label="Embed" i={8} />
      <Box x={252} y={162} w={104} h={44} label="Retrieve k" i={9} />
      <Box x={384} y={158} w={84} h={52} label="LLM" accent i={10} />
      <Box x={496} y={162} w={92} h={44} label="Answer" i={11} />
      <Arrow x1={104} y1={184} x2={132} y2={184} i={12} />
      <Arrow x1={224} y1={184} x2={252} y2={184} i={13} />
      <Arrow x1={356} y1={184} x2={384} y2={184} i={14} />
      <Arrow x1={468} y1={184} x2={496} y2={184} i={15} />
      {/* vector store feeds retrieval: down then across to Retrieve k's top */}
      <Pipe points={[[459, 80], [459, 119], [304, 119], [304, 162]]} i={16} muted />
      <text x={12} y={236} className="dg-sub">levers: chunking · hybrid search · re-rank · groundedness eval</text>
    </svg>
  );
}

// Managed RAG on Bedrock: an offline ingest band (S3 → Knowledge Base → vector
// store) over an online serve band (user → API/Lambda → retrieve → model →
// answer). The vector store feeds retrieval via a single orthogonal pipe.
function BedrockRag() {
  return (
    <svg viewBox="0 0 640 250" {...svgProps("RAG on Bedrock: ingestion and serving paths")}>
      <text x={12} y={20} className="dg-head">Ingest (offline)</text>
      <Box x={12} y={32} w={104} h={44} label="S3 docs" sub="PDF · MD · HTML" i={0} />
      <Box x={150} y={28} w={150} h={52} label="Bedrock KB" sub="chunk · embed" accent i={1} />
      <Box x={336} y={32} w={150} h={44} label="Vector store" sub="OpenSearch" i={2} />
      <Arrow x1={116} y1={54} x2={150} y2={54} i={3} />
      <Arrow x1={300} y1={54} x2={336} y2={54} i={4} />

      <text x={12} y={150} className="dg-head">Serve (online)</text>
      <Box x={12} y={162} w={84} h={44} label="User" i={5} />
      <Box x={116} y={162} w={104} h={44} label="API GW + λ" i={6} />
      <Box x={240} y={162} w={104} h={44} label="Retrieve" sub="top-K" accent i={7} />
      <Box x={364} y={158} w={96} h={52} label="Claude" sub="on Bedrock" i={8} />
      <Box x={480} y={162} w={148} h={44} label="Answer" sub="+ citations" i={9} />
      <Arrow x1={96} y1={184} x2={116} y2={184} i={10} />
      <Arrow x1={220} y1={184} x2={240} y2={184} i={11} />
      <Arrow x1={344} y1={184} x2={364} y2={184} i={12} />
      <Arrow x1={460} y1={184} x2={480} y2={184} i={13} />
      {/* vector store feeds retrieval: down then across into Retrieve's top */}
      <Pipe points={[[411, 76], [411, 119], [292, 119], [292, 162]]} i={14} muted />
      <text x={12} y={238} className="dg-sub">RetrieveAndGenerate = one call · Retrieve = chunks you prompt · Guardrails screen I/O</text>
    </svg>
  );
}

// Terraform core loop: code reconciled against state and the real cloud.
// Top row is the linear write→init→plan→apply→cloud pipeline. State sits below
// in its own band; the two connectors live in the clear gap between the rows
// (plan reads state, apply writes state) and never cross a box or label.
function TerraformWorkflow() {
  // Pipeline row: 5 boxes on a shared grid (y=30, h=48), 18px gaps.
  const py = 30;
  const ph = 48;
  return (
    <svg viewBox="0 0 668 200" {...svgProps("Terraform core workflow: write, init, plan, apply against state")}>
      <Box x={12} y={py} w={96} h={ph} label="Write .tf" i={0} />
      <Box x={130} y={py} w={96} h={ph} label="init" sub="providers+backend" i={1} />
      <Box x={248} y={py} w={96} h={ph} label="plan" sub="the diff" accent i={2} />
      <Box x={366} y={py} w={96} h={ph} label="apply" sub="make real" i={3} />
      <Box x={484} y={py} w={172} h={ph} label="Cloud" sub="real resources" accent i={4} />
      <Arrow x1={108} y1={py + ph / 2} x2={130} y2={py + ph / 2} i={5} />
      <Arrow x1={226} y1={py + ph / 2} x2={248} y2={py + ph / 2} i={6} />
      <Arrow x1={344} y1={py + ph / 2} x2={366} y2={py + ph / 2} i={7} />
      <Arrow x1={462} y1={py + ph / 2} x2={484} y2={py + ph / 2} i={8} />

      {/* State band, centred under plan↔apply. Both connectors are pure
          verticals in the clear gap (y 78→132) — they cross nothing. */}
      <Box x={256} y={132} w={160} h={46} label="State" sub="what was built" accent i={9} />
      {/* plan reads state: vertical up into plan's bottom edge (x=300) */}
      <Arrow x1={300} y1={132} x2={300} y2={py + ph} i={10} muted />
      {/* apply writes state: vertical down into state's top edge (x=390) */}
      <Arrow x1={390} y1={py + ph} x2={390} y2={132} i={11} />
      <text x={334} y={196} className="dg-sub" textAnchor="middle">plan diffs code vs state vs reality; apply reconciles; destroy tears it down</text>
    </svg>
  );
}

// Remote state backend with locking: two engineers funnel through one CLI into a
// shared, locked backend. Devs share a vertical lane on the left, the CLI sits
// on the centre line, and the backend (S3 + DynamoDB) is grouped on the right.
// All connectors are elbows in clear lanes — nothing crosses a label.
function TerraformBackend() {
  const cy = 96; // shared centre line for the terraform CLI box
  return (
    <svg viewBox="0 0 560 196" {...svgProps("Remote state backend with locking")}>
      <Box x={16} y={40} w={104} h={44} label="Dev A" i={0} />
      <Box x={16} y={108} w={104} h={44} label="Dev B" i={1} />
      <Box x={196} y={cy - 26} w={128} h={52} label="terraform" sub="plan / apply" accent i={2} />

      {/* Backend group on the right */}
      <Group x={372} y={28} w={172} h={140} label="Remote backend" tone="region" i={3} />
      <Box x={384} y={54} w={148} h={46} label="S3 — tfstate" sub="versioned · encrypted" i={4} />
      <Box x={384} y={110} w={148} h={46} label="DynamoDB lock" sub="one apply at a time" i={5} />

      {/* Devs → CLI: vertical out of each dev, then horizontal into CLI's
          left edge (arrowheads point right into the box). */}
      <Elbow x1={120} y1={62} x2={196} y2={cy - 8} dir="vh" i={6} />
      <Elbow x1={120} y1={130} x2={196} y2={cy + 8} dir="vh" i={7} />
      {/* CLI → backend: out of CLI's right edge, then up/down into each box. */}
      <Elbow x1={324} y1={cy - 8} x2={384} y2={77} dir="hv" i={8} />
      <Elbow x1={324} y1={cy + 8} x2={384} y2={133} dir="hv" i={9} />
    </svg>
  );
}

// Environment strategy: thin per-env roots over shared, pinned modules. The
// three env roots sit on one row inside a "per-env roots" container; the shared
// modules box is centred below. Each root connects to the shared modules with a
// clean elbow that drops into a shared horizontal bus, so the fan-in reads
// instantly and no connector crosses a box or label.
function TerraformEnvironments() {
  const roots = [
    { x: 30, label: "dev/", sub: "tfvars · own state" },
    { x: 250, label: "staging/", sub: "tfvars · own state" },
    { x: 470, label: "prod/", sub: "own state · own acct", accent: true },
  ];
  const rw = 160;
  const bus = 116; // shared horizontal bus y between roots and modules
  return (
    <svg viewBox="0 0 660 226" {...svgProps("Environment strategy: thin per-env roots over shared modules")}>
      <Group x={16} y={18} w={628} h={70} label="PER-ENV ROOTS" i={0} />
      {roots.map((r, k) => (
        <Box key={r.label} x={r.x} y={36} w={rw} h={48} label={r.label} sub={r.sub} accent={r.accent} i={k + 1} />
      ))}

      <Box x={210} y={150} w={240} h={54} label="shared modules" sub="pinned versions" accent i={4} />

      {/* Each root drops to a shared bus (y=116) then into the modules box top */}
      {roots.map((r, k) => {
        const cx = r.x + rw / 2;
        return <Pipe key={r.label} points={[[cx, 84], [cx, bus], [330, bus], [330, 150]]} i={k + 5} />;
      })}
      <text x={330} y={222} className="dg-sub" textAnchor="middle">one thin root per env over the same pinned modules; promote versions dev → staging → prod</text>
    </svg>
  );
}

const REGISTRY = {
  "pitch-arc": PitchArc,
  "star-l": StarL,
  "interview-loop": InterviewLoop,
  "sd-framework": SystemDesignFramework,
  "system-design-flow": SystemDesignFlow,
  "bias-variance": BiasVariance,
  "rag-pipeline": RagPipeline,
  "bedrock-rag": BedrockRag,
  "tf-workflow": TerraformWorkflow,
  "tf-backend": TerraformBackend,
  "tf-environments": TerraformEnvironments,
};

// Which diagram(s) render on which concept page, with a caption.
export const DIAGRAMS_BY_CONCEPT = {
  "my-pitch": [{ id: "pitch-arc", caption: "The 90-second arc — widths show where your time goes." }],
  behavioral: [{ id: "star-l", caption: "STAR-L: setup short; Action and Result carry the answer." }],
  "amazon-lp": [{ id: "interview-loop", caption: "The LP loop — behavioral-heavy, with a bar raiser and a written debrief." }],
  "interview-tactics": [{ id: "interview-loop", caption: "Where each tactic applies across the loop." }],
  "system-design-core": [{ id: "system-design-flow", caption: "The building blocks most designs assemble from." }],
  "system-design-framework": [
    { id: "sd-framework", caption: "Run every question through these five steps — start simple, then scale." },
    { id: "system-design-flow", caption: "The building blocks most designs assemble from." },
  ],
  "rag-bedrock": [{ id: "bedrock-rag", caption: "Managed RAG on Bedrock: ingest offline into a Knowledge Base; retrieve + generate online, with citations." }],
  "ai-system-design": [{ id: "rag-pipeline", caption: "A RAG/LLM feature: ingestion offline, retrieval + generation online." }],
  "rag-vector-search": [{ id: "rag-pipeline", caption: "RAG end to end — the diagonal arrow is retrieval against the store at query time." }],
  "ml-fundamentals": [{ id: "bias-variance", caption: "The bias-variance trade-off: the gap between curves is overfitting." }],
  "terraform-foundations": [{ id: "tf-workflow", caption: "The core loop — code is reconciled against state and the real cloud. Read the plan; apply makes it real." }],
  "terraform-state": [{ id: "tf-backend", caption: "Team-grade remote state: S3 stores it (versioned, encrypted); DynamoDB locks it so two applies can't collide." }],
  "terraform-environments": [{ id: "tf-environments", caption: "Thin per-environment roots over shared, pinned modules — the layout most approaches converge on." }],
};

export function Diagram({ id }) {
  const Cmp = REGISTRY[id];
  return Cmp ? <Cmp /> : null;
}
